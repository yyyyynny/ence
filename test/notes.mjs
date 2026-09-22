/* 오답노트 — 「같은 문제」를 무엇으로 가리는가.

   노트는 화면에 그린 결과물(html)로 중복을 가렸다. 그런데 모드 7은 출제 방향이 둘인데
   본문이 「Na · 3주기 1족」으로 글자 하나까지 같다. 그래서 정방향을 틀리고 역방향도 틀리면
   노트가 하나로 합쳐지고, 합칠 때 qData를 마지막 것으로 덮어써서 「단일 풀기」는 늘
   마지막 방향만 냈다 — 다른 방향은 오답노트에서 다시 만날 길이 없었다.
   「정방향은 되는데 역방향을 못 외운다」는 오답노트가 알려 줘야 할 바로 그 정보다.

   실행:  node test/notes.mjs                                                            */
import { chromium } from 'playwright';
import { globSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = pathToFileURL(join(HERE, '..', 'index.html')).href;
const exe = globSync('/opt/pw-browsers/chromium-*/chrome-linux/chrome').sort().pop();

let fail = 0;
const ok = (cond, name, got) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${got !== undefined ? `  → ${JSON.stringify(got)}` : ''}`); if (!cond) fail++; };

const b = await chromium.launch(exe ? { executablePath: exe } : {});
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const boom = [];
page.on('pageerror', (e) => boom.push('PAGEERROR ' + e.message));
await page.goto(PAGE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof App === 'object', null, { timeout: 10000 });
await page.waitForTimeout(400);

/* 나트륨(z=11) 문제가 나올 때까지 돌린 뒤 일부러 틀려 노트를 남긴다 */
const wrongOnSodium = (dir) => page.evaluate((d) => {
  App.setMode(7);
  App.state.m7Dir = d;
  App.initCycleQueue();
  for (let i = 0; i < 400; i++) {
    App.generateQuestion();
    const q = App.state.currentQuestion;
    if (q.z !== 11) continue;
    q.blanks.forEach((bl) => { q.inputs[bl.key] = 'Z'; });
    App.generateBeautifulWrongNote(q);
    return true;
  }
  return false;
}, dir);
const notes = () => page.evaluate(() => App.state.wrongNotes.map((n) => ({
  mode: n.mode, title: n.title, fails: n.failCount, dir: n.qData && n.qData.dir, key: n.key, html: n.html
})));

console.log('── 모드 7: 방향이 다르면 다른 문제다 ──');
await page.evaluate(() => { App.state.wrongNotes = []; });
ok(await wrongOnSodium('toPG'), '정방향(원소 → 주기·족)에서 나트륨을 틀린다');
ok(await wrongOnSodium('toElem'), '역방향(주기·족 → 원소)에서도 틀린다');
let ns = await notes();
ok(ns.length === 2, '두 방향이 각각 노트로 남는다', ns.map((n) => n.dir));
ok(ns.length === 2 && ns[0].html === ns[1].html, '  본문은 실제로 글자까지 같다 (그래서 본문으로 가리면 안 된다)');
ok(new Set(ns.map((n) => n.dir)).size === 2, '  각 노트가 자기 방향의 문제를 들고 있다 (단일 풀기가 그 방향으로 나온다)');
ok(ns.every((n) => n.fails === 1), '  합쳐져서 오답 횟수만 오르지 않는다', ns.map((n) => n.fails));

console.log('\n── 같은 문제를 또 틀리면 노트는 하나다 ──');
await wrongOnSodium('toPG');
ns = await notes();
ok(ns.length === 2, '노트가 늘지 않는다', ns.length);
ok(ns.find((n) => n.dir === 'toPG').fails === 2, '  그 방향의 오답 횟수만 오른다');

console.log('\n── 예전에 저장된 노트(신원 없음)도 버리지 않는다 ──');
/* 학생 기기에는 key가 없는 노트가 쌓여 있다. 같은 문제를 다시 틀렸을 때 새 노트를
   만들어 버리면 그 학생에게는 노트가 갑자기 둘로 보인다. */
await page.evaluate(() => {
  const n = App.state.wrongNotes.find((x) => x.qData && x.qData.dir === 'toPG');
  App.state.wrongNotes = [{ id: 'old-1', mode: 7, title: n.title, html: n.html, qData: { z: 11, dir: 'toPG', name: n.title }, failCount: 1 }];
});
await wrongOnSodium('toPG');
ns = await notes();
ok(ns.length === 1, '옛 노트에 새 노트가 겹쳐 생기지 않는다', ns.length);
ok(ns[0].fails === 2 && !!ns[0].key, '  그 자리에서 신원을 달아 준다', ns[0].key);

ok(boom.length === 0, '콘솔 예외 없음', boom);
await b.close();
console.log(fail ? `\n❌ 오답노트 ${fail}건 실패` : '\n✅ 오답노트 통과');
process.exit(fail ? 1 : 0);
