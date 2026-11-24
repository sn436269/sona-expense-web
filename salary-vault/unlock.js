'use strict';
(()=>{
 let resolveRecords;
 window.salaryRecordsReady=new Promise(resolve=>{resolveRecords=resolve});
 const form=document.querySelector('#unlock-form'),field=document.querySelector('#unlock-code'),submit=document.querySelector('#unlock-submit'),error=document.querySelector('#unlock-error');
 const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 let busy=false,unlocked=false;
 document.querySelector('#show-code').addEventListener('change',e=>{field.type=e.target.checked?'text':'password'});
 document.querySelector('#lock-vault').onclick=()=>location.reload();
 window.addEventListener('pageshow',e=>{if(e.persisted&&unlocked)location.reload()});
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;busy=true;submit.disabled=true;submit.textContent='正在解鎖…';error.hidden=true;
  try{
   if(!globalThis.crypto?.subtle)throw Error('請使用支援加密功能的新版瀏覽器，並以 HTTPS 網址開啟。');
   const response=await fetch('./vault.enc.json',{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
   if(!response.ok)throw Error('加密資料讀取失敗，請稍後再試。');
   const envelope=await response.json();
   if(envelope.format!=='medici-salary-v1'||envelope.iterations!==600000||envelope.compression!=='gzip')throw Error('資料格式不相符，請重新整理。');
   if(!Array.isArray(envelope.ciphertextParts)||envelope.ciphertextParts.length!==4||envelope.ciphertextParts.some((v,i)=>v!=='vault.enc.'+(i+1)+'.txt'))throw Error('加密資料索引不相符。');
   const segments=await Promise.all(envelope.ciphertextParts.map(async path=>{const r=await fetch('./'+path,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error('加密資料下載未完成，請稍後重試。');return r.text()}));
   const ciphertext=segments.join('');
   const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(field.value.trim()),'PBKDF2',false,['deriveKey']);
   const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(envelope.salt),iterations:envelope.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
   let decrypted;
   try{decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(envelope.iv)},key,bytes(ciphertext))}catch{throw Error('解鎖碼不正確，或資料未完整下載。請確認後再試。')}
   const stream=new Blob([decrypted]).stream().pipeThrough(new DecompressionStream('gzip'));
   const records=JSON.parse(await new Response(stream).text());
   if(!Array.isArray(records.people)||!Array.isArray(records.summary)||!Array.isArray(records.pay))throw Error('資料結構不完整。');
   field.value='';document.querySelector('#unlock-panel').hidden=true;document.body.classList.remove('vault-locked');document.querySelector('#lock-vault').hidden=false;unlocked=true;resolveRecords(records);new Uint8Array(decrypted).fill(0);
   setTimeout(()=>location.reload(),3*60*60*1000);
  }catch(e){error.textContent=e.message||'解鎖失敗，請重新確認。';error.hidden=false;field.focus()}
  finally{busy=false;submit.disabled=false;submit.textContent='解鎖資料'}
 });
})();
