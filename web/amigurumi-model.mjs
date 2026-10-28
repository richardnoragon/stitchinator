// Round arithmetic and procedural geometry. Fabric mechanics are not simulated.
export const amiStitches={sc:{name:'Single crochet',symbol:'×',used:1,made:1},inc:{name:'Single crochet increase',symbol:'V',used:1,made:2},dec:{name:'Single crochet decrease',symbol:'∧',used:2,made:1},hdc:{name:'Half double crochet',symbol:'T',used:1,made:1},dc:{name:'Double crochet',symbol:'Ŧ',used:1,made:1},tr:{name:'Treble crochet',symbol:'ǂ',used:1,made:1},sl:{name:'Slip stitch',symbol:'•',used:1,made:1},ch:{name:'Chain',symbol:'○',used:0,made:1}};
export function parseRecipe(source,terminology='US') {
 if(typeof source!=='string'||source.length>8000)throw Error('Keep a round recipe within 8000 characters.');
 let text=source.replace(/\*([^*]+)\*\s*(?:x|repeat)?\s*(\d+)(?:\s*times)?/gi,'($1) x$2').toLowerCase().replace(/\b(single crochet|feste maschen?|fm)\b/g,'sc').replace(/\b(half double crochet)\b/g,'hdc').replace(/\b(double crochet)\b/g,'dc').replace(/\b(increase|zunahme|zun)\b/g,'inc').replace(/\b(decrease|abnahme|abn|sc2tog|invdec)\b/g,'dec').replace(/\b(sl\s+st)\b/g,'sl').replace(/\b(times|mal|repeat)\b/g,'x').replace(/[×*]/g,'x').replace(/[;\[\]]/g,c=>({';':',','[':'(',']':')'}[c]));
 const tokens=text.match(/\d+|[a-zäöüß]+|[(),]|\S/g)??[];let at=0,operations=0;
 const aliases=terminology==='UK'?{dc:'sc',htr:'hdc',tr:'dc',dtr:'tr'}:terminology==='DE'?{lm:'ch',km:'sl',stb:'dc'}:{};
 function sequence(depth=0){if(depth>5)throw Error('Maximum five nested repeat groups.');const result=[];
  while(at<tokens.length&&tokens[at]!==')'){
   if(tokens[at]===','){at++;continue;}
   let chunk;
   if(tokens[at]==='('){at++;chunk=sequence(depth+1);if(tokens[at++]!==')')throw Error('Close every repeat group.');let repeat=1;if(tokens[at]==='x'){at++;repeat=Number(tokens[at++]);}else if(/^\d+$/.test(tokens[at]??''))repeat=Number(tokens[at++]);if(!Number.isInteger(repeat)||repeat<1||repeat>1000)throw Error('Use repeat counts from 1 to 1000.');if(result.length+chunk.length*repeat>1000)throw Error('Maximum 1000 worked symbols per round.');for(let n=0;n<repeat;n++)result.push(...chunk);continue;}
   let count=1;if(/^\d+$/.test(tokens[at]??''))count=Number(tokens[at++]);
   let key=tokens[at++];key=aliases[key]??key;if(!amiStitches[key])throw Error(`Unsupported or ambiguous recipe token “${key??'end'}”. Use sc, inc, dec, hdc, dc, tr, sl, ch and explicit repeats.`);
   if(tokens[at]==='x'){at++;count*=Number(tokens[at++]);}
   if(!Number.isInteger(count)||count<1||count>1000||result.length+count>1000)throw Error('Use 1–1000 symbols per round.');
   result.push(...Array(count).fill(key));operations+=count;if(operations>20000)throw Error('Recipe expansion is too large.');
  }
  if(!result.length)throw Error('A round cannot be empty.');return result;
 }
 const cells=sequence();if(at!==tokens.length)throw Error('Unexpected closing repeat group.');
 return {cells,used:cells.reduce((n,k)=>n+amiStitches[k].used,0),made:cells.reduce((n,k)=>n+amiStitches[k].made,0)};
}
export function canonicalRecipe(cells){const groups=[];for(const key of cells){const last=groups.at(-1);if(last?.key===key)last.count++;else groups.push({key,count:1});}return groups.map(g=>`${g.count} ${g.key}`).join(', ');}
export function defaultAmi(rounds){return {schema:1,mode:'spiral',foundation:'magic',closeStart:true,closeEnd:true,stitchesPer10:0,roundsPer10:0,notes:'',rounds, references:[]};}
export function starterAmi(){return defaultAmi(['6 sc','6 inc','(sc, inc) x6','18 sc','18 sc','(sc, dec) x6','6 dec'].map(recipe=>({id:crypto.randomUUID(),recipe:canonicalRecipe(parseRecipe(recipe).cells),notes:'',color:'#cb765d'})));}
export function validateAmi(a){
 if(a===undefined)return;
 if(!a||a.schema!==1||!['spiral','joined'].includes(a.mode)||!['magic','chain','unspecified'].includes(a.foundation)||typeof a.closeStart!=='boolean'||typeof a.closeEnd!=='boolean'||![a.stitchesPer10,a.roundsPer10].every(n=>Number.isFinite(n)&&(n===0||n>=.01&&n<=1000))||typeof a.notes!=='string'||a.notes.length>16000||!Array.isArray(a.rounds)||!a.rounds.length||a.rounds.length>200)throw Error('Invalid amigurumi design (1–200 rounds).');
 if(a.sourceText!==undefined&&(typeof a.sourceText!=='string'||a.sourceText.length>200000))throw Error('Invalid retained import source.');
 const ids=new Set();let total=0;
 for(const r of a.rounds){if(!r||typeof r.id!=='string'||!/^[-a-zA-Z0-9]{1,64}$/.test(r.id)||ids.has(r.id)||typeof r.notes!=='string'||r.notes.length>4000||!/^#[a-f0-9]{6}$/i.test(r.color)||r.expected!==undefined&&(!Number.isInteger(r.expected)||r.expected<1||r.expected>2000))throw Error('Invalid amigurumi round.');ids.add(r.id);const count=parseRecipe(r.recipe);if(count.made>1000)throw Error('Maximum 1000 produced stitches per round.');total+=count.cells.length;}
 if(total>20000)throw Error('Maximum 20000 worked symbols per amigurumi part.');
 if(!Array.isArray(a.references)||a.references.length>4)throw Error('Maximum four references per part.');
 for(const r of a.references){if(!r||typeof r.name!=='string'||r.name.length>120||typeof r.data!=='string'||!['application/pdf','image/jpeg'].includes(r.type)||r.data.length>1450000||!new RegExp(`^data:${r.type};base64,[A-Za-z0-9+/=]+$`).test(r.data))throw Error('Invalid embedded PDF/photo reference.');}
}
export function amiCounts(a){validateAmi(a);return a.rounds.map(r=>parseRecipe(r.recipe));}
export function amiWarnings(a){const counts=amiCounts(a),out=[];if(a.mode==='joined'&&!a.notes.trim())out.push('Joined rounds: specify starting chains, turning and join placement in the part notes.');if(a.foundation==='unspecified')out.push('Specify the starting ring or foundation.');if(!a.stitchesPer10||!a.roundsPer10)out.push('Gauge missing: preview and mesh exports use uncalibrated stitch units.');counts.forEach((r,i)=>{if(i&&r.used!==counts[i-1].made)out.push(`Round ${i+1} consumes ${r.used}; round ${i} produces ${counts[i-1].made}.`);if(a.rounds[i].expected!==undefined&&r.made!==a.rounds[i].expected)out.push(`Round ${i+1}: stated ${a.rounds[i].expected}, calculated ${r.made}.`);});return out;}
export function parseAmiText(text,terminology='US') {
 if(typeof text!=='string'||text.length>200000)throw Error('Use at most 200000 source characters.');
 const parts=[],errors=[],unparsed=[];let current=null;
 const part=(name='Imported part',quantity=1)=>{const p={name,quantity,design:defaultAmi([])};p.design.foundation='unspecified';parts.push(p);return p;};
 for(const [index,raw]of text.split(/\r?\n/).entries()){
  const line=raw.trim();if(!line)continue;
  const metadata=line.match(/^(spiral|joined); foundation: (magic|chain|unspecified)\. Gauge: ([0-9.]+) stitches \/ ([0-9.]+) rounds per 10 cm\.$/);if(metadata&&current){Object.assign(current.design,{mode:metadata[1],foundation:metadata[2],stitchesPer10:Number(metadata[3]),roundsPer10:Number(metadata[4])});continue;}
  const heading=line.match(/^(?:(?:part|teil)\s*:\s*)?([\p{L}][\p{L}\s'-]{0,80}?)(?:\s*\((?:make\s*)?(\d+)\)|\s+x(\d+))?\s*:?$/iu);
  const match=line.match(/^(?:(?:rounds?|rnds?|rds?|r|runde[n]?)\.?\s*)?(\d+)\s*(?:[-–]\s*(\d+))?\s*[:.)-]\s*(.+)$/i);
  if(!match){if(/^(?:rounds?|rnds?|rds?|r|runde[n]?)\.?\s*[0-9il]/i.test(line)){errors.push(`Line ${index+1}: unrecognized round line; check the round number and colon.`);continue;}if(heading&&(/^(part|teil)\s*:/i.test(line)||heading[2]||heading[3]||/^(head|body|arm[s]?|leg[s]?|ear[s]?|tail|kopf|körper)$/i.test(heading[1]))){current=part(heading[1].trim(),Number(heading[2]??heading[3]??1));}else{unparsed.push(`Line ${index+1}: ${line}`);if(current)current.design.notes+=(current.design.notes?'\n':'')+line;}continue;}
  current??=part();const first=Number(match[1]),last=Number(match[2]??match[1]);
  if(first!==current.design.rounds.length+1||last<first||last>200){errors.push(`Line ${index+1}: rounds must be consecutive, starting at 1 (maximum 200).`);continue;}
  let recipe=match[3],expected,notes='';const note=recipe.match(/\s+[—–]\s+(.+)$/);if(note){notes=note[1];recipe=recipe.slice(0,note.index);}const total=recipe.match(/\s*[([]\s*(\d+)\s*(?:st(?:s|itches)?\.?)?\s*[)\]]\s*$/i);if(total){expected=Number(total[1]);recipe=recipe.slice(0,total.index);}
  if(/magic\s*(?:ring|circle)|\bmr\b/i.test(recipe)){current.design.foundation='magic';recipe=recipe.replace(/\b(?:in(?:to)?\s+(?:a\s+)?)?(?:magic\s*(?:ring|circle)|mr)\b/gi,'').replace(/^\s*,|,\s*$/g,'');}
  try{const cells=parseRecipe(recipe,terminology).cells;for(let n=first;n<=last;n++)current.design.rounds.push({id:crypto.randomUUID(),recipe:canonicalRecipe(cells),notes,color:'#cb765d',...(expected===undefined?{}:{expected})});}catch(e){errors.push(`Line ${index+1}: ${e.message}`);}
 }
 for(const p of parts){try{if(!Number.isInteger(p.quantity)||p.quantity<1||p.quantity>99)throw Error('Use quantities 1–99.');validateAmi(p.design);}catch(e){errors.push(`${p.name}: ${e.message}`);}}
 if(!parts.length)errors.push('No numbered rounds recognized. Example: R1: 6 sc in MR (6).');
 return {parts,errors,unparsed};
}
export function amiText(parts){return parts.map(p=>`Part: ${p.name} (make ${p.quantity})\n${p.design.mode}; foundation: ${p.design.foundation}. Gauge: ${p.design.stitchesPer10} stitches / ${p.design.roundsPer10} rounds per 10 cm.\n`+p.design.rounds.map((r,i)=>`R${i+1}: ${r.recipe} (${parseRecipe(r.recipe).made})${r.notes?' — '+r.notes:''}`).join('\n')+'\n'+p.design.notes).join('\n\n');}
export function amiProfile(a){const counts=amiCounts(a),calibrated=a.stitchesPer10&&a.roundsPer10,sw=calibrated?10/a.stitchesPer10:1,rh=calibrated?10/a.roundsPer10:1;return counts.map((r,i)=>({radius:r.made*sw/(2*Math.PI),y:(i-(counts.length-1)/2)*rh,color:a.rounds[i].color,count:r.made,rh,sw}));}
function interpolatedRadius(profile,t,design){
 if(t<0)return design.closeStart?profile[0].radius*Math.sqrt(Math.max(0,1-(t*2)**2)):profile[0].radius;
 if(t>profile.length-1)return design.closeEnd?profile.at(-1).radius*Math.sqrt(Math.max(0,1-((t-profile.length+1)*2)**2)):profile.at(-1).radius;
 const i=Math.floor(t),u=t-i,A=profile[Math.max(0,i-1)].radius,B=profile[i].radius,C=profile[Math.min(profile.length-1,i+1)].radius,D=profile[Math.min(profile.length-1,i+2)].radius;
 return Math.max(0,.5*(2*B+(-A+C)*u+(2*A-5*B+4*C-D)*u*u+(-A+3*B-3*C+D)*u*u*u));
}
export function amiSurface(a,resolution=48){const source=amiProfile(a),samples=[];if(a.closeStart)samples.push(-.375,-.25,-.125);for(let i=0;i<=(source.length-1)*3;i++)samples.push(i/3);if(a.closeEnd)samples.push(source.length-1+.125,source.length-1+.25,source.length-1+.375);const profile=samples.map(t=>({...source[Math.max(0,Math.min(source.length-1,Math.round(t)))],radius:interpolatedRadius(source,t,a),y:source[0].y+t*source[0].rh})),vertices=[],faces=[],colors=[];const step=2*Math.PI/resolution;
 profile.forEach(p=>{for(let j=0;j<resolution;j++)vertices.push([p.radius*Math.cos(j*step),p.y,p.radius*Math.sin(j*step)]);});
 for(let i=0;i<profile.length-1;i++)for(let j=0;j<resolution;j++){const k=(j+1)%resolution,a=i*resolution+j,b=i*resolution+k,c=(i+1)*resolution+j,d=(i+1)*resolution+k;faces.push([a,c,b],[b,c,d]);colors.push(profile[i].color,profile[i].color);}
 for(const [end,close]of [[0,a.closeStart],[profile.length-1,a.closeEnd]])if(close){const center=vertices.length,p=profile[end];vertices.push([0,end===0?source[0].y-source[0].rh/2:source.at(-1).y+source[0].rh/2,0]);for(let j=0;j<resolution;j++){const x=end*resolution+j,y=end*resolution+(j+1)%resolution;faces.push(end===0?[center,x,y]:[center,y,x]);colors.push(p.color);}}
 return {vertices,faces,colors};
}
export function amiYarnPaths(a){const profile=amiProfile(a),paths=[];
 for(let i=0;i<profile.length;i++){const p=profile[i],cells=parseRecipe(a.rounds[i].recipe).cells;let cursor=0;
  for(const key of cells){const made=amiStitches[key].made,base=cursor;cursor+=made;
   for(let n=0;n<made;n++){const angle=2*Math.PI*(base+n+.5)/p.count,half=Math.PI*.76/p.count;
    const local=[[-half,-.4],[0,.36],[half,-.4],[half*.8,-.5],[0,-.12],[-half*.8,-.5],[-half,-.4]];
    const curve=[];for(let k=0;k<local.length-1;k++){const A=local[(k-1+local.length-1)%(local.length-1)],B=local[k],C=local[k+1],D=local[(k+2)%(local.length-1)];for(let s=0;s<3;s++){const t=s/3;curve.push([0,1].map(axis=>.5*((2*B[axis])+(-A[axis]+C[axis])*t+(2*A[axis]-5*B[axis]+4*C[axis]-D[axis])*t*t+(-A[axis]+3*B[axis]-3*C[axis]+D[axis])*t*t*t)));}}curve.push(local[0]);
    paths.push({color:p.color,round:i,key,points:curve.map(([da,dy])=>{const t=angle+da;let r=interpolatedRadius(profile,i+dy,a);r+=p.sw*.06;return [r*Math.cos(t),p.y+dy*p.rh,r*Math.sin(t)];}),radius:p.sw*.07});
   }
  }
 }
 return paths;
}
export function yarnMesh(a){const paths=amiYarnPaths(a);if(paths.length>4000)throw Error('Detailed OBJ/STL export supports 4000 stitch loops per part. Export a smaller part or choose the surface mesh.');const vertices=[],faces=[],colors=[],sides=5;
 for(const path of paths){const points=path.points;const start=vertices.length;
  for(let i=0;i<points.length;i++){const before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)],t=after.map((v,k)=>v-before[k]),len=Math.hypot(...t)||1,u=t.map(v=>v/len),axis=Math.abs(u[1])<.9?[0,1,0]:[1,0,0],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],n=cross(u,axis),nl=Math.hypot(...n),v=n.map(x=>x/nl),w=cross(u,v);
   for(let j=0;j<sides;j++){const angle=2*Math.PI*j/sides;vertices.push(points[i].map((x,k)=>x+path.radius*(v[k]*Math.cos(angle)+w[k]*Math.sin(angle))));}
  }
  for(let i=0;i<points.length-1;i++)for(let j=0;j<sides;j++){const A=start+i*sides+j,B=start+i*sides+(j+1)%sides,C=A+sides,D=B+sides;faces.push([A,B,C],[B,D,C]);colors.push(path.color,path.color);}
  for(const [i,reverse]of [[0,true],[points.length-1,false]]){const center=vertices.length;vertices.push(points[i]);for(let j=0;j<sides;j++){const A=start+i*sides+j,B=start+i*sides+(j+1)%sides;faces.push(reverse?[center,B,A]:[center,A,B]);colors.push(path.color);}}
 }
 return {vertices,faces,colors};
}
export function meshOBJ(mesh,units){return '# Stitchinator amigurumi — procedural approximation\n# units: '+units+'\n'+mesh.vertices.map(v=>'v '+v.map(n=>n.toFixed(6)).join(' ')).join('\n')+'\n'+mesh.faces.map(f=>'f '+f.map(i=>i+1).join(' ')).join('\n')+'\n';}
export function meshSTL(mesh){const buffer=new ArrayBuffer(84+mesh.faces.length*50),view=new DataView(buffer);new Uint8Array(buffer,0,80).set(new TextEncoder().encode('Stitchinator procedural amigurumi; unit information in export filename').slice(0,80));view.setUint32(80,mesh.faces.length,true);let at=84;
 for(const face of mesh.faces){const [a,b,c]=face.map(i=>mesh.vertices[i]),u=b.map((n,k)=>n-a[k]),v=c.map((n,k)=>n-a[k]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...normal)||1;for(const p of [normal.map(n=>n/len),a,b,c])for(const n of p){view.setFloat32(at,n,true);at+=4;}view.setUint16(at,0,true);at+=2;}
 return buffer;
}
