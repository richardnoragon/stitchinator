export const knittingPresets=[
 ['k','Knit','k','│',1,1],['p','Purl','p','—',1,1],['yo','Yarn over','yo','○',0,1],['k2tog','Knit two together','k2tog','/',2,1],['ssk','Slip, slip, knit','ssk','\\',2,1],['p2tog','Purl two together','p2tog','∧',2,1],['kfb','Knit front and back','kfb','V',1,2],['m1l','Make one left','M1L','↖',0,1],['m1r','Make one right','M1R','↗',0,1]
].map(([key,name,abbr,symbol,consumed,produced])=>({knitKey:key,name,abbr,symbol,consumed,produced}));
export function setCraft(project,craft,mode) {
 if(!['crochet','knitting'].includes(craft)||!['flat','round'].includes(mode))throw Error('Choose a supported craft and knitting mode.');
 const next=structuredClone(project);next.craft=craft;
 const piece=next.pieces.find(p=>p.id===next.activePieceId);piece.knittingMode=mode;
 if(craft==='knitting')for(const preset of knittingPresets)if(!next.stitches.some(s=>s.knitKey===preset.knitKey))next.stitches.push({...preset,id:crypto.randomUUID()});
 if(next.stitches.length>200)throw Error('Stitch library exceeds 200 definitions.');
 return next;
}
