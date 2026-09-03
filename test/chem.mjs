/* 화학 내용 감사 — 앱 데이터를 "믿지 않고" 여기 따로 적은 기준표와 대조한다.
   기준표를 data.js에서 가져오면 같은 오류를 두 번 읽을 뿐이라 아무것도 못 잡는다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const src = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js', 'data.js'), 'utf8');
const ctx = {};
new Function('g', src + `
  Object.assign(g,{REACTIONS,CHEMICALS,COEF_TEMPLATES,ELEMENTS,BONDS,ION_FORMING,ION_NOBLE,
    IONS_WRITE,PRECIPITATES,PT_FLAME_COLORS,PT_QUIZ_ELEMENTS,ORBITAL_SHELLS,ORBITAL_KINDS,
    SHELL_CAPS,PT_CATEGORIES,PT_CAT_COLORS,PT_CAT_COLORS_LIGHT,PT_SIMPLE_EXTRA_Z,CORE_ELEMENTS,
    shellsOf,outerShellOf,valenceOf,fullShellOf,ionNameKo,ANION_KO});
`)(ctx);
const F=[],P=[];
const fail=(t,m)=>F.push(`[${t}] ${m}`), pass=t=>P.push(t);

/* ── 1. 반응식 원자 수지 ── */
const atoms = f => { const m={};
  for(const p of f){ const syms=p.sym.match(/[A-Z][a-z]?/g)||[];
    syms.forEach((s,i)=>{ m[s]=(m[s]||0)+(i===syms.length-1?(p.sub||1):1); }); }
  return m; };
const side = arr => { const m={};
  for(const t of arr){ const a=atoms(t.formula);
    for(const k in a) m[k]=(m[k]||0)+a[k]*t.coef; } return m; };
let n=0;
for(const r of ctx.REACTIONS){
  const L=side(r.reactants), R=side(r.products);
  const keys=[...new Set([...Object.keys(L),...Object.keys(R)])];
  const bad=keys.filter(k=>(L[k]||0)!==(R[k]||0));
  if(bad.length) fail('반응식',`${r.name} — ${bad.map(k=>`${k}: 왼쪽 ${L[k]||0} ≠ 오른쪽 ${R[k]||0}`).join(', ')}`);
  else n++;
  /* 계수 최소화(공약수 1) — 2H₂+O₂→2H₂O를 4·2·4로 적으면 답이 틀린 건 아니지만 교과서 답이 아니다 */
  const cs=[...r.reactants,...r.products].map(t=>t.coef);
  const gcd=(a,b)=>b?gcd(b,a%b):a; const g=cs.reduce(gcd);
  if(g!==1) fail('반응식',`${r.name} — 계수의 공약수가 ${g}, 기약이 아님 (${cs.join(',')})`);
}
pass(`반응식 ${n}/${ctx.REACTIONS.length}건 원자 수지 일치`);

/* ── 2. 계수 맞추기 템플릿 ── */
let tn=0;
for(const t of ctx.COEF_TEMPLATES){
  const {fmt,fmtP}=t.gen();
  const L=side(fmt), R=side(fmtP);
  const keys=[...new Set([...Object.keys(L),...Object.keys(R)])];
  const bad=keys.filter(k=>(L[k]||0)!==(R[k]||0));
  if(bad.length) fail('계수템플릿',`${t.label} — ${bad.map(k=>`${k}: ${L[k]||0}≠${R[k]||0}`).join(', ')}`);
  else tn++;
  const cs=[...fmt,...fmtP].map(x=>x.coef); const gcd=(a,b)=>b?gcd(b,a%b):a;
  const g=cs.reduce(gcd);
  if(g!==1) fail('계수템플릿',`${t.label} — 계수 공약수 ${g} (${cs.join(',')})`);
  /* 라벨이 실제 식과 맞는가 — 라벨만 보고 푸는 문제라 라벨이 틀리면 답이 없다 */
  const strip=a=>a.map(x=>x.formula.map(p=>p.sym+(p.sub?'₀₁₂₃₄₅₆₇₈₉'[p.sub]:'')).join('')).join(' + ');
  const got=`${strip(fmt)} → ${strip(fmtP)}`;
  if(got!==t.label) fail('계수템플릿',`라벨 "${t.label}" ≠ 실제 "${got}"`);
}
pass(`계수 템플릿 ${tn}/${ctx.COEF_TEMPLATES.length}건 수지 일치`);

