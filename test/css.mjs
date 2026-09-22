/* 스타일시트의 규약 — 브라우저 없이 글자만 보고 확인한다.

   화면을 재는 검사(run.mjs)로는 못 잡는 종류가 있다. 폰의 주소창이 오르내릴 때만
   드러나는 것이 그렇다 — 헤드리스 브라우저에는 주소창이 없어서 100vh 와 100dvh 가
   똑같이 보인다. 그래서 「무엇을 썼는가」를 글자 그대로 확인한다.

   실행:  node test/css.mjs                                                              */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const ok = (cond, name, got) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${got !== undefined ? `  → ${got}` : ''}`); if (!cond) fail++; };

const cssText = readFileSync(join(ROOT, 'css', 'style.css'), 'utf8');
/* 주석을 먼저 지운다(줄 수는 그대로 둔다) — 이 파일의 주석은 여러 줄에 걸쳐 있고
   그 안에서 「45vh」처럼 값을 설명하기도 한다. 한 줄씩 보면 그게 코드로 보인다. */
const css = cssText.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).split('\n');
const cssRaw = cssText.split('\n');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

/* ── vh 에는 dvh 짝이 있어야 한다 ──
   100vh 는 「주소창이 숨었을 때의 높이」로 고정이라, 주소창이 보이는 동안에는 그만큼
   화면 밖으로 넘친다. dvh 는 지금 보이는 높이를 따라간다. dvh 를 모르는 브라우저는
   그 줄을 무시하므로 vh 를 먼저·dvh 를 뒤에 겹쳐 적는다 — 두 줄이 한 짝이다.
   예외: JS 실측값의 폴백(var(--app-h,100vh))과 주석. */
const VH = /(?<![a-z-])\d*\.?\d+vh\b/;
const bad = [];
css.forEach((code, i) => {
  if (!VH.test(code)) return;
  if (code.includes('var(--app-')) return;          /* 실측값이 먼저고 vh 는 폴백이다 */
  if (code.includes('dvh')) return;                 /* 같은 줄에 짝이 있다 */
  bad.push(`css/style.css:${i + 1}  ${cssRaw[i].trim().slice(0, 90)}`);
});
ok(bad.length === 0, 'vh 를 쓴 모든 선언에 dvh 짝이 있다', bad.length ? '\n      ' + bad.join('\n      ') : '0건');

/* 짝이 실제로 여러 곳에 있는지도 본다 — 위 검사는 vh 를 전부 지워도 통과하기 때문이다 */
const dvhCount = css.filter((l) => l.includes('dvh')).length;  /* 주석 뺀 실제 선언만 센다 */
ok(dvhCount >= 6, `dvh 를 쓰는 자리가 남아 있다 (${dvhCount}곳)`);

/* 화면 높이 단위가 index.html 의 인라인 style 로 새어 나가면 규칙이 두 곳으로 갈라진다 */
const inlineVh = [...html.matchAll(/style="[^"]*\d+d?vh[^"]*"/g)].map((m) => m[0]);
ok(inlineVh.length === 0, 'index.html 인라인 style 에 화면 높이 단위가 없다', inlineVh.join(' / ') || '0건');

console.log(fail ? `\n❌ 스타일 규약 ${fail}건 실패` : '\n✅ 스타일 규약 통과');
process.exit(fail ? 1 : 0);
