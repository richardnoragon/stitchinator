// Names only; instruction prose stays in US English. Sources are recorded in USER_GUIDE.
const labels={
 ch:{US:['Chain','ch'],UK:['Chain','ch'],DE:['Luftmasche','Lm']},
 sl:{US:['Slip stitch','sl st'],UK:['Slip stitch','sl st'],DE:['Kettmasche','Kett-M']},
 sc:{US:['Single crochet','sc'],UK:['Double crochet','dc'],DE:['Feste Masche','fM']},
 hdc:{US:['Half double crochet','hdc'],UK:['Half treble','htr'],DE:['Halb-Stäbchen','H-Stb']},
 dc:{US:['Double crochet','dc'],UK:['Treble','tr'],DE:['Stäbchen','Stb']},
 tr:{US:['Treble crochet','tr'],UK:['Double treble','dtr'],DE:['Doppelstäbchen','D-Stb']}
};
const extra = [
 ['dtr','Tall stitches','Double treble crochet','dtr','Dreifachstäbchen','Dreif-Stb',1,1],
 ['picot3','Short stitches / picots','Chain-3 picot; slip stitch into first chain','picot3','Pikot aus 3 Luftmaschen','Pikot3',0,0],
 ['turn1','Turning chains','Turning chain 1 (not counted)','tch1','Wendeluftmasche (nicht gezählt)','W-Lm1',0,0],
 ['turn2','Turning chains','Turning chain 2 (counts as one stitch)','tch2','2 Wendeluftmaschen (als 1 Masche gezählt)','W-Lm2',0,1],
 ['turn3','Turning chains','Turning chain 3 (counts as one stitch)','tch3','3 Wendeluftmaschen (als 1 Masche gezählt)','W-Lm3',0,1],
 ['sc3tog','Clusters / shaping','3 single crochet together','sc3tog','3 feste Maschen zusammen','3fMzus',3,1],
 ['dc2tog','Clusters / shaping','2 double crochet together','dc2tog','2 Stäbchen zusammen','2Stbzus',2,1],
 ['dc3tog','Clusters / shaping','3 double crochet together','dc3tog','3 Stäbchen zusammen','3Stbzus',3,1],
 ['puff3','Clusters / shaping','3 half double crochet puff in one stitch','puff3','Büschel aus 3 halben Stäbchen','Büschel3',1,1],
 ['popcorn5','Clusters / shaping','5 double crochet popcorn in one stitch','pop5','Popcorn aus 5 Stäbchen','Pop5',1,1],
 ['fpdc','Relief / complex','Front post double crochet','FPdc','Reliefstäbchen von vorne','RStbv',1,1],
 ['bpdc','Relief / complex','Back post double crochet','BPdc','Reliefstäbchen von hinten','RStbh',1,1],
 ['fptr','Relief / complex','Front post treble crochet','FPtr','Reliefdoppelstäbchen von vorne','RDStbv',1,1],
 ['bptr','Relief / complex','Back post treble crochet','BPtr','Reliefdoppelstäbchen von hinten','RDStbh',1,1],
 ['scblo','Relief / complex','Single crochet in back loop only','scBLO','Feste Masche ins hintere Maschenglied','fMh',1,1],
 ['scflo','Relief / complex','Single crochet in front loop only','scFLO','Feste Masche ins vordere Maschenglied','fMv',1,1],
];
for (const [key, ,name,abbr,de,dabbr] of extra) {
 const ukName=name.replace(/half double crochet|double treble crochet|treble crochet|double crochet|single crochet/g, text=>({'half double crochet':'half treble','double treble crochet':'triple treble crochet','treble crochet':'double treble crochet','double crochet':'treble crochet','single crochet':'double crochet'}[text]));
 const ukAbbr=abbr.replace(/dtr|tr|dc|sc/g,text=>({dtr:'ttr',tr:'dtr',dc:'tr',sc:'dc'}[text]));
 labels[key]={US:[name,abbr],UK:[ukName,ukAbbr],DE:[de,dabbr]};
}
export const crochetPresets=[
 ['ch','○',0,1],['sl','•',1,1],['sc','×',1,1],['hdc','T',1,1],['dc','Ŧ',1,1],['tr','ǂ',1,1],
 ['inc','V',1,2],['dec','∧',2,1],['cluster','♧',1,1],['shell','♨',1,5],['space','◯',0,1]
].map(([termKey,symbol,consumed,produced])=>({termKey,symbol,consumed,produced,category:['ch','space'].includes(termKey)?'Base':['sl','sc'].includes(termKey)?'Short stitches / picots': ['hdc','dc','tr'].includes(termKey)?'Tall stitches':'Clusters / shaping'})).concat(extra.map(([termKey,category,,symbol,,,consumed,produced])=>({termKey,category,symbol,consumed,produced})));
export function stitchLabel(key,term='US') {
 if(labels[key])return labels[key][term];
 const sc=labels.sc[term],dc=labels.dc[term],ch=labels.ch[term];
 return {inc:[`2 × ${sc[0]} in one stitch`,`${sc[1]} inc`],dec:[`2 ${sc[0]} together`,`${sc[1]}2tog`],cluster:[`3 unfinished ${dc[0]} closed together in one stitch`,`${dc[1]} cluster3`],shell:[`5 × ${dc[0]} in one stitch`,`${dc[1]} shell5`],space:[`1 ${ch[0]} space`,`${ch[1]}-sp`]}[key];
}
export function terminologyChange(project,term,add=false) {
 if(!['US','UK','DE'].includes(term))throw Error('Unsupported crochet terminology.');
 const next=structuredClone(project);next.terminology=term;
 for(const stitch of next.stitches) {
   if(!stitch.termKey&&['sc','ch'].includes(stitch.id)&&stitch.name===labels[stitch.id].US[0]&&stitch.abbr===stitch.id)stitch.termKey=stitch.id;
   const label=stitchLabel(stitch.termKey,term);if(label)[stitch.name,stitch.abbr]=label;
 }
 if(add)for(const preset of crochetPresets)if(!next.stitches.some(s=>s.termKey===preset.termKey)) {
   const [name,abbr]=stitchLabel(preset.termKey,term);next.stitches.push({...preset,image:presetImage(preset.termKey),id:crypto.randomUUID(),name,abbr});
 }
 if(next.stitches.length>200)throw Error('Stitch library would exceed 200 definitions.');
 return next;
}
// Draw local chart symbols rather than relying on font-specific glyphs.
function presetImage(key) {
 if(typeof document==='undefined')return undefined;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
 const c=canvas.getContext('2d');c.strokeStyle='#283b37';c.fillStyle='#283b37';c.lineWidth=3;c.lineCap='round';
 const line=(x,y,X,Y)=>{c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.stroke();};
 const oval=(x,y,rx,ry)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.stroke();};
 const tall=(x,bars=1,base=80,top=16)=>{line(x,base,x,top);line(x-10,top,x+10,top);for(let n=0;n<bars;n++)line(x-7,top+15+n*12,x+7,top+7+n*12);};
 if(['ch','space'].includes(key))oval(48,48,24,14);
 else if(key==='sl'){c.beginPath();c.arc(48,48,5,0,Math.PI*2);c.fill();}
 else if(['sc','scblo','scflo'].includes(key)){line(30,30,66,66);line(30,66,66,30);if(key!=='sc') {c.beginPath();c.arc(48,79,12,key==='scblo'?Math.PI:0,key==='scblo'?2*Math.PI:Math.PI);c.stroke();}}
 else if(['hdc','dc','tr','dtr','fpdc','bpdc','fptr','bptr'].includes(key)){
  tall(48,{hdc:0,dc:1,tr:2,dtr:3,fpdc:1,bpdc:1,fptr:2,bptr:2}[key]);
  if(key.startsWith('fp')||key.startsWith('bp')){line(48,80,key.startsWith('fp')?30:66,80);oval(key.startsWith('fp')?30:66,70,9,10);}
 }else if(key.startsWith('turn')){const count=Number(key.at(-1));for(let i=0;i<count;i++)oval(48,78-i*23,9,10);}
 else if(key==='picot3'){oval(30,60,8,10);oval(48,37,8,10);oval(66,60,8,10);line(30,72,66,72);}
 else if(['inc','shell'].includes(key)){const count=key==='inc'?2:5;for(let i=0;i<count;i++){const x=20+i*56/(count-1);line(48,80,x,18);line(x-6,18,x+6,18);if(key==='shell')line(x-4,38,x+7,30);}}
 else {const count=['sc3tog','dc3tog'].includes(key)?3: key==='dec'||key==='dc2tog'?2:key==='popcorn5'?5:3;const together=['dec','sc3tog','dc2tog','dc3tog'].includes(key);for(let i=0;i<count;i++){const x=22+i*52/(count-1);line(together?x:48,80,x,38);line(x,38,48,16);if(!['dec','sc3tog'].includes(key))line(x-5,52,x+7,44);}if(key==='popcorn5')oval(48,48,35,35);}
 return canvas.toDataURL('image/png');
}
