'use strict';
(()=>{
 let resolveRecords;window.salaryRecordsReady=new Promise(resolve=>{resolveRecords=resolve});
 const $=s=>document.querySelector(s),form=$('#unlock-form'),field=$('#unlock-code'),submit=$('#unlock-submit'),error=$('#unlock-error'),otpForm=$('#otp-form'),send=$('#otp-send'),otpSubmit=$('#otp-submit');
 const endpoint='https://script.google.com/macros/s/AKfycbxI_-kPzpAy3DZ0XRIeEJyO4cpFigBItsfMNXDc6MHu5-RhwqUYHDA87eA3IkBoHT1_/exec';
 const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)),hex=b=>Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,'0')).join('');
 let busy=false,unlocked=false,lockedUntil=0,otpId='',statusKnown=false;
 async function rpc(request){const response=await fetch(endpoint,{method:'POST',credentials:'omit',redirect:'follow',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({protocol:'private-web-v1',service:'salary',request}),signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('登入服務暫時無法連線，請稍後重試。');const result=await response.json();if(!result.ok)throw Error(result.error||'登入失敗。');return result.result;}
 function message(value){error.textContent=value;error.hidden=!value;}
 function status(value){statusKnown=true;lockedUntil=Number(value.lockedUntil)||0;const locked=lockedUntil>Date.now();$('#password-status').textContent=locked?'密碼登入已鎖定，至 '+new Date(lockedUntil).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false})+'（台灣時間）後恢復。期間請使用郵件驗證碼。':'密碼最多嘗試 5 次，目前剩餘 '+(value.remaining??5)+' 次。';field.disabled=locked;submit.disabled=locked||busy;submit.textContent=locked?'密碼已鎖定 48 小時':'解鎖資料';}
 function setBusy(value){busy=value;submit.disabled=value||!statusKnown||lockedUntil>Date.now();send.disabled=value;otpSubmit.disabled=value||!otpId;}
 async function unlock(auth){if(!auth.authenticated){status(auth);throw Error(auth.lockedUntil>Date.now()?'密碼已達 5 次錯誤，鎖定 48 小時。請改用郵件驗證碼。':'密碼不正確（大小寫須一致），剩餘 '+auth.remaining+' 次。');}
  const response=await fetch('./vault.enc.json',{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('加密資料讀取失敗。');const envelope=await response.json();
  if(envelope.format!=='medici-salary-v2'||envelope.compression!=='gzip'||!Array.isArray(envelope.ciphertextParts)||envelope.ciphertextParts.length!==4||envelope.ciphertextParts.some((v,i)=>v!=='vault.enc.'+(i+1)+'.txt'))throw Error('資料格式不符，請重新整理。');
  const segments=await Promise.all(envelope.ciphertextParts.map(async path=>{const r=await fetch('./'+path,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error('加密資料下載未完成。');return r.text()}));
  const key=await crypto.subtle.importKey('raw',bytes(auth.dataKey),{name:'AES-GCM'},false,['decrypt','encrypt']);auth.dataKey='';
  const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(envelope.iv)},key,bytes(segments.join('')));
  const records=JSON.parse(await new Response(new Blob([decrypted]).stream().pipeThrough(new DecompressionStream('gzip'))).text());new Uint8Array(decrypted).fill(0);
  if(!Array.isArray(records.people)||!Array.isArray(records.summary)||!Array.isArray(records.pay))throw Error('資料結構不完整。');
  window.salaryVaultSession={rpc:request=>rpc({...request,sessionToken:auth.token}),key,expires:auth.expires};
  field.value='';$('#otp-code').value='';$('#unlock-panel').hidden=true;document.body.classList.remove('vault-locked');$('#lock-vault').hidden=false;$('#add-data').hidden=false;$('#refresh-data').hidden=false;unlocked=true;resolveRecords(records);setTimeout(()=>location.reload(),Math.max(0,auth.expires-Date.now()));
 }
 $('#show-code').addEventListener('change',e=>{field.type=e.target.checked?'text':'password'});$('#lock-vault').onclick=()=>location.reload();window.addEventListener('pageshow',e=>{if(e.persisted&&unlocked)location.reload()});
 form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;setBusy(true);message('');try{if(!crypto?.subtle)throw Error('請使用支援加密功能的新版瀏覽器。');const challenge=await rpc({action:'password-challenge'});if(!challenge.id){status(challenge);return;}const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(field.value.trim().normalize('NFKC')),'PBKDF2',false,['deriveBits']);const verifier=hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(challenge.salt),iterations:challenge.iterations,hash:'SHA-256'},material,256));const hmac=await crypto.subtle.importKey('raw',new TextEncoder().encode(verifier),{name:'HMAC',hash:'SHA-256'},false,['sign']);const proof=hex(await crypto.subtle.sign('HMAC',hmac,new TextEncoder().encode(challenge.nonce)));await unlock(await rpc({action:'password',id:challenge.id,proof}));}catch(e){message(e.message||'解鎖失敗。');}finally{field.value='';setBusy(false);}});
 send.onclick=async()=>{if(busy)return;setBusy(true);message('');try{const result=await rpc({action:'otp-send'});otpId=result.id;$('#otp-notice').textContent='驗證碼已寄到 sn436269@gmail.com，10 分鐘內有效。';$('#otp-code').focus();}catch(e){message(e.message||'寄送失敗，請重試。');}finally{setBusy(false);}};
 otpForm.addEventListener('submit',async e=>{e.preventDefault();if(busy||!otpId)return;setBusy(true);message('');try{await unlock(await rpc({action:'otp-verify',id:otpId,code:$('#otp-code').value}));}catch(e){message(e.message||'驗證失敗。');}finally{setBusy(false);}});
 async function refresh(){try{status(await rpc({action:'status'}));}catch(e){message(e.message||'無法確認登入狀態，請重新整理。');}}
 refresh();setInterval(()=>{if(!unlocked&&lockedUntil&&lockedUntil<=Date.now())refresh();},1000);
})();
