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

  /* ── 애니메이션 ──
     "전자가 어디로 가는지"는 그림 한 장으로는 안 보인다. 산소가 전자를 2개 얻는다면
     전자가 정말 2개 날아 들어와야 왜 2개인지가 눈에 남는다.

     최종 좌표는 이미 계산돼 있으므로 "어디서 출발하는지"만 --dx/--dy로 넘기고
     CSS transform이 제자리로 되돌린다. 그래서 애니메이션이 끝난 화면은 정지 그림과
     완전히 같다 — 움직임을 끄고 보는 사람(prefers-reduced-motion)에게도 답이 똑같이 보인다.
     이게 이 방식을 고른 이유다. 좌표를 시간에 따라 다시 계산했다면 중간 프레임에서
     전자 개수가 달라 보일 수 있는데, 그건 교육용으로 허용할 수 없다. */
  /* 첫 전자가 움직이기 시작하는 시각(초). 그림이 뜨자마자 움직이면 눈이 가기도 전에
     시작이 끝나 버린다. 카드에서는 뒤집기 전환(0.5s)까지 지나가야 하므로 그보다 넉넉히 잡는다. */
  T0: 0.9,
  STEP: 0.30,    /* 전자 하나와 다음 전자 사이 간격(초) */
  FLY: 42,       /* 화면 밖에서 날아 들어오는 거리 */

  /* from → to 이동. 요소는 to에 그려 두고 시작 오프셋만 준다. */
  from(fx, fy, tx, ty, delay){
    return ` style="--dx:${(fx - tx).toFixed(1)}px;--dy:${(fy - ty).toFixed(1)}px;animation-delay:${delay.toFixed(2)}s"`;
  },
  at(delay){ return ` style="animation-delay:${delay.toFixed(2)}s"`; },

  /* 껍질 위 전자 자리 — 12시부터 시계 방향. 개수만 바꿔 부르면 같은 규칙으로 자리가 정해지므로
     "원래 있던 전자"와 "새로 들어온 전자"가 한 원 위에서 자연스럽게 이어진다. */
  dotPos(cx, cy, r, n){
    const out = [];
    for(let i = 0; i < n; i++){
      const a = (-90 + i * 360 / n) * Math.PI / 180;
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return out;
  },
  dot(x, y, cls, extra){
    return `<circle class="${cls}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${this.E}"${extra || ''}/>`;
  },
  /* 껍질 배치대로 전자를 원 위에 고르게 찍는다. */
  dots(cx, cy, r, n, cls){
    return this.dotPos(cx, cy, r, n).map(([x, y]) => this.dot(x, y, cls)).join('');
  },

  /* 다시 보기 — 그림 HTML을 다시 렌더하면 CSS 애니메이션이 처음부터 재생된다.
     별도 재생 제어가 필요 없어서 버튼 하나로 끝난다. */
  replayBtn(){ return `<button type="button" class="dia-replay">↻ 다시 보기</button>`; },

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
  lonePairs(cx, cy, r, count, baseDeg, centerAtom, delay){
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
        const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a);
        s += delay === undefined
          ? this.dot(x, y, 'dia-e')
          : this.dot(x, y, 'dia-e dia-anim-pop', this.at(delay));
      });
    }
    return s;
  },
};

/* ── 이온 결합 ──
   전에는 「결합 전」·「결합 후」 두 장을 나란히 뒀는데, 정작 중요한 "전자가 넘어간다"는
   두 장 사이의 빈틈에 있어서 보이지 않았다. 한 장으로 합치고 그 이동을 애니메이션으로 보인다.
   화학식의 원자 개수(nM·nX)대로 그려서 전자 수지가 눈에 보이게 한다.

   넘어가는 전자는 "도착지"(비금속 바깥 껍질의 빈자리)에 그려 두고 출발점만 금속 쪽으로 잡는다.
   그래야 애니메이션이 끝난 최종 그림이 정확히 이온 상태가 되고, 전자 총수도 저절로 보존된다. */
