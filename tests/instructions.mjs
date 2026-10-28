import test from "node:test";
import assert from "node:assert/strict";
import { rowInstructions, chartGaugeSummary } from "../web/instructions.mjs";
const project = {
  cols: 4,
  rows: 2,
  cells: ["a", "b", "a", "b", "a", "a", "a", "a"],
  stitches: [
    { id: "a", name: "Single crochet", abbr: "sc", consumed: 1, produced: 1 },
    { id: "b", name: "Increase", abbr: "inc", consumed: 1, produced: 2 },
  ],
  fields: {
    swatch_width: "10",
    swatch_length: "10",
    stitches: "20",
    rows: "25",
    blocking: "After blocking",
    width: "20",
    length: "100",
  },
};
test("alternating reading order and repeated groups retain counts", () => {
  const rows = rowInstructions(project);
  assert.match(
    rows[0].text,
    /right to left.*Repeat \[1 × Increase \(inc\), 1 × Single crochet \(sc\)\] 2 times/,
  );
  assert.match(rows[0].text, /Consumes 4; produces 6/);
  assert.match(rows[1].text, /left to right.*4 times/);
});
test("only affected rows need a different source after chart edit", () => {
  const before = rowInstructions(project);
  const p = structuredClone(project);
  p.cells[0] = "b";
  const after = rowInstructions(p);
  assert.notEqual(before[0].source, after[0].source);
  assert.equal(before[1].source, after[1].source);
});
test("sample width uses produced counts, not symbol columns", () => {
  assert.match(chartGaugeSummary(project), /2.00–3.00 cm wide × 0.80 cm long/);
});
test("missing gauge remains unavailable", () => {
  const p = structuredClone(project);
  p.fields.stitches = "";
  assert.match(chartGaugeSummary(p), /Enter swatch/);
});

import { exportWarnings } from "../web/exports.mjs";
test("export warnings reflect selected content and stale instruction rows", () => {
  const p = structuredClone(project);
  p.instructions = {
    direction: "alternate",
    rows: rowInstructions(p),
    finishing: "",
  };
  assert.ok(
    exportWarnings(p, { yarn: true, instructions: true }, null).some((s) =>
      s.includes("estimate unavailable"),
    ),
  );
  assert.ok(
    !exportWarnings(p, { yarn: false, instructions: true }, null).some((s) =>
      s.includes("estimate unavailable"),
    ),
  );
  p.cells[0] = "b";
  assert.ok(
    exportWarnings(p, { instructions: true }, null).some((s) =>
      s.includes("need review"),
    ),
  );
  assert.ok(
    !exportWarnings(p, { instructions: false }, null).some((s) =>
      s.includes("need review"),
    ),
  );
});

import { addRevision, restoreRevision } from "../web/revisions.mjs";
test("named snapshots are independent and never recursively contain history", () => {
  const p = structuredClone(project);
  const one = addRevision(p, "Original border");
  const two = addRevision(one, "Wider border");
  assert.equal(two.revisions.length, 2);
  assert.equal(two.revisions[1].snapshot.revisions, undefined);
  two.cells[0] = "b";
  assert.equal(two.revisions[0].snapshot.cells[0], "a");
  assert.equal(p.revisions, undefined);
});
test("restore preserves history and operational state and adds before/after snapshots", () => {
  let p = addRevision(project, "Original");
  const id = p.revisions[0].id;
  p.cells[0] = "b";
  p.progress = { row: 3 };
  p.consumption = { grams: 17 };
  const restored = restoreRevision(p, id);
  assert.equal(restored.cells[0], "a");
  assert.equal(restored.revisions.length, 3);
  assert.equal(restored.revisions[1].snapshot.cells[0], "b");
  assert.deepEqual(restored.progress, { row: 3 });
  assert.deepEqual(restored.consumption, { grams: 17 });
  assert.equal(p.cells[0], "b");
});
test("revision naming and size limits reject without mutating current work", () => {
  const p = addRevision(project, "Original");
  assert.throws(() => addRevision(p, " ORIGINAL "), /already exists/);
  assert.throws(() => addRevision(p, "   "), /descriptive/);
  const large = structuredClone(p);
  large.padding = "x".repeat(2 * 1024 * 1024);
  assert.throws(() => addRevision(large, "Large"), /2 MB/);
  assert.equal(large.revisions.length, 1);
});

import { normalizeFolder, parseTags, matchesProject } from "../web/library.mjs";
test("library metadata supports normalized nested paths, tags, and parent search", () => {
  assert.equal(normalizeFolder(" Gifts / Scarves / "), "Gifts/Scarves");
  assert.throws(() => normalizeFolder("Gifts/../Other"));
  assert.deepEqual(parseTags("gift, soft, gift"), ["gift", "soft"]);
  assert.ok(
    matchesProject(
      {
        name: "Scarf",
        description: "Warm wool",
        tags: ["Gift"],
        folder: "Gifts/Scarves",
      },
      "WOOL",
      "Gifts",
    ),
  );
  assert.ok(
    !matchesProject(
      { name: "Scarf", tags: [], folder: "Giftshop" },
      "",
      "Gifts",
    ),
  );
});

