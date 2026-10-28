import { placedSymbol, validatePlacement, validateGuides, snappingDefaults, automaticPlacement, symbolVertices, guideElements } from "./stitch-placement.mjs";
import { suggestRound } from "./shaping.mjs";
export function validateRounds(chart, stitches) {
  if (chart === undefined) return;
  if (
    !chart ||
    !["joined", "spiral"].includes(chart.mode) ||
    !["clockwise", "counterclockwise"].includes(chart.direction) ||
    !Array.isArray(chart.rounds) ||
    chart.rounds.length < 1 ||
    chart.rounds.length > 20
  )
    throw Error("Invalid round chart.");
  if (chart.foundation !== undefined &&
      (!chart.foundation || !["magic", "chain"].includes(chart.foundation.kind) ||
       !Number.isInteger(chart.foundation.chains) || chart.foundation.chains < 1 || chart.foundation.chains > 20))
    throw Error("Invalid starting ring.");
  if(chart.guides!==undefined)validateGuides(chart.guides);
  const defs = new Set(stitches.map((s) => s.id)),
    ids = new Set();
  for (const round of chart.rounds) {
    if (
      !round ||
      typeof round.id !== "string" ||
      !/^[-a-zA-Z0-9]{1,64}$/.test(round.id) ||
      ids.has(round.id) ||
      !Array.isArray(round.cells) ||
      round.cells.length < 1 ||
      round.cells.length > 120 ||
      round.cells.some((s) => !defs.has(s))
    )
      throw Error("Invalid round cells.");
    ids.add(round.id);
    if (round.placement !== undefined && round.placement !== "sequential")
      throw Error("Invalid round placement rule.");
    const rule = round.construction;
    if (rule !== undefined && (!rule ||
        !["unspecified", "none", "first-stitch", "first-chain"].includes(rule.join) ||
        !Number.isInteger(rule.chains) || rule.chains < 0 || rule.chains > 6 ||
        typeof rule.counts !== "boolean" || typeof rule.turn !== "boolean" ||
        (rule.counts && rule.chains === 0)))
      throw Error("Invalid round construction rule.");
    if (
      round.instruction !== undefined &&
      (!round.instruction ||
        typeof round.instruction.text !== "string" ||
        round.instruction.text.length > 4000 ||
        typeof round.instruction.source !== "string" ||
        round.instruction.source.length > 100000)
    )
      throw Error("Invalid saved round instruction.");
    for(const offset of round.offsets??[])if(offset?.visual!==undefined)validatePlacement(offset.visual);
    if (
      round.offsets !== undefined &&
      (!Array.isArray(round.offsets) ||
        round.offsets.length > round.cells.length ||
        round.offsets.some(
          (o) =>
            o !== null &&
            (!o ||
              !Number.isFinite(o.angle) ||
              Math.abs(o.angle) > 180 ||
              !Number.isFinite(o.radius) ||
              Math.abs(o.radius) > 20),
        ))
    )
      throw Error("Invalid symbol position.");
  }
}
// Numbers follow working order, not screen angle or symbol slots.
export function roundPlacement(chart, stitches, index) {
  const defs = new Map(stitches.map((s) => [s.id, s]));
  const round = chart.rounds[index];
  const total = (r) => r.cells.reduce((n, id) => n + defs.get(id).produced, 0) + (r.construction?.counts ? 1 : 0);
  const available = index ? total(chart.rounds[index - 1]) : null;
  let cursor = 1;
  const slots = round.cells.map((id, slot) => {
    const stitch = defs.get(id), start = cursor;
    cursor += stitch.consumed;
    let target;
    if (!index) target = chart.foundation ? "starting ring" : "starting ring unspecified";
    else if (!stitch.consumed) target = "no base stitch consumed; specify attachment manually";
    else target = start === cursor - 1 ? `previous-round stitch ${start}` : `previous-round stitches ${start}–${cursor - 1}`;
    return {slot: slot + 1, name: `${stitch.name} (${stitch.abbr})`, consumed: stitch.consumed,
      produced: stitch.produced, delta: stitch.produced - stitch.consumed, target};
  });
  const used = cursor - 1, made = total(round);
  const warnings = [];
  if (index && used > available) warnings.push(`Placement needs ${used - available} more base stitches than the previous round provides.`);
  if (index && used < available) warnings.push(`Placement leaves ${available - used} previous-round stitches unworked. Specify whether to skip them or revise the chart.`);
  if (index && slots.some((s) => !s.consumed)) warnings.push("Zero-consumption symbols need manual attachment instructions.");
  const delta = index ? made - available : null;
  const summary = index ? `Previous round: ${available} stitches. This round: ${made}. Net change: ${delta > 0 ? "+" : ""}${delta}.` : `Starting round: ${made} produced stitches; base-stitch comparisons begin with round 2.`;
  return {slots, available, used, made, warnings, summary};
}
export function roundInstructions(chart, stitches) {
  const defs = new Map(stitches.map((s) => [s.id, s]));
  return chart.rounds.map((round, index) => {
    const list = round.cells.map((id) => defs.get(id));
    const rule = round.construction;
    const placement = round.placement ? roundPlacement(chart, stitches, index) : null;
    const used = list.reduce((n, s) => n + s.consumed, 0),
      made = list.reduce((n, s) => n + s.produced, 0) + (rule?.counts ? 1 : 0);
    const groups = [];
    for (const s of list) {
      const last = groups.at(-1);
      if (last?.id === s.id) last.count++;
      else groups.push({ id: s.id, label: `${s.name} (${s.abbr})`, count: 1 });
    }
    return {
      used,
      made,
      text: `${index === 0 ? foundationText(chart) + " " : ""}${constructionText(rule)} Round ${index + 1} (${chart.direction}, ${chart.mode === "joined" ? "joined rounds" : "continuous spiral"}): ${groups.map((s) => `${s.count} × ${s.label}`).join(", ")}. Consumes ${used}; produces ${made} stitches.${placement ? " " + placement.summary + " Sequential placement in working order: " + placement.slots.map((s) => `slot ${s.slot} into ${s.target}`).join("; ") + ". Check attachment, loops and shaping manually." : ""}`,
      source: JSON.stringify([
        index,
        chart.mode,
        chart.direction,
        list.map((s) => [s.id, s.name, s.abbr, s.consumed, s.produced]),
        ...(chart.foundation || rule ? [chart.foundation ?? null, rule ?? null] : []),
        ...(placement ? [round.placement, index ? chart.rounds[index - 1].cells.map((id) => [id, defs.get(id).produced]) : null, index ? chart.rounds[index - 1].construction ?? null : null] : []),
      ]),
    };
  });
}
function foundationText(chart) {
  if (!chart.foundation) return "Starting ring unspecified.";
  return chart.foundation.kind === "magic" ? "Start with a magic ring; work round 1 into the ring."
    : `Chain ${chart.foundation.chains}; join into a ring with a slip stitch in the first chain; work round 1 into the ring.`;
}
function constructionText(rule) {
  if (!rule) return "Round construction unspecified.";
  const join = {unspecified: "Join unspecified", none: "Do not join", "first-stitch": "End with a slip stitch in the first worked stitch", "first-chain": "End with a slip stitch in the top of the starting chain"}[rule.join];
  return `Before this round: ${rule.turn ? "turn" : "do not turn"}; chain ${rule.chains} (${rule.counts ? "counts as one produced stitch, additional to chart symbols" : "does not count as a stitch"}). ${join}; the join adds no stitch to the count.`;
}
export function roundWarnings(chart, stitches) {
  const rows = roundInstructions(chart, stitches);
  const warnings = [
    "Radial sample only. Check stitch placement and shaping manually. Starting chains and joins are separate from chart symbols; do not enter them twice.",
  ];
  if (!chart.foundation) warnings.push("Starting ring unspecified.");
  rows.forEach((r, i) => {
    const rule = chart.rounds[i].construction;
    if (!rule) warnings.push(`Round ${i + 1} construction unspecified.`);
    else {
      if (rule.join === "unspecified") warnings.push(`Round ${i + 1} join unspecified.`);
      if (chart.mode === "spiral" && (rule.join !== "none" || rule.chains || rule.turn))
        warnings.push(`Round ${i + 1}: continuous spiral conflicts with joining, starting chains or turning. Review construction.`);
      if (chart.mode === "joined" && rule.join === "none") warnings.push(`Round ${i + 1}: joined layout has no join.`);
      if (rule.join === "first-chain" && !rule.chains) warnings.push(`Round ${i + 1}: cannot join to a starting chain when there are no starting chains.`);
    }
    if (i && r.used !== rows[i - 1].made)
      warnings.push(
        `Round ${i + 1} consumes ${r.used}; round ${i} produces ${rows[i - 1].made}.`,
      );
    if (chart.rounds[i].placement)
      warnings.push(...roundPlacement(chart, stitches, i).warnings.map((text) => `Round ${i + 1}: ${text}`));
    const saved = chart.rounds[i].instruction;
    if (!saved) warnings.push(`Round ${i + 1} instructions not generated.`);
    else if (saved.source !== r.source)
      warnings.push(`Round ${i + 1} instructions need review.`);
  });
  return warnings;
}
export function positions(chart) {
  const spacing = 250 / (chart.rounds.length + 1),
    sign = chart.direction === "clockwise" ? 1 : -1;
  return chart.rounds.flatMap((r, round) =>
    r.cells.map((id, slot) => {
      const o = r.offsets?.[slot] ?? { angle: 0, radius: 0 };
      const theta =
        -Math.PI / 2 +
        (sign * 2 * Math.PI * slot) / r.cells.length +
        (o.angle * Math.PI) / 180;
      const radius =
        20 +
        spacing *
          (round +
            0.65 +
            (chart.mode === "spiral" ? slot / r.cells.length : 0)) +
        o.radius;
      const size=Math.max(8, Math.min(24, spacing * 0.8));
      const origin={x:320+radius*Math.cos(theta),y:320+radius*Math.sin(theta)};
      return {id,round,slot,size,origin,...placedSymbol(origin.x,origin.y,size,o.visual,size)};
    }),
  );
}
export function radialGuides(chart) {
 const spacing=250/(chart.rounds.length+1),sign=chart.direction==='clockwise'?1:-1;
 const guides=[];
 for(let round=0;round<chart.rounds.length;round++){
  const radius=20+spacing*(round+.65);
  if(chart.mode==='joined')guides.push({kind:'arc',x:320,y:320,radius,start:0,end:360});
  else for(let i=0;i<120;i++){
   const point=t=>({x:320+(radius+spacing*t)*Math.cos(-Math.PI/2+sign*2*Math.PI*t),y:320+(radius+spacing*t)*Math.sin(-Math.PI/2+sign*2*Math.PI*t)}),a=point(i/120),b=point((i+1)/120);
   guides.push({kind:'line',...a,x2:b.x,y2:b.y});
  }
 }
 return [...guides,...(chart.guides??[])];
}
export async function roundCanvas(chart, stitches) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1600;
  const c = canvas.getContext("2d");
  c.scale(2.5, 2.5);
  c.fillStyle = "white";
  c.fillRect(0, 0, 640, 640);
  c.fillStyle = "#40584b";
  c.font = "14px sans-serif";
  c.fillText(`${chart.mode} · ${chart.direction} · sample chart`, 15, 20);
  const defs = new Map(stitches.map((s) => [s.id, s]));
  const images = new Map();
  await Promise.all(
    stitches
      .filter((s) => s.image)
      .map(
        (s) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              images.set(s.id, img);
              resolve();
            };
            img.onerror = resolve;
            img.src = s.image;
          }),
      ),
  );
  c.textAlign = "center";
  c.font = "10px sans-serif";
  c.fillText(
    "Sample only: specify starting ring, joins, chains and shaping manually.",
    320,
    625,
  );
  c.textBaseline = "middle";
  for (const p of positions(chart)) {
    const s = defs.get(p.id);
    c.fillStyle = "#283b37";
    c.save();c.translate(p.x,p.y);c.rotate(p.rotation*Math.PI/180);
    if (images.has(s.id))
      c.drawImage(
        images.get(s.id),
        -p.size / 2,
        -p.size / 2,
        p.size,
        p.size,
      );
    else {
      c.font = `${p.size}px sans-serif`;
      c.fillText(s.symbol, 0, 0);
    }
    c.restore();
    if (p.slot === 0) {
      c.font = "9px sans-serif";
      c.fillStyle = "#a02e25";
      c.fillText(`R${p.round + 1} start`, p.x + 22, p.y - 10);
    }
  }
  return canvas;
}
export function mountRounds({
  getProject,
  getPiece,
  record,
  changed,
  isPending,
}) {
  const $ = (id) => document.getElementById(id);
  const drafts = new Map();
  const draftKey = () =>
    `${getProject().id}:${getPiece().id}:${getPiece().roundChart?.rounds[selectedRound]?.id}`;
  let selectedRound = 0,
    identity = "",
    stamp = "", suggestion=null;
  const mutate = (fn) => {
    if (isPending()) {
      $("roundStatus").textContent =
        "Apply/cancel pending design changes and save drafts first.";
      return false;
    }
    record();
    fn();
    changed();
    return true;
  };
  function sync() {
    const p = getProject(),
      piece = getPiece(),
      chart = piece.roundChart,
      key = `${p.id}:${piece.id}`;
    if (key !== identity) {
      selectedRound = 0;
      identity = key;
      stamp = "";
    }
    $("shapingEnabled").checked=p.shapingSuggestions!==false;
    $("shapingControls").hidden=p.shapingSuggestions===false;
    $("roundEditor").hidden = !chart;
    $("createRoundChart").hidden = !!chart;
    if (!chart) return;
    selectedRound = Math.min(selectedRound, chart.rounds.length - 1);
    const sig = JSON.stringify([chart, p.stitches, selectedRound]);
    if (sig === stamp) return;
    stamp = sig;
    $("roundMode").value = chart.mode;
    $("roundDirection").value = chart.direction;
    const selectedStitch = $("roundStitch").value;
    $("roundStitch").replaceChildren(
      ...p.stitches.map((s) => new Option(`${s.name} (${s.abbr})`, s.id)),
    );
    if (p.stitches.some((s) => s.id === selectedStitch))
      $("roundStitch").value = selectedStitch;
    $("roundSelect").replaceChildren(
      ...chart.rounds.map(
        (r, i) => new Option(`Round ${i + 1} · ${r.cells.length} slots`, i),
      ),
    );
    $("roundSelect").value = selectedRound;
    for(const [id,used,made] of [["shapingNormal",1,1],["shapingIncrease",1,2],["shapingDecrease",2,1]]){
      const old=$(id).value;$(id).replaceChildren(...p.stitches.filter(s=>s.consumed===used&&s.produced===made).map(s=>new Option(`${s.name} (${s.abbr})`,s.id)));
      if([...$(id).options].some(o=>o.value===old))$(id).value=old;
    }
    $("roundSlots").value = chart.rounds[selectedRound].cells.length;
    $("roundFoundation").value = chart.foundation?.kind ?? "unspecified";
    $("foundationChains").value = chart.foundation?.chains ?? 4;
    const rule = chart.rounds[selectedRound].construction;
    $("roundJoin").value = rule?.join ?? "unspecified";
    $("roundChains").value = rule?.chains ?? 0;
    $("roundChainCounts").checked = rule?.counts ?? false;
    $("roundTurn").checked = rule?.turn ?? false;
    $("roundPlacement").value = chart.rounds[selectedRound].placement ?? "unspecified";
    const placement = roundPlacement(chart, p.stitches, selectedRound);
    $("roundShapingSummary").textContent = placement.summary + " " + placement.warnings.join(" ");
    const body = $("roundPlacementRows");
    body.replaceChildren();
    for (const slot of placement.slots) {
      const row = document.createElement("tr");
      for (const value of [slot.slot, slot.name, chart.rounds[selectedRound].placement ? slot.target : "Placement unspecified", slot.consumed, slot.produced, slot.delta > 0 ? `+${slot.delta}` : slot.delta]) {
        const cell = document.createElement("td"); cell.textContent = value; row.append(cell);
      }
      body.append(row);
    }
    const svg = $("roundDiagram");
    svg.replaceChildren(...guideElements(radialGuides(chart)));
    const ns = "http://www.w3.org/2000/svg",
      defs = new Map(p.stitches.map((s) => [s.id, s]));
    for (const point of positions(chart)) {
      const g = document.createElementNS(ns, "g");
      g.setAttribute("tabindex", "0");
      g.setAttribute("data-round-slot", `${point.round}-${point.slot}`);
      g.setAttribute("role", "button");
      g.setAttribute(
        "aria-label",
        `Round ${point.round + 1}, slot ${point.slot + 1}: ${defs.get(point.id).name}`,
      );
      const title = document.createElementNS(ns, "title");
      title.textContent = g.getAttribute("aria-label");
      g.append(title);
      const hit = document.createElementNS(ns, "circle");
      hit.setAttribute("cx", point.x);
      hit.setAttribute("cy", point.y);
      hit.setAttribute("r", Math.max(8, point.size / 2));
      hit.setAttribute(
        "fill",
        point.round === selectedRound ? "#e9efe5" : "#faf8f2",
      );
      g.append(hit);
      const def = defs.get(point.id);
      const symbol = document.createElementNS(ns, def.image ? "image" : "text");
      if (def.image) {
        symbol.setAttribute("href", def.image);
        symbol.setAttribute("x", point.x - point.size / 2);
        symbol.setAttribute("y", point.y - point.size / 2);
        symbol.setAttribute("width", point.size);
        symbol.setAttribute("height", point.size);
      } else {
        symbol.textContent = def.symbol;
        symbol.setAttribute("x", point.x);
        symbol.setAttribute("y", point.y);
        symbol.setAttribute("text-anchor", "middle");
        symbol.setAttribute("dominant-baseline", "central");
        symbol.setAttribute("font-size", point.size);
      }
      symbol.setAttribute("transform",`rotate(${point.rotation} ${point.x} ${point.y})`);
      g.append(symbol);
      let dragStart=null,dragged=false;
      const placementAt=e=>{
        const cursor=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
        const others=positions(getPiece().roundChart).filter(p=>p.round!==point.round||p.slot!==point.slot).flatMap(p=>symbolVertices(p,p.size));
        return automaticPlacement(cursor,point.origin,point.size,point.size,$("roundAnchor").value,Number($("roundRotation").value),getProject().diagramSnapping??snappingDefaults,radialGuides(getPiece().roundChart),others,e.altKey||$("roundNoSnap").checked,10);
      };
      g.onpointerdown=e=>{if(e.button!==0)return;dragStart={x:e.clientX,y:e.clientY};dragged=false;g.setPointerCapture(e.pointerId);};
      g.onpointermove=e=>{
        if(!dragStart)return;
        if(!dragged&&Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)<3)return;
        dragged=true;
        let visual,pose;
        try{visual=placementAt(e);pose=placedSymbol(point.origin.x,point.origin.y,point.size,visual,point.size);}catch(error){$("roundStatus").textContent=error.message;return;}
        g.setAttribute('transform',`translate(${pose.x-point.x} ${pose.y-point.y})`);
        symbol.setAttribute('transform',`rotate(${pose.rotation} ${point.x} ${point.y})`);
        $("roundStatus").textContent=`Placement preview: ${visual.target}. Release to apply.`;
      };
      g.onpointerup=e=>{
        if(!dragStart)return;dragStart=null;if(!dragged)return;
        let visual;try{visual=placementAt(e);}catch(error){$("roundStatus").textContent=error.message;stamp='';sync();return;}
        if(!mutate(()=>{
          const r=getPiece().roundChart.rounds[point.round];r.offsets??=[];while(r.offsets.length<=point.slot)r.offsets.push(null);
          r.offsets[point.slot]={...(r.offsets[point.slot]??{angle:0,radius:0}),visual};selectedRound=point.round;
        })){stamp='';sync();}
        $("roundNoSnap").checked=false;
      };
      g.onpointercancel=()=>{dragStart=null;dragged=false;stamp='';sync();};
      const paint = () => {
        if(dragged){dragged=false;return;}
        const focused = document.activeElement === g;
        const applied = mutate(() => {
          getPiece().roundChart.rounds[point.round].cells[point.slot] =
            $("roundStitch").value;
          selectedRound = point.round;
        });
        if (applied && focused)
          $("roundDiagram")
            .querySelector(`[data-round-slot="${point.round}-${point.slot}"]`)
            ?.focus();
      };
      g.onclick = paint;
      g.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          paint();
        }
      };
      svg.append(g);
      if (point.slot === 0) {
        const label = document.createElementNS(ns, "text");
        label.textContent = `R${point.round + 1} start`;
        label.setAttribute("x", point.x + 16);
        label.setAttribute("y", point.y - 9);
        label.setAttribute("font-size", "9");
        svg.append(label);
      }
    }
    $("roundWarnings").textContent = roundWarnings(chart, p.stitches).join(
      "\n",
    );
    const fresh = roundInstructions(chart, p.stitches),
      r = chart.rounds[selectedRound];
    $("roundText").value = drafts.get(draftKey()) ?? r.instruction?.text ?? "";
    $("roundGenerated").textContent = fresh[selectedRound].text;
    $("roundReview").textContent = !r.instruction
      ? "No saved instructions for this round."
      : r.instruction.source === fresh[selectedRound].source
        ? "Instructions match the current round."
        : "Round changed. Review saved text against generated text.";
  }
  $("createRoundChart").onclick = () =>
    mutate(() => {
      getPiece().roundChart = {
        mode: "joined",
        direction: "clockwise",
        rounds: [
          {
            id: crypto.randomUUID(),
            cells: Array(6).fill(getProject().stitches[0].id),
          },
        ],
      };
    });
  for (const [id, key] of [
    ["roundMode", "mode"],
    ["roundDirection", "direction"],
  ])
    $(id).onchange = () => {
      const value = $(id).value;
      if (
        !mutate(() => {
          getPiece().roundChart[key] = value;
        })
      ) {
        stamp = "";
        sync();
      }
    };
  for (const id of ["roundFoundation", "foundationChains", "roundJoin", "roundChains", "roundChainCounts", "roundTurn"]) {
    $(id).onchange = () => {
      const foundation = $("roundFoundation").value;
      const rule = {join: $("roundJoin").value, chains: Number($("roundChains").value), counts: $("roundChainCounts").checked, turn: $("roundTurn").checked};
      if (!rule.chains) rule.counts = false;
      const chains = Number($("foundationChains").value);
      mutate(() => {
        const chart = getPiece().roundChart;
        if (id === "roundFoundation" || id === "foundationChains") {
          if (foundation === "unspecified") delete chart.foundation;
          else chart.foundation = {kind: foundation, chains};
        } else chart.rounds[selectedRound].construction = rule;
      });
      stamp = "";
      sync();
    };
  }
  $("roundPlacement").onchange = () => {
    const value = $("roundPlacement").value;
    mutate(() => {
      const round = getPiece().roundChart.rounds[selectedRound];
      if (value === "unspecified") delete round.placement;
      else round.placement = value;
    });
    stamp = "";
    sync();
  };
  $("roundSelect").onchange = () => {
    selectedRound = Number($("roundSelect").value);
    sync();
  };
  $("addRound").onclick = () => {
    if (getPiece().roundChart.rounds.length >= 20) {
      $("roundStatus").textContent = "Maximum 20 sample rounds.";
      return;
    }
    mutate(() => {
      getPiece().roundChart.rounds.push({
        id: crypto.randomUUID(),
        cells: Array(6).fill($("roundStitch").value),
      });
      selectedRound = getPiece().roundChart.rounds.length - 1;
    });
  };
  $("resizeRound").onclick = () => {
    const n = Number($("roundSlots").value);
    if (!Number.isInteger(n) || n < 1 || n > 120) {
      $("roundStatus").textContent = "Use 1–120 symbol slots.";
      return;
    }
    const r = getPiece().roundChart.rounds[selectedRound];
    if (
      n < r.cells.length &&
      !confirm(
        "Remove trailing symbol slots? Undo or named revisions can recover them.",
      )
    )
      return;
    mutate(() => {
      r.cells = Array.from(
        { length: n },
        (_, i) => r.cells[i] ?? $("roundStitch").value,
      );
      if (r.offsets) r.offsets = r.offsets.slice(0, n);
    });
  };
  $("removeRound").onclick = () => {
    const chart = getPiece().roundChart;
    if (chart.rounds.length === 1) {
      $("roundStatus").textContent = "Keep at least one sample round.";
      return;
    }
    if (
      confirm(
        "Remove the selected round and its notes? Undo or named revisions can recover them.",
      )
    )
      mutate(() => chart.rounds.splice(selectedRound, 1));
  };
  $("roundText").oninput = () => drafts.set(draftKey(), $("roundText").value);
  $("roundText").onchange = () => {
    $("saveRoundText").click();
  };
  function saveInstruction(value) {
    if (value.text.length > 4000 || value.source.length > 100000) {
      $("roundStatus").textContent =
        "Round instructions exceed the size limit. Shorten stitch labels or the round before saving.";
      return;
    }
    const key = draftKey(),
      draft = drafts.get(key);
    drafts.delete(key);
    if (
      !mutate(() => {
        getPiece().roundChart.rounds[selectedRound].instruction = value;
      }) &&
      draft !== undefined
    )
      drafts.set(key, draft);
  }
  $("saveRoundText").onclick = () => {
    const r = getPiece().roundChart.rounds[selectedRound];
    saveInstruction({
      text: $("roundText").value,
      source: r.instruction?.source ?? "",
    });
  };
  $("generateRoundText").onclick = () => {
    const chart = getPiece().roundChart,
      r = chart.rounds[selectedRound];
    if (
      r.instruction &&
      !confirm("Replace this round’s saved text with regenerated text?")
    )
      return;
    saveInstruction(
      roundInstructions(chart, getProject().stitches)[selectedRound],
    );
  };
  $("reviewRoundText").onclick = () =>
    saveInstruction({
      text: $("roundText").value,
      source: roundInstructions(getPiece().roundChart, getProject().stitches)[
        selectedRound
      ].source,
    });
  $("positionRoundSymbol").onclick = () => {
    const slot = Number($("roundPositionSlot").value) - 1,
      angle = Number($("roundAngle").value),
      radius = Number($("roundRadius").value),
      r = getPiece().roundChart.rounds[selectedRound];
    if (
      !Number.isInteger(slot) ||
      slot < 0 ||
      slot >= r.cells.length ||
      !Number.isFinite(angle) ||
      Math.abs(angle) > 180 ||
      !Number.isFinite(radius) ||
      Math.abs(radius) > 20
    ) {
      $("roundStatus").textContent =
        "Choose an existing slot, angle −180…180°, and radius offset −20…20.";
      return;
    }
    let visual={anchor:$("roundAnchor").value,snap:$("roundSnap").value,rotation:Number($("roundRotation").value)};
    if(visual.snap==='auto'){
      const chart=structuredClone(getPiece().roundChart),round=chart.rounds[selectedRound];round.offsets??=[];while(round.offsets.length<=slot)round.offsets.push(null);round.offsets[slot]={angle,radius};
      const all=positions(chart),point=all.find(p=>p.round===selectedRound&&p.slot===slot),others=all.filter(p=>p!==point).flatMap(p=>symbolVertices(p,p.size));
      visual=automaticPlacement(point.origin,point.origin,point.size,point.size,visual.anchor,visual.rotation,getProject().diagramSnapping??snappingDefaults,radialGuides(chart),others,$("roundNoSnap").checked,10);
    }
    try{validatePlacement(visual);}catch(e){$("roundStatus").textContent=e.message;return;}
    $("roundNoSnap").checked=false;
    mutate(() => {
      r.offsets ??= [];
      while (r.offsets.length <= slot) r.offsets.push(null);
      r.offsets[slot] = { angle, radius, visual };
    });
  };
  $("discardRoundDraft").onclick = () => {
    if (drafts.size && !confirm("Discard unsaved round notes?")) return;
    drafts.clear();
    stamp = "";
    sync();
  };
  $("downloadRoundPng").onclick = async () => {
    if (isPending() || drafts.size) {
      $("roundStatus").textContent =
        "Save/discard round notes and resolve pending changes before exporting.";
      return;
    }
    try {
      const chart = structuredClone(getPiece().roundChart),
        stitches = structuredClone(getProject().stitches);
      const canvas = await roundCanvas(chart, stitches),
        link = document.createElement("a");
      link.href = canvas.toDataURL();
      link.download = "stitchinator-round-sample.png";
      link.click();
    } catch (e) {
      $("roundStatus").textContent = e.message;
    }
  };
  $("openShapingSettings").onclick=()=>$("shapingDialog").showModal();
  $("closeShapingSettings").onclick=()=>$("shapingDialog").close();
  $("shapingEnabled").onchange=()=>{const value=$("shapingEnabled").checked;if(suggestion){$("roundStatus").textContent='Apply or cancel the shaping preview first.';$("shapingEnabled").checked=getProject().shapingSuggestions!==false;return;}mutate(()=>{getProject().shapingSuggestions=value;});stamp='';sync();};
  $("previewShaping").onclick=()=>{
    if(isPending()||drafts.size){$("shapingStatus").textContent='Save/discard pending edits first.';return;}
    try{const chart=getPiece().roundChart,cells=suggestRound(chart,getProject().stitches,selectedRound,Number($("shapingTarget").value),$("shapingNormal").value,$("shapingIncrease").value,$("shapingDecrease").value);
      suggestion={pieceId:getPiece().id,roundId:chart.rounds[selectedRound].id,cells,basis:JSON.stringify([chart,getProject().stitches])};
      $("shapingStatus").textContent='Preview only: '+cells.map(id=>getProject().stitches.find(s=>s.id===id).abbr).join(', ')+'. Counts fit; check physical shaping and placement. Apply replaces this sample round.';
    }catch(e){$("shapingStatus").textContent=e.message;}
  };
  $("applyShaping").onclick=()=>{
    if(!suggestion)return;const chart=getPiece().roundChart;
    if(isPending()||drafts.size||suggestion.pieceId!==getPiece().id||suggestion.basis!==JSON.stringify([chart,getProject().stitches])){$("shapingStatus").textContent='Design changed; cancel and preview again.';return;}
    const round=chart.rounds.find(r=>r.id===suggestion.roundId);record();round.cells=suggestion.cells;delete round.offsets;round.placement='sequential';suggestion=null;changed();$("shapingStatus").textContent='Suggested placement applied. Saved notes are retained for review.';
  };
  $("cancelShaping").onclick=()=>{suggestion=null;$("shapingStatus").textContent='Shaping preview cancelled.';};
  sync.hasDraft = () => drafts.size > 0 || !!suggestion;
  window.addEventListener("beforeunload", (e) => {
    if (drafts.size) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  return sync;
}
