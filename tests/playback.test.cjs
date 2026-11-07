const {test}=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const modulePath=path.join(__dirname,'../playback.js');
const P=fs.existsSync(modulePath)?require(modulePath):{};
function setup(options={baseDelay:6000}){
 a.equal(typeof P.createController,'function','需要可注入计时器的自动播放控制器');
 let serial=0;const pending=new Map(),history=new Map(),selected=[],changes=[];
 const schedule=(fn,delay)=>{const id=++serial;const task={fn,delay};pending.set(id,task);history.set(id,task);return id;};
 const cancel=id=>pending.delete(id);
 const player=P.createController({schedule,cancel,onSelect:id=>selected.push(id),onChange:s=>changes.push(s),...options});
 const tick=()=>{a.ok(pending.size,'应存在一个待执行的播放计时器');const [id,task]=pending.entries().next().value;pending.delete(id);task.fn();};
 return {player,pending,history,selected,changes,tick};
}

test('播放需由用户启动，队列与状态快照不会被外部修改',()=>{
 const {player,pending,changes}=setup();const ids=['a','b','c'];player.setQueue(ids,'b');ids.push('d');
 a.equal(player.getState().playing,false);a.equal(pending.size,0);a.equal(player.getState().currentId,'b');
 const state=player.getState();state.ids.push('x');changes[0].ids.push('y');
 a.deepEqual(player.getState().ids,['a','b','c']);a.equal(player.getState().count,3);a.equal(player.getState().index,1);
});

test('按筛选后的节点顺序前进，选到末项即停止',()=>{
 const {player,pending,selected,tick}=setup();player.setQueue(['a','b','c'],'a');player.play();
 a.equal(pending.size,1);a.equal([...pending.values()][0].delay,6000);a.deepEqual(selected,[]);
 tick();a.deepEqual(selected,['b']);a.equal(player.getState().playing,true);
 tick();a.deepEqual(selected,['b','c']);a.equal(player.getState().playing,false);a.equal(player.getState().reason,'ended');a.equal(pending.size,0);
});

test('暂停后旧回调不能复活，恢复从当前节点继续',()=>{
 const {player,pending,history,selected,tick}=setup();player.setQueue(['a','b','c'],'a');player.play();
 const stale=[...history.values()][0].fn;player.pause();a.equal(pending.size,0);stale();
 a.deepEqual(selected,[]);a.equal(player.getState().playing,false);
 player.play();tick();a.deepEqual(selected,['b']);player.pause();
});

test('倍速重设等待时间，反复播放不会叠加计时器',()=>{
 const {player,pending,history,selected,tick}=setup();player.setQueue(['a','b','c'],'a');player.play();
 const stale=[...history.values()][0].fn;player.play();a.equal(pending.size,1);
 player.setSpeed(2);a.equal(pending.size,1);a.equal([...pending.values()][0].delay,3000);stale();a.deepEqual(selected,[]);
 player.setSpeed(.5);a.equal(pending.size,1);a.equal([...pending.values()][0].delay,12000);
 tick();a.deepEqual(selected,['b']);player.pause();
 a.throws(()=>player.setSpeed(3),RangeError);a.equal(player.getState().speed,.5);
});

test('筛选换队列会暂停，旧计时回调不能串入新队列',()=>{
 const {player,pending,history,selected,tick}=setup();player.setQueue(['a','b','c'],'a');player.play();
 const stale=[...history.values()][0].fn;player.setQueue(['x','y'],'x');
 a.equal(player.getState().playing,false);a.equal(pending.size,0);stale();a.deepEqual(selected,[]);
 player.play();tick();a.deepEqual(selected,['y']);a.equal(player.getState().reason,'ended');
});

test('相同队列的界面重绘保留播放状态与唯一计时器',()=>{
 const {player,pending,tick}=setup();player.setQueue(['a','b','c'],'a');player.play();const token=[...pending.keys()][0];
 player.setQueue(['a','b','c'],'b');a.equal(player.getState().currentId,'b');a.equal(player.getState().playing,true);a.equal([...pending.keys()][0],token);
 tick();a.equal(player.getState().currentId,'c');a.equal(player.getState().playing,false);
});

test('循环可从末项回到首项，普通末项重播从头开始',()=>{
 const {player,pending,selected,tick}=setup();player.setQueue(['a','b'],'b');player.play();
 a.deepEqual(selected,['a']);a.equal(player.getState().playing,true);tick();a.equal(player.getState().currentId,'b');a.equal(pending.size,0);
 player.setLoop(true);player.play();a.equal(player.getState().currentId,'a');tick();a.equal(player.getState().currentId,'b');a.equal(player.getState().playing,true);
 tick();a.equal(player.getState().currentId,'a');a.equal(pending.size,1);player.pause();
});

