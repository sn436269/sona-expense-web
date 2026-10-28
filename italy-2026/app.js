(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const norm = s => s.toLocaleLowerCase().normalize('NFKC');
  const days = $$('.day');
  function filterDays() {
    const query = norm($('#search').value.trim()); let shown = 0;
    days.forEach(day => {
      day.hidden = !((!query || norm(day.textContent + day.dataset.date).includes(query)) && (!$('#city').value || day.dataset.city.includes($('#city').value)));
      if (!day.hidden) {shown++; if (query) day.open = true;}
    });
    $('#result-count').textContent = `顯示 ${shown} / ${days.length} 段手札`; $('#empty').hidden = shown > 0;
  }
  $('#search').addEventListener('input',filterDays); $('#city').addEventListener('change',filterDays);
  $('#clear').onclick = () => {$('#search').value='';$('#city').value='';filterDays();};
  $('#expand').onclick = () => days.filter(d=>!d.hidden).forEach(d=>d.open=true);
  $('#collapse').onclick = () => days.forEach(d=>d.open=false);
  $('#print').onclick = () => window.print();
  let printState;
  addEventListener('beforeprint',()=>{printState=$$('details').map(el=>({el,open:el.open})); printState.forEach(({el})=>el.open=true);});
  addEventListener('afterprint',()=>printState?.forEach(({el,open})=>el.open=open));
  function followHash() {
    const id=location.hash.slice(1),target=document.getElementById(id);
    if (!target?.classList.contains('day')) return;
    if(target.hidden){$('#search').value='';$('#city').value='';filterDays();}
    target.open=true;
    $$('.date-rail a').forEach(a=>a.classList.toggle('active',a.hash===location.hash));
    requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
  }
  addEventListener('hashchange',followHash);
  $$('.date-rail a').forEach(a=>a.addEventListener('click',()=>{const d=document.getElementById(a.hash.slice(1));d.open=true;if(d.hidden){$('#search').value='';$('#city').value='';filterDays();}if(location.hash===a.hash)followHash();}));
  $$('dialog .close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  $$('dialog').forEach(d=>d.addEventListener('click',ev=>{if(ev.target===d){const r=d.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)d.close();}}));
  filterDays();followHash();

  let places=[], photos=[], service='', selected='', openedPhoto='', uploading=false;
  const keyInput=$('#owner-key'), form=$('#upload-form'), status=$('#upload-status');
  try {
    const fragment=new URLSearchParams(location.hash.slice(1));
    if(fragment.has('manage')) {sessionStorage.setItem('italy-owner',fragment.get('manage')); history.replaceState(null,'',location.pathname+location.search+'#albums');}
    keyInput.value=sessionStorage.getItem('italy-owner')||'';
  } catch (_) {}
  function savedKey(){return keyInput.value.trim();}
  function setKey(){try{sessionStorage.setItem('italy-owner',savedKey());}catch(_){} }
  function validService(value) {try{const u=new URL(value);return (u.protocol==='https:' || ['127.0.0.1','localhost'].includes(u.hostname)) && !u.username && !u.password ? u.origin : '';}catch(_){return '';}}
  const api=(path)=>service+path;
  async function request(path,options={}) {
    if(!service)throw new Error('照片相簿尚未連線，請保持相簿電腦在線後再試。');
    const r=await fetch(api(path),{...options,signal:AbortSignal.timeout(20000)});
    const body=await r.json();if(!r.ok)throw new Error(body.error||'照片相簿暫時無法連線，請稍後重試。');return body;
  }
  function renderPhotos(){
    $$('[data-photos]').forEach(grid=>{
      const list=photos.filter(p=>p.spotId===grid.dataset.photos);grid.replaceChildren();
      grid.nextElementSibling.hidden=list.length>0;
      list.forEach(p=>{const b=document.createElement('button');b.type='button';b.className='photo-thumb';b.setAttribute('aria-label','放大 '+p.title);const im=document.createElement('img');im.src=api('/media/thumb/'+p.id+'.jpg');im.loading='lazy';im.alt=p.title;im.width=640;im.height=640;b.append(im);b.onclick=()=>openPhoto(p);grid.append(b);});
    });
  }
  async function refreshPhotos(){
    try {const data=await request('/api/photos');photos=data.photos;renderPhotos();$('#connection-status').textContent=photos.length?`已收藏 ${photos.length} 張旅行照片。`:'相簿已準備好，選一個景點或作品，就能新增第一張照片。';$('#connection-status').classList.remove('offline');}
    catch(_){$('#connection-status').textContent='照片相簿目前未連線。景點與作品仍可瀏覽；上傳照片時，請讓相簿電腦保持在線。';$('#connection-status').classList.add('offline');}
  }
  function filterAlbums(){
    const query=norm($('#album-search').value.trim()), city=$('#album-city').value, kind=$('#album-kind').value;let count=0;
    $$('.city-albums').forEach(group=>{
      let shown=0;
      group.querySelectorAll('.album-card').forEach(card=>{
        card.hidden=!!((city&&group.dataset.albumCity!==city)||(kind&&card.dataset.kind!==kind)||(query&&!norm(card.dataset.search).includes(query)));
        if(!card.hidden){shown++;count++;}
      });
      group.querySelectorAll('.artworks').forEach(art=>{art.hidden=![...art.querySelectorAll('.album-card')].some(c=>!c.hidden);if(query||kind)art.open=true;});
      group.hidden=!shown;if(shown&&(query||city||kind))group.open=true;
    });
    $('#album-count').textContent=`${count} 個景點與作品相簿`;$('#album-no-results').hidden=count>0;
  }
  ['album-search','album-city','album-kind'].forEach(id=>$('#'+id).addEventListener(id==='album-search'?'input':'change',filterAlbums));
  function openUpload(id){
    selected=id||'';const p=places.find(p=>p.id===id);
    $('#upload-title').textContent=p?'新增照片':'相簿管理';$('#upload-place').textContent=p?`${p.city} · ${p.title}${p.artist?' · '+p.artist:''}`:'輸入管理碼後，關閉此視窗並選擇要新增照片的景點或作品。';
    $('#photo-files').closest('label').hidden=!p;$('#photo-caption').closest('label').hidden=!p;$('#upload-submit').hidden=!p;$('.upload-note').hidden=!p;
    status.textContent='';$('#upload-progress').hidden=true;$('#service-url').value=service;$('#upload-dialog').showModal();
  }
  $('#manage').onclick=()=>openUpload(''); keyInput.addEventListener('change',setKey);
  $$('.upload-button').forEach(b=>b.onclick=()=>openUpload(b.dataset.upload));
  $$('.map-button').forEach(b=>b.onclick=()=>{
    const p=places.find(p=>p.id===b.dataset.map);if(!p)return;
    $('#map-title').textContent=p.title;$('#map-external').href=p.mapUrl;
    $('#map-dialog').showModal();$('#map-frame').loading='eager';$('#map-frame').src='https://maps.google.com/maps?q='+encodeURIComponent(p.mapQuery)+'&z=16&output=embed';
  });
  $('#map-dialog').addEventListener('close',()=>$('#map-frame').src='about:blank');
  $$('[data-reveal]').forEach(b=>b.onclick=()=>{
    $('#album-search').value='';$('#album-kind').value='';$('#album-city').value='';filterAlbums();
    const card=document.getElementById('spot-'+b.dataset.reveal);let ancestor=card.parentElement;while(ancestor){if(ancestor.tagName==='DETAILS')ancestor.open=true;ancestor=ancestor.parentElement;}card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.add('highlight');setTimeout(()=>card.classList.remove('highlight'),2500);
  });
  $('#save-service').onclick=async()=>{const next=validService($('#service-url').value);if(!next){status.textContent='請輸入有效的 HTTPS 相簿網址。';return;}service=next;try{localStorage.setItem('italy-service',next);}catch(_){} await refreshPhotos();status.textContent='已更新照片連線。';};
  function uploadFile(file,index,total){return new Promise((resolve,reject)=>{
    const q=new URLSearchParams({spotId:selected,name:file.name,caption:$('#photo-caption').value});const xhr=new XMLHttpRequest();xhr.open('POST',api('/api/photos?'+q));xhr.timeout=240000;xhr.setRequestHeader('Authorization','Bearer '+savedKey());xhr.setRequestHeader('Content-Type','application/octet-stream');
    xhr.upload.onprogress=ev=>{if(ev.lengthComputable){$('#upload-progress').value=Math.round(((index+ev.loaded/ev.total)/total)*100);status.textContent=`正在保存第 ${index+1} / ${total} 張照片…`;}};
    xhr.onload=()=>{let body;try{body=JSON.parse(xhr.responseText);}catch(_){reject(new Error('照片尚未確認保存，請重試。'));return;}if(xhr.status>=200&&xhr.status<300&&body.backedUp)resolve(body);else reject(new Error(body.error||'照片尚未保存成功，請重試。'));};
    xhr.onerror=()=>reject(new Error('連線中斷。已成功的照片會保留，請重新選取未完成的照片。'));xhr.ontimeout=()=>reject(new Error('照片處理逾時，請稍後重新整理相簿確認。'));xhr.send(file);
  });}
  form.addEventListener('submit',async ev=>{
    ev.preventDefault();if(uploading)return;setKey();const files=[...$('#photo-files').files];
    if(!selected||!files.length){status.textContent='請先選擇要上傳的照片。';return;}
    if(files.some(f=>f.size>45*1024*1024)){status.textContent='有照片超過 45 MB，請換一張較小的照片。';return;}
    uploading=true;$('#upload-submit').disabled=true;$('#photo-files').disabled=true;let done=0;
    try {await request('/api/auth',{method:'POST',headers:{Authorization:'Bearer '+savedKey()}});$('#upload-progress').hidden=false;
      for(let i=0;i<files.length;i++){await uploadFile(files[i],i,files.length);done++;}
      status.textContent=`${done} 張照片已加入相簿，原始檔也已備份至電腦。`;$('#photo-files').value='';$('#photo-caption').value='';await refreshPhotos();
    }catch(err){status.textContent=(done?`已保存 ${done} 張。`:'')+(err.message||'上傳失敗，請重試。');await refreshPhotos();}
    finally{uploading=false;$('#upload-submit').disabled=false;$('#photo-files').disabled=false;}
  });
  $('#upload-dialog').addEventListener('cancel',ev=>{if(uploading)ev.preventDefault();});
  $('#upload-dialog .close-dialog').onclick=()=>{if(uploading){status.textContent='正在保存照片，請等待這一批完成。';return;}$('#upload-dialog').close();};
  function openPhoto(p){openedPhoto=p.id;$('#photo-title').textContent=p.title;$('#photo-full').src=api('/media/display/'+p.id+'.jpg');$('#photo-full').alt=p.title;$('#photo-description').textContent=p.caption;$('#archive-photo').hidden=!savedKey();$('#photo-dialog').showModal();}
  $('#archive-photo').onclick=async()=>{try{await request('/api/photos/'+openedPhoto+'/archive',{method:'POST',headers:{Authorization:'Bearer '+savedKey()}});$('#photo-dialog').close();await refreshPhotos();}catch(err){$('#photo-description').textContent=err.message;}};
  Promise.all([fetch('places.json').then(r=>r.json()),fetch('photo-service.json',{cache:'no-store'}).then(r=>r.json()).catch(()=>({}))]).then(([catalog,config])=>{
    places=catalog.places;let custom='';try{custom=localStorage.getItem('italy-service')||'';}catch(_){}service=validService(custom)||validService(config.baseUrl);filterAlbums();refreshPhotos();
  }).catch(()=>{$('#connection-status').textContent='相簿資料暫時無法讀取，請重新整理網頁。';});
})();
