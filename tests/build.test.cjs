const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
test('知识库构建支持下册实体页和单文件离线打包，旧事件ID不变',()=>{
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'shimai-lower-'));const root=path.resolve(__dirname,'..');
try{fs.mkdirSync(path.join(tmp,'data'));for(const name of ['build.py','index.html','style.css','app.js','core.js','map.js','playback.js','panels.js'])fs.copyFileSync(path.join(root,name),path.join(tmp,name));
const e={id:'e-preserved',title:'原有会议',dateLabel:'1921年7月',year:1921,kind:'会议',period:'revolution',topics:['会议'],background:'测试背景',content:['纲领内容','中心任务'],significance:['历史意义'],hats:[],confusions:[],related:[],sources:[{book:'legLower',page:7}]};
for(const [name,value] of Object.entries({'era-early.json':[e],'era-modern.json':[],'comparisons.json':[],'source-pages.json':[{book:'legLower',page:7,text:'下册会议总结原文',ocr:true}]}))fs.writeFileSync(path.join(tmp,'data',name),JSON.stringify(value));
const run=spawnSync('python3',['build.py'],{cwd:tmp,encoding:'utf8'});a.equal(run.status,0,run.stderr);const d=JSON.parse(fs.readFileSync(path.join(tmp,'data','knowledge-base.json'),'utf8'));a.equal(d.events[0].id,'e-preserved');a.equal(d.sourcePages[0].book,'legLower');a.equal(d.meta.materials.length,3);const html=fs.readFileSync(path.join(tmp,'史脉.html'),'utf8');a.ok(html.includes('下册会议总结原文'));a.ok(!html.includes('<script src='));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('发布文件同时内嵌地图与专题数据，已有节点得到地理及土地字段',()=>{
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'shimai-map-'));const root=path.resolve(__dirname,'..');
try{fs.mkdirSync(path.join(tmp,'data'));for(const name of ['build.py','index.html','style.css','app.js','core.js','map.js','playback.js','panels.js'])fs.copyFileSync(path.join(root,name),path.join(tmp,name));
if(fs.existsSync(path.join(root,'map.js')))fs.copyFileSync(path.join(root,'map.js'),path.join(tmp,'map.js'));
const e={id:'e-map',title:'土地会议',dateLabel:'1947年7月',year:1947,kind:'政策',period:'revolution',topics:['土地政策'],background:'背景',content:['耕者有其田','废除封建剥削'],significance:['意义'],hats:[],confusions:[],related:[],sources:[{book:'legLower',page:25}]};
const g={eventId:'e-map',scope:'region',label:'解放区',description:'政策适用范围',places:[],regionCodes:['140000'],sources:[]};const l={eventId:'e-map',party:'cpc',tiller:{status:'explicit',text:'明确提出'},feudal:{status:'abolish',text:'废除'},richPeasant:{text:'征收多余土地财产'},ownership:'农民私有',sources:[]};
for(const [name,value] of Object.entries({'era-early.json':[e],'era-modern.json':[],'comparisons.json':[],'source-pages.json':[{book:'legLower',page:25,text:'土地政策',ocr:true}],'event-geography.json':{entries:[g]},'land-policy-matrix.json':{entries:[l]},'china-provinces.geojson':{type:'FeatureCollection',features:[]},'world-land.geojson':{type:'FeatureCollection',features:[]},'map-source.json':{date:'2026-11-06'}}))fs.writeFileSync(path.join(tmp,'data',name),JSON.stringify(value));
const run=spawnSync('python3',['build.py'],{cwd:tmp,encoding:'utf8'});a.equal(run.status,0,run.stderr);const d=JSON.parse(fs.readFileSync(path.join(tmp,'data/knowledge-base.json'),'utf8'));a.equal(d.events[0].geography.scope,'region');a.equal(d.events[0].landPolicy.richPeasant.text,'征收多余土地财产');a.ok(d.geoMap.china);const html=fs.readFileSync(path.join(tmp,'史脉.html'),'utf8');a.ok(html.includes('HistoryMap'));a.ok(html.includes('root.HistoryPlayback=api'),'离线发布必须内嵌播放器控制器');a.ok(html.includes('root.HistoryPanels=api'),'离线发布必须内嵌可拖动面板控制器');a.ok(!html.includes('<script src='));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
