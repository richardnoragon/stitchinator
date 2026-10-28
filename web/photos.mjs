export function validatePhotos(photos) {
  if(photos===undefined)return;
  const ids=new Set();
  if(!Array.isArray(photos)||photos.length>8)throw Error('Maximum eight project photos.');
  for(const p of photos) {
    if(!p||typeof p.id!=='string'||!/^[-a-zA-Z0-9]{1,64}$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||p.name.length>100||typeof p.data!=='string'||p.data.length>200000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(p.data))throw Error('Invalid project photo.');
    ids.add(p.id);
  }
}
export function mountPhotos({getProject,record,changed,isPending}) {
  const $=id=>document.getElementById(id);let busy=false,stamp='';
  function sync(){const photos=getProject().photos??[],sig=JSON.stringify(photos);if(sig===stamp)return;stamp=sig;
    $('projectPhotos').replaceChildren(...photos.map(p=>{const box=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption'),button=document.createElement('button');img.src=p.data;img.alt=p.name;img.style.maxWidth='240px';caption.textContent=p.name;button.textContent='Remove photo';button.onclick=()=>{if(busy||isPending()){$('photoStatus').textContent='Resolve pending changes first.';return;}record();getProject().photos=getProject().photos.filter(item=>item.id!==p.id);changed();};box.append(img,caption,button);return box;}));
  }
  $('addPhoto').onchange=async()=>{
    const file=$('addPhoto').files[0];if(!file)return;
    if(busy||isPending()){$('photoStatus').textContent='Resolve pending changes first.';$('addPhoto').value='';return;}
    busy=true;const project=getProject();let url;
    try{
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Choose a JPEG, PNG or WebP photo up to 10 MB.');
      if((project.photos??[]).length>=8)throw Error('Maximum eight project photos.');
      url=URL.createObjectURL(file);const img=new Image();img.src=url;await img.decode();
      if(img.width*img.height>40000000)throw Error('Photo is larger than 40 megapixels.');
      const canvas=document.createElement('canvas'),scale=Math.min(1,640/Math.max(img.width,img.height));canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
      const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const photo={id:crypto.randomUUID(),name:file.name.slice(0,100),data:canvas.toDataURL('image/jpeg',.7)};
      const next={...project,photos:[...(project.photos??[]),photo]};validatePhotos(next.photos);
      if(new TextEncoder().encode(JSON.stringify(next)).length>2*1024*1024)throw Error('Project is too large for another photo.');
      if(getProject()!==project||isPending())throw Error('Project changed while reading the photo; try again.');
      record();project.photos=next.photos;changed();$('photoStatus').textContent='Photo saved in the project as a compact JPEG. Undo can recover removals.';
    }catch(e){$('photoStatus').textContent=e.message;}finally{if(url)URL.revokeObjectURL(url);busy=false;$('addPhoto').value='';}
  };
  sync.hasPending=()=>busy;return sync;
}
