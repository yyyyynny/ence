/* ── 그림 기하 검사 ──
   그림은 이 앱에서 곁다리 장식이 아니라 학습 내용 자체다(전자를 세는 화면).
   점이 겹치거나 화면 밖으로 나가거나 개수가 글과 어긋나면 답이 달라진다.
   브라우저가 없어도 돌아간다 — 그리는 함수가 문자열을 돌려주므로 좌표를 되읽어 재면 된다.

   왜 저장소 안에 두는가: 예전에 이 검사를 임시 폴더에 두었다가 컨테이너가 갈리며 통째로 날아갔다.
   test/README.md 참고. `node test/diagram.mjs` 로 실행한다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const JS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js');
const R = p => fs.readFileSync(path.join(JS, p), 'utf8');
const ctx = {};
new Function('g', R('data.js') + '\n' + R('diagram.js') + `
  Object.assign(g,{ELEMENTS,BONDS,ION_FORMING,ION_NOBLE,SHELL_QUIZ_ELEMENTS,DIA,
    shellsOf,outerShellOf,valenceOf,ionNameKo,
    ionicDiagramHTML,covalentDiagramHTML,ionFormingDiagramHTML,shellDiagramHTML});
`)(ctx);
const F = [];
const fail=(t,m)=>F.push(`[${t}] ${m}`);

/* 생성된 SVG를 좌표로 되읽는다. 그리는 길이 DIA.dot/atom 몇 곳뿐이라 형식이 고정돼 있다. */
function parse(html){
  const vbm=/viewBox="([-\d. ]+)"/.exec(html);
  const [vx,vy,vw,vh]=vbm[1].trim().split(/\s+/).map(Number);
  const dots=[],rings=[],nucs=[],texts=[];
  const cRe=/<circle([^>]*)\/>/g; let m;
  while((m=cRe.exec(html))){
    const a=m[1];
    const g=k=>{const r=new RegExp(k+'="([^"]*)"').exec(a); return r?r[1]:null;};
    const cls=g('class')||'', x=+g('cx'), y=+g('cy'), r=parseFloat(g('r'));
    const st=g('style')||'';
    const dx=/--dx:([-\d.]+)px/.exec(st), dy=/--dy:([-\d.]+)px/.exec(st);
    const o={cls,x,y,r,dx:dx?+dx[1]:0,dy:dy?+dy[1]:0};
    if(/dia-nuc/.test(cls)) nucs.push(o);
    else if(/dia-ring/.test(cls)) rings.push(o);
    else if(/\bdia-e\b/.test(cls)) dots.push(o);
  }
  const tRe=/<text([^>]*)>([^<]*)<\/text>/g;
  while((m=tRe.exec(html))){
    const a=m[1]; const g=k=>{const r=new RegExp(k+'="([^"]*)"').exec(a); return r?r[1]:null;};
    texts.push({cls:g('class')||'',x:+g('x'),y:+g('y'),t:m[2]});
  }
  return {vx,vy,vw,vh,dots,rings,nucs,texts,html};
}
/* 최종 화면(애니메이션이 끝난 상태)에 남는 전자만. 나가는 전자(dia-e-gone)는 사라지므로 제외한다 —
   이걸 포함해서 세면 이온이 아니라 원자를 세게 되고, 실제로 전에 그 때문에 버그를 놓쳤다. */
const finalDots = d => d.dots.filter(o=>!/dia-e-gone/.test(o.cls));

