import { mountAmigurumi, drawAmigurumi } from "/amigurumi.mjs";
import { mountPictureLibrary } from "/picture-library.mjs";
import { placedSymbol, validatePlacement, resizePlacements, snappingDefaults, automaticPlacement, gridGuides, symbolVertices, guideElements, validateGuides } from "/stitch-placement.mjs";
import { patternMatches, mountPatternLibrary } from "/pattern-library.mjs";
import { setCraft } from "/knitting.mjs";
import { crochetPresets, terminologyChange } from "/terminology.mjs";
import { bagTemplate } from "/project-model.mjs";
import { drawAssembly } from "/assembly.mjs";
import { mountPhotos } from "/photos.mjs";
import { mountAssembly } from "/assembly.mjs";
import { mountRounds } from "/rounds.mjs";
import { mountShapes, widthFraction } from "/shapes.mjs";
import { mountBands } from "/yarn-bands.mjs";
import { mountConsumption } from "/consumption.mjs";
import { mountYarnPlanning } from "/yarn-planning.mjs";
import { mountInventory } from "/inventory.mjs";
import { mountProgress } from "/progress.mjs";
import { estimateCollection, estimatePiece } from "/estimates.mjs";
import { mountPieces } from "/pieces.mjs";
import {
  fields,
  normalizeProject,
  validateProject,
  activePiece,
  editorView,
  exportView,
  addPiece,
} from "/project-model.mjs";
import { mountBackups } from "/backups.mjs";
import { mountLibrary } from "/library.mjs";
import { mountRevisions } from "/revisions.mjs";
import { mountExports } from "/exports.mjs";
import { chartGaugeSummary, mountInstructions } from "/instructions.mjs";
import { importSymbol, setupDrawing } from "/symbols.js";
const $ = (id) => document.getElementById(id);

let project = normalizeProject({
  schema: 1,
  fields: Object.fromEntries(fields.map((id) => [id, $(id).value])),
  cols: 12,
  rows: 10,
  cells: Array(120).fill("sc"),
  stitches: [
    {
      id: "sc",
      name: "Single crochet",
      abbr: "sc",
      symbol: "×",
      consumed: 1,
      produced: 1,
    },
    {
      id: "ch",
      name: "Chain",
      abbr: "ch",
      symbol: "○",
      consumed: 0,
      produced: 1,
    },
  ],
  patterns: [],
});
const editor = () => editorView(project);
const blankProject = structuredClone(project);
const versions = new Map();
let regionStart = null,
  regionEnd = null,
  symbolImage = null;
let selected = "sc",
  past = [],
  future = [],
  pending = null,
  timer,
  saveQueue = Promise.resolve(),
  loading = true,
  dirty = false;
