(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.HistoryPanels=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function limitsFor(min,max){
  const low=Number.isFinite(min)?min:0;
  return {min:low,max:Number.isFinite(max)?Math.max(low,max):low};
 }
 function clampSize(value,min,max){
  const limits=limitsFor(min,max);
  return Math.max(limits.min,Math.min(limits.max,Number.isFinite(value)?value:limits.min));
 }
 function syncDivider(handle,size,{min,max}){
  const limits=limitsFor(min,max),next=clampSize(size,limits.min,limits.max);
  handle.setAttribute('aria-valuemin',String(limits.min));
  handle.setAttribute('aria-valuemax',String(limits.max));
  handle.setAttribute('aria-valuenow',String(next));
  return next;
 }
 function bindDivider(handle,{axis='x',getSize,getLimits,onResize,onStart=()=>{},onEnd=()=>{},onReset=()=>{},direction=-1,step=20}){
  const coordinate=axis==='y'?'clientY':'clientX',sign=direction===1?1:-1,keyStep=Number.isFinite(step)&&step>0?step:20;
  let active=null,disposed=false;
  const sync=()=>syncDivider(handle,getSize(),getLimits());
  function resize(value){
   const limits=getLimits(),next=clampSize(value,limits.min,limits.max);
   onResize(next);
   syncDivider(handle,next,limits);
  }
  function finish(ev){
   if(!active||ev&&ev.pointerId!==active.id)return;
   const id=active.id;active=null;
   try{if(!handle.hasPointerCapture||handle.hasPointerCapture(id))handle.releasePointerCapture(id);}catch(e){}
   onEnd();
  }
  function pointerDown(ev){
   if(disposed||active||ev.button!=null&&ev.button!==0||ev.isPrimary===false||!Number.isFinite(ev[coordinate]))return;
   ev.preventDefault();
   active={id:ev.pointerId,start:ev[coordinate],size:getSize()};
   try{handle.setPointerCapture(ev.pointerId);}catch(e){}
   onStart();
   sync();
  }
  function pointerMove(ev){
   if(disposed||!active||ev.pointerId!==active.id||!Number.isFinite(ev[coordinate]))return;
   ev.preventDefault();
   resize(active.size+sign*(ev[coordinate]-active.start));
  }
  function reset(ev){
   if(disposed)return;
   ev.preventDefault();finish();onStart();onReset();sync();onEnd();
  }
  function keyDown(ev){
   if(disposed)return;
   if(ev.key==='Enter'){reset(ev);return;}
   const negative=axis==='y'?'ArrowUp':'ArrowLeft',positive=axis==='y'?'ArrowDown':'ArrowRight';
   if(![negative,positive,'Home','End'].includes(ev.key))return;
   ev.preventDefault();finish();onStart();
   const limits=getLimits();
   resize(ev.key==='Home'?limits.min:ev.key==='End'?limits.max:getSize()+sign*(ev.key===negative?-keyStep:keyStep));
   onEnd();
  }
  const listeners={pointerdown:pointerDown,pointermove:pointerMove,pointerup:finish,pointercancel:finish,lostpointercapture:finish,keydown:keyDown,dblclick:reset};
  for(const [type,listener] of Object.entries(listeners))handle.addEventListener(type,listener);
  sync();
  return ()=>{
   if(disposed)return;
   disposed=true;
   for(const [type,listener] of Object.entries(listeners))handle.removeEventListener(type,listener);
   finish();
  };
 }
 return {clampSize,syncDivider,bindDivider};
});
