(()=>{'use strict';
const node=(tag,value)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;return n};
window.salaryRecordsReady.then(data=>{
 const rows=data.logs.filter(row=>String(row[2]).includes('無法讀取'));
 const list=document.querySelector('#unreadable-list'),search=document.querySelector('#unreadable-search');
 document.querySelector('#unreadable-total').textContent=rows.length+' 份';
 function render(){
  const q=search.value.trim().toLocaleLowerCase(),shown=rows.filter(row=>row.slice(0,4).join(' ').toLocaleLowerCase().includes(q));
  list.replaceChildren();document.querySelector('#unreadable-count').textContent='顯示 '+shown.length+'／'+rows.length+' 份';
  document.querySelector('#unreadable-empty').hidden=shown.length>0;
  shown.forEach(row=>{const card=node('article');card.className='unreadable-item';card.append(node('h3',row[1]),node('p','資料夾：'+row[0]),node('p','原因：'+row[2]));if(row[3])card.append(node('p',row[3]));
   String(row[4]||'').split('；').forEach(value=>{try{const url=new URL(value);if(url.protocol!=='https:')return;const link=node('a','開啟原始檔案');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';card.append(link)}catch{}});list.append(card)});
 }
 search.addEventListener('input',render);render();
}).catch(()=>{document.querySelector('#unreadable-count').textContent='資料尚未解鎖，請重新解鎖後再試。'});
})();