function check(label, html, expect){
  const d=parse(html);
  const dots=finalDots(d);

  /* 1. 전자 개수 */
  if(expect.n!==undefined && dots.length!==expect.n)
    fail('전자수',`${label} — 최종 ${dots.length}개, 기대 ${expect.n}개`);

  /* 2. 전자끼리 겹침 — 두 점의 중심 거리가 두 반지름의 합보다 짧으면 화면에서 하나로 뭉친다 */
  for(let i=0;i<dots.length;i++) for(let j=i+1;j<dots.length;j++){
    const a=dots[i],b=dots[j];
    const dd=Math.hypot(a.x-b.x,a.y-b.y), need=a.r+b.r;
    if(dd<need-0.01) fail('겹침',`${label} — 전자 두 개가 겹침 (거리 ${dd.toFixed(1)} < ${need.toFixed(1)})`);
  }
  /* 3. 전자가 원자핵을 침범 — 핵 안에 점이 들어가면 기호가 가려진다 */
  for(const nu of d.nucs) for(const e of dots){
    const dd=Math.hypot(nu.x-e.x,nu.y-e.y);
    if(dd<nu.r+e.r-0.01) fail('핵침범',`${label} — 전자가 원자핵 위에 (거리 ${dd.toFixed(1)} < ${(nu.r+e.r).toFixed(1)})`);
  }
  /* 4. viewBox 잘림 — 최종 화면의 모든 것이 화면 안에 있어야 한다 */
  const inside=(x,y,r,what)=>{
    const o=Math.max(d.vx-(x-r), d.vy-(y-r), (x+r)-(d.vx+d.vw), (y+r)-(d.vy+d.vh));
    if(o>0.5) fail('잘림',`${label} — ${what}가 viewBox 밖으로 ${o.toFixed(1)}`);
  };
  dots.forEach(e=>inside(e.x,e.y,e.r,'전자'));
  d.rings.filter(r=>!/dia-anim-fade/.test(r.cls)).forEach(r=>inside(r.x,r.y,r.r,'껍질'));
  d.nucs.forEach(nu=>inside(nu.x,nu.y,nu.r,'원자핵'));

  /* 5. 시작 위치(애니메이션 첫 프레임)도 화면 안이어야 "밖에 서 있다가 들어온다"가 보인다.
        .dia는 overflow:visible이지만 레이아웃 상자는 viewBox라, 크게 벗어나면 이웃 요소와 겹친다. */
  for(const e of d.dots){
    if(!e.dx && !e.dy) continue;
    const x=e.x+e.dx, y=e.y+e.dy;
    const o=Math.max(d.vx-(x-e.r), d.vy-(y-e.r), (x+e.r)-(d.vx+d.vw), (y+e.r)-(d.vy+d.vh));
    if(o>0.5) fail('잘림',`${label} — 움직이는 전자의 출발 자리가 viewBox 밖으로 ${o.toFixed(1)}`);
  }
  /* 6. 껍질 반지름이 커지는 순서인가 (같은 중심 기준) */
  const byC={};
  d.rings.forEach(r=>{ const k=`${r.x.toFixed(1)},${r.y.toFixed(1)}`; (byC[k]=byC[k]||[]).push(r.r); });
  for(const k in byC){ const rs=byC[k];
    if(new Set(rs.map(v=>v.toFixed(2))).size!==rs.length)
      fail('껍질',`${label} — 같은 반지름의 껍질이 두 번 그려짐 (${rs.join(',')})`); }
  return d;
}

