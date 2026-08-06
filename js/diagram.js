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
  /* 전자 한 개가 옮겨 가는 데 걸리는 시간. css의 diaMove와 같은 값이어야 한다 —
     이 값으로 "언제 다 옮겨졌는지"를 계산해서 껍질을 지우고 대괄호를 씌우기 때문이다.
     어긋나면 아직 날아가는 중인데 이온이 다 됐다고 표시된다. */
  MOVE: 0.9,
  OUT: 0.58,     /* 화면 밖으로 빠져나가는 데 걸리는 시간(css의 diaOut) */
  /* 날아 들어오는 전자의 출발 거리. 이 거리만큼 캔버스에 여백이 필요하므로 크게 잡으면
     정작 원자가 작아진다(전자는 출발할 때 투명해서 끝까지 다 보이지도 않는다). */
  FLY: 30,

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
  /* 화면의 모든 전자에는 data-e가 붙는다 — 검사가 "전자가 몇 개 보이는가"를 셀 때 쓰는 표식이다.
     전자를 그리는 길은 dot()과 cross() 둘뿐이므로 여기 두 곳에만 붙이면 빠짐없이 세어진다. */
  dot(x, y, cls, extra, r){
    return `<circle data-e="dot" class="${cls}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r || this.E}"${extra || ''}/>`;
  },
  /* 상대 원자에서 나온 전자는 ×로 그린다 — 교과서의 dot-and-cross 표기.
     색만으로 구분하면 색을 못 가리는 사람에게는 아무 구분이 없는 것과 같다. */
  cross(x, y, cls, extra, half){
    const a = half || 3.9, f = v => v.toFixed(1);
    return `<path data-e="cross" class="${cls}" d="M ${f(x-a)} ${f(y-a)} L ${f(x+a)} ${f(y+a)}`+
           ` M ${f(x-a)} ${f(y+a)} L ${f(x+a)} ${f(y-a)}"${extra || ''}/>`;
  },
  /* 원 위의 한 점 — 각도(도)로 지정한다 */
  onCircle(cx, cy, r, deg){
    const a = deg * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  },
  /* 껍질 배치대로 전자를 원 위에 고르게 찍는다. */
  dots(cx, cy, r, n, cls, er){
    return this.dotPos(cx, cy, r, n).map(([x, y]) => this.dot(x, y, cls, '', er)).join('');
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

  /* 이온 하나를 대괄호로 감싸고 오른쪽 위에 전하를 올린다 — 교과서의 [Na]⁺ [Cl]⁻ 표기.
     원자 그림 옆에 +/−만 띄우면 그 부호가 어느 원자 것인지, 이게 아직 원자인지 이미
     이온인지가 흐릿하다. 대괄호가 "여기까지가 이온 하나"라는 경계를 그어 준다. */
  ionBracket(cx, cy, r, charge, delay){
    const w = r + 10, h = r + 8, tick = 9;
    const L = cx - w, R = cx + w, T = cy - h, B = cy + h;
    let s = `<path class="dia-bracket dia-anim-pop" d="M ${(L+tick).toFixed(1)} ${T.toFixed(1)} L ${L.toFixed(1)} ${T.toFixed(1)} L ${L.toFixed(1)} ${B.toFixed(1)} L ${(L+tick).toFixed(1)} ${B.toFixed(1)}`+
            ` M ${(R-tick).toFixed(1)} ${T.toFixed(1)} L ${R.toFixed(1)} ${T.toFixed(1)} L ${R.toFixed(1)} ${B.toFixed(1)} L ${(R-tick).toFixed(1)} ${B.toFixed(1)}"${this.at(delay)}/>`;
    /* 전하는 오른쪽 괄호 바깥에서 오른쪽으로 자라야 한다. 가운데 정렬이면 「2−」처럼
       두 글자짜리 전하가 왼쪽으로 번져 괄호 모서리를 덮는다. */
    if(charge) s += `<text class="dia-charge dia-charge-br dia-anim-pop" x="${(R+6).toFixed(1)}" y="${(T+8).toFixed(1)}"${this.at(delay)}>${charge}</text>`;
    return s;
  },

  /* 비공유 전자는 낱개가 아니라 쌍으로 존재한다 — 두 개씩 붙여 찍어야 교과서 그림과 같아진다.
     baseDeg 방향을 중심으로 쌍들을 부채꼴로 펼친다. centerAtom이면 결합 반대편 넓은 쪽에 놓는다.

     전자는 바깥 껍질 원 "위"에 앉힌다(예전에는 원 바깥 10px에 떠 있었다). 껍질을 그리는 이상
     전자가 껍질을 벗어나 있으면 그림이 스스로 모순된다.
     한 쌍의 두 점 간격은 각도가 아니라 실제 거리로 잡는다 — 반지름이 작은 원자(수소)에서
     같은 각도를 쓰면 두 점이 겹쳐 붙어 한 점처럼 보인다.
     mark: 이 전자를 어떤 표식으로 그릴지(dot 또는 cross). 어느 원자의 전자인지가 표식이다. */
  lonePairs(cx, cy, r, count, baseDeg, centerAtom, mark){
    if(count <= 0) return '';
    const pairs = Math.floor(count / 2), odd = count % 2;
    const slots = pairs + odd;
    const spread = centerAtom ? 100 : 74;          /* 쌍들이 퍼지는 각도 범위 */
    const half = Math.asin(Math.min(1, 7.5 / r)) * 180 / Math.PI;  /* 한 쌍의 반쪽 각 */
    let s = '';
    for(let i = 0; i < slots; i++){
      const base = baseDeg + (slots === 1 ? 0 : (i / (slots - 1) - 0.5) * spread);
      const isPair = i < pairs;
      const halves = isPair ? [-half, half] : [0]; /* 한 쌍이면 두 점, 홀수로 남으면 한 점 */
      halves.forEach(dd => {
        const [x, y] = this.onCircle(cx, cy, r, base + dd);
        s += mark(x, y);
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
  const lx = 90, rx = 310, W = 420;   /* 대괄호와 전하가 오른쪽으로 더 나가므로 폭을 넓힌다 */
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
  /* 마지막 전자가 "도착한" 시각. 출발 시각에 이동 시간을 더해야 한다 —
     전에는 출발 시각만 셌기 때문에 전자가 아직 날아가는 중인데 껍질이 지워지고
     대괄호가 씌워졌다. */
  const lastAt = DIA.T0 + Math.max(0, moved - 1) * DIA.STEP + DIA.MOVE;

  let s = '';
  /* 금속 — 이온이 된 뒤의 껍질은 그대로 두고, 사라질 바깥 껍질만 따로 얹어 흐려지게 한다 */
  for(let i = 0; i < b.nM; i++){
    s += DIA.atom(b.M, mIon, lx, my(i));
    s += `<circle class="dia-ring dia-anim-fade" cx="${lx}" cy="${my(i)}" r="${mOutR}"${DIA.at(lastAt + 0.35)}/>`;
    /* 대괄호는 껍질이 사라진 뒤에 씌운다 — 그래야 "이제 이온이 되었다"는 순서가 보인다 */
    s += DIA.ionBracket(lx, my(i), DIA.atomRadius(mIon), DIA.chargeText(b.give, '+'), lastAt + 0.55);
  }
  /* 비금속 — 원래 갖고 있던 전자는 그대로, 받는 전자만 금속에서 날아온다 */
  for(let j = 0; j < b.nX; j++){
    s += DIA.atom(b.X, xIon.slice(0, -1), rx, xy(j));
    s += `<circle class="dia-ring" cx="${rx}" cy="${xy(j)}" r="${xOutR}"/>`;
    const slots = DIA.dotPos(rx, xy(j), xOutR, 8);
    slots.forEach(([x, y], k) => { if(k < 8 - b.take) s += DIA.dot(x, y, 'dia-e'); });
    s += DIA.ionBracket(rx, xy(j), xR, DIA.chargeText(b.take, '−'), lastAt + 0.55);
  }
  /* 넘어가는 전자 — 도착지(비금속의 빈자리)에 그려 두고 출발점만 금속 쪽으로 잡는다.
     그래야 애니메이션이 끝난 그림이 정확히 이온 상태가 된다.
     dia-anim-move는 지연 시간 동안 출발점에 그대로 앉아 있으므로, 시작 화면에서 이 점은
     "금속의 바깥 껍질에 실제로 들어 있는 전자"로 보인다 — 나트륨이 전자 11개로 그려진다.
     (전에 쓰던 dia-anim-in은 투명도 0에서 시작해 이 전자가 시작 화면에 아예 없었다.
      나트륨을 전자 10개로 그려 놓고 없던 전자가 생겨나 날아가는 그림이었다.) */
  for(let k = 0; k < moved; k++){
    const [fx, fy] = outs[k], [tx, ty] = ins[k];
    s += DIA.dot(tx, ty, 'dia-e dia-e-move dia-anim-move', DIA.from(fx, fy, tx, ty, DIA.T0 + k * DIA.STEP));
  }
  /* 화살표는 전자가 지나갈 길을 미리 보여 주는 안내선이다. 이동이 끝나면 할 일이 없으므로 흐려진다 */
  for(let i = 0; i < rows; i++){
    const y1 = my(b.nM === 1 ? 0 : i), y2 = xy(b.nX === 1 ? 0 : i);
    /* 끝점을 대괄호 바깥에 둔다(대괄호 반폭 = 반지름+10) — 안 그러면 화살촉이 괄호를 파고든다 */
    s += `<path class="dia-arrow dia-anim-fade" d="M ${lx + mR + 8} ${y1.toFixed(1)} Q 210 ${((y1 + y2) / 2 - 16).toFixed(1)} ${rx - xR - 18} ${y2.toFixed(1)}" marker-end="url(#diaHead)"${DIA.at(lastAt + 0.35)}/>`;
  }
  /* 화살표가 여러 개면 "전자 2개"가 화살표마다 2개인지 통틀어 2개인지 헷갈린다.
     여러 개일 때는 화살표 하나가 나르는 양을 쓴다. */
  const per = b.nM >= b.nX ? b.give : b.take;
  s += `<text class="dia-note dia-anim-fade" x="${W/2}" y="${TOP - 9}"${DIA.at(lastAt + 0.35)}>${rows === 1 ? `전자 ${b.give}개` : `각각 전자 ${per}개씩`}</text>`;

  const svg = `<svg class="dia" viewBox="0 0 ${W} ${H}" role="img"><defs>
       <marker id="diaHead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
         <path d="M 0 0 L 10 5 L 0 10 z" class="dia-arrowhead"/>
       </marker></defs>${s}</svg>`;

  return `<div class="dia-wrap">
    <div class="dia-panel"><div class="dia-cap">전자가 넘어가 이온이 된다</div>${svg}</div>
    ${DIA.replayBtn()}
    <p class="dia-exp">${josa(M.name,'은','는')} 원자가 전자 ${valenceOf(M.z)}개를 내주고, ${josa(X.name,'은','는')} ${b.take}개를 받아 둘 다 바깥 껍질이 꽉 찬다.
    반대 전하를 띤 이온이 서로 끌어당기는 것이 <b>이온 결합</b>이다.
    <span class="later-note">파랗고 굵은 점이 넘어가는 전자다 — 없던 전자가 생기는 게 아니라 원래 ${josa(M.name,'이','가')} 갖고 있던 전자다.</span></p>
  </div>`;
}

/* ── 공유 결합 ──
   중심 원자를 가운데 두고 리간드를 방사형으로 배치한다. 전자껍질은 **전부** 그린다
   (안쪽 2개짜리 껍질까지). 예전에는 바깥 껍질만 그렸는데, 같은 앱의 이온 결합 그림은
   껍질을 다 그리고 있어서 "얘는 왜 껍질이 없지?"가 됐고, 안쪽 껍질을 빼면 원자가
   전자를 몇 개 가진 것인지도 그림에서 셀 수 없었다.

   두 원자의 바깥 껍질이 **겹치게** 놓고, 공유 전자쌍을 그 겹친 자리에 찍는다.
   이게 공유 결합의 핵심이다 — 그 전자쌍은 두 원자가 둘 다 자기 껍질에 든 것으로 친다.
   떨어뜨려 놓고 사이에 찍으면 전자쌍이 어느 껍질에도 안 속한 빈 공간에 뜬다.

   전자는 **자기 원자의 껍질에서 출발**해 겹친 자리로 옮겨 간다. 그리고 어느 원자에서
   나왔는지를 표식으로 남긴다 — 중심 원자는 ●, 상대 원자는 ×(교과서 dot-and-cross).
   같은 원소끼리 결합해도(N₂) 구분한다. 원소가 아니라 "출처"를 나타내는 표기라서 그게 맞다.

   비공유 전자 수 = 바깥 껍질에 실제로 든 전자 수 − 그 원자가 내놓은 전자 수(= 참여한 전자쌍 수).
   여기서는 원자가 전자가 아니라 outerShellOf를 쓴다 — 그리는 것은 "결합에 참여하는 개수"가 아니라
   "화면에 찍히는 점의 개수"라서, 두 값이 갈리는 18족에서 원자가 전자를 쓰면 점이 사라진다. */
function covalentDiagramHTML(b, opts){
  /* ── 공유 결합만의 치수 ──
     껍질을 이온 결합 그림과 같은 크기(R0 25 · 간격 14)로 그리면 삼중결합에서 겹친 자리가
     원자핵 위로 올라온다 — N₂를 그려 보니 전자쌍 3개가 N 글자를 덮었다.
     겹친 폭은 전자쌍 수에 비례해 커지는데 반지름은 그대로라 생기는 문제라, 여기서는
     껍질을 키워 겹친 자리와 원자핵 사이에 자리를 만든다.
     viewBox가 그린 범위에 맞춰지므로 화면에 보이는 크기는 그대로다. */
  const R0 = 36, RSTEP = 24, EDOT = 5.0, ECROSS = 5.6;
  const outerR = z => R0 + (shellsOf(z).length - 1) * RSTEP;
  /* 원자핵 원은 껍질 반지름의 절반을 넘지 않게 — 수소(껍질 1개)에서 핵이 껍질을 다 먹는다 */
  const nucR = R => Math.min(22, R * 0.5);

  const C = ELEMENTS.find(e => e.sym === b.center);
  const cShells = shellsOf(C.z);
  const cR = outerR(C.z);                             /* 중심 원자의 바깥 껍질 반지름 */
  const cPairs = b.ligands.reduce((s, l) => s + l.pairs, 0);
  const cLone = outerShellOf(C.z) - cPairs;
  const cx = 200, cy = 200;

  /* 표식 — 중심 원자에서 나온 전자는 ●, 상대 원자에서 나온 전자는 ×.
     anim을 주면 제 껍질에서 겹친 자리로 옮겨 간다(공유 전자). 비공유 전자는 안 움직이므로 안 준다. */
  const ownMark   = (x, y, extra, anim) => DIA.dot(x, y, 'dia-e dia-e-own' + (anim ? ' dia-anim-move' : ''), extra, EDOT);
  const otherMark = (x, y, extra, anim) => DIA.cross(x, y, 'dia-e-other' + (anim ? ' dia-anim-move' : ''), extra, ECROSS);

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

  /* 리간드마다 기하를 먼저 다 계산해 둔다 — viewBox를 재는 데도 같은 값이 필요하다.
     겹침을 전자쌍 수에 따라 키우는 이유: 쌍들은 결합축을 따라 늘어서므로(⋮⋮⋮ = 삼중),
     쌍이 늘수록 겹친 자리가 축 방향으로 넓어야 들어간다. */
  const geo = b.ligands.map((l, i) => {
    const L = ELEMENTS.find(e => e.sym === l.sym);
    const lShells = shellsOf(L.z);
    const lR = outerR(L.z);
    const ov = 10 * (l.pairs - 1) + 12;                /* 겹치는 폭 */
    const d = cR + lR - ov;                            /* 두 원자 중심 사이 거리 */
    const a = angles[i] * Math.PI / 180;
    const ax = Math.cos(a), ay = Math.sin(a);
    /* 겹친 자리(렌즈)의 한가운데 — 두 원의 교선이 지나는 곳. 단순 중점을 쓰면
       반지름이 크게 다른 결합(H–Cl)에서 큰 원자 안쪽으로 들어가 버린다. */
    const xm = (d * d + cR * cR - lR * lR) / (2 * d);
    return { l, L, lShells, lR, d, ax, ay, deg: angles[i],
             lx: cx + d * ax, ly: cy + d * ay,
             mx: cx + xm * ax, my: cy + xm * ay };
  });

  let s = '';
  /* 원자 — 껍질을 전부 그리되 바깥 껍질 전자는 여기서 찍지 않는다.
     바깥 껍질 전자는 결합에 참여하는 것과 아닌 것으로 갈려 아래에서 따로 배치한다. */
  const atomShells = (sym, shells, x, y, big) => {
    let t = '';
    shells.forEach((cnt, i) => {
      const r = R0 + i * RSTEP;
      t += `<circle class="dia-ring" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"/>`;
      /* 안쪽 껍질은 꽉 차 있고 결합에 참여하지 않는다 — 그대로 찍는다 */
      if(i < shells.length - 1) t += DIA.dots(x, y, r, cnt, 'dia-e', EDOT);
    });
    const nr = nucR(R0 + (shells.length - 1) * RSTEP);
    t += `<circle class="dia-nuc" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${nr.toFixed(1)}"/>`;
    t += `<text class="dia-sym${big ? ' dia-sym-lg' : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}">${sym}</text>`;
    return t;
  };
  s += atomShells(b.center, cShells, cx, cy, true);
  geo.forEach(g => { s += atomShells(g.l.sym, g.lShells, g.lx, g.ly, g.l.sym !== 'H'); });

  /* 공유 전자쌍 — 겹친 자리에 놓고, 각 전자는 자기 원자의 껍질에서 출발한다 */
  geo.forEach((g, i) => {
    const px = -g.ay, py = g.ax;                       /* 결합축에 수직 */
    for(let p = 0; p < g.l.pairs; p++){
      /* 한 쌍 = 전자 2개. 쌍 안의 두 전자는 결합축에 <b>수직</b>으로 세워 찍는다 —
         교과서의 H:Cl 표기에서 가운데 콜론이 결합축과 직각인 것과 같다.
         쌍이 여럿이면 그 쌍들을 결합축을 따라 늘어놓는다 — O::O처럼. */
      const along = (p - (g.l.pairs - 1) / 2) * 10;
      /* 등장 순서는 "몇 번째 전자쌍인가"(p)가 먼저다. 결합이 여러 개인 분자에서 전자쌍을
         일렬로 늘어놓으면(CO₂를 1·2·3·4번째로) 이중결합이 두 개인지 사중결합 하나인지
         구분이 안 된다. 결합마다 첫 쌍이 함께 들어오고 그다음 둘째 쌍이 들어와야
         단일·이중·삼중이 눈에 들어온다. i는 결합끼리 살짝 어긋나게 하는 잔물결일 뿐이다. */
      const delay = DIA.T0 + p * 0.5 + i * 0.09;
      /* 쌍이 여럿이면 출발 자리도 껍질 위에서 나란히 벌려 준다 — 한 점에서 다 나오면
         몇 개가 나왔는지 안 보인다. */
      const spreadDeg = (p - (g.l.pairs - 1) / 2) * 15;
      /* 출발 자리를 결합 방향에서 46° 비켜 놓는다.
         껍질이 겹치는 배치에서는 겹친 자리가 이미 껍질 바로 그 자리다 — 결합 방향에서
         출발시키면 목적지까지 5px밖에 안 돼 아무것도 안 움직이는 것처럼 보인다(그렇게 만들어 봤다).
         비켜 놓으면 "껍질에 흩어져 있던 전자가 만나는 자리로 모인다"가 실제로 보인다.
         부호가 음수인 이유: 각도를 키우면 결합축 기준 +u 쪽으로 가므로, 최종 자리와 같은
         쪽에서 출발하려면 중심 원자(u<0)도 상대 원자(u>0)도 각자 바깥 방향에서 −46°다. */
      const START_OFF = -46;
      [-6.4, 6.4].forEach(u => {
        const tx = g.mx + g.ax * along + px * u, ty = g.my + g.ay * along + py * u;
        /* u<0이 중심 원자 것, u>0이 상대 원자 것. 수직으로 서면서 위·아래로 갈린다. */
        const fromCenter = u < 0;
        const [fx, fy] = fromCenter
          ? DIA.onCircle(cx, cy, cR, g.deg + START_OFF + spreadDeg)
          : DIA.onCircle(g.lx, g.ly, g.lR, g.deg + 180 + START_OFF + spreadDeg);
        const extra = ` data-pair="${p}"` + DIA.from(fx, fy, tx, ty, delay);
        s += fromCenter ? ownMark(tx, ty, extra, true) : otherMark(tx, ty, extra, true);
      });
    }
    /* 리간드의 비공유 전자 — 중심 반대쪽 껍질 위에 쌍으로 찍는다 */
    s += DIA.lonePairs(g.lx, g.ly, g.lR, outerShellOf(g.L.z) - g.l.pairs, g.deg, false,
                       (x, y) => otherMark(x, y));
  });

  /* 중심 원자의 비공유 전자 — 결합이 없는 쪽 껍질 위에 몰아 찍는다 */
  const gapDir = n === 1 ? 180 : (angles[0] + angles[n - 1]) / 2 + 180;
  s += DIA.lonePairs(cx, cy, cR, cLone, gapDir, true, (x, y) => ownMark(x, y));

  /* 분자마다 원자 배치가 달라 고정 viewBox를 쓰면 여백만 커지고 그림이 작아진다.
     실제로 그린 원자들의 범위를 재서 딱 맞춘다(껍질 위 전자가 반지름 밖으로 4px 남짓 나간다). */
  const pad = 14, epad = 8;
  const ext = [[cx, cy, cR]].concat(geo.map(g => [g.lx, g.ly, g.lR]));
  const minX = Math.min(...ext.map(([x, , r]) => x - r - epad)) - pad;
  const maxX = Math.max(...ext.map(([x, , r]) => x + r + epad)) + pad;
  const minY = Math.min(...ext.map(([, y, r]) => y - r - epad)) - pad;
  const maxY = Math.max(...ext.map(([, y, r]) => y + r + epad)) + pad;
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
  const cap = order ? '공유 전자쌍이 몇 쌍인지 세어 보자' : '전자껍질과 공유 전자쌍';
  /* ●와 ×가 무슨 뜻인지 화면이 직접 말하게 한다. 표기를 설명 없이 쓰면 학생은
     "왜 어떤 건 동그라미고 어떤 건 엑스지?"에서 막힌다. */
  const markNote = `<span class="later-note">`+
    `<b class="dia-key-own">●</b> ${b.center}에서 나온 전자, `+
    `<b class="dia-key-other">✕</b> ${[...new Set(b.ligands.map(l => l.sym))].join('·')}에서 나온 전자. `+
    `모양이 다를 뿐 둘 다 똑같은 전자다 — 어느 원자가 내놓았는지 보이라고 갈라 그렸다.</span>`;
  const exp = (order
    ? `${uniq} — 전자쌍 <b>${pairs0}쌍</b>을 공유하므로 <b>${BOND_ORDER_NAME[pairs0]}</b>이다.
       공유하는 전자쌍이 늘수록 두 원자가 더 세게 붙잡혀 결합이 짧고 강해진다.`
    : `${uniq}. 전자를 주고받는 대신 <b>함께 쓰는</b> 것이 <b>공유 결합</b>이다.
       두 껍질이 겹친 자리에 있는 전자쌍은 두 원자가 <b>둘 다 자기 것으로</b> 센다.`) + markNote;
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
  const finR = DIA.atomRadius(fin);
  /* 필요한 반폭은 둘 중 큰 쪽이다 — 전자가 날아오는 거리, 또는 대괄호+전하가 차지하는 폭.
     예전에는 무조건 원자 반지름 + 날아오는 거리 + 여백으로 잡아 원자가 캔버스의 3할밖에
     안 됐고, 전하 기호가 원자에서 한참 떨어져 붕 떠 보였다. */
  const half = Math.max(outR + DIA.FLY, finR + 36) + 6;
  const W = 2 * half, H = W, cx = W / 2, cy = H / 2;
  /* 마지막 전자가 다 옮겨진 시각 — 들어오는 것과 나가는 것의 소요 시간이 다르다.
     이 시각이 지나야 껍질을 지우고 대괄호를 씌운다. */
  const lastAt = DIA.T0 + Math.max(0, (n || outer) - 1) * DIA.STEP + (gain ? DIA.MOVE : lose ? DIA.OUT : 0);

  let s = `<circle class="dia-nuc" cx="${cx}" cy="${cy}" r="${DIA.NUC}"/>`;
  s += `<text class="dia-sym" x="${cx}" y="${cy}">${el.sym}</text>`;

  if(gain){
    /* 안쪽 껍질은 그대로, 바깥 껍질은 최종 개수만큼 자리를 잡고 그중 뒤 n개가 날아 들어온다.
       들어올 전자는 처음부터 원자 바깥에 보이게 세워 둔다(dia-anim-move) — 날아오는 중간에
       생겨나면 "전자가 만들어진다"로 읽힌다. 밖에 서 있다가 들어오는 것이 사실에 가깝다. */
    fin.forEach((cnt, i) => {
      const r = DIA.R0 + i * DIA.RSTEP;
      s += `<circle class="dia-ring" cx="${cx}" cy="${cy}" r="${r}"/>`;
      if(i < fin.length - 1){ s += DIA.dots(cx, cy, r, cnt, 'dia-e'); return; }
      DIA.dotPos(cx, cy, r, cnt).forEach(([x, y], k) => {
        if(k < outer){ s += DIA.dot(x, y, 'dia-e'); return; }
        const a = Math.atan2(y - cy, x - cx);
        const fx = cx + (r + DIA.FLY) * Math.cos(a), fy = cy + (r + DIA.FLY) * Math.sin(a);
        s += DIA.dot(x, y, 'dia-e dia-e-move dia-anim-move', DIA.from(fx, fy, x, y, DIA.T0 + (k - outer) * DIA.STEP));
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
        { s += DIA.dot(x, y, 'dia-e dia-anim-count', DIA.at(DIA.T0 + k * DIA.STEP)); });
    });
  }

  /* 이온이 되고 나면 이온 결합 그림과 똑같이 대괄호로 감싼다 — 두 화면에서 같은 표기를
     써야 「이게 이온이다」가 같은 뜻으로 읽힌다. 18족은 이온이 되지 않으므로 씌우지 않는다. */
  if(n > 0) s += DIA.ionBracket(cx, cy, finR, DIA.chargeText(n, lose ? '+' : '−'), lastAt + 0.5);
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
      { s += DIA.dot(x, y, 'dia-e dia-anim-count', DIA.at(DIA.T0 + k * DIA.STEP)); });
  });
  if(charge) s += `<text class="dia-charge" x="${cx + r + 12}" y="${cy - r - 4}">${charge}</text>`;
  return `<div class="dia-wrap"><div class="dia-panel">
    <svg class="dia" viewBox="0 0 ${W} ${H}" role="img">${s}</svg>
  </div>${DIA.replayBtn()}</div>`;
}