function status(text) {
  $("status").textContent = text;
}
function snapshot() {
  return structuredClone(project);
}
function record() {
  past.push(snapshot());
  if (past.length > 50) past.shift();
  future = [];
}
function save() {
  if (loading || !project.id) return Promise.resolve(false);
  clearTimeout(timer);
  timer = null;
  const body = JSON.stringify(project),
    id = project.id;
  saveQueue = saveQueue
    .catch(() => false)
    .then(async () => {
      const r = await fetch("/api/projects/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Stitchinator": "1",
          "X-Project-Version": String(versions.get(id) ?? 0),
        },
        body,
      });
      if (!r.ok) throw Error(await r.text());
      const result = await r.json();
      versions.set(id, result.version);
      if (project.id === id) {
        if (JSON.stringify(project) === body) {
          dirty = false;
          status("Saved locally · " + new Date().toLocaleTimeString());
        } else status("Saving newer changes…");
      }
      return true;
    })
    .catch((e) => {
      status("Save failed: " + e.message);
      return false;
    });
  return saveQueue;
}
function changed(repaint = true) {
  $("estimateResult").textContent =
    "Recalculate after changes to the design or measurements.";
  $("projectEstimate").textContent =
    "Recalculate after changes to the project.";
  dirty = true;
  clearTimeout(timer);
  status("Unsaved changes…");
  timer = setTimeout(save, 600);
  if (repaint) render();
}
function collect() {
  for (const id of fields)
    if (!["width", "length"].includes(id)) editor().fields[id] = $(id).value;
}
function syncFields() {
  syncShapes.reset();
  $("projectEstimate").textContent =
    "Calculate estimates for all pieces using their own measurements.";
  syncPieces();
  if (typeof library !== "undefined") library.sync();
  regionStart = regionEnd = null;
  $("applyDimensions").disabled = true;
  $("cancelDimensions").disabled = true;
  $("dimensionStatus").textContent = "";
  $("estimateResult").textContent =
    "Recalculate with a measured swatch matching this fabric.";
  for (const id of fields) $(id).value = editor().fields[id] ?? "";
  $("cols").value = editor().cols;
  $("chartRows").value = editor().rows;
}
function node(tag, text) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  return n;
}
function region() {
  if (!regionStart || !regionEnd) return null;
  return {
    left: Math.min(regionStart.col, regionEnd.col),
    right: Math.max(regionStart.col, regionEnd.col),
    bottom: Math.min(regionStart.row, regionEnd.row),
    top: Math.max(regionStart.row, regionEnd.row),
  };
}
function showSymbol(button, stitch, label = "") {
  if (stitch?.image) {
    button.replaceChildren();
    const img = node("img");
    img.src = stitch.image;
    img.alt = "";
    img.className = "symbolImage";
    button.append(img, document.createTextNode(label));
  }
}
function checkCounts() {
  const warnings = [];
  let previous = null;
  for (let r = 0; r < editor().rows; r++) {
    let used = 0,
      made = 0;
    for (let c = 0; c < editor().cols; c++) {
      const s = project.stitches.find(
        (s) => s.id === editor().cells[r * editor().cols + c],
      );
      used += s.consumed;
      made += s.produced;
    }
    if (previous !== null && used !== previous)
      warnings.push(
        `Row ${r + 1} consumes ${used} stitches; row ${r} produces ${previous}.`,
      );
    previous = made;
  }
  $("validation").textContent = warnings.length
    ? "Check stitch counts:\n" + warnings.join("\n")
    : "Adjacent row stitch totals agree. This checks counts only, not stitch placement or turning chains.";
}
function render() {
  const snapSettings=project.diagramSnapping??snappingDefaults;
  $("snapEnabled").checked=snapSettings.enabled;$("snapVertices").checked=snapSettings.vertices;$("snapOrientation").value=snapSettings.orientation;
  $("projectCraft").value=project.craft??"crochet";
  $("knittingMode").value=activePiece(project).knittingMode??"flat";
  $("radialSection").hidden=project.craft==="knitting";
  $("terminology").value=project.terminology??"US";
  if (!project.stitches.some((s) => s.id === selected)) selected = "sc";
  document.documentElement.style.fontSize =
    (Number(editor().fields.textSize) || 16) + "px";
  const cols = pending?.cols ?? editor().cols,
    rows = pending?.rows ?? editor().rows,
    zoom = Number($("zoom").value);
  const chart = $("chart");
  chart.replaceChildren();
  chart.style.gridTemplateColumns = `repeat(${cols}, ${zoom}px)`;
  const guideLayer=$("chartGuides");guideLayer.setAttribute('viewBox',`0 0 ${cols} ${rows}`);guideLayer.setAttribute('preserveAspectRatio','none');guideLayer.replaceChildren(...guideElements(activePiece(project).chartGuides??[]));
  const guides=[...gridGuides(cols,rows),...(activePiece(project).chartGuides??[])];
  const vertices=[];
  for(let r=0;r<editor().rows;r++)for(let c=0;c<editor().cols;c++){
    const index=r*editor().cols+c,pose=placedSymbol(c+.5,rows-r-.5,.7,editor().cellPlacements?.[index],1);
    vertices.push(...symbolVertices(pose,.7).map(v=>({...v,index})));
  }
  for (let row = rows - 1; row >= 0; row--)
    for (let col = 0; col < cols; col++) {
      const id =
        row < editor().rows && col < editor().cols
          ? editor().cells[row * editor().cols + col]
          : "sc";
      const stitch = project.stitches.find((s) => s.id === id);
      const b = node("button", stitch?.symbol ?? "·");
      b.style.height = zoom + "px";
      b.title = `Row ${row + 1}, stitch ${col + 1}: ${stitch?.name ?? "Empty"}`;
      b.setAttribute("aria-label", b.title);
      b.disabled = !!pending;
      showSymbol(b, stitch);
      const visual=node('span');
      while(b.firstChild)visual.append(b.firstChild);
      const pose=placedSymbol(50,50,70,editor().cellPlacements?.[row*editor().cols+col],100);
      visual.className='placedSymbol';visual.style.left=pose.x+'%';visual.style.top=pose.y+'%';
      visual.style.transform=`translate(-50%, -50%) rotate(${pose.rotation}deg)`;
      b.append(visual);
      const area = region();
      if (
        area &&
        row >= area.bottom &&
        row <= area.top &&
        col >= area.left &&
        col <= area.right
      )
        b.classList.add("region");
      let dragged=false,dragStart=null;
      const placementAt=e=>{
        const anchor=$("symbolAnchor").value,rotation=Number($("symbolRotation").value);
        if($("symbolSnap").value!=="auto")return {anchor,snap:$("symbolSnap").value,rotation};
        const bounds=chart.getBoundingClientRect(),origin={x:col+.5,y:rows-row-.5};
        const point=e.type==='click'&&e.detail===0?origin:{x:(e.clientX-bounds.left)*cols/bounds.width,y:(e.clientY-bounds.top)*rows/bounds.height};
        return automaticPlacement(point,origin,.7,1,anchor,rotation,project.diagramSnapping??snappingDefaults,guides,vertices.filter(v=>v.index!==row*editor().cols+col),e.altKey||$("symbolNoSnap").checked,.25);
      };
      const commitPlacement=(placement,repaint)=>{
        try{validatePlacement(placement);}catch(e){status(e.message);return;}
        if(hasPendingDesign()){status('Apply/cancel pending design changes and save drafts first.');return;}
        record();
        if(repaint)editor().cells[row*editor().cols+col]=selected;
        editor().cellPlacements??={};editor().cellPlacements[row*editor().cols+col]=placement;
        $("symbolNoSnap").checked=false;changed();
      };
      b.onpointerdown=e=>{if(e.button!==0||$("chartTool").value!=="position"||pending)return;dragStart={x:e.clientX,y:e.clientY};dragged=false;b.setPointerCapture(e.pointerId);};
      b.onpointermove=e=>{
        if(!dragStart)return;
        if(Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)<3&&!dragged)return;
        dragged=true;
        try{const placement=placementAt(e),pose=placedSymbol(50,50,70,placement,100);visual.style.left=pose.x+'%';visual.style.top=pose.y+'%';visual.style.transform=`translate(-50%, -50%) rotate(${pose.rotation}deg)`;chart.setAttribute("aria-description",`Placement preview: ${placement.target??'fixed point'}. Release to apply.`);}catch(error){status(error.message);}
      };
      b.onpointerup=e=>{if(!dragStart)return;dragStart=null;if(dragged){try{commitPlacement(placementAt(e),false);$("previewStatus").textContent='Symbol placement applied.';}catch(error){status(error.message);render();}}};
      b.onpointercancel=()=>{dragStart=null;dragged=false;render();};
      b.onclick = (e) => {
        if(dragged){dragged=false;return;}
        if ($("chartTool").value === "select") {
          if (!regionStart || regionEnd) {
            regionStart = { row, col };
            regionEnd = null;
          } else regionEnd = { row, col };
          render();
          return;
        }
        try{commitPlacement(placementAt(e),$("chartTool").value!=="position");}catch(error){status(error.message);return;}
        $("estimateResult").textContent =
          "Pattern changed. Confirm your swatch represents this fabric, then recalculate.";
      };
      chart.append(b);
    }
  $("palette").replaceChildren();
  for (const s of project.stitches) {
    const family=s.category??crochetPresets.find(p=>p.termKey===(s.termKey??s.id))?.category??'Custom';
    if($("stitchFamily").value && $("stitchFamily").value!==family)continue;
    const b = node("button", `${s.symbol} ${s.abbr}`);
    showSymbol(b, s, " " + s.abbr);
    b.title = s.name;
    b.className = s.id === selected ? "selected" : "";
    b.setAttribute("aria-pressed", String(s.id === selected));
    b.onclick = () => {
      selected = s.id;
      render();
    };
    $("palette").append(b);
  }
  $("patterns").replaceChildren();
  for (const p of project.patterns.filter(p=>patternMatches(p,$("patternSearch").value,$("patternFolderFilter").value.trim()))) {
    const b = node("button", `Repeat “${p.name}” (${p.cols} × ${p.rows})`);
    b.className = "pattern";
    b.disabled = !!pending;
    b.onclick = () => {
      record();
      for (let r = 0; r < editor().rows; r++)
        for (let c = 0; c < editor().cols; c++)
          editor().cells[r * editor().cols + c] =
            p.cells[(r % p.rows) * p.cols + (c % p.cols)];
      $("estimateResult").textContent =
        "Pattern changed. Confirm the swatch matches before recalculating.";
      changed();
    };
    const share=node("button","Save new copy to shared picture library");share.onclick=()=>pictureLibrary.captureLocal(p,project.stitches);
    $("patterns").append(b,share);
  }
  $("undo").disabled = !past.length || !!pending;
  $("redo").disabled = !future.length || !!pending;
  $("apply").disabled = !pending;
  $("cancel").disabled = !pending;
  $("previewStatus").textContent = pending
    ? `Preview: ${cols} columns × ${rows} rows. Apply to commit; autosave keeps the current chart until then.`
    : "";
  const area = region();
  $("selectionStatus").textContent = area
    ? `Selected ${area.right - area.left + 1} columns × ${area.top - area.bottom + 1} rows.`
    : regionStart
      ? "Choose the opposite corner."
      : "Whole chart selected.";
  checkCounts();
  $("chartGauge").textContent =
    activePiece(project).shape && activePiece(project).shape !== "rectangle"
      ? "Flat-shape preview only. The rectangular sample chart does not define increases, decreases, round counts, or shaping instructions."
      : activePiece(project).sections
        ? "Band mode: each band uses its own gauge. The sample chart is not automatically mapped to bands or expanded into full-piece instructions."
        : chartGaugeSummary(editor());
  renderInstructions();
  syncProgress();
  syncYarnPlanning();
  syncConsumption();
  syncBands();
  syncShapes();
  syncAmi();
  syncRounds();
  syncAssembly();
  syncPhotos();
  renderRevisions();
  syncExports();
  draw();
}
function draw() {
  if(activePiece(project).amigurumi){drawAmigurumi($("fabric"),project,{scope:"part",yaw:Number($("rotation").value),pitch:$("view").value==="3d"?15:0});return;}
  const canvas = $("fabric"),
    ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 900, 420);
  const shape = $("pieceShape").value;
  const w = Number($("width").value) || 20,
    l = shape === "circle" ? w : Number($("length").value) || 100,
    scale = 290 / Math.max(w, l),
    angle = (Number($("rotation").value) * Math.PI) / 180,
    is3d = $("view").value === "3d";
  function point(x, y) {
    const xx = (x - 0.5) * widthFraction(shape, y) * w * scale,
      yy = (y - 0.5) * l * scale,
      z = is3d ? Math.sin(y * Math.PI * 2) * 12 : 0;
    const xr = is3d ? xx * Math.cos(angle) + z * Math.sin(angle) : xx;
    const depth = is3d ? -xx * Math.sin(angle) + z * Math.cos(angle) : 0;
    return [450 + xr, 210 + yy * (is3d ? 0.88 : 1) + depth * 0.55];
  }
  ctx.fillStyle = editor().fields.color;
  ctx.strokeStyle = "#576957";
  ctx.lineWidth = 0.65;
  const nx = Math.min(editor().cols, 32),
    ny = shape === "rectangle" ? Math.min(editor().rows, 40) : 60;
  const bands = activePiece(project).sections;
  let end = 0;
  const ranges = (bands ?? []).map((b) => ({
    end: (end += b.percent / 100),
    color: b.color,
  }));
  const ys = [
    ...new Set([
      ...Array.from({ length: ny + 1 }, (_, i) => i / ny),
      ...ranges.map((r) => r.end).filter((y) => y > 0 && y < 1),
    ]),
  ].sort((a, b) => a - b);
  for (let y = 0; y < ys.length - 1; y++)
    for (let x = 0; x < nx; x++) {
      const low = ys[y],
        high = ys[y + 1];
      ctx.fillStyle =
        ranges.find((r) => (low + high) / 2 < r.end)?.color ??
        editor().fields.color;
      const pts = [
        point(x / nx, low),
        point((x + 1) / nx, low),
        point((x + 1) / nx, high),
        point(x / nx, high),
      ];
      ctx.beginPath();
      pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      const a = point((x + 0.2) / nx, low + (high - low) * 0.25),
        b = point((x + 0.5) / nx, low + (high - low) * 0.75),
        c = point((x + 0.8) / nx, low + (high - low) * 0.25);
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.lineTo(...c);
      ctx.stroke();
    }
  ctx.fillStyle = "#40584b";
  ctx.font = "16px system-ui";
  ctx.fillText(
    `${shape} · ${w} × ${l} cm · ${is3d ? "approximate 3D" : "2D shape"}`,
    24,
    390,
  );
}
for (const id of fields)
  $(id).addEventListener("change", () => {
    if (["width", "length"].includes(id)) {
      const valid =
        Number($("width").value) > 0 && Number($("length").value) > 0;
      $("applyDimensions").disabled = !valid;
      $("cancelDimensions").disabled = false;
      $("dimensionStatus").textContent =
        "Preview only. Apply dimensions to commit.";
      draw();
      return;
    }
    record();
    collect();
    $("estimateResult").textContent =
      "Measurements changed. Recalculate to update the estimate.";
    changed();
  });
