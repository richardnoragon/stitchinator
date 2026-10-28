import { bandArea } from "./shapes.mjs";
import { bandRequirements } from "./yarn-bands.mjs";
export function requiredGrams(project) {
  const result = {};
  for (const piece of project.pieces) {
    if(piece.amigurumi)return null;
    if (piece.sections) {
      try {
        for (const [id, grams] of Object.entries(
          bandRequirements(piece, project.fields.allowance),
        ))
          result[id] = (result[id] ?? 0) + grams;
      } catch {
        return null;
      }
      continue;
    }

    if (!piece.yarn) return null;
    const f = piece.fields;
    const values = [
      "width",
      "length",
      "swatch_width",
      "swatch_length",
      "grams",
      "stitches",
      "rows",
      "skein_grams",
      "skein_meters",
    ]
      .filter((k) => piece.shape !== "circle" || k !== "length")
      .map((k) => Number(f[k]));
    if (values.some((v) => !Number.isFinite(v) || v <= 0 || v > 1000000))
      return null;
    const grams =
      (bandArea(piece) / (Number(f.swatch_width) * Number(f.swatch_length))) *
      Number(f.grams) *
      (1 + Number(project.fields.allowance) / 100) *
      piece.quantity;
    result[piece.yarn.id] = (result[piece.yarn.id] ?? 0) + grams;
  }
  return result;
}
export function needsReservationReview(project) {
  if (!["Ready to make", "In progress", "On hold"].includes(project.lifecycle))
    return false;
  const required = requiredGrams(project),
    held = project.reservation?.grams ?? {};
  return (
    !required ||
    new Set([...Object.keys(required), ...Object.keys(held)]).size !==
      Object.keys(required).length ||
    Object.entries(required).some(
      ([id, g]) => Math.abs(g - (held[id] ?? 0)) > 0.000001,
    )
  );
}
export function mountYarnPlanning({
  getProject,
  activePiece,
  record,
  changed,
  syncFields,
  save,
  loadProject,
  isPending,
}) {
  const $ = (id) => document.getElementById(id);
  let lots = [],
    identity = "",
    busy = false;
  function sync() {
    const p = getProject(),
      piece = activePiece(p);
    const key = `${p.id}:${p.lifecycle ?? "Draft"}`;
    if (identity !== key) {
      $("projectLifecycle").value = p.lifecycle ?? "Draft";
      identity = key;
      $("reservationReport").textContent =
        "Review stock and reservations for current information.";
    }
    $("assignedYarn").textContent = piece.yarn
      ? `${piece.yarn.name} · Dye lot ${piece.yarn.dye_lot || "not recorded"}. Saved yarn specifications are retained until explicitly reapplied.`
      : "No inventory yarn assigned to this piece.";
    $("reservationState").textContent =
      `Status: ${p.lifecycle ?? "Draft"}. ${needsReservationReview(p) ? "Reservation needs review. Existing commitments remain until you approve an update." : ""}`;
  }
  async function refreshLots() {
    try {
      const r = await fetch("/api/inventory");
      if (!r.ok) throw Error(await r.text());
      lots = (await r.json()).items;
      $("pieceYarn").replaceChildren(
        new Option("Choose a yarn lot", ""),
        ...lots.map(
          (y) =>
            new Option(
              `${y.name} · ${y.color} · lot ${y.dye_lot || "unknown"} · ${y.remaining_grams} g owned`,
              y.id,
            ),
        ),
      );
      $("yarnPlanningStatus").textContent =
        "Yarn list refreshed. Stock shown is owned stock before other projects’ commitments.";
    } catch (e) {
      $("yarnPlanningStatus").textContent = e.message;
    }
  }
  $("refreshYarns").onclick = refreshLots;
  $("assignYarn").onclick = () => {
    if (isPending()) {
      $("yarnPlanningStatus").textContent =
        "Save inventory edits and apply/cancel pending design changes first.";
      return;
    }
    if (activePiece(getProject()).sections) {
      $("yarnPlanningStatus").textContent =
        "Edit band allocations or return to single-yarn mode before assigning the whole piece.";
      return;
    }
    const yarn = lots.find((y) => y.id === $("pieceYarn").value);
    if (!yarn) return;
    if (
      !confirm(
        "Apply this yarn’s skein specifications? Existing swatch measurements will be cleared so you can enter a swatch matching this yarn. Existing reservations remain until reviewed.",
      )
    )
      return;
    record();
    const piece = activePiece(getProject());
    piece.yarn = structuredClone(yarn);
    piece.fields.skein_grams = String(yarn.skein_grams);
    piece.fields.skein_meters = String(yarn.skein_meters);
    for (const key of [
      "swatch_width",
      "swatch_length",
      "stitches",
      "rows",
      "grams",
    ])
      piece.fields[key] = "";
    syncFields();
    changed();
    $("yarnPlanningStatus").textContent =
      "Yarn assigned. Enter matching swatch measurements before estimating or reserving.";
  };
  function describe(value) {
    return [
      value.mixing_dye_lots
        ? "Warning: this project mixes dye lots of the same yarn and color. Review color consistency."
        : "",
      value.error ? `Estimate unavailable: ${value.error}` : "",
      value.needs_review ? "Reservation needs review." : "",
      ...value.rows.map(
        (row) =>
          `${row.name} (lot ${row.dye_lot || "unknown"}): remaining need ${row.needed.toFixed(1)} g; consumed ${(row.consumed ?? 0).toFixed(1)} g; current commitment ${row.committed.toFixed(1)} g; owned ${row.owned.toFixed(1)} g; other projects ${row.other_commitments.toFixed(1)} g; shortage to purchase ${row.shortage.toFixed(1)} g.${row.others.length ? " Competing projects: " + row.others.map((p) => p.name).join(", ") : ""}`,
      ),
    ]
      .filter(Boolean)
      .join("\n");
  }
  async function review(apply) {
    if (busy) return;
    if (isPending()) {
      $("yarnPlanningStatus").textContent =
        "Save inventory edits and apply/cancel pending design changes first.";
      return;
    }
    busy = true;
    document.querySelector("main").inert = true;
    document.querySelector("header").inert = true;
    try {
      if (!(await save()))
        throw Error("Save the current project before reviewing reservations.");
      const id = getProject().id,
        status = $("projectLifecycle").value;
      const r = await fetch(`/api/projects/${id}/reservations`);
      if (!r.ok) throw Error(await r.text());
      const preview = await r.json();
      const details = describe(preview);
      $("reservationReport").textContent = details || "No yarn commitments.";
      if (apply) {
        const retaining = status === "On hold" || status === "In progress";
        const reconcile = $("reconcileReservations").checked;
        const action =
          retaining && !reconcile
            ? "Keep existing commitments."
            : ["Draft", "Completed", "Abandoned"].includes(status)
              ? "Release all yarn commitments."
              : "Update yarn commitments to the displayed requirements. Shortages do not increase physical stock.";
        if (!confirm(`Set status to ${status}? ${action}\n\n${details}`))
          return;
        const response = await fetch(`/api/projects/${id}/reservations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Stitchinator": "1",
          },
          body: JSON.stringify({ token: preview.token, status, reconcile }),
        });
        if (!response.ok) throw Error(await response.text());
        const result = await response.json();
        await loadProject(id);
        $("reservationReport").textContent = describe(result);
        $("yarnPlanningStatus").textContent =
          "Project status and yarn commitments saved.";
      }
    } catch (e) {
      $("yarnPlanningStatus").textContent = e.message;
    } finally {
      busy = false;
      document.querySelector("main").inert = false;
      document.querySelector("header").inert = false;
    }
  }
  $("reviewReservations").onclick = () => review(false);
  $("applyLifecycle").onclick = () => review(true);
  return sync;
}