function ionicDiagramHTML(b){
  const M = ELEMENTS.find(e => e.sym === b.M), X = ELEMENTS.find(e => e.sym === b.X);
  const mS = shellsOf(M.z), xS = shellsOf(X.z);
  /* 금속은 바깥 껍질을 통째로 내주므로 껍질 하나가 사라진다. 비금속은 바깥 껍질이 8이 된다. */
  const mIon = mS.slice(0, -1);
  const xIon = xS.slice(0, -1).concat(8);
  const mR = DIA.atomRadius(mS), xR = DIA.atomRadius(xS);
  const mOutR = DIA.R0 + (mS.length - 1) * DIA.RSTEP;   /* 금속이 내줄 전자가 있는 껍질 */
  const xOutR = DIA.R0 + (xS.length - 1) * DIA.RSTEP;   /* 비금속이 받을 껍질 */

  const rows = Math.max(b.nM, b.nX);
  const TOP = 26;                                   /* 「전자 N개」 라벨 자리 — 전하 표기와 겹치지 않게 따로 뗀다 */
  const rowH = 2 * Math.max(mR, xR) + 30;
  const H = TOP + rows * rowH;
  const lx = 90, rx = 310, W = 400;
  /* 한쪽 원자가 하나뿐이면(CaCl₂의 Ca) 세로 가운데에 둔다. 첫 줄에 붙여 두면
     아래쪽이 통째로 비어 그림이 한쪽으로 쏠린다. */
  const rowY = (k, cnt) => TOP + rowH * ((cnt === 1 ? (rows - 1) / 2 : k) + 0.5);
  const my = i => rowY(i, b.nM), xy = j => rowY(j, b.nX);

  /* 내주는 전자 ↔ 받는 자리를 하나씩 짝짓는다. 금속이 내놓는 총 개수(nM×give)와
     비금속이 받는 총 개수(nX×take)는 화학식이 맞다면 반드시 같다 — 그 짝을 그대로 쓴다. */
  const outs = [];
  for(let i = 0; i < b.nM; i++)
    for(const [x, y] of DIA.dotPos(lx, my(i), mOutR, mS[mS.length - 1])) outs.push([x, y]);
  const ins = [];
  for(let j = 0; j < b.nX; j++){
    const slots = DIA.dotPos(rx, xy(j), xOutR, 8);
    for(let t = 0; t < b.take; t++) ins.push(slots[8 - b.take + t]);
  }
  const moved = Math.min(outs.length, ins.length);
  const lastAt = DIA.T0 + Math.max(0, moved - 1) * DIA.STEP;

  let s = '';
  /* 금속 — 이온이 된 뒤의 껍질은 그대로 두고, 사라질 바깥 껍질만 따로 얹어 흐려지게 한다 */
  for(let i = 0; i < b.nM; i++){
    s += DIA.atom(b.M, mIon, lx, my(i));
    s += `<circle class="dia-ring dia-anim-fade" cx="${lx}" cy="${my(i)}" r="${mOutR}"${DIA.at(lastAt + 0.35)}/>`;
    s += `<text class="dia-charge dia-anim-pop" x="${lx + DIA.atomRadius(mIon) + 12}" y="${my(i) - DIA.atomRadius(mIon) - 4}"${DIA.at(lastAt + 0.55)}>${DIA.chargeText(b.give, '+')}</text>`;
  }
  /* 비금속 — 원래 갖고 있던 전자는 그대로, 받는 전자만 금속에서 날아온다 */
  for(let j = 0; j < b.nX; j++){
    s += DIA.atom(b.X, xIon.slice(0, -1), rx, xy(j));
    s += `<circle class="dia-ring" cx="${rx}" cy="${xy(j)}" r="${xOutR}"/>`;
    const slots = DIA.dotPos(rx, xy(j), xOutR, 8);
    slots.forEach(([x, y], k) => { if(k < 8 - b.take) s += DIA.dot(x, y, 'dia-e'); });
    s += `<text class="dia-charge dia-anim-pop" x="${rx + xR + 12}" y="${xy(j) - xR - 4}"${DIA.at(lastAt + 0.55)}>${DIA.chargeText(b.take, '−')}</text>`;
  }
  /* 넘어가는 전자 — 도착지에 그리고 출발점만 금속 쪽으로 */
  for(let k = 0; k < moved; k++){
    const [fx, fy] = outs[k], [tx, ty] = ins[k];
    s += DIA.dot(tx, ty, 'dia-e dia-e-move dia-anim-in', DIA.from(fx, fy, tx, ty, DIA.T0 + k * DIA.STEP));
  }
  /* 화살표는 전자가 지나갈 길을 미리 보여 주는 안내선이다. 이동이 끝나면 할 일이 없으므로 흐려진다 */
  for(let i = 0; i < rows; i++){
    const y1 = my(b.nM === 1 ? 0 : i), y2 = xy(b.nX === 1 ? 0 : i);
    s += `<path class="dia-arrow dia-anim-fade" d="M ${lx + mR + 8} ${y1.toFixed(1)} Q 200 ${((y1 + y2) / 2 - 16).toFixed(1)} ${rx - xR - 8} ${y2.toFixed(1)}" marker-end="url(#diaHead)"${DIA.at(lastAt + 0.35)}/>`;
  }
  /* 화살표가 여러 개면 "전자 2개"가 화살표마다 2개인지 통틀어 2개인지 헷갈린다.
     여러 개일 때는 화살표 하나가 나르는 양을 쓴다. */
  const per = b.nM >= b.nX ? b.give : b.take;
  s += `<text class="dia-note dia-anim-fade" x="200" y="${TOP - 9}"${DIA.at(lastAt + 0.35)}>${rows === 1 ? `전자 ${b.give}개` : `각각 전자 ${per}개씩`}</text>`;

  const svg = `<svg class="dia" viewBox="0 0 ${W} ${H}" role="img"><defs>
       <marker id="diaHead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
         <path d="M 0 0 L 10 5 L 0 10 z" class="dia-arrowhead"/>
       </marker></defs>${s}</svg>`;

  return `<div class="dia-wrap">
    <div class="dia-panel"><div class="dia-cap">전자가 넘어가 이온이 된다</div>${svg}</div>
    ${DIA.replayBtn()}
    <p class="dia-exp">${josa(M.name,'은','는')} 원자가 전자 ${valenceOf(M.z)}개를 내주고, ${josa(X.name,'은','는')} ${b.take}개를 받아 둘 다 바깥 껍질이 꽉 찬다.
    반대 전하를 띤 이온이 서로 끌어당기는 것이 <b>이온 결합</b>이다.</p>
  </div>`;
}

