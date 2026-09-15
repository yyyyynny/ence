/* 순환 큐 ↔ 출제 풀 어긋남 — 큐가 들고 있는 것은 항목이 아니라 풀에서의 '자리 번호'라서,
   큐를 짠 뒤에 풀이 달라지면 없는 자리를 가리켜 문제 만들기가 통째로 죽는다.

   실제로 죽였던 길: 「즐겨찾기만 풀기」로 반응식 3개를 돌던 중에 참고 자료 창을 다시 열어
   별표를 2개 지운다 → 큐에는 아직 2번이 남아 있는데 풀은 1개로 줄어 rp[2]가 undefined가 되고
   TypeError로 화면이 멈췄다. 학생이 "이건 외웠으니 뺀다"고 하면 바로 닿는 자리였다.

   같은 뿌리에서 갈라지는 네 가지를 전부 본다 — 일부 해제 / 전부 해제 / 도중 추가,
   그리고 이온식 즐겨찾기가 반응식 쪽 사정 때문에 풀리지 않는지(rxPool이 "즐겨찾기가 비면
   스스로 깃발을 내린다"는 부수효과를 갖게 되면서 새로 생긴 위험이다).

   실행:  node test/cycle-pool.mjs                                                      */
import { chromium } from 'playwright';
import { globSync } from 'node:fs';

const exe = globSync('/opt/pw-browsers/chromium-*/chrome-linux/chrome').sort().pop();
const URL = 'file:///home/user/ence/index.html';
let fail = 0;
const ok = (c, n, e = '') => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${e ? '  ' + e : ''}`); if (!c) fail++; };

const b = await chromium.launch(exe ? { executablePath: exe } : {});

async function fresh() {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const boom = [];
  p.on('pageerror', e => boom.push('PAGEERROR ' + e.message));
  /* 글꼴이 막히는 건 이 검사와 무관하다 — run.mjs 와 같은 이유로 눈감아 준다 */
  p.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g|ERR_/.test(m.text())) boom.push(m.text()); });
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(500);
  return { ctx, p, boom };
}

const openHint  = async p => { await p.click('#hintBtn'); await p.waitForTimeout(250); };
const closeHint = async p => { await p.keyboard.press('Escape'); await p.waitForTimeout(200); };
const sortTab   = async (p, id) => { await p.evaluate(s => [...document.querySelectorAll('[data-hint-sort]')].find(c => c.dataset.hintSort === s).click(), id); await p.waitForTimeout(200); };
const clickFav  = async (p, key) => { await p.evaluate(k => document.querySelector(`#reactionList .fav-btn[data-fav-key="${k}"]`).click(), key); await p.waitForTimeout(80); };

/* 별표를 담고(창이 열린 채로 끝난다) 담은 키를 돌려준다 */
async function starFirst(p, n) {
  await openHint(p);
  const keys = await p.evaluate(n => [...document.querySelectorAll('#reactionList .fav-btn[data-fav-key]')].slice(0, n).map(x => x.dataset.favKey), n);
  for (const k of keys) await clickFav(p, k);
  return keys;
}
/* 즐겨찾기 탭의 「즐겨찾기만 풀기」 버튼을 누른다 */
async function startFavQuiz(p, mode) {
  await sortTab(p, 'fav');
  await p.evaluate(m => document.querySelector(`#reactionList [data-quiz-mode="${m}"]`).click(), mode);
  await p.waitForTimeout(350);
}
/* 문제를 여러 번 넘겨 본다 — 죽으면 여기서 boom 에 잡힌다 */
async function spin(p, n) {
  const names = [];
  for (let i = 0; i < n; i++) {
    await p.evaluate(() => App.generateQuestion()).catch(e => names.push('THROW:' + e.message));
    await p.waitForTimeout(50);
    names.push(await p.evaluate(() => App.state.currentQuestion && App.state.currentQuestion.name));
  }
  return names;
}
const snap = p => p.evaluate(() => ({
  mode: App.state.currentMode, fav: App.state.favoriteOnly,
  total: App.state.cycleTotal, rx: App.rxPool().length, ion: App.ionWritePool().length
}));

