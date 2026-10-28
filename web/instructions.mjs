export function rowInstructions(project, direction = "alternate") {
  const knitting=project.craft==="knitting",circular=knitting&&project.knittingMode==="round";
  if(circular)direction="right";
  const definitions = new Map(project.stitches.map((s) => [s.id, s]));
  return Array.from({ length: project.rows }, (_, row) => {
    const ids = project.cells.slice(
      row * project.cols,
      (row + 1) * project.cols,
    );
    const reverse =
      direction === "right" || (direction === "alternate" && row % 2 === 0);
    if (reverse) ids.reverse();
    const stitches = ids.map((id) => definitions.get(id));
    let period = ids.length;
    for (let n = 1; n <= ids.length / 2; n++)
      if (ids.length % n === 0 && ids.every((id, i) => id === ids[i % n])) {
        period = n;
        break;
      }
    const runs = [];
    for (const s of stitches.slice(0, period)) {
      const last = runs.at(-1);
      if (last?.id === s.id) last.count++;
      else runs.push({ id: s.id, label: `${s.name} (${s.abbr})`, count: 1 });
    }
    const phrase = runs.map((r) => `${r.count} × ${r.label}`).join(", ");
    const repeats = ids.length / period;
    const used = stitches.reduce((a, s) => a + s.consumed, 0),
      made = stitches.reduce((a, s) => a + s.produced, 0);
    const text = `${circular?"Round":"Row"} ${row + 1} (${reverse ? "right to left" : "left to right"}): ${repeats > 1 ? `Repeat [${phrase}] ${repeats} times` : phrase}. Consumes ${used}; produces ${made} stitches.`;
    return {
      text,
      source: JSON.stringify([
        direction,
        ...(knitting?["knitting",project.knittingMode??"flat"]:[]),
        stitches.map((s) => [s.id, s.name, s.abbr, s.consumed, s.produced]),
      ]),
    };
  });
}
export function chartGaugeSummary(project) {
  const f = project.fields,
    sw = Number(f.swatch_width),
    sl = Number(f.swatch_length),
    st = Number(f.stitches),
    rows = Number(f.rows);
  if (![sw, sl, st, rows].every((n) => Number.isFinite(n) && n > 0))
    return "Enter swatch dimensions and stitch/row counts to compare this sample chart with your intended piece.";
  const defs = new Map(project.stitches.map((s) => [s.id, s]));
  const counts = Array.from({ length: project.rows }, (_, r) =>
    project.cells
      .slice(r * project.cols, (r + 1) * project.cols)
      .reduce((n, id) => n + defs.get(id).produced, 0),
  );
  const low = (Math.min(...counts) * sw) / st,
    high = (Math.max(...counts) * sw) / st;
  const uniform = counts.every((n) => n === counts[0]);
  return `At this gauge, the sample chart represents approximately ${low.toFixed(2)}${uniform ? "" : `–${high.toFixed(2)}`} cm wide × ${((project.rows * sl) / rows).toFixed(2)} cm long (${f.blocking.toLowerCase()}). Intended piece: ${f.width} × ${f.length} cm.\n${uniform ? "" : "Row stitch totals vary; the width range is only an approximation. "}This assumes the swatch matches the chart’s complete fabric pattern. No automatic resizing or rounding is applied.`;
}
export function mountInstructions({ getProject, record, onChange, element }) {
  const el = (tag, text) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    return n;
  };
  function render() {
    const p = getProject();
    element.replaceChildren();
    if (!p.instructions) {
      const b = el("button", "Generate sample-chart instructions");
      b.id = "generateInstructions";
      b.onclick = () => {
        record();
        p.instructions = {
          direction: "alternate",
          rows: rowInstructions(p),
          finishing: "",
        };
        onChange();
      };
      element.append(b);
      return;
    }
    const state = p.instructions;
    const label = el("label", "Chart reading order");
    const select = el("select");
    select.id = "instructionDirection";
    for (const [v, t] of [
      ["alternate", "Alternate: row 1 right to left"],
      ["left", "Every row left to right"],
      ["right", "Every row right to left"],
    ]) {
      const option = el("option", t);
      option.value = v;
      select.append(option);
    }
    select.value = p.craft==="knitting"&&p.knittingMode==="round"?"right":state.direction;
    select.disabled=p.craft==="knitting"&&p.knittingMode==="round";
    label.append(select);
    select.onchange = () => {
      record();
      state.direction = select.value;
      onChange();
    };
    element.append(label);
    const generated = rowInstructions(p, state.direction);
    const review =
      generated.some((g, i) => state.rows[i]?.source !== g.source) ||
      state.rows.length > generated.length;
    const message = el(
      "p",
      review
        ? "Instructions need review. Your saved text is preserved below."
        : "Instructions match the last reviewed chart.",
    );
    message.id = "instructionReview";
    message.setAttribute("role", "status");
    element.append(message);
    for (let i = 0; i < Math.max(generated.length, state.rows.length); i++) {
      const saved = state.rows[i],
        fresh = generated[i],
        section = el("div");
      section.className = "instructionRow";
      section.append(
        el("h3", `Row ${i + 1}${fresh ? "" : " — outside current chart"}`),
      );
      if (saved) {
        const lab = el("label", "Your instruction");
        const text = el("textarea");
        text.value = saved.text;
        text.maxLength = 8000;
        text.rows = 3;
        text.dataset.row = String(i);
        lab.append(text);
        section.append(lab);
        text.onfocus = () => record();
        text.oninput = () => {
          saved.text = text.value;
          onChange(false);
        };
      }
      if (!fresh) {
        section.append(
          el(
            "p",
            "This row was removed from the chart. Its saved text is retained for reference.",
          ),
        );
      } else if (!saved || fresh.source !== saved.source) {
        const comparison = el("p", fresh.text);
        comparison.className = "generatedInstruction";
        section.append(el("strong", "Regenerated suggestion"), comparison);
        const use = el("button", "Use regenerated text");
        use.onclick = () => {
          record();
          state.rows[i] = { ...fresh };
          onChange();
        };
        section.append(use);
        if (saved) {
          const keep = el("button", "Keep my text — reviewed");
          keep.onclick = () => {
            record();
            saved.source = fresh.source;
            onChange();
          };
          section.append(keep);
        }
      }
      element.append(section);
    }
    const labelNotes = el("label", "Finishing and assembly notes");
    const notes = el("textarea");
    notes.id = "finishingNotes";
    notes.rows = 4;
    notes.maxLength = 16000;
    notes.value = state.finishing;
    notes.onfocus = () => record();
    notes.oninput = () => {
      state.finishing = notes.value;
      onChange(false);
    };
    labelNotes.append(notes);
    element.append(labelNotes);
  }
  return render;
}
