export function mountPieces({
  getProject,
  activePiece,
  addPiece,
  record,
  onChange,
  syncEditor,
  isPending,
}) {
  const $ = (id) => document.getElementById(id);
  function ready(editingDetails = false) {
    if (isPending()) {
      $("pieceStatus").textContent =
        "Apply or cancel pending size changes and save project details before changing pieces.";
      return false;
    }
    const piece = activePiece(getProject());
    if (
      !editingDetails &&
      ($("pieceName").value !== piece.name ||
        Number($("pieceQuantity").value) !== piece.quantity)
    ) {
      $("pieceStatus").textContent =
        "Save piece details before switching or adding pieces.";
      return false;
    }
    return true;
  }
  function sync() {
    const p = getProject(),
      piece = activePiece(p);
    $("pieceSelect").replaceChildren(
      ...p.pieces.map(
        (part) => new Option(`${part.name} · make ${part.quantity}`, part.id),
      ),
    );
    $("pieceSelect").value = piece.id;
    $("pieceName").value = piece.name;
    $("pieceQuantity").value = piece.quantity;
    $("pieceSummary").textContent =
      `${p.pieces.length} designs · ${p.pieces.reduce((n, part) => n + part.quantity, 0)} pieces to make. Editing: ${piece.name}.`;
  }
  $("pieceSelect").onchange = () => {
    if (!ready()) {
      $("pieceSelect").value = activePiece(getProject()).id;
      return;
    }
    getProject().activePieceId = $("pieceSelect").value;
    syncEditor();
    onChange();
    sync();
    $("pieceStatus").textContent =
      "Piece selected. Other piece designs are unchanged.";
  };
  $("addPiece").onclick = () => {
    if (!ready()) return;
    try {
      const name = $("newPieceName").value.trim();
      const next = structuredClone(getProject());
      addPiece(next, name);
      record();
      addPiece(getProject(), name);
      $("newPieceName").value = "";
      syncEditor();
      onChange();
      sync();
      $("pieceStatus").textContent =
        "New blank piece added. Enter its own dimensions and swatch measurements.";
    } catch (e) {
      $("pieceStatus").textContent = e.message;
    }
  };
  $("savePiece").onclick = () => {
    if (!ready(true)) return;
    try {
      const p = getProject(),
        piece = activePiece(p),
        name = $("pieceName").value.trim(),
        quantity = Number($("pieceQuantity").value);
      if (!name || name.length > 100)
        throw Error("Enter a piece name of 1–100 characters.");
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99)
        throw Error("Quantity must be a whole number from 1 to 99.");
      if (
        p.pieces.some(
          (part) =>
            part.id !== piece.id &&
            part.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
      )
        throw Error("Choose a distinctive piece name.");
      record();
      piece.name = name;
      piece.quantity = quantity;
      onChange();
      sync();
      $("pieceStatus").textContent = "Piece details updated.";
    } catch (e) {
      $("pieceStatus").textContent = e.message;
    }
  };
  return sync;
}