import {
  fields,
  normalizeProject,
  validateProject,
  editorView,
  exportView,
  addPiece,
} from "../web/project-model.mjs";
function legacyFixture() {
  return {
    schema: 1,
    fields: Object.fromEntries(
      fields.map((k) => [
        k,
        k === "color" ? "#cb765d" : k === "name" ? "Scarf" : "10",
      ]),
    ),
    cols: 2,
    rows: 1,
    cells: ["sc", "sc"],
    stitches: [
      {
        id: "sc",
        name: "Single crochet",
        abbr: "sc",
        symbol: "×",
        consumed: 1,
        produced: 1,
      },
    ],
    patterns: [],
  };
}
test("legacy projects and revision snapshots migrate without mutating originals", () => {
  const old = legacyFixture();
  old.revisions = [
    {
      id: "rev-1",
      name: "Original",
      created: "2026-10-27T00:00:00Z",
      snapshot: structuredClone(old),
    },
  ];
  const p = normalizeProject(old);
  assert.equal(old.schema, 1);
  assert.equal(p.schema, 2);
  assert.equal(p.pieces[0].cols, 2);
  assert.equal(p.revisions[0].snapshot.schema, 2);
  assert.deepEqual(p.revisions[0].snapshot.pieces[0].cells, ["sc", "sc"]);
  assert.equal(p.cols, undefined);
});
test("piece editor writes are isolated while project name and allowance are shared", () => {
  const p = normalizeProject(legacyFixture());
  const first = p.activePieceId;
  const handle = addPiece(p, "Handle", 2);
  const view = editorView(p);
  view.fields.width = "5";
  view.fields.name = "Bag";
  view.cells[0] = "sc";
  assert.equal(p.pieces[0].fields.width, "10");
  assert.equal(p.fields.name, "Bag");
  assert.equal(handle.fields.width, "5");
  assert.equal(editorView(p, first).fields.name, "Bag");
  assert.equal(exportView(p).quantity, 2);
  assert.doesNotThrow(() => structuredClone(exportView(p)));
});
test("piece validation rejects duplicate identities and invalid quantities", () => {
  const p = normalizeProject(legacyFixture());
  addPiece(p, "Handle");
  p.pieces[1].id = p.pieces[0].id;
  assert.throws(() => validateProject(p), /Invalid piece/);
  const q = normalizeProject(legacyFixture());
  q.pieces[0].quantity = 0;
  assert.throws(() => validateProject(q), /Invalid piece/);
});
test("multi-piece revisions restore the full design without losing history", () => {
  let p = normalizeProject(legacyFixture());
  addPiece(p, "Handle", 2);
  p = addRevision(p, "Two-piece bag");
  const id = p.revisions[0].id;
  addPiece(p, "Lining");
  const restored = restoreRevision(p, id);
  assert.equal(restored.pieces.length, 2);
  assert.equal(restored.pieces[1].quantity, 2);
  assert.equal(restored.revisions.length, 3);
});

import {
  saveProgress,
  validateProgress,
  designBasis,
} from "../web/progress.mjs";
test("copy progress survives revisions and quantity changes independently", () => {
  let p = normalizeProject(legacyFixture());
  const piece = addPiece(p, "Handles", 2);
  saveProgress(p, piece, 1, 12, "At the corner");
  saveProgress(p, piece, 2, 3, "Next stitch");
  p = addRevision(p, "Before resizing");
  const revision = p.revisions[0];
  assert.equal(revision.snapshot.progress, undefined);
  p.pieces[1].fields.width = "99";
  assert.notEqual(
    p.progress[`${piece.id}:1`].basis,
    designBasis(p, p.pieces[1]),
  );
  saveProgress(p, p.pieces[1], 1, 15, "Finished edge");
  const restored = restoreRevision(p, revision.id);
  assert.equal(restored.progress[`${piece.id}:1`].completed, 15);
  assert.equal(restored.progress[`${piece.id}:2`].completed, 3);
  restored.pieces[1].quantity = 1;
  assert.doesNotThrow(() => validateProject(restored));
  assert.equal(restored.progress[`${piece.id}:2`].completed, 3);
  assert.throws(
    () => saveProgress(restored, restored.pieces[1], 1, -1, ""),
    /Invalid progress/,
  );
  assert.throws(() => validateProgress({ bad: {} }), /Invalid progress/);
});

import {
  requiredGrams,
  needsReservationReview,
} from "../web/yarn-planning.mjs";
test("yarn commitments track applied designs without changing physical stock", () => {
  const p = normalizeProject(legacyFixture());
  const piece = p.pieces[0];
  piece.yarn = { id: "lot-1" };
  Object.assign(piece.fields, {
    width: "20",
    length: "100",
    swatch_width: "10",
    swatch_length: "10",
    stitches: "20",
    rows: "24",
    grams: "5",
    skein_grams: "50",
    skein_meters: "120",
  });
  p.fields.allowance = "10";
  const grams = requiredGrams(p)["lot-1"];
  assert.ok(Math.abs(grams - 110) < 0.00001);
  p.lifecycle = "Ready to make";
  p.reservation = { grams: { "lot-1": grams } };
  assert.equal(needsReservationReview(p), false);
  piece.quantity = 2;
  assert.equal(needsReservationReview(p), true);
  assert.equal(p.reservation.grams["lot-1"], grams);
  piece.fields.grams = "";
  assert.equal(requiredGrams(p), null);
  p.lifecycle = "Completed";
  assert.equal(needsReservationReview(p), false);
});

