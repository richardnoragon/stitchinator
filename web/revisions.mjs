export const MAX_REVISIONS = 100;
const designKeys = [
  "schema",
  "fields",
  "cols",
  "rows",
  "cells",
  "stitches",
  "patterns",
  "instructions",
  "exportOptions",
  "pieces",
  "assemblyPlan",
  "photos",
  "terminology",
  "craft",
  "shapingSuggestions",
  "diagramSnapping",
  "activePieceId",
];
export function designSnapshot(project) {
  return structuredClone(
    Object.fromEntries(
      designKeys
        .filter((k) => project[k] !== undefined)
        .map((k) => [k, project[k]]),
    ),
  );
}
function checkSize(project) {
  if ((project.revisions?.length ?? 0) > MAX_REVISIONS)
    throw Error(
      "This prototype supports up to 100 revisions per project. Download the project to preserve its history.",
    );
  if (
    new TextEncoder().encode(JSON.stringify(project)).length >
    2 * 1024 * 1024
  )
    throw Error(
      "Revision would exceed the 2 MB project limit. Download the current project to preserve it. No changes were applied.",
    );
  return project;
}
function entry(name, snapshot) {
  return {
    id: crypto.randomUUID(),
    name,
    created: new Date().toISOString(),
    snapshot: structuredClone(snapshot),
  };
}
export function addRevision(project, name) {
  name = name.trim();
  if (!name || name.length > 100)
    throw Error("Enter a descriptive revision name of 1–100 characters.");
  if (
    (project.revisions ?? []).some(
      (r) => r.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    )
  )
    throw Error(
      "That revision name already exists. Choose a distinctive name.",
    );
  const result = structuredClone(project);
  result.revisions ??= [];
  result.revisions.push(entry(name, designSnapshot(project)));
  return checkSize(result);
}
export function restoreRevision(project, id) {
  const target = project.revisions?.find((r) => r.id === id);
  if (!target) throw Error("Revision not found.");
  const result = structuredClone(project),
    history = result.revisions;
  function unique(base) {
    const short = base.slice(0, 85);
    let name = short,
      n = 2;
    while (
      history.some(
        (r) => r.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    )
      name = `${short} (${n++})`;
    return name;
  }
  history.push(
    entry(unique(`Before restoring: ${target.name}`), designSnapshot(project)),
  );
  for (const k of designKeys) delete result[k];
  Object.assign(result, designSnapshot(target.snapshot));
  history.push(
    entry(unique(`Restored: ${target.name}`), designSnapshot(result)),
  );
  result.revisions = history;
  return checkSize(result);
}
export function mountRevisions({
  getProject,
  setProject,
  record,
  onChange,
  isPending,
}) {
  const $ = (id) => document.getElementById(id);
  const el = (tag, text) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    return n;
  };
  function render() {
    const p = getProject(),
      query = $("revisionSearch").value.trim().toLocaleLowerCase();
    const revisions = [...(p.revisions ?? [])]
      .reverse()
      .filter((r) => r.name.toLocaleLowerCase().includes(query));
    $("revisionList").replaceChildren();
    $("revisionCount").textContent =
      `${p.revisions?.length ?? 0} saved revisions · ${revisions.length} shown`;
    for (const revision of revisions) {
      const item = el("div");
      item.className = "revisionItem";
      item.append(
        el("strong", revision.name),
        el("small", new Date(revision.created).toLocaleString()),
      );
      const button = el("button", "Restore this revision");
      button.onclick = () => {
        if (isPending()) {
          $("revisionStatus").textContent =
            "Apply or cancel pending size changes before restoring.";
          return;
        }
        if (
          !confirm(
            `Restore “${revision.name}”? The current design will be saved as a new revision first. Existing history will remain intact. This prototype has no consumption or progress records yet.`,
          )
        )
          return;
        try {
          const next = restoreRevision(getProject(), revision.id);
          record();
          setProject(next);
          onChange();
          $("revisionStatus").textContent =
            "Design restored; before-and-after revisions added. Autosave pending.";
        } catch (e) {
          $("revisionStatus").textContent = e.message;
        }
      };
      item.append(button);
      $("revisionList").append(item);
    }
    if (!revisions.length)
      $("revisionList").append(
        el(
          "p",
          query
            ? "No revisions match this name."
            : "No named revisions yet. Autosave does not create named revisions.",
        ),
      );
  }
  $("saveRevision").onclick = () => {
    if (isPending()) {
      $("revisionStatus").textContent =
        "Apply or cancel pending size changes before saving a revision.";
      return;
    }
    try {
      const next = addRevision(getProject(), $("revisionName").value);
      record();
      setProject(next);
      onChange();
      $("revisionName").value = "";
      $("revisionStatus").textContent =
        "Named revision added. Autosave pending.";
    } catch (e) {
      $("revisionStatus").textContent = e.message;
    }
  };
  $("revisionSearch").oninput = render;
  return render;
}
