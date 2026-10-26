const trips = [];
function validDate(value) {
 if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value<'0001-01-01') return false;
 const date=new Date(value+'T00:00:00Z');
 return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===value;
}
function tripLength(t) { return Math.round((Date.parse(t.endDate)-Date.parse(t.startDate))/86400000)+1; }
function prepareTrip(t) {
 const length=tripLength(t);
 return {...t, date:t.startDate.replaceAll('-','.')+' — '+t.endDate.replaceAll('-','.'), days:length===1?'당일치기':`${length-1}박 ${length}일`, spent:0,schedules:[]};
}
const escapeHTML = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const usage = t => t.budget>0?Math.min(t.spent/t.budget*100,100):t.spent>0?100:0;
const money = n => n.toLocaleString('ko-KR')+'원';
const app = document.querySelector('#app');
let activeDay=0;
const art = place => {
 const text=place.trim();
 const size=text.length>24?'destination-long':text.length>12?'destination-medium':'';
 return `<div class="destination-cover ${size}"><span class="destination-label" aria-hidden="true">YOUR NEXT DESTINATION</span><strong class="destination-name">${escapeHTML(text)}</strong><span class="destination-footer" aria-hidden="true"><span>BLUEWAY JOURNEY</span><span>↗</span></span></div>`;
};
function renderList(){
 const sorted=[...trips].sort((a,b)=>a.startDate.localeCompare(b.startDate));
 const today=new Date();const todayKey=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
 const nearest=sorted.find(t=>t.startDate>=todayKey);
 const nearestDate=nearest ? nearest.startDate.split('-') : null;

 app.innerHTML=`<section class="hero"><div class="hero-copy"><span class="eyebrow">YOUR NEXT CHAPTER</span><h1>다음 여행은,<br>어디로 떠날까요?</h1><p>설레는 일정부터 꼼꼼한 예산까지.<br>나만의 여행을 한곳에서 가볍게 준비하세요.</p><button class="button primary" data-create-trip><span>＋</span> 새 여행 만들기</button></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><span class="hero-plane">✈</span><span class="float-label label-one">✦ 새로운 곳으로</span><span class="float-label label-two">떠날 준비 완료 <span>✓</span></span><div class="ticket"><div><span class="ticket-label">BOARDING PASS</span><strong>일상 <span>✈</span> 여행</strong><small>ONE WAY TO A NEW ADVENTURE</small></div><div class="ticket-end">BLUE<br>WAY</div></div></div></section>
 <section class="overview" aria-label="여행 요약"><div><span class="summary-icon">✈</span><p>등록한 여행<strong>${trips.length}<span>개의 여행</span></strong></p></div><div><span class="summary-icon">▣</span><p>가장 가까운 여행<strong>${nearest?escapeHTML(nearest.place):'아직 없어요'}<span>${nearestDate?`${Number(nearestDate[1])}월 ${Number(nearestDate[2])}일 출발`:'새로운 여행을 계획해 보세요'}</span></strong></p></div><div><span class="summary-icon">₩</span><p>전체 여행 예산<strong>${trips.reduce((sum,t)=>sum+t.budget,0).toLocaleString('ko-KR')}<span>원</span></strong></p></div></section>
 <section class="trip-section"><div class="section-heading"><div><h2>나의 여행 <span class="count">${trips.length}</span></h2><p>하나씩 채워가는 나만의 여행 이야기</p></div><span class="sort-label">출발일 가까운 순 ↓</span></div><div class="trip-grid">${sorted.map(t=>`<article class="trip-card"> <a class="card-art-link" href="#trip/${t.id}" aria-label="${escapeHTML(t.name)} 상세 보기">${art(t.place)}<span class="day-tag">${escapeHTML(t.days)}</span></a><div class="card-body"><div class="card-location">⌖ ${escapeHTML(t.place)}<button class="icon-button more-button" data-edit-trip="${escapeHTML(t.id)}" aria-label="${escapeHTML(t.name)} 관리">⋯</button></div><a class="trip-title" href="#trip/${t.id}">${escapeHTML(t.name)}</a><p class="trip-date">▦ ${escapeHTML(t.date)}</p><div class="card-budget"><div><span>예상 지출</span><strong>${money(t.spent)}</strong></div><div class="progress ${t.spent>t.budget?'over':''}"><span style="width:${usage(t)}%"></span></div><div class="budget-bottom"><span>총예산 ${money(t.budget)}</span><span class="${t.spent>t.budget?'danger':''}">${t.spent>t.budget?'예산 초과':Math.round(usage(t))+'% 사용'}</span></div></div><a class="card-bottom" href="#trip/${t.id}">여행 계획 보기 <span>↗</span></a></div></article>`).join('')}</div></section><div class="bottom-note"><span>✧</span><p>좋은 여행은 작은 계획에서 시작돼요.<br><strong>떠나고 싶은 곳을 떠올려 보세요.</strong></p><span class="note-plane">✈</span></div>`;
}
const categoriesBase=[['숙박',0,'#357cea'],['교통',0,'#65a8fa'],['식비',0,'#7bcbd0'],['쇼핑',0,'#ada2e5'],['관광',0,'#f3bc6b'],['기타',0,'#bdc9db']];
function dateAt(t,i){return new Date(Date.parse(t.startDate)+i*86400000).toISOString().slice(0,10)}
function validSchedule(a,t){return a && validDate(a.date) && a.date>=t.startDate && a.date<=t.endDate && /^([01]\d|2[0-3]):[0-5]\d$/.test(a.time) && a.name.trim() && categoriesBase.some(c=>c[0]===a.category) && Number.isSafeInteger(a.cost) && a.cost>=0;}
function refreshTrip(t){
 const length=tripLength(t);t.date=t.startDate.replaceAll('-','.')+' — '+t.endDate.replaceAll('-','.');t.days=length===1?'당일치기':`${length-1}박 ${length}일`;
 t.spent=[...t.schedules,...t.extraExpenses].reduce((n,a)=>n+a.cost,0);
}
async function api(path,options={}){
 const response=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
 if(response.status===204)return null;
 if(!response.headers.get('content-type')?.includes('application/json')){
  throw new Error(`API가 JSON 응답을 반환하지 않았어요 (HTTP ${response.status}). Vercel의 Express 설정과 배포 접근 권한을 확인해 주세요.`);
 }
 const data=await response.json();
 if(!response.ok)throw new Error(data.error || '서버 요청에 실패했어요.');
 return data;
}
async function persistTrips(next){
 if(persistTrips.busy)throw new Error('저장 중이에요. 잠시 후 다시 시도해 주세요.');
 persistTrips.busy=true;
 const buttons=[...document.querySelectorAll('dialog button')];
 buttons.forEach(b=>b.disabled=true);
 document.querySelectorAll('dialog').forEach(d=>d.dataset.saving='true');
 try{
 const removed=trips.find(t=>!next.some(n=>n.id===t.id));
 const added=next.find(t=>!trips.some(n=>n.id===t.id));
 const updated=next.find(t=>{const old=trips.find(n=>n.id===t.id);return old && JSON.stringify(old)!==JSON.stringify(t)});
 if(removed)await api('/trips/'+encodeURIComponent(removed.id),{method:'DELETE'});
 else if(added)await api('/trips',{method:'POST',body:JSON.stringify(added)});
 else if(updated)await api('/trips/'+encodeURIComponent(updated.id),{method:'PUT',body:JSON.stringify(updated)});
 }finally{persistTrips.busy=false;buttons.forEach(b=>b.disabled=false);document.querySelectorAll('dialog').forEach(d=>d.dataset.saving='false');}
}
let loading=true;
async function loadTrips(){
 app.innerHTML='<div class="empty-state"><h4>여행을 불러오는 중이에요…</h4></div>';
 try{const data=await api('/trips');trips.splice(0,trips.length,...data);loading=false;route();}
 catch(error){
 const local=location.hostname==='localhost'||location.hostname==='127.0.0.1'||location.protocol==='file:';
 const guidance=local?'로컬 서버 실행 상태를 확인해 주세요.':'배포 서버의 DATABASE_URL 설정과 Vercel 실행 로그를 확인해 주세요.';
 app.innerHTML=`<div class="empty-state"><h4>여행을 불러오지 못했어요</h4><p>${escapeHTML(guidance)}</p><p>${escapeHTML(error.message)}</p><button class="button primary" data-retry>다시 시도</button></div>`;
 }
}

