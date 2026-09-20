/* ── 회귀 검사 ──
   js/selfcheck.js 를 여러 조건에서 반복해 부른다. 판정 논리는 전부 저쪽에 있고
   여기는 "어떤 조건에서 볼 것인가"만 정한다 — 그래야 폰에서 손으로 열어 본 결과와
   여기서 나온 결과가 같은 것을 뜻한다.

   file:// 로 연다. 서버를 띄우지 않는 게 요점이다 —
   이 앱은 파일로 열어도 돌아가야 하고(빌드 도구가 없다), 그 요구사항을
   "지켜야 한다"고 적어 두는 대신 매번 실제로 확인한다.

   실행:  node test/run.mjs
   (playwright 가 없으면 안내가 나온다. 앱에는 의존성을 넣지 않는다 — 여기만 쓴다.)   */

import { existsSync, globSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PAGE = pathToFileURL(join(ROOT, 'index.html')).href;

/* 폰에서 실제로 쓰는 폭 + 와이드 모드가 켜지는 폭 */
const VIEWPORTS = [
  { w: 320, h: 640, name: 'iPhone SE 1세대' },
  { w: 360, h: 740, name: '안드로이드 소형' },
  { w: 390, h: 844, name: 'iPhone 14' },
  { w: 414, h: 896, name: 'iPhone Plus' },
  { w: 1024, h: 800, name: '와이드 모드' }
];

/* 브라우저 위치는 이미지마다 빌드 번호가 달라진다. 박아 두면 다음 컨테이너에서 깨진다. */
function findChrome() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  for (const pat of ['chromium-*/chrome-linux/chrome', 'chromium_headless_shell-*/chrome-linux/headless_shell']) {
    const hit = globSync(join(base, pat)).sort();
    if (hit.length) return hit[hit.length - 1];
  }
  return undefined; /* playwright 가 알아서 찾게 둔다 */
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error(
    'playwright 가 없습니다. 검사 장치만 쓰는 의존성이라 앱에는 넣지 않습니다.\n' +
    '  npm i --no-save playwright\n' +
    '브라우저는 PLAYWRIGHT_BROWSERS_PATH 아래 이미 있으면 그걸 씁니다.'
  );
  process.exit(2);
}

const exe = findChrome();
const themesArg = process.argv.find((a) => a.startsWith('--themes='));
let fail = 0, warn = 0, pass = 0;
const failures = [];
const warnings = [];

const browser = await chromium.launch(exe ? { executablePath: exe } : {});

async function once({ vp, theme, reduced, blockFonts }) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 2,
    hasTouch: vp.w < 900,
    isMobile: vp.w < 900,
    reducedMotion: reduced ? 'reduce' : 'no-preference'
  });
  if (blockFonts) {
    /* 글꼴이 안 와도 읽혀야 한다 — 학교 망에서 막히는 일이 실제로 있다 */
    await ctx.route('**://fonts.g*/**', (r) => r.abort());
  }
  const page = await ctx.newPage();
  const boom = [];
  page.on('pageerror', (e) => boom.push('PAGEERROR ' + e.message));
  page.on('console', (m) => {
    /* fonts.g*(구글 폰트) 요청이 막히는 방식은 연결 거부(ERR_CONNECTION_REFUSED)만이
       아니다 — 이 샌드박스에서는 프록시 인증서 문제(ERR_CERT_AUTHORITY_INVALID)로도
       실패하는 걸 실제로 봤다. 둘 다 "글꼴이 안 왔다"는 같은 사실이고 앱이 견뎌야
       하는 것도 같으므로(위 주석 참고), 어떤 네트워크 오류 코드든 다 눈감아 준다. */
    if (m.type() === 'error' && !/favicon|fonts\.g|ERR_(CONNECTION|BLOCKED|FAILED|CERT|NAME_NOT_RESOLVED|TIMED_OUT)/.test(m.text())) boom.push(m.text());
  });

  await page.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.SelfCheck === 'object', null, { timeout: 10000 });
  await page.waitForTimeout(500);

  /* 예전에는 .catch(()=>{}) 로 삼켰다. 테마를 못 바꾼 채로 그냥 넘어가면 그 줄은
     「✓ … · contrast」라고 찍히는데 실제로는 기본 테마를 또 한 번 검사한 것이다 —
     테마 행렬이 통째로 증발해도 초록으로 보인다. 못 바꿨으면 그건 실패다. */
  if (theme) {
    try {
      await page.evaluate((t) => App.applyTheme(t, false), theme);
      const got = await page.evaluate(() => App.state.theme);
      if (got !== theme) throw new Error(`테마가 안 바뀜 — 요청 ${theme}, 실제 ${got}`);
    } catch (e) {
      boom.push('테마 적용 실패: ' + e.message);
    }
  }
  await page.waitForTimeout(200);

  const rep = await page.evaluate(() => window.SelfCheck.run());
  const label = `${vp.w}px ${vp.name}` +
    (theme ? ` · ${theme}` : '') +
    (reduced ? ' · 움직임줄이기' : '') +
    (blockFonts ? ' · 글꼴차단' : '');

  pass += rep.pass; warn += rep.warn.length;
  for (const w of rep.warn) warnings.push(`${label} — ${w}`);
  if (rep.fail.length || boom.length) {
    fail += rep.fail.length + boom.length;
    failures.push({ label, fail: rep.fail, boom });
    console.log(`  ✕ ${label}  실패 ${rep.fail.length + boom.length} / 확인 ${rep.pass}`);
    for (const f of rep.fail.slice(0, 8)) console.log(`      ${f}`);
    for (const b of boom.slice(0, 3)) console.log(`      ${b}`);
  } else {
    console.log(`  ✓ ${label}  확인 ${rep.pass}${rep.warn.length ? ` · 주의 ${rep.warn.length}` : ''}`);
  }
  await ctx.close();
}

