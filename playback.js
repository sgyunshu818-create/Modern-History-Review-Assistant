(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.HistoryPlayback=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function createController({onSelect=()=>{},onChange=()=>{},schedule=(fn,delay)=>setTimeout(fn,delay),cancel=id=>clearTimeout(id),baseDelay=1500}={}){
  if(!Number.isFinite(baseDelay)||baseDelay<=0)throw new RangeError('播放间隔必须为正数');
  let ids=[],index=-1,playing=false,speed=1,loop=false,reason='idle',timer=null,generation=0;
  const getState=()=>({playing,speed,loop,ids:[...ids],currentId:index>=0?ids[index]:null,index,count:ids.length,reason});
  const emit=()=>{onChange(getState());return getState();};
  function clearTimer(){
   generation++;
   if(timer!==null){cancel(timer);timer=null;}
  }
  function stop(nextReason){clearTimer();playing=false;reason=nextReason;}
  function arm(){
   clearTimer();
   const token=generation;
   timer=schedule(()=>{
    if(token!==generation||!playing)return;
    timer=null;
    let next=index+1;
    if(next>=ids.length){
     if(loop)next=0;
     else{stop('ended');emit();return;}
    }
    index=next;
    if(!loop&&index===ids.length-1)stop('ended');
    onSelect(ids[index]);
    emit();
    // A callback may have paused playback, changed the queue, or started a new timer.
    if(playing&&token===generation)arm();
   },baseDelay/speed);
  }
  function setQueue(nextIds,currentId){
   if(!Array.isArray(nextIds))throw new TypeError('播放队列必须是节点编号数组');
   const next=[...nextIds];
   const changed=next.length!==ids.length||next.some((id,i)=>id!==ids[i]);
   if(changed)stop('queue-changed');
   const previousId=index>=0?ids[index]:null;
   ids=next;
   const supplied=ids.indexOf(currentId),previous=ids.indexOf(previousId);
   index=supplied>=0?supplied:previous>=0?previous:ids.length?0:-1;
   return emit();
  }
  function play(){
   if(playing)return getState();
   if(ids.length<2){stop('insufficient');return emit();}
   clearTimer();playing=true;reason='playing';
   const token=generation;
   if(index===ids.length-1){index=0;onSelect(ids[index]);}
   emit();
   if(playing&&token===generation)arm();
   return getState();
  }
  function pause(nextReason='paused'){stop(nextReason);return emit();}
  function seek(id){
   stop('paused');
   const next=ids.indexOf(id);
   if(next>=0)index=next;
   return emit();
  }
  function step(delta){
   if(!Number.isFinite(delta))throw new RangeError('节点步长必须是有效数字');
   stop('paused');
   if(ids.length){index=Math.max(0,Math.min(ids.length-1,index+Math.trunc(delta)));onSelect(ids[index]);}
   return emit();
  }
  function setSpeed(value){
   if(![.5,1,1.5,2,4,8].includes(value))throw new RangeError('播放速度不支持');
   speed=value;
   if(playing)arm();
   return emit();
  }
  function setLoop(value){loop=Boolean(value);return emit();}
  return {getState,setQueue,play,pause,seek,step,setSpeed,setLoop};
 }
 function bindScrubber(input,{getIds=()=>[],onSeek=()=>{},onStart=()=>{}}={}){
  const start=()=>onStart();
  const seek=()=>{
   const ids=getIds(),value=Number(input.value);
   if(!Array.isArray(ids)||!ids.length||!Number.isFinite(value))return;
   const index=Math.max(0,Math.min(ids.length-1,Math.round(value)));
   onSeek(ids[index],index);
  };
  input.addEventListener('pointerdown',start);
  input.addEventListener('input',seek);
  return ()=>{input.removeEventListener('pointerdown',start);input.removeEventListener('input',seek);};
 }
 return {createController,bindScrubber};
});
