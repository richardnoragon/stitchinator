import { validateAmi } from "./amigurumi-model.mjs";
import { validatePlacement, validateSnapping, validateGuides } from "./stitch-placement.mjs";
import { validatePhotos } from "./photos.mjs";
import { validateAssemblyPlan, assemblyReport, seamBasis, edgePoints } from "./assembly-plan.mjs";
import { validateAssembly, transformPoint } from "./assembly.mjs";
import { validateRounds } from "./rounds.mjs";
import { shapes } from "./shapes.mjs";
import { validateBands } from "./yarn-bands.mjs";
import { validateProgress } from "./progress.mjs";
export const fields = [
  "name",
  "width",
  "length",
  "color",
  "swatch_width",
  "swatch_length",
  "stitches",
  "rows",
  "grams",
  "hook",
  "blocking",
  "skein_grams",
  "skein_meters",
  "allowance",
  "textSize",
];
function validateLegacy(p, allowHistory = true) {
  if (
    !p ||
    p.schema !== 1 ||
    !p.fields ||
    typeof p.fields !== "object" ||
    !Array.isArray(p.stitches) ||
    p.stitches.length < 1 ||
    p.stitches.length > 200 ||
    !Array.isArray(p.patterns) ||
    p.patterns.length > 100
  )
    throw Error("Unsupported project file.");
  if (
    p.exportOptions !== undefined &&
    (!p.exportOptions ||
      typeof p.exportOptions !== "object" ||
      Array.isArray(p.exportOptions) ||
      Object.entries(p.exportOptions).some(
        ([k, v]) =>
          !["chart", "picture", "yarn", "instructions", "notes"].includes(k) ||
          typeof v !== "boolean",
      ))
  )
    throw Error("Invalid export settings.");
  if (p.revisions !== undefined) {
    if (
      !allowHistory ||
      !Array.isArray(p.revisions) ||
      p.revisions.length > 100
    )
      throw Error("Invalid revision history.");
    const seen = new Set();
    for (const r of p.revisions) {
      if (
        !r ||
        typeof r.id !== "string" ||
        !r.id ||
        seen.has(r.id) ||
        typeof r.name !== "string" ||
        !r.name.trim() ||
        r.name.length > 100 ||
        typeof r.created !== "string" ||
        !Number.isFinite(Date.parse(r.created))
      )
        throw Error("Invalid revision metadata.");
      seen.add(r.id);
      validateProject(r.snapshot, false);
    }
  }
  if (
    p.id !== undefined &&
    (typeof p.id !== "string" || !/^[-a-zA-Z0-9]{1,64}$/.test(p.id))
  )
    throw Error("Invalid project ID.");
  if (
    p.description !== undefined &&
    (typeof p.description !== "string" || p.description.length > 2000)
  )
    throw Error("Invalid description.");
  if (
    p.tags !== undefined &&
    (!Array.isArray(p.tags) ||
      p.tags.length > 20 ||
      p.tags.some((t) => typeof t !== "string" || t.length > 40))
  )
    throw Error("Invalid tags.");
  if (
    p.folder !== undefined &&
    (typeof p.folder !== "string" || p.folder.length > 240)
  )
    throw Error("Invalid folder.");
  const dim = (n) => Number.isInteger(n) && n > 0 && n <= 40;
  if (
    !dim(p.cols) ||
    !dim(p.rows) ||
    !Array.isArray(p.cells) ||
    p.cells.length !== p.cols * p.rows
  )
    throw Error("Invalid chart dimensions.");
  for (const s of p.stitches)
    if (
      !s ||
      typeof s.id !== "string" ||
      typeof s.symbol !== "string" ||
      s.symbol.length > 8 ||
      typeof s.name !== "string" ||
      typeof s.abbr !== "string" ||
      !Number.isInteger(s.consumed) ||
      !Number.isInteger(s.produced) ||
      s.consumed < 0 ||
      s.produced < 0
    )
      throw Error("Invalid stitch definition.");
  for (const s of p.stitches)
    if (
      s.image !== undefined &&
      (typeof s.image !== "string" ||
        s.image.length > 60000 ||
        !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(s.image))
    )
      throw Error("Invalid symbol image.");
  if (p.instructions !== undefined) {
    const v = p.instructions;
    if (
      !v ||
      !["alternate", "left", "right"].includes(v.direction) ||
      !Array.isArray(v.rows) ||
      v.rows.length > 40 ||
      v.rows.some(
        (r) =>
          r !== null &&
          (!r ||
            typeof r.text !== "string" ||
            r.text.length > 8000 ||
            typeof r.source !== "string" ||
            r.source.length > 200000),
      ) ||
      typeof v.finishing !== "string" ||
      v.finishing.length > 16000
    )
      throw Error("Invalid saved instructions.");
  }
  const ids = new Set(p.stitches.map((s) => s.id));
  if (ids.size !== p.stitches.length || !ids.has("sc"))
    throw Error("Invalid stitch identifiers.");
  const checkCells = (c) =>
    c.every((id) => typeof id === "string" && ids.has(id));
  if(p.cellPlacements!==undefined) {
    if(!p.cellPlacements||typeof p.cellPlacements!=='object'||Array.isArray(p.cellPlacements))throw Error('Invalid chart placements.');
    for(const [key,value] of Object.entries(p.cellPlacements)) {
      if(!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>=p.cells.length)throw Error('Invalid chart placement index.');
      validatePlacement(value);
    }
  }
  if (!checkCells(p.cells)) throw Error("Unknown chart stitch.");
  for (const tile of p.patterns)
    if (
      !tile ||
      typeof tile.name !== "string" ||
      tile.name.length>100 ||
      (tile.description!==undefined&&(typeof tile.description!=="string"||tile.description.length>2000)) ||
      (tile.instructions!==undefined&&(typeof tile.instructions!=="string"||tile.instructions.length>16000)) ||
      (tile.photo!==undefined&&(typeof tile.photo!=="string"||tile.photo.length>200000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(tile.photo))) ||
      (tile.folder!==undefined&&(typeof tile.folder!=="string"||tile.folder.length>240)) ||
      (tile.tags!==undefined&&(!Array.isArray(tile.tags)||tile.tags.length>20||tile.tags.some(t=>typeof t!=="string"||t.length>40))) ||
      !dim(tile.cols) ||
      !dim(tile.rows) ||
      !Array.isArray(tile.cells) ||
      tile.cells.length !== tile.cols * tile.rows ||
      !checkCells(tile.cells)
    )
      throw Error("Invalid pattern.");
  for (const id of fields)
    if (typeof p.fields[id] !== "string" || p.fields[id].length > 1000)
      throw Error("Invalid project fields.");
  if (!/^#[0-9a-f]{6}$/i.test(p.fields.color))
    throw Error("Invalid yarn color.");
  return p;
}

const sharedFields = new Set(["name", "textSize", "allowance"]);
export function validateProject(p, allowHistory = true) {
  if(p?.diagramSnapping!==undefined)validateSnapping(p.diagramSnapping);
  validateProgress(p?.progress);
  if (p?.schema === 1) return validateLegacy(p, allowHistory);
  if (
    !p ||
    p.schema !== 2 ||
    !Array.isArray(p.pieces) ||
    !p.pieces.length ||
    p.pieces.length > 32
  )
    throw Error("Invalid multi-piece project.");
  validateAssemblyPlan(p.assemblyPlan);
  validatePhotos(p.photos);
  if(p.shapingSuggestions!==undefined&&typeof p.shapingSuggestions!=="boolean")throw Error("Invalid shaping setting.");
  if(p.craft!==undefined&&!["crochet","knitting"].includes(p.craft))throw Error("Invalid project craft.");
  if(p.terminology!==undefined&&!['US','UK','DE'].includes(p.terminology))throw Error("Invalid terminology.");
  const ids = new Set();
  for (const piece of p.pieces) {
    if (
      !piece ||
      typeof piece.id !== "string" ||
      !/^[-a-zA-Z0-9]{1,64}$/.test(piece.id) ||
      ids.has(piece.id) ||
      typeof piece.name !== "string" ||
      !piece.name.trim() ||
      piece.name.length > 100 ||
      !Number.isInteger(piece.quantity) ||
      piece.quantity < 1 ||
      piece.quantity > 99 ||
      !piece.fields ||
      typeof piece.fields !== "object"
    )
      throw Error("Invalid piece identity, name, or quantity.");
    if (
      piece.yarn !== undefined &&
      (!piece.yarn ||
        typeof piece.yarn.id !== "string" ||
        !/^[-a-zA-Z0-9]{1,64}$/.test(piece.yarn.id) ||
        typeof piece.yarn.name !== "string" ||
        piece.yarn.name.length > 200 ||
        typeof piece.yarn.dye_lot !== "string")
    )
      throw Error("Invalid piece yarn assignment.");
    if(piece.chartGuides!==undefined)validateGuides(piece.chartGuides);
    if (piece.shape !== undefined && !shapes.includes(piece.shape))
      throw Error("Unsupported piece shape.");
    validateAmi(piece.amigurumi);
    validateBands(piece.sections);
    validateRounds(piece.roundChart, p.stitches);
    validateAssembly(piece.assembly);
    if(piece.knittingMode!==undefined&&!["flat","round"].includes(piece.knittingMode))throw Error("Invalid knitting mode.");
    ids.add(piece.id);
    const view = {
      ...p,
      schema: 1,
      fields: { ...piece.fields, ...p.fields },
      cols: piece.cols,
      rows: piece.rows,
      cells: piece.cells,
      cellPlacements: piece.cellPlacements,
      instructions: piece.instructions,
    };
    delete view.revisions;
    validateLegacy(view, false);
  }
  if (!ids.has(p.activePieceId)) throw Error("Active piece is missing.");
  const first = p.pieces[0];
  validateLegacy(
    {
      ...p,
      schema: 1,
      fields: { ...first.fields, ...p.fields },
      cols: first.cols,
      rows: first.rows,
      cells: first.cells,
      instructions: first.instructions,
    },
    allowHistory,
  );
  return p;
}
export function normalizeProject(input) {
  validateProject(input);
  const p = structuredClone(input);
  if (p.schema === 1) {
    const piece = {
      id: "piece-1",
      name: "Main piece",
      quantity: 1,
      fields: Object.fromEntries(
        Object.entries(p.fields).filter(([key]) => !sharedFields.has(key)),
      ),
      cols: p.cols,
      rows: p.rows,
      cells: p.cells,
    };
    if (p.instructions) piece.instructions = p.instructions;
    if (p.cellPlacements) piece.cellPlacements = p.cellPlacements;
    delete p.cellPlacements;
    p.fields = Object.fromEntries(
      Object.entries(p.fields).filter(([key]) => sharedFields.has(key)),
    );
    p.schema = 2;
    p.pieces = [piece];
    p.activePieceId = piece.id;
    delete p.cols;
    delete p.rows;
    delete p.cells;
    delete p.instructions;
  }
  if (p.revisions)
    for (const revision of p.revisions)
      revision.snapshot = normalizeProject(revision.snapshot);
  return p;
}
export function activePiece(project) {
  return project.pieces.find((piece) => piece.id === project.activePieceId);
}
export function editorView(project, id = project.activePieceId) {
  const piece = project.pieces.find((piece) => piece.id === id);
  if (!piece) throw Error("Piece not found.");
  const view = {
    schema: 1,
    stitches: project.stitches,
    patterns: project.patterns,
    exportOptions: project.exportOptions,
    pieceName: piece.name,
    craft: project.craft??"crochet",
    knittingMode:piece.knittingMode??"flat",
    quantity: piece.quantity,
  };
  view.fields = new Proxy(
    {},
    {
      get: (_, key) =>
        (sharedFields.has(key) ? project.fields : piece.fields)[key],
      set: (_, key, value) => {
        (sharedFields.has(key) ? project.fields : piece.fields)[key] = value;
        return true;
      },
      ownKeys: () => fields,
      getOwnPropertyDescriptor: () => ({
        enumerable: true,
        configurable: true,
      }),
    },
  );
  for (const key of ["cols", "rows", "cells", "instructions", "cellPlacements"])
    Object.defineProperty(view, key, {
      enumerable: true,
      get: () => piece[key],
      set: (value) => {
        piece[key] = value;
      },
    });
  return view;
}
export function exportView(project) {
  // Explicit plain data: structuredClone cannot clone the editor field proxy.
  const view = editorView(project);
  return {
    schema: 1,
    fields: Object.fromEntries(fields.map((key) => [key, view.fields[key]])),
    cols: view.cols,
    rows: view.rows,
    cells: structuredClone(view.cells),
    cellPlacements: structuredClone(view.cellPlacements),
    stitches: structuredClone(view.stitches),
    patterns: structuredClone(view.patterns),
    instructions: structuredClone(view.instructions),
    exportOptions: structuredClone(project.exportOptions),
    amigurumi: structuredClone(activePiece(project).amigurumi),
    roundChart: project.craft==="knitting"?undefined:structuredClone(activePiece(project).roundChart),
    assemblyReport: assemblyReport(project),
    photos: structuredClone(project.photos??[]),
    shape: activePiece(project).shape ?? "rectangle",
    sections: structuredClone(activePiece(project).sections),
    yarn: structuredClone(activePiece(project).yarn),
    pieceName: view.pieceName,
    craft:view.craft,
    knittingMode:view.knittingMode,
    quantity: view.quantity,
  };
}
export function addPiece(project, name, quantity = 1) {
  name = name.trim();
  if (!name || name.length > 100)
    throw Error("Give the piece a name of 1–100 characters.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99)
    throw Error("Quantity must be a whole number from 1 to 99.");
  if (project.pieces.length >= 32)
    throw Error("This prototype supports up to 32 pieces per project.");
  if (
    project.pieces.some(
      (p) => p.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    )
  )
    throw Error("Choose a distinctive piece name.");
  const piece = {
    id: crypto.randomUUID(),
    name,
    quantity,
    cols: 12,
    rows: 10,
    cells: Array(120).fill("sc"),
    fields: {
      width: "20",
      length: "100",
      color: "#cb765d",
      swatch_width: "",
      swatch_length: "",
      stitches: "",
      rows: "",
      grams: "",
      hook: "",
      blocking: "After blocking",
      skein_grams: "",
      skein_meters: "",
    },
  };
  project.pieces.push(piece);
  project.activePieceId = piece.id;
  return piece;
}

export function bagTemplate(project,width,height,depth) {
  if(![width,height,depth].every(n=>Number.isFinite(n)&&n>0&&n<=200))throw Error('Use bag dimensions greater than 0 and at most 200 cm.');
  if(project.pieces.length>29)throw Error('The bag template needs three available piece slots.');
  const next=structuredClone(project);let n=1;
  while(next.pieces.some(p=>p.name.startsWith(`Bag ${n} `)))n++;
  const base=addPiece(next,`Bag ${n} base`,1),panels=addPiece(next,`Bag ${n} front/back`,2),ends=addPiece(next,`Bag ${n} ends`,2);
  const pose=(x,y,z,rx=0,ry=0)=>({x,y,z,rx,ry,rz:0});
  for(const [p,w,h] of [[base,width,depth],[panels,width,height],[ends,depth,height]]) {
    p.shape='rectangle';p.fields.width=String(w);p.fields.length=String(h);p.cells.fill(next.stitches.some(s=>s.id==='sc')?'sc':next.stitches[0].id);
  }
  base.assembly={'1':pose(0,height/2,0,90)};
  panels.assembly={'1':pose(0,0,-depth/2),'2':pose(0,0,depth/2,0,180)};
  ends.assembly={'1':pose(-width/2,0,0,0,-90),'2':pose(width/2,0,0,0,90)};
  next.assemblyPlan??={notes:'',seams:[]};
  const endpoint=(piece,copy,edge)=>({pieceId:piece.id,copy,edge});
  const pairs=[
    [endpoint(base,1,'top'),endpoint(panels,1,'bottom')],
    [endpoint(base,1,'bottom'),endpoint(panels,2,'bottom')],
    [endpoint(base,1,'left'),endpoint(ends,1,'bottom')],
    [endpoint(base,1,'right'),endpoint(ends,2,'bottom')],
    [endpoint(panels,1,'left'),endpoint(ends,1,'right')],
    [endpoint(panels,1,'right'),endpoint(ends,2,'left')],
    [endpoint(panels,2,'right'),endpoint(ends,1,'left')],
    [endpoint(panels,2,'left'),endpoint(ends,2,'right')]
  ];
  for(const [i,[a,b]] of pairs.entries()) {
    const seam={id:crypto.randomUUID(),name:`Bag ${n} seam ${i+1}`,a,b,reverse:true,note:'Choose a joining method and check row/stitch matching before making.',basis:''};
    const pa=next.pieces.find(p=>p.id===a.pieceId),pb=next.pieces.find(p=>p.id===b.pieceId);
    const ap=edgePoints(pa,a.edge).map(p=>transformPoint(p,pa.assembly[a.copy])),bp=edgePoints(pb,b.edge).map(p=>transformPoint(p,pb.assembly[b.copy]));
    const distance=(p,q)=>Math.hypot(...p.map((v,i)=>v-q[i]));seam.reverse=distance(ap[0],bp.at(-1))<distance(ap[0],bp[0]);
    seam.basis=seamBasis(next,seam);next.assemblyPlan.seams.push(seam);
  }
  next.assemblyPlan.notes=(next.assemblyPlan.notes+'\n'+`Bag ${n}: open-top panel concept. Enter measured swatches for each design, choose seam methods and allowance, and design handles or closures separately. Dimensions exclude seam take-up.`).trim();
  next.activePieceId=base.id;validateProject(next);return next;
}
