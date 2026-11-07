const {test}=require('node:test');
const a=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),H=require('../core.js');
test('原有上下册来源可以准确区分，并保留PDF文件名与页数',()=>{
a.match(H.sourceInfo('core').title,/徐涛/);
a.match(H.sourceInfo('leg').title,/上册/);
a.match(H.sourceInfo('legLower').title,/下册/);
a.equal(H.sourceInfo('legLower').maxPages,89);
a.equal(H.sourceInfo('legLower').path,'sources/2027考研政治--冲刺背诵手册-下册--腿姐陆寓丰.pdf');
a.notEqual(H.sourceInfo('leg').path,H.sourceInfo('legLower').path);
a.throws(()=>H.sourceInfo('missing'));
});
test('每份原书使用项目sources内的相对路径，发布内容不包含本机目录',()=>{
for(const book of ['core','leg','legLower']){
 const info=H.sourceInfo(book);
 a.equal(path.isAbsolute(info.path),false,book);
 a.equal(path.posix.dirname(info.path),'sources',book);
 a.match(path.posix.basename(info.path),/\.pdf$/);
 a.equal(info.path.includes('..'),false,book);
}
const audit=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/lower-early-audit.json'),'utf8'));
a.equal(audit.pdf,H.sourceInfo('legLower').path);
});
test('单文件版的原书链接相对应用位置解析，中文及空格路径保持正确',()=>{
a.equal(typeof H.sourcePDFURL,'function','应由已测试的来源函数生成原书链接');
const base='file:///tmp/history%20review/史脉.html';
for(const book of ['core','leg','legLower']){
 const url=new URL(H.sourcePDFURL(book,7,base));
 a.equal(url.protocol,'file:');
 a.equal(decodeURIComponent(url.pathname),'/tmp/history review/'+H.sourceInfo(book).path);
 a.equal(url.hash,'#page=7');
}
});
test('开发预览继续通过本机来源路由打开原书并定位页码',()=>{
a.equal(typeof H.sourcePDFURL,'function','应由已测试的来源函数生成原书链接');
a.equal(H.sourcePDFURL('legLower',25,'http://127.0.0.1:18740/index.html'),'/__source/legLower.pdf#page=25');
a.throws(()=>H.sourcePDFURL('missing',1,'file:///tmp/史脉.html'));
});
