/* ── 교육과정 구역·모드 등록 ──
   앱에서 "이 내용을 언제 배우나"를 아는 곳은 여기 한 곳뿐이다.
   교육과정이 개정되면 이 파일만 고치면 되도록 앱 로직과 분리해 둔다.

   구역이 곧 답이다 — 학생이 알고 싶은 건 "이거 내 시험에 나와?" 하나이고,
   모드가 어느 구역에 있는지만 보면 답이 나오므로 별도의 난이도·범위 태그를 두지 않는다.
   색으로 의미를 전달하지 않는다(구역 색과 범위 색이 겹치면 무슨 뜻인지 알 수 없게 된다). */

const SECTIONS=[
  {id:'ms',  label:'중학',    sub:'중학교 과학',
   note:'이온식(SO₄²⁻ 등)과 앙금 생성 반응은 2022 개정에서 중학교 과정에서 빠졌어요. 학교에서 배웠다면 옛 교육과정 내용입니다.'},
  {id:'is1', label:'통합과학', sub:'고1',
   note:'결합 차수(단일·이중·삼중)는 고2 「화학」에서 배워요.'},
  {id:'chem',label:'고2 화학', sub:'고2 선택',
   note:'원자 구조와 오비탈은 2022 개정 「화학」에서 빠졌어요.'},
  {id:'plus',label:'심화',    sub:'시험 범위 아님',
   note:'지금 교육과정에는 없는 내용이에요. 시험에는 안 나오지만 알아두면 이해가 깊어집니다.'}
];

/* 모드 등록은 여기 한 곳뿐 — 모드 탭·오답노트 배지·오답노트 필터가 전부 여기서 파생된다.
   std는 어떤 성취기준에 근거한 모드인지 적어 두는 정비용 메모다. 개정 때 무엇을 다시
   확인해야 하는지 알기 위한 것이며 화면에는 절대 렌더하지 않는다
   (성취기준 코드는 교사·출제자 언어라 학생에게는 의미가 없다).

   parent가 있는 항목은 탭에 뜨지 않는 하위 유형이다. 반응물·생성물·전체식을 탭 하나로 합치면서도
   모드 번호 2·3·4를 그대로 살려 둬야 이미 저장된 오답노트(chem_wrong_notes_v4)가 안 깨진다.

   noCoefWarning: 정답이 애초에 숫자인 모드. "계수 1은 생략" 경고가 오작동하므로(7족 답에 17을
   입력하면 '1'+'7'로 보인다) 그 경고를 끈다. */
const MODES={
  1:{section:'ms', icon:'🔢', name:'계수 맞추기',   desc:'계수 1도 입력 필수', std:'9과16-02', noCoefWarning:true},
  2:{section:'ms', icon:'🧪', name:'반응식 맞추기',  desc:'16개 전체', std:'9과16-02', subLabel:'반응물',
     subModes:[{id:2,label:'반응물'},{id:3,label:'생성물'},{id:4,label:'전체식'}]},
  3:{parent:2, subLabel:'생성물'},
  4:{parent:2, subLabel:'전체식'},
  5:{section:'ms', icon:'🧠', name:'화학식 암기',   desc:'30종 전체', std:'9과11-01'},
  6:{section:'ms', icon:'🃏', name:'플래시카드',    custom:'flashcard'},
  7:{section:'is1',icon:'🧭', name:'주기·족 맞추기', desc:'1~20번 + 할로젠·알칼리', std:'10통과1-02-03', noCoefWarning:true}
};

/* 하위 유형(parent)이면 부모 모드의 이름·아이콘·구역을 따른다 */
function modeRoot(m){ const e=MODES[m]; return e && e.parent ? MODES[e.parent] : e; }
/* modeRoot는 등록 객체를 돌려준다. 탭 활성 비교처럼 번호가 필요한 곳에는 이쪽을 쓸 것. */
function modeRootId(m){ const e=MODES[m]; return e && e.parent ? e.parent : Number(m); }
function sectionOf(m){ const r=modeRoot(m); return r ? r.section : null; }
function modesInSection(secId){
  return Object.keys(MODES).filter(m=>!MODES[m].parent && MODES[m].section===secId).map(Number);
}
function sectionMeta(secId){ return SECTIONS.find(s=>s.id===secId); }
/* 플래시카드는 구역마다 하나씩 있으므로 모드 번호로 판별하면 안 된다 */
function isCardMode(m){ const r=modeRoot(m); return !!(r && r.custom==='flashcard'); }

/* 오답노트 배지는 하위 유형까지 보여야 어떤 문제였는지 알 수 있다 — "반응식 맞추기 · 생성물" */
const MODE_NAMES=Object.fromEntries(Object.keys(MODES).map(m=>{
  const r=modeRoot(m), sub=MODES[m].subLabel;
  return [m, r ? r.name+(sub?' · '+sub:'') : '모드 '+m];
}));
const MODE_ICONS=Object.fromEntries(Object.keys(MODES).map(m=>{
  const r=modeRoot(m); return [m, r ? r.icon : '📌'];
}));