console.log('반응식 (중학 · 모드 4)');
{ /* 일부만 해제 — 원래 여기서 죽었다 */
  const { ctx, p, boom } = await fresh();
  const keys = await starFirst(p, 3);
  await startFavQuiz(p, 4);
  ok((await snap(p)).mode === 4, '「즐겨찾기만 풀기」가 모드 4로 보냄');
  await openHint(p); for (const k of keys.slice(0, 2)) await clickFav(p, k); await closeHint(p);
  const names = await spin(p, 6);
  ok(boom.length === 0, '별표 2개 해제 후에도 안 죽음', boom[0] || '');
  ok(names.every(n => n === keys[2]), '  남은 즐겨찾기 1개만 출제', [...new Set(names)].join(' / '));
  const s = await snap(p);
  ok(s.total === s.rx, `  큐 총수와 풀 크기가 맞음 (${s.total}/${s.rx})`);
  ok(s.fav === true, '  즐겨찾기 모드는 유지');
  await ctx.close();
}
{ /* 전부 해제 — 낼 문제가 없어지므로 스스로 전체 풀로 돌아가야 한다 */
  const { ctx, p, boom } = await fresh();
  const keys = await starFirst(p, 3);
  await startFavQuiz(p, 4);
  await openHint(p); for (const k of keys) await clickFav(p, k); await closeHint(p);
  const names = await spin(p, 6);
  ok(boom.length === 0, '별표 전부 해제 후에도 안 죽음', boom[0] || '');
  ok(names.every(n => typeof n === 'string' && n.length > 0), '  문제가 정상으로 만들어짐');
  const s = await snap(p);
  ok(s.fav === false, '  즐겨찾기 모드가 스스로 꺼짐');
  ok(s.total === s.rx && s.rx > 10, `  전체 풀로 되돌아감 (${s.rx}개)`);
  await ctx.close();
}
{ /* 도중에 하나 더 담기 — 이번 바퀴에 바로 반영돼야 한다 */
  const { ctx, p, boom } = await fresh();
  await starFirst(p, 2);
  await startFavQuiz(p, 4);
  const before = (await snap(p)).total;
  await openHint(p);
  await sortTab(p, 'num');  /* 즐겨찾기 탭에는 담은 것만 보인다 */
  await p.evaluate(() => [...document.querySelectorAll('#reactionList .fav-btn[data-fav-key]')].find(x => !x.classList.contains('active')).click());
  await p.waitForTimeout(200); await closeHint(p);
  await spin(p, 4);
  const s = await snap(p);
  ok(boom.length === 0, '도중에 하나 더 담아도 안 죽음', boom[0] || '');
  ok(s.total === 3 && s.rx === 3, `  새로 담은 것이 이번 바퀴에 반영됨 (${before}개 → ${s.total}개)`);
  await ctx.close();
}

console.log('\n이온식 (고2 화학 · 모드 11)');
{ /* rxPool 의 부수효과가 이쪽 깃발까지 내리면 안 된다 */
  const { ctx, p, boom } = await fresh();
  await p.evaluate(() => App.setSection('chem')); await p.waitForTimeout(300);
  const keys = await p.evaluate(() => IONS_WRITE.slice(0, 3).map(i => i.name));
  await openHint(p); for (const k of keys) await clickFav(p, k);
  await startFavQuiz(p, 11);
  const s = await snap(p);
  ok(s.mode === 11, '「즐겨찾기만 풀기」가 모드 11로 보냄');
  ok(s.fav === true, '  반응식 쪽 풀이 비어도 즐겨찾기 깃발이 유지됨');
  ok(s.ion === 3 && s.total === 3, `  즐겨찾기 3개로 좁혀짐 (풀 ${s.ion} / 큐 ${s.total})`);
  const names = await spin(p, 6);
  ok(boom.length === 0, '  안 죽음', boom[0] || '');
  ok(names.every(n => keys.includes(n)), '  즐겨찾기한 이온만 출제', [...new Set(names)].join(' / '));
  await ctx.close();
}
{ /* 이온식도 일부 해제에서 같은 보호를 받아야 한다 */
  const { ctx, p, boom } = await fresh();
  await p.evaluate(() => App.setSection('chem')); await p.waitForTimeout(300);
  const keys = await p.evaluate(() => IONS_WRITE.slice(0, 3).map(i => i.name));
  await openHint(p); for (const k of keys) await clickFav(p, k);
  await startFavQuiz(p, 11);
  await openHint(p); for (const k of keys.slice(0, 2)) await clickFav(p, k); await closeHint(p);
  const names = await spin(p, 5);
  ok(boom.length === 0, '별표 2개 해제 후에도 안 죽음', boom[0] || '');
  ok(names.every(n => n === keys[2]), '  남은 이온 1개만 출제', [...new Set(names)].join(' / '));
  await ctx.close();
}

await b.close();
console.log(fail === 0 ? '\n✅ 순환 큐 통과' : `\n❌ 실패 ${fail}`);
process.exit(fail ? 1 : 0);