test('空队列和单节点不启动自动播放，也不会创建计时器',()=>{
 const {player,pending,selected}=setup();player.setQueue([],null);player.play();a.equal(player.getState().index,-1);a.equal(player.getState().currentId,null);a.equal(player.getState().playing,false);
 player.setQueue(['a'],'a');player.play();a.equal(player.getState().playing,false);a.equal(pending.size,0);a.deepEqual(selected,[]);
});

test('手动选点暂停而不重复选择，上一下一受队列边界约束',()=>{
 const {player,pending,selected}=setup();player.setQueue(['a','b','c'],'a');player.play();player.seek('b');
 a.equal(player.getState().playing,false);a.equal(player.getState().currentId,'b');a.equal(pending.size,0);a.deepEqual(selected,[]);
 player.step(-1);a.equal(player.getState().currentId,'a');player.step(-1);a.equal(player.getState().currentId,'a');
 player.step(1);a.equal(player.getState().currentId,'b');player.step(9);a.equal(player.getState().currentId,'c');a.equal(player.getState().playing,false);
});

test('选择回调中的暂停也能阻止后续计时，避免界面操作后继续跳点',()=>{
 a.equal(typeof P.createController,'function');let cb,pending=false;const chosen=[];let player;
 player=P.createController({schedule:fn=>{cb=fn;pending=true;return 1;},cancel:()=>{pending=false;},onSelect:id=>{chosen.push(id);player.pause('interaction');}});
 player.setQueue(['a','b','c'],'a');player.play();pending=false;cb();
 a.deepEqual(chosen,['b']);a.equal(player.getState().playing,false);a.equal(pending,false);a.equal(player.getState().reason,'interaction');
});


test('默认每1.5秒切换节点，初始化和设定队列仍不自动播放',()=>{
 const {player,pending,tick,selected}=setup({});player.setQueue(['a','b','c'],'a');
 a.equal(player.getState().playing,false);a.equal(pending.size,0);
 player.play();a.equal([...pending.values()][0].delay,1500);tick();a.deepEqual(selected,['b']);player.pause();
});

test('新增4倍和8倍速度，以默认间隔安排375ms和187.5ms且始终只有一个计时器',()=>{
 const {player,pending,history,selected,tick}=setup({});player.setQueue(['a','b','c'],'a');player.play();
 const stale=[...history.values()][0].fn;
 a.doesNotThrow(()=>player.setSpeed(4));a.equal(player.getState().speed,4);a.equal(pending.size,1);a.equal([...pending.values()][0].delay,375);
 a.doesNotThrow(()=>player.setSpeed(8));a.equal(player.getState().speed,8);a.equal(pending.size,1);a.equal([...pending.values()][0].delay,187.5);
 stale();a.deepEqual(selected,[]);tick();a.deepEqual(selected,['b']);a.equal(pending.size,1);player.pause();a.equal(pending.size,0);
});

test('进度条在pointerdown暂停，并在input时立即逐项选点，无需松手或change',()=>{
 a.equal(typeof P.bindScrubber,'function','需要实时绑定节点索引进度条');
 const input=new EventTarget();input.value='0';const actions=[];
 const dispose=P.bindScrubber(input,{getIds:()=>['a','b','c'],onStart:()=>actions.push('start'),onSeek:(id,i)=>actions.push([id,i])});
 input.dispatchEvent(new Event('pointerdown'));
 for(const value of ['0','1','2']){input.value=value;input.dispatchEvent(new Event('input'));}
 a.deepEqual(actions,['start',['a',0],['b',1],['c',2]]);
 dispose();input.value='1';input.dispatchEvent(new Event('input'));input.dispatchEvent(new Event('pointerdown'));
 a.equal(actions.length,4);
});

test('进度条读取最新筛选队列，索引取整并限制边界',()=>{
 a.equal(typeof P.bindScrubber,'function');const input=new EventTarget(),seen=[];let ids=['a','b','c'];
 const dispose=P.bindScrubber(input,{getIds:()=>ids,onSeek:(id,i)=>seen.push([id,i])});
 for(const value of ['-5','1.6','99']){input.value=value;input.dispatchEvent(new Event('input'));}
 ids=['x','y'];input.value='2';input.dispatchEvent(new Event('input'));
 a.deepEqual(seen,[['a',0],['c',2],['c',2],['y',1]]);dispose();
});

test('进度条面对空队列或非法数值不误选节点，也不抛异常',()=>{
 a.equal(typeof P.bindScrubber,'function');const input=new EventTarget(),seen=[];let ids=[];
 const dispose=P.bindScrubber(input,{getIds:()=>ids,onSeek:id=>seen.push(id)});
 input.value='1';a.doesNotThrow(()=>input.dispatchEvent(new Event('input')));
 ids=['a','b'];for(const value of ['bad','Infinity']){input.value=value;input.dispatchEvent(new Event('input'));}
 a.deepEqual(seen,[]);dispose();
});
