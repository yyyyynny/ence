/* ── 전자껍질·화학 결합 그림 ──
   2022 개정 [10통과1-02-03] 해설이 화학 결합을 형성하는 이유를 "전자껍질 모형을 이용한
   전자배치를 통해" 설명하라고 명시한다. 그래서 이 그림은 곁다리 장식이 아니라 학습 내용 자체다.
   그린 내용이 화학적으로 틀리면 안 되므로 전자 개수는 전부 shellsOf/outerShellOf에서 계산하고
   좌표만 여기서 정한다.

   이온 결합은 껍질 전체를 그린다 — 어느 껍질에 있던 전자가 어디로 가는지가 핵심이라서다.
   공유 결합은 바깥 껍질만 그린다 — CH₄처럼 원자가 다섯 개인 분자에서 모든 껍질을 그리면
   겹쳐서 오히려 안 보인다. 교과서 공유결합 그림도 바깥 껍질만 그린다. */

const DIA = {
  NUC: 15,      /* 원자핵 원 반지름 */
  R0: 25,       /* 첫 번째 껍질 반지름 */
  RSTEP: 14,    /* 껍질 간격 */
  E: 3.4,       /* 전자 점 반지름 */

  /* 껍질 배치대로 전자를 원 위에 고르게 찍는다. 12시부터 시계 방향. */
  dots(cx, cy, r, n, cls){
    let s = '';
    for(let i = 0; i < n; i++){
      const a = (-90 + i * 360 / n) * Math.PI / 180;
      s += `<circle class="${cls}" cx="${(cx + r * Math.cos(a)).toFixed(1)}" cy="${(cy + r * Math.sin(a)).toFixed(1)}" r="${this.E}"/>`;
    }
    return s;
  },

  /* 전체 껍질을 그린 원자 하나. shells를 그대로 받으므로 이온(전자를 잃은 뒤)도 같은 함수로 그린다. */
  atom(sym, shells, cx, cy, charge){
    let s = `<circle class="dia-nuc" cx="${cx}" cy="${cy}" r="${this.NUC}"/>`;
    s += `<text class="dia-sym" x="${cx}" y="${cy}">${sym}</text>`;
    shells.forEach((n, i) => {
      const r = this.R0 + i * this.RSTEP;
      s += `<circle class="dia-ring" cx="${cx}" cy="${cy}" r="${r}"/>`;
      s += this.dots(cx, cy, r, n, 'dia-e');
    });
    if(charge){
      const r = this.R0 + (shells.length - 1) * this.RSTEP;
      s += `<text class="dia-charge" x="${cx + r + 12}" y="${cy - r - 4}">${charge}</text>`;
    }
    return s;
  },

  atomRadius(shells){ return this.R0 + (shells.length - 1) * this.RSTEP; },

  /* 전하 표기 — 1은 생략한다(Na⁺이지 Na¹⁺가 아니다) */
  chargeText(n, sign){ return (n > 1 ? n : '') + sign; },

  /* 비공유 전자는 낱개가 아니라 쌍으로 존재한다 — 두 개씩 붙여 찍어야 교과서 그림과 같아진다.
     baseDeg 방향을 중심으로 쌍들을 부채꼴로 펼친다. centerAtom이면 결합 반대편 넓은 쪽에 놓는다. */
  lonePairs(cx, cy, r, count, baseDeg, centerAtom){
    if(count <= 0) return '';
    const pairs = Math.floor(count / 2), odd = count % 2;
    const slots = pairs + odd;
    const spread = centerAtom ? 100 : 74;          /* 쌍들이 퍼지는 각도 범위 */
    const rr = r + 10;
    let s = '';
    for(let i = 0; i < slots; i++){
      const base = baseDeg + (slots === 1 ? 0 : (i / (slots - 1) - 0.5) * spread);
      const isPair = i < pairs;
      const halves = isPair ? [-7, 7] : [0];       /* 한 쌍이면 두 점, 홀수로 남으면 한 점 */
      halves.forEach(dd => {
        const a = (base + dd) * Math.PI / 180;
        s += `<circle class="dia-e" cx="${(cx + rr * Math.cos(a)).toFixed(1)}" cy="${(cy + rr * Math.sin(a)).toFixed(1)}" r="${this.E}"/>`;
      });
    }
    return s;
  },
};

/* ── 이온 결합 ──
   결합 전(중성 원자 + 전자 이동 화살표)과 결합 후(이온) 두 장을 나란히 보여준다.
   화학식의 원자 개수(nM·nX)대로 그려서 전자 수지가 눈에 보이게 한다. */