function currentTrip(){return trips.find(t=>t.id===location.hash.split('/')[1])}
function renderDetail(t){
 refreshTrip(t);
 const over=t.spent>t.budget;
 const dayCount=tripLength(t);
 activeDay=Math.max(0,Math.min(activeDay,dayCount-1));
 const categories=categoriesBase.map(c=>[c[0],[...t.schedules,...t.extraExpenses].filter(a=>a.category===c[0]).reduce((n,a)=>n+a.cost,0),c[2]]);
 const items=t.schedules.filter(a=>a.date===dateAt(t,activeDay)).sort((a,b)=>a.time.localeCompare(b.time));
 let percent=0;
 const gradient=t.spent?categories.map(c=>{const from=percent;percent+=c[1]/t.spent*100;return `${c[2]} ${from}% ${percent}%`;}).join(','):'#edf2f8';
 app.innerHTML=`<a class="back-link" href="#">← 여행 목록으로</a><section class="detail-heading"><div><div class="detail-kicker"><span>${escapeHTML(t.days)}</span></div><h1>${escapeHTML(t.name)}</h1><p>⌖ ${escapeHTML(t.place)}<span class="divider">|</span>▦ ${escapeHTML(t.date)}</p></div><button class="button secondary" data-edit-trip>✎ 여행 정보 수정</button></section>
 <section class="budget-overview"><div><span>총 여행 예산</span><strong>${money(t.budget)}</strong><small>이번 여행에 계획한 예산</small></div><div><span>예상 지출</span><strong class="blue-text">${money(t.spent)}</strong><small>일정 비용 + 별도 비용</small></div><div class="${over?'over-panel':'remaining-panel'}"><span>${over?'초과 예산':'잔여 예산'} ${over?'!':'✦'}</span><strong>${money(Math.abs(t.budget-t.spent))}</strong><small>${over?'예상 지출이 총예산을 초과했어요':'예산 안에서 알차게 여행 중이에요'}</small></div></section>
 <div class="detail-layout"><section class="schedule-panel"><div class="section-heading"><div><h2>여행 일정</h2><p>하루하루, 설레는 순간을 채워보세요.</p></div><button class="button primary small" data-add-schedule>＋ 일정 추가</button></div><div class="date-tabs" role="tablist" aria-label="여행 날짜">${Array.from({length:dayCount},(_,i)=>`<button role="tab" aria-selected="${activeDay===i}" class="date-tab ${activeDay===i?'selected':''}" data-day="${i}"><span>DAY ${i+1}</span><strong>${dateAt(t,i).slice(5).replace('-','.')}</strong></button>`).join('')}</div><div class="day-heading"><h3>Day ${activeDay+1} <span>· ${activeDay===0?'설레는 여행의 시작':activeDay===dayCount-1?'아쉬움을 담아, 마지막 날':'우리만의 속도로 즐기는 하루'}</span></h3><span>${items.length}개의 일정</span></div><div class="timeline">${!items.length?'<div class="empty-state">✈<h4>아직 등록된 일정이 없어요</h4><p>설레는 여행 계획을 차근차근 채워보세요.</p></div>':''}${items.map(s=>`<article class="activity"><time>${s.time}</time><div class="timeline-dot"></div><div class="activity-card"><span class="activity-icon">${s.icon}</span><div class="activity-content"><span class="category-chip">${s.category}</span><h4>${escapeHTML(s.name)}</h4><p>⌖ ${escapeHTML(s.place)}</p><small>${escapeHTML(s.memo)}</small></div><div class="activity-side"><button class="icon-button" data-edit-schedule="${escapeHTML(s.id)}" aria-label="${escapeHTML(s.name)} 관리">⋯</button><strong>${s.cost?money(s.cost):'비용 없음'}</strong></div></div></article>`).join('')}</div><button class="add-schedule" data-add-schedule>＋ 이 날의 일정 추가하기</button></section>
 <aside class="expense-sidebar"><section class="panel category-panel"><div class="section-heading"><h2>카테고리별 지출</h2><span class="muted">여행 전체</span></div><div class="donut ${!t.spent?'empty-donut':''}" style="background:conic-gradient(${gradient})"><div><span>총 예상 지출</span><strong>${money(t.spent)}</strong></div></div><div class="category-list">${categories.map(c=>`<div><span><i style="background:${c[2]}"></i>${c[0]}</span><strong>${money(c[1])}</strong></div>`).join('')}</div></section><section class="panel separate-panel"><div class="section-heading"><h2>별도 비용</h2><button class="text-button" data-add-expense>＋ 추가</button></div><p class="panel-caption">일정에 연결되지 않은 비용이에요.</p>${!t.extraExpenses.length?'<p class="empty-expenses">아직 등록된 별도 비용이 없어요.</p>':t.extraExpenses.map((a,index)=>`<div class="expense-line"><span class="expense-icon">✈</span><div><strong>${escapeHTML(a.name)}</strong><small>${a.category} · 여행 전체</small></div><span>${money(a.cost)}<button type="button" class="icon-button" data-edit-expense="${index}" aria-label="${escapeHTML(a.name)} 수정">⋯</button></span></div>`).join('')}</section><div class="tip"><span>✧</span><p><strong>계획에 여유 한 스푼</strong><br>예산의 10~20%는 예상하지 못한<br>즐거움을 위해 남겨두세요.</p></div></aside></div>`;
}
function route(){if(loading)return;activeDay=0;const id=location.hash.split('/')[1];const trip=trips.find(t=>t.id===id);trip?renderDetail(trip):renderList();window.scrollTo(0,0)}
window.addEventListener('hashchange',route);
document.addEventListener('click',e=>{if(e.target.closest('[data-retry]'))loadTrips();if(e.target.closest('[data-add-expense]'))openExpense();const editExpense=e.target.closest('[data-edit-expense]');if(editExpense)openExpense(Number(editExpense.dataset.editExpense));if(e.target.closest('.expense-close'))document.querySelector('#expense-dialog').close();const editTrip=e.target.closest('[data-edit-trip]');if(editTrip)openEditTrip(editTrip.dataset.editTrip || undefined);if(e.target.closest('[data-add-schedule]'))openSchedule();const editSchedule=e.target.closest('[data-edit-schedule]');if(editSchedule)openSchedule(editSchedule.dataset.editSchedule);if(e.target.closest('.schedule-close'))document.querySelector('#schedule-dialog').close();if(e.target.closest('[data-create-trip]'))openCreateTrip();if(e.target.closest('.create-close'))document.querySelector('#create-trip-dialog').close();const day=e.target.closest('[data-day]');if(day){activeDay=Number(day.dataset.day);renderDetail(trips.find(t=>t.id===location.hash.split('/')[1]))}});
loadTrips();

