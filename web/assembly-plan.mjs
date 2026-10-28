import {amiProfile} from "./amigurumi-model.mjs";
// Construction relationships and geometric folds are independent of yarn estimates.
export function edgeNames(piece) {
  if(piece.amigurumi)return ['top','bottom'];
  return piece.shape === 'triangle' ? ['left','right','base'] : ['top','right','bottom','left'];
}
export function dimensions(piece) {
  if(piece.amigurumi){if(!piece.amigurumi.stitchesPer10||!piece.amigurumi.roundsPer10)return null;const p=amiProfile(piece.amigurumi);return [Math.max(...p.map(r=>r.radius))*2,p.length*p[0].rh];}
  const w=Number(piece.fields.width), h=piece.shape==='circle'?w:Number(piece.fields.length);
  return [w,h].every(n=>Number.isFinite(n)&&n>0&&n<=1000000)?[w,h]:null;
}
export function edgePoints(piece, edge) {
  const size=dimensions(piece);
  if(!size||!edgeNames(piece).includes(edge))return null;
  if(piece.amigurumi){const p=amiProfile(piece.amigurumi),ring=edge==='top'?p.at(-1):p[0];return Array.from({length:33},(_,i)=>[ring.radius*Math.cos(i*2*Math.PI/32),ring.y,ring.radius*Math.sin(i*2*Math.PI/32)]);}
  const [w,h]=size;
  if(['circle','oval'].includes(piece.shape)) {
    // Clockwise quarter arcs; top starts at upper-left diagonal.
    const start={top:-135,right:-45,bottom:45,left:135}[edge]*Math.PI/180;
    return Array.from({length:33},(_,i)=>{const a=start+i*Math.PI/64;return [w/2*Math.cos(a),h/2*Math.sin(a),0];});
  }
  const vertices=piece.shape==='triangle'
    ? {left:[[-w/2,h/2,0],[0,-h/2,0]],right:[[0,-h/2,0],[w/2,h/2,0]],base:[[w/2,h/2,0],[-w/2,h/2,0]]}
    : {top:[[-w/2,-h/2,0],[w/2,-h/2,0]],right:[[w/2,-h/2,0],[w/2,h/2,0]],bottom:[[w/2,h/2,0],[-w/2,h/2,0]],left:[[-w/2,h/2,0],[-w/2,-h/2,0]]};
  const [a,b]=vertices[edge];
  return Array.from({length:33},(_,i)=>a.map((n,j)=>n+(b[j]-n)*i/32));
}
export function edgeLength(points) {
  return points.slice(1).reduce((n,p,i)=>n+Math.hypot(...p.map((v,j)=>v-points[i][j])),0);
}
export function validateFold(fold) {
  if(fold===undefined)return;
  if(!fold||!['x','y'].includes(fold.axis)||!['positive','negative'].includes(fold.side)||!Number.isFinite(fold.position)||fold.position<1||fold.position>99||!Number.isFinite(fold.angle)||Math.abs(fold.angle)>180)
    throw Error('Invalid controlled fold.');
}
export function foldPoint(point, fold, size) {
  if(!fold||!size)return [...point];
  const axis=fold.axis==='x'?0:1, crease=(fold.position/100-.5)*size[axis];
  const d=point[axis]-crease;
  if((fold.side==='positive'&&d<0)||(fold.side==='negative'&&d>0))return [...point];
  const a=fold.angle*Math.PI/180, out=[...point];
  out[axis]=crease+d*Math.cos(a);
  out[2]=d*Math.sin(a); // Sign is explicitly a geometric hinge convention.
  return out;
}
export function poseFolds(pose) { return pose.folds ?? (pose.fold ? [pose.fold] : []); }
export function validateFolds(pose) {
  if(pose.folds===undefined)return;
  if(pose.fold!==undefined||!Array.isArray(pose.folds)||pose.folds.length>8)throw Error('Invalid fold sequence.');
  for(const f of pose.folds)validateFold(f);
  if(pose.folds.some(f=>f.axis!==pose.folds[0].axis))throw Error('Multiple folds must have parallel crease lines.');
}
export function foldSequence(point,folds,size) {
  if(!folds.length||!size)return [...point];
  const axis=folds[0].axis==='x'?0:1;
  function apply(original, count) {
    let out=[...original];
    for(let i=0;i<count;i++) {
      const f=folds[i],crease=(f.position/100-.5)*size[axis],d=original[axis]-crease;
      if((f.side==='positive'&&d<0)||(f.side==='negative'&&d>0))continue;
      const hinge=[...original];hinge[axis]=crease;hinge[2]=0;
      const center=apply(hinge,i),u=out[axis]-center[axis],z=out[2]-center[2],a=f.angle*Math.PI/180;
      out[axis]=center[axis]+u*Math.cos(a)-z*Math.sin(a);out[2]=center[2]+u*Math.sin(a)+z*Math.cos(a);
    }
    return out;
  }
  return apply(point,folds.length);
}
export function splitAtFold(polygon, fold, size) {
  if(!fold)return [polygon];
  const axis=fold.axis==='x'?0:1, crease=(fold.position/100-.5)*size[axis];
  function clip(sign) {
    const out=[];
    for(let i=0;i<polygon.length;i++) {
      const a=polygon[i],b=polygon[(i+1)%polygon.length], da=(a[axis]-crease)*sign,db=(b[axis]-crease)*sign;
      if(da>=0)out.push(a);
      if((da<0&&db>0)||(da>0&&db<0)) {const t=da/(da-db);out.push(a.map((v,j)=>v+t*(b[j]-v)));}
    }
    return out;
  }
  return [clip(1),clip(-1)].filter(p=>p.length>=3);
}
export function validateAssemblyPlan(plan) {
  if(plan===undefined)return;
  if(!plan||typeof plan.notes!=='string'||plan.notes.length>4000||!Array.isArray(plan.seams)||plan.seams.length>100)throw Error('Invalid assembly plan.');
  const ids=new Set();
  for(const seam of plan.seams) {
    if(!seam||typeof seam.id!=='string'||!/^[-a-zA-Z0-9]{1,64}$/.test(seam.id)||ids.has(seam.id)||typeof seam.name!=='string'||!seam.name.trim()||seam.name.length>100||typeof seam.note!=='string'||seam.note.length>2000||typeof seam.reverse!=='boolean'||typeof seam.basis!=='string'||seam.basis.length>10000)throw Error('Invalid assembly seam.');
    ids.add(seam.id);
    for(const e of [seam.a,seam.b])if(!e||typeof e.pieceId!=='string'||!/^[-a-zA-Z0-9]{1,64}$/.test(e.pieceId)||!Number.isInteger(e.copy)||e.copy<1||e.copy>99||!['top','right','bottom','left','base'].includes(e.edge))throw Error('Invalid seam endpoint.');
    if(JSON.stringify([seam.a.pieceId,seam.a.copy,seam.a.edge])===JSON.stringify([seam.b.pieceId,seam.b.copy,seam.b.edge]))throw Error('Choose two different edges.');
  }
}
export function seamBasis(project,seam) {
  return JSON.stringify([seam.reverse,...[seam.a,seam.b].map(e=>{
    const p=project.pieces.find(p=>p.id===e.pieceId);
    return [e,p?.shape??'rectangle',p?.fields.width,p?.fields.length,p?.assembly?.[e.copy] ? poseFolds(p.assembly[e.copy]) : []];
  })]);
}
export function seamReport(project,seam) {
  const warnings=[], ends=[seam.a,seam.b].map(e=>{
    const p=project.pieces.find(p=>p.id===e.pieceId);
    const points=p&&edgePoints(p,e.edge);
    if(!p||e.copy>p.quantity||!points)warnings.push('An endpoint is unavailable: check piece quantity, shape, edge and dimensions.');
    return {label:`${p?.name??'Missing piece'} copy ${e.copy} / ${e.edge}`,length:points?edgeLength(points):null};
  });
  if(ends.every(e=>e.length!==null)&&Math.abs(ends[0].length-ends[1].length)>0.001)warnings.push(`Edge lengths differ: ${ends[0].length.toFixed(2)} cm and ${ends[1].length.toFixed(2)} cm. Specify easing or revise the design.`);
  if(seam.basis!==seamBasis(project,seam))warnings.push('Geometry changed; review this seam and save it again.');
  return {warnings,text:`${seam.name}: ${ends[0].label} → ${ends[1].label}. ${seam.reverse?'Reverse':'Match'} edge direction. ${seam.note}`};
}
export function assemblyReport(project) {
  const plan=project.assemblyPlan, lines=[],warnings=[];
  if(plan?.notes)lines.push(plan.notes);
  for(const seam of plan?.seams??[]) {const r=seamReport(project,seam);lines.push(r.text);warnings.push(...r.warnings.map(w=>`${seam.name}: ${w}`));}
  for(const p of project.pieces)for(const [copy,pose] of Object.entries(p.assembly??{}))if(Number(copy)<=p.quantity) for(const [index,f] of poseFolds(pose).entries()) {
    lines.push(`${p.name} copy ${copy}: fold ${index+1} along ${f.axis.toUpperCase()} = ${f.position}% of the flat bounding dimension, ${f.angle}°, ${f.side} side.`);
  }
  if(lines.length)lines.push('Construction concept only: seams do not snap edges or add yarn allowance; folds do not simulate drape or thickness.');
  return {lines,warnings};
}
export function mountAssemblyPlan({getProject,getInstances,record,changed,isPending}) {
  const $=id=>document.getElementById(id);
  let identity='',selected='',noteDraft=false,seamDraft=false;
  const status=text=>{$('seamStatus').textContent=text;};
  function blocked() {if(isPending()){status('Apply/cancel other pending changes and save drafts first.');return true;}return false;}
  function endpoints(which, preferred) {
    const items=getInstances(), select=$('seam'+which), old=preferred??select.value;
    select.replaceChildren(...items.map(i=>new Option(`${i.piece.name} · copy ${i.copy}`,i.key)));
    if(items.some(i=>i.key===old))select.value=old;
    const piece=items.find(i=>i.key===select.value)?.piece, edge=$('seam'+which+'Edge'), oldEdge=edge.value;
    edge.replaceChildren(...(piece?edgeNames(piece):[]).map(e=>new Option(e,e)));
    if([...edge.options].some(o=>o.value===oldEdge))edge.value=oldEdge;
  }
  function loadForm() {
    const seam=getProject().assemblyPlan?.seams.find(s=>s.id===selected);
    $('seamName').value=seam?.name??'';$('seamNote').value=seam?.note??'';$('seamReverse').checked=seam?.reverse??true;
    for(const which of ['A','B']) {
      const e=seam?.[which.toLowerCase()];endpoints(which,e?`${e.pieceId}:${e.copy}`:undefined);
      if(e) {
        const select=$('seam'+which),key=`${e.pieceId}:${e.copy}`;
        if(![...select.options].some(o=>o.value===key))select.add(new Option('Unavailable copy (choose a replacement)',key));
        select.value=key;
        const edge=$('seam'+which+'Edge');
        if(![...edge.options].some(o=>o.value===e.edge))edge.add(new Option(`${e.edge} (unavailable)`,e.edge));
        edge.value=e.edge;
      }
    }
  }
  function sync() {
    const p=getProject();
    if(identity!==p.id){identity=p.id;selected='';noteDraft=false;seamDraft=false;}
    const seams=p.assemblyPlan?.seams??[];
    if(!seams.some(s=>s.id===selected))selected='';
    $('seamSelect').replaceChildren(new Option('New seam',''),...seams.map(s=>new Option(s.name,s.id)));$('seamSelect').value=selected;
    if(!noteDraft)$('assemblyNotes').value=p.assemblyPlan?.notes??'';
    if(!seamDraft)loadForm();
    const report=assemblyReport(p);$('assemblyPlanReport').textContent=[...report.lines,...report.warnings].join('\n');
  }
  $('assemblyNotes').oninput=()=>{noteDraft=true;};
  $('saveAssemblyNotes').onclick=()=>{
    if(blocked())return;
    const notes=$('assemblyNotes').value;if(notes.length>4000){status('Use at most 4,000 characters for assembly notes.');return;}
    record();const p=getProject();p.assemblyPlan??={notes:'',seams:[]};p.assemblyPlan.notes=notes;noteDraft=false;changed();status('Assembly notes saved to the design.');
  };
  for(const id of ['seamName','seamNote','seamReverse','seamAEdge','seamBEdge'])$(id).oninput=()=>{seamDraft=true;};
  for(const which of ['A','B'])$('seam'+which).onchange=()=>{seamDraft=true;endpoints(which);};
  $('seamSelect').onchange=()=>{
    if(seamDraft){$('seamSelect').value=selected;status('Save or discard the seam draft before selecting another seam.');return;}
    selected=$('seamSelect').value;loadForm();
  };
  $('saveSeam').onclick=()=>{
    if(blocked())return;
    const endpoint=which=>{const [pieceId,copy]=$('seam'+which).value.split(':');return {pieceId,copy:Number(copy),edge:$('seam'+which+'Edge').value};};
    const seam={id:selected||crypto.randomUUID(),name:$('seamName').value.trim(),note:$('seamNote').value,reverse:$('seamReverse').checked,a:endpoint('A'),b:endpoint('B'),basis:''};
    const p=getProject();seam.basis=seamBasis(p,seam);
    const plan=structuredClone(p.assemblyPlan??{notes:'',seams:[]});
    const index=plan.seams.findIndex(s=>s.id===seam.id);if(index<0)plan.seams.push(seam);else plan.seams[index]=seam;
    try{validateAssemblyPlan(plan);if(seamReport(p,seam).warnings.some(w=>w.startsWith('An endpoint')))throw Error('Select available copies and edges with valid dimensions.');}
    catch(e){status(e.message);return;}
    record();p.assemblyPlan=plan;selected=seam.id;seamDraft=false;changed();status('Seam saved. Check the relationship and any length warnings below.');
  };
  $('deleteSeam').onclick=()=>{
    if(blocked()||seamDraft){status('Save or discard drafts before removing a seam.');return;}
    if(!selected)return;
    record();getProject().assemblyPlan.seams=getProject().assemblyPlan.seams.filter(s=>s.id!==selected);selected='';changed();status('Seam removed. Undo can recover it.');
  };
  $('discardAssemblyDrafts').onclick=()=>{
    if((noteDraft||seamDraft)&&!confirm('Discard unsaved seam and assembly-note edits?'))return;
    noteDraft=seamDraft=false;sync();status('Unsaved assembly edits discarded.');
  };
  sync.hasDraft=()=>noteDraft||seamDraft;
  sync.selectedSeam=()=>getProject().assemblyPlan?.seams.find(s=>s.id===selected);
  window.addEventListener('beforeunload',e=>{if(sync.hasDraft()){e.preventDefault();e.returnValue='';}});
  return sync;
}