/* ── 3. 원소표 (독립 기준: z → [기호, 족, 주기]) ── */
const REF={1:['H',1,1],2:['He',18,1],3:['Li',1,2],4:['Be',2,2],5:['B',13,2],6:['C',14,2],7:['N',15,2],
 8:['O',16,2],9:['F',17,2],10:['Ne',18,2],11:['Na',1,3],12:['Mg',2,3],13:['Al',13,3],14:['Si',14,3],
 15:['P',15,3],16:['S',16,3],17:['Cl',17,3],18:['Ar',18,3],19:['K',1,4],20:['Ca',2,4],21:['Sc',3,4],
 22:['Ti',4,4],23:['V',5,4],24:['Cr',6,4],25:['Mn',7,4],26:['Fe',8,4],27:['Co',9,4],28:['Ni',10,4],
 29:['Cu',11,4],30:['Zn',12,4],31:['Ga',13,4],32:['Ge',14,4],33:['As',15,4],34:['Se',16,4],
 35:['Br',17,4],36:['Kr',18,4],37:['Rb',1,5],38:['Sr',2,5],39:['Y',3,5],40:['Zr',4,5],41:['Nb',5,5],
 42:['Mo',6,5],43:['Tc',7,5],44:['Ru',8,5],45:['Rh',9,5],46:['Pd',10,5],47:['Ag',11,5],48:['Cd',12,5],
 49:['In',13,5],50:['Sn',14,5],51:['Sb',15,5],52:['Te',16,5],53:['I',17,5],54:['Xe',18,5],
 55:['Cs',1,6],56:['Ba',2,6],57:['La',null,6],58:['Ce',null,6],59:['Pr',null,6],60:['Nd',null,6],
 61:['Pm',null,6],62:['Sm',null,6],63:['Eu',null,6],64:['Gd',null,6],65:['Tb',null,6],66:['Dy',null,6],
 67:['Ho',null,6],68:['Er',null,6],69:['Tm',null,6],70:['Yb',null,6],71:['Lu',null,6],
 72:['Hf',4,6],73:['Ta',5,6],74:['W',6,6],75:['Re',7,6],76:['Os',8,6],77:['Ir',9,6],78:['Pt',10,6],
 79:['Au',11,6],80:['Hg',12,6],81:['Tl',13,6],82:['Pb',14,6],83:['Bi',15,6],84:['Po',16,6],
 85:['At',17,6],86:['Rn',18,6],87:['Fr',1,7],88:['Ra',2,7],89:['Ac',null,7],90:['Th',null,7],
 91:['Pa',null,7],92:['U',null,7],93:['Np',null,7],94:['Pu',null,7],95:['Am',null,7],96:['Cm',null,7],
 97:['Bk',null,7],98:['Cf',null,7],99:['Es',null,7],100:['Fm',null,7],101:['Md',null,7],
 102:['No',null,7],103:['Lr',null,7],104:['Rf',4,7],105:['Db',5,7],106:['Sg',6,7],107:['Bh',7,7],
 108:['Hs',8,7],109:['Mt',9,7],110:['Ds',10,7],111:['Rg',11,7],112:['Cn',12,7],113:['Nh',13,7],
 114:['Fl',14,7],115:['Mc',15,7],116:['Lv',16,7],117:['Ts',17,7],118:['Og',18,7]};
/* 분류 기준 — 통상적인 주기율표 색칠 관례 */
const REF_CAT={};
const put=(zs,c)=>zs.forEach(z=>REF_CAT[z]=c);
put([3,11,19,37,55,87],'alkali'); put([4,12,20,38,56,88],'alkaline');
put([2,10,18,36,54,86],'noble'); put([9,17,35,53,85],'halogen');
put([1,6,7,8,15,16,34],'nonmetal');
put([5,14,32,33,51,52],'metalloid');
put([13,31,49,50,81,82,83,84,113,114,115,116],'post');
for(let z=57;z<=71;z++) REF_CAT[z]='lanth';
for(let z=89;z<=103;z++) REF_CAT[z]='actin';
for(const z of [21,22,23,24,25,26,27,28,29,30,39,40,41,42,43,44,45,46,47,48,
  72,73,74,75,76,77,78,79,80,104,105,106,107,108,111,112]) REF_CAT[z]='transition';