import { validateBands, bandRequirements } from "../web/yarn-bands.mjs";
test("bands retain their swatches and allocations in revisions and exports", () => {
  let p = normalizeProject(legacyFixture());
  const yarn = {
    id: "lot-a",
    name: "Cotton",
    dye_lot: "A",
    skein_grams: 50,
    skein_meters: 120,
  };
  p.pieces[0].fields.width = "20";
  p.pieces[0].fields.length = "100";
  p.fields.allowance = "10";
  p.pieces[0].sections = [
    {
      id: "band-a",
      name: "Border",
      pattern: "Single crochet",
      color: "#123456",
      percent: 100,
      fields: {
        swatch_width: "10",
        swatch_length: "10",
        stitches: "20",
        rows: "24",
        grams: "5",
        hook: "4",
        blocking: "After blocking",
      },
      allocations: [{ yarn, percent: 100 }],
    },
  ];
  validateProject(p);
  assert.ok(
    Math.abs(bandRequirements(p.pieces[0], 10)["lot-a"] - 110) < 0.00001,
  );
  p = addRevision(p, "Band plan");
  p.pieces[0].sections[0].fields.grams = "10";
  const restored = restoreRevision(p, p.revisions[0].id);
  assert.equal(restored.pieces[0].sections[0].fields.grams, "5");
  assert.equal(exportView(restored).sections[0].name, "Border");
  restored.pieces[0].sections[0].allocations[0].percent = 50;
  assert.throws(() => validateBands(restored.pieces[0].sections), /total 100/);
});

import { bandArea, cumulativeArea, widthFraction } from "../web/shapes.mjs";
test("shape geometry and named revisions preserve area semantics", () => {
  let p = normalizeProject(legacyFixture());
  p.pieces[0].fields.width = "20";
  p.pieces[0].fields.length = "100";
  p.pieces[0].shape = "triangle";
  assert.equal(bandArea(p.pieces[0]), 1000);
  assert.equal(bandArea(p.pieces[0], 0, 0.5), 250);
  p = addRevision(p, "Triangle idea");
  p.pieces[0].shape = "circle";
  assert.ok(Math.abs(bandArea(p.pieces[0]) - 100 * Math.PI) < 0.000001);
  const restored = restoreRevision(p, p.revisions[0].id);
  assert.equal(exportView(restored).shape, "triangle");
  assert.equal(widthFraction("triangle", 0), 0);
  assert.equal(widthFraction("triangle", 1), 1);
  assert.ok(Math.abs(cumulativeArea("oval", 1) - Math.PI / 4) < 0.000001);
  assert.throws(() => cumulativeArea("invalid", 0.5));
  restored.pieces[0].shape = "sphere";
  assert.throws(() => validateProject(restored), /Unsupported piece shape/);
});

import {
  roundPlacement,
  validateRounds,
  roundInstructions,
  roundWarnings,
  positions,
} from "../web/rounds.mjs";
test("radial instructions and layouts retain order and flag stitch count mismatches", () => {
  const defs = [
    { id: "sc", name: "Single crochet", abbr: "sc", consumed: 1, produced: 1 },
    { id: "inc", name: "Increase", abbr: "inc", consumed: 1, produced: 2 },
  ];
  const chart = {
    mode: "joined",
    direction: "clockwise",
    rounds: [
      { id: "r1", cells: Array(6).fill("sc") },
      { id: "r2", cells: Array(6).fill("inc") },
    ],
  };
  validateRounds(chart, defs);
  const notes = roundInstructions(chart, defs);
  assert.equal(notes[1].made, 12);
  assert.equal(notes[1].used, 6);
  chart.rounds.forEach((r, i) => (r.instruction = notes[i]));
  assert.equal(roundWarnings(chart, defs).length, 4);
  const joined = positions(chart);
  chart.mode = "spiral";
  const spiral = positions(chart);
  assert.notEqual(joined[5].x, spiral[5].x);
  assert.match(roundWarnings(chart, defs).join(" "), /need review/);
  const saved = chart.rounds[0].instruction.text;
  chart.rounds[0].cells[0] = "inc";
  assert.equal(chart.rounds[0].instruction.text, saved);
  assert.match(roundWarnings(chart, defs).join(" "), /consumes 6/);
  chart.rounds[0].offsets = [{ angle: 20, radius: 5 }];
  validateRounds(chart, defs);
  chart.rounds[0].offsets[0].radius = 999;
  assert.throws(() => validateRounds(chart, defs), /position/);
});
test("round charts and edited notes travel with revisions and portable views", () => {
  let p = normalizeProject(legacyFixture());
  p.pieces[0].roundChart = {
    mode: "joined",
    direction: "clockwise",
    rounds: [
      {
        id: "r1",
        cells: ["sc", "sc"],
        instruction: { text: "My ring notes", source: "" },
      },
    ],
  };
  validateProject(p);
  p = addRevision(p, "First ring");
  p.pieces[0].roundChart.rounds[0].cells.push("sc");
  const restored = restoreRevision(p, p.revisions[0].id);
  assert.equal(restored.pieces[0].roundChart.rounds[0].cells.length, 2);
  assert.equal(
    exportView(restored).roundChart.rounds[0].instruction.text,
    "My ring notes",
  );
});

