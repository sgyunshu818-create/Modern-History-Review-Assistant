const {test}=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const modulePath=path.join(__dirname,'../panels.js');
const P=fs.existsSync(modulePath)?require(modulePath):{};
class Handle extends EventTarget{
 constructor(){super();this.attrs=new Map();this.captured=new Set();}
 setAttribute(name,value){this.attrs.set(name,String(value));}
 getAttribute(name){return this.attrs.get(name)??null;}
 setPointerCapture(id){this.captured.add(id);}
 hasPointerCapture(id){return this.captured.has(id);}
 releasePointerCapture(id){this.captured.delete(id);}
}
function event(type,values={}){
 const e=new Event(type,{cancelable:true});
 for(const [key,value] of Object.entries({button:0,isPrimary:true,pointerId:1,clientX:100,clientY:100,...values}))Object.defineProperty(e,key,{value});
 return e;
}
function setup(options={}){
 a.equal(typeof P.bindDivider,'function','需要可独立绑定拖动边界的控制器');
 const handle=new Handle(),resizes=[];let size=370,limits={min:280,max:800},starts=0,ends=0,resets=0;
 const dispose=P.bindDivider(handle,{axis:'x',getSize:()=>size,getLimits:()=>limits,onResize:n=>{size=n;resizes.push(n);},onStart:()=>starts++,onEnd:()=>ends++,onReset:()=>{size=370;resets++;},...options});
 return {handle,dispose,resizes,get size(){return size;},get starts(){return starts;},get ends(){return ends;},get resets(){return resets;},setLimits:next=>{limits=next;}};
}
test('尺寸限制返回有限值，即使无效数据或最大值小于最小值也安全',()=>{
 a.equal(typeof P.clampSize,'function');
 a.equal(P.clampSize(450,280,800),450);a.equal(P.clampSize(20,280,800),280);a.equal(P.clampSize(900,280,800),800);
 a.equal(P.clampSize(450,280,200),280);a.equal(P.clampSize(NaN,280,800),280);a.equal(P.clampSize(Infinity,280,800),280);
 a.ok(Number.isFinite(P.clampSize(300,NaN,Infinity)));
});
test('横向边界在松手前实时调整详情宽度，向左拖使右侧变宽',()=>{
 const s=setup(),down=event('pointerdown',{clientX:600});s.handle.dispatchEvent(down);
 a.equal(s.starts,1);a.ok(s.handle.captured.has(1));a.equal(down.defaultPrevented,true);
 s.handle.dispatchEvent(event('pointermove',{clientX:540}));a.deepEqual(s.resizes,[430]);a.equal(s.size,430);a.equal(s.ends,0);
 a.equal(s.handle.getAttribute('aria-valuenow'),'430');a.equal(s.handle.getAttribute('aria-valuemin'),'280');a.equal(s.handle.getAttribute('aria-valuemax'),'800');
 s.handle.dispatchEvent(event('pointerup',{clientX:540}));a.equal(s.ends,1);a.equal(s.handle.captured.size,0);
});
test('拖动遵守两侧尺寸下限，窗口约束变化后使用最新限制',()=>{
 const s=setup();s.handle.dispatchEvent(event('pointerdown'));
 s.handle.dispatchEvent(event('pointermove',{clientX:1000}));a.equal(s.size,280);
 s.handle.dispatchEvent(event('pointermove',{clientX:-1000}));a.equal(s.size,800);
 s.setLimits({min:300,max:520});s.handle.dispatchEvent(event('pointermove',{clientX:-1000}));a.equal(s.size,520);a.equal(s.handle.getAttribute('aria-valuemax'),'520');
 s.handle.dispatchEvent(event('pointercancel'));
});
test('竖向边界向上拖增大下方面板，取消后可继续新一次拖动',()=>{
 const s=setup({axis:'y'});s.handle.dispatchEvent(event('pointerdown',{clientY:500}));
 s.handle.dispatchEvent(event('pointermove',{clientY:460}));a.equal(s.size,410);
 s.handle.dispatchEvent(event('pointercancel'));a.equal(s.ends,1);a.equal(s.handle.captured.size,0);
 s.handle.dispatchEvent(event('pointerdown',{pointerId:2,clientY:400}));s.handle.dispatchEvent(event('pointermove',{pointerId:2,clientY:430}));a.equal(s.size,380);
 s.handle.dispatchEvent(event('pointerup',{pointerId:2}));a.equal(s.starts,2);a.equal(s.ends,2);
});
test('右键、非主指针和另一指针的移动不启动或干扰拖动',()=>{
 const s=setup();s.handle.dispatchEvent(event('pointerdown',{button:2}));s.handle.dispatchEvent(event('pointerdown',{isPrimary:false,pointerId:2}));a.equal(s.starts,0);
 s.handle.dispatchEvent(event('pointerdown'));s.handle.dispatchEvent(event('pointermove',{pointerId:2,clientX:-200}));s.handle.dispatchEvent(event('pointerup',{pointerId:2}));a.equal(s.size,370);a.equal(s.ends,0);
 s.handle.dispatchEvent(event('pointermove',{clientX:80}));a.equal(s.size,390);s.handle.dispatchEvent(event('pointerup'));a.equal(s.ends,1);
});
test('键盘方向键调节尺寸，Home/End触及边界，双击和Enter复位',()=>{
 const s=setup();let e=event('keydown',{key:'ArrowLeft'});s.handle.dispatchEvent(e);a.equal(s.size,390);a.equal(e.defaultPrevented,true);
 s.handle.dispatchEvent(event('keydown',{key:'ArrowRight'}));a.equal(s.size,370);
 s.handle.dispatchEvent(event('keydown',{key:'ArrowUp'}));a.equal(s.size,370);
 s.handle.dispatchEvent(event('keydown',{key:'Home'}));a.equal(s.size,280);
 s.handle.dispatchEvent(event('keydown',{key:'End'}));a.equal(s.size,800);
 s.handle.dispatchEvent(event('keydown',{key:'Enter'}));a.equal(s.size,370);a.equal(s.resets,1);a.equal(s.handle.getAttribute('aria-valuenow'),'370');
 s.handle.dispatchEvent(event('dblclick'));a.equal(s.resets,2);a.equal(s.starts,s.ends);
});
test('向前方向可供其他分隔条使用，竖向键盘仅响应上下键',()=>{
 const s=setup({axis:'y',direction:1,step:30});s.handle.dispatchEvent(event('keydown',{key:'ArrowDown'}));a.equal(s.size,400);
 s.handle.dispatchEvent(event('keydown',{key:'ArrowUp'}));a.equal(s.size,370);
 s.handle.dispatchEvent(event('keydown',{key:'ArrowLeft'}));a.equal(s.size,370);
});
test('清理时结束正在进行的拖动，此后不再响应事件',()=>{
 const s=setup();s.handle.dispatchEvent(event('pointerdown'));s.dispose();a.equal(s.ends,1);a.equal(s.handle.captured.size,0);
 for(const type of ['pointermove','pointerdown','pointerup','keydown','dblclick'])s.handle.dispatchEvent(event(type,{clientX:-200,key:'ArrowLeft'}));
 a.equal(s.size,370);a.equal(s.starts,1);a.equal(s.ends,1);a.equal(s.resets,0);s.dispose();a.equal(s.ends,1);
});
test('失去指针捕获也结束拖动，防止边界保持拖动状态',()=>{
 const s=setup();s.handle.dispatchEvent(event('pointerdown'));s.handle.dispatchEvent(event('lostpointercapture'));a.equal(s.ends,1);
 s.handle.dispatchEvent(event('pointermove',{clientX:-200}));a.equal(s.size,370);
});
test('外部尺寸变化可单独同步分隔条的可访问状态',()=>{
 a.equal(typeof P.syncDivider,'function');const handle=new Handle();
 a.equal(P.syncDivider(handle,900,{min:250,max:620}),620);a.equal(handle.getAttribute('aria-valuenow'),'620');a.equal(handle.getAttribute('aria-valuemin'),'250');a.equal(handle.getAttribute('aria-valuemax'),'620');
});