/* ── 공유 결합 ──
   중심 원자를 가운데 두고 리간드를 방사형으로 배치한다. 바깥 껍질만 그린다.
   각 결합에는 공유 전자쌍을 pairs개 찍고, 남은 전자는 원자 바깥쪽에 비공유 전자로 찍는다.
   비공유 전자 수 = 바깥 껍질에 실제로 든 전자 수 − 그 원자가 내놓은 전자 수(= 참여한 전자쌍 수).
   여기서는 원자가 전자가 아니라 outerShellOf를 쓴다 — 그리는 것은 "결합에 참여하는 개수"가 아니라
   "화면에 찍히는 점의 개수"라서, 두 값이 갈리는 18족에서 원자가 전자를 쓰면 점이 사라진다. */
function covalentDiagramHTML(b, opts){
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
      /* 한 쌍 = 전자 2개. 결합축을 따라 살짝 벌려 두 원자가 하나씩 내놓은 것을 보인다.
         애니메이션도 그 사실 그대로다 — 안쪽 전자는 중심 원자에서, 바깥 전자는 리간드에서
         출발해 가운데서 만난다.

         순서는 "몇 번째 전자쌍인가"(p)가 먼저다. 결합이 여러 개인 분자에서 전자쌍을
         일렬로 늘어놓으면(CO₂를 1·2·3·4번째로) 이중결합이 두 개인지 사중결합 하나인지
         구분이 안 된다. 결합마다 첫 쌍이 함께 들어오고 그다음 둘째 쌍이 들어와야
         단일·이중·삼중이 눈에 들어온다. i는 결합끼리 살짝 어긋나게 하는 잔물결일 뿐이다. */
      const delay = DIA.T0 + p * 0.42 + i * 0.09;
      [-4.2, 4.2].forEach(t => {
        const tx = mx + px * off + ax * t, ty = my + py * off + ay * t;
        /* 출발점: 안쪽(t<0)이면 중심 원자 테두리, 바깥이면 리간드 테두리 */
        const fx = t < 0 ? cx + R * ax + px * off * .4 : lx - lR * ax + px * off * .4;
        const fy = t < 0 ? cy + R * ay + py * off * .4 : ly - lR * ay + py * off * .4;
        s += DIA.dot(tx, ty, 'dia-e dia-e-share dia-anim-in',
          ` data-pair="${p}"` + DIA.from(fx, fy, tx, ty, delay));
      });
    }
    /* 리간드의 비공유 전자 — 중심 반대쪽 바깥에 쌍으로 찍는다.
       공유하기 전부터 갖고 있던 전자라 먼저 나타난다 */
    s += DIA.lonePairs(lx, ly, lR, outerShellOf(L.z) - l.pairs, angles[i], false, DIA.T0 * 0.5);
  });

  /* 중심 원자의 비공유 전자 — 결합이 없는 쪽에 몰아 찍는다 */
  const gapDir = n === 1 ? 180 : (angles[0] + angles[n - 1]) / 2 + 180;
  s += DIA.lonePairs(cx, cy, R, cLone, gapDir, true, DIA.T0 * 0.5);

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
  /* 결합을 부를 때 원자 순서는 화학식을 따른다. 중심 원자를 앞에 두면 HCl을 보면서
     "Cl–H 사이에"라고 읽게 되어, 같은 화면 안에서 순서가 어긋난다.
     (중심 원자는 결합을 여러 개 낼 수 있는 쪽이라 정해지는 것이라 화학식 순서와 무관하다.) */
  const bondName = sym => b.f.indexOf(b.center) > b.f.indexOf(sym)
    ? `${sym}–${b.center}` : `${b.center}–${sym}`;
  const uniq = [...new Set(b.ligands.map(l => `${bondName(l.sym)} 사이에 공유 ${pairWord(l)}`))].join(', ');
  /* 결합 차수 모드에서는 같은 그림을 쓰되 "몇 쌍인가"에 초점을 맞춘다 —
     전자쌍이 하나씩 자리잡는 애니메이션이 그대로 답의 근거가 된다. */
  const order = opts && opts.order;
  const pairs0 = b.ligands[0].pairs;
  const cap = order ? '공유 전자쌍이 몇 쌍인지 세어 보자' : '바깥 껍질 전자와 공유 전자쌍';
  /* 이온 결합 그림은 껍질을 다 그리는데 여기는 바깥 껍질만 그린다. 같은 앱에서 둘을 번갈아
     보면 "얘는 왜 껍질이 없지?" 하게 되므로, 화면이 그 이유를 직접 말하게 한다. */
  const shellNote = `<span class="later-note">원 하나가 바깥 껍질이다 — 안쪽 껍질은 결합에 참여하지 않아 그리지 않았다.</span>`;
  const exp = (order
    ? `${uniq} — 전자쌍 <b>${pairs0}쌍</b>을 공유하므로 <b>${BOND_ORDER_NAME[pairs0]}</b>이다.
       공유하는 전자쌍이 늘수록 두 원자가 더 세게 붙잡혀 결합이 짧고 강해진다.`
    : `${uniq}. 전자를 주고받는 대신 <b>함께 쓰는</b> 것이 <b>공유 결합</b>이다.
       노란 점이 두 원자가 나눠 갖는 전자다.`) + shellNote;
  return `<div class="dia-wrap">
    <div class="dia-panel"><div class="dia-cap">${cap}</div>
      <svg class="dia" viewBox="${vb}" role="img">${s}</svg></div>
    ${DIA.replayBtn()}
    <p class="dia-exp">${exp}</p>
  </div>`;
}