$("applyDimensions").onclick = () => {
  record();
  editor().fields.width = $("width").value;
  editor().fields.length = $("length").value;
  $("applyDimensions").disabled = true;
  $("cancelDimensions").disabled = true;
  $("dimensionStatus").textContent = "";
  $("estimateResult").textContent =
    "Dimensions changed. Recalculate the estimate.";
  changed();
};
$("cancelDimensions").onclick = () => {
  $("width").value = editor().fields.width;
  $("length").value = editor().fields.length;
  $("applyDimensions").disabled = true;
  $("cancelDimensions").disabled = true;
  $("dimensionStatus").textContent = "";
  draw();
};
$("resize").onclick = () => {
  const cols = Number($("cols").value),
    rows = Number($("chartRows").value);
  if (
    !Number.isInteger(cols) ||
    !Number.isInteger(rows) ||
    cols < 1 ||
    rows < 1 ||
    cols > 40 ||
    rows > 40
  ) {
    status("Chart dimensions must be whole numbers from 1 to 40.");
    return;
  }
  pending = { cols, rows };
  render();
};
$("apply").onclick = () => {
  if (!pending) return;
  record();
  const cells = Array(pending.cols * pending.rows).fill("sc");
  for (let r = 0; r < Math.min(editor().rows, pending.rows); r++)
    for (let c = 0; c < Math.min(editor().cols, pending.cols); c++)
      cells[r * pending.cols + c] = editor().cells[r * editor().cols + c];
  regionStart = regionEnd = null;
  const cellPlacements=resizePlacements(editor().cellPlacements,editor().cols,pending.cols,pending.rows);
  Object.assign(editor(), pending, { cells, cellPlacements });
  pending = null;
  changed();
};
$("cancel").onclick = () => {
  pending = null;
  syncFields();
  render();
};
$("undo").onclick = () => {
  if (syncAmi.hasDraft() || syncRounds.hasDraft() || syncAssembly.hasDraft() || !!bagPreview || patternLibrary.hasPending()) {
    status("Save or discard round and assembly drafts before undo.");
    return;
  }
  future.push(snapshot());
  project = {
    ...past.pop(),
    progress: project.progress,
    lifecycle: project.lifecycle,
    reservation: project.reservation,
  };
  syncFields();
  changed();
};
$("redo").onclick = () => {
  if (syncAmi.hasDraft() || syncRounds.hasDraft() || syncAssembly.hasDraft() || !!bagPreview || patternLibrary.hasPending()) {
    status("Save or discard round and assembly drafts before redo.");
    return;
  }
  past.push(snapshot());
  project = {
    ...future.pop(),
    progress: project.progress,
    lifecycle: project.lifecycle,
    reservation: project.reservation,
  };
  syncFields();
  changed();
};
$("customForm").onsubmit = (e) => {
  e.preventDefault();
  const mode = $("symbolMode").value;
  let image =
    mode === "existing"
      ? project.stitches.find((s) => s.id === selected)?.image
      : mode === "text"
        ? null
        : symbolImage;
  if (["draw", "import"].includes(mode) && !image) {
    $("symbolStatus").textContent = "Draw or import a symbol first.";
    return;
  }
  if (project.stitches.length >= 200) {
    status("Maximum 200 stitches per project.");
    return;
  }
  record();
  const s = {
    id: crypto.randomUUID(),
    name: $("stitchName").value.trim(),
    abbr: $("abbreviation").value.trim(),
    symbol: $("symbol").value,
    consumed: Number($("consumed").value),
    produced: Number($("produced").value),
  };
  if (mode === "existing")
    s.symbol = project.stitches.find((s) => s.id === selected).symbol;
  if (image) s.image = image;
  project.stitches.push(s);
  selected = s.id;
  changed();
};
$("savePattern").onclick = () => {
  const name = $("patternName").value.trim();
  if (!name) {
    status("Give your reusable pattern a name.");
    return;
  }
  const tags=$("patternTags").value.split(',').map(t=>t.trim()).filter(Boolean);
  if(tags.length>20||tags.some(t=>t.length>40)){status('Use up to 20 tags, each at most 40 characters.');return;}
  if (project.patterns.length >= 100) {
    status("Maximum 100 patterns per project.");
    return;
  }
  if (regionStart && !regionEnd) {
    status("Choose the opposite corner first.");
    return;
  }
  record();
  const a = region() ?? {
    left: 0,
    right: editor().cols - 1,
    bottom: 0,
    top: editor().rows - 1,
  };
  const cells = [];
  for (let r = a.bottom; r <= a.top; r++)
    for (let c = a.left; c <= a.right; c++)
      cells.push(editor().cells[r * editor().cols + c]);
  project.patterns.push({
    id:crypto.randomUUID(),
    description:$("patternDescription").value.trim(),
    tags:$("patternTags").value.split(",").map(t=>t.trim()).filter(Boolean),
    folder:$("patternFolder").value.trim(),
    name,
    cols: a.right - a.left + 1,
    rows: a.top - a.bottom + 1,
    cells,
  });
  $("patternName").value = "";
  changed();
};
$("estimate").onclick = async () => {
  if(activePiece(project).amigurumi){$("estimateResult").textContent="Amigurumi yarn estimates are not calibrated; flat-piece area estimates are not used.";return;}
  if (!$("cancelShape").disabled) {
    $("estimateResult").textContent =
      "Apply or cancel the shape preview before estimating.";
    return;
  }
  if (
    activePiece(project).sections ||
    (activePiece(project).shape && activePiece(project).shape !== "rectangle")
  ) {
    if (hasPendingDesign()) {
      $("estimateResult").textContent =
        "Save band edits and apply/cancel pending dimensions first.";
      return;
    }
    const snapshot = structuredClone(project),
      stamp = JSON.stringify(project);
    try {
      const result = await estimatePiece(snapshot, activePiece(snapshot));
      if (stamp !== JSON.stringify(project)) return;
      $("estimateResult").textContent =
        result.lots
          .map(
            (l) =>
              `${l.name} (lot ${l.dye_lot}): ${l.grams.toFixed(1)} g · ${l.meters.toFixed(1)} m · ${l.skeins.toFixed(2)} skein equivalents`,
          )
          .join("\n") +
        `\nTotal: ${result.grams.toFixed(1)} g. Area-based estimate. Shaping and round counts are not generated; bands use their own measured fabrics.`;
    } catch (e) {
      $("estimateResult").textContent = "Estimate unavailable: " + e.message;
    }
    return;
  }

  const stamp = JSON.stringify(project),
    quantity = activePiece(project).quantity;
  const keys = [
    "width",
    "length",
    "swatch_width",
    "swatch_length",
    "stitches",
    "rows",
    "grams",
    "skein_grams",
    "skein_meters",
    "allowance",
  ];
  const e = Object.fromEntries(
    keys.map((k) => [
      k,
      Number(["width", "length"].includes(k) ? editor().fields[k] : $(k).value),
    ]),
  );
  try {
    const r = await fetch("/api/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e),
    });
    if (!r.ok) throw Error(await r.text());
    const v = await r.json();
    if (JSON.stringify(project) !== stamp) return;
    v.grams *= quantity;
    v.meters *= quantity;
    v.skeins *= quantity;
    $("estimateResult").textContent =
      `${v.grams.toFixed(1)} g · ${v.meters.toFixed(1)} m\n${v.skeins.toFixed(2)} skein equivalents (${Math.ceil(v.skeins)} whole skeins)\n${v.stitches.toFixed(2)} stitches × ${v.rows.toFixed(2)} rows, before rounding\n${e.allowance}% allowance · ${$("blocking").value} · ${quantity} piece(s)\nArea-based estimate for the measured fabric. Exact-size rounding is not yet specified.`;
  } catch (e) {
    $("estimateResult").textContent = "Estimate unavailable: " + e.message;
  }
};
$("zoom").oninput = render;
$("rotation").oninput = draw;
$("view").onchange = draw;
$("save").onclick = save;
$("download").onclick = () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }),
  );
  const a = node("a");
  a.href = url;
  a.download = "stitchinator-project.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("openFile").onclick = () => $("import").click();