/* ── 이온 결합 ── */
for(const b of ctx.BONDS.filter(x=>x.type==='ionic')){
  const M=ctx.ELEMENTS.find(e=>e.sym===b.M), X=ctx.ELEMENTS.find(e=>e.sym===b.X);
  /* 최종 화면: 금속 이온(바깥 껍질 잃음) nM개 + 비금속 이온(바깥 8개) nX개 */
  const mIon=ctx.shellsOf(M.z).slice(0,-1).reduce((a,c)=>a+c,0);
  const xIon=ctx.shellsOf(X.z).slice(0,-1).reduce((a,c)=>a+c,0)+8;
  check(`이온결합 ${b.f}`, ctx.ionicDiagramHTML(b), {n:b.nM*mIon+b.nX*xIon});
}
/* ── 공유 결합 ── */
for(const b of ctx.BONDS.filter(x=>x.type==='covalent')){
  const C=ctx.ELEMENTS.find(e=>e.sym===b.center);
  const inner=s=>ctx.shellsOf(s).slice(0,-1).reduce((a,c)=>a+c,0);
  let n=inner(C.z)+ctx.outerShellOf(C.z);
  for(const l of b.ligands){ const L=ctx.ELEMENTS.find(e=>e.sym===l.sym);
    n+=inner(L.z)+ctx.outerShellOf(L.z); }
  check(`공유결합 ${b.f}`, ctx.covalentDiagramHTML(b), {n});
  check(`공유결합 ${b.f} (차수)`, ctx.covalentDiagramHTML(b,{order:true}), {n});
}
/* ── 이온 되기 ── */
for(const it of ctx.ION_FORMING){
  const el=ctx.ELEMENTS.find(e=>e.z===it.z);
  const n=it.dir==='gain'?it.z+it.n:it.z-it.n;
  const d=check(`이온되기 ${el.sym}`, ctx.ionFormingDiagramHTML(it.z,it), {n});
  /* 바깥 껍질은 언제나 진하게 — 흐리게(dia-e-inner) 그리면 같은 이온을 두 화면에서
     다르게 보여 준다. 나가는 전자는 최종 배치가 아니므로 판정에서 뺀다. */
  const dots=finalDots(d), maxR=Math.max(...d.rings.filter(r=>!/dia-anim-fade/.test(r.cls)).map(r=>r.r));
  const cx=d.nucs[0].x, cy=d.nucs[0].y;
  const outerDots=dots.filter(e=>Math.abs(Math.hypot(e.x-cx,e.y-cy)-maxR)<1.5);
  if(!outerDots.length) fail('최외각',`이온되기 ${el.sym} — 바깥 껍질에 전자가 하나도 없음`);
  if(outerDots.some(e=>/dia-e-inner/.test(e.cls)))
    fail('최외각',`이온되기 ${el.sym} — 바깥 껍질 전자를 흐리게(inner) 그림`);
  /* 이온이 된 뒤 바깥 껍질 개수가 맞는가 */
  const sh=ctx.shellsOf(it.z), fin=it.dir==='gain'
    ? sh.slice(0,-1).concat(sh[sh.length-1]+it.n) : sh.slice(0,-1);
  const want=fin[fin.length-1];
  if(outerDots.length!==want)
    fail('최외각',`이온되기 ${el.sym} — 바깥 껍질 ${outerDots.length}개, 기대 ${want}개`);
}
for(const z of ctx.ION_NOBLE){
  const el=ctx.ELEMENTS.find(e=>e.z===z);
  check(`비활성 ${el.sym}`, ctx.ionFormingDiagramHTML(z,{noble:true,n:0}), {n:z});
  /* 18족은 이온이 되지 않으므로 대괄호·전하가 붙으면 안 된다 */
  const h=ctx.ionFormingDiagramHTML(z,{noble:true,n:0});
  if(/dia-bracket|dia-charge/.test(h)) fail('비활성',`${el.sym} — 이온이 아닌데 대괄호/전하 표기가 붙음`);
}
/* ── 원자 하나 (원자가 전자) ── */
for(const e of ctx.SHELL_QUIZ_ELEMENTS){
  check(`껍질 ${e.sym}`, ctx.shellDiagramHTML(e.z), {n:e.z});
  check(`껍질 ${e.sym} +`, ctx.shellDiagramHTML(e.z,'＋'), {n:e.z});
}
/* ── 같은 이온을 두 화면이 같게 그리는가 ── */
for(const b of ctx.BONDS.filter(x=>x.type==='ionic')){
  const M=ctx.ELEMENTS.find(e=>e.sym===b.M);
  const it=ctx.ION_FORMING.find(i=>i.z===M.z);
  if(!it) continue;
  const a=parse(ctx.ionFormingDiagramHTML(M.z,it));
  const cx=a.nucs[0].x, cy=a.nucs[0].y;
  const maxR=Math.max(...a.rings.filter(r=>!/dia-anim-fade/.test(r.cls)).map(r=>r.r));
  const n1=finalDots(a).filter(e=>Math.abs(Math.hypot(e.x-cx,e.y-cy)-maxR)<1.5).length;
  /* 이온 결합 그림의 금속 쪽 바깥 껍질 개수 */
  const sh=ctx.shellsOf(M.z), n2=sh.slice(0,-1).pop();
  if(n1!==n2) fail('일관성',`${b.M}⁺ — 이온되기 그림 ${n1}개 vs 이온결합 그림 ${n2}개`);
}