test("explicit radial construction changes counts, validates rules and retains notes", () => {
  const defs = [{id:"sc", name:"Single crochet", abbr:"sc", consumed:1, produced:1}];
  const chart = {mode:"joined", direction:"clockwise", foundation:{kind:"chain", chains:4}, rounds:[
    {id:"r1", cells:Array(6).fill("sc"), construction:{join:"first-chain", chains:3, counts:true, turn:false}},
    {id:"r2", cells:Array(7).fill("sc"), construction:{join:"first-stitch", chains:1, counts:false, turn:true}}
  ]};
  validateRounds(chart, defs);
  const rows = roundInstructions(chart, defs);
  assert.equal(rows[0].made, 7);
  assert.equal(rows[0].used, 6);
  assert.match(rows[0].text, /Chain 4; join into a ring/);
  assert.match(rows[1].text, /Before this round: turn/);
  chart.rounds.forEach((r,i)=>r.instruction=rows[i]);
  assert.equal(roundWarnings(chart, defs).length, 1);
  chart.foundation.chains=5;
  assert.match(roundWarnings(chart, defs).join(" "), /need review/);
  assert.equal(chart.rounds[0].instruction.text, rows[0].text);
  chart.mode="spiral";
  assert.match(roundWarnings(chart, defs).join(" "), /spiral conflicts/);
  chart.rounds[0].construction.chains=0;
  assert.throws(()=>validateRounds(chart,defs), /construction/);
  chart.rounds[0].construction.counts=false;
  assert.match(roundWarnings(chart,defs).join(" "), /cannot join/);
  chart.foundation.chains=21;
  assert.throws(()=>validateRounds(chart,defs), /starting ring/);
});

test("sequential placement maps increases and decreases and flags base shortages", () => {
  const defs = [
    {id:"sc", name:"Single", abbr:"sc", consumed:1, produced:1},
    {id:"inc", name:"Increase", abbr:"inc", consumed:1, produced:2},
    {id:"dec", name:"Decrease", abbr:"dec", consumed:2, produced:1},
    {id:"ch", name:"Chain", abbr:"ch", consumed:0, produced:1}
  ];
  const chart = {mode:"joined", direction:"clockwise", foundation:{kind:"magic",chains:4}, rounds:[
    {id:"r1",cells:["sc","sc","sc"]},
    {id:"r2",cells:["inc","dec"],placement:"sequential"}
  ]};
  validateRounds(chart, defs);
  let plan = roundPlacement(chart, defs, 1);
  assert.equal(plan.slots[0].target, "previous-round stitch 1");
  assert.equal(plan.slots[1].target, "previous-round stitches 2–3");
  assert.deepEqual(plan.slots.map(s=>s.delta), [1,-1]);
  assert.equal(plan.made,3);
  assert.equal(plan.warnings.length,0);
  const saved = roundInstructions(chart,defs)[1];
  chart.rounds[1].instruction = saved;
  assert.match(saved.text,/slot 2 into previous-round stitches 2–3/);
  chart.rounds[0].cells.push("sc");
  assert.match(roundWarnings(chart,defs).join(" "),/need review/);
  assert.match(roundPlacement(chart,defs,1).warnings.join(" "),/leaves 1/);
  assert.equal(chart.rounds[1].instruction.text,saved.text);
  chart.rounds[1].cells.push("dec","ch");
  plan=roundPlacement(chart,defs,1);
  assert.match(plan.warnings.join(" "),/needs 1 more/);
  assert.match(plan.warnings.join(" "),/manual attachment/);
  assert.match(roundPlacement(chart,defs,0).slots[0].target,/starting ring/);
  chart.rounds[1].placement="invalid";
  assert.throws(()=>validateRounds(chart,defs),/placement rule/);
});

import {assemblyInstances, transformPoint, validateAssembly} from '../web/assembly.mjs';
test('assembly poses preserve copy identity, dimensions and named revisions', () => {
  let p=normalizeProject(legacyFixture());
  p.pieces[0].quantity=2;
  const pose={x:10,y:20,z:30,rx:0,ry:0,rz:90};
  p.pieces[0].assembly={'2':pose};
  validateProject(p);
  const items=assemblyInstances(p);
  assert.equal(items.length,2);
  assert.deepEqual(items[1].pose,pose);
  const point=transformPoint([5,0,0],pose);
  assert.ok(Math.abs(point[0]-10)<1e-9);
  assert.equal(point[1],25);assert.equal(point[2],30);
  p=addRevision(p,'Bag panel layout');
  p.pieces[0].assembly['2'].z=80;
  const restored=restoreRevision(p,p.revisions[0].id);
  assert.equal(restored.pieces[0].assembly['2'].z,30);
  p.pieces[0].quantity=1;
  assert.equal(assemblyInstances(p).length,1);
  p.pieces[0].quantity=2;
  assert.equal(assemblyInstances(p)[1].pose.z,80);
  assert.throws(()=>validateAssembly({'0':pose}),/assembly placement/);
  assert.throws(()=>validateAssembly({'1':{...pose,x:Infinity}}),/assembly placement/);
  const maximum={pieces:Array.from({length:32},(_,i)=>({...p.pieces[0],id:'p'+i,quantity:99,assembly:undefined}))};
  for(const item of assemblyInstances(maximum))validateAssembly({[item.copy]:item.pose});
});

