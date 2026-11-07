const {test}=require('node:test'),a=require('node:assert/strict'),H=require('../core.js');
test('帽子训练要求回忆完整表述，避免把一般原理错配为唯一事件',()=>{
const cs=H.makeCards([{id:'opium',title:'鸦片战争',year:1840,endYear:1842,hats:[{label:'前提',text:'认清中国国情，是解决中国革命问题的基本前提。'}]}]);
a.equal(cs.length,1);a.equal(cs[0].answer,'认清中国国情，是解决中国革命问题的基本前提。');a.match(cs[0].prompt,/前提/);a.match(cs[0].prompt,/鸦片战争/);
});
test('到期节点移出队列后，其余卡片保持稳定顺序且不遗漏',()=>{
const cards=[{eventId:'a',type:'hat',answer:'甲'},{eventId:'b',type:'hat',answer:'乙'},{eventId:'c',type:'year',answer:'1921'}];
const keys=cards.map(H.cardKey);const remaining=H.orderedCards(cards.slice(1),keys);a.deepEqual(remaining.map(c=>c.eventId),['b','c']);
});
test('帽子索引用固定语义分类，同时保留原始限定标签',()=>{
a.equal(H.hatGroup({label:'基本前提'}),'前提与基础');a.equal(H.hatGroup({label:'导火索'}),'原因与条件');a.equal(H.hatGroup({label:'首次明确概念'}),'首次与开端');a.equal(H.hatGroup({label:'结束标志'}),'标志与地位');a.equal(H.hatGroup({label:'对象区别'}),'内容与对应');
});
