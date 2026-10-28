// Imported SVGs are rendered only as images and normalized to small PNG assets.
export async function importSymbol(file) {
  if (file.size > 256 * 1024)
    throw Error("Choose a symbol smaller than 256 KB.");
  if (!/\.(svg|png)$/i.test(file.name))
    throw Error("Choose an SVG or PNG file.");
  if (/\.svg$/i.test(file.name)) {
    const source = await file.text();
    const doc = new DOMParser().parseFromString(source, "image/svg+xml");
    if (
      doc.querySelector("parsererror") ||
      doc.documentElement.localName !== "svg"
    )
      throw Error("Invalid SVG.");
    const allowed = new Set([
      "svg",
      "g",
      "path",
      "rect",
      "circle",
      "ellipse",
      "line",
      "polyline",
      "polygon",
      "defs",
      "clipPath",
      "title",
      "desc",
    ]);
    for (const el of doc.querySelectorAll("*")) {
      if (!allowed.has(el.localName))
        throw Error("Use a simple SVG containing shapes only.");
      for (const attr of el.attributes) {
        if (
          /^on/i.test(attr.name) ||
          /href/i.test(attr.name) ||
          /url\s*\(|@import/i.test(attr.value)
        )
          throw Error("SVG references and active content are not supported.");
      }
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (
      !img.naturalWidth ||
      !img.naturalHeight ||
      img.naturalWidth > 4096 ||
      img.naturalHeight > 4096
    )
      throw Error("Symbol dimensions must be at most 4096 pixels.");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 96;
    const scale = 88 / Math.max(img.naturalWidth, img.naturalHeight);
    const w = img.naturalWidth * scale,
      h = img.naturalHeight * scale;
    canvas.getContext("2d").drawImage(img, (96 - w) / 2, (96 - h) / 2, w, h);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function setupDrawing(canvas, onChange) {
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#283b37";
  let active = false;
  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    return [
      ((e.clientX - r.left) * canvas.width) / r.width,
      ((e.clientY - r.top) * canvas.height) / r.height,
    ];
  };
  canvas.onpointerdown = (e) => {
    active = true;
    canvas.setPointerCapture(e.pointerId);
    ctx.beginPath();
    const [x, y] = point(e);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    onChange(canvas.toDataURL("image/png"));
  };
  canvas.onpointermove = (e) => {
    if (!active) return;
    ctx.lineTo(...point(e));
    ctx.stroke();
    onChange(canvas.toDataURL("image/png"));
  };
  canvas.onpointerup = canvas.onpointercancel = () => {
    active = false;
  };
  return () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };
}
