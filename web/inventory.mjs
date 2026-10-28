import { yarnCatalog, catalogDraft } from "./yarn-catalog.mjs";
const textFields = [
  "name",
  "brand",
  "product",
  "fiber",
  "color",
  "dye_lot",
  "category",
  "currency",
  "notes",
];
const numericFields = [
  "size_mm",
  "thickness_mm",
  "skein_grams",
  "skein_meters",
  "remaining_grams",
  "cost",
];
export function remainingLength(yarn) {
  return (yarn.remaining_grams / yarn.skein_grams) * yarn.skein_meters;
}
export function mountInventory() {
  const $ = (id) => document.getElementById(id);
  let data = null,
    editing = null,
    dirty = false,
    busy = false;
  const field = (key) => $("yarn_" + key);
  function setForm(yarn = {}) {
    editing = yarn.id ?? null;
    for (const key of [...textFields, ...numericFields])
      field(key).value = yarn[key] ?? "";
    field("shape").value = yarn.shape ?? "round";
    dirty = false;
    $("inventoryHeading").textContent = editing
      ? "Edit yarn lot"
      : "New yarn lot";
    shape();
  }
  function shape() {
    $("yarnSizeLabel").textContent =
      field("shape").value === "flat"
        ? "Width (mm, optional)"
        : "Diameter (mm, optional)";
    field("thickness_mm").disabled = field("shape").value !== "flat";
    if (field("thickness_mm").disabled) field("thickness_mm").value = "";
  }
  function draft() {
    const yarn = {
      id: editing ?? crypto.randomUUID(),
      shape: field("shape").value,
    };
    for (const key of textFields) yarn[key] = field(key).value.trim();
    yarn.currency = yarn.currency.toUpperCase();
    for (const key of numericFields)
      yarn[key] = field(key).value === "" ? null : Number(field(key).value);
    return yarn;
  }
  function collection() {
    const result = structuredClone(data);
    if (dirty) {
      const yarn = draft(),
        index = result.items.findIndex((y) => y.id === editing);
      if (index < 0) result.items.push(yarn);
      else result.items[index] = yarn;
    }
    return result;
  }
  function render() {
    const query = $("inventorySearch").value.toLowerCase();
    $("inventoryList").replaceChildren();
    for (const yarn of data?.items ?? []) {
      if (
        ![...textFields].some((key) => yarn[key].toLowerCase().includes(query))
      )
        continue;
      const row = document.createElement("div"),
        title = document.createElement("strong"),
        summary = document.createElement("p"),
        button = document.createElement("button");
      title.textContent = yarn.name;
      summary.textContent = `${yarn.brand} ${yarn.product} · ${yarn.color} · Lot ${yarn.dye_lot || "not recorded"} · ${yarn.remaining_grams} g / ${remainingLength(yarn).toFixed(1)} m remaining`;
      button.textContent = "Edit lot";
      button.type = "button";
      button.onclick = () => {
        if (busy || (dirty && !confirm("Discard unsaved yarn edits?"))) return;
        setForm(yarn);
      };
      row.append(title, summary, button);
      $("inventoryList").append(row);
    }
    $("inventoryCount").textContent =
      `${data?.items.length ?? 0} yarn lots. Owned quantities include recorded usage. Review project reservations for available stock.`;
  }
  async function load() {
    if (
      busy ||
      (dirty && !confirm("Discard unsaved yarn edits and reload inventory?"))
    )
      return;
    busy = true;
    try {
      const response = await fetch("/api/inventory");
      if (!response.ok) throw Error(await response.text());
      data = await response.json();
      setForm();
      render();
      $("inventoryStatus").textContent = "Inventory loaded.";
    } catch (e) {
      $("inventoryStatus").textContent = e.message;
    } finally {
      busy = false;
    }
  }
  $("yarnForm").oninput = () => {
    dirty = true;
  };
  field("shape").onchange = shape;
  $("yarnForm").onsubmit = async (event) => {
    event.preventDefault();
    if (busy || !data) return;
    dirty = true;
    const next = collection();
    busy = true;
    $("yarnFields").disabled = true;
    try {
      const response = await fetch("/api/inventory", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Stitchinator": "1",
          "X-Inventory-Version": String(data._version),
        },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw Error(await response.text());
      data = await response.json();
      setForm();
      render();
      $("inventoryStatus").textContent = "Yarn lot saved locally.";
    } catch (e) {
      $("inventoryStatus").textContent = e.message;
    } finally {
      busy = false;
      $("yarnFields").disabled = false;
      shape();
    }
  };
  function renderCatalog(){const query=$('catalogSearch').value.trim().toLowerCase();$('catalogYarn').replaceChildren(...yarnCatalog.filter(y=>`${y.brand} ${y.product} ${y.fiber} ${y.category}`.toLowerCase().includes(query)).map(y=>new Option(`${y.brand} ${y.product} · ${y.skein_grams} g / ${y.skein_meters} m`,y.id)));}
  $('catalogSearch').oninput=renderCatalog;renderCatalog();
  $('useCatalogYarn').onclick=()=>{if(busy)return;if(dirty){$('inventoryStatus').textContent='Save or discard the current yarn draft first.';return;}try{setForm(catalogDraft($('catalogYarn').value));dirty=true;$('inventoryStatus').textContent='Catalog copied into a new lot draft. Enter color, dye lot and owned quantity, then save. No gauge was assumed.';}catch(e){$('inventoryStatus').textContent=e.message;}};
  $("newYarn").onclick = () => {
    if (!busy && (!dirty || confirm("Discard unsaved yarn edits?"))) setForm();
  };
  $("reloadInventory").onclick = load;
  $("inventorySearch").oninput = render;
  $("downloadInventory").onclick = () => {
    if (!data) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(collection(), null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "stitchinator-inventory-draft.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  window.addEventListener("beforeunload", (event) => {
    if (dirty || busy) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  load();
  return { hasPending: () => dirty || busy, reload: load };
}
