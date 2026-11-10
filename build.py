import json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parent
books={'core':{'maxPages':324,'title':'徐涛·核心背诵笔记'},'leg':{'maxPages':240,'title':'腿姐·冲刺背诵手册上册'},'legLower':{'maxPages':89,'title':'腿姐·冲刺背诵手册下册'}}
events=[]
for name in ['era-early.json','era-modern.json']:
    events.extend(json.loads((ROOT/'data'/name).read_text()))
stage_file=ROOT/'data/revolution-stages.json'
phase_data=json.loads(stage_file.read_text()) if stage_file.exists() else {'stages':[],'assignments':[]}
stages=phase_data['stages'];stage_map={s['id']:s for s in stages};assignments={a['id']:a for a in phase_data['assignments']}
for e in events:
    a=assignments.get(e['id'])
    e['stageIds']=a['stageIds'] if a else []
    assert all(k in stage_map for k in e['stageIds']),e['id']
    e['stageNames']=[stage_map[k]['name'] for k in e['stageIds']]
    e['stageAliases']=[alias for k in e['stageIds'] for alias in stage_map[k].get('aliases',[])]
    e['stageNote']=a.get('note','') if a else ''
    e['stageSources']=phase_data.get('sourceBasis',[])[:1] if a else []
    if a:e['period']='revolution'
if stages:
    assert all(e.get('stageIds') for e in events if e['period']=='revolution'),'存在未映射的革命阶段节点'
# Reviewed supplements keep the original event IDs and are applied on every build.
enrichment_ids=set();reviewed_pages=set();enrichment_files=[]
enrichment_counts={'contentPoints':0,'significancePoints':0,'contextSections':0,'contextPoints':0,'hats':0,'confusions':0}
event_by_id={e['id']:e for e in events}
def append_unique(target,values):
    added=0
    for value in values:
        if value not in target:target.append(value);added+=1
    return added
for file in sorted((ROOT/'data').glob('enrichment-*.json')):
    supplement=json.loads(file.read_text());enrichment_files.append(file.name)
    for ref in supplement.get('reviewedPages',[]):reviewed_pages.add((ref['book'],ref['page']))
    for update in supplement.get('updates',[]):
        assert update['id'] in event_by_id,f"补充节点不存在：{file.name} {update['id']}"
        e=event_by_id[update['id']];enrichment_ids.add(e['id'])
        for source_key,dest,stat in [('contentAdd','content','contentPoints'),('significanceAdd','significance','significancePoints'),('confusionsAdd','confusions','confusions'),('hatsAdd','hats','hats')]:
            enrichment_counts[stat]+=append_unique(e.setdefault(dest,[]),update.get(source_key,[]))
        append_unique(e['sources'],update.get('sourcesAdd',[]))
        for section in update.get('contextSections',[]):
            assert section.get('title') and section.get('points') and section.get('sources'),f"补充专题缺少内容或来源：{e['id']}"
            assert all(isinstance(point,str) and point.strip() for point in section['points']),e['id']
            if section not in e.setdefault('contextSections',[]):
                e['contextSections'].append(section);enrichment_counts['contextSections']+=1;enrichment_counts['contextPoints']+=len(section['points'])
            append_unique(e['sources'],section['sources'])
enrichment={'updatedEvents':len(enrichment_ids),'reviewedPages':len(reviewed_pages),'files':enrichment_files,**enrichment_counts}
ids=set()
for e in events:
    assert e['id'] not in ids,e['id'];ids.add(e['id'])
    assert e['kind'] in ['会议','文章','政策','事件'],e['id']
    assert e['period'] in ['early','revolution','construction','reform','newera'],e['id']
    assert isinstance(e['year'],int) and 1840<=e['year']<=2026,e['id']
    assert len(e['content'])>=2 and e['significance'] and e['sources'],e['id']
    for s in e['sources']:
        if s['book']=='official':assert s['url'].startswith('http') and s['title'],e['id']
        else:assert s['book'] in books and isinstance(s['page'],int) and 1<=s['page']<=books[s['book']]['maxPages'],e['id']
    if e['kind'] not in e['topics']:e['topics'].append(e['kind'])
    month=re.search(r'年\s*(\d{1,2})\s*月',e['dateLabel'])
    if month:e['month']=int(month.group(1))
    day=re.search(r'月\s*(\d{1,2})\s*日',e['dateLabel'])
    if day:e['day']=int(day.group(1))
    for key in ['hats','confusions','related']:e.setdefault(key,[])
