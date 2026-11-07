const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const H=require('./core.js');
const pdfs=Object.fromEntries(['core','leg','legLower'].map(book=>[book,path.resolve(root,H.sourceInfo(book).path)]));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.pdf':'application/pdf','.png':'image/png','.md':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
 let file;const match=pathname.match(/^\/__source\/(core|leg|legLower)\.pdf$/);
 if(match)file=pdfs[match[1]];else{file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}}
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);return res.end('Not found');}const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};let start=0,end=stat.size-1;const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);if(range){start=Number(range[1]);end=range[2]?Math.min(Number(range[2]),end):end;if(start>end){res.writeHead(416);return res.end();}headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;}headers['Content-Length']=end-start+1;res.writeHead(range?206:200,headers);if(req.method==='HEAD')res.end();else fs.createReadStream(file,{start,end}).pipe(res);});
});
server.listen(Number(process.env.PORT)||18740,'127.0.0.1',()=>console.log('史脉已启动：http://127.0.0.1:'+server.address().port));
