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
    if (m.type() === 'error' && !/favicon|fonts\.g|ERR_(CONNECTION|BLOCKED|FAILED)/.test(m.text())) boom.push(m.text());
  });

  await page.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.SelfCheck === 'object', null, { timeout: 10000 });
  await page.waitForTimeout(500);

  if (theme) await page.evaluate((t) => App.applyTheme(t, false), theme).catch(() => {});
  await page.waitForTimeout(200);

  const rep = await page.evaluate(() => window.SelfCheck.run());
  const label = `${vp.w}px ${vp.name}` +
    (theme ? ` · ${theme}` : '') +
    (reduced ? ' · 움직임줄이기' : '') +
    (blockFonts ? ' · 글꼴차단' : '');

  pass += rep.pass; warn += rep.warn.length;
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

await browser.close();

console.log(`\n확인 ${pass} · 주의 ${warn} · 실패 ${fail}`);
if (fail) {
  console.log('\n실패한 조건:');
  for (const f of failures) console.log(`  ${f.label}`);
}
process.exit(fail ? 1 : 0);