import {validateAssemblyPlan, seamBasis, seamReport, assemblyReport, edgePoints, edgeLength, foldPoint, splitAtFold} from '../web/assembly-plan.mjs';
test('seams preserve notes through revisions and detect unavailable or changed geometry',()=>{
  let p=normalizeProject(legacyFixture());p.pieces[0].quantity=2;
  const id=p.pieces[0].id;
  const seam={id:'seam1',name:'Side seam',a:{pieceId:id,copy:1,edge:'left'},b:{pieceId:id,copy:2,edge:'right'},reverse:true,note:'Match the row ends.',basis:''};
  seam.basis=seamBasis(p,seam);p.assemblyPlan={notes:'Attach handles last.',seams:[seam]};
  validateProject(p);assert.equal(seamReport(p,seam).warnings.length,0);
  p=addRevision(p,'Side seams planned');
  p.assemblyPlan.notes='Changed';p.pieces[0].quantity=1;
  assert.match(seamReport(p,seam).warnings.join(' '),/unavailable/);
  const restored=restoreRevision(p,p.revisions[0].id);
  assert.equal(restored.assemblyPlan.notes,'Attach handles last.');
  assert.match(exportView(restored).assemblyReport.lines.join(' '),/Match the row ends/);
  restored.pieces[0].assembly={'1':{x:0,y:0,z:0,rx:0,ry:0,rz:0,fold:{axis:'y',position:50,angle:90,side:'positive'}}};
  assert.match(seamReport(restored,seam).warnings.join(' '),/Geometry changed/);
  const wrong={...seam,b:{...seam.a}};
  assert.throws(()=>validateAssemblyPlan({notes:'',seams:[wrong]}),/different edges/);
  assert.throws(()=>validateAssemblyPlan({notes:'',seams:[seam,seam]}),/Invalid assembly seam/);
  const piece=restored.pieces[0];piece.fields.width='10';piece.fields.length='20';
  const mismatch={...seam,b:{pieceId:id,copy:2,edge:'top'}};
  mismatch.basis=seamBasis(restored,mismatch);
  assert.match(seamReport(restored,mismatch).warnings.join(' '),/lengths differ/);
});
test('controlled folds preserve hinge points and segment lengths on either axis',()=>{
  const size=[20,40],fold={axis:'y',position:50,angle:90,side:'positive'};
  assert.deepEqual(foldPoint([5,0,0],fold,size),[5,0,0]);
  assert.deepEqual(foldPoint([5,-10,0],fold,size),[5,-10,0]);
  const p=foldPoint([5,10,0],fold,size);
  assert.ok(Math.abs(p[1])<1e-9);assert.equal(p[2],10);
  assert.ok(Math.abs(Math.hypot(p[1],p[2])-10)<1e-9);
  const xfold={axis:'x',position:25,angle:-180,side:'negative'};
  const q=foldPoint([-10,3,0],xfold,size);assert.ok(Math.abs(q[0])<1e-9);assert.equal(q[1],3);
  const parts=splitAtFold([[-10,-20,0],[10,-20,0],[10,20,0],[-10,20,0]],fold,size);
  assert.equal(parts.length,2);
  assert.ok(parts.every(part=>part.some(p=>p[1]===0)));
  const pose={x:0,y:0,z:0,rx:0,ry:0,rz:0,fold:{...fold,position:0}};
  assert.throws(()=>validateAssembly({'1':pose}),/controlled fold/);
  const ellipse={shape:'oval',fields:{width:'20',length:'40'}};
  assert.ok(Math.abs(edgeLength(edgePoints(ellipse,'left'))-edgeLength(edgePoints(ellipse,'right')))<1e-9);
  assert.equal(edgePoints({...ellipse,shape:'triangle'},'top'),null);
});

