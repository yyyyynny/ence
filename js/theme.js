/* ── 테마 등록 ──
   앱에서 "어떤 테마가 있나"를 아는 곳은 여기 한 곳뿐이다. 테마를 더하려면
   여기에 한 줄 추가하고 css/style.css에 같은 id의 :root.theme-<id> 블록만 쓰면 된다.
   (클래스는 <html>에 붙는다 — 이유는 css/style.css의 테마 주석 참고)

   light: 배경이 밝은 계열인가. 주기율표 분류 색이 밝은 배경용과 어두운 배경용으로
   나뉘어 있어(PT_CAT_COLORS / PT_CAT_COLORS_LIGHT) 그걸 고르는 데 쓴다.
   테마가 둘뿐일 때는 "다크냐 아니냐"로 갈렸지만, 테마가 늘면 그 판단이 테마마다 필요하다.

   테마마다 이모지를 하나씩(🌙 ☀️ 📜 🌑 🔳) 달아 두었었다. 목록은 이미 그 테마의
   실제 색을 네 칸 견본으로 보여 준다 — 이모지보다 그쪽이 훨씬 정확하고, 헤더 버튼은
   테마와 상관없이 같은 아이콘 하나면 된다("테마를 고른다"는 뜻은 하나뿐이므로).

   ⚠️ 어떤 테마를 넣든 지켜야 하는 것:
   · --c-correct(맞음)와 --c-wrong(틀림)은 초록·빨강 계열을 유지한다. 채점 결과라서
     테마 취향으로 바꾸면 안 된다.
   · 글자와 배경의 대비를 충분히 준다. 공부하다 눈이 아프면 테마를 왜 만들었는지 모르게 된다.
   · 색만으로 뜻을 전하지 않는다는 원칙은 그대로다 — 테마는 보기 편하라고 있는 것이지
     의미를 나르라고 있는 게 아니다. */
const THEMES = [
  { id:'note',     label:'실험노트', hint:'종이 위의 잉크',   light:true  },
  { id:'edit',     label:'편집',    hint:'어두운 곳에서',    light:false },
  { id:'contrast', label:'고대비',  hint:'잘 안 보일 때',    light:false }
];
const THEME_DEFAULT = 'edit';

/* ── 옛 이름 옮기기 ──
   테마가 다섯이던 시절의 id가 학생 기기의 localStorage에 남아 있다. 그냥 지우면
   「내가 고른 테마」가 말없이 기본값으로 돌아간다 — 고른 사람은 이유를 알 수 없다.
   그래서 뜻이 가장 가까운 새 테마로 옮긴다.
     다크·야간  → edit   (어두운 바탕)
     라이트·종이 → note   (밝은 바탕. 실험노트가 곧 제대로 만든 종이 테마다)
     고대비     → 그대로  (id를 안 바꿨다. 가장 필요한 사람에게 이관 비용이 0이다)
   여기 두는 이유: 「어떤 테마가 있나」를 아는 곳이 이 파일 하나라는 원칙 그대로다. */
const THEME_ALIASES = { dark:'edit', night:'edit', light:'note', paper:'note' };
function resolveThemeId(id){ return THEME_ALIASES[id] || id; }
function themeMeta(id){
  const r = resolveThemeId(id);
  return THEMES.find(t => t.id === r) || THEMES.find(t => t.id === THEME_DEFAULT);
}