const createForm=document.querySelector('#create-trip-form');
const startInput=document.querySelector('#trip-start');
const endInput=document.querySelector('#trip-end');
let editingTripId=null;
function openCreateTrip(){
 document.querySelector('#delete-trip').hidden=true;
 editingTripId=null;document.querySelector('#create-trip-title').textContent='새 여행 만들기';createForm.querySelector('[type="submit"]').textContent='여행 만들기';
 createForm.reset();endInput.min='';
 for(const input of createForm.querySelectorAll('input'))input.setCustomValidity('');
 document.querySelector('#create-error').textContent='';
 document.querySelector('#create-trip-dialog').showModal();
 document.querySelector('#trip-name').focus();
}
createForm.addEventListener('input', e=>{
 e.target.setCustomValidity('');
 if(e.target===startInput || e.target===endInput){
 endInput.min=startInput.value;
 endInput.setCustomValidity(endInput.value && startInput.value && endInput.value<startInput.value?'종료일은 시작일과 같거나 이후여야 해요.':'');
 }
});
createForm.addEventListener('submit',async e=>{
 e.preventDefault();
 const name=createForm.elements.name.value.trim();
 const place=createForm.elements.place.value.trim();
 const startDate=startInput.value,endDate=endInput.value;
 const budget=Number(createForm.elements.budget.value || 0);
 createForm.elements.name.setCustomValidity(name?'':'여행명을 입력해 주세요.');
 createForm.elements.place.setCustomValidity(place?'':'여행지를 입력해 주세요.');
 startInput.setCustomValidity(validDate(startDate)?'':'올바른 시작일을 입력해 주세요.');
 endInput.setCustomValidity(!validDate(endDate)?'올바른 종료일을 입력해 주세요.':endDate<startDate?'종료일은 시작일과 같거나 이후여야 해요.':'');
 createForm.elements.budget.setCustomValidity(Number.isSafeInteger(budget)&&budget>=0?'':'총예산은 0 이상의 정수로 입력해 주세요.');
 if(!createForm.reportValidity())return;
 const trip=prepareTrip({id:'trip-'+(globalThis.crypto?.randomUUID?.() || Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)),name,place,startDate,endDate,budget});
 const existing=trips.find(t=>t.id===editingTripId);
 if(existing && existing.schedules.some(a=>a.date<startDate||a.date>endDate)){
 document.querySelector('#create-error').textContent='변경한 여행 기간 밖에 일정이 있어요. 일정 날짜를 먼저 수정해 주세요.';return;
 }
 const next=existing?{...existing,name,place,startDate,endDate,budget}:{...trip,extraExpenses:[]};
 refreshTrip(next);
 try{await persistTrips(existing?trips.map(t=>t.id===existing.id?next:t):[...trips,next]);}
 catch(error){document.querySelector('#create-error').textContent=error.message || '서버 연결을 확인한 뒤 다시 시도해 주세요.';return;}
 if(existing){Object.assign(existing,next);activeDay=0;if(currentTrip()?.id===existing.id)renderDetail(existing);else renderList();}else{trips.push(next);if(location.hash && location.hash!=='#')location.hash='';else renderList();}
 document.querySelector('#create-trip-dialog').close();
 const toast=document.querySelector('#toast');toast.textContent=existing?'여행 정보를 수정했어요!':'새로운 여행을 만들었어요!';
 clearTimeout(showToastTimer);showToastTimer=setTimeout(()=>{toast.textContent='';},3000);
});
let showToastTimer;