function ionicDiagramHTML(b){
  const M = ELEMENTS.find(e => e.sym === b.M), X = ELEMENTS.find(e => e.sym === b.X);
  const mS = shellsOf(M.z), xS = shellsOf(X.z);
  /* 금속은 바깥 껍질을 통째로 내주므로 껍질 하나가 사라진다. 비금속은 바깥 껍질이 8이 된다. */
  const mIon = mS.slice(0, -1);
  const xIon = xS.slice(0, -1).concat(8);

  const rows = Math.max(b.nM, b.nX);
  const H = rows * (2 * DIA.atomRadius(mS.length >= xS.length ? mS : xS) + 26);
  const cellH = H / rows;
  const lx = 90, rx = 310, W = 400;

  const col = (sym, shells, n, x, charge) => {
    let s = '';
    for(let i = 0; i < n; i++) s += DIA.atom(sym, shells, x, cellH * (i + 0.5), charge);
    return s;
  };
  /* 화살표: 금속 하나가 give개씩 내주고 비금속 하나가 take개씩 받는다.
     개수가 다르면 많은 쪽에 맞춰 선을 그어 어느 원자에서 어디로 가는지 보이게 한다. */
  const arrows = () => {
    let s = '';
    const n = Math.max(b.nM, b.nX);
    for(let i = 0; i < n; i++){
      const y1 = cellH * ((b.nM === 1 ? 0 : i) + 0.5);
      const y2 = cellH * ((b.nX === 1 ? 0 : i) + 0.5);
      s += `<path class="dia-arrow" d="M ${lx + DIA.atomRadius(mS) + 8} ${y1} Q 200 ${(y1 + y2) / 2 - 16} ${rx - DIA.atomRadius(xS) - 8} ${y2}" marker-end="url(#diaHead)"/>`;
    }
    /* 화살표가 여러 개면 "전자 2개"가 화살표마다 2개인지 통틀어 2개인지 헷갈린다.
       여러 개일 때는 화살표 하나가 나르는 양을 쓴다. */
    const per = b.nM >= b.nX ? b.give : b.take;
    const label = n === 1 ? `전자 ${b.give}개` : `각각 전자 ${per}개씩`;
    s += `<text class="dia-note" x="200" y="${cellH * 0.5 - DIA.atomRadius(mS) - 6}">${label}</text>`;
    return s;
  };

  const svg = (inner, w, h) =>
    `<svg class="dia" viewBox="0 0 ${w} ${h}" role="img"><defs>
       <marker id="diaHead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
         <path d="M 0 0 L 10 5 L 0 10 z" class="dia-arrowhead"/>
       </marker></defs>${inner}</svg>`;

  const before = svg(col(b.M, mS, b.nM, lx) + col(b.X, xS, b.nX, rx) + arrows(), W, H);
  const after = svg(
    col(b.M, mIon, b.nM, lx, DIA.chargeText(b.give, '+')) +
    col(b.X, xIon, b.nX, rx, DIA.chargeText(b.take, '−')), W, H);

  return `<div class="dia-wrap">
    <div class="dia-panel"><div class="dia-cap">결합 전 — 중성 원자</div>${before}</div>
    <div class="dia-panel"><div class="dia-cap">결합 후 — 이온</div>${after}</div>
    <p class="dia-exp">${M.name}은 원자가 전자 ${valenceOf(M.z)}개를 내주고, ${X.name}은 ${b.take}개를 받아 둘 다 바깥 껍질이 꽉 찬다.
    반대 전하를 띤 이온이 서로 끌어당기는 것이 <b>이온 결합</b>이다.</p>
  </div>`;
}

/* ── 공유 결합 ──
   중심 원자를 가운데 두고 리간드를 방사형으로 배치한다. 바깥 껍질만 그린다.
   각 결합에는 공유 전자쌍을 pairs개 찍고, 남은 전자는 원자 바깥쪽에 비공유 전자로 찍는다.
   비공유 전자 수 = 바깥 껍질에 실제로 든 전자 수 − 그 원자가 내놓은 전자 수(= 참여한 전자쌍 수).
   여기서는 원자가 전자가 아니라 outerShellOf를 쓴다 — 그리는 것은 "결합에 참여하는 개수"가 아니라
   "화면에 찍히는 점의 개수"라서, 두 값이 갈리는 18족에서 원자가 전자를 쓰면 점이 사라진다. */