import {alignSeam} from '../web/assembly.mjs';
import {foldSequence,validateFolds} from '../web/assembly-plan.mjs';
test('edge alignment is rigid and multiple parallel folds preserve material lengths',()=>{
  const p=normalizeProject(legacyFixture());const piece=p.pieces[0];piece.quantity=2;piece.shape='rectangle';piece.fields.width='20';piece.fields.length='40';
  const seam={a:{pieceId:piece.id,copy:1,edge:'right'},b:{pieceId:piece.id,copy:2,edge:'left'},reverse:true};
  const result=alignSeam(p,seam);assert.ok(result.error<1e-8);assert.equal(piece.assembly,undefined);
  piece.assembly={'2':{x:10,y:30,z:20,rx:90,ry:40,rz:-170}};
  assert.ok(alignSeam(p,seam).error<1e-7);
  const folds=[{axis:'y',position:25,side:'positive',angle:90},{axis:'y',position:75,side:'positive',angle:-90}];
  validateFolds({folds});
  const a=foldSequence([0,15,0],folds,[20,40]),b=foldSequence([0,20,0],folds,[20,40]);
  assert.ok(Math.abs(Math.hypot(...a.map((v,i)=>v-b[i]))-5)<1e-8);
  assert.throws(()=>validateFolds({folds:[folds[0],{...folds[1],axis:'x'}]}),/parallel/);
  const original=foldPoint([0,15,0],folds[0],[20,40]);
  assert.deepEqual(foldSequence([0,15,0],[folds[0]],[20,40]),original);
});
import {bagTemplate} from '../web/project-model.mjs';
import {terminologyChange} from '../web/terminology.mjs';
import {validatePhotos} from '../web/photos.mjs';
test('bag template has matching seams and terminology retains custom definitions',()=>{
  const p=normalizeProject(legacyFixture());
  const bag=bagTemplate(p,30,25,10);assert.equal(bag.pieces.length,p.pieces.length+3);assert.equal(bag.assemblyPlan.seams.length,8);
  for(const seam of bag.assemblyPlan.seams)assert.ok(alignSeam(bag,seam).error<1e-7);
  assert.equal(bag.pieces.at(-1).fields.grams,'');assert.equal(p.assemblyPlan,undefined);
  const custom={id:'custom',name:'My stitch',abbr:'mine',symbol:'x',consumed:1,produced:1};p.stitches.push(custom);
  const uk=terminologyChange(p,'UK',true);assert.ok(uk.stitches.some(s=>s.termKey==='dc'&&s.abbr==='tr'));assert.deepEqual(uk.stitches.find(s=>s.id==='custom'),custom);
  const de=terminologyChange(uk,'DE');assert.ok(de.stitches.some(s=>s.termKey==='dc'&&s.name==='Stäbchen'));
  assert.throws(()=>validatePhotos([{id:'p',name:'Unsafe',data:'https://example.com/photo.jpg'}]),/photo/);
});
import {setCraft} from '../web/knitting.mjs';
import {catalogDraft} from '../web/yarn-catalog.mjs';
import {suggestRound} from '../web/shaping.mjs';
test('knitting round reading order, catalog stock and shaping totals stay explicit',()=>{
  let p=normalizeProject(legacyFixture());p=setCraft(p,'knitting','round');
  const piece=p.pieces[0],k=p.stitches.find(s=>s.knitKey==='k'),pur=p.stitches.find(s=>s.knitKey==='p');piece.cols=2;piece.rows=2;piece.cells=[k.id,pur.id,k.id,pur.id];
  const view=exportView(p),notes=rowInstructions(view);assert.match(notes[1].text,/Round 2 \(right to left\)/);assert.match(notes[1].text,/Purl.*Knit/);
  assert.equal(catalogDraft('drops-paris').remaining_grams,0);assert.equal(catalogDraft('drops-alpaca').skein_meters,167);
  const defs=[{id:'n',consumed:1,produced:1},{id:'i',consumed:1,produced:2},{id:'d',consumed:2,produced:1}];
  const chart={rounds:[{cells:Array(6).fill('n')},{cells:['n']}]};
  for(const target of [3,6,9,12]){const cells=suggestRound(chart,defs,1,target,'n','i','d');assert.equal(cells.reduce((n,id)=>n+defs.find(s=>s.id===id).consumed,0),6);assert.equal(cells.reduce((n,id)=>n+defs.find(s=>s.id===id).produced,0),target);}
  assert.throws(()=>suggestRound(chart,defs,1,13,'n','i','d'),/cannot be reached/);
});
import {patternMatches,importLibraryPattern} from '../web/pattern-library.mjs';
test('pattern imports retain independent definitions until explicit update',()=>{
 const source=normalizeProject(legacyFixture());source.id='source';source.patterns=[{id:'tile',name:'Shell repeat',description:'Bag edge',tags:['gift'],folder:'Bags/Handles',cols:1,rows:1,cells:['sc']}];
 let target=normalizeProject(legacyFixture());target.id='target';
 target=importLibraryPattern(target,source,0);const imported=target.patterns[0],id=imported.cells[0];assert.notEqual(id,'sc');
 source.stitches.find(s=>s.id==='sc').name='Updated source';
 assert.notEqual(target.stitches.find(s=>s.id===id).name,'Updated source');
 const updated=importLibraryPattern(target,source,0,true);assert.equal(updated.stitches.find(s=>s.id===id).name,'Updated source');
 assert.equal(updated.patterns.length,1);assert.equal(patternMatches(imported,'gift','Bags'),true);
 validateProject(updated);
});