/* ── 초중원소: 「109번부터 전부 미확인」이 아니다 ──
   처음에 이 기준표를 109~118 전부 unknown으로 적었다가 앱과 5건이 어긋났는데,
   틀린 쪽은 기준표였다. 코페르니슘(112)과 플레로븀(114)은 기체 화학 실험으로
   각각 12족·14족 금속답게 행동함이 확인돼 분류가 붙는다. 나머지 여덟만 미확인이다.
   (표준 주기율표 색을 따른다는 이 앱의 기준과도 일치한다.) */
for(const z of [109,110,111,113,115,116,117,118]) REF_CAT[z]='unknown';
REF_CAT[112]='transition'; REF_CAT[114]='post';
/* ── 폴로늄(84) ──
   앱은 준금속으로 둔다. 널리 인정되는 준금속은 B·Si·Ge·As·Sb·Te 여섯이고
   Po·At·Se는 저자에 따라 넣기도 빼기도 하는 자리다(위키백과 「Metalloid」 문서가
   그렇게 적는다). 틀린 분류가 아니라 갈리는 분류라 앱의 선택을 그대로 둔다 —
   다만 다음 사람이 아무 근거 없이 뒤집지 않도록 여기 적어 둔다.
   교육과정 밖 원소이고 퀴즈 출제 범위(PT_QUIZ_ELEMENTS)에도 들어가지 않는다. */
REF_CAT[84]='metalloid';
let en=0;
for(const e of ctx.ELEMENTS){
  const r=REF[e.z];
  if(!r){ fail('원소표',`z=${e.z} 기준표에 없음`); continue; }
  if(e.sym!==r[0]) fail('원소표',`z=${e.z} 기호 ${e.sym} ≠ ${r[0]}`);
  if(r[1]!==null && e.group!==r[1]) fail('원소표',`${e.sym}(z=${e.z}) 족 ${e.group} ≠ ${r[1]}`);
  if(r[1]===null && e.group!==undefined) fail('원소표',`${e.sym} f-블록인데 group=${e.group}이 붙어 있음`);
  if(e.period!==r[2]) fail('원소표',`${e.sym} 주기 ${e.period} ≠ ${r[2]}`);
  if(REF_CAT[e.z] && e.cat!==REF_CAT[e.z]) fail('원소표',`${e.sym} 분류 ${e.cat} ≠ ${REF_CAT[e.z]}`);
  en++;
}
const zs=ctx.ELEMENTS.map(e=>e.z);
for(let z=1;z<=118;z++) if(!zs.includes(z)) fail('원소표',`z=${z} 누락`);
if(new Set(zs).size!==zs.length) fail('원소표','원자번호 중복');
const syms=ctx.ELEMENTS.map(e=>e.sym);
if(new Set(syms).size!==syms.length) fail('원소표','원소 기호 중복');
pass(`원소 ${en}종 기호·족·주기·분류 대조`);
/* f 번호 — 란타넘/악티늄족 1~15 연속 */
for(const blk of ['lanth','actin']){
  const g=ctx.ELEMENTS.filter(e=>e.cat===blk).sort((a,b)=>a.z-b.z);
  if(g.length!==15) fail('원소표',`${blk} ${g.length}종 (15이어야 함)`);
  g.forEach((e,i)=>{ if(e.f!==i+1) fail('원소표',`${e.sym} f=${e.f} ≠ ${i+1}`); });
}
pass('란타넘족·악티늄족 각 15종, f 번호 연속');

/* ── 4. 껍질 배치 (1~20) ── */
const REF_SHELL={1:[1],2:[2],3:[2,1],4:[2,2],5:[2,3],6:[2,4],7:[2,5],8:[2,6],9:[2,7],10:[2,8],
 11:[2,8,1],12:[2,8,2],13:[2,8,3],14:[2,8,4],15:[2,8,5],16:[2,8,6],17:[2,8,7],18:[2,8,8],
 19:[2,8,8,1],20:[2,8,8,2]};
