(function(){
'use strict';
const H=HistoryCore;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={site:'具体地点','multi-site':'多个地点',region:'区域线索',national:'全国性政策或进程',international:'境外或跨国地点',unspecified:'地点待核实'};
const paths=new WeakMap();
const defaultBox=()=>({x:0,y:0,w:1000,h:650});
function scaledBox(box,factor,anchor={x:box.x+box.w/2,y:box.y+box.h/2}){const w=Math.max(125,Math.min(2000,box.w*factor)),ratio=w/box.w;return {x:anchor.x-(anchor.x-box.x)*ratio,y:anchor.y-(anchor.y-box.y)*ratio,w,h:w*.65};}
const zoomPercent=box=>Math.round(100000/box.w);
function geometryPath(geometry,project){if(!geometry)return '';const ring=points=>points.map((p,i)=>{const q=project({lon:p[0],lat:p[1]});return (i?'L':'M')+q.x.toFixed(1)+','+q.y.toFixed(1);}).join('')+'Z';if(geometry.type==='Polygon')return geometry.coordinates.map(ring).join('');if(geometry.type==='MultiPolygon')return geometry.coordinates.flatMap(p=>p.map(ring)).join('');if(geometry.type==='GeometryCollection')return geometry.geometries.map(g=>geometryPath(g,project)).join('');return '';}
function cachedPath(feature,mode){let cache=paths.get(feature);if(!cache){cache={};paths.set(feature,cache);}if(!cache[mode]){const proj=mode==='inset'?p=>({x:18+(p.lon-105)*7.7,y:12+(24.8-p.lat)*7.7}):p=>H.projectMapPoint(p,mode);cache[mode]=geometryPath(feature.geometry,proj);}return cache[mode];}
function provinceName(f){return (f.properties?.name||'').replace(/壮族自治区|回族自治区|维吾尔自治区|特别行政区|自治区|省|市/g,'');}
function render(container,{data,events,selected,onSelect,state,onInteract=()=>{}}){
 if(!container)return;
 const geo=selected?.geography||{scope:'unspecified',label:'地点尚未核实',places:[],regionCodes:[],description:'本节点尚无可核实的具体地点。'};
 const selectionChanged=state.lastSelected!==selected?.id;
 if(selectionChanged){state.cluster='';state.region='';state.extent='auto';state.lastSelected=selected?.id;}
 const overseas=['site','multi-site','international'].includes(geo.scope)&&(geo.places||[]).some(p=>!H.projectMapPoint(p,'china').visible);
 const mode=state.extent&&state.extent!=='auto'?state.extent:overseas?'world':'china';
 if(state.lastMode!==mode){state.box=null;state.lastMode=mode;}
 if(selectionChanged&&state.box&&['site','multi-site','international'].includes(geo.scope)){const p=(geo.places||[]).map(p=>H.projectMapPoint(p,mode)).find(p=>p.visible);if(p){const b=state.box,m=Math.min(30,b.w*.1);if(p.x<b.x+m||p.x>b.x+b.w-m||p.y<b.y+m||p.y>b.y+b.h-m)state.box={...b,x:p.x-b.w/2,y:p.y-b.h/2};}}
 const china=data.geoMap?.china?.features||[],world=data.geoMap?.world?.features||[];
 const getClusters=()=>H.mapClusters(events,{mode,gridSize:34*(state.box?.w||1000)/1000}).filter(g=>H.projectMapPoint(g,mode).visible);
 let clusters=getClusters();
 const activeCodes=new Set((geo.regionCodes||[]).map(String));
 for(const p of geo.places||[])if(p.adcode)activeCodes.add(String(p.adcode));
 let shapes='';
 if(mode==='china'){
  shapes=china.map(f=>{const code=String(f.properties?.adcode||''),boundary=code==='100000_JD',active=!boundary&&(activeCodes.has(code)||state.region===code);return `<path d="${cachedPath(f,'china')}" class="${boundary?'map-boundary':'map-province'} ${active?'is-region-active':''}" ${boundary?'':`data-map-region="${esc(code)}" tabindex="0" role="button" aria-label="${esc(f.properties?.name)}区域"`}><title>${esc(f.properties?.name||'辅助界线')}</title></path>`;}).join('');
  shapes+=china.filter(f=>f.properties?.name).map(f=>{const p=f.properties.centroid||f.properties.center;if(!Array.isArray(p))return '';const xy=H.projectMapPoint({lon:p[0],lat:p[1]},'china');return xy.visible?`<text class="map-province-label" x="${xy.x}" y="${xy.y}" text-anchor="middle">${esc(provinceName(f))}</text>`:'';}).join('');
 }else shapes=world.map(f=>`<path class="map-world-land" d="${cachedPath(f,'world')}"></path>`).join('');
 const lines=mode==='china'?{lons:[80,90,100,110,120,130],lats:[20,30,40,50]}:{lons:[-120,-60,0,60,120],lats:[-30,0,30,60]};
 let grid='';for(const lon of lines.lons){const x=H.projectMapPoint({lon,lat:30},mode).x;grid+=`<path d="M${x} 0V650"/>`;}for(const lat of lines.lats){const y=H.projectMapPoint({lon:100,lat},mode).y;grid+=`<path d="M0 ${y}H1000"/>`;}
 function markerMarkup(){return clusters.map(g=>{const p=H.projectMapPoint(g,mode),active=g.eventIds.includes(selected?.id);return `<g class="map-marker ${active?'is-selected':''}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" data-map-cluster="${esc(g.key)}" aria-label="${esc(g.placeNames.join('、'))}，${g.eventIds.length}个节点"><title>${esc(g.placeNames.join('、'))} · ${g.eventIds.length}个节点</title>${active?'<circle class="map-halo" r="23"/>':''}<circle class="map-point" r="${g.eventIds.length>1?13:8}"/>${g.eventIds.length>1?`<text class="map-count" text-anchor="middle" dy="4.5">${g.eventIds.length}</text>`:''}${active?`<text class="map-place-label" x="19" y="-14">${esc(g.placeNames.length>1?g.label+'等'+g.placeNames.length+'地':g.label)}</text>`:''}</g>`;}).join('');}
 const markers=markerMarkup();
 const inset=mode==='china'?`<g class="south-sea-inset" transform="translate(818 410)"><rect x="0" y="0" width="175" height="206" rx="3"/><text x="9" y="17">南海区域</text><g transform="translate(0 20)" clip-path="url(#south-sea-clip)">${china.map(f=>`<path class="${String(f.properties?.adcode)==='100000_JD'?'map-boundary':'map-province'}" d="${cachedPath(f,'inset')}"/>`).join('')}</g></g>`:'';
 const selectedCluster=clusters.find(g=>g.key===state.cluster);
 const regionFeature=china.find(f=>String(f.properties?.adcode)===state.region);
 const listed=selectedCluster?events.filter(e=>selectedCluster.eventIds.includes(e.id)):state.region?events.filter(e=>(e.geography?.regionCodes||[]).map(String).includes(state.region)||(e.geography?.places||[]).some(p=>String(p.adcode)===state.region)):[];
 const areaTitle=selectedCluster?selectedCluster.placeNames.join('、'):regionFeature?.properties?.name;
 const box=state.box||defaultBox();
 container.innerHTML=`<section class="geo-map-section" aria-label="历史地理地图"><div class="geo-map-toolbar"><div><span class="eyebrow">历史地理</span><strong>${esc(labels[geo.scope]||'地点范围')}</strong></div><div class="geo-map-controls"><button data-map-action="china" class="${mode==='china'?'active':''}" aria-label="切换中国地图">中国</button><button data-map-action="world" class="${mode==='world'?'active':''}" aria-label="切换世界地图">世界</button><label class="map-zoom"><span>缩放</span><input data-map-zoom type="range" min="50" max="800" step="1" value="${zoomPercent(box)}" aria-label="地图缩放"><output class="map-zoom-value">${zoomPercent(box)}%</output></label><button data-map-action="in" aria-label="放大地图">＋</button><button data-map-action="out" aria-label="缩小地图">−</button><button data-map-action="focus" aria-label="定位当前事件">定位</button><button data-map-action="reset" aria-label="复位地图">复位</button></div></div><div class="geo-map-canvas"><svg class="history-map-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" aria-label="${mode==='china'?'中国省级':'世界陆地'}参考地图"><defs><clipPath id="south-sea-clip"><rect x="1" y="1" width="172" height="181"/></clipPath><clipPath id="main-map-clip"><rect x="0" y="0" width="1000" height="650"/></clipPath></defs><g clip-path="url(#main-map-clip)"><g class="map-grid">${grid}</g>${shapes}<g class="map-markers">${markers}</g>${inset}</g></svg>${!china.length?'<div class="map-empty-overlay">地图资料尚未载入</div>':''}<span class="map-scale-note">${mode==='china'?'今地理 · 省级区划参考':'世界陆地 · 境外地点参考'}</span></div><div class="geo-map-caption"><div class="geo-map-selected"><span>${esc(selected?.dateLabel)}</span><strong>${esc(selected?.title)}</strong></div><p><b>${esc(geo.label||'地点待核实')}</b>　${esc(geo.description||'')}</p>${geo.scope==='national'?'<p class="map-scope-note">全国性政策或进程不等于各地同步实施；具体适用范围与例外以节点正文为准。</p>':geo.scope==='unspecified'?'<p class="map-scope-note">当前资料未能确认具体地点，保留空定位；地图仍可浏览其他已定位节点。</p>':''}${mode==='china'&&overseas?'<p class="map-scope-note">当前事件含境外地点，切换“世界”查看。</p>':''}<div class="map-legend"><span><i class="pin"></i>地点（数字为邻近地点的节点数）</span><span><i class="area"></i>相关省份（非实施边界）</span><span>点击节点联动考点 · 拖动平移 · 滚轮/双指缩放</span></div></div>${areaTitle?`<div class="map-location-list"><div><strong>${esc(areaTitle)}</strong><span>${listed.length} 个相关节点</span><button data-map-action="close-list" aria-label="关闭地图地点列表">×</button></div>${listed.length?listed.map(e=>`<button data-event="${e.id}"><span>${e.year}</span>${esc(e.title)}<small>${esc(e.kind)}</small></button>`).join(''):'<p>当前筛选下暂无该区域的已定位节点。</p>'}</div>`:''}<div class="map-attribution">现代底图用于学习定位，不表示各时期疆域或势力范围；城市与区域坐标为近似参考。<a href="https://datav.aliyun.com/portal/school/atlas/area_selector" target="_blank" rel="noopener">DataV</a> · <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener">Natural Earth</a></div></section>`;
 const rerender=()=>render(container,{data,events,selected,onSelect,state,onInteract});
 function action(target){onInteract();const key=target.dataset.mapCluster,region=target.dataset.mapRegion,cmd=target.dataset.mapAction;
  if(key){state.cluster=key;state.region='';rerender();return;}
  if(region){state.region=region;state.cluster='';rerender();return;}
  if(!cmd)return;
  if(cmd==='china'||cmd==='world'){state.extent=cmd;state.box=null;state.cluster='';state.region='';}
  if(cmd==='reset'){state.box=null;state.cluster='';state.region='';state.extent='auto';}
  if(cmd==='close-list'){state.cluster='';state.region='';}
  if(cmd==='in'||cmd==='out'){const current=state.box||box,factor=cmd==='in'?.72:1/.72;state.box=scaledBox(current,factor);}
  if(cmd==='focus'){const ps=(geo.places||[]).map(p=>H.projectMapPoint(p,mode)).filter(p=>p.visible);if(ps.length&&['site','multi-site','international'].includes(geo.scope)){const minX=Math.min(...ps.map(p=>p.x)),maxX=Math.max(...ps.map(p=>p.x)),minY=Math.min(...ps.map(p=>p.y)),maxY=Math.max(...ps.map(p=>p.y));const w=Math.max(380,maxX-minX+180,(maxY-minY+150)/.65);state.box={x:(minX+maxX)/2-w/2,y:(minY+maxY)/2-w*.65/2,w,h:w*.65};}else state.box=null;}
  rerender();
 }
 container.onclick=ev=>{if(suppressClick){suppressClick=false;ev.stopPropagation();return;}const target=ev.target.closest('[data-map-action],[data-map-cluster],[data-map-region]');if(target){ev.stopPropagation();action(target);}const e=ev.target.closest('[data-event]');if(e){ev.stopPropagation();onSelect(e.dataset.event);}};
 container.onpointerdown=ev=>{if(!ev.target.closest('.history-map-svg'))suppressClick=false;};
 container.onkeydown=ev=>{if(['Enter',' '].includes(ev.key))suppressClick=false;if(['Enter',' '].includes(ev.key)&&ev.target.matches('[data-map-cluster],[data-map-region]')){ev.preventDefault();action(ev.target);}};
 const svg=container.querySelector('svg'),zoomInput=container.querySelector('[data-map-zoom]'),zoomValue=container.querySelector('.map-zoom-value'),markerLayer=container.querySelector('.map-markers');
 const currentBox=()=>state.box||box;
 function viewportFraction(x,y,b=currentBox()){const r=svg.getBoundingClientRect(),scale=Math.min(r.width/b.w,r.height/b.h);return {x:(x-(r.left||0)-(r.width-b.w*scale)/2)/(b.w*scale),y:(y-(r.top||0)-(r.height-b.h*scale)/2)/(b.h*scale)};}
 function updateViewport(next){const previous=currentBox();state.box=next;svg.setAttribute('viewBox',`${next.x} ${next.y} ${next.w} ${next.h}`);const percent=zoomPercent(next);if(zoomInput)zoomInput.value=String(percent);if(zoomValue)zoomValue.textContent=percent+'%';if(next.w!==previous.w&&markerLayer){clusters=getClusters();markerLayer.innerHTML=markerMarkup();}}
 if(zoomInput){zoomInput.onpointerdown=()=>onInteract();zoomInput.oninput=ev=>{onInteract();const percent=Math.max(50,Math.min(800,Number(ev.target.value)||100)),current=currentBox();updateViewport(scaledBox(current,(100000/percent)/current.w));};}
 svg.onwheel=ev=>{onInteract();ev.preventDefault();ev.stopPropagation();const current=currentBox(),fraction=viewportFraction(ev.clientX,ev.clientY,current),anchor={x:current.x+fraction.x*current.w,y:current.y+fraction.y*current.h},delta=ev.deltaY*(ev.deltaMode===1?16:ev.deltaMode===2?svg.getBoundingClientRect().height:1);updateViewport(scaledBox(current,Math.exp(Math.max(-1,Math.min(1,delta*.0015))),anchor));};
 const pointers=new Map();let drag=null,pinch=null,suppressClick=false;
 function startDrag(pointerId,p,captured=false){const current=currentBox(),r=svg.getBoundingClientRect();drag={x:p.x,y:p.y,box:{...current},scale:Math.max(current.w/r.width,current.h/r.height),pointerId,captured};}
 function startPinch(){const [a,b]=[...pointers.values()],current=currentBox(),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},fraction=viewportFraction(mid.x,mid.y,current);pinch={box:{...current},distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),anchor:{x:current.x+fraction.x*current.w,y:current.y+fraction.y*current.h}};drag=null;suppressClick=true;for(const id of pointers.keys())svg.setPointerCapture(id);}
 svg.onpointerdown=ev=>{onInteract();if(!pointers.size)suppressClick=false;if(ev.pointerType==='touch'){pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});if(pointers.size>=2){startPinch();return;}}if(ev.target.closest('[data-map-cluster]'))return;startDrag(ev.pointerId,{x:ev.clientX,y:ev.clientY});};
 svg.onpointermove=ev=>{
  if(pointers.has(ev.pointerId))pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(pinch&&pointers.size>=2){const [a,b]=[...pointers.values()],distance=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},fraction=viewportFraction(mid.x,mid.y),next=scaledBox(pinch.box,pinch.distance/distance);next.x=pinch.anchor.x-fraction.x*next.w;next.y=pinch.anchor.y-fraction.y*next.h;updateViewport(next);return;}
  if(!drag||Math.hypot(ev.clientX-drag.x,ev.clientY-drag.y)<4)return;if(!drag.captured){svg.setPointerCapture(drag.pointerId);drag.captured=true;}suppressClick=true;updateViewport({...drag.box,x:drag.box.x-(ev.clientX-drag.x)*drag.scale,y:drag.box.y-(ev.clientY-drag.y)*drag.scale});
 };
 function endPointer(ev){if(ev)pointers.delete(ev.pointerId);if(pinch&&pointers.size<2){pinch=null;if(pointers.size===1){const [id,p]=pointers.entries().next().value;startDrag(id,p,true);return;}}drag=null;}
 svg.onpointerup=endPointer;svg.onpointercancel=endPointer;

}
window.HistoryMap={render,scopeLabel:scope=>labels[scope]||'地点范围'};
})();
