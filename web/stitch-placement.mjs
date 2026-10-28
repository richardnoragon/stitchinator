// Visual placement only: counts and working order are independent.
export const anchors = ['top', 'center', 'bottom'];
export const snaps = ['center', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'free'];
export function validatePlacement(p) {
  if (!p || !anchors.includes(p.anchor) || !snaps.includes(p.snap) ||
      !Number.isFinite(p.rotation) || Math.abs(p.rotation) > 180)
    throw Error('Use a valid snap point, anchor, and orientation −180…180°.');
  if(p.snap==='free'&&(!Number.isFinite(p.dx)||!Number.isFinite(p.dy)||Math.abs(p.dx)>4000||Math.abs(p.dy)>4000))throw Error('Invalid free symbol position.');
  if(p.snapping!==undefined&&typeof p.snapping!=='boolean')throw Error('Invalid symbol snapping override.');
  if(p.orientation!==undefined&&!['free','along','perpendicular'].includes(p.orientation))throw Error('Invalid symbol orientation.');
}
export function placedSymbol(x, y, size, placement, span = size) {
  const p = placement ?? {anchor:'center',snap:'center',rotation:0};
  validatePlacement(p);
  const tx = x + (p.snap==='free'?p.dx*span:0) + (p.snap.endsWith('left') ? -span / 2 : p.snap.endsWith('right') ? span / 2 : 0);
  const ty = y + (p.snap==='free'?p.dy*span:0) + (p.snap.startsWith('top') ? -span / 2 : p.snap.startsWith('bottom') ? span / 2 : 0);
  const offset = p.anchor === 'top' ? size / 2 : p.anchor === 'bottom' ? -size / 2 : 0;
  const angle = p.rotation * Math.PI / 180;
  return {x:tx-offset*Math.sin(angle),y:ty+offset*Math.cos(angle),rotation:p.rotation};
}
export function resizePlacements(placements, oldCols, cols, rows) {
 const next={};
 for(const [key,value] of Object.entries(placements??{})) {
  const index=Number(key),row=Math.floor(index/oldCols),col=index%oldCols;
  if(row<rows&&col<cols)next[row*cols+col]=structuredClone(value);
 }
 return next;
}

export const snappingDefaults={enabled:true,vertices:true,orientation:'free'};
export function validateSnapping(settings) {
 if(!settings||typeof settings.enabled!=='boolean'||typeof settings.vertices!=='boolean'||!['free','along','perpendicular'].includes(settings.orientation))throw Error('Invalid snapping settings.');
}
export function validateGuides(guides) {
 if(!Array.isArray(guides)||guides.length>64)throw Error('Use at most 64 guides per chart.');
 for(const g of guides){
  if(!g||!['line','arc'].includes(g.kind)||!['x','y'].every(k=>Number.isFinite(g[k])&&Math.abs(g[k])<=2000))throw Error('Invalid guide.');
  if(g.kind==='line'&&(!['x2','y2'].every(k=>Number.isFinite(g[k])&&Math.abs(g[k])<=2000)||(g.x===g.x2&&g.y===g.y2)))throw Error('A line guide needs two distinct points.');
  if(g.kind==='arc'&&(!Number.isFinite(g.radius)||g.radius<=0||g.radius>2000||![g.start,g.end].every(Number.isFinite)||g.start<0||g.end>360||g.start>=g.end))throw Error('Use a positive arc radius and angles 0 ≤ start < end ≤ 360.');
 }
}
const degrees=r=>r*180/Math.PI;
const wrap=a=>((a+180)%360+360)%360-180;
export function symbolVertices(pose,size) {
 const a=pose.rotation*Math.PI/180;
 // Connection points on the symbol's longitudinal axis, not its image corners.
 return [-1,1].map(end=>({x:pose.x-end*size/2*Math.sin(a),y:pose.y+end*size/2*Math.cos(a),tangent:pose.rotation-90}));
}
export function gridGuides(cols,rows) {
 return [...Array.from({length:cols+1},(_,x)=>({kind:'line',x,y:0,x2:x,y2:rows})),...Array.from({length:rows+1},(_,y)=>({kind:'line',x:0,y,x2:cols,y2:y}))];
}
export function nearestSnap(point,guides,vertices=[],threshold=0.25) {
 const candidates=[];
 for(const g of guides){
  if(g.kind==='line'){
   const dx=g.x2-g.x,dy=g.y2-g.y,t=Math.max(0,Math.min(1,((point.x-g.x)*dx+(point.y-g.y)*dy)/(dx*dx+dy*dy)));
   candidates.push({x:g.x+t*dx,y:g.y+t*dy,tangent:degrees(Math.atan2(dy,dx)),kind:'guide'});
  }else{
   const a=((degrees(Math.atan2(point.y-g.y,point.x-g.x))%360)+360)%360;
   const angles=a>=g.start&&a<=g.end?[a]:[g.start,g.end];
   for(const angle of angles)candidates.push({x:g.x+g.radius*Math.cos(angle*Math.PI/180),y:g.y+g.radius*Math.sin(angle*Math.PI/180),tangent:angle+90,kind:'guide'});
  }
 }
 candidates.push(...vertices.map(v=>({...v,kind:'vertex'})));
 let best=null,distance=threshold;
 for(const p of candidates){const d=Math.hypot(point.x-p.x,point.y-p.y);if(d<=distance){distance=d;best=p;}}
 return best;
}
export function automaticPlacement(point,origin,size,span,anchor,rotation,settings,guides,vertices=[],bypass=false,threshold=.25) {
 validateSnapping(settings);
 const target=settings.enabled&&!bypass?nearestSnap(point,guides,settings.vertices?vertices:[],threshold):null;
 let angle=rotation;
 if(target&&settings.orientation!=='free')angle=target.tangent+(settings.orientation==='along'?90:0)+rotation;
 const placement={anchor,snap:'free',rotation:wrap(angle),dx:((target??point).x-origin.x)/span,dy:((target??point).y-origin.y)/span,snapping:settings.enabled&&!bypass,orientation:settings.orientation,target:target?.kind??'none'};
 validatePlacement(placement);return placement;
}
export function guideElements(guides,scale=1) {
 const ns='http://www.w3.org/2000/svg';
 return guides.map(g=>{
  const el=document.createElementNS(ns,g.kind==='line'?'line':'path');
  if(g.kind==='line')for(const [key,value]of Object.entries({x1:g.x*scale,y1:g.y*scale,x2:g.x2*scale,y2:g.y2*scale}))el.setAttribute(key,value);
  else {const r=g.radius*scale,start=g.start*Math.PI/180,end=g.end*Math.PI/180,cx=g.x*scale,cy=g.y*scale;
   if(g.end-g.start===360)el.setAttribute('d',`M ${cx+r} ${cy} A ${r} ${r} 0 1 1 ${cx-r} ${cy} A ${r} ${r} 0 1 1 ${cx+r} ${cy}`);
   else el.setAttribute('d',`M ${cx+r*Math.cos(start)} ${cy+r*Math.sin(start)} A ${r} ${r} 0 ${g.end-g.start>180?1:0} 1 ${cx+r*Math.cos(end)} ${cy+r*Math.sin(end)}`);
  }
  el.setAttribute('vector-effect','non-scaling-stroke');el.setAttribute('fill','none');el.setAttribute('stroke','#789baf');el.setAttribute('stroke-width',1);el.setAttribute('stroke-dasharray','4 4');el.setAttribute('pointer-events','none');return el;
 });
}
