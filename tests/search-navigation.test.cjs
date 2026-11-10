const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),H=require('../core.js');
const app=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
class Input extends EventTarget{constructor(){super();this.value='';this.selectionStart=this.selectionEnd=0;this.selectionDirection='none';}focus(){}setSelectionRange(start,end,direction){Object.assign(this,{selectionStart:start,selectionEnd:end,selectionDirection:direction});}}
function setup(){
 const events=[{id:'start',year:1919,title:'五四运动',content:['遵义会议前的历史背景'],kind:'事件'},{id:'other',year:1927,title:'八七会议',content:['转折'],kind:'会议'},{id:'match',year:1935,title:'遵义会议',content:['军事与组织问题'],kind:'会议'},{id:'end',year:1949,title:'七届二中全会',content:['建设'],kind:'会议'}].map(e=>({...e,period:'revolution',dateLabel:e.year+'年',topics:[],stageIds:['war']}));
 const input=new Input(),main={innerHTML:'',scrollTop:30},S={view:'timeline',period:'revolution',stage:'',kind:'all',topic:'',query:'',selected:'other',tab:'points',scene:'linked',limit:40,hatLimit:60,zoom:1},calls={draw:[],map:[],queue:[]};
 const ctx={H,D:{events},S,user:{favorites:[]},timelineDividerDispose:null,input,main,calls,kinds:['会议','文章','政策','事件'],esc:String,$:s=>s==='#main'?main:s==='#search'?input:null,currentPeriod:()=>({name:'新民主主义革命',range:'1919 — 1949',desc:''}),playback:{pause(){},setQueue(ids,id){calls.queue=Array.from(ids);calls.current=id;}},searchRow:()=>'',phaseControls:()=>'',sceneControls:()=>'',playerControls:()=>'',stageMeetings:()=>'',card:e=>e.title,applyTimelinePreference(){},drawTimeline:es=>calls.draw=Array.from(es,e=>e.id),renderMapPanel:es=>calls.map=Array.from(es,e=>e.id),bindTimelineProgress(){},updatePlayerControls(){},bindTimelineDivider(){},syncPanelHandles(){},applyDetailPreference(){}};
 vm.createContext(ctx);
 for(const [start,end] of [['function filtered(','function event('],['function renderTimeline()','function bindTimelineProgress()'],['function bindSearch()','function selectEvent('],['function refreshPanelSizing()','function schedulePanelRefresh()']])vm.runInContext(app.slice(app.indexOf(start),app.indexOf(end)),ctx);
 ctx.render=()=>ctx.renderTimeline();ctx.render();
 const search=query=>{input.value=query;input.selectionStart=input.selectionEnd=query.length;input.dispatchEvent(new Event('input'));};
 return {ctx,S,calls,main,events,search};
}
test('关键词仅定位：标题优先于正文命中，保留完整时间轴、地图和播放范围',()=>{
 const h=setup();h.search('遵义会议');a.equal(h.S.selected,'match');a.deepEqual(h.calls.draw,h.events.map(e=>e.id));a.deepEqual(h.calls.map,h.events.map(e=>e.id));a.deepEqual(h.calls.queue,h.events.map(e=>e.id));a.match(h.main.innerHTML,/<span>1919<\/span><input id="overview"/);a.match(h.main.innerHTML,/max="3"/);a.match(h.main.innerHTML,/<span>1949<\/span>/);
});
test('没有搜索结果时保留当前节点和时间轴，清空关键词也不跳回首项',()=>{
 const h=setup();h.search('没有这个历史事件');a.equal(h.S.selected,'other');a.equal(h.calls.queue.length,4);a.equal(h.calls.draw.length,4);h.search('');a.equal(h.S.selected,'other');a.equal(h.calls.draw.length,4);
});
test('搜索后拖到非命中节点，重绘和面板尺寸刷新不能再次缩窄或抢回定位',()=>{
 const h=setup();h.search('遵义会议');h.S.selected='end';h.ctx.render();h.ctx.refreshPanelSizing();a.equal(h.S.selected,'end');a.equal(h.calls.current,'end');a.deepEqual(h.calls.draw,h.events.map(e=>e.id));a.equal(h.calls.queue.length,4);
});
test('只忽略关键词，不突破当前时期、阶段、类别和专题的范围',()=>{
 const h=setup();h.S.kind='会议';h.ctx.render();a.deepEqual(h.calls.queue,['other','match','end']);h.search('遵义会议');a.deepEqual(h.calls.queue,['other','match','end']);h.S.stage='other-stage';h.ctx.render();a.deepEqual(h.calls.queue,[]);
});
