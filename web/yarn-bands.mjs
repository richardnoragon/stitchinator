import { bandArea } from "./shapes.mjs";
export const swatchKeys = [
  "swatch_width",
  "swatch_length",
  "stitches",
  "rows",
  "grams",
  "hook",
  "blocking",
];
export function compatible(a, b) {
  return [
    "brand",
    "product",
    "fiber",
    "color",
    "category",
    "shape",
    "size_mm",
    "thickness_mm",
    "skein_grams",
    "skein_meters",
  ].every((k) => a[k] === b[k]);
}
export function validateBands(sections) {
  if (sections === undefined) return;
  if (!Array.isArray(sections) || !sections.length || sections.length > 32)
    throw Error("Use 1–32 bands.");
  const ids = new Set();
  for (const s of sections) {
    if (
      !s ||
      typeof s.id !== "string" ||
      !/^[-a-zA-Z0-9]{1,64}$/.test(s.id) ||
      ids.has(s.id) ||
      typeof s.name !== "string" ||
      !s.name.trim() ||
      s.name.length > 100 ||
      !Number.isFinite(s.percent) ||
      s.percent <= 0 ||
      s.percent > 100 ||
      !/^#[0-9a-f]{6}$/i.test(s.color) ||
      typeof s.pattern !== "string" ||
      s.pattern.length > 200 ||
      !s.fields ||
      swatchKeys.some(
        (k) => typeof s.fields[k] !== "string" || s.fields[k].length > 200,
      )
    )
      throw Error("Invalid band details.");
    ids.add(s.id);
    if (
      !Array.isArray(s.allocations) ||
      !s.allocations.length ||
      s.allocations.length > 8
    )
      throw Error("Allocate 1–8 lots per band.");
    const lotIds = new Set();
    for (const a of s.allocations) {
      const y = a.yarn;
      if (
        !y ||
        typeof y.id !== "string" ||
        !/^[-a-zA-Z0-9]{1,64}$/.test(y.id) ||
        lotIds.has(y.id) ||
        typeof y.name !== "string" ||
        y.name.length > 200 ||
        !Number.isFinite(a.percent) ||
        a.percent <= 0 ||
        a.percent > 100 ||
        ![y.skein_grams, y.skein_meters].every(
          (n) => Number.isFinite(n) && n > 0 && n <= 1000000,
        ) ||
        !compatible(s.allocations[0].yarn, y)
      )
        throw Error(
          "Lots must be unique and have matching yarn/color specifications.",
        );
      lotIds.add(y.id);
    }
    if (
      Math.abs(s.allocations.reduce((n, a) => n + a.percent, 0) - 100) >
      0.000001
    )
      throw Error("Lot shares must total 100% within each band.");
  }
}
export function bandRequirements(piece, allowance) {
  validateBands(piece.sections);
  if (
    Math.abs(piece.sections.reduce((n, s) => n + s.percent, 0) - 100) > 0.000001
  )
    throw Error("Band lengths must total 100%.");
  const result = {};
  let start = 0;
  for (const section of piece.sections) {
    const f = section.fields;
    if (
      ["swatch_width", "swatch_length", "stitches", "rows", "grams"].some(
        (k) =>
          !Number.isFinite(Number(f[k])) ||
          Number(f[k]) <= 0 ||
          Number(f[k]) > 1000000,
      )
    )
      throw Error("Each band needs a measured swatch.");
    const end = start + section.percent / 100;
    const grams =
      (bandArea(piece, start, end) /
        (Number(f.swatch_width) * Number(f.swatch_length))) *
      Number(f.grams) *
      (1 + Number(allowance) / 100) *
      piece.quantity;
    start = end;
    if (!Number.isFinite(grams) || grams <= 0)
      throw Error("Invalid piece dimensions.");
    for (const a of section.allocations)
      result[a.yarn.id] = (result[a.yarn.id] ?? 0) + (grams * a.percent) / 100;
  }
  return result;
}
export function mountBands({
  getProject,
  activePiece,
  record,
  changed,
  isPending,
}) {
  const $ = (id) => document.getElementById(id);
  let identity = "",
    editing = "",
    allocations = [],
    lots = [],
    dirty = false;
  const field = (k) => $("band_" + k);
  function reset() {
    editing = "";
    allocations = [];
    dirty = false;
    for (const k of swatchKeys)
      field(k).value = k === "blocking" ? "After blocking" : "";
    field("name").value = "";
    field("pattern").value = "";
    field("percent").value = "100";
    field("color").value = "#cb765d";
    renderAllocations();
  }
  function renderAllocations() {
    $("bandAllocations").replaceChildren();
    allocations.forEach((a, i) => {
      const row = document.createElement("p");
      row.textContent = `${a.yarn.name} · lot ${a.yarn.dye_lot || "unknown"}: ${a.percent}% `;
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = "Remove from draft";
      b.onclick = () => {
        allocations.splice(i, 1);
        dirty = true;
        renderAllocations();
      };
      row.append(b);
      $("bandAllocations").append(row);
    });
  }
  function sync() {
    const p = getProject(),
      piece = activePiece(p),
      key = `${p.id}:${piece.id}`;
    if (identity !== key) {
      identity = key;
      reset();
    }
    $("bandList").replaceChildren();
    for (const band of piece.sections ?? []) {
      const row = document.createElement("p");
      row.textContent = `${band.name} · ${band.percent}% of length · ${band.pattern || "stitch pattern not named"} `;
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = "Edit band";
      b.onclick = () => {
        if (dirty && !confirm("Discard unsaved band edits?")) return;
        editing = band.id;
        for (const k of swatchKeys) field(k).value = band.fields[k];
        for (const k of ["name", "pattern", "percent", "color"])
          field(k).value = band[k];
        allocations = structuredClone(band.allocations);
        dirty = true;
        renderAllocations();
      };
      row.append(b);
      for (const [label, delta] of [
        ["Move up", -1],
        ["Move down", 1],
        ["Remove band", 0],
      ]) {
        const control = document.createElement("button");
        control.type = "button";
        control.textContent = label;
        const index = piece.sections.indexOf(band);
        control.disabled =
          delta !== 0 &&
          (index + delta < 0 || index + delta >= piece.sections.length);
        control.onclick = () => {
          if (dirty || isPending()) {
            $("bandStatus").textContent =
              "Save/cancel the band draft and other pending changes first.";
            return;
          }
          if (
            delta === 0 &&
            !confirm(
              "Remove this band? Removing the last band returns to the main swatch and single-yarn assignment. Undo or named revisions can recover it.",
            )
          )
            return;
          record();
          if (delta) {
            [piece.sections[index], piece.sections[index + delta]] = [
              piece.sections[index + delta],
              piece.sections[index],
            ];
          } else {
            piece.sections.splice(index, 1);
            if (!piece.sections.length) delete piece.sections;
          }
          changed();
          sync();
        };
        row.append(control);
      }
      $("bandList").append(row);
    }
    const total = (piece.sections ?? []).reduce((n, b) => n + b.percent, 0);
    $("bandCoverage").textContent = piece.sections
      ? `Band mode: ${total}% of length covered. ${Math.abs(total - 100) > 0.000001 ? "Estimates unavailable until coverage totals 100%." : ""} Each band has its own swatch; the main swatch is not used for yarn estimates.`
      : "Single-yarn mode. Saving the first band activates band estimates. Bands run in the listed order along the length.";
  }
  $("bandForm").oninput = () => {
    dirty = true;
  };
  $("refreshBandLots").onclick = async () => {
    try {
      const r = await fetch("/api/inventory");
      if (!r.ok) throw Error(await r.text());
      lots = (await r.json()).items;
      $("bandLot").replaceChildren(
        new Option("Choose a lot", ""),
        ...lots.map(
          (y) => new Option(`${y.name} · lot ${y.dye_lot || "unknown"}`, y.id),
        ),
      );
    } catch (e) {
      $("bandStatus").textContent = e.message;
    }
  };
  $("addBandLot").onclick = () => {
    try {
      const yarn = lots.find((y) => y.id === $("bandLot").value),
        percent = Number($("bandLotPercent").value);
      if (!yarn || !Number.isFinite(percent) || percent <= 0 || percent > 100)
        throw Error("Choose a lot and percentage.");
      if (
        allocations.some((a) => a.yarn.id === yarn.id) ||
        allocations.length >= 8
      )
        throw Error("Use up to eight distinct lots.");
      if (allocations.length && !compatible(allocations[0].yarn, yarn))
        throw Error(
          "For a different yarn or color, create a separate band. Split lots must have matching specifications.",
        );
      allocations.push({ yarn: structuredClone(yarn), percent });
      dirty = true;
      renderAllocations();
    } catch (e) {
      $("bandStatus").textContent = e.message;
    }
  };
  $("newBand").onclick = () => {
    if (!dirty || confirm("Discard unsaved band edits?")) reset();
  };
  $("bandForm").onsubmit = (e) => {
    e.preventDefault();
    if (isPending()) {
      $("bandStatus").textContent =
        "Apply/cancel other design changes and save inventory edits first.";
      return;
    }
    try {
      const piece = activePiece(getProject()),
        band = {
          id: editing || crypto.randomUUID(),
          name: field("name").value.trim(),
          pattern: field("pattern").value.trim(),
          percent: Number(field("percent").value),
          color: field("color").value,
          fields: Object.fromEntries(
            swatchKeys.map((k) => [k, field(k).value]),
          ),
          allocations: structuredClone(allocations),
        };
      const sections = structuredClone(piece.sections ?? []);
      const index = sections.findIndex((s) => s.id === editing);
      if (index < 0) sections.push(band);
      else sections[index] = band;
      validateBands(sections);
      record();
      piece.sections = sections;
      reset();
      changed();
      sync();
      $("bandStatus").textContent =
        "Band saved. Review reservations after changing the yarn plan.";
    } catch (e) {
      $("bandStatus").textContent = e.message;
    }
  };
  $("singleYarnMode").onclick = () => {
    if (isPending()) return;
    if (
      !confirm(
        "Return to the main swatch and single-yarn assignment? Current band definitions will be removed from the design; undo and saved revisions can recover them.",
      )
    )
      return;
    record();
    delete activePiece(getProject()).sections;
    reset();
    changed();
    sync();
  };
  sync.hasDraft = () => dirty;
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  return sync;
}
