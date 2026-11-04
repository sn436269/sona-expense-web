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
    if ($('#quick-date')) $('#quick-date').value=id;
    $$('.date-rail a').forEach(a=>a.classList.toggle('active',a.hash===location.hash));
    requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
  }
  $('#quick-date')?.addEventListener('change', ev => {if (ev.target.value) {location.hash=ev.target.value;followHash();}});
  addEventListener('hashchange',followHash);
  $$('.date-rail a').forEach(a=>a.addEventListener('click',()=>{const d=document.getElementById(a.hash.slice(1));d.open=true;if(d.hidden){$('#search').value='';$('#city').value='';filterDays();}if(location.hash===a.hash)followHash();}));
  $$('dialog .close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  $$('dialog').forEach(d=>d.addEventListener('click',ev=>{if(ev.target===d){const r=d.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)d.close();}}));
  filterDays();followHash();

  let places=[], photos=[], staticPhotos=[], service='', selected='', openedPhoto='', uploading=false, verifiedKey='', manageFromLink=false;
  const keyInput=$('#owner-key'), form=$('#upload-form'), status=$('#upload-status');
  try {
    const fragment=new URLSearchParams(location.hash.slice(1));
    if(fragment.has('manage')) {manageFromLink=true;sessionStorage.setItem('italy-owner',fragment.get('manage')); history.replaceState(null,'',location.pathname+location.search+'#albums');}
    keyInput.value=sessionStorage.getItem('italy-owner')||'';
  } catch (_) {}
  function savedKey(){return keyInput.value.trim().normalize('NFKC');}
  function isManager(){return !!verifiedKey && verifiedKey===savedKey();}
  function setKey(){try{sessionStorage.setItem('italy-owner',savedKey());}catch(_){} }
  function validService(value) {try{const u=new URL(value);return (u.protocol==='https:' || ['127.0.0.1','localhost'].includes(u.hostname)) && !u.username && !u.password ? u.origin : '';}catch(_){return '';}}
  const api=(path)=>service+path;
  async function request(path,options={}) {
    if(!service)throw new Error('照片相簿尚未連線，請保持相簿電腦在線後再試。');
    const r=await fetch(api(path),{...options,signal:AbortSignal.timeout(30000)});
    const body=await r.json();if(!r.ok){const err=new Error(r.status===401?'管理碼不正確，請確認大小寫。全形、半形都可以。':(body.error||'照片相簿暫時無法連線，請稍後重試。'));err.status=r.status;throw err;}return body;
  }
  const photoLimit=new Map();
  let livePhotos=false;
  const photoSource=(p,kind)=>livePhotos?api('/media/'+kind+'/'+p.id+'.jpg'):(p.staticUrl||'photos/'+p.id+'.jpg');
  function picture(p,kind='thumb'){
    const im=document.createElement('img');im.src=photoSource(p,kind);im.loading='lazy';im.alt=p.title;im.width=640;im.height=640;
    im.onerror=()=>{im.onerror=null;im.src=p.staticUrl||'photos/'+p.id+'.jpg';};return im;
  }
  function moveControls(p){
    const box=document.createElement('div');box.className='classify-controls';
    const city=document.createElement('select'),venue=document.createElement('select'),work=document.createElement('select'),save=document.createElement('button'),msg=document.createElement('p');
    city.setAttribute('aria-label','選擇城市');venue.setAttribute('aria-label','選擇景點或美術館');work.setAttribute('aria-label','選擇作品與作者');save.type='button';save.className='upload-button';save.textContent='移入這個相簿';msg.setAttribute('role','status');
    const option=(select,value,label)=>{const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);};
    option(city,'','選擇城市');[...new Set(places.map(p=>p.city))].forEach(c=>option(city,c,c));
    function venues(){venue.replaceChildren();option(venue,'','選擇景點／美術館');places.filter(p=>p.city===city.value&&!p.parent).forEach(p=>option(venue,p.id,p.title));works();}
    function works(){work.replaceChildren();option(work,'','景點照片／不指定作品');places.filter(p=>p.parent===venue.value).forEach(p=>option(work,p.id,p.title+(p.artist?' · '+p.artist:'')));work.disabled=work.options.length===1;save.disabled=!venue.value;}
    city.onchange=venues;venue.onchange=works;venues();
    const current=places.find(x=>x.id===p.spotId);
    if(current){city.value=current.city;venues();venue.value=current.parent||current.id;works();if(current.parent)work.value=current.id;}
    save.onclick=async()=>{
      const target=work.value||venue.value;if(!target)return;save.disabled=true;msg.textContent='正在移動照片…';
      try{await request('/api/photos/'+p.id+'/move',{method:'POST',headers:{Authorization:'Bearer '+encodeURIComponent(savedKey()),'Content-Type':'application/json'},body:JSON.stringify({spotId:target})});
        p.spotId=target;p.title=places.find(x=>x.id===target)?.title||p.title;await refreshPhotos();msg.textContent='✓ 已移入 '+p.title;$('#album-notice').hidden=false;$('#album-notice').textContent='✓ 照片已移入「'+p.title+'」，原始備份保留。';
      }catch(err){msg.textContent='移動未完成：'+err.message;}finally{save.disabled=false;}
    };
    box.append(city,venue,work,save,msg);return box;
  }
  function renderPhotos(){
    const renderGrid=(grid,list,pending=false)=>{
      grid.replaceChildren();grid.parentElement.querySelector('.photos-more')?.remove();
      const key=grid.dataset.photos||'pending',limit=photoLimit.get(key)|| (pending?24:12);
      list.slice(0,limit).forEach(p=>{
        const b=document.createElement('button');b.type='button';b.className='photo-thumb';b.setAttribute('aria-label','放大 '+p.title);b.append(picture(p));b.onclick=()=>openPhoto(p);
        const item=document.createElement('div');item.className='photo-item';item.append(b);
        if(isManager()){
          const del=document.createElement('button');del.type='button';del.className='photo-delete';del.textContent='×';del.title='刪除照片';del.setAttribute('aria-label','刪除 '+p.title+'（保留電腦備份）');del.onclick=()=>removePhoto(p);item.append(del);
          if(pending)item.append(moveControls(p));
        }
        if(pending){
          const m=/^2026:(\d{2}):(\d{2})/.exec(p.takenAt||'');
          if(m){const context=document.createElement('p');context.className='photo-context';const hint={'01-23':'台北／四川','01-24':'羅馬','01-25':'羅馬／梵蒂岡','01-26':'羅馬／佛羅倫斯','01-27':'佛羅倫斯','01-28':'佛羅倫斯','01-29':'佛羅倫斯／菲耶索萊','01-30':'佛羅倫斯／波隆那','01-31':'托斯卡尼一日遊','02-01':'佛羅倫斯','02-02':'佛羅倫斯／盧卡','02-03':'佛羅倫斯／羅馬','02-04':'羅馬／蒂沃利','02-05':'羅馬','02-06':'羅馬'}[m[1]+'-'+m[2]]||'';context.textContent=Number(m[1])+'/'+Number(m[2])+(hint?' · '+hint:'');item.insertBefore(context,item.querySelector('.classify-controls'));}
        }
        grid.append(item);
      });
      if(list.length>limit){const more=document.createElement('button');more.className='text-button photos-more';more.textContent=`顯示更多照片（已顯示 ${Math.min(limit,list.length)} / ${list.length} 張）`;more.onclick=()=>{photoLimit.set(key,limit+24);renderGrid(grid,list,pending);};grid.after(more);}
    };
    $$('[data-photos]').forEach(grid=>{
      const list=photos.filter(p=>p.spotId===grid.dataset.photos);renderGrid(grid,list);grid.nextElementSibling?.classList.contains('photo-empty')&&(grid.nextElementSibling.hidden=list.length>0);
      const empty=grid.parentElement.querySelector('.photo-empty');if(empty)empty.hidden=list.length>0;
      let count=grid.parentElement.querySelector('.photo-count');if(!count){count=document.createElement('p');count.className='photo-count';grid.before(count);}count.textContent=list.length?`${list.length} 張照片`:'';
    });
    const pending=photos.filter(p=>p.spotId==='pending'||!places.some(x=>x.id===p.spotId));
    $('#pending-count').textContent=`${pending.length} 張照片`;
    $('#pending-help').textContent=isManager()?'選擇城市、景點／美術館；若是作品，再選作品名稱與作者，按「移入這個相簿」。':'驗證相簿管理碼後，可用每張照片下方的選單分類，或點右上角 × 移除照片。';
    renderGrid($('#pending-grid'),pending,true);
  }
  async function refreshPhotos(){
    try{
      const data=await request('/api/photos');photos=data.photos;livePhotos=true;renderPhotos();$('#connection-status').textContent=`已收藏 ${photos.length} 張旅行照片 · 手機與電腦共用相簿`;$('#connection-status').classList.remove('offline');
    }catch(_){
      livePhotos=false;if(!photos.length)photos=staticPhotos;renderPhotos();
      $('#connection-status').textContent=photos.length?`已收藏 ${photos.length} 張旅行照片。照片可照常瀏覽；新增、刪除與分類時，請讓相簿電腦保持連線。`:'照片相簿目前未連線，請稍後重新整理。';$('#connection-status').classList.add('offline');
    }
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
    $('#upload-title').textContent=p?'新增照片':'相簿管理';$('#upload-place').textContent=p?`${p.city} · ${p.title}${p.artist?' · '+p.artist:''}`:'先按「驗證管理碼」。成功後，可上傳照片，也可點照片旁的「刪除」移除不需要的照片。';
    $('#photo-files').closest('label').hidden=!p;$('#photo-caption').closest('label').hidden=!p;$('#upload-submit').hidden=!p;$('.upload-note').hidden=!p;
    status.textContent='';$('#upload-results').replaceChildren();$('#file-selection').textContent=$('#photo-files').files.length?`已選擇 ${$('#photo-files').files.length} 張，尚未上傳。`:'尚未選擇照片。';$('#key-status').textContent=isManager()?'管理碼正確，已啟用相簿管理。':'尚未驗證管理碼；只區分大小寫，全形、半形都可以。';$('#upload-progress').hidden=true;$('#service-url').value=service;$('#upload-dialog').showModal();
  }
  $('#manage').onclick=()=>openUpload(''); keyInput.addEventListener('change',setKey);
  keyInput.addEventListener('input',()=>{verifiedKey='';$('#key-status').textContent='管理碼已變更，請按「驗證管理碼」。';$('#manage').textContent='相簿管理';renderPhotos();});
  $('#show-key').onclick=()=>{keyInput.type=keyInput.type==='password'?'text':'password';$('#show-key').textContent=keyInput.type==='password'?'顯示管理碼':'隱藏管理碼';};
  async function verifyKey(){
    $('#verify-key').disabled=true;$('#key-status').textContent='正在驗證管理碼…';
    try{await request('/api/auth',{method:'POST',headers:{Authorization:'Bearer '+encodeURIComponent(savedKey())}});verifiedKey=savedKey();setKey();$('#key-status').textContent='✓ 管理碼正確，已啟用上傳與刪除。';$('#manage').textContent='相簿管理 · 已驗證';renderPhotos();return true;}
    catch(err){verifiedKey='';$('#key-status').textContent=err.status===401?err.message:'無法連線驗證，請重試；這不代表管理碼錯誤。';renderPhotos();return false;}
    finally{$('#verify-key').disabled=false;}
  }
  $('#verify-key').onclick=verifyKey;
  $('#photo-files').addEventListener('change',()=>{$('#file-selection').textContent=`已選擇 ${$('#photo-files').files.length} 張，尚未上傳。請按「上傳並加入相簿」。`;$('#upload-results').replaceChildren();});
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
    const q=new URLSearchParams({spotId:selected,name:file.name,caption:$('#photo-caption').value});const xhr=new XMLHttpRequest();xhr.open('POST',api('/api/photos?'+q));xhr.timeout=240000;xhr.setRequestHeader('Authorization','Bearer '+encodeURIComponent(savedKey()));xhr.setRequestHeader('Content-Type','application/octet-stream');
    xhr.upload.onprogress=ev=>{if(ev.lengthComputable){$('#upload-progress').value=Math.round(((index+ev.loaded/ev.total)/total)*100);status.textContent=`正在保存第 ${index+1} / ${total} 張照片…`;}};
    xhr.onload=()=>{let body;try{body=JSON.parse(xhr.responseText);}catch(_){reject(new Error('照片尚未確認保存，請重試。'));return;}if(xhr.status>=200&&xhr.status<300&&body.backedUp)resolve(body);else reject(new Error(body.error||'照片尚未保存成功，請重試。'));};
    xhr.onerror=()=>reject(new Error('連線中斷。已成功的照片會保留，請重新選取未完成的照片。'));xhr.ontimeout=()=>reject(new Error('照片處理逾時，請稍後重新整理相簿確認。'));xhr.send(file);
  });}
  form.addEventListener('submit',async ev=>{
    ev.preventDefault();if(uploading)return;setKey();const files=[...$('#photo-files').files];
    if(!selected||!files.length){status.textContent='請先選擇要上傳的照片。';return;}
    if(files.some(f=>f.size>45*1024*1024)){status.textContent='有照片超過 45 MB，請換一張較小的照片。';return;}
    uploading=true;$('#upload-submit').disabled=true;$('#photo-files').disabled=true;let done=0;
    try {if(!await verifyKey())return;$('#upload-progress').hidden=false;$('#upload-results').replaceChildren();
      for(let i=0;i<files.length;i++){await uploadFile(files[i],i,files.length);done++;const li=document.createElement('li');li.textContent=`✓ ${files[i].name}：已上傳並備份`;$('#upload-results').append(li);}
      status.textContent=`✓ 上傳成功：${done} / ${files.length} 張已加入相簿，原始檔已備份。`;$('#file-selection').textContent='這一批已完成。';$('#album-notice').hidden=false;$('#album-notice').textContent=`✓ ${places.find(p=>p.id===selected)?.title||'相簿'}：${done} 張照片已上傳成功並備份。`;const card=document.getElementById('spot-'+selected);if(card){let a=card.parentElement;while(a){if(a.tagName==='DETAILS')a.open=true;a=a.parentElement;}}$('#photo-files').value='';$('#photo-caption').value='';await refreshPhotos();
    }catch(err){status.textContent=`上傳未完成：已保存 ${done} / ${files.length} 張。`+(err.message||'請重試。');await refreshPhotos();}
    finally{uploading=false;$('#upload-submit').disabled=false;$('#photo-files').disabled=false;}
  });
  $('#upload-dialog').addEventListener('cancel',ev=>{if(uploading)ev.preventDefault();});
  $('#upload-dialog .close-dialog').onclick=()=>{if(uploading){status.textContent='正在保存照片，請等待這一批完成。';return;}$('#upload-dialog').close();};
  function openPhoto(p){openedPhoto=p.id;$('#photo-title').textContent=p.title;$('#photo-full').src=photoSource(p,'display');$('#photo-full').onerror=()=>{$('#photo-full').onerror=null;$('#photo-full').src=p.staticUrl||'photos/'+p.id+'.jpg';};$('#photo-full').alt=p.title;$('#photo-description').textContent=p.caption;$('#archive-photo').hidden=!isManager();$('#photo-classify').replaceChildren();if(isManager())$('#photo-classify').append(moveControls(p));$('#photo-dialog').showModal();}
  async function removePhoto(p){
    if(!isManager()){openUpload(p.spotId);return;}
    if(!confirm('從網站相簿刪除這張照片？電腦原始備份會保留。'))return;
    try{await request('/api/photos/'+p.id+'/archive',{method:'POST',headers:{Authorization:'Bearer '+encodeURIComponent(savedKey())}});if($('#photo-dialog').open)$('#photo-dialog').close();await refreshPhotos();$('#album-notice').hidden=false;$('#album-notice').textContent='照片已從網站刪除，電腦原始備份仍保留。';}
    catch(err){$('#album-notice').hidden=false;$('#album-notice').textContent='刪除未完成：'+err.message;if($('#photo-dialog').open)$('#photo-description').textContent=err.message;}
  }
  $('#archive-photo').onclick=()=>{const p=photos.find(p=>p.id===openedPhoto);if(p)removePhoto(p);};
  Promise.all([fetch('places.json',{cache:'no-store'}).then(r=>r.json()),fetch('photo-service.json',{cache:'no-store'}).then(r=>r.json()).catch(()=>({})),fetch('photos.json',{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}))]).then(([catalog,config,snapshot])=>{
    places=catalog.places;staticPhotos=snapshot.photos||[];photos=staticPhotos;if(photos.length)renderPhotos();let custom='';try{custom=localStorage.getItem('italy-service')||'';}catch(_){}service=validService(custom)||validService(config.baseUrl);filterAlbums();refreshPhotos().then(async()=>{if($('#connection-status').classList.contains('offline')&&custom&&validService(config.baseUrl)!==service){service=validService(config.baseUrl);try{localStorage.removeItem('italy-service');}catch(_){}await refreshPhotos();}if(savedKey()){if(manageFromLink)openUpload('');await verifyKey();}});
  }).catch(()=>{$('#connection-status').textContent='相簿資料暫時無法讀取，請重新整理網頁。';});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&places.length)refreshPhotos();});
  setInterval(()=>{if(!document.hidden&&places.length&&!uploading)refreshPhotos();},60000);
})();