$("import").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 2 * 1024 * 1024) throw Error("Project exceeds 2 MB.");
    const data = normalizeProject(JSON.parse(await file.text()));
    await library.importProject(data);
  } catch (e) {
    status("Import failed: " + e.message);
  } finally {
    $("import").value = "";
  }
};
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
async function loadProject(id) {
  if (syncAmi.hasDraft() || syncRounds.hasDraft() || syncAssembly.hasDraft() || !!bagPreview || patternLibrary.hasPending())
    throw Error(
      "Save or discard unsaved round and assembly drafts before opening a project.",
    );
  if (
    (syncConsumption.hasDraft() || syncBands.hasDraft()) &&
    !confirm("Discard unsaved usage or band edits before opening this project?")
  )
    return;
  const r = await fetch("/api/projects/" + encodeURIComponent(id));
  if (!r.ok) throw Error(await r.text());
  const value = normalizeProject(await r.json());
  versions.set(id, value._version ?? 0);
  delete value._version;
  project = value;
  pending = null;
  past = [];
  future = [];
  selected = "sc";
  dirty = false;
  localStorage.setItem("stitchinator-active-project", id);
  syncFields();
  render();
  status("Local project restored.");
}
async function createProject(name, imported) {
  const value = imported ?? structuredClone(blankProject);
  value.id ??= crypto.randomUUID();
  value.fields.name = name;
  const id = value.id;
  const response = await fetch("/api/projects/" + id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Stitchinator": "1",
      "X-Project-Version": "0",
    },
    body: JSON.stringify(value),
  });
  if (!response.ok) throw Error(await response.text());
  await loadProject(id);
}
function hasPendingDesign({
  metadata = false,
  pieceDetails = true,
  bands = true,
  shape = true,
  rounds = true,
  assembly = true,
  photos = true,
  bag = true,
  patternLibrary: checkLibrary = true,
  pictureLibrary: checkPictures = true,
  amigurumi: checkAmi = true,
} = {}) {
  return (
    loading ||
    (photos && syncPhotos.hasPending()) ||
    (bag && !!bagPreview) ||
    (checkLibrary && patternLibrary.hasPending()) ||
    (checkPictures && pictureLibrary.hasPending()) ||
    (checkAmi && syncAmi.hasDraft()) ||
    (rounds && syncRounds.hasDraft()) ||
    (assembly && syncAssembly.hasDraft()) ||
    (shape && !$("cancelShape").disabled) ||
    (bands && syncBands.hasDraft()) ||
    !!pending ||
    !$("cancelDimensions").disabled ||
    $("width").value !== editor().fields.width ||
    $("length").value !== editor().fields.length ||
    (pieceDetails &&
      ($("pieceName").value !== activePiece(project).name ||
        Number($("pieceQuantity").value) !== activePiece(project).quantity)) ||
    (metadata &&
      ($("projectDescription").value !== (project.description ?? "") ||
        $("projectTags").value !== (project.tags ?? []).join(", ") ||
        $("projectFolder").value !== (project.folder ?? "")))
  );
}
const syncProgress = mountProgress({
  getProject: () => project,
  activePiece,
  changed,
  isPending: () => hasPendingDesign(),
});
const syncPieces = mountPieces({
  getProject: () => project,
  activePiece,
  addPiece,
  record,
  onChange: changed,
  syncEditor: syncFields,
  isPending: () => hasPendingDesign({ metadata: true, pieceDetails: false }),
});
const library = mountLibrary({
  getProject: () => project,
  createProject,
  loadProject,
  save,
  isPending: () => hasPendingDesign(),
  onMetadata: (meta) => {
    record();
    Object.assign(project, meta);
    changed(false);
  },
});
const renderRevisions = mountRevisions({
  getProject: () => project,
  setProject: (p) => {
    project = normalizeProject(p);
    past = [];
    future = [];
    pending = null;
    syncFields();
  },
  record,
  onChange: changed,
  isPending: () => hasPendingDesign(),
});
const syncExports = mountExports({
  getProject: () => exportView(project),
  setOptions: (options) => {
    project.exportOptions = options;
  },
  record,
  onChange: changed,
  isPending: () => hasPendingDesign(),
  getPicture: () => $("fabric").toDataURL(),
  getAllViews:()=>project.pieces.map(piece=>{const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=650;drawAssembly(canvas,{pieces:[{...structuredClone(piece),quantity:1,assembly:undefined}]},0,true);return {view:exportView({...project,activePieceId:piece.id}),picture:canvas.toDataURL()};}),
});
const syncYarnPlanning = mountYarnPlanning({
  getProject: () => project,
  activePiece,
  record,
  changed,
  syncFields,
  save,
  loadProject,
  isPending: () =>
    hasPendingDesign({ metadata: true }) ||
    inventory.hasPending() ||
    syncConsumption.hasDraft(),
});
const syncConsumption = mountConsumption({
  getProject: () => project,
  save,
  loadProject,
  isPending: () =>
    hasPendingDesign({ metadata: true }) || inventory.hasPending(),
  reloadInventory: () => inventory.reload(),
});
const syncBands = mountBands({
  getProject: () => project,
  activePiece,
  record,
  changed,
  isPending: () =>
    hasPendingDesign({ metadata: true, bands: false }) ||
    inventory.hasPending() ||
    syncConsumption.hasDraft(),
});
const syncShapes = mountShapes({
  getPiece: () => activePiece(project),
  record,
  changed,
  draw,
  isPending: () =>
    hasPendingDesign({ shape: false, metadata: true }) ||
    inventory.hasPending() ||
    syncConsumption.hasDraft(),
});
$('applyCraft').onclick=()=>{
 if(hasPendingDesign({metadata:true})||inventory.hasPending()||syncConsumption.hasDraft()){status('Resolve pending changes first.');return;}
 try{const next=setCraft(project,$('projectCraft').value,$('knittingMode').value);record();project=next;changed();status('Craft settings applied. Existing charts were preserved; select appropriate stitches and review instructions and measured gauge.');}catch(e){status(e.message);}
};
$('applyTerminology').onclick=()=>{
  if(hasPendingDesign({metadata:true})||inventory.hasPending()||syncConsumption.hasDraft()){status('Resolve pending changes first.');return;}
  try{const next=terminologyChange(project,$('terminology').value,$('addStandardStitches').checked);record();project=next;changed();status('Terminology applied to standard stitches. Custom labels and edited instructions were retained; review affected instructions.');}catch(e){status(e.message);}
};
$('patternSearch').oninput=render;$('patternFolderFilter').oninput=render;
const patternLibrary=mountPatternLibrary({getProject:()=>project,setProject:p=>{project=p;syncFields();},record,changed,isPending:()=>hasPendingDesign({metadata:true,patternLibrary:false})||inventory.hasPending()||syncConsumption.hasDraft(),normalize:normalizeProject});
const pictureLibrary=mountPictureLibrary({getProject:()=>project,getView:()=>exportView(project),setProject:p=>{project=p;syncFields();},record,changed,isPending:()=>hasPendingDesign({metadata:true,pictureLibrary:false})||inventory.hasPending()||syncConsumption.hasDraft(),normalize:normalizeProject});
let bagPreview=null,bagBasis="";
$('previewBag').onclick=()=>{
  if(hasPendingDesign({metadata:true,bag:false})||inventory.hasPending()||syncConsumption.hasDraft()) { $('bagStatus').textContent='Resolve pending changes first.';return; }
  try{bagBasis=JSON.stringify(project);bagPreview=bagTemplate(project,Number($('bagWidth').value),Number($('bagHeight').value),Number($('bagDepth').value));drawAssembly($('bagCanvas'),bagPreview);$('bagCanvas').hidden=false;$('bagStatus').textContent='Preview only: adds three designs, five copies and eight seams. Apply to add them to this project.';}catch(e){bagPreview=null;$('bagCanvas').hidden=true;$('bagStatus').textContent=e.message;}
};
$('applyBag').onclick=()=>{if(!bagPreview)return;if(bagBasis!==JSON.stringify(project)){$('bagStatus').textContent='Project changed; cancel and preview the template again.';return;}if(hasPendingDesign({metadata:true,bag:false})||inventory.hasPending()||syncConsumption.hasDraft()){$('bagStatus').textContent='Resolve pending changes first.';return;}record();project={...bagPreview,progress:project.progress,lifecycle:project.lifecycle,reservation:project.reservation};bagPreview=null;syncFields();changed();$('bagCanvas').hidden=true;$('bagStatus').textContent='Bag pieces added. Enter their swatches and yarn assignments.';};
$('cancelBag').onclick=()=>{bagPreview=null;$('bagCanvas').hidden=true;$('bagStatus').textContent='Template preview cancelled.';};
for(const id of ['bagWidth','bagHeight','bagDepth'])$(id).oninput=()=>{bagPreview=null;$('bagCanvas').hidden=true;$('bagStatus').textContent='Preview updated dimensions before applying.';};
const syncPhotos=mountPhotos({getProject:()=>project,record,changed,isPending:()=>hasPendingDesign({metadata:true,photos:false})||inventory.hasPending()||syncConsumption.hasDraft()});
const syncAssembly = mountAssembly({getProject:()=>project,record,changed,
  isPending:()=>hasPendingDesign({metadata:true,assembly:false})||inventory.hasPending()||syncConsumption.hasDraft()});