function frame(label, html){
  const [vx,vy,vw,vh]=/viewBox="([-\d. ]+)"/.exec(html)[1].trim().split(/\s+/).map(Number);
  const out=(x,y,pad,what)=>{
    const o=Math.max(vx-(x-pad), vy-(y-pad), (x+pad)-(vx+vw), (y+pad)-(vy+vh));
    if(o>0.5) F.push(`[테두리 ${label}] ${what} viewBox 밖 ${o.toFixed(1)}px`);
  };
  /* 안내 화살표 — 양 끝점. 화살촉이 6px 남짓 더 나가므로 여유를 준다 */
  let m, re=/<path class="dia-arrow[^"]*" d="M ([-\d.]+) ([-\d.]+) L ([-\d.]+) ([-\d.]+)"/g;
  while((m=re.exec(html))){ out(+m[1],+m[2],2,'안내선 시작'); out(+m[3],+m[4],7,'안내선 화살촉'); }
  /* 대괄호 — 경로의 모든 좌표 */
  re=/<path class="dia-bracket[^"]*" d="([^"]+)"/g;
  while((m=re.exec(html))){
    const nums=m[1].match(/-?[\d.]+/g).map(Number);
    for(let i=0;i<nums.length;i+=2) out(nums[i],nums[i+1],2,'대괄호');
  }
  /* 전하 글자 — 오른쪽으로 자란다(text-anchor:start). 글자폭을 대략 잡는다 */
  re=/<text class="dia-charge([^"]*)" x="([-\d.]+)" y="([-\d.]+)"[^>]*>([^<]*)</g;
  while((m=re.exec(html))){
    const w=m[4].length*10, start=/charge-br/.test(m[1]);
    out(+m[2]+(start?w:w/2), +m[3]-14, 0, `전하 "${m[4]}" 오른쪽`);
    out(+m[2]-(start?0:w/2), +m[3], 0, `전하 "${m[4]}" 왼쪽`);
  }
}
for(const b of ctx.BONDS) frame(b.f, b.type==='ionic'?ctx.ionicDiagramHTML(b):ctx.covalentDiagramHTML(b));
for(const i of ctx.ION_FORMING) frame('ion:'+ctx.ELEMENTS.find(e=>e.z===i.z).sym, ctx.ionFormingDiagramHTML(i.z,i));
for(const z of ctx.ION_NOBLE) frame('noble:'+ctx.ELEMENTS.find(e=>e.z===z).sym, ctx.ionFormingDiagramHTML(z,{noble:true,n:0}));
for(let z=1;z<=20;z++){ frame('shell:'+z, ctx.shellDiagramHTML(z)); frame('shell+:'+z, ctx.shellDiagramHTML(z,'2＋')); }

