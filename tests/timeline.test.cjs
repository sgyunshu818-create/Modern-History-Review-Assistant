const {test}=require('node:test'),a=require('node:assert/strict'),H=require('../core.js');
function nonOverlapping(items,gap){for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const x=items[i],y=items[j];if(x.lane===y.lane)a.ok(x.x+x.width+gap<=y.x||y.x+y.width+gap<=x.x,`${x.id} 与 ${y.id} 重叠`);}}
test('密集会议必须新增行，不把压缩圆点盖进其他标题',()=>{
const input=[{id:'six-seven',x:100,width:190},{id:'seven',x:120,width:115},{id:'december',x:135,width:200},{id:'seven-two',x:140,width:150}];
const result=H.layoutTimeline(input,{gap:8,minLanes:2});a.equal(result.items.length,4);a.equal(result.laneCount,4);a.deepEqual(result.items.map(n=>n.x),input.map(n=>n.x));a.deepEqual(result.items.map(n=>n.width),input.map(n=>n.width));nonOverlapping(result.items,8);
});
test('时间轴放大后重用空行，同年同月与缩小视图均无标签重叠',()=>{
for(const scale of [.1,1,10]){const r=H.layoutTimeline(Array.from({length:25},(_,i)=>({id:String(i),x:Math.floor(i/3)*50*scale,width:120+(i%3)*20})),{gap:10,minLanes:2});nonOverlapping(r.items,10);a.ok(r.laneCount>=3);}
const r=H.layoutTimeline([{id:'a',x:0,width:100},{id:'b',x:108,width:100}],{gap:8,minLanes:2});a.equal(r.items[0].lane,r.items[1].lane);a.equal(r.laneCount,2);
});
