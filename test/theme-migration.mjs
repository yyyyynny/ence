/* 테마 이관 — 저장된 옛 id 가 새 테마로 옮겨지는가, 그리고 첫 실행 함정이 남았는가. */
import {chromium} from 'playwright';
import {globSync} from 'node:fs';
const exe = globSync('/opt/pw-browsers/chromium-*/chrome-linux/chrome').sort().pop();
let fail=0; const P=(n,e='')=>console.log('  PASS  '+n+' '+e); const F=(n,e='')=>{fail++;console.log('  FAIL  '+n+' '+e)};
const b = await chromium.launch({executablePath: exe});
const URL='file:///home/user/ence/index.html';

for (const [stored, want] of [['dark','edit'],['night','edit'],['light','note'],['paper','note'],['contrast','contrast']]) {
  const ctx = await b.newContext({viewport:{width:390,height:844}});
  const p = await ctx.newPage();
  await p.addInitScript(v=>{try{localStorage.setItem('chem_theme',v)}catch(e){}}, stored);
  await p.goto(URL,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(600);
  const r = await p.evaluate(()=>({
    applied: App.state.theme,
    cls: [...document.documentElement.classList].filter(c=>c.startsWith('theme-')),
    stored: (()=>{try{return localStorage.getItem('chem_theme')}catch(e){return null}})(),
    bg: getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim()
  }));
  r.applied===want ? P(`「${stored}」 → ${want}`) : F(`「${stored}」 이관`, `${r.applied} (기대 ${want})`);
  r.stored===want ? P(`  저장값도 ${want} 로 고쳐 씀`) : F('  저장값이 안 고쳐짐', String(r.stored));
  r.cls.length===1 ? P('  테마 클래스가 하나만') : F('  클래스가 여럿/없음', r.cls.join(','));
  await ctx.close();
}
// 모르는 값 — 폰 설정을 따르되 저장하지 않아야 한다
{
  const ctx = await b.newContext({viewport:{width:390,height:844}});
  const p = await ctx.newPage();
  await p.addInitScript(()=>{try{localStorage.setItem('chem_theme','banana')}catch(e){}});
  await p.goto(URL,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(600);
  const r = await p.evaluate(()=>({t:App.state.theme, s:localStorage.getItem('chem_theme')}));
  ['note','edit','contrast'].includes(r.t) ? P('모르는 값 → 폰 설정을 따름', r.t) : F('모르는 값 처리', r.t);
  r.s==='banana' ? P('  추론한 것은 저장하지 않음') : F('  저장값을 건드렸다', String(r.s));
  await ctx.close();
}
// 첫 실행 — 밝은 화면 선호. 여기가 등록처 id 만 바꾸면 조용히 깨지던 자리다.
for (const [scheme, want] of [['light','note'],['dark','edit']]) {
  const ctx = await b.newContext({viewport:{width:390,height:844}, colorScheme:scheme});
  const p = await ctx.newPage();
  await p.goto(URL,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(600);
  const r = await p.evaluate(()=>({t:App.state.theme,
    cls:[...document.documentElement.classList].filter(c=>c.startsWith('theme-')),
    bg:getComputedStyle(document.body).backgroundColor}));
  r.t===want && r.cls.length===1 ? P(`첫 실행 · 폰이 ${scheme} → ${want}`, r.bg)
    : F(`첫 실행 · ${scheme}`, `${r.t} / ${r.cls.join(',')}`);
  await ctx.close();
}
await b.close();
console.log(fail===0?'\n✅ 이관 통과':`\n❌ 실패 ${fail}`); process.exit(fail?1:0);
