const {test}=require('node:test'),a=require('node:assert/strict'),H=require('../core.js'),fs=require('node:fs'),path=require('node:path');
const es=[{id:'cpc5',title:'五大',year:1927,kind:'会议',period:'revolution',topics:['会议'],stageIds:['greatRevolution'],stageNames:['大革命时期']},{id:'aug7',title:'八七',year:1927,kind:'会议',period:'revolution',topics:['会议'],stageIds:['landRevolution'],stageNames:['土地革命战争时期']},{id:'victory',title:'抗战胜利',year:1945,kind:'事件',period:'revolution',topics:[],stageIds:['resistance','liberation'],stageNames:['全民族抗日战争时期','解放战争时期']}];
test('同年会议按明确阶段筛选，支持跨阶段事件与其他条件组合',()=>{
a.deepEqual(H.filterEvents(es,{stage:'greatRevolution',kind:'会议'}).map(e=>e.id),['cpc5']);a.deepEqual(H.filterEvents(es,{stage:'landRevolution',query:'土地革命'}).map(e=>e.id),['aug7']);a.deepEqual(H.filterEvents(es,{stage:'liberation'}).map(e=>e.id),['victory']);a.deepEqual(H.filterEvents(es,{stage:'resistance'}).map(e=>e.id),['victory']);a.equal(H.filterEvents(es,{stage:'all'}).length,3);
});
test('实际会议覆盖各阶段，1949建国前会议归解放阶段，九一八保留局部抗战区别',()=>{
const d=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/knowledge-base.json'))),get=id=>d.events.find(e=>e.id===id);
for(const [id,phase] of Object.entries({'e-cpc5':'greatRevolution','e-aug7':'landRevolution','e-zunyi':'landRevolution','e-wayaobao':'landRevolution','e-luochuan':'resistance','e-cpc7':'resistance','e-chongqing-cppcc':'liberation','m-qijie-er':'liberation','m-cppcc-first':'liberation'}))a.ok(get(id).stageIds?.includes(phase),id+'分期错误');
a.equal(get('m-qijie-er').period,'revolution');a.equal(get('m-founding').period,'construction');a.ok(get('e-sept18').stageIds.includes('landRevolution'));a.match(get('e-sept18').stageNote,/局部抗战/);a.equal(d.stages.length,5);
});
