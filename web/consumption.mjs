export function mountConsumption({
  getProject,
  save,
  loadProject,
  isPending,
  reloadInventory,
}) {
  const $ = (id) => document.getElementById(id);
  let data = null,
    projectId = "",
    editing = "",
    busy = false;
  function sync() {
    if (projectId !== getProject().id) {
      projectId = getProject().id;
      data = null;
      editing = "";
      $("usageList").replaceChildren();
      $("usageLot").replaceChildren(
        new Option("Refresh usage to choose a lot", ""),
      );
      $("usageGrams").value = "";
      $("usageNote").value = "";
      $("usageStatus").textContent = "Refresh usage for this project.";
    }
  }
  function render() {
    const selected = $("usageLot").value;
    $("usageLot").replaceChildren(
      ...data.lots.map(
        (y) =>
          new Option(
            `${y.name} · lot ${y.dye_lot || "unknown"} · ${y.remaining_grams} g owned`,
            y.id,
          ),
      ),
    );
    if (data.lots.some((y) => y.id === selected))
      $("usageLot").value = selected;
    $("usageList").replaceChildren();
    for (const entry of data.entries) {
      const row = document.createElement("div"),
        title = document.createElement("p"),
        button = document.createElement("button"),
        history = document.createElement("details"),
        summary = document.createElement("summary"),
        text = document.createElement("pre");
      title.textContent = `${entry.lot_name}: ${entry.grams} g${entry.grams === 0 ? " (removed)" : ""} · ${entry.note}`;
      button.type = "button";
      button.textContent = "Correct entry";
      button.onclick = () => {
        if (hasDraft() && !confirm("Discard unsaved usage edits?")) return;
        editing = entry.id;
        $("usageLot").value = entry.lot_id;
        $("usageLot").disabled = true;
        $("usageGrams").value = entry.grams;
        $("usageNote").value = "";
        $("usageStatus").textContent =
          "Enter the corrected TOTAL grams, or 0 to remove. Explain the correction.";
      };
      summary.textContent = `History (${entry.history.length})`;
      text.textContent = entry.history
        .map((h) => `${h.at}: ${h.before} → ${h.after} g · ${h.note}`)
        .join("\n");
      history.append(summary, text);
      row.append(title, button, history);
      $("usageList").append(row);
    }
  }
  function reset() {
    editing = "";
    $("usageGrams").value = "";
    $("usageNote").value = "";
    $("usageLot").disabled = false;
  }
  const hasDraft = () =>
    $("usageGrams").value !== "" || $("usageNote").value !== "";
  async function refresh() {
    if (hasDraft() && !confirm("Discard unsaved usage edits and refresh?"))
      return;
    if (busy || isPending()) {
      $("usageStatus").textContent =
        "Apply/cancel design changes and save inventory edits first.";
      return;
    }
    busy = true;
    document.querySelector("main").inert = true;
    document.querySelector("header").inert = true;
    try {
      if (!(await save()))
        throw Error("Save the project before refreshing usage.");
      const id = getProject().id;
      const r = await fetch(`/api/projects/${id}/consumption`);
      if (!r.ok) throw Error(await r.text());
      data = await r.json();
      projectId = id;
      reset();
      render();
      $("usageStatus").textContent =
        "Usage refreshed. Entries describe prior work and are retained when restoring design revisions.";
    } catch (e) {
      $("usageStatus").textContent = e.message;
    } finally {
      busy = false;
      document.querySelector("main").inert = false;
      document.querySelector("header").inert = false;
    }
  }
  $("refreshUsage").onclick = refresh;
  $("newUsage").onclick = () => {
    if (hasDraft() && !confirm("Discard unsaved usage edits?")) return;
    reset();
    $("usageStatus").textContent = "Record a new amount actually used.";
  };
  $("usageForm").onsubmit = async (event) => {
    event.preventDefault();
    if (busy || !data || isPending()) {
      $("usageStatus").textContent =
        "Refresh usage and resolve pending edits first.";
      return;
    }
    const grams = Number($("usageGrams").value),
      lot = data.lots.find((y) => y.id === $("usageLot").value),
      old = data.entries.find((e) => e.id === editing);
    if (!lot) return;
    const after = lot.remaining_grams + (old?.grams ?? 0) - grams;
    if (
      !confirm(
        `${editing ? "Correct total usage to" : "Record usage of"} ${grams} g for ${lot.name}? Recorded owned stock will change from ${lot.remaining_grams} g to ${after} g. Remaining active commitments are reduced by actual use; released commitments stay released. This records actual use even if it exceeds the estimate.`,
      )
    )
      return;
    busy = true;
    document.querySelector("main").inert = true;
    document.querySelector("header").inert = true;
    try {
      const id = getProject().id;
      const r = await fetch(`/api/projects/${id}/consumption`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Stitchinator": "1" },
        body: JSON.stringify({
          inventory_version: data.inventory_version,
          project_version: data.project_version,
          entry_id: editing,
          lot_id: lot.id,
          grams,
          note: $("usageNote").value,
        }),
      });
      if (!r.ok) throw Error(await r.text());
      data = await r.json();
      reset();
      render();
      await loadProject(id);
      await reloadInventory();
      $("usageStatus").textContent =
        "Usage and stock saved together. Review reservations for updated totals.";
    } catch (e) {
      $("usageStatus").textContent = e.message;
    } finally {
      busy = false;
      document.querySelector("main").inert = false;
      document.querySelector("header").inert = false;
    }
  };
  sync.hasDraft = hasDraft;
  window.addEventListener("beforeunload", (event) => {
    if (hasDraft() || busy) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  return sync;
}
