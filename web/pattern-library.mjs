export function patternMatches(pattern,query,folder='') {
 const text=[pattern.name,pattern.description??'',...(pattern.tags??[]),pattern.folder??''].join(' ').toLowerCase();
 return text.includes(query.trim().toLowerCase())&&(!folder||pattern.folder===folder||(pattern.folder??'').startsWith(folder+'/'));
}
export function importLibraryPattern(project,source,index,update=false) {
 const tile=source.patterns[index];if(!tile)throw Error('Choose a source pattern.');
 const next=structuredClone(project),sourceKey=tile.id??`legacy-${index}`,previous=next.patterns.find(p=>p.librarySource?.project===source.id&&p.librarySource?.pattern===sourceKey);
 const mapping=Object.create(null);
 for(const id of new Set(tile.cells)) {
   const definition=source.stitches.find(s=>s.id===id);if(!definition)throw Error('Source stitch is missing.');
   const old=previous?.librarySource?.mapping?.[id],target=update&&typeof old==="string"&&next.stitches.some(s=>s.id===old)?old:crypto.randomUUID();mapping[id]=target;
   const value={...structuredClone(definition),id:target},existing=next.stitches.findIndex(s=>s.id===target);
   if(existing<0)next.stitches.push(value);else next.stitches[existing]=value;
 }
 const imported={...structuredClone(tile),id:previous?.id??crypto.randomUUID(),cells:tile.cells.map(id=>mapping[id]),librarySource:{project:source.id,pattern:sourceKey,mapping}};
 if(previous)next.patterns[next.patterns.indexOf(previous)]=imported;else next.patterns.push(imported);
 if(next.stitches.length>200||next.patterns.length>100)throw Error('Import exceeds pattern or stitch limits.');
 return next;
}
export function mountPatternLibrary({getProject,setProject,record,changed,isPending,normalize}) {
 const $=id=>document.getElementById(id);let source=null,preview=null,busy=false,previewBasis="";
 const message=t=>{$('libraryPatternStatus').textContent=t;};
 $('refreshPatternSources').onclick=async()=>{if(busy)return;busy=true;try{const r=await fetch('/api/projects');if(!r.ok)throw Error(await r.text());const list=await r.json();$('patternSource').replaceChildren(...list.filter(p=>p.id!==getProject().id).map(p=>new Option(p.name||'Untitled',p.id)));message('Select a project used as a reusable pattern source.');}catch(e){message(e.message);}finally{busy=false;}};
 $('loadPatternSource').onclick=async()=>{if(busy||preview){message('Cancel the pending preview first.');return;}busy=true;const id=$('patternSource').value;try{const r=await fetch('/api/projects/'+encodeURIComponent(id));if(!r.ok)throw Error(await r.text());source=normalize(await r.json());$('sourcePattern').replaceChildren(...source.patterns.map((p,i)=>new Option(p.name,i)));message(`${source.patterns.length} patterns loaded from a saved project snapshot.`);}catch(e){source=null;message(e.message);}finally{busy=false;}};
 $('previewLibraryPattern').onclick=()=>{if(isPending()||busy){message('Resolve other pending changes first.');return;}try{if(!source)throw Error('Load a source project first.');previewBasis=JSON.stringify(getProject());preview=normalize(importLibraryPattern(getProject(),source,Number($('sourcePattern').value),$('updateLibraryDefinitions').checked));message(`Preview: ${preview.patterns.length} patterns and ${preview.stitches.length} stitch definitions after applying. `+($('updateLibraryDefinitions').checked?'Previously imported definitions will update, affecting charts that use them.':'Existing chart definitions remain unchanged; imported pattern gets independent copies.'));}catch(e){message(e.message);}};
 $('applyLibraryPattern').onclick=()=>{if(!preview)return;if(previewBasis!==JSON.stringify(getProject())){message('Project changed; cancel and preview again.');return;}if(isPending()||busy){message('Resolve pending changes first.');return;}record();setProject(preview);preview=null;changed();message('Pattern snapshot applied. Edited instructions remain intact; review any affected charts and reservations.');};
 $('cancelLibraryPattern').onclick=()=>{preview=null;message('Library preview cancelled.');};
 return {hasPending:()=>!!preview||busy};
}