import {placedSymbol,validatePlacement,resizePlacements} from '../web/stitch-placement.mjs';
import {crochetPresets,stitchLabel} from '../web/terminology.mjs';
test('symbol anchors rotate about snapped vertices and survive chart resizing',()=>{
 const p={anchor:'bottom',snap:'top-left',rotation:90};
 const pose=placedSymbol(50,50,70,p,100);
 assert.ok(Math.abs(pose.x-35)<1e-9);assert.ok(Math.abs(pose.y)<1e-9);
 assert.deepEqual(resizePlacements({5:p,11:p},4,3,2),{4:p});
 assert.throws(()=>validatePlacement({...p,rotation:Infinity}));
 const chart={mode:'joined',direction:'clockwise',rounds:[{id:'r',cells:['sc'],offsets:[{angle:0,radius:0,visual:p}]}]};
 validateRounds(chart,[{id:'sc',consumed:1,produced:1}]);
 assert.equal(positions(chart)[0].rotation,90);
 assert.throws(()=>validateRounds({...chart,rounds:[{...chart.rounds[0],offsets:[{angle:0,radius:0,visual:{...p,snap:'invalid'}}]}]},[{id:'sc'}]));
});
test('expanded crochet library has explicit decorative and turning counts and stable terminology',()=>{
 assert.equal(crochetPresets.find(s=>s.termKey==='picot3').produced,0);
 assert.equal(crochetPresets.find(s=>s.termKey==='turn1').produced,0);
 assert.equal(crochetPresets.find(s=>s.termKey==='turn3').produced,1);
 assert.equal(crochetPresets.find(s=>s.termKey==='dc3tog').consumed,3);
 assert.equal(stitchLabel('dtr','UK')[1],'ttr');
 for(const preset of crochetPresets)for(const term of ['US','UK','DE'])assert.ok(stitchLabel(preset.termKey,term)?.[0]);
});

import {nearestSnap,automaticPlacement,symbolVertices,validateGuides,gridGuides} from '../web/stitch-placement.mjs';
import {radialGuides} from '../web/rounds.mjs';
test('nearest snapping projects onto segments, arc interiors and arc endpoints',()=>{
 const line={kind:'line',x:0,y:0,x2:10,y2:10};
 const result=nearestSnap({x:4,y:4.1},[line],[],.2);
 assert.ok(Math.abs(result.x-4.05)<1e-9);assert.equal(result.tangent,45);
 assert.equal(nearestSnap({x:12,y:12},[line],[],.2),null);
 const arc={kind:'arc',x:0,y:0,radius:5,start:0,end:90};
 assert.ok(Math.abs(nearestSnap({x:3.6,y:3.6},[arc],[],.2).x-Math.sqrt(12.5))<1e-9);
 assert.equal(nearestSnap({x:5,y:-.1},[arc],[],.2).y,0);
 assert.equal(nearestSnap({x:-5,y:0},[arc],[],.2),null);
 assert.throws(()=>validateGuides([{...line,x2:0,y2:0}]));
});
test('snapped symbol anchor and guide-relative orientation share exact geometry',()=>{
 const origin={x:2,y:2},settings={enabled:true,vertices:true,orientation:'along'};
 const line={kind:'line',x:0,y:0,x2:10,y2:0};
 const p=automaticPlacement({x:2,y:.1},origin,.7,1,'bottom',0,settings,[line]);
 assert.equal(p.rotation,90);assert.equal(p.target,'guide');
 const pose=placedSymbol(origin.x,origin.y,.7,p,1),end=symbolVertices(pose,.7)[1];
 assert.ok(Math.abs(end.x-2)<1e-9);assert.ok(Math.abs(end.y)<1e-9);
 const perp=automaticPlacement({x:2,y:.1},origin,.7,1,'center',0,{...settings,orientation:'perpendicular'},[line]);
 assert.equal(perp.rotation,0);
 for(const override of [true,false]){
  const noSnap=automaticPlacement({x:2,y:.1},origin,.7,1,'center',17,{...settings,enabled:!override},[line],[],!override);
  assert.equal(noSnap.target,'none');assert.equal(noSnap.rotation,17);
 }
});
test('other symbol vertices win exact ties and vertex snapping can be disabled',()=>{
 const settings={enabled:true,vertices:true,orientation:'along'},point={x:1,y:.02},origin={x:1,y:1};
 const vertices=[{x:1,y:0,tangent:45}];
 const p=automaticPlacement(point,origin,1,1,'top',0,settings,[{kind:'line',x:0,y:0,x2:2,y2:0}],vertices);
 assert.equal(p.target,'vertex');assert.equal(p.rotation,135);
 const without=automaticPlacement(point,origin,1,1,'top',0,{...settings,vertices:false},[],vertices);
 assert.equal(without.target,'none');
 assert.equal(gridGuides(2,3).length,7);
 const chart={mode:'joined',direction:'clockwise',rounds:[{cells:['sc']}]};
 assert.equal(radialGuides(chart)[0].kind,'arc');chart.mode='spiral';assert.equal(radialGuides(chart).length,120);
});

