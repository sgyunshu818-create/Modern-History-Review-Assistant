const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),H=require('../core.js');
function setup(scope='national',onInteract){
 const win={};vm.runInNewContext(fs.readFileSync(require.resolve('../map.js'),'utf8'),{window:win,HistoryCore:H});
 const svg={getBoundingClientRect:()=>({left:0,top:0,width:1000,height:650}),setPointerCapture(){},setAttribute(k,v){this[k]=v;}},zoom={value:'100'},zoomValue={textContent:'100%'},markers={innerHTML:''};
 let writes=0,html='';const container={get innerHTML(){return html;},set innerHTML(value){html=value;writes++;},querySelector:selector=>selector==='svg'?svg:selector==='[data-map-zoom]'?zoom:selector==='.map-zoom-value'?zoomValue:selector==='.map-markers'?markers:null},state={},selected={id:'law',title:'土地改革法',dateLabel:'1950年',geography:{scope,label:'新解放区',description:'有明确实施范围',places:[],regionCodes:[]}};
 const render=()=>win.HistoryMap.render(container,{data:{geoMap:{china:{features:[{properties:{name:'河北省',adcode:'130000'},geometry:{type:'Polygon',coordinates:[[[114,38],[115,38],[114,38]]]}}]},world:{features:[]}}},events:[selected],selected,state,onSelect(){},onInteract});
 render();return {container,state,svg,render,selected,zoom,zoomValue,markers,getWrites:()=>writes};
}
test('全国性政策不能把全部现代省区画成实际适用范围',()=>{
 const {container}=setup();a.doesNotMatch(container.innerHTML,/class="map-province is-region-active"/);a.match(container.innerHTML,/全国性政策或进程/);a.doesNotMatch(container.innerHTML,/全国适用/);
});
test('平移后缩放与再次拖动都基于当前视窗，不能跳回旧位置',()=>{
 const {container,state,svg}=setup('unspecified'),target={closest:()=>null};
 svg.onpointerdown({target,clientX:100,clientY:100,pointerId:1});svg.onpointermove({clientX:200,clientY:100});svg.onpointerup();
 a.equal(state.box.x,-100);
 svg.onpointerdown({target,clientX:200,clientY:100,pointerId:2});svg.onpointermove({clientX:300,clientY:100});svg.onpointerup();
 a.equal(state.box.x,-200);
 // 浏览器拖动后的合成点击被抑制，下一次才是工具按钮点击。
 container.onclick({target:{closest:()=>null},stopPropagation(){}});
 container.onclick({target:{closest:sel=>sel.includes('data-map-action')?{dataset:{mapAction:'in'}}:null},stopPropagation(){}});
 a.equal(state.box.w,720);a.equal(state.box.x,-60);
});
test('省份的普通点击不捕获指针，开始拖动后才捕获，避免点击被改投到SVG',()=>{
 const {svg}=setup('unspecified'),captures=[];svg.setPointerCapture=id=>captures.push(id);
 svg.onpointerdown({target:{closest:()=>null},clientX:100,clientY:100,pointerId:7});a.equal(captures.length,0);
 svg.onpointermove({clientX:110,clientY:100,pointerId:7});a.deepEqual(captures,[7]);
});

