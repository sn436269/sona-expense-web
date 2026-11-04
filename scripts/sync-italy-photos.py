"""Publish only sanitized public previews and album metadata, never originals or owner credentials."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen,Request
from urllib.parse import urlparse
import json,re,sys,zipfile,tempfile,shutil
root=Path(__file__).resolve().parents[1]/'italy-2026';config=json.loads((root/'photo-service.json').read_text());base=config.get('baseUrl','').rstrip('/')
u=urlparse(base)
if u.scheme!='https' or not u.hostname.endswith('.trycloudflare.com'):raise ValueError('Unexpected album host')
def get(path,timeout=60):return urlopen(Request(base+path,headers={'User-Agent':'SonaItalyAlbumSync/1'}),timeout=timeout)
try:
 with get('/api/photos',20) as r:data=json.load(r)
except Exception:
 print('Photo computer is offline; existing website photos are preserved.');sys.exit(0)
photos=data.get('photos')
if not isinstance(photos,list):raise ValueError('Invalid album response')
for p in photos:
 if not re.fullmatch('[a-f0-9]{24}',p.get('id','')):raise ValueError('Invalid image ID')
 p['staticUrl']='photos/'+p['id']+'.jpg'
# A public index contains no filesystem paths, hashes, credentials or private metadata.
data={'photos':[{k:p.get(k,'') for k in ['id','spotId','title','caption','uploadedAt','takenAt','width','height','originalName','staticUrl']} for p in photos]}
folder=root/'photos';folder.mkdir(exist_ok=True);wanted={p['id']+'.jpg' for p in photos};missing=[p for p in photos if not (folder/(p['id']+'.jpg')).exists()]
if len(missing)>100:
 with tempfile.TemporaryDirectory() as td:
  archive=Path(td)/'public.zip'
  with get('/api/export',180) as r,archive.open('wb') as f:shutil.copyfileobj(r,f)
  with zipfile.ZipFile(archive) as z:
   for info in z.infolist():
    name=Path(info.filename)
    if name.parent.as_posix()=='photos' and name.name in wanted:
     if info.file_size>8*1024*1024:raise ValueError('Preview too large')
     (folder/name.name).write_bytes(z.read(info))
else:
 def download(p):
  with get('/media/web/'+p['id']+'.jpg') as r:body=r.read(8*1024*1024+1)
  if len(body)>8*1024*1024 or not body.startswith(b'\xff\xd8'):raise ValueError('Invalid preview')
  (folder/(p['id']+'.jpg')).write_bytes(body)
 with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(download,missing))
for file in folder.glob('*.jpg'):
 if file.name not in wanted:file.unlink()
for name in wanted:
 if not (folder/name).exists():raise ValueError('Missing preview '+name)
(root/'photos.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print('Published preview index:',len(photos),'photos;',len(missing),'new previews')