for(let z=1;z<=20;z++){
  const got=ctx.shellsOf(z).join(','), want=REF_SHELL[z].join(',');
  if(got!==want) fail('전자껍질',`z=${z} ${got} ≠ ${want}`);
  const wantV = [2,10,18].includes(z) ? 0 : REF_SHELL[z][REF_SHELL[z].length-1];
  if(ctx.valenceOf(z)!==wantV) fail('전자껍질',`z=${z} 원자가 전자 ${ctx.valenceOf(z)} ≠ ${wantV}`);
}
pass('1~20번 껍질 배치·원자가 전자');

/* ── 5. 이온 형성 ── */
const REF_ION={1:[1,'gain'],3:[1,'lose'],4:[2,'lose'],7:[3,'gain'],8:[2,'gain'],9:[1,'gain'],
 11:[1,'lose'],12:[2,'lose'],13:[3,'lose'],15:[3,'gain'],16:[2,'gain'],17:[1,'gain'],
 19:[1,'lose'],20:[2,'lose']};
for(const it of ctx.ION_FORMING){
  const r=REF_ION[it.z];
  const sym=ctx.ELEMENTS.find(e=>e.z===it.z).sym;
  if(!r){ fail('이온형성',`${sym} 기준표에 없는 이온`); continue; }
  if(it.n!==r[0]||it.dir!==r[1]) fail('이온형성',`${sym} ${it.dir} ${it.n} ≠ ${r[1]} ${r[0]}`);
  /* 이온이 된 뒤 전자 수가 비활성 기체와 같아야 한다 */
  const after=it.z+(it.dir==='gain'?it.n:-it.n);
  if(![2,10,18].includes(after)) fail('이온형성',`${sym} 이온의 전자 수 ${after}가 He/Ne/Ar 어느 것도 아님`);
}
for(const z in REF_ION) if(!ctx.ION_FORMING.some(i=>i.z===+z))
  fail('이온형성',`z=${z} 기준표에 있는데 목록에 없음`);
if(ctx.ION_NOBLE.join()!=='2,10,18') fail('이온형성',`ION_NOBLE ${ctx.ION_NOBLE} ≠ 2,10,18`);
pass(`이온 형성 ${ctx.ION_FORMING.length}종 전하·방향·옥텟 도달`);

/* ── 5b. 단원자 이온의 한글 이름 ──
   음이온은 「-화 이온」이다. Cl⁻을 「염소 이온」이라고 쓰면 틀린 말이라,
   해설 문장이 이 이름을 만들어 쓰는 이상 여기서 못 박아 둔다. */
const REF_ANION={H:'수소화 이온',N:'질화 이온',P:'인화 이온',O:'산화 이온',
 S:'황화 이온',F:'플루오린화 이온',Cl:'염화 이온'};
for(const it of ctx.ION_FORMING){
  const sym=ctx.ELEMENTS.find(e=>e.z===it.z).sym;
  const got=ctx.ionNameKo(sym,it.dir);
  const want=it.dir==='gain' ? REF_ANION[sym] : ctx.ELEMENTS.find(e=>e.z===it.z).name+' 이온';
  if(!want) fail('이온이름',`${sym} 기준표에 없음`);
  else if(got!==want) fail('이온이름',`${sym} "${got}" ≠ "${want}"`);
}
pass('단원자 이온 한글 이름 (음이온은 -화 이온)');

/* ── 6. 이온식 ── */
const REF_IW={'수소 이온':'H^+','나트륨 이온':'Na^+','칼륨 이온':'K^+','칼슘 이온':'Ca^2+',
 '마그네슘 이온':'Mg^2+','알루미늄 이온':'Al^3+','염화 이온':'Cl^-','산화 이온':'O^2-',
 '암모늄 이온':'NH4^+','수산화 이온':'OH^-','질산 이온':'NO3^-','탄산 이온':'CO3^2-',
 '탄산수소 이온':'HCO3^-','황산 이온':'SO4^2-','인산 이온':'PO4^3-','아세트산 이온':'CH3COO^-'};
