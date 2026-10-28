import { editorView } from "./project-model.mjs";
const keys = [
  "width",
  "length",
  "swatch_width",
  "swatch_length",
  "stitches",
  "rows",
  "grams",
  "skein_grams",
  "skein_meters",
  "allowance",
];
export async function estimatePiece(project, piece) {
  if(piece.amigurumi)throw Error("Amigurumi yarn estimates need a representative measured round/stitch swatch; flat-piece area estimates are not used.");
  if (piece.sections || (piece.shape && piece.shape !== "rectangle")) {
    const response = await fetch("/api/estimate-piece", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        piece,
        allowance: Number(project.fields.allowance),
      }),
    });
    if (!response.ok) throw Error(await response.text());
    return response.json();
  }

  const view = editorView(project, piece.id);
  const response = await fetch("/api/estimate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      Object.fromEntries(keys.map((key) => [key, Number(view.fields[key])])),
    ),
  });
  if (!response.ok) throw Error(await response.text());
  const result = await response.json();
  return {
    ...result,
    grams: result.grams * piece.quantity,
    meters: result.meters * piece.quantity,
    skeins: result.skeins * piece.quantity,
  };
}
export async function estimateCollection(project) {
  const rows = await Promise.all(
    project.pieces.map(async (piece) => {
      try {
        return {
          name: piece.name,
          quantity: piece.quantity,
          result: await estimatePiece(project, piece),
        };
      } catch (error) {
        return {
          name: piece.name,
          quantity: piece.quantity,
          error: error.message,
        };
      }
    }),
  );
  return {
    rows,
    totalGrams: rows.every((row) => row.result)
      ? rows.reduce((n, row) => n + row.result.grams, 0)
      : null,
  };
}
