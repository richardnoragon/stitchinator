import { placedSymbol, validatePlacement, resizePlacements } from './stitch-placement.mjs';
import { rowInstructions } from './instructions.mjs';
const clone=v=>structuredClone(v);
export const patternNameKey=name=>name.trim().toLocaleLowerCase('en-US');
export function validatePicturePattern(p) {
 if(!p||typeof p.id!=='string'||!/^[-a-zA-Z0-9]{1,64}$/.test(p.id)||typeof p.name!=='string'||!p.name.trim()||[...p.name].length>100||typeof p.description!=='string'||[...p.description].length>2000||typeof p.instructions!=='string'||[...p.instructions].length>16000)throw Error('Enter a name (100 characters), description (2000), and instructions (16000) within limits.');
 if(!Number.isInteger(p.cols)||p.cols<1||p.cols>40||!Number.isInteger(p.rows)||p.rows<1||p.rows>40||!Array.isArray(p.cells)||p.cells.length!==p.cols*p.rows||!Array.isArray(p.stitches)||!p.stitches.length||p.stitches.length>200)throw Error('Use a chart of 1–40 rows/columns and 1–200 stitch definitions.');
 const ids=new Set();
 for(const s of p.stitches){
  if(!s||typeof s.id!=='string'||!/^[-a-zA-Z0-9]{1,64}$/.test(s.id)||ids.has(s.id)||typeof s.name!=='string'||!s.name.trim()||[...s.name].length>200||typeof s.abbr!=='string'||!s.abbr.trim()||[...s.abbr].length>40||typeof s.symbol!=='string'||[...s.symbol].length>8||![s.consumed,s.produced].every(n=>Number.isInteger(n)&&n>=0&&n<=1000)||(s.image!==undefined&&(typeof s.image!=='string'||s.image.length>60000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(s.image))))throw Error('Invalid pattern stitch definition.');
  ids.add(s.id);
 }
 if(p.cells.some(id=>!ids.has(id)))throw Error('The chart refers to a missing stitch.');
 if(p.photo!==undefined&&(typeof p.photo!=='string'||p.photo.length>200000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.photo)))throw Error('Use a compact JPEG photo.');
 if(p.cellPlacements!==undefined){if(!p.cellPlacements||typeof p.cellPlacements!=='object'||Array.isArray(p.cellPlacements))throw Error('Invalid chart placements.');for(const [key,value]of Object.entries(p.cellPlacements)){if(!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>=p.cells.length)throw Error('Invalid chart placement index.');validatePlacement(value);}}
 return p;
}
export function newPatternCopy(source,name,entries,id=crypto.randomUUID()) {
 const key=patternNameKey(name);
 if(key===patternNameKey(source.name)||entries.some(p=>patternNameKey(p.name)===key))throw Error('Choose a unique new name; the original pattern cannot be overwritten.');
 const copy={...clone(source),id,name:name.trim(),derivedFrom:source.id};
 return validatePicturePattern(copy);
}
export function patternFromChart(view,name='Untitled chart') {
 const used=new Set(view.cells);
 return validatePicturePattern({id:crypto.randomUUID(),name,description:view.description??'',instructions:typeof view.instructions==='string'?view.instructions:view.instructions?[...view.instructions.rows.filter(Boolean).map(r=>r.text),view.instructions.finishing??''].join('\n\n'):'Add foundation, turning and finishing instructions here.\n\n'+rowInstructions(view).map(r=>r.text).join('\n'),cols:view.cols,rows:view.rows,cells:clone(view.cells),stitches:clone(view.stitches.filter(s=>used.has(s.id))),...(view.photo?{photo:view.photo}:{}),...(view.cellPlacements?{cellPlacements:clone(view.cellPlacements)}:{})});
}
export function addPicturePattern(project,entry,idFactory=()=>crypto.randomUUID()) {
 validatePicturePattern(entry);
 if(project.patterns.some(p=>p.pictureSource===entry.id))throw Error('This pattern already has a reusable copy in this project.');
 const next=clone(project),mapping=new Map();
 for(const s of entry.stitches){const id=idFactory();mapping.set(s.id,id);next.stitches.push({...clone(s),id});}
 const {stitches,...tile}=clone(entry);
 next.patterns.push({...tile,id:idFactory(),pictureSource:entry.id,cells:entry.cells.map(id=>mapping.get(id))});
 if(next.patterns.length>100||next.stitches.length>200)throw Error('This copy would exceed the project’s pattern or stitch limits.');
 return next;
}
export function patternStitchList(entry) {
 const counts=new Map();for(const id of entry.cells)counts.set(id,(counts.get(id)??0)+1);
 return entry.stitches.filter(s=>counts.has(s.id)).map(s=>({...s,count:counts.get(s.id)}));
}
function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
function patternChart(entry,onPaint=null,selected='') {
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),defs=new Map(entry.stitches.map(s=>[s.id,s]));
 svg.setAttribute('role',onPaint?'group':'img');svg.setAttribute('aria-label',`${entry.name}: ${entry.cols} columns by ${entry.rows} rows, row 1 at bottom`);
 let left=-.5,top=-.25,right=entry.cols+.25,bottom=entry.rows+.25;
 for(let row=0;row<entry.rows;row++)for(let col=0;col<entry.cols;col++){
  const index=row*entry.cols+col,s=defs.get(entry.cells[index]),pose=placedSymbol(col+.5,entry.rows-row-.5,.7,entry.cellPlacements?.[index],1);
  left=Math.min(left,pose.x-.5);right=Math.max(right,pose.x+.5);top=Math.min(top,pose.y-.5);bottom=Math.max(bottom,pose.y+.5);
  const g=document.createElementNS(ns,'g'),rect=document.createElementNS(ns,'rect');
  for(const [key,value]of Object.entries({x:col,y:entry.rows-row-1,width:1,height:1,fill:'#fffdf8',stroke:'#c6d0c7','stroke-width':.025}))rect.setAttribute(key,value);g.append(rect);
  const glyph=document.createElementNS(ns,s.image?'image':'text');
  if(s.image){glyph.setAttribute('href',s.image);for(const [k,v]of Object.entries({x:pose.x-.35,y:pose.y-.35,width:.7,height:.7}))glyph.setAttribute(k,v);}
  else{glyph.textContent=s.symbol;for(const[k,v]of Object.entries({x:pose.x,y:pose.y,'font-size':.65,'text-anchor':'middle','dominant-baseline':'central',fill:'#283b37'}))glyph.setAttribute(k,v);}
  glyph.setAttribute('transform',`rotate(${pose.rotation} ${pose.x} ${pose.y})`);glyph.setAttribute('pointer-events','none');g.append(glyph);
  if(onPaint){g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('data-picture-cell',index);g.setAttribute('aria-label',`Pattern row ${row+1}, column ${col+1}: ${s.name}`);const paint=()=>onPaint(index,selected);g.onclick=paint;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();paint();}};}
  svg.append(g);
 }
 svg.setAttribute('viewBox',`${left} ${top} ${right-left} ${bottom-top}`);
 return svg;
}
async function photoData(file) {
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Choose a JPEG, PNG or WebP photo up to 10 MB.');
 const url=URL.createObjectURL(file);
 try{const image=new Image();image.src=url;await image.decode();if(!image.width||!image.height||image.width*image.height>40000000)throw Error('Use a photo up to 40 megapixels.');
  const canvas=document.createElement('canvas'),scale=Math.min(1,640/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const c=canvas.getContext('2d');c.fillStyle='white';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(image,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',.7);if(data.length>200000)throw Error('Photo is too detailed; choose a smaller photo.');return data;
 }finally{URL.revokeObjectURL(url);}
}
export function mountPictureLibrary({getProject,getView,setProject,record,changed,isPending,normalize}) {
 const $=id=>document.getElementById(id);let entries=[],version=null,draft=null,source=null,selected='',busy=false,dirty=false,request=0;
 const message=t=>{$('pictureLibraryStatus').textContent=t;},draftMessage=t=>{$('pictureDraftStatus').textContent=t;};
 function cards(){
  const query=$('pictureLibrarySearch').value.trim().toLowerCase();
  const visible=entries.filter(p=>[p.name,p.description,p.instructions,...p.stitches.map(s=>s.name)].join(' ').toLowerCase().includes(query));
  $('pictureLibraryCards').replaceChildren(...visible.map(p=>{
   const card=el('article');card.className='picturePatternCard';card.dataset.patternId=p.id;card.append(el('h3',p.name),patternChart(p));
   if(p.photo){const img=el('img');img.src=p.photo;img.alt=`Finished fabric: ${p.name}`;img.className='pictureFabricPhoto';card.append(img);}
   card.append(el('p',p.description),el('p',`Stitches: ${patternStitchList(p).map(s=>`${s.name} (${s.abbr}) × ${s.count}`).join('; ')}`));
   const details=el('details'),summary=el('summary','How to crochet');details.append(summary,el('p',p.instructions));details.className='pictureInstructions';card.append(details);
   const edit=el('button','View / edit a new copy');edit.onclick=()=>open(p);
   const use=el('button','Add to project patterns');use.onclick=()=>{
    if(isPending()||draft||busy){message('Resolve pending changes first.');return;}
    try{const next=normalize(addPicturePattern(getProject(),p));if(new TextEncoder().encode(JSON.stringify(next)).length>2*1024*1024)throw Error('This copy would exceed the 2 MB project limit.');record();setProject(next);changed();message(`“${p.name}” copied into this project’s reusable patterns. Use Repeat to place it on your chart.`);}catch(e){message(e.message);}
   };
   card.append(edit,use);return card;
  }));
  $('pictureLibraryCount').textContent=`${visible.length} of ${entries.length} patterns. Starter recipes use US terms. Row 1 is at the bottom; foundation and turning chains are described separately.`;
 }
 async function refresh(){
  const token=++request;
  try{const response=await fetch('/api/patterns');if(!response.ok)throw Error(await response.text());const data=await response.json();if(token!==request)return;
   const list=[...data.starters,...data.entries];for(const p of list)validatePicturePattern(p);entries=list;version=data._version;cards();message('Shared library loaded. Saved originals are read-only; edits must be saved with a unique new name.');return true;
  }catch(e){message(e.message);if(draft)draftMessage(e.message);return false;}
 }
 function readFields(){if(!draft)return;draft.name=$('pictureNewName').value;draft.description=$('pictureDescription').value;draft.instructions=$('pictureInstructions').value;}
 function renderDraft(){
  if(!draft)return;
  if(!draft.stitches.some(s=>s.id===selected))selected=draft.stitches[0].id;
  $('pictureDraftStitch').replaceChildren(...draft.stitches.map(s=>new Option(`${s.name} (${s.abbr})`,s.id)));$('pictureDraftStitch').value=selected;
  $('pictureDraftChart').replaceChildren(patternChart(draft,(index,id)=>{readFields();draft.cells[index]=id;dirty=true;renderDraft();$('pictureDraftChart').querySelector(`[data-picture-cell="${index}"]`)?.focus();},selected));
  $('pictureDraftLegend').textContent=patternStitchList(draft).map(s=>`${s.name} (${s.abbr}): ${s.count} symbol slots; consumes ${s.consumed}, produces ${s.produced} each`).join('\n');
  $('pictureDraftPhoto').replaceChildren();if(draft.photo){const img=el('img');img.src=draft.photo;img.alt='Draft finished-fabric photo';$('pictureDraftPhoto').append(img);}
  $('pictureProjectStitch').replaceChildren(...getProject().stitches.map(s=>new Option(`${s.name} (${s.abbr})`,s.id)));
 }
 function open(p){
  if(draft||busy||isPending()){message('Resolve pending edits before opening a pattern draft.');return;}
  source=clone(p);draft=clone(p);selected=draft.stitches[0].id;dirty=false;
  $('pictureSourceName').textContent=`Source: ${p.name}. The original will remain unchanged.`;
  $('pictureNewName').value='';$('pictureDescription').value=p.description;$('pictureInstructions').value=p.instructions;$('pictureDraftCols').value=p.cols;$('pictureDraftRows').value=p.rows;
  draftMessage('Edit the chart and recipe, then enter a unique new name. Saving always creates a separate pattern.');renderDraft();$('picturePatternDialog').showModal();
 }
 function cancel(){if(busy){draftMessage('Wait for the current save or photo import.');return;}if(dirty&&!confirm('Discard this unsaved pattern copy?'))return;draft=null;source=null;dirty=false;$('picturePatternDialog').close();}
 $('picturePatternDialog').addEventListener('cancel',e=>{e.preventDefault();cancel();});
 $('cancelPictureDraft').onclick=cancel;
 for(const id of ['pictureNewName','pictureDescription','pictureInstructions'])$(id).oninput=()=>{dirty=true;};
 $('pictureDraftStitch').onchange=()=>{selected=$('pictureDraftStitch').value;readFields();renderDraft();};
 $('resizePictureDraft').onclick=()=>{
  readFields();const cols=Number($('pictureDraftCols').value),rows=Number($('pictureDraftRows').value);
  if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1||cols>40||rows>40){draftMessage('Use 1–40 chart columns and rows.');return;}
  draft.cellPlacements=resizePlacements(draft.cellPlacements,draft.cols,cols,rows);draft.cells=Array.from({length:cols*rows},(_,i)=>Math.floor(i/cols)<draft.rows&&i%cols<draft.cols?draft.cells[Math.floor(i/cols)*draft.cols+i%cols]:selected);draft.cols=cols;draft.rows=rows;dirty=true;renderDraft();draftMessage('Draft chart resized. Review the crochet instructions to match.');
 };
 $('addPictureProjectStitch').onclick=()=>{readFields();const s=getProject().stitches.find(s=>s.id===$('pictureProjectStitch').value);if(!s)return;
  if(draft.stitches.length>=200){draftMessage('Maximum 200 draft stitch definitions.');return;}
  const copy={...clone(s),id:crypto.randomUUID()};draft.stitches.push(copy);selected=copy.id;dirty=true;renderDraft();
 };
 $('picturePhotoInput').onchange=async()=>{
  const file=$('picturePhotoInput').files[0];if(!file||busy||!draft)return;busy=true;$("pictureDraftFields").disabled=true;const basis=draft;
  try{const photo=await photoData(file);if(draft!==basis)throw Error('Draft changed; choose the photo again.');draft.photo=photo;dirty=true;renderDraft();draftMessage('Photo added to this draft. Save under a new name to keep it.');}catch(e){draftMessage(e.message);}finally{busy=false;$("pictureDraftFields").disabled=false;$('picturePhotoInput').value='';}
 };
 $('removePicturePhoto').onclick=()=>{if(!draft||busy)return;delete draft.photo;dirty=true;renderDraft();};
 $('savePictureDraft').onclick=async()=>{
  if(!draft||busy)return;readFields();
  let copy;try{if(version===null)throw Error('Reload the library list before saving.');copy=newPatternCopy({...draft,name:source.name},draft.name,entries);if(new TextEncoder().encode(JSON.stringify(copy)).length>2*1024*1024)throw Error('Pattern exceeds the 2 MB save limit.');}catch(e){draftMessage(e.message);return;}
  busy=true;$("pictureDraftFields").disabled=true;
  try{const response=await fetch('/api/patterns',{method:'POST',headers:{'Content-Type':'application/json','X-Stitchinator':'1','X-Pattern-Version':String(version)},body:JSON.stringify(copy)});if(!response.ok)throw Error(await response.text());const data=await response.json();++request;version=data._version;entries=[...data.starters,...data.entries];draft=null;source=null;dirty=false;$('picturePatternDialog').close();cards();message(`“${copy.name}” saved to the shared library. The original is unchanged.`);}catch(e){draftMessage(e.message);}finally{busy=false;$("pictureDraftFields").disabled=false;}
 };
 $('pictureLibrarySearch').oninput=cards;$('refreshPictureLibrary').onclick=refresh;$('refreshPictureDraftLibrary').onclick=async()=>{const ok=await refresh();if(ok&&draft)draftMessage('Library list reloaded. Your draft is retained; try saving with a unique new name.');};
 $('capturePicturePattern').onclick=()=>{try{if(getProject().craft==='knitting')throw Error('Choose a crochet project to capture a crochet library pattern.');open(patternFromChart(getView(),getProject().fields.name||'Current chart'));}catch(e){message(e.message);}};
 window.addEventListener('beforeunload',e=>{if(draft||busy){e.preventDefault();e.returnValue='';}});
 refresh();return {hasPending:()=>!!draft||busy,refresh,captureLocal:(tile,stitches)=>{try{open(patternFromChart({...tile,stitches},tile.name));}catch(e){message(e.message);}}};
}
