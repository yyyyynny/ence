/* 입력 엔진 — 키패드가 만든 값이 학생이 본 화면과 같은가, 그리고 손이 미끄러졌을 때
   되돌아올 수 있는가.

   화면을 재는 검사(run.mjs)로는 여기가 안 보인다. 값은 문자열이고 화면은 위첨자·아래첨자로
   그려져서, 값이 망가져도 「그럴듯하게」 보이기 때문이다. 실제로 이런 것들이 있었다:
   · H⁺에서 숫자를 누르면 H^+2 가 되고, 그다음부터 전하 키가 몸통을 못 떼어내
     ^가 하나 더 붙었다(H^+2^+). 화면에는 H⁺²⁺ — 전하 키를 아무리 눌러도 그대로라
     학생이 빠져나올 길이 없었다.
   · Na의 가운데에 커서가 서서 ⌫를 누르면 「a」만 남았다. 키패드 어느 키로도 못 만드는
     글자라, 자기가 무엇을 눌러 그렇게 됐는지 되짚을 수가 없다.

   실행:  node test/input.mjs                                                            */
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

/* 모드를 열고 한 칸만 남긴 문제를 만든다 — 값 하나만 보면 되게 */
const setup = (mode) => page.evaluate((m) => {
  App.setSection(sectionOf(m)); App.setMode(m);
  const q = App.state.currentQuestion;
  q.inputs = {}; q.cursor = {};
  q.activeKey = q.blanks[0].key;
  return q.activeKey;
}, mode);
/* 키를 순서대로 눌러 보고 값을 돌려준다 */
const type = (keys) => page.evaluate((ks) => {
  for (const k of ks) App.handleKeyPress(k);
  const q = App.state.currentQuestion;
  return { val: q.inputs[q.activeKey] || '', cur: q.cursor[q.activeKey] };
}, keys);
const seed = (val, cur) => page.evaluate(([v, c]) => {
  const q = App.state.currentQuestion;
  q.inputs[q.activeKey] = v; q.cursor[q.activeKey] = c;
}, [val, cur]);

console.log('── 전하는 늘 맨 끝에 하나만 (모드 11) ──');
await setup(11);
ok((await type(['ELEM_H', 'CHG_+'])).val === 'H^+', '수소에 + 를 붙인다');
/* 여기서 숫자를 누르면 전하 뒤가 아니라 몸통 끝에 들어가야 한다 */
let r = await type(['NUM_2']);
ok(r.val === 'H2^+', '전하가 붙은 뒤 누른 숫자는 몸통으로 간다', r.val);
r = await type(['CHG_2+']);
ok(r.val === 'H2^2+', '전하 키는 교체한다 (덧붙이지 않는다)', r.val);
/* 이미 망가진 값에서도 전하 키 한 번으로 돌아와야 한다 */
await seed('H^+2^+', 6);
r = await type(['CHG_+']);
ok(r.val === 'H^+', '^ 가 둘인 값도 전하 키 한 번으로 복구된다', r.val);
/* 커서를 전하 바로 앞에 두고 숫자를 눌러도 ^ 뒤로 새면 안 된다 */
await seed('SO4^2-', 4);
r = await type(['NUM_3']);
ok(r.val === 'SO43^2-', '커서가 전하 경계에 있어도 몸통에 들어간다', r.val);
await seed('Ca^2+', 5);
r = await type(['ELEM_O', 'NUM_2', 'CHG_3-']);
ok((r.val.match(/\^/g) || []).length === 1, '무엇을 눌러도 ^ 는 하나뿐', r.val);

console.log('\n── 두 글자 기호는 한 덩어리 (모드 5) ──');
await setup(5);
r = await type(['ELEM_Na', 'LEFT', 'ELEM_H']);
ok(r.val === 'HNa', '← 는 Na 를 통째로 건너뛴다 (NHa 가 되지 않는다)', r.val);
await seed('NaCl', 4);
ok((await type(['LEFT'])).cur === 2, '← 한 번에 Cl 앞으로');
ok((await type(['LEFT'])).cur === 0, '← 한 번 더 누르면 Na 앞으로');
ok((await type(['RIGHT'])).cur === 2, '→ 한 번에 Na 를 건너뛴다');
await seed('H2O', 3);
ok((await type(['LEFT'])).cur === 2, '숫자와 대문자는 덩어리가 아니다 (H2O)');
await seed('Na', 2);
ok((await type(['DEL'])).val === '', '⌫ 는 Na 를 통째로 지운다');

