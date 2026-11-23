
// 心靈花園共用首頁的 mt 登入閘門；此元件只在驗證成功後掛載。
function MediciSoul({onHome,onLogout}) {
 D.useEffect(()=>{window.scrollTo(0,0)},[]);
 const h=D.createElement, [tab,setTab]=D.useState('stages'), [stage,setStage]=D.useState(0), [checks,setChecks]=D.useState([]);
 const stages=[
 {name:'好感',title:'只有好感時，妳像生活裡的甜點',body:'見面很開心，分開也不會想妳；臨時有空，才問妳要不要出來。像吃甜點，有很好，沒有也沒差。',note:'只有靠近和曖昧，還看不出長期交往的打算。',ask:'他會提前為妳安排時間，還是只有臨時想起妳？'},
 {name:'喜歡',title:'開始喜歡妳，關心會多一點行動',body:'妳說肚子痛，他接下來怎麼做？比起只說「多喝熱水、早點休息」，更值得留意的是：他有沒有記得妳不舒服，問妳需要什麼，或在能力範圍內提供照顧。',note:'關心可以有不同形式，重點是有沒有回應妳的需要。',ask:'他的關心，有沒有從一句話走進日常？'},
 {name:'照顧',title:'真的愛上妳，會顧到妳的尷尬',body:'帶妳見朋友，卻把妳晾在旁邊，光是出席，還看不出心意。他會不會介紹妳、幫妳接話？聽不懂的梗，他會替妳解釋嗎？',note:'看他有沒有照顧妳的感受，也聽聽自己相處時的感覺。',ask:'在他的生活裡，妳能自在參與，還是常常被留在一旁？'},
 {name:'認定',title:'當他認定妳，未來就會把妳算進去',body:'他開始聊工作、存款與未來，遇到重要決定，也會問妳意見。在妳面前願意談煩惱與脆弱，不用每次都裝得很完美。',note:'看他是否把兩個人一起考慮，也尊重彼此的步調與選擇。',ask:'談到未來時，妳的想法是否也有位置？'}
 ];
 const questions=['時間｜會提前約妳，也尊重妳的安排嗎？','感受｜會注意妳的情緒，願意聽妳說嗎？','行動｜表達關心後，有持續而具體的回應嗎？','相處｜在朋友面前，也讓妳自在、有參與感嗎？','未來｜做重要決定時，會和妳一起討論嗎？','自己｜在這段關係裡，妳能安心做自己嗎？'];
 const btn=(text,fn,cls='soul-button')=>h('button',{type:'button',className:cls,onClick:fn},text);
 return h('div',{className:'soul-shell'},
  h('header',{className:'soul-header'},btn('Clarice de’ Medici',onHome,'soul-brand'),h('span',null,'心靈花園'),btn('登出',onLogout,'soul-text-button')),
  h('main',{id:'soul-main',className:'soul-main'},
   h('section',{className:'soul-hero'},h('div',{className:'soul-hero-copy'},h('p',{className:'soul-eyebrow'},'A LITTLE SPACE FOR YOUR HEART'),h('h1',null,'把心安放好，',h('br'),h('em',null,'再慢慢靠近。')),h('p',{className:'soul-lead'},'甜言蜜語讓人心動，日常行動讓心有依靠。',h('br'),'給自己一點時間，看清關係，也聽見自己。'),h('button',{type:'button',className:'soul-button',onClick:()=>document.getElementById('soul-reading')?.scrollIntoView({behavior:'smooth'})},'開始讀一讀')),h('div',{className:'soul-orbit','aria-hidden':'true'},h('div',{className:'soul-orbit-ring'}),h('span',{className:'soul-orbit-word'},'慢慢來'),h('small',null,'LET YOUR HEART BREATHE'))),
   h('section',{className:'soul-summary','aria-label':'三個觀察方向'},[['時間','是否為妳留一個位置'],['感受','是否願意理解與照顧'],['未來','是否把彼此一起考慮']].map(([title,body])=>h('div',{key:title},h('h2',null,title),h('p',null,body)))),
   h('section',{id:'soul-reading',className:'soul-reading'},h('div',{className:'soul-section-heading'},h('div',null,h('p',{className:'soul-eyebrow'},'READ THE ACTIONS'),h('h2',null,'他說喜歡，行動走到哪裡？')),h('p',null,'曖昧很熱鬧，也看看他願意做什麼。')),
    h('div',{className:'soul-tabs',role:'tablist','aria-label':'心靈閱讀主題'},[['stages','關係的四個階段'],['observe','留意實際行動'],['understand','慢慢了解彼此']].map(([id,label])=>h('button',{key:id,id:'soul-tab-'+id,role:'tab',type:'button','aria-selected':tab===id,'aria-controls':'soul-panel',onClick:()=>setTab(id)},label))),
    h('div',{id:'soul-panel',role:'tabpanel','aria-labelledby':'soul-tab-'+tab,tabIndex:0},
    tab==='stages'?h('div',{className:'soul-stage-layout'},h('div',{className:'soul-stage-nav','aria-label':'選擇投入階段'},stages.map((s,i)=>h('button',{key:s.name,type:'button','aria-pressed':stage===i,onClick:()=>setStage(i)},h('span',null,s.name),h('small',null,['從靠近開始','讓關心落地','顧及妳的感受','一起想像未來'][i])))),h('article',{className:'soul-stage-card',key:stage},h('p',{className:'soul-eyebrow'},'關係觀察 · '+stages[stage].name),h('h3',null,stages[stage].title),h('p',null,stages[stage].body),h('blockquote',null,stages[stage].note),h('div',{className:'soul-prompt'},h('span',null,'留給自己的一個問題'),h('p',null,stages[stage].ask)),h('div',{className:'soul-stage-actions'},btn('上一個階段',()=>setStage((stage+3)%4),'soul-text-button'),h('span',null,(stage+1)+' / 4'),btn('下一個階段',()=>setStage((stage+1)%4),'soul-text-button')))):
    tab==='observe'?h('article',{className:'soul-observe'},h('h3',null,'先把相處慢下來，留意他的實際投入。'),h('p',null,'點選妳在相處中確實看見的行動。這裡沒有分數，也不替妳決定一段關係。'),h('div',{className:'soul-checks'},questions.map((q,i)=>h('label',{key:q},h('input',{type:'checkbox',checked:checks.includes(i),onChange:()=>setChecks(v=>v.includes(i)?v.filter(x=>x!==i):[...v,i])}),h('span',null,q)))),h('p',{className:'soul-check-status',role:'status'},checks.length?'妳留意到了 '+checks.length+' 個面向。也可以想想：哪些是持續出現，哪些只是偶爾？':'從一件具體的小事開始觀察就好。'),btn('重新整理觀察',()=>setChecks([]),'soul-text-button'),h('small',null,'勾選僅保留在這次閱讀中，離開或重新整理後清除。')):
    h('article',{className:'soul-understand'},h('p',{className:'soul-eyebrow'},'KNOW EACH OTHER, GENTLY'),h('h3',null,'喜歡，也可以是願意讓妳更懂他。'),h('p',null,'除了聽他說多愛妳，也留意他是否願意分享真實的自己：成長背景、日常煩惱，以及不那麼完美的一面。'),h('div',{className:'soul-conversation-grid'},[['分享','最近有什麼事，讓你特別在意？'],['傾聽','你希望我怎麼陪你、理解你？'],['互相','我們怎樣相處，會讓彼此更自在？']].map(([a,b])=>h('div',{key:a},h('h4',null,a),h('p',null,b)))),h('blockquote',null,'願意分享，也願意認真聽妳的意見。理解是來回的，不需要勉強揭露。')))),
   h('section',{className:'soul-closing'},h('p',{className:'soul-eyebrow'},'A GENTLE REMINDER'),h('h2',null,'還看不清他的心？',h('br'),'先回到自己的感受。'),h('p',null,'放慢相處節奏，觀察實際行動，再判斷是否適合。',h('br'),'妳不必急著替任何人加分，也不必急著給自己答案。'),h('div',{className:'soul-closing-steps'},h('span',null,'放慢'),h('span',null,'觀察'),h('span',null,'選擇'))),
   h('details',{className:'soul-about'},h('summary',null,'關於這份心靈手札'),h('p',null,'依妳提供的七張關係圖卡整理，將重點轉成閱讀與自我提問。階段是幫助思考的觀察角度，並非每段關係必經的順序；單一行為也不能判定一個人的心意。'),h('p',null,'圖卡提及的自我揭露研究在這裡僅保留為分享與傾聽的日常提問，未將圖卡中的研究敘述視為已核實的結論。'))),
  h('footer',{className:'soul-footer'},h('span',null,'Clarice de’ Medici · 心靈花園'),btn('回到首頁',onHome,'soul-text-button')));
}
function MediciSoulEntry(){const h=D.createElement;return h('section',{className:'soul-home-entry','aria-labelledby':'soul-home-title'},h('div',null,h('p',{className:'soul-eyebrow'},'A LITTLE SPACE FOR YOUR HEART'),h('h2',{id:'soul-home-title'},'心靈花園'),h('p',null,'把心安放好，再慢慢靠近。從日常行動讀懂關係，也留一點溫柔給自己。')),h('a',{href:'#soul',className:'soul-button'},'走進心靈花園'));}