const syncRounds = mountRounds({
  getProject: () => project,
  getPiece: () => activePiece(project),
  record,
  changed,
  isPending: () =>
    hasPendingDesign({ metadata: true, rounds: false }) ||
    inventory.hasPending() ||
    syncConsumption.hasDraft(),
});
const syncAmi=mountAmigurumi({getProject:()=>project,setProject:p=>{project=p;},record,changed,syncFields,isPending:()=>hasPendingDesign({metadata:true,amigurumi:false})||inventory.hasPending()||syncConsumption.hasDraft(),normalize:normalizeProject});
const renderInstructions = mountInstructions({
  getProject: () => editor(),
  record,
  onChange: changed,
  element: $("instructions"),
});
try {
  const r = await fetch("/api/projects");
  if (!r.ok) throw Error(await r.text());
  const entries = await r.json();
  loading = false;
  const last = localStorage.getItem("stitchinator-active-project");
  if (entries.length)
    await loadProject(entries.find((p) => p.id === last)?.id ?? entries[0].id);
  else await createProject("My scarf");
  await library.refresh();
} catch (e) {
  loading = true;
  status(e.message + " Autosave disabled; download changes before leaving.");
}
render();

$("clearSelection").onclick = () => {
  regionStart = regionEnd = null;
  render();
};
const clearDrawing = setupDrawing($("symbolCanvas"), (image) => {
  symbolImage = image;
});
$("clearSymbol").onclick = clearDrawing;
$("symbolMode").onchange = () => {
  symbolImage = null;
  clearDrawing();
  $("symbolFile").value = "";
  $("symbolStatus").textContent = "";
  $("drawingPanel").hidden = $("symbolMode").value !== "draw";
  $("symbolFileLabel").hidden = $("symbolMode").value !== "import";
};
let importGeneration = 0;
$("symbolFile").onchange = async (e) => {
  const file = e.target.files[0];
  const generation = ++importGeneration;
  symbolImage = null;
  if (!file) return;
  $("symbolStatus").textContent = "Loading symbol…";
  try {
    const image = await importSymbol(file);
    if (generation !== importGeneration || $("symbolMode").value !== "import")
      return;
    symbolImage = image;
    $("symbolStatus").textContent = "Symbol ready. Add the stitch to use it.";
  } catch (e) {
    $("symbolStatus").textContent = e.message;
  }
};

