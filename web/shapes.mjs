export const shapes = ["rectangle", "circle", "oval", "triangle"];
export function cumulativeArea(shape, y) {
  if (!shapes.includes(shape)) throw Error("Unsupported piece shape.");
  y = Math.max(0, Math.min(1, y));
  if (shape === "rectangle") return y;
  if (shape === "triangle") return (y * y) / 2;
  const t = 2 * y - 1;
  return (
    (Math.asin(t) + t * Math.sqrt(Math.max(0, 1 - t * t)) + Math.PI / 2) / 4
  );
}
export function bandArea(piece, start = 0, end = 1) {
  const shape = piece.shape ?? "rectangle";
  const w = Number(piece.fields.width),
    h = shape === "circle" ? w : Number(piece.fields.length);
  if (![w, h].every((n) => Number.isFinite(n) && n > 0 && n <= 1000000))
    throw Error("Enter positive shape dimensions.");
  return w * h * (cumulativeArea(shape, end) - cumulativeArea(shape, start));
}
export function widthFraction(shape, y) {
  return shape === "triangle"
    ? y
    : ["circle", "oval"].includes(shape)
      ? 2 * Math.sqrt(Math.max(0, y * (1 - y)))
      : 1;
}
export function mountShapes({ getPiece, record, changed, draw, isPending }) {
  const $ = (id) => document.getElementById(id);
  function labels() {
    const shape = $("pieceShape").value;
    $("shapeWidthLabel").textContent =
      shape === "circle"
        ? "Diameter (cm)"
        : shape === "triangle"
          ? "Base width (cm)"
          : "Width (cm)";
    $("length").closest("label").hidden = shape === "circle";
    $("shapeLengthLabel").textContent =
      shape === "triangle" ? "Height (cm)" : "Length (cm)";
    $("shapeInfo").textContent =
      shape === "rectangle"
        ? "Rectangle: width × length."
        : "Flat shape only. Circle uses diameter; oval uses both full axes; triangle uses base × height. Yarn is estimated from area. The sample chart does not generate shaping or round instructions.";
  }
  function sync() {
    if ($("cancelShape").disabled)
      $("pieceShape").value = getPiece().shape ?? "rectangle";
    labels();
  }
  $("pieceShape").onchange = () => {
    $("applyShape").disabled = false;
    $("cancelShape").disabled = false;
    labels();
    draw();
    $("shapeStatus").textContent =
      "Shape preview only. Apply to save the shape and update yarn requirements.";
  };
  $("applyShape").onclick = () => {
    if (isPending()) {
      $("shapeStatus").textContent =
        "Apply/cancel other pending changes and save drafts first.";
      return;
    }
    record();
    getPiece().shape = $("pieceShape").value;
    $("applyShape").disabled = true;
    $("cancelShape").disabled = true;
    changed();
    sync();
    $("shapeStatus").textContent =
      "Shape applied. Review progress and yarn reservations.";
  };
  $("cancelShape").onclick = () => {
    $("applyShape").disabled = true;
    $("cancelShape").disabled = true;
    $("pieceShape").value = getPiece().shape ?? "rectangle";
    labels();
    draw();
    $("shapeStatus").textContent = "Shape preview cancelled.";
  };
  sync.reset = () => {
    $("applyShape").disabled = true;
    $("cancelShape").disabled = true;
    sync();
  };
  return sync;
}
