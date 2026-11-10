const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),H=require('../core.js');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const esc=app.slice(app.indexOf('const esc='),app.indexOf('const $='));
const points=app.slice(app.indexOf('function points('),app.indexOf('function detailContent('));
test('历史意义的整条表述使用语义加粗，并继续转义原始文字',()=>{const html=vm.runInNewContext(esc+points+'points(items,true)',{items:['标志：开始形成新局面','<script>alert(1)</script>']});a.match(html,/<strong\b[^>]*>标志：开始形成新局面<\/strong>/);a.equal(html.includes('<script>'),false);a.match(html,/&lt;script&gt;/);});
test('附在事件中的原因、举措等补充考点可被全文搜索命中',()=>{const e={id:'x',year:1840,title:'鸦片战争',period:'early',kind:'事件',topics:[],content:[],significance:[],hats:[],confusions:[],contextSections:[{title:'社会性质形成原因',points:['列强侵略破坏中国主权，同时保存封建统治势力'],sources:[{book:'leg',page:165}]}]};a.deepEqual(H.filterEvents([e],{query:'保存封建统治势力'}).map(x=>x.id),['x']);a.equal(H.filterEvents([e],{query:'社会性质形成原因'}).length,1);});