test('缩放滑杆在 input 时即时改变视窗且保留正在拖动的控件',()=>{
 const {container,state,svg,zoom,zoomValue,getWrites}=setup('unspecified');
 a.match(container.innerHTML,/aria-label="地图缩放"/);a.match(container.innerHTML,/min="50" max="800"/);
 a.equal(typeof zoom.oninput,'function');const writes=getWrites();zoom.value='400';zoom.oninput({target:zoom});
 a.equal(state.box.w,250);a.equal(state.box.h,162.5);a.match(svg.viewBox,/250 162.5$/);a.equal(zoomValue.textContent,'400%');a.equal(getWrites(),writes);
 zoom.value='50';zoom.oninput({target:zoom});a.equal(state.box.w,2000);
 zoom.value='800';zoom.oninput({target:zoom});a.equal(state.box.w,125);
});
test('滚轮以指针位置为锚点缩放且阻止页面跟着滚动',()=>{
 const {state,svg,zoomValue}=setup('unspecified');let prevented=false;
 a.equal(typeof svg.onwheel,'function');svg.onwheel({deltaY:-120,deltaMode:0,clientX:250,clientY:200,preventDefault(){prevented=true;},stopPropagation(){}});
 a.ok(prevented);a.ok(state.box.w<1000);a.ok(parseInt(zoomValue.textContent)>100);
 a.ok(Math.abs(state.box.x+state.box.w*.25-250)<1e-8);a.ok(Math.abs(state.box.y+state.box.h*(200/650)-200)<1e-8);
});
test('双指捏合即时缩放，剩下一指后继续平移不会跳动',()=>{
 const {state,svg}=setup('unspecified'),target={closest:()=>null};
 svg.onpointerdown({target,clientX:200,clientY:200,pointerId:1,pointerType:'touch'});
 svg.onpointerdown({target,clientX:400,clientY:200,pointerId:2,pointerType:'touch'});
 svg.onpointermove({clientX:600,clientY:200,pointerId:2,pointerType:'touch'});
 a.equal(state.box.w,500);a.equal(state.box.x,100);a.equal(state.box.y,100);
 svg.onpointerup({pointerId:2,pointerType:'touch'});
 svg.onpointermove({clientX:220,clientY:220,pointerId:1,pointerType:'touch'});
 a.equal(state.box.w,500);a.equal(state.box.x,90);a.equal(state.box.y,90);
});
test('同模式切节点保留缩放，切换境外模式时重新全览',()=>{
 const {state,selected,zoom,render}=setup('unspecified');zoom.value='400';a.equal(typeof zoom.oninput,'function');zoom.oninput({target:zoom});
 selected.id='another';render();a.equal(state.box.w,250);
 selected.id='moscow';selected.geography={scope:'international',places:[{name:'莫斯科',lon:37.62,lat:55.75}],regionCodes:[]};render();
 a.equal(state.lastMode,'world');a.equal(state.box,null);
});

test('已放大时切换到视窗外会址只平移到新点，不重置缩放',()=>{
 const {state,selected,zoom,render}=setup('unspecified');zoom.value='400';a.equal(typeof zoom.oninput,'function');zoom.oninput({target:zoom});
 selected.id='shanghai';selected.geography={scope:'site',places:[{name:'上海',lon:121.47,lat:31.23}],regionCodes:[]};render();
 const point=H.projectMapPoint(selected.geography.places[0],'china');a.equal(state.box.w,250);a.ok(Math.abs(state.box.x+125-point.x)<1e-8);a.ok(Math.abs(state.box.y+81.25-point.y)<1e-8);
});

test('用户操作缩放或开始地图手势时可以暂停外部播放，重绘后仍保留回调',()=>{
 let playing=true;const {container,zoom,svg}=setup('unspecified',()=>{playing=false;});
 zoom.value='200';zoom.oninput({target:zoom});a.equal(playing,false);
 playing=true;svg.onwheel({deltaY:-40,clientX:500,clientY:300,preventDefault(){},stopPropagation(){}});a.equal(playing,false);
 playing=true;svg.onpointerdown({target:{closest:()=>null},clientX:100,clientY:100,pointerId:1});a.equal(playing,false);svg.onpointerup({pointerId:1});
 playing=true;container.onclick({target:{closest:sel=>sel.includes('data-map-action')?{dataset:{mapAction:'in'}}:null},stopPropagation(){}});a.equal(playing,false);
 playing=true;zoom.value='300';zoom.oninput({target:zoom});a.equal(playing,false);
});
test('捏合结束后新一次按钮点击不会被前一手势的点击抑制吞掉',()=>{
 const {container,state,svg}=setup('unspecified'),target={closest:()=>null};
 svg.onpointerdown({target,clientX:200,clientY:200,pointerId:1,pointerType:'touch'});svg.onpointerdown({target,clientX:400,clientY:200,pointerId:2,pointerType:'touch'});
 svg.onpointermove({clientX:600,clientY:200,pointerId:2,pointerType:'touch'});svg.onpointerup({pointerId:2});svg.onpointerup({pointerId:1});
 a.equal(typeof container.onpointerdown,'function');container.onpointerdown({target});
 container.onclick({target:{closest:sel=>sel.includes('data-map-action')?{dataset:{mapAction:'in'}}:null},stopPropagation(){}});a.equal(state.box.w,360);
});