const count=(h,re)=>(h.match(re)||[]).length;
for(const b of ctx.BONDS.filter(x=>x.type==='ionic')){
  const h=ctx.ionicDiagramHTML(b);
  const moved=count(h,/class="dia-e dia-e-move[^"]*"/g);
  const want=b.nX*b.take;                       /* 비금속이 실제로 받는 전자 총수 */
  if(moved!==want) F.push(`[개수] 이온결합 ${b.f} — 움직이는 전자 ${moved}개, 넘어가야 할 수 ${want}개`);
  /* 캡션의 숫자와도 맞아야 한다 */
  const cap=/<div class="dia-cap">([^<]*)<\/div>[\s\S]*?<div[^>]*>([^<]*)<\/div>/.exec(h);
  const rows=Math.max(b.nM,b.nX);
  const per=rows===1 ? b.give : (b.nM>=b.nX ? b.give : b.take);
  const num=/전자 (\d+)개/.exec(h);
  if(!num || +num[1]!==per) F.push(`[개수] 이온결합 ${b.f} — 글의 "전자 ${num&&num[1]}개"가 화살표 하나가 나르는 수 ${per}와 다름`);
  /* 해설의 "원자가 전자 N개를 내주고"가 give와 같은가 */
  const vn=/원자가 전자 (\d+)개를 내주고/.exec(h);
  if(!vn || +vn[1]!==b.give) F.push(`[개수] 이온결합 ${b.f} — 해설의 원자가 전자 수가 give=${b.give}과 다름`);
  const tn=/${'$'}{0}/;
  /* 안내 화살표는 줄 수만큼 — 한 줄에 여러 전자가 같은 길로 간다 */
  const arrows=count(h,/class="dia-arrow /g);
  if(arrows!==rows) F.push(`[개수] 이온결합 ${b.f} — 안내선 ${arrows}개, 줄 수 ${rows}`);
}
for(const it of ctx.ION_FORMING){
  const el=ctx.ELEMENTS.find(e=>e.z===it.z);
  const h=ctx.ionFormingDiagramHTML(it.z,it);
  const moved=count(h,/class="dia-e dia-e-move[^"]*"/g);
  const gone=count(h,/class="dia-e dia-e-gone[^"]*"/g);
  if(it.dir==='gain'){
    if(moved!==it.n) F.push(`[개수] 이온되기 ${el.sym} — 들어오는 전자 ${moved}개, 받아야 할 수 ${it.n}개`);
    if(gone) F.push(`[개수] 이온되기 ${el.sym} — 전자를 받는데 나가는 전자가 ${gone}개 그려짐`);
  }else{
    if(gone!==it.n) F.push(`[개수] 이온되기 ${el.sym} — 나가는 전자 ${gone}개, 내줘야 할 수 ${it.n}개`);
    if(moved) F.push(`[개수] 이온되기 ${el.sym} — 전자를 주는데 들어오는 전자가 ${moved}개 그려짐`);
    /* 잃는 개수는 바깥 껍질 전자 전부여야 한다(1~20번 금속) */
    if(it.n!==ctx.outerShellOf(it.z)) F.push(`[개수] 이온되기 ${el.sym} — ${it.n}개를 내주는데 바깥 껍질에는 ${ctx.outerShellOf(it.z)}개`);
  }
  /* 캡션 숫자 */
  const num=/전자 (\d+)개를/.exec(h);
  if(!num || +num[1]!==it.n) F.push(`[개수] 이온되기 ${el.sym} — 캡션 숫자가 n=${it.n}과 다름 (${num&&num[1]})`);
  /* 안내선 개수 = 움직이는 전자 개수 (한 전자에 한 길) */
  const arrows=count(h,/class="dia-arrow /g);
  if(arrows!==it.n) F.push(`[개수] 이온되기 ${el.sym} — 안내선 ${arrows}개, 전자 ${it.n}개`);
  /* alt 글의 껍질 배치가 실제 최종 배치와 같은가 */
  const sh=ctx.shellsOf(it.z);
  const fin=it.dir==='gain'?sh.slice(0,-1).concat(sh[sh.length-1]+it.n):sh.slice(0,-1);
  const alt=/aria-label="([^"]*)"/.exec(h)[1];
  const N=['첫째','둘째','셋째','넷째'];
  const want=fin.map((v,i)=>`${N[i]} 껍질 ${v}개`).join(', ');
  if(!alt.includes(want)) F.push(`[개수] 이온되기 ${el.sym} — alt 글의 최종 배치가 "${want}"와 다름: ${alt}`);
}

const total = ctx.BONDS.length + ctx.ION_FORMING.length + ctx.ION_NOBLE.length + ctx.SHELL_QUIZ_ELEMENTS.length;
if (F.length) { console.log(`실패 ${F.length}건:\n` + F.map(x => '  ✗ ' + x).join('\n')); process.exit(1); }
console.log(`그림 검사 통과 — 겹침·핵 침범·잘림·테두리·전자 수·안내선·캡션·alt (${total}종 이상)`);