function covalentDiagramHTML(b){
  const C = ELEMENTS.find(e => e.sym === b.center);
  const cPairs = b.ligands.reduce((s, l) => s + l.pairs, 0);
  const cLone = outerShellOf(C.z) - cPairs;
  const R = 36, BOND = 104, cx = 200, cy = 165, W = 400, H = 330;
  const ligR = sym => sym === 'H' ? 24 : R;

  let s = '';
  s += `<circle class="dia-ring dia-fill" cx="${cx}" cy="${cy}" r="${R}"/>`;
  s += `<text class="dia-sym dia-sym-lg" x="${cx}" y="${cy}">${b.center}</text>`;

  const n = b.ligands.length;
  /* 원자를 어디에 놓느냐가 곧 분자 모양이라, 아무 데나 두면 틀린 그림이 된다.
     물을 일직선으로 그리면 안 되고 이산화탄소를 굽은 모양으로 그려도 안 된다.
     중심 원자에 비공유 전자쌍이 있으면 결합각이 벌어지므로(물 굽은형) 그 기준으로 나눈다.
     분자 구조 이론 자체는 고2 「화학」 소관이라 이름은 붙이지 않고 모양만 사실대로 그린다. */
  let angles;
  if(n === 1)      angles = [0];                       /* 이원자 분자 */
  else if(n === 2) angles = cLone > 0 ? [128, 52] : [180, 0];  /* 물 굽은형 / 이산화탄소 직선형 */
  else if(n === 3) angles = [-90, 30, 150];            /* 평면 삼각 120° */
  else             angles = [-90, 0, 90, 180];         /* 사면체의 평면 표현 */

  b.ligands.forEach((l, i) => {
    const a = angles[i] * Math.PI / 180;
    const ax = Math.cos(a), ay = Math.sin(a);
    const lx = cx + BOND * ax, ly = cy + BOND * ay;
    const L = ELEMENTS.find(e => e.sym === l.sym);
    const lR = ligR(l.sym);
    s += `<circle class="dia-ring dia-fill" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="${lR}"/>`;
    s += `<text class="dia-sym${l.sym === 'H' ? '' : ' dia-sym-lg'}" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}">${l.sym}</text>`;

    /* 공유 전자쌍은 두 원 "사이의 빈 공간" 한가운데 찍는다.
       기하학적 중점을 쓰면 반지름이 큰 원 안쪽에 들어가 버린다(O–H에서 O 안에 찍혔다). */
    const d = (R + (BOND - lR)) / 2;
    const mx = cx + ax * d, my = cy + ay * d;
    const px = -ay, py = ax;                 /* 결합축에 수직 */
    for(let p = 0; p < l.pairs; p++){
      const off = (p - (l.pairs - 1) / 2) * 11;
      /* 한 쌍 = 전자 2개. 결합축을 따라 살짝 벌려 두 원자가 하나씩 내놓은 것을 보인다 */
      [-4.2, 4.2].forEach(t => {
        s += `<circle class="dia-e dia-e-share" cx="${(mx + px * off + ax * t).toFixed(1)}" cy="${(my + py * off + ay * t).toFixed(1)}" r="${DIA.E}"/>`;
      });
    }
    /* 리간드의 비공유 전자 — 중심 반대쪽 바깥에 쌍으로 찍는다 */
    s += DIA.lonePairs(lx, ly, lR, outerShellOf(L.z) - l.pairs, angles[i]);
  });

  /* 중심 원자의 비공유 전자 — 결합이 없는 쪽에 몰아 찍는다 */
  const gapDir = n === 1 ? 180 : (angles[0] + angles[n - 1]) / 2 + 180;
  s += DIA.lonePairs(cx, cy, R, cLone, gapDir, true);

  /* 분자마다 원자 배치가 달라 고정 viewBox를 쓰면 여백만 커지고 그림이 작아진다.
     실제로 그린 원자들의 범위를 재서 딱 맞춘다(전자 점이 원 바깥 14px까지 나가는 것까지 포함). */
  const pad = 16;
  const ext = [[cx, cy, R]].concat(b.ligands.map((l, i) => {
    const a = angles[i] * Math.PI / 180;
    return [cx + BOND * Math.cos(a), cy + BOND * Math.sin(a), ligR(l.sym)];
  }));
  const minX = Math.min(...ext.map(([x, , r]) => x - r - 14)) - pad;
  const maxX = Math.max(...ext.map(([x, , r]) => x + r + 14)) + pad;
  const minY = Math.min(...ext.map(([, y, r]) => y - r - 14)) - pad;
  const maxY = Math.max(...ext.map(([, y, r]) => y + r + 14)) + pad;
  const vb = `${minX.toFixed(0)} ${minY.toFixed(0)} ${(maxX - minX).toFixed(0)} ${(maxY - minY).toFixed(0)}`;

  const pairWord = l => l.pairs === 1 ? '전자쌍 1개' : `전자쌍 ${l.pairs}개`;
  const uniq = [...new Set(b.ligands.map(l => `${b.center}–${l.sym} 사이에 공유 ${pairWord(l)}`))].join(', ');
  return `<div class="dia-wrap">
    <div class="dia-panel"><div class="dia-cap">바깥 껍질 전자와 공유 전자쌍</div>
      <svg class="dia" viewBox="${vb}" role="img">${s}</svg></div>
    <p class="dia-exp">${uniq}. 전자를 주고받는 대신 <b>함께 쓰는</b> 것이 <b>공유 결합</b>이다.
    노란 점이 두 원자가 나눠 갖는 전자다.</p>
  </div>`;
}

function bondDiagramHTML(b){
  return b.type === 'ionic' ? ionicDiagramHTML(b) : covalentDiagramHTML(b);
}

/* 원자 하나의 껍질 그림 — 이온 만들기(MODE 8·9) 해설용 */
function shellDiagramHTML(z, charge){
  const el = ELEMENTS.find(e => e.z === z);
  const sh = shellsOf(z);
  const r = DIA.atomRadius(sh), W = 2 * (r + 24), H = W;
  return `<div class="dia-wrap"><div class="dia-panel">
    <svg class="dia" viewBox="0 0 ${W} ${H}" role="img">${DIA.atom(el.sym, sh, W / 2, H / 2, charge)}</svg>
  </div></div>`;
}
