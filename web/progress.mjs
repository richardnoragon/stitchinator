import {parseRecipe,amiStitches} from "./amigurumi-model.mjs";
// Operational progress stays outside design revisions, keyed by stable piece/copy identity.
export function designBasis(project, piece) {
  const basis = [
    piece.fields,
    piece.cols,
    piece.rows,
    piece.cells,
    project.stitches,
    piece.instructions,
  ];
  if (piece.sections) basis.push(piece.sections);
  if (piece.shape && piece.shape !== "rectangle") basis.push(piece.shape);
  if (piece.roundChart) basis.push(piece.roundChart);
  if (piece.amigurumi) basis.push(piece.amigurumi);
  if(project.craft)basis.push(project.craft,piece.knittingMode);
  return JSON.stringify(basis);
}
export function validateProgress(progress) {
  if (progress === undefined) return;
  if (
    !progress ||
    typeof progress !== "object" ||
    Array.isArray(progress) ||
    Object.keys(progress).length > 3200
  )
    throw Error("Invalid progress records.");
  for (const [key, value] of Object.entries(progress)) {
    if (
      !/^[-a-zA-Z0-9]{1,64}:[1-9][0-9]?$/.test(key) ||
      !value ||
      !Number.isInteger(value.completed) ||
      value.completed < 0 ||
      value.completed > 1000000 ||
      typeof value.note !== "string" ||
      value.note.length > 2000 ||
      typeof value.basis !== "string" ||
      value.basis.length > 2000000
    )
      throw Error("Invalid progress record.");
  }
}
export function saveProgress(project, piece, copy, completed, note) {
  if (!Number.isInteger(copy) || copy < 1 || copy > piece.quantity)
    throw Error("Select a current copy.");
  const value = { completed, note, basis: designBasis(project, piece) };
  const progress = { ...project.progress, [`${piece.id}:${copy}`]: value };
  validateProgress(progress);
  project.progress = progress;
}
export function mountProgress({ getProject, activePiece, changed, isPending }) {
  const $ = (id) => document.getElementById(id);
  let displayed = "",
    currentIdentity = "",
    copy = 1;
  function sync() {
    const p = getProject(),
      piece = activePiece(p);
    const identity = `${p.id}:${piece.id}`;
    if (currentIdentity !== identity) {
      copy = 1;
      currentIdentity = identity;
    }
    copy = Math.min(copy, piece.quantity);
    const key = `${piece.id}:${copy}`,
      value = p.progress?.[key];
    const stamp = JSON.stringify([identity, copy, piece.quantity, value]);
    if (displayed !== stamp) {
      $("progressCopy").replaceChildren(
        ...Array.from(
          { length: piece.quantity },
          (_, i) => new Option(`Copy ${i + 1}`, i + 1),
        ),
      );
      $("progressCopy").value = copy;
      $("completedRows").value = value?.completed ?? 0;
      $("stoppingNote").value = value?.note ?? "";
      displayed = stamp;
    }
    const needsReview = value && value.basis !== designBasis(p, piece);
    $("progressWarning").textContent = needsReview
      ? "Design changed since this copy’s progress was recorded. Review your work, then retain or reset its progress."
      : "";
    $("retainProgress").hidden = !needsReview;
    const inactive = Object.keys(p.progress ?? {}).filter(
      (k) =>
        !p.pieces.some(
          (part) =>
            k.startsWith(part.id + ":") &&
            Number(k.split(":")[1]) <= part.quantity,
        ),
    );
    $("inactiveProgress").textContent = inactive.length
      ? `${inactive.length} progress records for removed pieces/copies are retained. Restoring their design or quantity makes them available again.`
      : "";
  }
  $("progressCopy").onchange = () => {
    copy = Number($("progressCopy").value);
    displayed = "";
    sync();
  };
  function commit(reset = false) {
    if (isPending()) {
      $("progressStatus").textContent =
        "Apply or cancel design edits and save piece details first.";
      return;
    }
    try {
      if (
        reset &&
        !confirm("Reset completed rows and stopping notes for this copy?")
      )
        return;
      const p = getProject(),
        piece = activePiece(p);
      saveProgress(
        p,
        piece,
        copy,
        reset ? 0 : Number($("completedRows").value),
        reset ? "" : $("stoppingNote").value,
      );
      changed();
      sync();
      $("progressStatus").textContent = "Progress saved for this copy.";
    } catch (e) {
      $("progressStatus").textContent = e.message;
    }
  }
  // Save drafts immediately so switching designs cannot discard a stopping note.
  $("completedRows").onchange = () => commit();
  $("stoppingNote").onchange = () => commit();
  $("saveProgress").onclick = () => commit();
  $("retainProgress").onclick = () => commit();
  $("resetProgress").onclick = () => commit(true);
  let workingRow=0;
  function working(){
    const p=getProject(),piece=activePiece(p),radial=$('workingLayout').value==='radial'&&piece.roundChart&&p.craft!=='knitting';
    const amigurumi=piece.amigurumi&&$('workingLayout').value==='amigurumi';
    const rows=amigurumi?piece.amigurumi.rounds.map(r=>parseRecipe(r.recipe).cells):radial?piece.roundChart.rounds.map(r=>r.cells):Array.from({length:piece.rows},(_,i)=>piece.cells.slice(i*piece.cols,(i+1)*piece.cols));
    workingRow=Math.max(0,Math.min(workingRow,rows.length-1));
    $('workingTitle').textContent=`${piece.name} · copy ${copy} · ${amigurumi||radial||piece.knittingMode==='round'?'round':'row'} ${workingRow+1} of ${rows.length} ${amigurumi?'in amigurumi part':'in sample'}`;
    const defs=amigurumi?new Map(Object.entries(amiStitches).map(([id,s])=>[id,s])):new Map(p.stitches.map(s=>[s.id,s]));
    $('workingChart').replaceChildren(...rows.map((cells,i)=>{const row=document.createElement('div');row.style.background=i===workingRow?'#fff0ac':'transparent';row.style.padding='4px';row.setAttribute('aria-current',String(i===workingRow));const label=document.createElement('strong');label.textContent=`${i+1}: `;row.append(label);for(const id of cells){const d=defs.get(id),span=document.createElement('span');span.style.display='inline-block';span.style.width='40px';span.style.fontSize='30px';span.title=d.name;if(d.image){const img=new Image();img.src=d.image;img.alt=d.name;img.width=32;img.height=32;span.append(img);}else span.textContent=d.symbol;row.append(span);}return row;}).reverse());
    const saved=amigurumi?piece.amigurumi.rounds[workingRow].recipe+' — '+piece.amigurumi.rounds[workingRow].notes:radial?piece.roundChart.rounds[workingRow].instruction?.text:piece.instructions?.rows?.[workingRow]?.text;
    $('workingInstruction').textContent=saved??'No saved instruction for this sample row/round.';
    $('workingChart').querySelector('[aria-current="true"]')?.scrollIntoView({block:'nearest'});
  }
  $('openWorking').onclick=()=>{if(isPending()){$('progressStatus').textContent='Resolve pending design changes first.';return;}if(activePiece(getProject()).amigurumi)$('workingLayout').value='amigurumi';else if($('workingLayout').value==='amigurumi')$('workingLayout').value='grid';workingRow=Math.min(Number($('completedRows').value)||0,(activePiece(getProject()).amigurumi?.rounds.length??activePiece(getProject()).rows)-1);$('workingDialog').showModal();working();};
  $('workingPrev').onclick=()=>{workingRow--;working();};$('workingNext').onclick=()=>{workingRow++;working();};$('workingLayout').onchange=()=>{workingRow=0;working();};
  $('closeWorking').onclick=()=>$('workingDialog').close();
  return sync;
}
