export function suggestRound(chart,stitches,index,target,normalId,increaseId,decreaseId) {
 if(index<1)throw Error('Start from round 2; define the starting round manually.');
 if(!Number.isInteger(target)||target<1||target>240)throw Error('Choose an integer target from 1 to 240 produced stitches.');
 const defs=new Map(stitches.map(s=>[s.id,s]));
 const normal=defs.get(normalId),inc=defs.get(increaseId),dec=defs.get(decreaseId);
 if(!normal||normal.consumed!==1||normal.produced!==1)throw Error('Choose a 1→1 regular stitch.');
 const prev=chart.rounds[index-1],available=prev.cells.reduce((n,id)=>n+defs.get(id).produced,0)+(prev.construction?.counts?1:0);
 const desired=target-(chart.rounds[index].construction?.counts?1:0),delta=desired-available;
 let changes=Math.abs(delta),count,id;
 if(delta>=0){if(!inc||inc.consumed!==1||inc.produced!==2)throw Error('Choose a 1→2 increase.');count=available;id=inc.id;}
 else {if(!dec||dec.consumed!==2||dec.produced!==1)throw Error('Choose a 2→1 decrease.');count=desired;id=dec.id;}
 if(changes>count||count<1||count>120)throw Error('Target cannot be reached with these stitches in one sample round (maximum 120 symbols).');
 const cells=Array.from({length:count},(_,i)=>Math.floor((i+1)*changes/count)>Math.floor(i*changes/count)?id:normal.id);
 return cells;
}
