// Manufacturer specifications checked 2026-10-27; no live requests at runtime.
export const yarnCatalog=[
 {id:'drops-paris',brand:'DROPS',product:'Paris',fiber:'100% cotton',category:'Aran / worsted',skein_grams:50,skein_meters:75,source:'https://www.garnstudio.com/yarn.php?show=drops-paris&cid=19'},
 {id:'drops-lima',brand:'DROPS',product:'Lima',fiber:'65% wool, 35% alpaca',category:'DK / worsted',skein_grams:50,skein_meters:100,source:'https://www.garnstudio.com/yarn.php?show=drops-lima&cid=19'},
 {id:'drops-alpaca',brand:'DROPS',product:'Alpaca',fiber:'100% alpaca',category:'Sport',skein_grams:50,skein_meters:167,source:'https://www.garnstudio.com/yarn.php?show=drops-alpaca&cid=19'}
];
export function catalogDraft(id) {
 const yarn=yarnCatalog.find(y=>y.id===id);if(!yarn)throw Error('Select a catalog yarn.');
 return {name:`${yarn.brand} ${yarn.product}`,brand:yarn.brand,product:yarn.product,fiber:yarn.fiber,category:yarn.category,skein_grams:yarn.skein_grams,skein_meters:yarn.skein_meters,shape:'round',remaining_grams:0,notes:`Catalog reference checked 2026-10-27: ${yarn.source}. Verify against your ball band. Enter your color, dye lot and owned quantity; measure your own gauge.`};
}
