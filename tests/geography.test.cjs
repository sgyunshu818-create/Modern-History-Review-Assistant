const {test}=require('node:test'),a=require('node:assert/strict'),H=require('../core.js');
test('中国投影保留地点位置，境外会址标记出界且可在世界视图定位',()=>{
const z=H.projectMapPoint({lon:106.93,lat:27.73},'china');a.ok(z.x>0&&z.x<1000&&z.y>0&&z.y<650&&z.visible);
const m=H.projectMapPoint({lon:37.62,lat:55.75},'china');a.equal(m.visible,false);
const w=H.projectMapPoint({lon:37.62,lat:55.75},'world');a.ok(w.visible&&w.x>0&&w.x<1000);
a.throws(()=>H.projectMapPoint({lon:999,lat:30}));
});
test('地图只把明确会址/活动地点作为点，不能把全国政策伪标为北京',()=>{
const events=[{id:'a',geography:{scope:'site',places:[{name:'北京',lon:116.4,lat:39.9}]}},{id:'b',geography:{scope:'multi-site',places:[{name:'北京',lon:116.41,lat:39.91},{name:'上海',lon:121.47,lat:31.23}]}},{id:'c',geography:{scope:'national',places:[]}},{id:'d',geography:{scope:'unspecified',places:[]}},{id:'e',geography:{scope:'region',places:[{name:'地区代表点',lon:116.4,lat:39.9,role:'适用区域代表点'}]}}];
const c=H.mapClusters(events);a.equal(c.length,2);a.deepEqual(c.find(g=>g.label.includes('北京')).eventIds,['a','b']);a.ok(c.every(g=>!g.eventIds.includes('c')&&!g.eventIds.includes('d')&&!g.eventIds.includes('e')));
});
test('土地对比保留明确提出、削弱剥削和富农政策的具体语义，未知项不当成否',()=>{
const rows=H.landComparisonRows([{id:'a',landPolicy:{tiller:{status:'explicit',text:'明确提出耕者有其田'},feudal:{status:'abolish',text:'废除封建性剥削土地制度'},richPeasant:{text:'征收富农多余土地财产'},ownership:'农民私有'}},{id:'b',landPolicy:{tiller:{status:'no',text:'减租减息'},feudal:{status:'weaken',text:'削弱封建剥削'},richPeasant:{text:'团结抗日富农'},ownership:'保留地主土地所有关系'}},{id:'c'}]);
a.equal(rows.find(r=>r.id==='tiller').cells[0].status,'explicit');a.equal(rows.find(r=>r.id==='feudal').cells[1].status,'weaken');a.match(rows.find(r=>r.id==='richPeasant').cells[0].text,/征收/);a.equal(rows.find(r=>r.id==='tiller').cells[2].status,'unknown');
});
test('相邻城市在地图全览聚合，放大后仍保留各自事件和地点名称',()=>{
const es=[{id:'sh',geography:{scope:'site',places:[{name:'上海',lon:121.47,lat:31.23}]}},{id:'jx',geography:{scope:'site',places:[{name:'嘉兴',lon:120.75,lat:30.75}]}}];
const c=H.mapClusters(es,{mode:'china',gridSize:80});a.equal(c.length,1);a.deepEqual(c[0].placeNames,['上海','嘉兴']);a.deepEqual(c[0].eventIds,['sh','jx']);
const z=H.mapClusters(es,{mode:'china',gridSize:3});a.equal(z.length,2);
});
test('土地字段的具体限定标签随比较行保留，避免把当期未实行误称从未提出',()=>{
 const rows=H.landComparisonRows([{landPolicy:{tiller:{status:'no',displayLabel:'当期实行减租减息',text:'1940、1945纲领与抗战当期政策须分开'}}}]);
 a.equal(rows[0].cells[0].displayLabel,'当期实行减租减息');a.match(rows[0].label,/主张与实行/);
});