/* ── 이온이 되는 과정 (MODE 9 · 중학) ──
   그림 한 장으로는 "전자를 2개 얻는다"가 안 보인다. 전자가 정말 2개 날아 들어오고,
   양이온이면 바깥 껍질이 통째로 빠져나가는 것을 보여야 답의 근거가 눈에 남는다.

   fin(최종 껍질 배치)을 먼저 그리고, 그 위에 "사라질 것"과 "들어올 것"만 얹는다.
   그래서 애니메이션이 끝난 화면이 곧 이온의 정확한 전자 배치다. */
function ionFormingDiagramHTML(z, item){
  const el = ELEMENTS.find(e => e.z === z);
  const sh = shellsOf(z);
  const outer = sh[sh.length - 1];
  const gain = !!item && item.dir === 'gain', lose = !!item && item.dir === 'lose';
  const n = item && !item.noble ? item.n : 0;
  /* 얻으면 바깥 껍질이 차고, 잃으면 그 껍질이 통째로 사라진다.
     1~20번에서 금속이 잃는 개수는 언제나 바깥 껍질 전자 전부다. */
  const fin = gain ? sh.slice(0, -1).concat(outer + n) : lose ? sh.slice(0, -1) : sh;
  const outR = DIA.R0 + (sh.length - 1) * DIA.RSTEP;
  const rDraw = DIA.atomRadius(sh);
  const W = 2 * (rDraw + DIA.FLY + 16), H = W, cx = W / 2, cy = H / 2;
  const lastAt = DIA.T0 + Math.max(0, (n || outer) - 1) * DIA.STEP;

  let s = `<circle class="dia-nuc" cx="${cx}" cy="${cy}" r="${DIA.NUC}"/>`;
  s += `<text class="dia-sym" x="${cx}" y="${cy}">${el.sym}</text>`;

  if(gain){
    /* 안쪽 껍질은 그대로, 바깥 껍질은 최종 개수만큼 자리를 잡고 그중 뒤 n개가 날아 들어온다 */
    fin.forEach((cnt, i) => {
      const r = DIA.R0 + i * DIA.RSTEP;
      s += `<circle class="dia-ring" cx="${cx}" cy="${cy}" r="${r}"/>`;
      if(i < fin.length - 1){ s += DIA.dots(cx, cy, r, cnt, 'dia-e'); return; }
      DIA.dotPos(cx, cy, r, cnt).forEach(([x, y], k) => {
        if(k < outer){ s += DIA.dot(x, y, 'dia-e'); return; }
        const a = Math.atan2(y - cy, x - cx);
        const fx = cx + (r + DIA.FLY) * Math.cos(a), fy = cy + (r + DIA.FLY) * Math.sin(a);
        s += DIA.dot(x, y, 'dia-e dia-e-move dia-anim-in', DIA.from(fx, fy, x, y, DIA.T0 + (k - outer) * DIA.STEP));
      });
    });
  }else if(lose){
    fin.forEach((cnt, i) => {
      const r = DIA.R0 + i * DIA.RSTEP;
      s += `<circle class="dia-ring" cx="${cx}" cy="${cy}" r="${r}"/>` + DIA.dots(cx, cy, r, cnt, 'dia-e');
    });
    /* 빠져나가는 껍질과 그 전자 — 끝나면 사라지므로 최종 그림에는 남지 않는다 */
    s += `<circle class="dia-ring dia-anim-fade" cx="${cx}" cy="${cy}" r="${outR}"${DIA.at(lastAt + 0.3)}/>`;
    DIA.dotPos(cx, cy, outR, outer).forEach(([x, y], k) => {
      const a = Math.atan2(y - cy, x - cx);
      const tx = cx + (outR + DIA.FLY) * Math.cos(a), ty = cy + (outR + DIA.FLY) * Math.sin(a);
      s += DIA.dot(x, y, 'dia-e dia-e-gone dia-anim-out', DIA.from(tx, ty, x, y, DIA.T0 + k * DIA.STEP));
    });
  }else{
    /* 18족 — 주고받는 게 없다. 바깥 껍질 전자를 하나씩 짚어 "이미 꽉 찼다"를 세어 보인다 */
    fin.forEach((cnt, i) => {
      const r = DIA.R0 + i * DIA.RSTEP;
      s += `<circle class="dia-ring" cx="${cx}" cy="${cy}" r="${r}"/>`;
      if(i < fin.length - 1){ s += DIA.dots(cx, cy, r, cnt, 'dia-e'); return; }
      DIA.dotPos(cx, cy, r, cnt).forEach(([x, y], k) =>
        { s += DIA.dot(x, y, 'dia-e dia-anim-pop', DIA.at(DIA.T0 + k * DIA.STEP)); });
    });
  }

  if(n > 0){
    const fr = DIA.atomRadius(fin);
    s += `<text class="dia-charge dia-anim-pop" x="${(cx + fr + 12).toFixed(1)}" y="${(cy - fr - 4).toFixed(1)}"${DIA.at(lastAt + 0.5)}>${DIA.chargeText(n, lose ? '+' : '−')}</text>`;
  }
  const cap = gain ? `전자 ${n}개가 들어온다` : lose ? `바깥 껍질 전자 ${n}개가 빠져나간다` : '이미 꽉 차 있다';
  return `<div class="dia-wrap"><div class="dia-panel"><div class="dia-cap">${cap}</div>
    <svg class="dia" viewBox="0 0 ${W} ${H}" role="img">${s}</svg></div>${DIA.replayBtn()}</div>`;
}

