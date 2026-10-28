import { amiSurface } from "./amigurumi-model.mjs";
import { dimensions, edgePoints, validateFold, validateFolds, poseFolds, foldSequence, foldPoint, splitAtFold, mountAssemblyPlan } from './assembly-plan.mjs';
import { widthFraction } from './shapes.mjs';
const axes = ['x', 'y', 'z', 'rx', 'ry', 'rz'];
export function validateAssembly(value) {
  if (value === undefined) return;
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 99)
    throw Error('Invalid assembly placements.');
  for (const [copy, pose] of Object.entries(value)) {
    if (!/^[1-9][0-9]?$/.test(copy) || !pose || axes.some(k => !Number.isFinite(pose[k]) || Math.abs(pose[k]) > (k.length === 1 ? 1000 : 180)))
      throw Error('Invalid assembly placement.');
    validateFold(pose.fold);
    validateFolds(pose);
  }
}
export function transformPoint([x,y,z], pose) {
  const a = pose.rx*Math.PI/180, b = pose.ry*Math.PI/180, c = pose.rz*Math.PI/180;
  [y,z] = [y*Math.cos(a)-z*Math.sin(a), y*Math.sin(a)+z*Math.cos(a)];
  [x,z] = [x*Math.cos(b)+z*Math.sin(b), -x*Math.sin(b)+z*Math.cos(b)];
  [x,y] = [x*Math.cos(c)-y*Math.sin(c), x*Math.sin(c)+y*Math.cos(c)];
  return [x+pose.x,y+pose.y,z+pose.z];
}
export function assemblyInstances(project) {
  let index = 0;
  const columns = Math.ceil(Math.sqrt(project.pieces.reduce((n,p)=>n+p.quantity,0)));
  return project.pieces.flatMap(piece => Array.from({length:piece.quantity}, (_,i) => {
    const n=index++;
    return {piece, copy:i+1, key:`${piece.id}:${i+1}`, pose:piece.assembly?.[i+1] ?? {x:Math.round(((n%columns)-(columns-1)/2)*30),y:Math.round((Math.floor(n/columns)-(columns-1)/2)*30),z:0,rx:0,ry:0,rz:0}};
  }));
}
export function alignSeam(project,seam) {
  const items=assemblyInstances(project);
  const a=items.find(i=>i.key===`${seam.a.pieceId}:${seam.a.copy}`),b=items.find(i=>i.key===`${seam.b.pieceId}:${seam.b.copy}`);
  if(a?.piece.amigurumi||b?.piece.amigurumi)throw Error('Position amigurumi rings manually; joining notes are retained. Closed rings do not use straight-edge alignment.');
  if(!a||!b||a.key===b.key)throw Error('Alignment requires two available, different piece copies.');
  const ap=edgePoints(a.piece,seam.a.edge),bp=edgePoints(b.piece,seam.b.edge);
  if(!ap||!bp)throw Error('Both edges need valid dimensions.');
  if(seam.reverse)bp.reverse();
  const local=bp.map(p=>foldSequence(p,poseFolds(b.pose),dimensions(b.piece)));
  const target=ap.map(p=>transformPoint(foldSequence(p,poseFolds(a.pose),dimensions(a.piece)),a.pose));
  const current=local.map(p=>transformPoint(p,b.pose));
  const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit=v=>{const n=Math.hypot(...v);if(n<1e-8)throw Error('Folded edge endpoints coincide; choose a different edge or fold.');return v.map(x=>x/n);};
  const u=unit(sub(current.at(-1),current[0])),v=unit(sub(target.at(-1),target[0]));
  const c=Math.max(-1,Math.min(1,dot(u,v))),k=cross(u,v),sn=Math.hypot(...k);
  const axis=sn>1e-8?k.map(x=>x/sn):c<0?unit(cross(u,Math.abs(u[0])<.9?[1,0,0]:[0,1,0])):[1,0,0];
  const rotate=p=>{const cp=cross(axis,p),d=dot(axis,p);return p.map((x,i)=>x*c+cp[i]*sn+axis[i]*d*(1-c));};
  const zero={...b.pose,x:0,y:0,z:0};
  const columns=[[1,0,0],[0,1,0],[0,0,1]].map(p=>rotate(transformPoint(p,zero)));
  const m=(r,c)=>columns[c][r],ry=Math.asin(Math.max(-1,Math.min(1,-m(2,0))));
  const rx=Math.abs(Math.cos(ry))>1e-7?Math.atan2(m(2,1),m(2,2)):0;
  const rz=Math.abs(Math.cos(ry))>1e-7?Math.atan2(m(1,0),m(0,0)):Math.atan2(-m(0,1),m(1,1));
  const pose={...b.pose,x:0,y:0,z:0,rx:rx*180/Math.PI,ry:ry*180/Math.PI,rz:rz*180/Math.PI};
  const mean=points=>[0,1,2].map(j=>(points[0][j]+points.at(-1)[j])/2);
  const offset=sub(mean(target),transformPoint(mean(local),pose));
  [pose.x,pose.y,pose.z]=offset;
  validateAssembly({[b.copy]:pose});
  const error=Math.sqrt(local.reduce((n,p,i)=>n+dot(sub(transformPoint(p,pose),target[i]),sub(transformPoint(p,pose),target[i])),0)/local.length);
  return {pieceId:b.piece.id,copy:b.copy,pose,error};
}
export function drawAssembly(canvas, project, yaw = 30, labels = true) {
  const ctx=canvas.getContext('2d'), faces=[], names=[], omitted=[], world=new Map();
  const camera={x:0,y:0,z:0,rx:-20,ry:yaw,rz:0};
  for (const item of assemblyInstances(project)) {
    const {piece,pose,copy}=item, w=Number(piece.fields.width), h=piece.shape==='circle'?w:Number(piece.fields.length);
    if (![w,h].every(n=>Number.isFinite(n)&&n>0&&n<=1000000)) {omitted.push(`${piece.name} copy ${copy}`);continue;}
    if(piece.amigurumi){
      const mesh=amiSurface(piece.amigurumi),projectPoint=p=>transformPoint(transformPoint(p,pose),camera);world.set(item.key,{piece,projectPoint});
      for(const [i,f]of mesh.faces.entries()){const pts=f.map(j=>projectPoint(mesh.vertices[j]));faces.push({pts,color:mesh.colors[i],depth:pts.reduce((n,p)=>n+p[2],0)/pts.length});}
      names.push({point:projectPoint([0,0,0]),name:`${piece.name} · ${copy}`});continue;
    }
    const local=(x,y)=>[(x-.5)*widthFraction(piece.shape??'rectangle',y)*w,(y-.5)*h,0];
    const projectPoint=p=>transformPoint(transformPoint(foldSequence(p,poseFolds(pose),[w,h]),pose),camera);
    const point=(x,y)=>projectPoint(local(x,y));
    world.set(item.key,{piece,projectPoint});
    let end=0;
    const bands=(piece.sections??[]).map(b=>({end:end+=b.percent/100,color:b.color}));
    const ys=[...new Set([...Array.from({length:17},(_,i)=>i/16),...bands.map(b=>b.end).filter(y=>y>0&&y<1)])].sort((a,b)=>a-b);
    for(let i=0;i<ys.length-1;i++) {
      const low=ys[i], high=ys[i+1], polygon=[local(0,low),local(1,low),local(1,high),local(0,high)];
      for(const part of poseFolds(pose).reduce((parts,f)=>parts.flatMap(part=>splitAtFold(part,f,[w,h])),[polygon])) {
        const pts=part.map(projectPoint);
        faces.push({pts,color:bands.find(b=>(low+high)/2<b.end)?.color??piece.fields.color,depth:pts.reduce((n,p)=>n+p[2],0)/pts.length});
      }
    }
    names.push({point:point(.5,.5),name:`${piece.name} · ${copy}`});
  }
  ctx.fillStyle='#faf8f2';ctx.fillRect(0,0,canvas.width,canvas.height);
  let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
  for(const face of faces) for(const [x,y] of face.pts) {xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}
  const scale=Math.min((canvas.width-100)/Math.max(1,xmax-xmin),(canvas.height-100)/Math.max(1,ymax-ymin));
  const screen=([x,y])=>[canvas.width/2+(x-(xmin+xmax)/2)*scale,canvas.height/2+(y-(ymin+ymax)/2)*scale];
  faces.sort((a,b)=>a.depth-b.depth);
  for(const face of faces) {ctx.beginPath();face.pts.forEach((p,i)=>i?ctx.lineTo(...screen(p)):ctx.moveTo(...screen(p)));ctx.closePath();ctx.fillStyle=face.color;ctx.fill();ctx.strokeStyle='#526657';ctx.lineWidth=.5;ctx.stroke();}
  // Relationship lines are annotations, not physical seams or constraints.
  for(const [index,seam] of (project.assemblyPlan?.seams??[]).entries()) {
    const ends=[seam.a,seam.b].map(e=>{
      const item=world.get(`${e.pieceId}:${e.copy}`),points=item&&edgePoints(item.piece,e.edge);
      return points?.map(item.projectPoint);
    });
    if(ends.some(e=>!e))continue;
    if(seam.reverse)ends[1].reverse();
    ctx.strokeStyle=['#ad302d','#2859a1','#8b438c','#92640a'][index%4];ctx.lineWidth=2;
    for(const points of ends){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...screen(p)):ctx.moveTo(...screen(p)));ctx.stroke();}
    ctx.setLineDash([5,5]);
    for(const i of [0,16,32]){ctx.beginPath();ctx.moveTo(...screen(ends[0][i]));ctx.lineTo(...screen(ends[1][i]));ctx.stroke();}
    ctx.setLineDash([]);ctx.font='13px sans-serif';ctx.fillStyle=ctx.strokeStyle;
    if(labels)ctx.fillText(seam.name,...screen(ends[0][16]));
  }
  ctx.font='14px sans-serif';ctx.fillStyle='#263b32';
  if(labels) for(const item of names) ctx.fillText(item.name,...screen(item.point));
  ctx.fillText('Assembly concept · controlled folds and seam guides · no drape simulation',20,canvas.height-15);
  return omitted;
}
export function mountAssembly({getProject,record,changed,isPending}) {
  const $=id=>document.getElementById(id);
  let identity='',selected='',stamp='',foldIndex=0,alignment=null;
  const syncPlan=mountAssemblyPlan({getProject,getInstances:()=>assemblyInstances(getProject()),record,changed,isPending:()=>isPending()||!!alignment});
  const pending=()=>isPending()||syncPlan.hasDraft()||!!alignment;
  function sync() {
    const p=getProject();
    if(identity!==p.id){identity=p.id;selected='';stamp='';alignment=null;}
    const items=assemblyInstances(p);
    if(!items.some(i=>i.key===selected)) selected=items[0]?.key;
    syncPlan();
    const sig=JSON.stringify([p.pieces,p.assemblyPlan,selected,foldIndex,alignment,$('assemblyYaw').value,$('assemblyLabels').checked]);
    if(sig===stamp)return;stamp=sig;
    $('assemblyCopy').replaceChildren(...items.map(i=>new Option(`${i.piece.name} · copy ${i.copy}`,i.key)));
    $('assemblyCopy').value=selected;
    const item=items.find(i=>i.key===selected);
    if(item) for(const key of axes){$('assembly'+key).value=item.pose[key];$('assembly'+key+'Value').textContent=item.pose[key]+(key.length===1?' cm':'°');}
    for(const id of ['foldEnabled','foldAxis','foldSide','foldPosition','foldAngle','foldSelect','addFold'])$(id).disabled=!!item?.piece.amigurumi;
    const folds=item?poseFolds(item.pose):[];
    foldIndex=Math.max(0,Math.min(foldIndex,folds.length-1));
    $('foldSelect').replaceChildren(...(folds.length?folds.map((f,i)=>new Option(`Fold ${i+1}: ${f.position}% / ${f.angle}°`,i)):[new Option('No folds','0')]));
    $('foldSelect').value=foldIndex;
    const fold=folds[foldIndex];
    $('foldEnabled').checked=!!fold;$('foldAxis').value=fold?.axis??'y';$('foldSide').value=fold?.side??'positive';
    $('foldPosition').value=fold?.position??50;$('foldAngle').value=fold?.angle??0;
    $('foldPositionValue').textContent=`${fold?.position??50}%`;$('foldAngleValue').textContent=`${fold?.angle??0}°`;
    const preview=structuredClone(p);
    if(alignment){const piece=preview.pieces.find(p=>p.id===alignment.pieceId);piece.assembly??={};piece.assembly[alignment.copy]=alignment.pose;}
    const omitted=drawAssembly($('assemblyCanvas'),preview,Number($('assemblyYaw').value),$('assemblyLabels').checked);
    $('assemblyStatus').textContent=omitted.length?`Missing dimensions; omitted: ${omitted.join(', ')}`:`${items.length} piece copies. Positions are relative to piece centers; the view fits automatically.`;
  }
  $('assemblyCopy').onchange=()=>{selected=$('assemblyCopy').value;foldIndex=0;stamp='';sync();};
  for(const key of axes) $('assembly'+key).onchange=()=>{
    const value=Number($('assembly'+key).value);
    if(pending()){stamp='';sync();$('assemblyStatus').textContent='Apply/cancel pending changes and save drafts first.';return;}
    const item=assemblyInstances(getProject()).find(i=>i.key===selected);
    record();item.piece.assembly??={};item.piece.assembly[item.copy]={...item.pose,[key]:value};changed();
  };
  $('resetAssemblyCopy').onclick=()=>{
    if(pending()){$('assemblyStatus').textContent='Apply/cancel pending changes and save drafts first.';return;}
    const item=assemblyInstances(getProject()).find(i=>i.key===selected);
    record();if(item.piece.assembly)delete item.piece.assembly[item.copy];changed();
  };
  for(const id of ['foldEnabled','foldAxis','foldSide','foldPosition','foldAngle']) $(id).onchange=()=>{
    const enabled=$('foldEnabled').checked;
    const fold={axis:$('foldAxis').value,side:$('foldSide').value,position:Number($('foldPosition').value),angle:Number($('foldAngle').value)};
    if(pending()){stamp='';sync();$('assemblyStatus').textContent='Save/discard drafts and resolve pending changes before folding.';return;}
    validateFold(fold);
    const item=assemblyInstances(getProject()).find(i=>i.key===selected);
    const folds=structuredClone(poseFolds(item.pose));
    if(enabled) {if(folds.length)folds[foldIndex]=fold;else folds.push(fold);}else folds.splice(foldIndex,1);
    try{validateFolds({folds});}catch(e){stamp='';sync();$('assemblyStatus').textContent=e.message;return;}
    record();item.piece.assembly??={};const pose={...item.pose,folds};delete pose.fold;item.piece.assembly[item.copy]=pose;changed();
  };
  $('foldSelect').onchange=()=>{foldIndex=Number($('foldSelect').value);stamp='';sync();};
  $('addFold').onclick=()=>{
    if(pending()){$('assemblyStatus').textContent='Save/discard pending edits first.';return;}
    const item=assemblyInstances(getProject()).find(i=>i.key===selected),folds=structuredClone(poseFolds(item.pose));
    if(folds.length>=8){$('assemblyStatus').textContent='Maximum eight parallel folds per copy.';return;}
    folds.push({axis:folds[0]?.axis??'y',side:'positive',position:50,angle:0});
    record();item.piece.assembly??={};const pose={...item.pose,folds};delete pose.fold;item.piece.assembly[item.copy]=pose;foldIndex=folds.length-1;changed();
  };
  $('previewAlignment').onclick=()=>{
    if(pending()){$('alignmentStatus').textContent='Save/discard other edits and cancel any existing alignment preview first.';return;}
    try{const seam=syncPlan.selectedSeam();if(!seam)throw Error('Select a saved seam first.');alignment=alignSeam(getProject(),seam);stamp='';sync();$('alignmentStatus').textContent=`Preview only: move second copy; sampled edge mismatch ${alignment.error.toFixed(3)} cm. Apply commits this pose. Other seams on that copy may move.`;}
    catch(e){$('alignmentStatus').textContent=e.message;}
  };
  $('applyAlignment').onclick=()=>{
    if(!alignment)return;
    if(isPending()||syncPlan.hasDraft()){$('alignmentStatus').textContent='Save/discard edits before applying alignment.';return;}
    record();const piece=getProject().pieces.find(p=>p.id===alignment.pieceId);piece.assembly??={};piece.assembly[alignment.copy]=alignment.pose;alignment=null;changed();$('alignmentStatus').textContent='Alignment applied. Review all seams involving this copy.';
  };
  $('cancelAlignment').onclick=()=>{alignment=null;stamp='';sync();$('alignmentStatus').textContent='Alignment preview cancelled.';};
  sync.hasDraft=()=>syncPlan.hasDraft()||!!alignment;
  for(const id of ['assemblyYaw','assemblyLabels']) $(id).oninput=sync;
  $('downloadAssembly').onclick=()=>{
    if(pending()){$('assemblyStatus').textContent='Apply/cancel pending changes and save drafts before exporting.';return;}
    sync();const a=document.createElement('a');a.download='stitchinator-assembly.png';a.href=$('assemblyCanvas').toDataURL('image/png');a.click();
  };
  return sync;
}