events.sort(key=lambda e:(e['year'],e.get('month',0)))
comparisons=json.loads((ROOT/'data/comparisons.json').read_text()) if (ROOT/'data/comparisons.json').exists() else []
for c in comparisons:
    assert all(x in ids for x in c['eventIds']),c['id']
for e in events:
    assert all(r in ids for r in e['related']),e['id']
source_by_key={}
if (ROOT/'data/source-pages.json').exists():
    source_by_key={(p['book'],p['page']):p for p in json.loads((ROOT/'data/source-pages.json').read_text())}
scope_file=ROOT.parent/'extracted/leg-lower-scope.json'
lower_scope=set(json.loads(scope_file.read_text())['pages']) if scope_file.exists() else set(range(7,31))
for book,filename,ranges in [('core','core',[(98,138),(204,272)]),('leg','leg',[(75,112),(167,213)]),('legLower','leg-lower',[])]:
    extraction=ROOT.parent/'extracted'/f'{filename}.json'
    if not extraction.exists():continue
    pages=json.loads(extraction.read_text())
    used={s['page'] for e in events for s in e['sources'] if s['book']==book}
    for p in pages:
        if p['text'].strip() and (p['page'] in used or any(a<=p['page']<=b for a,b in ranges) or book=='legLower' and p['page'] in lower_scope):
            source_by_key[(book,p['page'])]={'book':book,'page':p['page'],'text':p['text'],'ocr':book!='core'}
source_pages=sorted(source_by_key.values(),key=lambda p:(list(books).index(p['book']),p['page']))
for e in events:
    assert all(s['book']=='official' or (s['book'],s['page']) in source_by_key for s in e['sources']),e['id']
geography_file=ROOT/'data/event-geography.json'
land_file=ROOT/'data/land-policy-matrix.json'
geography=json.loads(geography_file.read_text()) if geography_file.exists() else {'entries':[]}
land=json.loads(land_file.read_text()) if land_file.exists() else {'entries':[]}
geo_by_id={g['eventId']:g for g in geography['entries']};land_by_id={g['eventId']:g for g in land['entries']}
assert len(geo_by_id)==len(geography['entries']) and set(geo_by_id)<=ids,'地理映射编号异常'
assert len(land_by_id)==len(land['entries']) and set(land_by_id)<=ids,'土地对比编号异常'
for e in events:
    if e['id'] in geo_by_id:
        g=geo_by_id[e['id']]
        assert g['scope'] in ['site','multi-site','region','national','international','unspecified'],e['id']
        for p in g.get('places',[]):assert isinstance(p['lon'],(int,float)) and isinstance(p['lat'],(int,float)) and -180<=p['lon']<=180 and -90<=p['lat']<=90,e['id']
        e['geography']=g
    if e['id'] in land_by_id:e['landPolicy']=land_by_id[e['id']]
geo_map={}
for key,name in [('china','china-provinces.geojson'),('world','world-land.geojson'),('source','map-source.json')]:
    file=ROOT/'data'/name
    if file.exists():geo_map[key]=json.loads(file.read_text())
data={'geoMap':geo_map,'geographyNotes':geography.get('notes',[]),'landPolicyNotes':land.get('notes',[]),'stages':stages,'stageDimensionNote':phase_data.get('stageDimensionNote',''),'events':events,'comparisons':comparisons,'sourcePages':source_pages,'meta':{'date':'2026-11-10','version':'1.7.0','enrichment':enrichment,'materials':[dict(book=key,**value) for key,value in books.items()],'coverageNote':'本轮对照腿姐上、下册及核心笔记，按节点补充意义、具体举措、原因与延伸考点；补充记录保留来源页，资料差异另作限定说明；徐涛 PDF 仍未收其正文引用的折页。覆盖统计说明当前资料范围，不等于对完整考试大纲的逐条认证。'}}
(ROOT/'data.js').write_text('window.HISTORY_DATA = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
(ROOT/'data/knowledge-base.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
(ROOT/'data/source-pages.json').write_text(json.dumps(source_pages,ensure_ascii=False,indent=2))
html=(ROOT/'index.html').read_text().replace('<link rel="stylesheet" href="style.css">','<style>'+(ROOT/'style.css').read_text()+'</style>')
for script in ['data.js','core.js','map.js','playback.js','panels.js','app.js']:
    html=html.replace('<script src="'+script+'"></script>','<script>'+(ROOT/script).read_text().replace('</script','<\\/script')+'</script>')
(ROOT/'史脉.html').write_text(html)
print(f"知识节点 {len(events)}；帽子表述 {sum(len(e['hats']) for e in events)}；对比专题 {len(comparisons)}；来源文本页 {len(source_pages)}")
