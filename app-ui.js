generateAll.onclick=()=>{if(isInitialized(shownCycleStart)&&!confirm('本周期已有记录，是否重新生成并覆盖？'))return;initializeCycle(shownCycleStart,true);save();selectedDates.clear();renderAll();toast('本周期已生成，请设置实际休息日')};
selectCycle.onclick=()=>{selectedDates=new Set(cycleDates(shownCycleStart));rangeStart.value=fmt(shownCycleStart);rangeEnd.value=fmt(getCycleEnd(shownCycleStart));renderSelected();renderCalendar();toast('已选择本周期全部日期')};
clearCycle.onclick=()=>{if(!confirm('确定重置本周期全部记录吗？'))return;cycleDates(shownCycleStart).forEach(k=>delete data.records[k]);delete data.initializedCycles[cycleKey(shownCycleStart)];save();selectedDates.clear();renderAll();toast('本周期已重置')};
selectRange.onclick=()=>{if(!rangeStart.value||!rangeEnd.value){alert('请选择开始和结束日期。');return}let s=parse(rangeStart.value),e=parse(rangeEnd.value);if(s>e)[s,e]=[e,s];const list=datesBetween(s,e);if(list.length>62&&!confirm(`共${list.length}天，确定全部选择吗？`))return;list.forEach(k=>selectedDates.add(k));calendarDate=new Date(s.getFullYear(),s.getMonth(),1);shownCycleStart=getCycleStart(s);renderAll();toast(`已选择${list.length}天`)};
clearSelection.onclick=()=>{selectedDates.clear();renderSelected();renderCalendar();toast('已取消选择')};
setWork.onclick=()=>{const list=requireSelection();if(!list)return;ensureCyclesFor(list);let h=0;list.forEach(k=>{if(getHolidayName(k)){data.records[k]='holiday';h++}else data.records[k]='normal'});save();renderAll();toast(`已设置${list.length}天上班${h?`，其中${h}天双倍`:''}`)};
setRest.onclick=()=>{const list=requireSelection();if(!list)return;ensureCyclesFor(list);let legal=0;list.forEach(k=>{if(getHolidayName(k)){data.records[k]='holiday_rest';legal++}else data.records[k]='rest'});save();shownCycleStart=getCycleStart(parse(list[0]));renderAll();toast(`已设置${list.length}天休息${legal?`，其中${legal}天法定假不占4天额度`:''}`)};
setHoliday.onclick=()=>apply('holiday','已将{n}天设为节假日双倍');
clearRecords.onclick=()=>{const list=requireSelection();if(!list)return;list.forEach(k=>delete data.records[k]);save();renderAll();toast(`已清除${list.length}天记录`)};
prevMonth.onclick=()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1);renderCalendar()};
nextMonth.onclick=()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1);renderCalendar()};
prevCycle.onclick=()=>{shownCycleStart=new Date(shownCycleStart.getFullYear(),shownCycleStart.getMonth()-1,18);calendarDate=new Date(shownCycleStart);rangeStart.value=fmt(shownCycleStart);rangeEnd.value=fmt(getCycleEnd(shownCycleStart));renderAll()};
nextCycle.onclick=()=>{shownCycleStart=new Date(shownCycleStart.getFullYear(),shownCycleStart.getMonth()+1,18);calendarDate=new Date(shownCycleStart);rangeStart.value=fmt(shownCycleStart);rangeEnd.value=fmt(getCycleEnd(shownCycleStart));renderAll()};
saveSettings.onclick=()=>{const s={baseSalary:Number(baseSalary.value),divisor:Number(divisor.value),standardRestDays:Number(standardRestDays.value),holidayMultiplier:Number(holidayMultiplier.value)};if(!s.baseSalary||!s.divisor||s.standardRestDays<0||!s.holidayMultiplier){alert('参数填写有误。');return}data.settings=s;save();renderAll();toast('参数已保存')};
addHoliday.onclick=()=>{const d=holidayDate.value,n=holidayNameInput.value.trim();if(!d||!n){alert('请填写日期和节日名称。');return}data.customHolidays[d]=n;save();holidayDate.value='';holidayNameInput.value='';renderAll();toast('节假日已添加')};
function download(name,text,type){const a=document.createElement('a'),u=URL.createObjectURL(new Blob(['\ufeff'+text],{type}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),500)}
exportCsv.onclick=()=>{const s=shownCycleStart,r=calc(s),rows=[['日期','星期','节日','状态','计薪倍数','参考金额']];for(const k of cycleDates(s)){const st=data.records[k]||'',mult=st==='holiday'?r.mult:(st==='normal'?1:0),label=st==='normal'?'普通上班':st==='holiday'?'法定节假日双倍':st==='holiday_rest'?'法定节假日带薪休息':st==='rest'?'合同休息':'未记录';rows.push([k,week(parse(k)),getHolidayName(k),label,mult,(r.rate*mult).toFixed(2)])}download(`育儿嫂工资明细_${fmt(s)}_${fmt(getCycleEnd(s))}.csv`,rows.map(x=>x.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n'),'text/csv;charset=utf-8')};
exportBackup.onclick=()=>download(`育儿嫂工资备份_${fmt(new Date())}.json`,JSON.stringify(data,null,2),'application/json;charset=utf-8');
importBackup.onclick=()=>importFile.click();
importFile.onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const x=JSON.parse(rd.result);if(!x.settings||!x.records)throw 0;data={settings:{...defaults.settings,...x.settings},records:x.records||{},customHolidays:x.customHolidays||{},initializedCycles:x.initializedCycles||{}};save();renderAll();toast('备份已导入')}catch(err){alert('备份文件无法识别。')}};rd.readAsText(f);e.target.value=''};
clearAll.onclick=()=>{if(confirm('确定清空全部记录吗？')){data.records={};data.initializedCycles={};save();renderAll();toast('已清空')}};