const inventory = mountInventory();
mountBackups({
  save,
  isPending: () =>
    hasPendingDesign({ metadata: true }) ||
    inventory.hasPending() ||
    syncConsumption.hasDraft(),
});

$("estimateProject").onclick = async () => {
  if (hasPendingDesign()) {
    $("projectEstimate").textContent =
      "Apply or cancel pending changes and save piece details first.";
    return;
  }
  const snapshot = structuredClone(project),
    stamp = JSON.stringify(project);
  $("projectEstimate").textContent = "Calculating all pieces…";
  const result = await estimateCollection(snapshot);
  if (JSON.stringify(project) !== stamp) {
    $("projectEstimate").textContent =
      "Project changed during calculation. Recalculate for current pieces.";
    return;
  }
  $("projectEstimate").textContent =
    result.rows
      .map((row) =>
        row.result
          ? row.result.lots
            ? `${row.name} × ${row.quantity}: ${row.result.grams.toFixed(1)} g\n` +
              row.result.lots
                .map(
                  (l) =>
                    `  ${l.name} · lot ${l.dye_lot}: ${l.grams.toFixed(1)} g · ${l.meters.toFixed(1)} m · ${l.skeins.toFixed(2)} skein equivalents`,
                )
                .join("\n")
            : `${row.name} × ${row.quantity}: ${row.result.grams.toFixed(1)} g · ${row.result.meters.toFixed(1)} m (${row.result.skeins.toFixed(2)} skein equivalents)`
          : `${row.name} × ${row.quantity}: estimate unavailable — ${row.error}`,
      )
      .join("\n") +
    "\n" +
    (result.totalGrams === null
      ? "Project total unavailable until every piece has valid measurements."
      : `Total mass: ${result.totalGrams.toFixed(1)} g. Review stock and reservations for assigned lots. Combined skein purchasing is not yet calculated.`);
};