function openEditTrip(id){
 const t=id?trips.find(trip=>trip.id===id):currentTrip();if(!t)return;
 openCreateTrip();editingTripId=t.id;document.querySelector('#delete-trip').hidden=false;
 document.querySelector('#create-trip-title').textContent='여행 정보 수정';
 createForm.querySelector('[type="submit"]').textContent='수정 내용 저장';
 createForm.elements.name.value=t.name;createForm.elements.place.value=t.place;
 startInput.value=t.startDate;endInput.value=t.endDate;endInput.min=t.startDate;createForm.elements.budget.value=t.budget;
}
const scheduleForm=document.querySelector('#schedule-form');
let editingScheduleId=null;
let selectedPeriod='AM';
function setPeriod(period){
 selectedPeriod=period;
 for(const button of scheduleForm.querySelectorAll('[data-period]'))button.setAttribute('aria-pressed',String(button.dataset.period===period));
}
function to24Hour(hour,minute,period){
 if(!/^(0?[1-9]|1[0-2])$/.test(hour)||! /^[0-5]?[0-9]$/.test(minute)||!['AM','PM'].includes(period))return '';
 return String(Number(hour)%12+(period==='PM'?12:0)).padStart(2,'0')+':'+String(Number(minute)).padStart(2,'0');
}
scheduleForm.addEventListener('click',e=>{const button=e.target.closest('[data-period]');if(button)setPeriod(button.dataset.period);});
function openSchedule(id=null){
 const t=currentTrip();if(!t)return;
 editingScheduleId=id;
 scheduleForm.reset();
 for(const input of scheduleForm.querySelectorAll('input,textarea,select'))input.setCustomValidity('');
 const fields=scheduleForm.elements;
 fields.date.min=t.startDate;fields.date.max=t.endDate;fields.date.value=dateAt(t,activeDay);
 document.querySelector('#schedule-error').textContent='';
 document.querySelector('#schedule-title').textContent=id?'일정 수정':'일정 추가';
 const a=t.schedules.find(a=>a.id===id);
 document.querySelector('#delete-schedule').hidden=!a;
 document.querySelector('#schedule-dialog').dataset.mode=a?'edit':'create';
 scheduleForm.querySelector('[type="submit"]').textContent=a?'저장':'추가하기';
 setPeriod(a && Number(a.time.slice(0,2))>=12?'PM':'AM');
 fields.hour.value=a?String(Number(a.time.slice(0,2))%12||12):'';
 fields.minute.value=a?a.time.slice(3):'00';
 for(const input of [fields.hour,fields.minute])input.dataset.previous=input.value;
 if(a)for(const key of ['date','name','place','memo','category','cost'])fields[key].value=a[key];
 document.querySelector('#schedule-dialog').showModal();fields.name.focus();
}
scheduleForm.addEventListener('input',e=>{
 const input=e.target;input.setCustomValidity('');
 if(input.name==='hour'||input.name==='minute'){
 const max=input.name==='hour'?12:59;
 if(!/^\d{0,2}$/.test(input.value)||Number(input.value)>max)input.value=input.dataset.previous||'';
 else input.dataset.previous=input.value;
 }
});
scheduleForm.addEventListener('submit',async e=>{
 e.preventDefault();const t=currentTrip();if(!t)return;
 const f=scheduleForm.elements;
 const a={id:editingScheduleId || 'schedule-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),date:f.date.value,time:to24Hour(f.hour.value,f.minute.value,selectedPeriod),name:f.name.value.trim(),place:f.place.value.trim(),memo:f.memo.value.trim(),category:f.category.value,cost:Number(f.cost.value||0),icon:'✦'};
 f.hour.setCustomValidity(/^(0?[1-9]|1[0-2])$/.test(f.hour.value)?'':'시는 1부터 12까지 입력해 주세요.');
 f.minute.setCustomValidity(/^[0-5]?[0-9]$/.test(f.minute.value)?'':'분은 0부터 59까지 입력해 주세요.');
 f.name.setCustomValidity(a.name?'':'활동명을 입력해 주세요.');
 f.date.setCustomValidity(validDate(a.date)&&a.date>=t.startDate&&a.date<=t.endDate?'':'여행 기간 안의 날짜를 선택해 주세요.');
 f.cost.setCustomValidity(Number.isSafeInteger(a.cost)&&a.cost>=0?'':'예상 비용은 0 이상의 정수로 입력해 주세요.');
 if(!scheduleForm.reportValidity() || !validSchedule(a,t))return;
 const next={...t,schedules:editingScheduleId?t.schedules.map(s=>s.id===editingScheduleId?a:s):[...t.schedules,a]};refreshTrip(next);
 try{await persistTrips(trips.map(s=>s.id===t.id?next:s));}catch(error){document.querySelector('#schedule-error').textContent=error.message || '서버 연결을 확인한 뒤 다시 시도해 주세요.';return;}
 Object.assign(t,next);activeDay=Math.round((Date.parse(a.date)-Date.parse(t.startDate))/86400000);
 document.querySelector('#schedule-dialog').close();renderDetail(t);
});

const expenseForm=document.querySelector('#expense-form');
let editingExpenseIndex=null;
function openExpense(index=null){
 const trip=currentTrip();if(!trip)return;
 editingExpenseIndex=Number.isInteger(index)&&trip.extraExpenses[index]?index:null;
 expenseForm.reset();
 const existing=editingExpenseIndex===null?null:trip.extraExpenses[editingExpenseIndex];
 if(existing)for(const key of ['name','category','cost'])expenseForm.elements[key].value=existing[key];
 document.querySelector('#expense-title').textContent=existing?'별도 비용 수정':'별도 비용 추가';
 expenseForm.querySelector('[type="submit"]').textContent=existing?'수정 내용 저장':'비용 추가하기';
 document.querySelector('#delete-expense').hidden=!existing;
 document.querySelector('#expense-dialog').dataset.mode=existing?'edit':'create';
 if(existing)expenseForm.querySelector('[type="submit"]').textContent='저장';
 for(const field of expenseForm.querySelectorAll('input,select'))field.setCustomValidity('');
 document.querySelector('#expense-error').textContent='';
 document.querySelector('#expense-dialog').showModal();expenseForm.elements.name.focus();
}
expenseForm.addEventListener('input',e=>e.target.setCustomValidity(''));
expenseForm.addEventListener('submit',async e=>{
 e.preventDefault();const t=currentTrip();if(!t)return;
 const f=expenseForm.elements;
 const expense={id:t.extraExpenses[editingExpenseIndex]?.id || 'expense-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),name:f.name.value.trim(),category:f.category.value,cost:Number(f.cost.value||0)};
 f.name.setCustomValidity(expense.name?'':'비용 항목명을 입력해 주세요.');
 f.category.setCustomValidity(categoriesBase.some(c=>c[0]===expense.category)?'':'카테고리를 선택해 주세요.');
 f.cost.setCustomValidity(Number.isSafeInteger(expense.cost)&&expense.cost>=0?'':'예상 비용은 0 이상의 정수로 입력해 주세요.');
 if(!expenseForm.reportValidity())return;
 const next={...t,extraExpenses:editingExpenseIndex===null?[...t.extraExpenses,expense]:t.extraExpenses.map((a,i)=>i===editingExpenseIndex?expense:a)};refreshTrip(next);
 try{await persistTrips(trips.map(trip=>trip.id===t.id?next:trip));}
 catch(error){document.querySelector('#expense-error').textContent=error.message || '서버 연결을 확인한 뒤 다시 시도해 주세요.';return;}
 Object.assign(t,next);document.querySelector('#expense-dialog').close();renderDetail(t);
});

document.querySelector('#delete-trip').addEventListener('click',async ()=>{
 const trip=trips.find(t=>t.id===editingTripId);if(!trip)return;
 if(!window.confirm(`“${trip.name}” 여행을 정말 삭제할까요?\n등록된 일정과 비용도 함께 삭제되며 복구할 수 없어요.`))return;
 const next=trips.filter(t=>t.id!==trip.id);
 try{await persistTrips(next);}catch(error){document.querySelector('#create-error').textContent=error.message || '서버 연결을 확인한 뒤 다시 시도해 주세요.';return;}
 trips.splice(0,trips.length,...next);editingTripId=null;
 document.querySelector('#create-trip-dialog').close();
 if(location.hash && location.hash!=='#')location.hash='';
 renderList();
 const toast=document.querySelector('#toast');toast.textContent='여행을 삭제했어요.';
 clearTimeout(showToastTimer);showToastTimer=setTimeout(()=>{toast.textContent='';},3000);
});

document.querySelector('#delete-expense').addEventListener('click',async ()=>{
 const t=currentTrip();const expense=t?.extraExpenses[editingExpenseIndex];if(!expense)return;
 if(!window.confirm(`“${expense.name}” 비용을 정말 삭제할까요?`))return;
 const next={...t,extraExpenses:t.extraExpenses.filter((a,i)=>i!==editingExpenseIndex)};refreshTrip(next);
 try{await persistTrips(trips.map(trip=>trip.id===t.id?next:trip));}
 catch(error){document.querySelector('#expense-error').textContent=error.message || '서버 연결을 확인한 뒤 다시 시도해 주세요.';return;}
 Object.assign(t,next);editingExpenseIndex=null;document.querySelector('#expense-dialog').close();renderDetail(t);
});

document.querySelector('#delete-schedule').addEventListener('click',async ()=>{
 const trip=currentTrip();const schedule=trip?.schedules.find(a=>a.id===editingScheduleId);
 if(!schedule)return;
 if(!window.confirm(`“${schedule.name}” 일정을 정말 삭제할까요?\n연결된 예상 비용도 함께 삭제돼요.`))return;
 const next={...trip,schedules:trip.schedules.filter(a=>a.id!==schedule.id)};refreshTrip(next);
 try{await persistTrips(trips.map(t=>t.id===trip.id?next:t));}
 catch(error){document.querySelector('#schedule-error').textContent=error.message || '서버 연결을 확인한 뒤 다시 시도해 주세요.';return;}
 Object.assign(trip,next);editingScheduleId=null;
 document.querySelector('#schedule-dialog').close();renderDetail(trip);
});

for(const dialog of document.querySelectorAll('dialog')){
 dialog.addEventListener('cancel',e=>{if(dialog.dataset.saving==='true')e.preventDefault();});
}