/* ── 전 모드 시각 검사 ──
   지금까지 시각 스위트(대비·터치·넘침·글자크기·그림 안 글자)는 앱을 연 **직후 화면 한 장**
   에서만 돌았다. 그 화면은 늘 모드 1이라 나머지 모드에서 글자가 잘리거나 대비가 무너져도
   검사가 닿지 않았다. 그림 안 글자 검사는 특히 헛돌았다 — 모드 1에는 SVG <text>가 하나도
   없어 「볼 것 없음」으로 늘 통과했고, **실제로 재는 화면이 한 번도 없었다.**
   하위 유형(모드 3·4·9·15)도 modesInSection이 뿌리 모드만 돌려주는 탓에 전부 빠져 있었다.

   그래서 전 구역 × 전 모드(하위 유형 포함)를 돌며 같은 스위트를 부른다. 실측 4초다.
   폭은 320px 하나로 족하다 — 좁을수록 잘리고 배율이 내려가니 여기서 안 걸리면 넓은 데서도
   안 걸린다. */
async function walkModes() {
  const ctx = await browser.newContext({
    viewport: { width: 320, height: 640 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true
  });
  const page = await ctx.newPage();
  const boom = [];
  page.on('pageerror', (e) => boom.push('PAGEERROR ' + e.message));
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.SelfCheck === 'object', null, { timeout: 10000 });
  await page.waitForTimeout(400);

  /* 모드 목록도 앱의 등록처에서 가져온다 — 모드를 늘리면 검사도 저절로 늘어난다 */
  const modes = await page.evaluate(() =>
    Object.keys(MODES).map(Number).filter((m) => sectionOf(m)));
  const SUITES = ['contrast', 'touch', 'overflow', 'fontSize', 'svgText'];
  let seenSvgText = 0;

  for (const m of modes) {
    const r = await page.evaluate(async ([m, suites]) => {
      App.setSection(sectionOf(m));
      App.setMode(m);
      await new Promise((r) => setTimeout(r, 120));
      const rep = await window.SelfCheck.run(suites);
      return {
        pass: rep.pass, fail: rep.fail, warn: rep.warn,
        name: (typeof MODE_NAMES !== 'undefined' && MODE_NAMES[m]) || ('모드 ' + m),
        /* 그림 안 글자를 실제로 잰 화면이 있었는지 — 없으면 이 검사는 또 헛돈 것이다 */
        svgTexts: [...document.querySelectorAll('svg[viewBox] text')].filter((t) => t.textContent.trim()).length
      };
    }, [m, SUITES]);
    seenSvgText += r.svgTexts;
    const label = `모드 ${m} ${r.name}`;
    pass += r.pass; warn += r.warn.length;
    for (const w of r.warn) warnings.push(`${label} — ${w}`);
    if (r.fail.length || boom.length) {
      fail += r.fail.length + boom.length;
      failures.push({ label, fail: r.fail, boom: [...boom] });
      console.log(`  ✕ ${label}  실패 ${r.fail.length + boom.length}`);
      for (const f of r.fail.slice(0, 6)) console.log(`      ${f}`);
      for (const bm of boom.slice(0, 3)) console.log(`      ${bm}`);
      boom.length = 0;
    } else {
      console.log(`  ✓ ${label}  확인 ${r.pass}${r.svgTexts ? ` · 그림글자 ${r.svgTexts}` : ''}${r.warn.length ? ` · 주의 ${r.warn.length}` : ''}`);
    }
  }
  /* 전 모드를 다 돌았는데도 그림 안 글자를 한 번도 못 쟀다면, 그 검사는 여전히 공회전이다.
     통과로 두면 「있는 줄 알았는데 없던」 상태로 조용히 되돌아간다. */
  if (!seenSvgText) {
    fail++;
    failures.push({ label: '그림 안 글자 검사', fail: ['전 모드를 돌았는데 SVG <text>를 한 번도 못 만났다 — 검사가 공회전 중'], boom: [] });
    console.log('  ✕ 그림 안 글자 검사가 공회전 중 — 전 모드에서 SVG <text> 0개');
  }
  await ctx.close();
}