for(const i of ctx.IONS_WRITE){
  if(!(i.name in REF_IW)) fail('이온식',`"${i.name}" 기준표에 없음`);
  else if(REF_IW[i.name]!==i.f) fail('이온식',`${i.name} ${i.f} ≠ ${REF_IW[i.name]}`);
}
for(const k in REF_IW) if(!ctx.IONS_WRITE.some(i=>i.name===k)) fail('이온식',`"${k}" 누락`);
/* 표기 규칙: 전하는 반드시 끝의 ^[숫자][+/-] 꼴 하나 */
for(const i of ctx.IONS_WRITE){
  if(!/^[A-Za-z0-9]+\^[0-9]?[+-]$/.test(i.f)) fail('이온식',`${i.name} "${i.f}" 표기 규칙 위반`);
  if(/\^1[+-]/.test(i.f)) fail('이온식',`${i.name} 전하 1은 생략해야 함`);
}
pass(`이온식 ${ctx.IONS_WRITE.length}종 표기·전하`);

/* ── 7. 앙금 ── */
const REF_PPT={'Ag^+|Cl^-':['AgCl','흰색'],'Ag^+|I^-':['AgI','노란색'],
 'Ca^2+|CO3^2-':['CaCO3','흰색'],'Ba^2+|CO3^2-':['BaCO3','흰색'],'Ba^2+|SO4^2-':['BaSO4','흰색'],
 'Pb^2+|I^-':['PbI2','노란색'],'Cu^2+|S^2-':['CuS','검은색'],'Pb^2+|S^2-':['PbS','검은색'],
 'Cd^2+|S^2-':['CdS','노란색']};
const REF_SOL=['Na^+|Cl^-','K^+|NO3^-','Na^+|SO4^2-','K^+|CO3^-','K^+|CO3^2-'];
const chg=f=>{ const m=/\^([0-9]?)([+-])$/.exec(f); return (m[1]?+m[1]:1)*(m[2]==='+'?1:-1); };
for(const p of ctx.PRECIPITATES){
  const k=`${p.a}|${p.b}`;
  if(p.none){ if(!REF_SOL.includes(k)) fail('앙금',`${k} 안 생긴다고 돼 있으나 기준표에 없음`); continue; }
  const r=REF_PPT[k];
  if(!r){ fail('앙금',`${k} 기준표에 없음`); continue; }
  if(p.f!==r[0]) fail('앙금',`${k} 화학식 ${p.f} ≠ ${r[0]}`);
  if(p.color!==r[1]) fail('앙금',`${p.name} 색 ${p.color} ≠ ${r[1]}`);
  /* 화학식의 전하 총합이 0이어야 한다 */
  const ca=chg(p.a), cb=chg(p.b);
  const g=(a,b)=>b?g(b,a%b):a; const l=Math.abs(ca*cb)/g(Math.abs(ca),Math.abs(cb));
  const na=l/Math.abs(ca), nb=l/Math.abs(cb);
  const base=f=>f.replace(/\^.*$/,'');
  const want=(na>1?`(${base(p.a)})${na}`:base(p.a))+(nb>1?`(${base(p.b)})${nb}`:base(p.b));
  const got=p.f.replace(/[()]/g,''), wa=want.replace(/[()]/g,'');
  if(got!==wa) fail('앙금',`${p.name} 화학식 ${p.f} — 전하 균형상 ${want} 이어야 함`);
}
for(const k in REF_PPT) if(!ctx.PRECIPITATES.some(p=>`${p.a}|${p.b}`===k)) fail('앙금',`${k} 누락`);
pass(`앙금 ${ctx.PRECIPITATES.filter(p=>!p.none).length}건 화학식·색·전하 균형, 비앙금 ${ctx.PRECIPITATES.filter(p=>p.none).length}건`);