$("stitchFamily").onchange=render;

for(const id of ['snapEnabled','snapVertices','snapOrientation'])$(id).onchange=()=>{
 if(hasPendingDesign()){status('Resolve pending design changes first.');render();return;}
 record();project.diagramSnapping={enabled:$("snapEnabled").checked,vertices:$("snapVertices").checked,orientation:$("snapOrientation").value};changed();
};
function editDiagramGuides(remove=false){
 if(hasPendingDesign()){status('Resolve pending design changes first.');return;}
 const target=$("guideChart").value==='radial'?activePiece(project).roundChart:activePiece(project),key=$("guideChart").value==='radial'?'guides':'chartGuides';
 if(!target){$("guideStatus").textContent='Create a radial chart first.';return;}
 const guides=structuredClone(target[key]??[]);
 if(remove)guides.pop();else {
  const number=id=>Number($(id).value),kind=$("guideKind").value;
  const guide={kind,x:number('guideX'),y:number('guideY')};
  Object.assign(guide,kind==='line'?{x2:number('guideX2'),y2:number('guideY2')}:{radius:number('guideRadius'),start:number('guideStart'),end:number('guideEnd')});guides.push(guide);
 }
 try{validateGuides(guides);record();target[key]=guides;changed();$("guideStatus").textContent=`${guides.length} custom guides saved.`;}catch(e){$("guideStatus").textContent=e.message;}
}
$("addDiagramGuide").onclick=()=>editDiagramGuides();$("removeDiagramGuide").onclick=()=>editDiagramGuides(true);