function downloadSalarySlip(s=shownCycleStart){
 const e=getCycleEnd(s),r=calc(s),canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1380;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#fffaf3';ctx.fillRect(0,0,1080,1380);ctx.textAlign='center';ctx.fillStyle='#302a25';ctx.font='bold 58px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillText('育儿嫂工资确认单',540,110);
 ctx.fillStyle='#756b61';ctx.font='30px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillText(`${cn(s)} 至 ${cn(e)}`,540,170);
 ctx.strokeStyle='#d8cabc';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(95,220);ctx.lineTo(985,220);ctx.stroke();
 const lines=[['固定月薪',money(r.base)],['合同休息',`${r.rest}天（标准${r.target}天）`],['法定假休息',`${r.holidayRest}天（不占额度）`],['休息日增减',signedMoney(r.restAdjust)],['法定节假日上班',`${r.holiday}天`],['节假日加成',signedMoney(r.holidayPremium)],['实际工作',`${r.workDays}天`]];
 lines.forEach((line,i)=>{const y=300+i*118;ctx.textAlign='left';ctx.fillStyle='#302a25';ctx.font='32px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillText(line[0],120,y);ctx.textAlign='right';ctx.font='bold 34px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillText(line[1],960,y);ctx.strokeStyle='#e5dbd0';ctx.beginPath();ctx.moveTo(115,y+35);ctx.lineTo(965,y+35);ctx.stroke()});
 ctx.textAlign='center';ctx.fillStyle='#96604a';ctx.font='bold 62px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillText(`应发工资 ${money(r.salary)}`,540,1080);
 ctx.fillStyle='#81776d';ctx.font='27px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillText(`发薪日：${cn(getPayDate(s))}`,540,1150);ctx.fillText('根据当前记录自动生成',540,1220);
 const a=document.createElement('a');a.download=`育儿嫂工资单_${fmt(s)}_${fmt(e)}.png`;a.href=canvas.toDataURL('image/png');a.click();
}
downloadSlip.onclick=()=>downloadSalarySlip();printSlip.onclick=()=>window.print();

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;installButton.style.display='block';installButton.onclick=async()=>{deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installButton.style.display='none'}});
function renderInstall(){const ios=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;if(standalone)return;installCard.classList.add('show');installText.textContent=ios?'iPhone：用Safari打开网页，点底部“分享”，再选“添加到主屏幕”。':'安卓：点浏览器菜单中的“安装应用”或“添加到主屏幕”。'}
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
const toastBox=document.getElementById('toast');
rangeStart.value=fmt(shownCycleStart);rangeEnd.value=fmt(getCycleEnd(shownCycleStart));renderAll();renderInstall();