console.log('\n── 「계수 1은 적지 않아요」 안내 (모드 2) ──');
await setup(2);
const judge = (answer, input) => page.evaluate(([a, v]) => {
  const q = App.state.currentQuestion;
  q.blanks = [{ key: q.activeKey, answer: a }];
  q.inputs = { [q.activeKey]: v }; q.cursor = {};
  App.state.isAnswerChecked = false;
  App.checkAnswer();
  return !!App.state.currentQuestion.coefOneErrorFlag;
}, [answer, input]);
ok((await judge('CO2', '1CO2')) === true, '계수 1을 실제로 쓴 답에는 안내가 뜬다');
ok((await judge('3CO2', '13CO2')) === false, '계수를 13으로 잘못 센 답에는 뜨지 않는다');

console.log('\n── 시간이 지난 뒤 틀렸을 때 (모드 2) ──');
/* 제한시간이 지나면 한 번 더 풀어 볼 수 있다. 그때 틀리면 일반 경로와 똑같이
   어느 칸이 틀렸는지 빨갛게 보여 줘야 한다 — 칸이 넷인 반응식에서 표시가 없으면
   학생은 무엇을 고쳐야 하는지 알 수 없다. */
await setup(2);
const timedOut = await page.evaluate(async () => {
  App.state.timerDuration = 300;
  App.generateQuestion();
  await new Promise((r) => setTimeout(r, 700));
  const q = App.state.currentQuestion;
  q.activeKey = q.blanks[0].key;
  /* 일부러 틀린 답을 모든 칸에 채운다 — 빈 칸이 있으면 채점 자체가 안 된다 */
  q.blanks.forEach((bl) => { q.inputs[bl.key] = bl.answer + 'X'; });
  App.checkAnswer();
  return {
    isTimedOut: !!q.isTimedOut,
    marked: Object.keys(App.state.wrongBlanks).length,
    blanks: q.blanks.length,
    redOnScreen: document.querySelectorAll('.blank-box.wrong').length,
    lastWrong: App.state.isLastWrongAttempt
  };
});
ok(timedOut.isTimedOut, '시간이 지난 상태가 맞다');
ok(timedOut.marked === timedOut.blanks, '틀린 칸이 전부 표시된다', timedOut);
ok(timedOut.redOnScreen > 0, '화면에도 빨간 칸이 그려진다', timedOut.redOnScreen);
/* 다음 키를 누르면 빨간 표시가 걷혀야 한다 — 그 신호가 isLastWrongAttempt다 */
ok(timedOut.lastWrong === true, '다음 입력에 표시가 걷히도록 표시해 둔다');

console.log('\n── 제한시간은 다음에 열 때도 그대로 ──');
await page.evaluate(() => { document.querySelector('#timerBtns .timer-btn[data-sec="15"]').click(); });
await page.waitForTimeout(150);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof App === 'object', null, { timeout: 10000 });
await page.waitForTimeout(400);
const kept = await page.evaluate(() => ({
  ms: App.state.timerDuration,
  active: [...document.querySelectorAll('#timerBtns .timer-btn.active')].map((x) => x.dataset.sec)
}));
ok(kept.ms === 15000, '고른 제한시간이 새로 열어도 남아 있다', kept.ms);
ok(kept.active.length === 1 && kept.active[0] === '15', '눌린 버튼도 저장값과 같다', kept.active);
/* 쓰레기 값이 들어 있어도 기본값으로 버틴다 */
const junk = await page.evaluate(async () => {
  localStorage.setItem('chem_timer', 'ㅋㅋ');
  return 0;
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof App === 'object', null, { timeout: 10000 });
await page.waitForTimeout(300);
ok(await page.evaluate(() => App.state.timerDuration === DEFAULT_TIMER), '저장값이 망가져 있으면 기본값으로 돌아간다');

ok(boom.length === 0, '콘솔 예외 없음', boom);
await b.close();
console.log(fail ? `\n❌ 입력 엔진 ${fail}건 실패` : '\n✅ 입력 엔진 통과');
process.exit(fail ? 1 : 0);