/* ── 8. 화학 결합 ── */
for(const b of ctx.BONDS){
  if(b.type==='ionic'){
    const M=ctx.ELEMENTS.find(e=>e.sym===b.M), X=ctx.ELEMENTS.find(e=>e.sym===b.X);
    if(b.nM*b.give!==b.nX*b.take)
      fail('결합',`${b.f} 전자 수지 ${b.nM}×${b.give} ≠ ${b.nX}×${b.take}`);
    /* give/take가 그 원소의 실제 이온 전하와 같은가 */
    const mi=ctx.ION_FORMING.find(i=>i.z===M.z), xi=ctx.ION_FORMING.find(i=>i.z===X.z);
    if(!mi||mi.dir!=='lose'||mi.n!==b.give) fail('결합',`${b.f} ${b.M}이 내주는 전자 ${b.give}가 이온 전하와 불일치`);
    if(!xi||xi.dir!=='gain'||xi.n!==b.take) fail('결합',`${b.f} ${b.X}이 받는 전자 ${b.take}가 이온 전하와 불일치`);
    /* 화학식이 nM·nX와 맞는가 */
    const want=b.M+(b.nM>1?b.nM:'')+b.X+(b.nX>1?b.nX:'');
    if(want!==b.f) fail('결합',`${b.f} — nM/nX로는 ${want}`);
    if(M.cat!=='alkali'&&M.cat!=='alkaline'&&M.cat!=='post'&&M.cat!=='transition')
      fail('결합',`${b.f} 금속 자리에 ${b.M}(${M.cat})`);
  } else {
    const C=ctx.ELEMENTS.find(e=>e.sym===b.center);
    const cPairs=b.ligands.reduce((s,l)=>s+l.pairs,0);
    const cOuter=ctx.outerShellOf(C.z);
    const cLone=cOuter-cPairs;
    if(cLone<0) fail('결합',`${b.f} 중심 ${b.center} 전자 부족 (바깥 ${cOuter}, 공유 ${cPairs})`);
    if(cLone%2!==0) fail('결합',`${b.f} 중심 ${b.center} 비공유 전자 ${cLone}개 — 쌍이 안 맞음(홀전자)`);
    if(cOuter+cPairs!==ctx.fullShellOf(C.z))
      fail('결합',`${b.f} 중심 ${b.center} 옥텟 미달/초과: ${cOuter}+${cPairs}=${cOuter+cPairs} ≠ ${ctx.fullShellOf(C.z)}`);
    for(const l of b.ligands){
      const L=ctx.ELEMENTS.find(e=>e.sym===l.sym);
      const lOuter=ctx.outerShellOf(L.z), lLone=lOuter-l.pairs;
      if(lLone<0) fail('결합',`${b.f} ${l.sym} 전자 부족`);
      if(lLone%2!==0) fail('결합',`${b.f} ${l.sym} 비공유 전자 ${lLone}개 — 홀전자`);
      if(lOuter+l.pairs!==ctx.fullShellOf(L.z))
        fail('결합',`${b.f} ${l.sym} 옥텟: ${lOuter}+${l.pairs}=${lOuter+l.pairs} ≠ ${ctx.fullShellOf(L.z)}`);
      if(L.cat==='alkali'||L.cat==='alkaline'||L.cat==='transition')
        fail('결합',`${b.f} 공유결합에 금속 ${l.sym}`);
    }
    /* 화학식과 리간드 구성이 맞는가 */
    const cnt={}; cnt[b.center]=1;
    b.ligands.forEach(l=>cnt[l.sym]=(cnt[l.sym]||0)+1);
    const inF={}; (b.f.match(/[A-Z][a-z]?[0-9]*/g)||[]).forEach(t=>{
      const m=/^([A-Z][a-z]?)([0-9]*)$/.exec(t); inF[m[1]]=(inF[m[1]]||0)+(m[2]?+m[2]:1); });
    for(const k of new Set([...Object.keys(cnt),...Object.keys(inF)]))
      if((cnt[k]||0)!==(inF[k]||0)) fail('결합',`${b.f} ${k} 원자 수 ${cnt[k]||0} ≠ 화학식 ${inF[k]||0}`);
  }
}
pass(`화학 결합 ${ctx.BONDS.length}건 (이온 전자수지·공유 옥텟·화학식 일치)`);

/* ── 9. 불꽃 반응 색 ── */
const REF_FLAME={29:'청록',3:'빨강',11:'노랑',19:'보라',38:'빨강',56:'황록',20:'주황'};
for(const f of ctx.PT_FLAME_COLORS){
  if(REF_FLAME[f.z]!==f.label)
    fail('불꽃반응',`z=${f.z} ${f.label} ≠ ${REF_FLAME[f.z]}`);
}
for(const z in REF_FLAME) if(!ctx.PT_FLAME_COLORS.some(f=>f.z===+z)) fail('불꽃반응',`z=${z} 누락`);
pass(`불꽃 반응 ${ctx.PT_FLAME_COLORS.length}종`);