function bondDiagramHTML(b){
  return b.type === 'ionic' ? ionicDiagramHTML(b) : covalentDiagramHTML(b);
}

/* 원자 하나의 껍질 그림 — 원자가 전자(MODE 8) 해설용.
   바깥 껍질 전자를 하나씩 짚어 준다. 답을 외우는 게 아니라 그림에서 세도록 하는 게
   [9과11-04]가 요구하는 접근이라, 세는 동작 자체를 보여 주는 편이 맞다. */
function shellDiagramHTML(z, charge){
  const el = ELEMENTS.find(e => e.z === z);
  const sh = shellsOf(z);
  const r = DIA.atomRadius(sh), W = 2 * (r + 24), H = W, cx = W / 2, cy = H / 2;
  let s = `<circle class="dia-nuc" cx="${cx}" cy="${cy}" r="${DIA.NUC}"/>`;
  s += `<text class="dia-sym" x="${cx}" y="${cy}">${el.sym}</text>`;
  sh.forEach((cnt, i) => {
    const rr = DIA.R0 + i * DIA.RSTEP;
    s += `<circle class="dia-ring" cx="${cx}" cy="${cy}" r="${rr}"/>`;
    if(i < sh.length - 1){ s += DIA.dots(cx, cy, rr, cnt, 'dia-e'); return; }
    DIA.dotPos(cx, cy, rr, cnt).forEach(([x, y], k) =>
      { s += DIA.dot(x, y, 'dia-e dia-anim-pop', DIA.at(DIA.T0 + k * DIA.STEP)); });
  });
  if(charge) s += `<text class="dia-charge" x="${cx + r + 12}" y="${cy - r - 4}">${charge}</text>`;
  return `<div class="dia-wrap"><div class="dia-panel">
    <svg class="dia" viewBox="0 0 ${W} ${H}" role="img">${s}</svg>
  </div>${DIA.replayBtn()}</div>`;
}
