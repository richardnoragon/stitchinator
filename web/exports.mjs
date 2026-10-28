import { amiDocumentPages } from "./amigurumi.mjs";
import { amiWarnings } from "./amigurumi-model.mjs";
import { placedSymbol } from "./stitch-placement.mjs";
import { roundWarnings, roundCanvas } from "./rounds.mjs";
import { rowInstructions } from "./instructions.mjs";
export const exportDefaults = {
  chart: true,
  picture: true,
  yarn: true,
  instructions: true,
  notes: true,
};
export function exportWarnings(p, options, estimate) {
  if(p.amigurumi)return [...amiWarnings(p.amigurumi),...(options.yarn?["Amigurumi yarn estimates are not calibrated."]:[]),"Procedural amigurumi approximation: verify construction and stuffing manually."];
  const warnings = [];
  if(options.notes) warnings.push(...(p.assemblyReport?.warnings??[]));
  if (p.roundChart && (options.chart || options.instructions))
    warnings.push(...roundWarnings(p.roundChart, p.stitches));
  if (p.shape && p.shape !== "rectangle")
    warnings.push(
      "Flat-shape area estimate only. The sample chart does not provide shaping, increase/decrease placement, or round instructions.",
    );
  const defs = new Map(p.stitches.map((s) => [s.id, s]));
  let previous = null;
  for (let r = 0; r < p.rows; r++) {
    let used = 0,
      made = 0;
    for (const id of p.cells.slice(r * p.cols, (r + 1) * p.cols)) {
      used += defs.get(id).consumed;
      made += defs.get(id).produced;
    }
    if (previous !== null && used !== previous)
      warnings.push(
        `Row ${r + 1}: consumes ${used} stitches; previous row produces ${previous}.`,
      );
    previous = made;
  }
  if (options.yarn && !estimate)
    warnings.push(
      "Yarn estimate unavailable. Complete the required measured swatch and yarn specifications.",
    );
  if (options.instructions) {
    if (!p.instructions) warnings.push("Instructions have not been generated.");
    else {
      const fresh = rowInstructions(p, p.instructions.direction);
      for (let i = 0; i < fresh.length; i++)
        if (!p.instructions.rows[i])
          warnings.push(`Row ${i + 1}: saved instructions missing.`);
        else if (p.instructions.rows[i].source !== fresh[i].source)
          warnings.push(
            `Row ${i + 1}: saved instructions need review against the current chart.`,
          );
      if (p.instructions.rows.slice(p.rows).some(Boolean))
        warnings.push(
          "Instructions for removed rows are excluded from this export; they remain saved in the project.",
        );
    }
  }
  return warnings;
}
async function loadImage(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}
export async function renderExportPages(p, options, estimate, picture) {
  if(p.amigurumi){const piece={id:'amigurumi-export',name:p.pieceName??p.fields.name,quantity:p.quantity??1,fields:p.fields,amigurumi:p.amigurumi};return {pages:amiDocumentPages({pieces:[piece],activePieceId:piece.id},'part',options),warnings:exportWarnings(p,options,null)};}

  const pages = [];
  let canvas, ctx, y;
  const width = 1200,
    height = 1600,
    left = 70,
    right = 1130,
    bottom = 1490;
  function start() {
    if (pages.length >= 20)
      throw Error(
        "Export exceeds 20 pages. Reduce selected content or shorten instructions.",
      );
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#283b37";
    ctx.font = "18px sans-serif";
    ctx.fillText("STITCHINATOR · SAMPLE-CHART DESIGN", left, 45);
    ctx.fillText(`Page ${pages.length + 1}`, 1030, 1550);
    pages.push(canvas);
    y = 90;
  }
  function space(n) {
    if (y + n > bottom) start();
  }
  function line(s, size = 23) {
    space(size + 13);
    ctx.font = `${size}px sans-serif`;
    ctx.fillStyle = "#283b37";
    ctx.fillText(s, left, y + size);
    y += size + 13;
  }
  function text(value, size = 23) {
    for (const paragraph of String(value).split("\n")) {
      let current = "";
      ctx.font = `${size}px sans-serif`;
      for (const ch of paragraph) {
        if (ctx.measureText(current + ch).width > right - left) {
          const cut = current.lastIndexOf(" ");
          if (cut > 0) {
            line(current.slice(0, cut), size);
            current = current.slice(cut + 1);
          } else {
            line(current, size);
            current = "";
          }
        }
        current += ch;
      }
      line(current, size);
    }
  }
  function heading(s) {
    space(100);
    y += 18;
    text(s, 30);
  }
  async function image(src, maxHeight) {
    const img = await loadImage(src);
    const scale = Math.min((right - left) / img.width, maxHeight / img.height);
    space(img.height * scale + 20);
    ctx.drawImage(img, left, y, img.width * scale, img.height * scale);
    y += img.height * scale + 20;
  }
  start();
  text(p.fields.name || "Untitled project", 36);
  if (p.shape)
    text(
      `Shape: ${p.shape}. ${p.shape === "circle" ? `Diameter ${p.fields.width} cm` : `Width/base ${p.fields.width} cm × length/height ${p.fields.length} cm`}`,
      20,
    );
  if (p.pieceName) text(`Piece: ${p.pieceName} · Make ${p.quantity ?? 1}`, 25);
  text(
    p.shape === "circle"
      ? `Intended diameter: ${p.fields.width} cm.`
      : `Intended dimensions: ${p.fields.width} × ${p.fields.length} cm.`,
    21,
  );
  text(
    "Sample chart only. Foundation/turning chains, placement details, and full-piece sizing are not generated.",
    20,
  );
  const warnings = exportWarnings(p, options, estimate);
  if (warnings.length) {
    heading("Review warnings");
    for (const warning of warnings) text("• " + warning, 20);
  }
  if (options.chart && p.roundChart) {
    heading(`Radial sample · ${p.roundChart.mode} · ${p.roundChart.direction}`);
    await image(
      (await roundCanvas(p.roundChart, p.stitches)).toDataURL(),
      1050,
    );
    heading("Radial stitch legend");
    for (const id of new Set(p.roundChart.rounds.flatMap((r) => r.cells))) {
      const s = p.stitches.find((s) => s.id === id);
      space(75);
      if (s.image) {
        ctx.drawImage(await loadImage(s.image), left, y, 38, 38);
        y += 42;
      }
      text(
        `${s.image ? "" : s.symbol + " "}${s.name} (${s.abbr}): consumes ${s.consumed}, produces ${s.produced}.`,
        20,
      );
    }
  }
  if (options.chart) {
    heading(`Sample chart · ${p.cols} columns × ${p.rows} rows`);
    const chart = document.createElement("canvas");
    const cell = 40;
    chart.width = p.cols * cell + 70;
    chart.height = p.rows * cell + 40;
    const c = chart.getContext("2d");
    c.fillStyle = "white";
    c.fillRect(0, 0, chart.width, chart.height);
    c.font = "25px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    const defs = new Map(p.stitches.map((s) => [s.id, s]));
    const assets = new Map();
    for (const s of p.stitches)
      if (s.image) assets.set(s.id, await loadImage(s.image));
    for (let row = 0; row < p.rows; row++) {
      c.fillStyle = "#283b37";
      c.font = "16px sans-serif";
      c.fillText(String(row + 1), 25, (p.rows - row - 0.5) * cell + 20);
      for (let col = 0; col < p.cols; col++) {
        const x = col * cell + 55,
          yy = (p.rows - row - 1) * cell + 20,
          s = defs.get(p.cells[row * p.cols + col]);
        c.strokeStyle = "#9ba99c";
        c.strokeRect(x, yy, cell, cell);
        const pose=placedSymbol(x+cell/2,yy+cell/2,cell*.7,p.cellPlacements?.[row*p.cols+col],cell);
        c.save();c.translate(pose.x,pose.y);c.rotate(pose.rotation*Math.PI/180);
        if (assets.has(s.id))
          c.drawImage(assets.get(s.id), -cell*.35, -cell*.35, cell*.7, cell*.7);
        else {
          c.font = "25px sans-serif";
          c.fillStyle = "#283b37";
          c.fillText(s.symbol, 0, 0);
        }
        c.restore();
      }
    }
    await image(chart.toDataURL(), 1050);
    heading("Stitch legend");
    for (const id of new Set(p.cells)) {
      const s = defs.get(id);
      space(75);
      if (s.image) {
        ctx.drawImage(assets.get(id), left, y, 38, 38);
        y += 42;
      }
      text(
        `${s.image ? "" : s.symbol + " · "}${s.name} (${s.abbr}): consumes ${s.consumed}, produces ${s.produced}.`,
        20,
      );
    }
  }
  if (options.picture) {
    heading("Approximate fabric preview");
    await image(picture, 480);
    text(
      "Overall shape and approximate texture; no physical drape simulation.",
      20,
    );
  }
  if (options.yarn) {
    heading("Yarn estimate");
    if (estimate?.lots) {
      for (const l of estimate.lots)
        text(
          `${l.name} · lot ${l.dye_lot}: ${(l.grams * (p.quantity ?? 1)).toFixed(1)} g · ${(l.meters * (p.quantity ?? 1)).toFixed(1)} m · ${(l.skeins * (p.quantity ?? 1)).toFixed(2)} skein equivalents`,
        );
      if (!p.shape || p.shape === "rectangle")
        for (const b of estimate.bands)
          text(
            `${b.name}: ${b.percent}% of length, ${b.stitches.toFixed(2)} stitches × ${b.rows.toFixed(2)} rows per copy before rounding; hook ${b.hook || "not recorded"}; ${b.blocking || "blocking state not recorded"}; pattern ${b.pattern || "not named"}.`,
          );
      text(
        `Total ${(estimate.grams * (p.quantity ?? 1)).toFixed(1)} g including ${p.fields.allowance}% allowance. Shape area and band regions use independent measured fabrics. Shaping and joining instructions are not generated.`,
        20,
      );
    } else if (estimate) {
      text(
        `${(estimate.grams * (p.quantity ?? 1)).toFixed(1)} g · ${(estimate.meters * (p.quantity ?? 1)).toFixed(1)} m · ${(estimate.skeins * (p.quantity ?? 1)).toFixed(2)} skein equivalents (${Math.ceil(estimate.skeins * (p.quantity ?? 1))} whole skeins) for ${p.quantity ?? 1} piece(s).`,
      );
      text(`${p.fields.allowance}% extra allowance. ${p.fields.blocking}.`);
      text(
        "Area-based estimate for one yarn. The measured swatch must represent the entire fabric pattern.",
        20,
      );
    } else text("Unavailable — required measurements are missing or invalid.");
  }
  if (options.instructions && p.roundChart) {
    heading("Saved round instructions");
    p.roundChart.rounds.forEach((r, i) =>
      text(`Round ${i + 1}: ${r.instruction?.text ?? "Not generated."}`, 20),
    );
  }
  if (options.instructions) {
    heading("Saved sample-chart instructions");
    if (!p.instructions) text("Not generated.");
    else
      for (let i = 0; i < p.rows; i++)
        text(
          "• " +
            (p.instructions.rows[i]?.text ??
              `Row ${i + 1}: instructions unavailable.`),
        );
  }
  if (options.notes) {
    heading("Finishing and assembly notes");
    text(p.instructions?.finishing || "No finishing notes recorded.");
    for(const line of p.assemblyReport?.lines??[]) text(line,20);
    for(const photo of p.photos??[]) {heading(photo.name);await image(photo.data,500);}
  }
  return { pages, warnings };
}
export function mountExports({
  getProject,
  setOptions,
  record,
  onChange,
  isPending,
  getPicture,
  getAllViews,
}) {
  const $ = (id) => document.getElementById(id);
  let pages = [],
    index = 0,
    filename = "stitchinator",
    generation = 0;
  const fields = Object.keys(exportDefaults);
  const dialog = $("exportDialog");
  function sync() {
    const options = { ...exportDefaults, ...getProject().exportOptions };
    for (const k of fields) $("export-" + k).checked = options[k];
  }
  for (const k of fields)
    $("export-" + k).onchange = () => {
      record();
      const options = Object.fromEntries(
        fields.map((k) => [k, $("export-" + k).checked]),
      );
      if (setOptions) setOptions(options);
      else getProject().exportOptions = options;
      onChange(false);
    };
  function controls() {
    const allowed =
      pages.length > 0 &&
      (!$("exportAcknowledgement").hidden
        ? $("exportAcknowledge").checked
        : true);
    $("exportPng").disabled = !allowed;
    $("exportPdf").disabled = !allowed;
  }
  function show() {
    const img = $("exportPage");
    img.src = pages[index].toDataURL();
    img.alt = `Export preview page ${index + 1}`;
    $("exportPageNumber").textContent = `Page ${index + 1} of ${pages.length}`;
    $("exportPrevious").disabled = index === 0;
    $("exportNext").disabled = index === pages.length - 1;
  }
  $("previewExport").onclick = async () => {
    if (isPending()) {
      $("exportStatus").textContent =
        "Apply or cancel pending dimensions and chart size before exporting.";
      return;
    }
    const p = structuredClone(getProject()),
      options = { ...exportDefaults, ...p.exportOptions };
    if (!Object.values(options).some(Boolean)) {
      $("exportStatus").textContent =
        "Select at least one export content type.";
      return;
    }
    $("exportStatus").textContent = "";
    const token = ++generation;
    const picture = getPicture();
    const documents=$("exportAllPieces").checked&&getAllViews?getAllViews():[{view:p,picture}];
    pages = [];
    index = 0;
    $("exportPages").hidden = true;
    $("exportWarnings").textContent = "Preparing preview…";
    $("exportAcknowledgement").hidden = true;
    $("exportAcknowledge").checked = false;
    controls();
    dialog.showModal();
    try {
      const result={pages:[],warnings:[]};
      for(const [documentIndex,document] of documents.entries()) {
        const p=structuredClone(document.view);
        if(documentIndex){p.assemblyReport={lines:[],warnings:[]};p.photos=[];}
      let estimate = null;
      if (options.yarn && !p.amigurumi) {
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
        try {
          const response = await fetch("/api/estimate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              Object.fromEntries(keys.map((k) => [k, Number(p.fields[k])])),
            ),
          });
          if (response.ok) estimate = await response.json();
          if (p.sections || (p.shape && p.shape !== "rectangle")) {
            const bands = await fetch("/api/estimate-piece", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                piece: {
                  fields: p.fields,
                  sections: p.sections,
                  shape: p.shape,
                  yarn: p.yarn,
                  quantity: 1,
                },
                allowance: Number(p.fields.allowance),
              }),
            });
            estimate = bands.ok ? await bands.json() : null;
          }
        } catch {}
      }
      const rendered = await renderExportPages(p, options, estimate, document.picture);
      result.pages.push(...rendered.pages);result.warnings.push(...rendered.warnings.map(w=>`${p.pieceName??'Project'}: ${w}`));
      if(result.pages.length>100)throw Error('Combined export exceeds 100 pages. Export pieces separately or select less content.');
      }
      if (token !== generation) return;
      pages = result.pages;
      filename =
        (p.fields.name || "stitchinator")
          .replace(/[^a-z0-9_-]+/gi, "-")
          .slice(0, 80) || "stitchinator";
      $("exportWarnings").textContent = result.warnings.length
        ? result.warnings.join("\n")
        : "No count or content warnings detected. Review the sample-chart limitations before use.";
      $("exportAcknowledgement").hidden = !result.warnings.length;
      $("exportPages").hidden = false;
      show();
      controls();
    } catch (e) {
      if (token !== generation) return;
      pages = [];
      $("exportWarnings").textContent = "Export failed: " + e.message;
      controls();
    }
  };
  $("exportAcknowledge").onchange = controls;
  $("exportPrevious").onclick = () => {
    index--;
    show();
  };
  $("exportNext").onclick = () => {
    index++;
    show();
  };
  $("closeExport").onclick = () => dialog.close();
  dialog.addEventListener("close", () => {
    generation++;
  });
  $("exportPng").onclick = () => {
    const a = document.createElement("a");
    a.download = `${filename}-page-${index + 1}.png`;
    a.href = pages[index].toDataURL();
    a.click();
  };
  $("exportPdf").onclick = async () => {
    const area = $("printExport");
    area.replaceChildren();
    for (const canvas of pages) {
      const img = document.createElement("img");
      img.src = canvas.toDataURL();
      img.className = "printPage";
      area.append(img);
    }
    await Promise.all([...area.children].map((img) => img.decode()));
    window.print();
  };
  return sync;
}