/* 테마 목록은 앱의 등록처에서 가져온다 — 테마를 늘리면 검사도 저절로 늘어야 한다 */
const probe = await browser.newContext();
const pp = await probe.newPage();
await pp.goto(PAGE, { waitUntil: 'domcontentloaded' });
await pp.waitForFunction(() => typeof THEMES !== 'undefined', null, { timeout: 10000 });
const ALL_THEMES = await pp.evaluate(() => THEMES.map((t) => t.id));
await probe.close();
const THEME_IDS = themesArg ? themesArg.split('=')[1].split(',') : ALL_THEMES;

console.log(`검사 시작 — ${PAGE}`);
console.log(`브라우저: ${exe || '(playwright 기본)'}`);
console.log(`테마 ${THEME_IDS.length}개: ${THEME_IDS.join(' · ')}\n`);

console.log('── 폭별 (기본 테마) ──');
for (const vp of VIEWPORTS) await once({ vp, theme: null, reduced: false });

console.log('\n── 테마별 (390px) ──');
const mid = VIEWPORTS[2];
for (const t of THEME_IDS) await once({ vp: mid, theme: t, reduced: false });

console.log('\n── 특수 조건 ──');
await once({ vp: mid, theme: null, reduced: true });
await once({ vp: mid, theme: null, reduced: false, blockFonts: true });
await once({ vp: VIEWPORTS[0], theme: THEME_IDS[0], reduced: false });

console.log('\n── 전 모드 (320px) ──');
await walkModes();

await browser.close();

console.log(`\n확인 ${pass} · 주의 ${warn} · 실패 ${fail}`);
/* 주의(warn)는 예전에 종료 코드에 아무 영향이 없었다. 그래서 9px 글자와 잘린 라벨을
   심어도 「✓ 전부 통과, 주의 18」로 끝나고 exit 0 이었다 — 아무도 안 보는 곳에 결함이
   쌓인다. 지금은 주의가 0이므로, 하나라도 생기면 눈에 띄게 만든다. */
if (warn) {
  console.log('\n주의 내용:');
  for (const w of warnings) console.log(`  ${w}`);
}
if (fail) {
  console.log('\n실패한 조건:');
  for (const f of failures) console.log(`  ${f.label}`);
}
/* 주의도 실패로 센다. 예전에는 종료 코드가 fail 만 봐서, 9px 글자와 잘린 라벨을
   심어도 「주의 18 · exit 0」으로 끝났다 — 아무도 안 보는 곳에 결함이 쌓인다.
   지금 주의는 0이므로, 하나라도 생기면 그 자리에서 눈에 띈다. 정말 남겨야 할
   주의가 생기면 그때 기준을 고치고 이유를 selfcheck.js 에 적는다. */
process.exit(fail || warn ? 1 : 0);
