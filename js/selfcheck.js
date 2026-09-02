/* ── 자가 검사 ──
   이 파일은 도구가 아니라 앱의 일부다. 그게 요점이다.

   지난 회귀 스위트 21종 944항목은 임시 폴더에 살다가 컨테이너가 재활용되면서
   통째로 사라졌다. 검사가 저장소 밖에 있으면 언젠가 반드시 없어진다.
   그래서 이건 앱과 같이 커밋되고, 앱과 같이 배포되고, 앱이 열리는 곳이면
   어디서든(파일로 열든, 폰에서 열든) 돌아간다.

   쓰는 법
   · 주소 끝에 ?selfcheck 를 붙이면 저절로 돌고 결과가 화면에 뜬다.
     — 개발자도구를 못 여는 폰에서 확인할 수 있어야 실제로 돌리게 된다.
   · 콘솔에서 SelfCheck.run() 을 부르면 결과 객체를 돌려준다.
   · test/run.mjs 가 뷰포트·테마·모션설정을 바꿔 가며 이걸 반복해서 부른다.

   원칙
   · 기준값을 앱에서 가져오지 않는다. 앱을 그대로 베끼면 검사가 아니라 거울이다.
     44, 4.5:1, 12px 같은 숫자는 여기 직접 적는다.
   · 화면에 실제로 그려진 픽셀과 계산된 색으로 판정한다. 상태값을 믿지 않는다.
   · document.styleSheets[].cssRules 를 읽지 않는다 — file:// 에서 보안 예외를 던진다.
     규칙이 있는지가 아니라 "그래서 화면이 어떻게 됐는지"를 본다.
   · 검사가 앱을 고장 내면 안 된다. 상태를 바꾸는 검사는 반드시 원래대로 돌려놓는다. */
