export function mountBackups({ save, isPending }) {
  const $ = (id) => document.getElementById(id);
  let busy = false;
  async function refresh() {
    try {
      const r = await fetch("/api/backups");
      if (!r.ok) throw Error(await r.text());
      const state = await r.json();
      const selected = $("restorePoint").value;
      $("restorePoint").replaceChildren(
        new Option("Choose a restore point", ""),
      );
      for (const p of state.points ?? []) {
        $("restorePoint").append(
          new Option(
            `${new Date(p.created).toLocaleString()} · ${p.kind} · ${p.id.slice(-6)}`,
            p.id,
          ),
        );
      }
      if ([...$("restorePoint").options].some((o) => o.value === selected))
        $("restorePoint").value = selected;
      $("backupStatus").textContent = [
        state.configured
          ? `Destination: ${state.destination}`
          : "Backup destination not configured.",
        state.last_success
          ? `Last successful backup: ${new Date(state.last_success).toLocaleString()}`
          : "No successful backup found.",
        state.overdue
          ? "Backup overdue / awaiting first backup."
          : "Scheduled backup is current.",
        state.error ? `Attention: ${state.error}` : "",
        `Schedule clock: ${state.local_time}`,
      ]
        .filter(Boolean)
        .join("\n");
      $("backupNow").disabled = busy || !state.configured;
      $("restoreBackup").disabled = busy || !state.points?.length;
    } catch (e) {
      $("backupStatus").textContent =
        "Unable to read backup status: " + e.message;
    }
  }
  async function run(restore) {
    if (busy) return;
    if (isPending()) {
      $("backupActionStatus").textContent =
        "Apply/cancel pending size edits and save project details, yarn inventory edits, and usage drafts before continuing.";
      return;
    }
    const id = $("restorePoint").value;
    if (restore && !id) {
      $("backupActionStatus").textContent = "Choose a restore point.";
      return;
    }
    if (
      restore &&
      !confirm(
        "Restore the entire collection to this point? A full safety backup of the current saved collection is required first. Projects created after this point will leave the active library but remain recoverable from that safety backup.",
      )
    )
      return;
    busy = true;
    document.querySelector("main").inert = true;
    document.querySelector("header").inert = true;
    try {
      if (!(await save()))
        throw Error("Current edits could not be saved. Operation cancelled.");
      const r = await fetch(
        restore
          ? `/api/backups/${encodeURIComponent(id)}/restore`
          : "/api/backups",
        {
          method: "POST",
          headers: {
            "X-Stitchinator": "1",
            ...(restore ? { "X-Confirm-Restore": "replace-collection" } : {}),
          },
        },
      );
      if (!r.ok) throw Error(await r.text());
      const value = await r.json();
      if (restore) {
        $("backupActionStatus").textContent =
          "Restored. Safety backup: " + value.safety_backup;
        location.reload();
        return;
      }
      $("backupActionStatus").textContent = "Backup completed.";
    } catch (e) {
      $("backupActionStatus").textContent = "Operation failed: " + e.message;
    } finally {
      busy = false;
      document.querySelector("main").inert = false;
      document.querySelector("header").inert = false;
      await refresh();
    }
  }
  $("backupNow").onclick = () => run(false);
  $("restoreBackup").onclick = () => run(true);
  $("refreshBackups").onclick = refresh;
  refresh();
  setInterval(() => {
    if (!busy) refresh();
  }, 15000);
}
