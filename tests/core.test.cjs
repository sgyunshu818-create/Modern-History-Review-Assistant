const {test}=require('node:test');
const assert=require('node:assert/strict');
const H=require('../core.js');
const events=[
{id:'a',title:'遵义会议',year:1935,period:'revolution',kind:'会议',topics:['革命道路'],content:['独立自主解决中国革命实际问题'],hats:[{label:'转折',text:'生死攸关的转折点'}],sources:[]},
{id:'b',title:'论持久战',year:1938,period:'revolution',kind:'文章',topics:['革命道路'],content:['战略防御、战略相持、战略反攻'],hats:[],sources:[]},
{id:'c',title:'新中国成立',year:1949,period:'construction',kind:'事件',topics:['国家建设'],content:[],hats:[],sources:[]}];
test('联合搜索会议、文章正文和帽子，组合时期与类别',()=>{
assert.deepEqual(H.filterEvents(events,{query:'独立自主',period:'revolution',kind:'会议'}).map(e=>e.id),['a']);
assert.deepEqual(H.filterEvents(events,{query:'生死攸关'}).map(e=>e.id),['a']);
assert.equal(H.filterEvents(events,{query:'战略相持',kind:'会议'}).length,0);
assert.equal(H.filterEvents(events,{query:'  '}).length,3);
assert.deepEqual(H.filterEvents(events,{topic:'国家建设'}).map(e=>e.id),['c']);
});
test('时间轴以真实时间排序，同年按月份，区间起点不伪造具体日',()=>{
assert.deepEqual(H.chronological([{id:'b',year:1927,month:8},{id:'a',year:1927,month:4},{id:'c',year:1919,endYear:1921}]).map(x=>x.id),['c','a','b']);
});
test('间隔复习根据自评推进，忘记重置，日期按日计算',()=>{
const now=new Date('2026-11-05T10:00:00+08:00');
const a=H.scheduleReview(null,'good',now);assert.equal(a.level,1);assert.equal(a.due,'2026-11-06');
const b=H.scheduleReview(a,'good',now);assert.equal(b.due,'2026-11-08');
assert.equal(H.scheduleReview(b,'again',now).level,0);
assert.equal(H.scheduleReview(b,'hard',now).due,'2026-11-06');
assert.equal(H.isDue({due:'2026-11-04'},'2026-11-05'),true);
});
test('备份导入验证版本、事件ID和笔记类型，拒绝损坏数据',()=>{
const valid={version:1,notes:{a:'我的笔记'},reviews:{a:{level:1,due:'2026-11-06',status:'learning'}},favorites:['a']};
assert.deepEqual(H.validateBackup(valid,events),valid);
assert.throws(()=>H.validateBackup({...valid,version:999},events));
assert.throws(()=>H.validateBackup({...valid,notes:{a:{bad:true}}},events));
assert.throws(()=>H.validateBackup({...valid,reviews:{a:{level:99,due:'oops'}}},events));
assert.throws(()=>H.validateBackup({...valid,favorites:['missing']},events));
});
test('训练题只使用有精确年份的事件，帽子题给出对应答案',()=>{
const cards=H.makeCards(events);assert(cards.some(c=>c.eventId==='a'&&c.answer==='1935'));
assert(cards.some(c=>c.eventId==='a'&&c.answer==='生死攸关的转折点'&&c.prompt.includes('遵义会议')));
assert.equal(H.makeCards([{id:'z',year:1900,endYear:1910,title:'区间',hats:[]}]).length,0);
});