/* ── 10. 오비탈 ── */
for(const s of ctx.ORBITAL_SHELLS){
  if(s.max!==2*s.n*s.n) fail('오비탈',`${s.name}껍질 최대 ${s.max} ≠ 2n²=${2*s.n*s.n}`);
  const kinds=s.make.split(' + ').map(x=>x.slice(-1));
  const sum=kinds.reduce((a,k)=>a+ctx.ORBITAL_KINDS.find(o=>o.kind===k).max,0);
  if(sum!==s.max) fail('오비탈',`${s.name}: ${s.make} = ${sum} ≠ ${s.max}`);
  for(const k of kinds){ const o=ctx.ORBITAL_KINDS.find(x=>x.kind===k);
    if(o.from>s.n) fail('오비탈',`${s.name}(n=${s.n})에 ${k} 오비탈 — ${o.from}번 껍질부터 생김`); }
  if(!s.make.split(' + ').every(x=>x.startsWith(String(s.n))))
    fail('오비탈',`${s.name}: "${s.make}"의 주양자수가 ${s.n}이 아님`);
}
for(const o of ctx.ORBITAL_KINDS) if(o.max!==o.count*2)
  fail('오비탈',`${o.kind} 최대 ${o.max} ≠ 오비탈 ${o.count}개 × 2`);
pass('오비탈 개수·2n²·등장 껍질');

/* ── 11. 주기율표 퀴즈 범위: (주기,족) 좌표가 유일한가 ── */
const seen={};
for(const e of ctx.PT_QUIZ_ELEMENTS){
  const k=`${e.period}-${e.group}`;
  if(seen[k]) fail('주기율표퀴즈',`(${e.period}주기 ${e.group}족) 중복: ${seen[k]}, ${e.sym}`);
  seen[k]=e.sym;
  if(e.group===undefined) fail('주기율표퀴즈',`${e.sym} 족 없음`);
}
pass(`주기·족 퀴즈 ${ctx.PT_QUIZ_ELEMENTS.length}종, 좌표 유일`);

/* ── 12. 분류 색: 화면에 실제 쓰이는 11개가 모두 정의됐는가 ── */
for(const [id,ko] of ctx.PT_CATEGORIES){
  if(!ctx.PT_CAT_COLORS[id]) fail('분류색',`${id}(${ko}) 다크 색 없음`);
  if(!ctx.PT_CAT_COLORS_LIGHT[id]) fail('분류색',`${id}(${ko}) 라이트 색 없음`);
  if(!ctx.ELEMENTS.some(e=>e.cat===id)) fail('분류색',`${id} 분류를 쓰는 원소가 없음`);
}
for(const e of ctx.ELEMENTS)
  if(!ctx.PT_CATEGORIES.some(([id])=>id===e.cat)) fail('분류색',`${e.sym} 분류 "${e.cat}" 미정의`);
pass('분류 11종 ↔ 색·원소 양방향');

/* ── 13. 키패드에 필요한 기호가 다 있는가 ── */
const need=new Set();
for(const r of ctx.REACTIONS) for(const t of [...r.reactants,...r.products])
  for(const p of t.formula) (p.sym.match(/[A-Z][a-z]?/g)||[]).forEach(s=>need.add(s));
for(const s of need) if(!ctx.CORE_ELEMENTS.includes(s))
  fail('키패드',`반응식에 쓰이는 "${s}"가 CORE_ELEMENTS에 없음 — 입력 불가`);
pass(`반응식이 쓰는 기호 ${need.size}종 전부 키패드에 있음`);

/* ── 14. CHEMICALS ↔ REACTIONS ── */
const fs2=f=>f.map(p=>p.sym+(p.sub||'')).join('');
const chem=new Set(ctx.CHEMICALS.map(c=>fs2(c.formula)));
for(const r of ctx.REACTIONS) for(const t of [...r.reactants,...r.products])
  if(!chem.has(fs2(t.formula))) fail('물질목록',`${r.name}의 ${fs2(t.formula)}가 CHEMICALS에 없음`);
const names=ctx.CHEMICALS.map(c=>c.name);
if(new Set(names).size!==names.length) fail('물질목록','물질 이름 중복');
pass(`반응식에 나오는 물질 전부 CHEMICALS에 등록`);

console.log(P.map(x=>'  ✓ '+x).join('\n'));
if(F.length){ console.log(`\n실패 ${F.length}건:\n`+F.map(x=>'  ✗ '+x).join('\n')); process.exit(1); }
console.log('\n실패 0건');
