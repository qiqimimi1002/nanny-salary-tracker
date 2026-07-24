const KEY='nannySalaryTrackerV6';
const LEGACY_KEYS=['nannySalaryTrackerV5','nannySalaryTrackerV4','nannySalaryTrackerV3','nannySalaryTrackerV2'];
const builtInHolidays={
 '2026-01-01':'元旦','2026-02-16':'除夕','2026-02-17':'春节初一','2026-02-18':'春节初二','2026-02-19':'春节初三',
 '2026-04-05':'清明节','2026-05-01':'劳动节','2026-05-02':'劳动节','2026-06-19':'端午节','2026-09-25':'中秋节',
 '2026-10-01':'国庆节','2026-10-02':'国庆节','2026-10-03':'国庆节'
};
const defaults={settings:{baseSalary:7000,divisor:26,standardRestDays:4,holidayMultiplier:2},records:{},customHolidays:{},initializedCycles:{}};
let data=load(),selectedDates=new Set(),calendarDate=new Date(),shownCycleStart=getCycleStart(new Date()),deferredPrompt=null;

function clone(x){return JSON.parse(JSON.stringify(x))}
function load(){
 try{
  const cur=localStorage.getItem(KEY);
  if(cur){const x=JSON.parse(cur);return {settings:{...defaults.settings,...(x.settings||{})},records:x.records||{},customHolidays:x.customHolidays||{},initializedCycles:x.initializedCycles||{}}}
  for(const k of LEGACY_KEYS){
   const raw=localStorage.getItem(k);if(!raw)continue;
   const x=JSON.parse(raw);
   const migratedRecords={...(x.records||{})};
   Object.keys(migratedRecords).forEach(d=>{if(migratedRecords[d]==='rest'&&(builtInHolidays[d]||(x.customHolidays||{})[d]))migratedRecords[d]='holiday_rest'});
   const migrated={settings:{...defaults.settings,baseSalary:Number(x.settings?.baseSalary||7000),divisor:Number(x.settings?.divisor||26),holidayMultiplier:Number(x.settings?.holidayMultiplier||2)},records:migratedRecords,customHolidays:x.customHolidays||{},initializedCycles:x.initializedCycles||{}};
   localStorage.setItem(KEY,JSON.stringify(migrated));return migrated;
  }
 }catch(e){}
 return clone(defaults);
}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function pad(n){return String(n).padStart(2,'0')}
function fmt(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function parse(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function cn(d){return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`}
function week(d){return ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()]}
function money(v){return '¥'+Number(v).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})}
function signedMoney(v){if(Math.abs(v)<0.005)return '¥0.00';return (v>0?'+':'-')+money(Math.abs(v))}
function holidays(){return {...builtInHolidays,...data.customHolidays}}
function getHolidayName(k){return holidays()[k]||''}
function getCycleStart(d){return d.getDate()>=18?new Date(d.getFullYear(),d.getMonth(),18):new Date(d.getFullYear(),d.getMonth()-1,18)}
function getCycleEnd(s){return new Date(s.getFullYear(),s.getMonth()+1,17)}
function getPayDate(s){return new Date(s.getFullYear(),s.getMonth()+1,18)}
function datesBetween(s,e){const out=[];for(let d=new Date(s);d<=e;d=addDays(d,1))out.push(fmt(d));return out}
function cycleDates(s){return datesBetween(s,getCycleEnd(s))}
function cycleKey(s){return fmt(s)}
function isInitialized(s){return !!data.initializedCycles[cycleKey(s)]}

function initializeCycle(s,overwrite=false){
 const k=cycleKey(s);
 if(isInitialized(s)&&!overwrite)return;
 for(const d of cycleDates(s))data.records[d]=getHolidayName(d)?'holiday_rest':'normal';
 data.initializedCycles[k]=true;
}
function ensureCyclesFor(list){
 const keys=[...new Set(list.map(k=>cycleKey(getCycleStart(parse(k)))))];
 keys.forEach(k=>initializeCycle(parse(k),false));
}
function calc(s){
 const initialized=isInitialized(s);
 let normal=0,holiday=0,holidayRest=0,rest=0,blank=0;
 for(const k of cycleDates(s)){
  const r=data.records[k];
  if(r==='normal')normal++;else if(r==='holiday')holiday++;else if(r==='holiday_rest')holidayRest++;else if(r==='rest')rest++;else blank++;
 }
 const base=Number(data.settings.baseSalary),divisor=Number(data.settings.divisor),target=Number(data.settings.standardRestDays),mult=Number(data.settings.holidayMultiplier);
 const rate=base/divisor,workDays=normal+holiday;
 const restAdjust=initialized?(target-rest)*rate:0;
 const holidayPremium=initialized?holiday*(mult-1)*rate:0;
 const salary=base+restAdjust+holidayPremium;
 return {initialized,normal,holiday,holidayRest,rest,blank,workDays,base,divisor,target,mult,rate,restAdjust,holidayPremium,salary};
}
function toast(t){toastBox.textContent=t;toastBox.classList.add('show');setTimeout(()=>toastBox.classList.remove('show'),1500)}
function renderSummary(){
 const s=shownCycleStart,e=getCycleEnd(s),p=getPayDate(s),r=calc(s);
 cycleTitle.textContent=`${s.getMonth()+1}月18日—${e.getMonth()+1}月17日`;
 salaryAmount.textContent=money(r.salary);baseAmount.textContent=r.base.toFixed(0)+'元';restCount.textContent=r.rest+'天';restTarget.textContent=r.target+'天';holidayRestCount.textContent=r.holidayRest+'天';workCount.textContent=r.workDays+'天';holidayCount.textContent=r.holiday+'天';dailyRate.textContent=r.rate.toFixed(2)+'元';
 payDateText.textContent=`${cn(p)}发放 · ${r.initialized?'已按当前出勤计算':'默认固定月薪，尚未生成本期记录'}`;
 let text='';
 if(!r.initialized)text=`默认应发${money(r.base)}。点“生成本周期”后，再设置实际的合同休息日。`;
 else if(r.rest===r.target)text=`合同休息${r.rest}天，正好符合标准；另有法定假休息${r.holidayRest}天，不占4天额度。法定节假日加成${money(r.holidayPremium)}。`;
 else if(r.rest<r.target)text=`合同休息少${r.target-r.rest}天，增加${money(r.restAdjust)}；法定假休息${r.holidayRest}天不占4天额度。法定节假日加成${money(r.holidayPremium)}。`;
 else text=`合同休息多${r.rest-r.target}天，扣减${money(Math.abs(r.restAdjust))}；法定假休息${r.holidayRest}天不占4天额度。法定节假日加成${money(r.holidayPremium)}。`;
 adjustText.innerHTML=`<strong>${text}</strong><br>固定月薪 ${money(r.base)}　休息日增减 ${signedMoney(r.restAdjust)}　节假日加成 ${signedMoney(r.holidayPremium)}`;
 renderSlip(r,s,e);
}
function renderSlip(r,s,e){
 slipCycle.textContent=`工资周期：${cn(s)}至${cn(e)}　发薪日：${cn(getPayDate(s))}`;
 slipBase.textContent=money(r.base);slipRest.textContent=`${r.rest}天（标准${r.target}天）`;slipHolidayRest.textContent=`${r.holidayRest}天（不占休息额度）`;slipRestAdjust.textContent=signedMoney(r.restAdjust);slipHoliday.textContent=`${r.holiday}天，${signedMoney(r.holidayPremium)}`;slipWork.textContent=r.workDays+'天';slipTotal.textContent=`应发工资：${money(r.salary)}`;
}
function renderSelected(){
 const list=[...selectedDates].sort();
 if(!list.length){selectedText.textContent='尚未选择日期';selectedInfo.textContent='可点日历多选，也可一次选择连续日期。';return}
 const c={normal:0,holiday:0,holiday_rest:0,rest:0,blank:0};list.forEach(k=>c[data.records[k]||'blank']++);
 selectedText.textContent=list.length===1?`${cn(parse(list[0]))} · ${week(parse(list[0]))}`:`已选择 ${list.length} 天`;
 selectedInfo.textContent=`上班${c.normal}天，节假日双倍${c.holiday}天，合同休息${c.rest}天，法定假休息${c.holiday_rest}天，未记录${c.blank}天`;
}
function renderCalendar(){
 const y=calendarDate.getFullYear(),m=calendarDate.getMonth(),first=new Date(y,m,1),offset=(first.getDay()+6)%7,start=addDays(first,-offset);
 monthTitle.textContent=`${y}年${m+1}月`;calendar.innerHTML='';
 for(let i=0;i<42;i++){
  const d=addDays(start,i),k=fmt(d),b=document.createElement('button');b.className='day';
  if(d.getMonth()!==m)b.classList.add('other');if(k===fmt(new Date()))b.classList.add('today');if(selectedDates.has(k))b.classList.add('pick');if(getHolidayName(k))b.classList.add('legal');
  b.textContent=d.getDate();const r=data.records[k];if(r){const dot=document.createElement('i');dot.className='dot '+r;b.appendChild(dot)}
  b.onclick=()=>{selectedDates.has(k)?selectedDates.delete(k):selectedDates.add(k);if(d.getMonth()!==m)calendarDate=new Date(d.getFullYear(),d.getMonth(),1);if(selectedDates.size)shownCycleStart=getCycleStart(parse([...selectedDates].sort()[0]));renderAll()};
  calendar.appendChild(b);
 }
}
function renderPayBanner(){
 const t=new Date();
 if(t.getDate()===18){
  const s=new Date(t.getFullYear(),t.getMonth()-1,18),r=calc(s);
  payBanner.classList.add('show');payBannerCycle.textContent=`${cn(s)}至${cn(getCycleEnd(s))}`;payBannerAmount.textContent=`应发 ${money(r.salary)}`;payBannerImage.onclick=()=>downloadSalarySlip(s);
 }else payBanner.classList.remove('show');
}
function renderSettings(){baseSalary.value=data.settings.baseSalary;divisor.value=data.settings.divisor;standardRestDays.value=data.settings.standardRestDays;holidayMultiplier.value=data.settings.holidayMultiplier}
function renderHolidayList(){
 holidayList.innerHTML='';
 Object.entries(holidays()).sort().forEach(([d,n])=>{
  const row=document.createElement('div');row.className='holiday-item';row.innerHTML=`<span>${d}</span><span>${n}${builtInHolidays[d]?'（内置）':''}</span><span></span>`;
  if(data.customHolidays[d]){const b=document.createElement('button');b.className='btn';b.textContent='删除';b.onclick=()=>{delete data.customHolidays[d];save();renderAll();toast('已删除')};row.lastChild.appendChild(b)}
  holidayList.appendChild(row);
 });
}
function renderAll(){renderSummary();renderSelected();renderCalendar();renderPayBanner();renderSettings();renderHolidayList()}
function requireSelection(){const list=[...selectedDates].sort();if(!list.length){alert('请先选择日期。');return null}return list}
function apply(type,msg){
 const list=requireSelection();if(!list)return;ensureCyclesFor(list);list.forEach(k=>data.records[k]=type);save();shownCycleStart=getCycleStart(parse(list[0]));renderAll();toast(msg.replace('{n}',list.length));
}