(function () {
  'use strict';

  /* ── 기준값 (앱에서 가져오지 않는다) ── */
  const MIN_TOUCH = 44;        /* 애플 HIG · 머티리얼 공통 최소 터치 크기 */
  const MIN_RATIO = 4.5;       /* WCAG 2.1 AA 본문 */
  const MIN_RATIO_LG = 3.0;    /* 24px 이상, 또는 18.66px 이상 굵은 글자 */
  const MIN_FONT = 12;         /* 폰에서 읽히는 하한 */

  /* 터치 크기 예외 — 이유가 코드에 적혀 있는 것만 */
  const TOUCH_SKIP = [
    '.pt-cell',        /* 표 전체를 한 화면에 넣는 격자. 그래서 확대·가로보기를 따로 뒀다 */
    '.pt-legend-item', /* 범례는 누르는 것이 아니다 */
    '.theme-swatch'    /* 부모 .theme-opt 가 실제 버튼이다 */
  ];
  /* 가로로 넘치는 것이 의도인 곳 */
  const SCROLLER_OK = ['.section-tabs', '.equation-display', '.pt-scroll', '.pt-fs-scroll', '.modal-content',
    /* .sr-only 는 내용이 넘치는 게 곧 목적이다 — 눈에는 안 보이되 읽어 주는 기계에는
       남기려고 1px 로 잘라 둔 것이라, 여기서 「넘친다」고 신고하면 옳은 코드를 나무라게 된다. */
    '.sr-only'];
  /* 12px 하한 예외
     · 주기율표 칸: 118칸을 한 화면에 넣는 밀도 문제라 코드에 근거가 적혀 있다
     · sub/sup: 아래·위 첨자는 **작은 것이 맞다**. H₂O 의 2 가 본문과 같은 크기면
       그건 첨자가 아니다. 크기 하한을 들이댈 대상이 아니라 조판 규칙이다. */
  const FONT_SKIP = ['.pt-z', '.pt-name', '.pt-sym', '.pt-axis', '.pt-extra-label', '.pt-legend',
    'sub', 'sup', '.eq-phase'];

  /* 화학 표기는 이모지가 아니다. 반응식의 화살표와 앙금·기체 표시,
     위·아래 첨자는 학습 내용 그 자체라 여기서 걸리면 안 된다. */
  const NOTATION_OK = '→←↔⇌↑↓·±°⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻₀₁₂₃₄₅₆₇₈₉ⅠⅡⅢⅣⅤⅥⅦⅧ';
  /* 그림문자 판정은 유니코드 속성으로 한다.
     처음엔 코드포인트 범위를 손으로 적었다가 가타카나와 한글 자모까지 싸잡아
     로고 「누루ズl ㅁトパㅔ요」를 이모지로 신고했다 — 범위를 손으로 적으면 늘 이렇게 된다.
     Extended_Pictographic 은 "그림으로 쓰이는 문자"를 유니코드가 직접 표시해 둔 것이고,
     U+FE0F(이모지 변형 선택자)는 「↔️」처럼 글자를 이모지로 만드는 표식이라 같이 본다. */
  const EMOJI_RE = /\p{Extended_Pictographic}|️/u;
  /* 로고는 야민정음 말장난이다(가타카나 ズ·ト·パ 와 자모를 섞어 한글 모양을 흉내 냈다).
     생성기가 절대 못 만드는 물건이고 이 앱에서 가장 사람 냄새 나는 자리라, 지켜야 할 쪽이다. */
  const EMOJI_SKIP = ['#easterEggBtn', '#selfcheckOut'];

  const T = (sel) => Array.from(document.querySelectorAll(sel));
  const matchesAny = (el, list) => list.some((s) => el.matches(s) || el.closest(s));

  /* ── 색 계산 ── */
  /* rgb()/rgba() 와 #rgb/#rrggbb 를 모두 읽는다.
     getComputedStyle 은 rgb() 로 주지만, getPropertyValue('--c-correct') 는
     토큰에 적힌 글자 그대로(#065F46)를 준다 — 숫자만 긁어내면 0,6,5 를 색으로 읽는다. */
  function parseColor(c) {
    const s = String(c).trim();
    if (s[0] === '#') {
      let h = s.slice(1);
      if (h.length === 3) h = h.split('').map((x) => x + x).join('');
      if (h.length !== 6 && h.length !== 8) return null;
      return {
        r: parseInt(h.substr(0, 2), 16), g: parseInt(h.substr(2, 2), 16), b: parseInt(h.substr(4, 2), 16),
        a: h.length === 8 ? parseInt(h.substr(6, 2), 16) / 255 : 1
      };
    }
    const m = s.match(/[\d.]+/g);
    if (!m || m.length < 3) return null;
    return { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] };
  }
  function lum(c) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function ratio(a, b) {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  }
  /* 반투명 색을 아래 색 위에 얹는다 */
  function over(top, bottom) {
    const a = top.a;
    return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 };
  }
  /* 이 요소 뒤에 실제로 깔린 색.
     조상을 타고 올라가며 반투명 배경을 차례로 합성한다 — 이 앱은 표면이 전부
     반투명이라(--c-surface-1/2), 가장 가까운 배경만 보면 실제 대비를 알 수 없다. */
  function effectiveBg(el) {
    const stack = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parseColor(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) { stack.push(c); if (c.a >= 0.999) break; }
      n = n.parentElement;
    }
    let base = parseColor(getComputedStyle(document.documentElement).backgroundColor);
    if (!base || base.a < 0.999) base = parseColor(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    let out = base;
    for (let i = stack.length - 1; i >= 0; i--) out = over(stack[i], out);
    return out;
  }
  function hue(c) {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d) return 0;
    let h;
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; return h < 0 ? h + 360 : h;
  }

  /* ── 결과 수집 ── */
  function Report() {
    this.pass = 0; this.fail = []; this.warn = [];
  }
  Report.prototype.ok = function (name, cond, detail) {
    if (cond) this.pass++;
    else this.fail.push(detail ? name + ' — ' + detail : name);
  };
  Report.prototype.soft = function (name, cond, detail) {
    if (!cond) this.warn.push(detail ? name + ' — ' + detail : name);
    else this.pass++;
  };

  /* 보이는 요소인가 (레이아웃을 차지하고 눈에 보이는가) */
  function visible(el) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    if (el.closest('[hidden]')) return false;
    if (!el.offsetParent && cs.position !== 'fixed') return false;
    return el.offsetWidth > 0 && el.offsetHeight > 0;
  }

  /* ── ① 대비 ── */
  function checkContrast(rep) {
    const els = T('button, a, label, p, span, div, li, h1, h2, h3, input').filter((el) => {
      if (!visible(el)) return false;
      const t = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
      return t;
    });
    let worst = null;
    for (const el of els) {
      const cs = getComputedStyle(el);
      const fg = parseColor(cs.color);
      if (!fg || fg.a < 0.1) continue;
      const bg = effectiveBg(el);
      const eff = fg.a < 0.999 ? over(fg, bg) : fg;
      const size = parseFloat(cs.fontSize);
      const w = parseInt(cs.fontWeight, 10) || 400;
      const large = size >= 24 || (size >= 18.66 && w >= 700);
      const need = large ? MIN_RATIO_LG : MIN_RATIO;
      const r = ratio(eff, bg);
      if (!worst || r < worst.r) worst = { r, el };
      if (r < need) {
        rep.fail.push('대비 ' + r.toFixed(2) + ':1 (기준 ' + need + ') — ' +
          (el.id ? '#' + el.id : '.' + String(el.className).split(/\s+/)[0]) +
          ' "' + el.textContent.trim().slice(0, 14) + '"');
      } else rep.pass++;
    }
    if (worst) rep.note = '가장 낮은 대비 ' + worst.r.toFixed(2) + ':1';
  }

  /* ── ② 터치 크기 ──
     getBoundingClientRect 는 진행 중인 transform 에 흔들리므로 offset* 로 잰다.
     ::after 로 넓힌 스위치와 음수 여백으로 넓힌 닫기 ✕ 는 상자 크기로는 알 수 없어
     실제로 그 지점을 눌렀을 때 무엇이 잡히는지로 판정한다. */
  function checkTouch(rep) {
    const els = T('button, [role="switch"], .blank-box, .theme-opt, .reaction-item').filter(visible);
    for (const el of els) {
      if (matchesAny(el, TOUCH_SKIP)) continue;
      let w = el.offsetWidth, h = el.offsetHeight;
      const name = el.id ? '#' + el.id : '.' + String(el.className).split(/\s+/)[0];
      if (w >= MIN_TOUCH && h >= MIN_TOUCH) { rep.pass++; continue; }
      /* 상자는 작지만 누를 수 있는 넓이는 넓을 수 있다 — 실제로 눌러 본다 */
      const b = el.getBoundingClientRect();
      const probe = (dx, dy) => {
        const t = document.elementFromPoint(b.left + b.width / 2 + dx, b.top + b.height / 2 + dy);
        return !!(t && (t === el || el.contains(t) || t.closest('*') === el || el.contains(t.parentElement)));
      };
      let up = 0, down = 0, left = 0, right = 0;
      for (let d = 1; d <= 16 && probe(0, -(b.height / 2 + d)); d++) up = d;
      for (let d = 1; d <= 16 && probe(0, b.height / 2 + d); d++) down = d;
      for (let d = 1; d <= 16 && probe(-(b.width / 2 + d), 0); d++) left = d;
      for (let d = 1; d <= 16 && probe(b.width / 2 + d, 0); d++) right = d;
      const rw = w + left + right, rh = h + up + down;
      rep.ok('터치 ' + MIN_TOUCH + 'px ' + name, rw >= MIN_TOUCH && rh >= MIN_TOUCH,
        '실제 ' + Math.round(rw) + '×' + Math.round(rh) + ' (상자 ' + w + '×' + h + ')');
    }
  }

  /* ── ③ 가로 넘침 ── */
  function checkOverflow(rep) {
    const de = document.documentElement;
    rep.ok('문서가 가로로 밀리지 않음', de.scrollWidth <= de.clientWidth + 1,
      de.scrollWidth + ' > ' + de.clientWidth);
    for (const el of T('#app *').filter(visible)) {
      if (matchesAny(el, SCROLLER_OK)) continue;
      const cs = getComputedStyle(el);
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue;
      if (el.scrollWidth > el.clientWidth + 1 && cs.overflow !== 'visible') {
        rep.warn.push('내용이 넘침 ' + (el.id ? '#' + el.id : '.' + String(el.className).split(/\s+/)[0]) +
          ' ' + el.scrollWidth + '>' + el.clientWidth);
      }
    }
  }

  /* ── ④ 테마 짝 — 규칙을 읽지 않고 기능으로 확인 ──
     테마마다 :root.theme-<id> 와 .theme-pv.theme-<id> 두 블록이 짝으로 있어야 한다.
     한쪽이 빠지면 미리보기 조각이 "지금 켜진 테마" 색을 그대로 물려받아
     다섯 개가 전부 같은 색으로 보인다 — 실제로 한 번 일어났던 일이다.
     탐침 span 을 붙여 놓고 뿌리를 딴 테마로 바꿔도 탐침 색이 안 변하는지 본다. */
  function checkThemePairs(rep) {
    if (typeof THEMES === 'undefined') { rep.warn.push('THEMES 등록처가 없어 테마 짝 검사를 건너뜀'); return; }
    const de = document.documentElement;
    const had = Array.from(de.classList).filter((c) => c.indexOf('theme-') === 0);
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px';
    document.body.appendChild(probe);
    /* 칠해진 배경색이 아니라 **토큰이 풀린 값**을 견준다.
       처음엔 backgroundColor 를 읽었는데, body::before 의 은은한 그라디언트가 겹쳐
       실제 바탕이 rgb(20,24,34) 로 나왔다 — 토큰은 #10141E 인데. 칠은 여러 겹의 결과라
       "어느 테마의 값을 쓰고 있나"를 묻는 데는 맞는 자가 아니다. */
    const tokenOf = (el) => getComputedStyle(el).getPropertyValue('--c-bg').trim();
    try {
      for (const t of THEMES) {
        /* ① 뿌리를 그 테마로 두고 토큰 값을 읽는다 */
        had.forEach((c) => de.classList.remove(c));
        de.classList.add('theme-' + t.id);
        const rootTok = tokenOf(de);
        /* ② 뿌리는 딴 테마로 두고, 탐침에만 그 테마를 입힌다.
              짝 블록이 빠져 있으면 탐침은 지금 켜진 테마 값을 그대로 물려받는다 */
        const other = THEMES.find((x) => x.id !== t.id) || t;
        de.classList.remove('theme-' + t.id);
        de.classList.add('theme-' + other.id);
        probe.className = 'theme-pv theme-' + t.id;
        const pvTok = tokenOf(probe);
        rep.ok('테마 짝 ' + t.id, !!rootTok && pvTok === rootTok,
          '미리보기 ' + (pvTok || '(빈값)') + ' ≠ 실제 ' + (rootTok || '(빈값)'));
        probe.className = '';
        de.classList.remove('theme-' + other.id);
      }
    } finally {
      probe.remove();
      Array.from(de.classList).filter((c) => c.indexOf('theme-') === 0).forEach((c) => de.classList.remove(c));
      had.forEach((c) => de.classList.add(c));
    }
  }

  /* ── ⑤ 토큰 불변식 ──
     주석으로 적어 둔 약속을 실제로 돌려서 확인한다.
     surface-1/2 는 같은 색의 두 알파, focus-glow 는 강조색의 0.2,
     맞음은 초록 계열, 틀림은 빨강 계열 — 채점 결과라 취향으로 바꾸면 안 된다. */
  function checkTokens(rep) {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    const need = ['--c-bg', '--c-surface-1', '--c-surface-2', '--c-surface-solid', '--c-border',
      '--c-text-primary', '--c-text-secondary', '--c-accent-1', '--c-correct', '--c-wrong'];
    for (const n of need) rep.ok('토큰 ' + n + ' 있음', !!v(n));

    const s1 = parseColor(v('--c-surface-1')), s2 = parseColor(v('--c-surface-2'));
    if (s1 && s2) {
      rep.ok('surface-1/2 가 같은 색의 두 알파',
        s1.r === s2.r && s1.g === s2.g && s1.b === s2.b,
        v('--c-surface-1') + ' vs ' + v('--c-surface-2'));
      rep.ok('surface-2 가 더 진함', s2.a > s1.a);
    }
    const ok = parseColor(v('--c-correct')), no = parseColor(v('--c-wrong'));
    if (ok) { const h = hue(ok); rep.ok('맞음이 초록 계열', h >= 80 && h <= 175, '색상각 ' + Math.round(h)); }
    if (no) { const h = hue(no); rep.ok('틀림이 빨강 계열', h >= 335 || h <= 25, '색상각 ' + Math.round(h)); }

    const a1 = parseColor(v('--c-accent-1')), fg = parseColor(v('--c-focus-glow'));
    if (a1 && fg) {
      rep.soft('focus-glow 가 강조색의 옅은 판',
        Math.abs(a1.r - fg.r) < 2 && Math.abs(a1.g - fg.g) < 2 && Math.abs(a1.b - fg.b) < 2,
        v('--c-focus-glow') + ' vs ' + v('--c-accent-1'));
    }
  }

  /* ── ⑥ 글꼴 굵기 ──
     쓰는 굵기가 실제로 받아 오는 굵기 안에 있는지 본다. 없는 굵기를 쓰면
     브라우저가 가짜로 굵게 만들어 글자가 뭉개진다 — 실제로 그 버그가 있었다
     (600을 쓰는데 링크에는 400·500·700·900만 적혀 있었다).

     ⚠️ document.fonts.check() 를 쓰면 안 된다. 그건 "그 글자를 그릴 수 있나"를 묻는 것이라
     대체 글꼴로 그릴 수 있으면 참을 준다 — 없는 글꼴 이름에도 참이 나온다(직접 확인).
     그래서 절대 실패하지 않는 검사가 된다. 대신 <link> 주소에 적힌 wght 목록과
     화면에서 실제로 쓰인 굵기를 견준다. 망이 끊겨 있어도 판정이 성립한다. */
  function checkFonts(rep) {
    const links = Array.from(document.querySelectorAll('link[href*="fonts.googleapis.com"]'));
    if (!links.length) { rep.warn.push('웹폰트 링크가 없어 굵기 검사를 건너뜀'); return; }
    const asked = new Set();
    for (const l of links) {
      for (const m of l.getAttribute('href').matchAll(/wght@([\d;.]+)/g)) {
        m[1].split(';').forEach((w) => asked.add(parseInt(w, 10)));
      }
    }
    const used = new Set();
    for (const el of T('#app *').filter(visible)) {
      const w = parseInt(getComputedStyle(el).fontWeight, 10);
      if (w) used.add(w);
    }
    const missing = Array.from(used).filter((w) => !asked.has(w)).sort((a, b) => a - b);
    rep.ok('쓰는 굵기를 전부 받아 온다', missing.length === 0,
      '안 받아 온 굵기 ' + missing.join(',') + ' (받는 것: ' + Array.from(asked).sort((a, b) => a - b).join(',') + ')');
    /* 반대쪽 — 받아 놓고 안 쓰는 굵기는 그냥 낭비다(느린 망에서 그만큼 늦어진다) */
    const unused = Array.from(asked).filter((w) => !used.has(w)).sort((a, b) => a - b);
    rep.soft('받아 온 굵기를 다 쓴다', unused.length === 0, '안 쓰는 굵기 ' + unused.join(','));
  }

  /* ── ⑦ 이모지 ── */
  function checkEmoji(rep, roots) {
    roots = roots || [document.getElementById('app')].concat(T('.modal-overlay.show'));
    const found = [];
    for (const root of roots) {
      if (!root) continue;
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const p = n.parentElement;
        if (!p || !visible(p)) continue;
        if (matchesAny(p, EMOJI_SKIP)) continue;
        for (const ch of n.textContent) {
          if (NOTATION_OK.indexOf(ch) !== -1) continue;
          if (EMOJI_RE.test(ch)) found.push(ch + ' ← "' + n.textContent.trim().slice(0, 16) + '"');
        }
      }
    }
    const where = roots.length === 1 && roots[0] && roots[0].id ? ' (' + roots[0].id + ')' : '';
    rep.ok('그림문자가 없음' + where, found.length === 0, Array.from(new Set(found)).slice(0, 6).join(' / '));
  }

  /* ── ⑧ 모션 ──
     움직임을 줄여 달라고 한 사람에게 상호작용 시간은 0이 되어야 하지만,
     그림(전자 이동) 애니메이션은 시간을 0으로 만들면 전자가 중간에 멈춘 채 남아
     전자 배치가 틀리게 보인다. 그래서 그림은 시간이 아니라 통째로 꺼진다. */
  function checkMotion(rep) {
    const cs = getComputedStyle(document.documentElement);
    const ms = (n) => {
      const s = cs.getPropertyValue(n).trim();
      if (!s) return null;
      return s.endsWith('ms') ? parseFloat(s) : parseFloat(s) * 1000;
    };
    const inter = ['--dur-press', '--dur-tap', '--dur-enter', '--dur-exit', '--dur-move', '--dur-view'];
    for (const n of inter) { const v = ms(n); rep.ok('모션 토큰 ' + n + ' 있음', v !== null && !isNaN(v)); }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const n of inter) { const v = ms(n); if (v !== null) rep.ok('움직임 줄이기: ' + n + ' 가 0에 가까움', v <= 1, v + 'ms'); }
      const dia = ms('--dur-dia-step');
      if (dia !== null) rep.ok('움직임 줄이기라도 그림 시간은 줄이지 않음 (전자가 중간에 멈추면 안 됨)', dia > 1, dia + 'ms');
    }
  }

  /* ── ⑨ 전 구역 × 전 모드가 실제로 그려지는가 ── */
  function checkModes(rep) {
    if (typeof SECTIONS === 'undefined' || typeof App === 'undefined') { rep.warn.push('SECTIONS/App 없음 — 모드 검사 건너뜀'); return; }
    const back = { sec: App.state.section, mode: App.state.currentMode };
    const BAD = /undefined|NaN|\[object Object\]|null/;
    try {
      for (const s of SECTIONS) {
        App.setSection(s.id);
        const modes = modesInSection(s.id);
        rep.ok('구역 ' + s.label + ' 에 모드가 있음', modes.length > 0);
        for (const m of modes) {
          let err = null;
          try { App.setMode(m); } catch (e) { err = e.message; }
          rep.ok('모드 ' + s.label + '/' + m + ' 가 오류 없이 뜸', !err, err || '');
          const card = document.getElementById('questionCard');
          const m6 = document.getElementById('mode6Wrap');
          const host = (m6 && visible(m6)) ? m6 : card;
          const txt = host ? host.textContent.replace(/\s/g, '') : '';
          rep.ok('모드 ' + s.label + '/' + m + ' 화면이 비지 않음', txt.length > 2, txt.length + '자');
          rep.ok('모드 ' + s.label + '/' + m + ' 에 undefined/NaN 이 안 보임', !BAD.test(host ? host.textContent : ''),
            (host ? host.textContent : '').slice(0, 40));
        }
      }
    } finally {
      try { App.setSection(back.sec); App.setMode(back.mode); } catch (e) { /* 되돌리기 실패는 검사 실패가 아니다 */ }
    }
  }

  /* ── ⑩ 창 여닫기 ──
     창은 --dur-enter 에 걸쳐 서서히 나타난다. 누르자마자 opacity 를 읽으면
     전환이 **시작된 순간의 값**(0)을 잡아, 멀쩡한 창을 "안 보인다"고 신고한다.
     그래서 이 검사만 비동기다 — 전환이 끝나기를 실제로 기다린다. */
  async function checkModals(rep) {
    const settle = () => new Promise((r) => setTimeout(r, motionMs('--dur-enter') + 120));
    const pairs = [['오답 노트', 'wrongNoteBtn', 'wrongNoteModalOverlay', 'wrongNoteModalClose'],
      ['반응식 목록', 'hintBtn', 'hintModalOverlay', 'hintModalClose'],
      ['주기율표', 'periodicBtn', 'periodicModalOverlay', 'periodicModalClose'],
      ['테마', 'themeBtn', 'themeModalOverlay', 'themeModalClose']];
    for (const [name, btn, ov, close] of pairs) {
      const b = document.getElementById(btn), o = document.getElementById(ov), c = document.getElementById(close);
      if (!b || !o) { rep.fail.push('창 ' + name + ' 의 버튼이나 창이 없음'); continue; }
      b.click();
      await settle();
      const cs = getComputedStyle(o);
      rep.ok('창 ' + name + ' 이 실제로 보임',
        o.classList.contains('show') && cs.visibility === 'visible' && +cs.opacity > 0.99 && cs.pointerEvents !== 'none',
        cs.visibility + '/' + cs.opacity + '/' + cs.pointerEvents);
      /* 열린 창 안에서 그림문자와 터치 크기를 같이 본다 — 닫혀 있으면 못 보는 자리다 */
      if (o.classList.contains('show')) checkEmoji(rep, [o]);
      if (c) c.click(); else o.classList.remove('show');
      await settle();
      rep.ok('창 ' + name + ' 이 닫힘', !o.classList.contains('show'));
    }
  }

  function motionMs(name) {
    const s = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!s) return 300;
    const v = s.endsWith('ms') ? parseFloat(s) : parseFloat(s) * 1000;
    return isNaN(v) ? 300 : v;
  }

  /* ── ⑪ 판 번호가 세 곳에서 일치하는가 ──
     APP_VERSION · CHANGELOG 맨 앞 · index.html 의 ?v= 셋이 어긋나면
     브라우저가 옛 파일을 계속 쓴다. 빌드 도구가 없어 손으로 맞추는 자리다. */
  function checkVersion(rep) {
    if (typeof APP_VERSION === 'undefined') { rep.warn.push('APP_VERSION 없음'); return; }
    if (typeof CHANGELOG !== 'undefined' && CHANGELOG.length) {
      rep.ok('CHANGELOG 맨 앞이 지금 판', CHANGELOG[0].v === APP_VERSION, CHANGELOG[0].v + ' vs ' + APP_VERSION);
    }
    const urls = Array.from(document.querySelectorAll('link[href*="?v="],script[src*="?v="]'))
      .map((e) => (e.getAttribute('href') || e.getAttribute('src')));
    const bad = urls.filter((u) => u.split('?v=')[1] !== APP_VERSION);
    rep.ok('모든 ?v= 가 지금 판과 같음 (' + urls.length + '곳)', bad.length === 0, bad.slice(0, 3).join(' '));
  }

  /* ── ⑫ 글자 크기 하한 ── */
  function checkFontSize(rep) {
    for (const el of T('#app *').filter(visible)) {
      if (matchesAny(el, FONT_SKIP)) continue;
      const has = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!has) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px < MIN_FONT) {
        rep.warn.push('글자가 ' + MIN_FONT + 'px 보다 작음 ' + px + 'px — ' +
          (el.id ? '#' + el.id : '.' + String(el.className).split(/\s+/)[0]));
      }
    }
  }

  const SUITES = {
    contrast: checkContrast, touch: checkTouch, overflow: checkOverflow,
    themePairs: checkThemePairs, tokens: checkTokens, fonts: checkFonts,
    emoji: checkEmoji, motion: checkMotion, modes: checkModes,
    modals: checkModals, version: checkVersion, fontSize: checkFontSize
  };

  /* 창 검사가 전환이 끝나기를 기다려야 해서 전체가 비동기다.
     Playwright 의 page.evaluate 는 돌려준 Promise 를 알아서 기다리고,
     ?selfcheck 자동 실행도 .then 으로 받는다. */
  async function run(only) {
    const rep = new Report();
    const names = only ? (Array.isArray(only) ? only : [only]) : Object.keys(SUITES);
    for (const n of names) {
      if (!SUITES[n]) { rep.warn.push('그런 검사가 없다: ' + n); continue; }
      try { await SUITES[n](rep); } catch (e) { rep.fail.push('검사 ' + n + ' 가 스스로 터짐 — ' + e.message); }
    }
    rep.ran = names;
    rep.viewport = window.innerWidth + '×' + window.innerHeight;
    rep.theme = (typeof App !== 'undefined' && App.state) ? App.state.theme : '(모름)';
    return rep;
  }

  /* ── 화면에 띄우기 ──
     폰에서 개발자도구 없이 볼 수 있어야 실제로 돌리게 된다. */
  function show(rep) {
    const old = document.getElementById('selfcheckOut');
    if (old) old.remove();
    const box = document.createElement('div');
    box.id = 'selfcheckOut';
    box.setAttribute('style', 'position:fixed;inset:auto 8px 8px 8px;max-height:62vh;overflow:auto;z-index:2147483647;' +
      'background:#111;color:#eee;font:12px/1.5 ui-monospace,monospace;padding:12px 14px;border-radius:10px;' +
      'box-shadow:0 8px 32px rgba(0,0,0,.5);white-space:pre-wrap;word-break:break-all');
    const head = (rep.fail.length ? '✕ 실패 ' + rep.fail.length : '✓ 통과') +
      ' · 확인 ' + rep.pass + ' · 주의 ' + rep.warn.length +
      '\n' + rep.viewport + ' · 테마 ' + rep.theme + (rep.note ? ' · ' + rep.note : '');
    box.textContent = head +
      (rep.fail.length ? '\n\n[실패]\n' + rep.fail.join('\n') : '') +
      (rep.warn.length ? '\n\n[주의]\n' + rep.warn.join('\n') : '');
    const x = document.createElement('button');
    x.textContent = '닫기';
    x.setAttribute('style', 'position:sticky;top:0;float:right;background:#333;color:#eee;border:0;border-radius:6px;padding:6px 10px;cursor:pointer');
    x.onclick = () => box.remove();
    box.prepend(x);
    document.body.appendChild(box);
    return rep;
  }

  window.SelfCheck = { run, show, suites: Object.keys(SUITES), check: (n) => run(n) };

  if (location.search.indexOf('selfcheck') !== -1) {
    /* 앱이 첫 화면을 다 그린 뒤에 돈다 */
    window.addEventListener('load', () => setTimeout(() => { run().then(show); }, 400));
  }
})();
