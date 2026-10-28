export function normalizeFolder(input) {
  const parts = input
    .trim()
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
  if (
    parts.some((p) => p === "." || p === ".." || p.length > 60) ||
    parts.length > 8
  )
    throw Error(
      "Use up to eight folder levels, with names of at most 60 characters.",
    );
  const result = parts.join("/");
  if (result.length > 240) throw Error("Folder path is too long.");
  return result;
}
export function parseTags(input) {
  const tags = [
    ...new Set(
      input
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];
  if (tags.length > 20 || tags.some((t) => t.length > 40))
    throw Error("Use up to 20 tags, each at most 40 characters.");
  return tags;
}
export function matchesProject(p, query, folder) {
  const haystack = [p.name, p.description, ...(p.tags ?? []), p.folder]
    .join(" ")
    .toLocaleLowerCase();
  return (
    haystack.includes(query.trim().toLocaleLowerCase()) &&
    (!folder || p.folder === folder || p.folder?.startsWith(folder + "/"))
  );
}
export function mountLibrary({
  getProject,
  createProject,
  loadProject,
  save,
  isPending,
  onMetadata,
}) {
  const $ = (id) => document.getElementById(id);
  let entries = [],
    busy = false;
  async function refresh() {
    const r = await fetch("/api/projects");
    if (!r.ok) throw Error(await r.text());
    entries = await r.json();
    render();
  }
  function render() {
    const list = $("projectList");
    list.replaceChildren();
    const folderSelect = $("projectFilter"),
      chosen = folderSelect.value;
    const folders = new Set();
    for (const p of entries) {
      const parts = (p.folder ?? "").split("/").filter(Boolean);
      for (let i = 1; i <= parts.length; i++)
        folders.add(parts.slice(0, i).join("/"));
    }
    folderSelect.replaceChildren(
      new Option("All folders", ""),
      ...[...folders].sort().map((f) => new Option(f, f)),
    );
    if (folders.has(chosen)) folderSelect.value = chosen;
    const visible = entries.filter((p) =>
      matchesProject(p, $("projectSearch").value, folderSelect.value),
    );
    $("projectCount").textContent =
      `${entries.length} projects · ${visible.length} shown`;
    for (const p of visible) {
      const item = document.createElement("div");
      item.className = "projectItem";
      const name = document.createElement("strong");
      name.textContent = p.name || "Untitled project";
      const detail = document.createElement("small");
      detail.textContent = [
        p.folder || "Unfiled",
        (p.tags ?? []).join(", "),
        p.description,
      ]
        .filter(Boolean)
        .join(" · ");
      const button = document.createElement("button");
      button.textContent =
        p.id === getProject().id ? "Current project" : "Open project";
      button.disabled = p.id === getProject().id;
      button.onclick = () => run(() => loadProject(p.id));
      item.append(name, detail, button);
      list.append(item);
    }
  }
  async function run(action, editingMetadata = false) {
    if (busy) return;
    if (isPending()) {
      $("libraryStatus").textContent =
        "Apply or cancel pending size changes first.";
      return;
    }
    if (!editingMetadata) {
      const p = getProject();
      if (
        ($("projectDescription").value !== (p.description ?? "") ||
          $("projectTags").value !== (p.tags ?? []).join(", ") ||
          $("projectFolder").value !== (p.folder ?? "")) &&
        !confirm(
          "Discard unsaved project-detail edits? Use Save project details to keep them.",
        )
      )
        return;
    }
    busy = true;
    document.querySelector("main").inert = true;
    document.querySelector("header").inert = true;
    try {
      if (!(await save()))
        throw Error(
          "Current project could not be saved. Switching was cancelled.",
        );
      await action();
      await refresh();
      $("libraryStatus").textContent = "Project ready.";
    } catch (e) {
      $("libraryStatus").textContent = e.message;
    } finally {
      busy = false;
      document.querySelector("main").inert = false;
      document.querySelector("header").inert = false;
    }
  }
  $("newProject").onclick = () =>
    run(async () => {
      const name = $("newProjectName").value.trim();
      if (!name) throw Error("Give the new project a name.");
      await createProject(name);
      $("newProjectName").value = "";
    });
  $("projectSearch").oninput = render;
  $("projectFilter").onchange = render;
  $("refreshProjects").onclick = () =>
    refresh().catch((e) => {
      $("libraryStatus").textContent = e.message;
    });
  $("saveMetadata").onclick = () =>
    run(async () => {
      onMetadata({
        description: $("projectDescription").value,
        tags: parseTags($("projectTags").value),
        folder: normalizeFolder($("projectFolder").value),
      });
      if (!(await save())) throw Error("Project details could not be saved.");
      sync();
    }, true);
  function sync() {
    const p = getProject();
    $("projectDescription").value = p.description ?? "";
    $("projectTags").value = (p.tags ?? []).join(", ");
    $("projectFolder").value = p.folder ?? "";
    render();
  }
  async function importProject(data) {
    await run(async () => {
      await refresh();
      let id = data.id;
      const existing = entries.find((p) => p.id === id);
      if (existing) {
        const choice = await new Promise((resolve) => {
          const dialog = $("duplicateDialog");
          $("duplicateName").textContent = existing.name || "Untitled project";
          $("openExisting").onclick = () => {
            dialog.close();
            resolve("open");
          };
          $("importCopy").onclick = () => {
            dialog.close();
            resolve("copy");
          };
          $("cancelImport").onclick = () => {
            dialog.close();
            resolve("cancel");
          };
          dialog.oncancel = () => resolve("cancel");
          dialog.showModal();
        });
        if (choice === "cancel") return;
        if (choice === "open") {
          await loadProject(id);
          return;
        }
      }
      const copy = structuredClone(data);
      copy.id = crypto.randomUUID();
      delete copy._version;
      if (existing) copy.fields.name += " (copy)";
      await createProject(copy.fields.name, copy);
    });
  }
  return { refresh, sync, importProject };
}
