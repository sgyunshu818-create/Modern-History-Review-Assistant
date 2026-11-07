const {test}=require('node:test'),a=require('node:assert/strict'),H=require('../core.js'),D=require('../data/knowledge-base.json');
const event=id=>D.events.find(e=>e.id===id);
function rows(es,options){a.equal(typeof H.comparisonLandRows,'function','对比表应按专题决定土地专属维度');return H.comparisonLandRows(es,options);}
test('近代救国探索不因太平天国有土地资料而插入土地专属表项',()=>{
 const preset=D.comparisons.find(c=>c.id==='cmp-rescue'),es=preset.eventIds.map(event);
 a.ok(es.some(e=>e.landPolicy));a.deepEqual(rows(es,{domain:'general'}),[]);
});
test('一般理论或会议专题即使条目都有土地资料也不混入土地表项',()=>{
 a.deepEqual(rows(['e-newdemocracy','e-coalition-government'].map(event),{domain:'general'}),[]);
});
test('土地专题继续显示三项关键辨析和所有制，保留富农政策原文',()=>{
 const rs=rows(['e-may4-directive','e-land-outline'].map(event),{domain:'land'});
 a.deepEqual(rs.map(r=>r.id),['tiller','feudal','richPeasant','ownership']);a.match(rs.find(r=>r.id==='richPeasant').cells[0].text,/一般不变动富农土地/);
});
test('自选混合主题不出现土地占位，全部为土地节点时可比较土地维度',()=>{
 a.deepEqual(rows(['e-land-outline','e-yangwu'].map(event),{custom:true}),[]);
 a.equal(rows(['e-land-outline','m-land-law'].map(event),{custom:true}).length,4);
});
test('土地表中不生成不适用或未知占位，非中共文件不显示富农态度行',()=>{
 const rs=rows(['e-tiandi','e-tongmeng'].map(event),{domain:'land'});
 a.ok(!rs.some(r=>r.id==='richPeasant'));
 a.ok(rs.flatMap(r=>r.cells).every(c=>c===null||!['unknown','not-applicable'].includes(c.status)));
});