import {validatePicturePattern,newPatternCopy,addPicturePattern,patternFromChart,patternStitchList} from '../web/picture-library.mjs';
import {readFileSync} from 'node:fs';
const pictureStarters=JSON.parse(readFileSync(new URL('../web/starter-patterns.json',import.meta.url),'utf8'));
test('picture patterns are independent named copies with valid self-contained charts',()=>{
 for(const p of pictureStarters)validatePicturePattern(p);
 const source=pictureStarters[0],original=structuredClone(source);
 assert.throws(()=>newPatternCopy(source,' SINGLE CROCHET ROWS ',pictureStarters),/unique new name/);
 assert.throws(()=>newPatternCopy(source,pictureStarters[1].name,pictureStarters),/unique new name/);
 const copy=newPatternCopy(source,'My sample',pictureStarters,'my-sample');
 copy.cells[0]='sc';copy.stitches[0].name='My own stitch';copy.instructions='My edited recipe';
 assert.deepEqual(source,original);assert.notEqual(copy.id,source.id);
 assert.equal(patternStitchList(copy)[0].count,24);
 assert.throws(()=>validatePicturePattern({...copy,cells:['missing']}));
 assert.throws(()=>validatePicturePattern({...copy,photo:'https://remote/image.jpg'}));
});
test('picture library imports retain photos, recipes and independent symbols without editing the current chart',()=>{
 const p=normalizeProject(legacyFixture());
 const original=structuredClone(p),entry={...structuredClone(pictureStarters[0]),photo:'data:image/jpeg;base64,YQ=='};let sequence=0;
 const imported=addPicturePattern(p,entry,()=>`copy-${++sequence}`);
 validateProject(imported);assert.deepEqual(p,original);assert.deepEqual(imported.pieces,p.pieces);
 assert.equal(imported.patterns[0].instructions,entry.instructions);assert.equal(imported.patterns[0].photo,entry.photo);
 assert.notEqual(imported.patterns[0].cells[0],'sc');
 assert.throws(()=>addPicturePattern(imported,entry),/already/);
 const capture=patternFromChart({...entry,stitches:entry.stitches},'Capture');assert.equal(capture.instructions,entry.instructions);
});

import {parseRecipe,parseAmiText,starterAmi,amiCounts,amiSurface,yarnMesh,amiProfile,amiText,validateAmi,meshOBJ,meshSTL} from '../web/amigurumi-model.mjs';
test('amigurumi recipes expand nested repeats and terminology without accepting unknown stitches',()=>{
 assert.deepEqual([parseRecipe('(sc, inc) x6').used,parseRecipe('(sc, inc) x6').made],[12,18]);
 assert.equal(parseRecipe('((sc, inc) x2, dec) x3').made,21);
 assert.equal(parseRecipe('6 dc','UK').cells[0],'sc');assert.equal(parseRecipe('6 fM','DE').made,6);
 assert.equal(parseRecipe('*sc, inc* 6 times').made,18);
 assert.throws(()=>parseRecipe('6 sc, unknown'));assert.throws(()=>parseRecipe('(sc) x1001'));
 const imported=parseAmiText('Part: Head (make 1)\nR1: 6 sc in MR (6)\nR2: 6 inc (12)\nR3-5: 12 sc (12)\nPart: Arms (make 2)\nR1: 6 sc in MR (6)');
 assert.deepEqual(imported.errors,[]);assert.equal(imported.parts.length,2);assert.equal(imported.parts[0].design.rounds.length,5);assert.equal(imported.parts[1].quantity,2);
 assert.ok(parseAmiText('R1: bobble (6)').errors.length);assert.ok(parseAmiText('R2: 6 sc').errors.length);
});
test('amigurumi profiles, closed surfaces, detailed meshes and text/binary exports retain round counts',()=>{
 const a=starterAmi();a.stitchesPer10=20;a.roundsPer10=20;a.rounds[1].notes='Check count';validateAmi(a);
 assert.deepEqual(amiCounts(a).map(r=>r.made),[6,12,18,18,18,12,6]);
 assert.ok(Math.abs(amiProfile(a)[2].radius-9/(2*Math.PI))<1e-9);
 const mesh=amiSurface(a,12),edges=new Map();for(const face of mesh.faces)for(let i=0;i<3;i++){const key=[face[i],face[(i+1)%3]].sort((a,b)=>a-b).join(':');edges.set(key,(edges.get(key)??0)+1);}assert.ok([...edges.values()].every(n=>n===2));
 assert.ok(yarnMesh(a).faces.length>mesh.faces.length);assert.ok(yarnMesh(a).vertices.flat().every(Number.isFinite));assert.match(meshOBJ(mesh,'centimeters'),/# units: centimeters/);
 const stl=meshSTL(mesh);assert.equal(stl.byteLength,84+50*mesh.faces.length);assert.equal(new DataView(stl).getUint32(80,true),mesh.faces.length);for(let i=0;i<mesh.faces.length;i++){const normal=[0,4,8].map(offset=>new DataView(stl).getFloat32(84+i*50+offset,true));assert.ok(normal.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...normal)-1)<1e-5);}
 const source=amiText([{name:'Head',quantity:1,design:a}]),again=parseAmiText(source);assert.deepEqual(again.errors,[]);assert.equal(again.parts[0].design.stitchesPer10,20);assert.equal(again.parts[0].design.rounds[1].notes,'Check count');
 const p=normalizeProject(legacyFixture());p.pieces[0].amigurumi=a;validateProject(p);assert.deepEqual(exportView(p).amigurumi,a);assert.deepEqual(designSnapshot(p).pieces[0].amigurumi,a);
 const bad=structuredClone(a);bad.rounds[0].recipe='99999 inc';assert.throws(()=>validateAmi(bad));
});

import {designSnapshot} from "../web/revisions.mjs";

test('amigurumi conversion flags malformed round labels and retains German part headings',()=>{
 assert.ok(parseAmiText('R1: 6 sc\nR2 6 inc').errors.length);
 const parsed=parseAmiText('Teil: Körper\nR1: 6 fM in MR (6)','DE');assert.deepEqual(parsed.errors,[]);assert.equal(parsed.parts[0].name,'Körper');
});
