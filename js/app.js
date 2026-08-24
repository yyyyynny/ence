/* ── 앱 ── */
const App={
  state:{
    currentMode:null,score:{streak:0,correct:0,wrong:0},
    currentQuestion:null,isAnswerChecked:false,isAnswerRevealed:false,theme:THEME_DEFAULT,
    isLastWrongAttempt:false,wrongBlanks:{},wrongAlreadyPenalized:false,
    timerDuration:DEFAULT_TIMER,currentMaxTime:DEFAULT_TIMER,timerLeft:DEFAULT_TIMER,timerInterval:null,
    wrongNotes:[],noteFilter:'all',retryNoteId:null,
    isCycleMode:false,cycleQueue:[],cycleTotal:0,lastQuestionName:null,
    m6Type:'full',m6Order:'korean',m6Cards:[],m6Index:0,m6Flipped:false,lastBondOrder:null,
    m7Dir:'toPG',
    section:'ms', showDiagram:true,
    isSoundOn:true, isHapticOn:true, isWideMode:false, isSimplePeriodic:true,
    savedCycleState:null,
    isRetryPlaylistMode:false, retryPlaylist:[]
  },
  $:{
    app:document.getElementById('app'),streakCount:document.getElementById('streakCount'),streakFlames:document.getElementById('streakFlames'),
    totalCorrect:document.getElementById('totalCorrect'),totalWrong:document.getElementById('totalWrong'),modeTabs:document.querySelector('.mode-tabs'),
    qLabel:document.getElementById('qLabel'),qSubLabel:document.getElementById('qSubLabel'),equationDisplay:document.getElementById('equationDisplay'),
    resultBanner:document.getElementById('resultBanner'),numRow:document.getElementById('numRow'),
    elemRowLabel:document.getElementById('elemRowLabel'),elemRow:document.getElementById('elemRow'),
    confirmBtn:document.querySelector('.kb-key.confirm'),nextBtn:document.querySelector('.kb-key.next-q'),
    hintModalOverlay:document.getElementById('hintModalOverlay'),wrongNoteModalOverlay:document.getElementById('wrongNoteModalOverlay'),
    reactionList:document.getElementById('reactionList'),wrongNoteList:document.getElementById('wrongNoteList'),
    timerBar:document.getElementById('timerBar'),wrongNoteFilters:document.getElementById('wrongNoteFilters'),
    questionCard:document.getElementById('questionCard'),keyboardWrap:document.getElementById('keyboardWrap'),
    timerSelectWrap:document.getElementById('timerSelectWrap'),mode6Wrap:document.getElementById('mode6Wrap'),
    cycleWrap:document.getElementById('cycleWrap'),cycleProgressWrap:document.getElementById('cycleProgressWrap'),
    cycleProgressText:document.getElementById('cycleProgressText'),cycleProgressFill:document.getElementById('cycleProgressFill'),
    soundBtn:document.getElementById('soundBtn'),hapticBtn:document.getElementById('hapticBtn'),
    layoutBtn:document.getElementById('layoutBtn'),
    periodicModalOverlay:document.getElementById('periodicModalOverlay'),periodicContent:document.getElementById('periodicContent'),
    themeModalOverlay:document.getElementById('themeModalOverlay'),themeList:document.getElementById('themeList'),
    simplePeriodicToggle:document.getElementById('simplePeriodicToggle'),
    ptDetailPanel:document.getElementById('ptDetailPanel'),ptFsDetailPanel:document.getElementById('ptFsDetailPanel')
  },

  /* ── 모션 값은 CSS가 유일한 출처다 ──
     JS가 같은 숫자를 따로 갖고 있으면 언젠가 반드시 어긋난다. 실제로 CSS는 `.3s`인데
     정리 타이머는 `320`이었고, 그 60ms 틈에 전환이 살아 있는 채로 다음 동작이 시작됐다.
     여기서 읽으면 css/style.css의 토큰 한 곳만 고쳐도 JS까지 따라온다.
     값은 자주 안 바뀌고 getComputedStyle은 싸지 않으므로 한 번 읽고 기억한다.
     (테마를 바꿔도 모션 토큰은 안 바뀐다 — 색만 바뀐다.) */
  motionMs(token){
    const c = this._motion || (this._motion = {});
    if(c[token] === undefined){
      const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
      c[token] = v.endsWith('ms') ? parseFloat(v) : (parseFloat(v) || 0) * 1000;
    }
    return c[token];
  },
  init(){
    this.loadSettings();
    this.loadWrongNotes();
    this.buildKeyboard();
    this.buildModalList();
    this.attachEventListeners();
    document.body.addEventListener('click', () => this.initAudioContext(), {once:true});
    /* iOS Safari는 버튼이 아닌 요소(div로 만든 칸·카드)에 :active를 안 걸어 준다 —
       문서 어딘가에 touchstart 리스너가 하나라도 있어야 걸어 준다. 아무것도 안 하는
       리스너를 하나 두는 것이 이 동작을 켜는 표준적인 방법이다. */
    document.addEventListener('touchstart', () => {}, {passive:true});
    /* 헤더 아이콘 줄은 이제 가로로 스크롤하지 않고 아랫줄로 내려간다(css 참고) —
       넘친 것을 흐림으로 알릴 일이 없으므로 여기서 부르지 않는다.
       setupScrollFade는 구역 탭 줄이 그대로 쓴다. */
    this.setupScrollFade(document.getElementById('sectionTabs'));
    this.setupModalScrollLock();
    this.setupViewportVars();
    this.setupPtZoom();
    this.renderSectionTabs();
    this.renderSectionNote();
    this.renderNoteFilters();
    document.querySelectorAll('.dia-btn').forEach(b=>b.classList.toggle('active', (b.dataset.dia==='on')===this.state.showDiagram));
    /* 저장된 구역의 첫 모드로 시작한다 */
    const first=modesInSection(this.state.section)[0];
    if(first!==undefined) this.setMode(first); else this.setSection(this.state.section);
    this.renderUpdateBanner();
  },

  /* ── 새 판 알림 ──
     저장해 둔 판 번호와 지금 판을 견주어, 다르면 그 사이에 바뀐 내용을 배너로 알린다.
     서버도 네트워크 요청도 없다 — service worker는 file://에서 등록이 안 되고
     이 앱은 파일로 열어도 돌아가야 한다(js/version.js 머리말 참고).

     화면을 저절로 새로고침하지 않는다. 문제를 풀던 중에 화면이 갈아엎히면 답이 날아간다 —
     언제 받을지는 학생이 정한다.

     판 번호는 배너를 **닫거나 새로고침을 누를 때** 저장한다. 뜨자마자 저장하면,
     스쳐 지나가듯 본 사람은 무엇이 바뀌었는지 영영 못 보게 된다. */
  renderUpdateBanner(){
    const el=document.getElementById('updateBanner');
    if(!el || typeof APP_VERSION==='undefined') return;
    let seen=null;
    try{ seen=localStorage.getItem('chem_seen_version'); }catch(e){}
    /* 처음 온 사람에게는 알릴 변화가 없다 — 지금 판을 조용히 적어 두고 끝낸다.
       빈 문자열처럼 쓸 수 없는 값도 같이 여기서 처리한다. 그냥 두면 그 값이 계속 남아
       다음 판이 나와도 영영 알림이 안 뜬다(첫 방문과 달리 저절로 고쳐지지 않는다). */
    if(!seen){ this.markVersionSeen(); return; }
    const lines=changesSince(seen);
    if(!lines.length) return;
    document.getElementById('updateList').innerHTML=
      lines.map(t=>`<li>${t}</li>`).join('');
    el.hidden=false;
  },
  markVersionSeen(){
    try{ localStorage.setItem('chem_seen_version', APP_VERSION); }catch(e){}
  },
  dismissUpdateBanner(){
    this.markVersionSeen();
    const el=document.getElementById('updateBanner');
    if(el) el.hidden=true;
  },

  /* 실제 가시 영역(px)을 CSS 변수로 유지 — iOS Safari/삼성 인터넷의 동적 주소창 때문에
     vh/vw가 실제 화면과 어긋나는 문제를 우회한다. 회전 전체화면이 열려 있으면 즉시 재계산.
     핀치 줌 중에는 visualViewport의 resize/scroll이 프레임마다 여러 번 발생하므로,
     매번 그리드를 다시 그리면 끊겨 보인다 — requestAnimationFrame으로 프레임당 1회로 묶는다. */
  setupViewportVars(){
    let settleTimer=null, lastW=0, lastH=0, lastOrient='';
    const apply=()=>{
      const vv=window.visualViewport;
      /* 핀치 확대 중(scale>1)에는 "보이는 영역"이 좁아진 것일 뿐 화면 크기가 바뀐 게 아니다.
         삼성 인터넷 등은 user-scalable=no와 touch-action을 모두 무시하고 확대를 허용하므로,
         확대 도중 재계산하면 확대 제스처와 레이아웃 재계산이 서로 싸우며 화면이 찢어졌다.
         → 확대 상태에서는 아무것도 갱신하지 않는다. 배율이 1로 돌아오면 그때 한 번만 확인. */
      if(vv && vv.scale>1.001) return;
      const w=Math.round(vv?vv.width:window.innerWidth);
      const h=Math.round(vv?vv.height:window.innerHeight);
      const orient = w>h ? 'l' : 'p';
      const fsOpen = document.getElementById('ptFullscreen').classList.contains('show');
      /* 회전 뷰는 "열 때 화면에 맞춰 고정된 스냅샷"이다. 핀치 도중 삼성 브라우저의 주소창이
         나타났다 사라지며 화면 높이가 몇십 px 바뀌는데, 그때마다 회전 뷰를 다시 그리면
         축소 순간 "화면 재로딩" 플래시로 보인다 → 회전 뷰가 열려 있는 동안은 실제 방향 전환
         (세로↔가로)에만 재계산하고, 주소창발 미세한 높이 변화는 무시한다. */
      if(fsOpen && orient===lastOrient) return;
      if(w===lastW && h===lastH) return; /* 크기 변화 없으면 아예 손대지 않음 → 깜빡임 없음 */
      lastW=w; lastH=h; lastOrient=orient;
      document.documentElement.style.setProperty('--app-w', w+'px');
      document.documentElement.style.setProperty('--app-h', h+'px');
      if(fsOpen) this.layoutPtFullscreen();
    };
    /* 제스처(핀치/주소창 애니메이션) 도중에는 이벤트가 프레임마다 쏟아진다 — 매번 반응하지 않고
       150ms 잠잠해진 뒤 한 번만 적용해, 제스처 끝자락의 "찰나의 다시 그리기"와 끊김을 없앤다. */
    const update=()=>{ clearTimeout(settleTimer); settleTimer=setTimeout(()=>requestAnimationFrame(apply),150); };
    apply();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    if(window.visualViewport){
      window.visualViewport.addEventListener('resize', update);
      window.visualViewport.addEventListener('scroll', update);
    }
  },

  /* 어떤 팝업이든 .show면 body 스크롤 잠금 → 뒤 페이지로 스크롤 전파(바깥 노출) 차단 */
  setupModalScrollLock(){
    /* 이전에 여기서 뷰포트 메타(maximum-scale)를 동적으로 잠갔었는데, 삼성 인터넷은 확대 차단은
       무시하면서 축소 제스처는 잠금 범위와 비교하다 거부해 "축소가 안 되고 멈춤"의 원인이 됐다.
       차단 효과는 없고 부작용만 있어 제거 — 확대는 setupViewportVars의 동결 가드가 감당한다. */
    const overlays=[...document.querySelectorAll('.modal-overlay'),document.getElementById('ptFullscreen')].filter(Boolean);
    const sync=()=>{
      const anyOpen=overlays.some(o=>o.classList.contains('show'));
      document.body.classList.toggle('modal-open', anyOpen);
    };
    const obs=new MutationObserver(sync);
    overlays.forEach(o=>obs.observe(o,{attributes:true,attributeFilter:['class']}));
    sync();
  },

  setupScrollFade(el){
    if(!el) return;
    const update=()=>{
      const atEnd = el.scrollWidth - el.scrollLeft - el.clientWidth < 4;
      el.classList.toggle('fade-end', atEnd);
    };
    el.addEventListener('scroll', update, {passive:true});
    window.addEventListener('resize', update);
    update();
  },

  loadSettings(){
    try{
      this.state.isSoundOn = localStorage.getItem('chem_sound') !== 'false';
      this.state.isHapticOn = localStorage.getItem('chem_haptic') !== 'false';
      this.state.isWideMode = localStorage.getItem('chem_wide') === 'true';
      /* 기본은 「간략히 보기」다 — 중학교 필수 원소 위주로 보여야 좁은 화면에서 표가 안 잘린다.
         118종을 다 펼치는 건 골라서 켜는 쪽으로 둔다. */
      this.state.isSimplePeriodic = localStorage.getItem('chem_pt_simple') !== 'false';
      /* 저장된 구역이 개정으로 사라졌을 수 있으므로 실재하는지 확인하고 쓴다 */
      const savedSec = localStorage.getItem('chem_section');
      if(savedSec && sectionMeta(savedSec)) this.state.section = savedSec;
      this.state.showDiagram = localStorage.getItem('chem_diagram') !== 'false';
      /* 없어진 테마 id가 저장돼 있을 수 있으므로 실재하는지 확인하고 쓴다.
         저장된 게 없으면(첫 방문) 폰 설정을 따른다 — 폰을 밝게 쓰는 사람에게 다크로 시작해
         눈부시게 만들 이유가 없고, 그 사람은 테마 고르기를 찾기 전까지 그냥 참고 본다.
         한 번이라도 직접 고른 뒤에는 그 선택이 언제나 이긴다. */
      const savedTheme = localStorage.getItem('chem_theme');
      if(savedTheme && THEMES.some(t=>t.id===savedTheme)) this.state.theme = savedTheme;
      else this.state.theme = this.systemTheme();
    }catch(e){}
    this.applyTheme(this.state.theme);
    this.updateFeedbackBtns();
    if(this.state.isWideMode) document.body.classList.add('wide-mode');
    this.$.layoutBtn.textContent = this.state.isWideMode ? '📱' : '↔️';
    this.$.simplePeriodicToggle.classList.toggle('on', this.state.isSimplePeriodic);
    this.$.simplePeriodicToggle.setAttribute('aria-checked', this.state.isSimplePeriodic);

    let authed=false;
    try{ authed = localStorage.getItem('chem_auth_v4')==='pass'; }catch(e){}
    if(authed) document.getElementById('authOverlay').style.display = 'none';
  },
  /* 켜짐/꺼짐은 이모지와 흐리기로 보여 주는데, 그건 눈으로 보는 사람에게만 닿는다.
     읽어 주는 기계는 버튼 이름("소리 토글")만 읽고 지금 켜졌는지는 말해 주지 못하므로
     aria-pressed 로 상태를 따로 실어 준다 — 이름은 그대로 두고 눌림 여부만 바뀐다. */
  updateFeedbackBtns(){
    this.$.soundBtn.textContent = this.state.isSoundOn ? '🔊' : '🔇';
    this.$.soundBtn.style.opacity = this.state.isSoundOn ? '1' : '0.5';
    this.$.soundBtn.setAttribute('aria-pressed', this.state.isSoundOn);
    this.$.hapticBtn.textContent = this.state.isHapticOn ? '📳' : '📴';
    this.$.hapticBtn.style.opacity = this.state.isHapticOn ? '1' : '0.5';
    this.$.hapticBtn.setAttribute('aria-pressed', this.state.isHapticOn);
  },
  toggleWideMode() {
    this.playSound('tap');
    this.state.isWideMode = !this.state.isWideMode;
    document.body.classList.toggle('wide-mode', this.state.isWideMode);
    try{localStorage.setItem('chem_wide', this.state.isWideMode);}catch(e){}
    this.$.layoutBtn.textContent = this.state.isWideMode ? '📱' : '↔️';
    this.$.layoutBtn.setAttribute('aria-pressed', this.state.isWideMode);
  },

  initAudioContext() {
    try {
      if(!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if(window.audioCtx.state === 'suspended') window.audioCtx.resume();
    } catch(e){}
  },

  playSound(type){
    if(!this.state.isSoundOn) return;
    try {
      this.initAudioContext();
      const osc = window.audioCtx.createOscillator();
      const gain = window.audioCtx.createGain();
      osc.connect(gain); gain.connect(window.audioCtx.destination);
      const now = window.audioCtx.currentTime;
      if(type === 'tap') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
      } else if(type === 'success') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
      } else if(type === 'error') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
      }
    } catch(e) {}
  },
  playHaptic(type){
    if(!this.state.isHapticOn || !navigator.vibrate) return;
    try {
      if(type === 'tap') navigator.vibrate(18);
      else if(type === 'success') navigator.vibrate([25, 40, 25, 40, 25]);
      else if(type === 'error') navigator.vibrate([70]);
    } catch(e) {}
  },

  /* 저장값은 그대로 믿으면 안 된다. JSON.parse가 성공해도 배열이 아닐 수 있고("null", 문자열, 객체),
     그러면 목록을 그리다 f.map/f.length에서 죽는다 — 오답노트만 안 뜨는 게 아니라 렌더가 통째로
     멈춰 앱이 흰 화면이 된다(검증에서 실제로 그렇게 됐다).
     배열인지 확인하고, 항목도 다시 그릴 수 있는 최소한의 모양(id·모드·본문)을 갖춘 것만 남긴다.
     못 살릴 항목은 조용히 버린다 — 모드가 없는 노트는 어차피 다시 풀 수도 없다. */
  loadWrongNotes(){
    let list=[];
    try{
      const d=localStorage.getItem('chem_wrong_notes_v4');
      const parsed=d?JSON.parse(d):[];
      if(Array.isArray(parsed))
        list=parsed.filter(n=>n&&typeof n==='object'&&n.id&&n.mode&&typeof n.html==='string');
    }catch(e){}
    this.state.wrongNotes=list;
  },
  saveWrongNote(m,t,h,qData,bump=true){
    let existing = this.state.wrongNotes.find(n => n.mode === m && n.html === h);
    if(existing){
      if(!bump) return; /* 플래시카드 수동 저장: 이미 있으면 아무 변화 없음 */
      existing.failCount = Math.min((existing.failCount || 1) + 1, 3);
      existing.qData = qData;
      this.state.wrongNotes = this.state.wrongNotes.filter(n => n.id !== existing.id);
      this.state.wrongNotes.unshift(existing);
    }else{
      const id=Date.now().toString();
      this.state.wrongNotes.unshift({id,mode:m,title:t,html:h,qData,failCount:1});
    }
    try{localStorage.setItem('chem_wrong_notes_v4',JSON.stringify(this.state.wrongNotes));}catch(e){}
    this.renderWrongNotes();
  },

  deleteWrongNote(id){
    this.state.wrongNotes=this.state.wrongNotes.filter(n=>n.id!==id);
    try{localStorage.setItem('chem_wrong_notes_v4',JSON.stringify(this.state.wrongNotes));}catch(e){}
    this.renderWrongNotes();
    if(isCardMode(this.state.currentMode))this.m6SyncSaveBtn();
  },

  clearWrongNotes(){
    const btn=document.getElementById('clearAllNotesBtn');
    if(!btn.dataset.confirming){
      btn.dataset.confirming='1';
      btn.textContent='⚠️ 정말 삭제? 한 번 더 클릭';
      btn.style.background='var(--c-accent-3)';btn.style.color='#000';
      btn._t=setTimeout(()=>{
        delete btn.dataset.confirming;
        btn.textContent='🗑 전체 삭제';
        btn.style.background='';btn.style.color='';
      },3000);
      return;
    }
    clearTimeout(btn._t);delete btn.dataset.confirming;
    btn.textContent='🗑 전체 삭제';btn.style.background='';btn.style.color='';
    this.state.wrongNotes=[];
    try{localStorage.removeItem('chem_wrong_notes_v4');}catch(e){}
    this.renderWrongNotes();
  },

  startRetryPlaylist() {
    if (this.state.wrongNotes.length === 0) return;
    this.$.wrongNoteModalOverlay.classList.remove('show');

    if (!this.state.retryNoteId && !this.state.isRetryPlaylistMode) {
      this.state.savedCycleState = { queue: [...this.state.cycleQueue], total: this.state.cycleTotal, mode: this.state.currentMode };
    }

    let playlist = [...this.state.wrongNotes];
    for(let i = playlist.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
    }
    this.state.retryPlaylist = playlist;
    this.state.isRetryPlaylistMode = true;

    this.loadNextRetryPlaylistItem();
  },

  loadNextRetryPlaylistItem() {
    if(this.state.retryPlaylist.length === 0) {
      this.exitRetry();
      return;
    }
    const note = this.state.retryPlaylist[0];
    this.state.retryNoteId = note.id;

    this.state.currentMode = note.mode;
    this.syncNavForMode(note.mode);
    this.$.timerSelectWrap.style.display = 'none';
    this.$.cycleWrap.style.display = 'none';

    if(isCardMode(note.mode)){
      this.$.questionCard.style.display = 'none';
      this.$.keyboardWrap.style.display = 'none';
      this.$.mode6Wrap.classList.remove('m6-active');
      this.renderRetryFlashcard(note);
    }else{
      document.getElementById('retryM6Card').style.display = 'none';
      this.$.questionCard.style.display = '';
      this.$.keyboardWrap.style.display = '';
      this.$.mode6Wrap.classList.remove('m6-active');
      const q = JSON.parse(JSON.stringify(note.qData));
      q.inputs = {}; q.isTimedOut = false; q.cursor = {};
      if(q.blanks.length > 0) q.activeKey = q.blanks[0].key;
      this.state.currentQuestion = q;
      /* MODE 7은 저장된 문제의 출제 방향(q.dir)에 따라 키패드가 달라지므로 q를 복원한 뒤에 맞춘다 */
      this.syncElemRow(note.mode, q);

      this.state.isAnswerChecked = false;
      this.state.isAnswerRevealed = false;
      this.state.isLastWrongAttempt = false;
      this.state.wrongBlanks = {};
      this.state.wrongAlreadyPenalized = false;
      this.renderAll();
      this.startTimer();
    }

    document.getElementById('retryBanner').style.display = 'flex';
    document.getElementById('retryBannerText').innerHTML = `<span>⚠️ 연속 재풀이 모드 <span style="font-size:12px;opacity:0.8">(${this.state.retryPlaylist.length}문제 남음)</span></span>`;
  },

  /* 오답노트 재풀이 중 플래시카드 노트 — 채점 없이 뒤집어 확인 후 기억/다시 로 진행 */
  renderRetryFlashcard(note){
    clearInterval(this.state.timerInterval);
    document.getElementById('retryM6Card').style.display = '';
    const q = note.qData||{};
    const cards = this.m6BuildCards(q.m6Type||'full', sectionOf(note.mode));
    const card = cards[this.m6FindCard(cards, q)];
    const isKorFirst = (q.m6Order||'korean')==='korean';
    /* 헤더가 「MODE 6」로 박혀 있어 통합과학·고2·심화 카드도 전부 모드 6으로 보였다 */
    document.getElementById('retryM6Label').textContent = `${MODE_NAMES[note.mode]||'플래시카드'} 복습`;
    document.getElementById('retryM6Title').textContent = note.title;
    document.getElementById('retryM6FTag').textContent = isKorFirst?card.ftag:card.btag;
    document.getElementById('retryM6FContent').innerHTML = isKorFirst?card.fhtml:card.bhtml;
    document.getElementById('retryM6BTag').textContent = isKorFirst?card.btag:card.ftag;
    document.getElementById('retryM6BContent').innerHTML = isKorFirst?card.bhtml:card.fhtml;
    document.getElementById('retryM6Flashcard').classList.remove('flipped');
  },
  retryFlashcardKnow(){
    this.playSound('success'); this.playHaptic('success');
    this.deleteWrongNote(this.state.retryNoteId);
    this.state.retryPlaylist.shift();
    this.loadNextRetryPlaylistItem();
  },
  retryFlashcardNext(){
    this.playSound('tap'); this.playHaptic('tap');
    const skipped=this.state.retryPlaylist.shift();
    this.state.retryPlaylist.push(skipped);
    this.loadNextRetryPlaylistItem();
  },

  startRetry(id){
    const note = this.state.wrongNotes.find(n => n.id === id);
    if(!note) return;
    this.$.wrongNoteModalOverlay.classList.remove('show');

    if (!this.state.retryNoteId && !this.state.isRetryPlaylistMode) {
      this.state.savedCycleState = { queue: [...this.state.cycleQueue], total: this.state.cycleTotal, mode: this.state.currentMode };
    }

    this.state.retryNoteId = id;
    this.state.isRetryPlaylistMode = false;
    this.state.currentMode = note.mode;

    this.syncNavForMode(note.mode);
    this.$.questionCard.style.display = '';
    this.$.keyboardWrap.style.display = '';
    this.$.timerSelectWrap.style.display = 'none';
    this.$.mode6Wrap.classList.remove('m6-active');
    this.$.cycleWrap.style.display = 'none';
    /* 카드 복습 화면이 떠 있는 상태에서 단일 풀기로 들어오면 두 화면이 겹친 채로 남아
       어느 쪽 입력도 먹지 않았다. 다른 진입점들과 똑같이 여기서도 내린다. */
    document.getElementById('retryM6Card').style.display = 'none';
    const q = JSON.parse(JSON.stringify(note.qData));
    q.inputs = {}; q.isTimedOut = false; q.cursor = {};
    if(q.blanks.length > 0) q.activeKey = q.blanks[0].key;
    this.state.currentQuestion = q;
    /* MODE 7은 저장된 문제의 출제 방향(q.dir)에 따라 키패드가 달라지므로 q를 복원한 뒤에 맞춘다 */
    this.syncElemRow(note.mode, q);

    this.state.isAnswerChecked = false;
    this.state.isAnswerRevealed = false;
    this.state.isLastWrongAttempt = false;
    this.state.wrongBlanks = {};
    this.state.wrongAlreadyPenalized = false;

    document.getElementById('retryBanner').style.display = 'flex';
    document.getElementById('retryBannerText').textContent = '⚠️ 오답 노트 단일 재풀이 모드';
    this.renderAll();
    this.startTimer();
  },

  exitRetry(){
    this.state.retryNoteId = null;
    this.state.isRetryPlaylistMode = false;
    this.state.retryPlaylist = [];
    document.getElementById('retryBanner').style.display = 'none';
    document.getElementById('retryM6Card').style.display = 'none';
    this.$.timerSelectWrap.style.display = 'flex';

    const savedState = this.state.savedCycleState;
    const targetMode = savedState ? savedState.mode : this.state.currentMode;

    this.state.currentMode = null;

    if(savedState){
      this.state.cycleQueue = [...savedState.queue];
      this.state.cycleTotal = savedState.total;
      this.renderCycleProgress();
    }

    this.state.savedCycleState = null;
    this.setMode(targetMode, true);
  },

  buildKeyboard(){
    this.$.numRow.innerHTML=[1,2,3,4,5,6,7,8,9,0].map(n=>`<button class="kb-key num" data-key="NUM_${n}">${n}</button>`).join('');
    document.getElementById('chargeRow').innerHTML=
      ['+','2+','3+','-','2-','3-'].map(c=>{
        const label=c.replace('-','−');
        return `<button class="kb-key num" data-key="CHG_${c}">${label}</button>`;
      }).join('');
    this.syncElemRow(null,null);
  },
  /* 원소 기호 키패드의 표시 여부와 내용은 모드마다 다르다 — 세 군데(모드 전환·오답노트 재풀이 두 곳)에서
     같은 판단이 필요해 여기 한 곳으로 모은다.
     · MODE 1(계수)과 MODE 7 정방향(주기·족 입력)은 숫자만 쓰므로 숨긴다
     · MODE 7 역방향은 CORE_ELEMENTS(반응식용 14종) 대신 출제 범위 26종으로 갈아끼운다 */
  syncElemRow(mode,q){
    const isM7=mode===7, revM7=isM7&&q&&q.dir==='toElem';
    const isIonWrite=mode===11;
    /* 답이 숫자뿐이거나(MODE 8) 보기 버튼으로 고르는(MODE 9·10·12) 모드에서는 원소 기호 줄이 필요 없다 */
    const numOrChoice=mode===8||mode===9||mode===10||mode===12||mode===13||mode===14||mode===15;
    const show=revM7||isIonWrite||(mode!==1&&!isM7&&!numOrChoice);
    this.$.elemRowLabel.style.display=show?'block':'none';
    this.$.elemRow.style.display=show?'grid':'none';
    /* 전하 키는 이온식을 쓸 때만 필요하다 */
    const chg=isIonWrite;
    document.getElementById('chargeRow').style.display=chg?'grid':'none';
    document.getElementById('chargeRowLabel').style.display=chg?'block':'none';
    /* 이온식에는 K·Al처럼 반응식용 키패드에 없는 기호가 필요해 전용 목록으로 갈아끼운다 */
    const syms=revM7?PT_QUIZ_SYMBOLS:(isIonWrite?ION_WRITE_SYMBOLS:CORE_ELEMENTS);
    if(this._elemRowSyms!==syms){
      this.$.elemRow.innerHTML=syms.map(s=>`<button class="kb-key elem" data-key="ELEM_${s}">${s}</button>`).join('');
      this._elemRowSyms=syms;
    }
  },
  /* ── 구역·모드 탐색 ──
     탭과 오답노트 필터는 전부 curriculum.js의 SECTIONS/MODES에서 파생된다.
     모드를 추가할 때 손댈 곳이 여기 말고 없어야 한다. */
  renderSectionTabs(){
    const row=document.getElementById('sectionTabs');
    row.innerHTML=SECTIONS.map(s=>
      `<button class="section-tab${s.id===this.state.section?' active':''}" data-section="${s.id}">${s.label}<span class="section-sub">${s.sub}</span></button>`
    ).join('');
    this.scrollTabIntoView(row);
  },
  /* 구역 줄은 좁은 화면에서 가로로 넘친다. 고른 탭이 그 넘친 자리에 있으면 화면 밖에 남아,
     화면이 「지금 어느 구역인가」에 답하지 못한다 — 심화를 보던 사람이 앱을 다시 열면
     활성 탭이 오른쪽으로 잘린 채 시작했다.
     scrollIntoView는 조상까지 같이 스크롤해 페이지가 통째로 튀므로 쓰지 않고,
     그 줄의 scrollLeft만 직접 옮긴다. */
  scrollTabIntoView(row){
    const el=row && row.querySelector('.active');
    if(!el || row.scrollWidth<=row.clientWidth) return;
    const pad=12;   /* 옆 탭이 살짝 보여야 "더 있다"가 전해진다 */
    const left=el.offsetLeft-pad, right=el.offsetLeft+el.offsetWidth+pad;
    let to=row.scrollLeft;
    if(left<to) to=left;
    else if(right>to+row.clientWidth) to=right-row.clientWidth;
    if(to===row.scrollLeft) return;
    /* 첫 그림에서는 즉시 — 앱을 열자마자 줄이 저 혼자 움직이면 무엇이 일어난 건지 알 수 없다.
       그 뒤 사용자가 구역을 바꿔 생기는 이동만 부드럽게 따라간다. */
    row.scrollTo({left:to, behavior:this._tabsDrawn?'smooth':'auto'});
    this._tabsDrawn=true;
  },
  renderModeTabs(){
    const modes=modesInSection(this.state.section);
    this.$.modeTabs.innerHTML = modes.length
      ? modes.map(m=>{
          const d=MODES[m];
          return `<button class="mode-tab${m===modeRootId(this.state.currentMode)?' active':''}" data-mode="${m}">`+
                 `<span class="tab-icon">${d.icon}</span>${d.name}`+
                 (d.desc?`<span class="tab-desc">${d.desc}</span>`:'')+`</button>`;
        }).join('')
      : `<div class="section-empty">아직 준비 중인 구역이에요 🚧</div>`;
  },
  renderSectionNote(){
    const meta=sectionMeta(this.state.section);
    document.getElementById('sectionNote').textContent = meta && meta.note ? meta.note : '';
  },
  /* 하위 유형 줄(반응물·생성물·전체식)은 subModes를 가진 모드에서만 나온다.
     버튼이 고르는 값은 모드 번호 그 자체라, 눌러도 저장된 오답노트의 mode 값 체계가 유지된다. */
  renderSubModeBtns(){
    const root=modeRoot(this.state.currentMode);
    const subs=root&&root.subModes;
    this.$.cycleWrap.classList.toggle('has-sub', !!subs);
    if(!subs){document.getElementById('subModeBtns').innerHTML='';return;}
    document.getElementById('subModeBtns').innerHTML=subs.map(s=>
      `<button class="sub-btn${s.id===this.state.currentMode?' active':''}" data-sub="${s.id}">${s.label}</button>`
    ).join('');
  },
  /* 오답노트 재풀이는 setMode를 거치지 않고 모드로 바로 들어간다. 다른 구역의 노트일 수 있으므로
     구역·탭을 여기서 맞춰 주지 않으면 활성 탭이 없는 상태가 된다. */
  syncNavForMode(mode){
    const sec=sectionOf(mode);
    if(sec && sec!==this.state.section){
      this.state.section=sec;
      try{localStorage.setItem('chem_section', sec);}catch(e){}
      this.renderSectionTabs();
      this.renderSectionNote();
    }
    this.renderModeTabs();
    this.renderSubModeBtns();
  },
  renderNoteFilters(){
    this.$.wrongNoteFilters.innerHTML=
      `<button class="filter-chip${this.state.noteFilter==='all'?' active':''}" data-filter="all">전체</button>`+
      SECTIONS.map(s=>`<button class="filter-chip${this.state.noteFilter===s.id?' active':''}" data-filter="${s.id}">${s.label}</button>`).join('');
  },
  /* 구역을 바꾸면 그 구역의 첫 모드로 들어간다. 빈 구역이면 문제 카드·키보드를 접는다. */
  setSection(secId){
    if(!sectionMeta(secId)) return;
    this.state.section=secId;
    try{localStorage.setItem('chem_section', secId);}catch(e){}
    this.renderSectionTabs();
    this.renderSectionNote();
    /* 반응식 목록은 구역마다 다르므로 구역이 바뀔 때마다 다시 만든다 */
    this.buildModalList();
    const modes=modesInSection(secId);
    if(modes.length){
      this.setMode(modes[0]);
    }else{
      this.state.currentMode=null;
      clearInterval(this.state.timerInterval);
      this.renderModeTabs();
      this.$.questionCard.style.display='none';
      this.$.keyboardWrap.style.display='none';
      this.$.timerSelectWrap.style.display='none';
      this.$.cycleWrap.style.display='none';
      this.$.mode6Wrap.classList.remove('m6-active');
    }
  },
  /* 반응식 목록 — 지금 보고 있는 구역의 것만. 여기서는 state.section이 맞다. 문제가 아니라
     「내가 지금 보는 범위의 참고표」라서, 구역 탭을 누르는 순간 바뀌어야 하는 것이 맞기 때문이다.
     (문제 출제 쪽은 반대로 모드를 기준으로 삼는다 — rxPool 주석 참고.)
     전에는 init()에서 딱 한 번만 불려서, 구역을 바꿔도 목록이 바뀔 기회조차 없었다. */
  buildModalList(){
    const fmt=side=>side.map(r=>(r.coef>1?`<span class="eq-text">${r.coef}</span>`:'')+r.formula.map(p=>p.sym+(p.sub?`<sub>${p.sub}</sub>`:'')).join('')+this.phaseHTML(r.phase)).join(' <span class="eq-plus">+</span> ');
    const sec=this.state.section, meta=sectionMeta(sec)||{label:''};
    const list=reactionsInSection(sec);
    /* ↓·↑가 한자리에 모여 보이는 곳이라 여기서 뜻을 알려 준다. 문제 화면(모드 1~4)에는
       해설칸이 없어 설명을 붙일 자리가 없고, 여기 두면 어떤 반응에 왜 붙는지 같이 보인다.
       ↓·↑가 하나도 없는 구역에서는 이 설명이 가리킬 대상이 없으므로 띄우지 않는다. */
    const hasPhase=list.some(rx=>rx.reactants.concat(rx.products).some(c=>c.phase));
    const legend=hasPhase?`<p class="dia-exp" style="margin:0 2px 10px">`+
      `<b>↓</b>는 물에 안 녹고 가라앉는 <b>앙금</b>, <b>↑</b>는 용액에서 빠져나가는 <b>기체</b>를 뜻한다. `+
      `화학식의 일부가 아니라서 답을 쓸 때는 적지 않는다.</p>`:'';
    const head=`<p class="dia-exp" style="margin:0 2px 10px"><b>${meta.label}</b>에서 다루는 반응식 <b>${list.length}개</b>. `+
      `구역 탭을 바꾸면 이 목록도 그 구역 것으로 바뀐다.</p>`;
    const empty=`<p class="dia-exp" style="margin:0 2px">이 구역에서 다루는 반응식은 없어요.</p>`;
    this.$.reactionList.innerHTML=head+legend+(list.length?list.map((rx,i)=>`<div class="reaction-item"><div class="reaction-header"><div class="reaction-name"><span class="reaction-num">${i+1}</span>${rx.name}</div></div><div class="reaction-eq">${fmt(rx.reactants)} <span class="eq-arrow">→</span> ${fmt(rx.products)}</div></div>`).join(''):empty);
    this.renderWrongNotes();
  },
  renderWrongNotes(){
    let f=this.state.wrongNotes;
    /* 필터는 구역 단위다. 모드 단위로 두면 모드 수만큼 칩이 늘어나 못 쓰게 된다. */
    if(this.state.noteFilter!=='all')f=f.filter(n=>sectionOf(n.mode)===this.state.noteFilter);
    if(f.length===0){this.$.wrongNoteList.innerHTML=`<p style="color:var(--c-text-secondary);text-align:center;padding:40px 20px">이 구역의 오답 기록이 없습니다.</p>`;return;}
    this.$.wrongNoteList.innerHTML=f.map(n=>{
      const fc = n.failCount || 1;
      let style = '';
      if(fc === 2) style = 'background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.5);';
      else if(fc >= 3) style = 'background:rgba(239,68,68,0.14);border-color:var(--c-wrong);border-width:2px;';
      const isCard = modeRoot(n.mode) && modeRoot(n.mode).custom==='flashcard';
      const retryLabel = isCard ? '카드 다시보기' : '단일 풀기';
      const modeIcon = MODE_ICONS[n.mode]||'📌';
      const failBadge = fc>1?`<span class="reaction-fail">${fc>=3?'⚠️ ':''}오답 ${fc}회</span>`:'';
      return `<div class="reaction-item" style="${style}"><div class="reaction-header"><div class="reaction-name"><span class="reaction-badge">${modeIcon} ${MODE_NAMES[n.mode]||('모드 '+n.mode)}</span>${n.title}${failBadge}</div><div style="display:flex;gap:6px;"><button class="retry-note-btn" data-id="${n.id}">${retryLabel}</button><button class="delete-note-btn" data-id="${n.id}">삭제</button></div></div><div class="reaction-eq" style="border-left-color:var(--c-wrong)">${n.html}</div></div>`;
    }).join('');
  },

  attachEventListeners(){
    this.$.app.addEventListener('click',e=>{
      const mt=e.target.closest('.mode-tab'),bb=e.target.closest('.blank-box'),kb=e.target.closest('.kb-key');
      const st=e.target.closest('.section-tab');
      if(st){this.setSection(st.dataset.section);this.playSound('tap');this.playHaptic('tap');return;}
      /* 새 판 알림 — 닫아도, 새로고침을 눌러도 "봤다"로 친다. 어느 쪽이든 내용을 본 뒤다. */
      if(e.target.closest('#updateCloseBtn')){this.dismissUpdateBanner();return;}
      if(e.target.closest('#updateReloadBtn')){
        this.markVersionSeen();
        /* 캐시를 건너뛰도록 판 번호를 주소에 달아 다시 부른다 — ?v=만으로는 index.html 자신이
           캐시에 남아 옛 ?v=를 가리킨 채로 돌아올 수 있다. */
        location.replace(location.pathname+'?v='+encodeURIComponent(APP_VERSION));
        return;
      }
      const ch=e.target.closest('.choice-btn');
      if(ch){this.pickChoice(ch.dataset.choice);return;}
      /* 그림은 매번 다시 그려지므로 버튼에 직접 리스너를 달 수 없다 — 위임으로 받는다 */
      const rp=e.target.closest('.dia-replay');
      if(rp){this.replayDiagram(rp);return;}
      const th=e.target.closest('#themeBtn'),hi=e.target.closest('#hintBtn'),wn=e.target.closest('#wrongNoteBtn'),sa=e.target.closest('.show-answer-btn');
      const snd=e.target.closest('#soundBtn'),hpt=e.target.closest('#hapticBtn'),lyt=e.target.closest('#layoutBtn');
      const extR=e.target.closest('#exitRetryBtn'),pt=e.target.closest('#periodicBtn');
      if(mt)this.setMode(parseInt(mt.dataset.mode));
      if(bb)this.setActiveBlank(bb.dataset.key);
      if(kb)this.handleKeyPress(kb.dataset.key);
      if(th){this.renderThemeList();this.$.themeModalOverlay.classList.add('show');this.playSound('tap');this.playHaptic('tap');}
      if(hi)this.$.hintModalOverlay.classList.add('show');
      if(wn){this.renderWrongNotes();this.$.wrongNoteModalOverlay.classList.add('show');}
      if(sa)this.revealAnswers();
      if(lyt) this.toggleWideMode();
      if(pt){this.renderPeriodicTable();this.$.periodicModalOverlay.classList.add('show');this.playSound('tap');this.playHaptic('tap');}
      if(snd){
        this.state.isSoundOn = !this.state.isSoundOn;
        try{localStorage.setItem('chem_sound', this.state.isSoundOn);}catch(e){}
        this.updateFeedbackBtns(); this.playSound('tap');
      }
      if(hpt){
        this.state.isHapticOn = !this.state.isHapticOn;
        try{localStorage.setItem('chem_haptic', this.state.isHapticOn);}catch(e){}
        this.updateFeedbackBtns(); this.playHaptic('tap');
      }
      if(extR) this.exitRetry();
    });

    document.getElementById('easterEggBtn').addEventListener('click',e=>{
      e.preventDefault();
      const x=e.clientX||window.innerWidth/2,y=e.clientY||50;
      const emojis=['🎆','🌟','✨','💖','🎉','🌸','🐰'];
      for(let i=0;i<35;i++){
        const p=document.createElement('div');p.className='egg-particle';
        p.textContent=emojis[Math.floor(Math.random()*emojis.length)];
        p.style.left=x+'px';p.style.top=y+'px';
        const a=Math.random()*Math.PI*2,v=60+Math.random()*120;
        p.style.setProperty('--tx',Math.cos(a)*v+'px');p.style.setProperty('--ty',Math.sin(a)*v+'px');
        /* 800 은 --dur-egg 를 손으로 옮겨 적은 값이었다. 토큰에서 읽으면 어긋날 일이 없고,
           「움직임 줄이기」에서 1ms 로 떨어질 때도 조각이 화면에 남지 않는다. */
        document.body.appendChild(p);setTimeout(()=>p.remove(),this.motionMs('--dur-egg'));
      }
      const fl=document.createElement('div');
      Object.assign(fl.style,{position:'fixed',inset:0,zIndex:9999998,background:'linear-gradient(135deg,rgba(255,182,193,.9),rgba(200,162,200,.9))',display:'flex',alignItems:'center',justifyContent:'center',opacity:0,transition:`opacity var(--dur-view) var(--ease-out)`,pointerEvents:'none'});
      fl.innerHTML='<div style="font-size:clamp(28px,9vw,80px);text-align:center;padding:0 24px;word-break:keep-all;white-space:normal">💖 깜짝이야! 💖</div>';
      document.body.appendChild(fl);
      /* 붙인 직후에 opacity 를 바꾸면 브라우저가 둘을 한 번에 처리해 전환이 안 걸린다.
         50ms 를 세는 대신 다음 프레임을 기다린다 — 기기가 느려도 맞는 방법이다. */
      requestAnimationFrame(()=>requestAnimationFrame(()=>{fl.style.opacity=1;}));

      setTimeout(()=>{
        fl.style.opacity=0;
        setTimeout(()=>{
          fl.remove();
          try { localStorage.removeItem('chem_auth_v4'); } catch(e) {}
          document.getElementById('authInput').value = '';
          document.getElementById('authOverlay').style.display = 'flex';
        },this.motionMs('--dur-view')+20);
      },1200);
    });

    this.$.wrongNoteFilters.addEventListener('click',e=>{
      const c=e.target.closest('.filter-chip');if(!c)return;
      this.$.wrongNoteFilters.querySelectorAll('.filter-chip').forEach(x=>x.classList.remove('active'));
      c.classList.add('active');this.state.noteFilter=c.dataset.filter;this.renderWrongNotes();
    });
    document.getElementById('hintModalClose').addEventListener('click',()=>this.$.hintModalOverlay.classList.remove('show'));
    document.getElementById('wrongNoteModalClose').addEventListener('click',()=>this.$.wrongNoteModalOverlay.classList.remove('show'));
    document.getElementById('periodicModalClose').addEventListener('click',()=>this.$.periodicModalOverlay.classList.remove('show'));
    document.getElementById('themeModalClose').addEventListener('click',()=>this.$.themeModalOverlay.classList.remove('show'));
    this.$.themeList.addEventListener('click',e=>{
      const opt=e.target.closest('.theme-opt');if(!opt)return;
      /* 여기서 고른 것만 저장한다 — 이제부터는 폰 설정이 바뀌어도 이 선택이 이긴다 */
      this.applyTheme(opt.dataset.theme, true);
      /* 목록은 열어 둔 채로 표시만 갱신한다 — 바로 옆 테마와 비교해 보고 고를 수 있게 */
      this.renderThemeList();
      this.playSound('tap'); this.playHaptic('tap');
    });
    /* 어두운 배경 탭 시 모달 닫기 (인증 모달 제외) */
    [this.$.hintModalOverlay,this.$.wrongNoteModalOverlay,this.$.periodicModalOverlay,this.$.themeModalOverlay].forEach(ov=>{
      ov.addEventListener('click',e=>{if(e.target===ov)ov.classList.remove('show');});
    });
    document.getElementById('ptRotateBtn').addEventListener('click',()=>{
      this.openPtFullscreen();
      this.playSound('tap'); this.playHaptic('tap');
    });
    document.getElementById('ptFsClose').addEventListener('click',()=>{
      this.closePtFullscreen();
      this.playSound('tap'); this.playHaptic('tap');
    });
    /* 원소 칸 클릭 → 상세 설명 패널. 모달용/전체화면용 각각 델리게이션(콘텐츠가 매번 innerHTML로 새로 그려지므로) */
    this.$.periodicContent.addEventListener('click',e=>{
      const cell=e.target.closest('.pt-cell[data-z]'); if(!cell) return;
      this.ptToggleDetail(this.$.ptDetailPanel, parseInt(cell.dataset.z));
      this.playSound('tap'); this.playHaptic('tap');
    });
    document.getElementById('ptFsContent').addEventListener('click',e=>{
      const cell=e.target.closest('.pt-cell[data-z]'); if(!cell) return;
      this.ptToggleDetail(this.$.ptFsDetailPanel, parseInt(cell.dataset.z));
      this.playSound('tap'); this.playHaptic('tap');
    });
    [this.$.ptDetailPanel,this.$.ptFsDetailPanel].forEach(panel=>{
      panel.addEventListener('click',e=>{
        if(!e.target.closest('.pt-detail-close')) return;
        this.closePtDetail(panel);
        this.playSound('tap'); this.playHaptic('tap');
      });
    });
    this.$.simplePeriodicToggle.addEventListener('click',()=>{
      this.state.isSimplePeriodic=!this.state.isSimplePeriodic;
      try{localStorage.setItem('chem_pt_simple', this.state.isSimplePeriodic);}catch(e){}
      this.$.simplePeriodicToggle.classList.toggle('on', this.state.isSimplePeriodic);
      this.$.simplePeriodicToggle.setAttribute('aria-checked', this.state.isSimplePeriodic);
      this.playSound('tap'); this.playHaptic('tap');
      this.renderPeriodicTable();
    });
    document.getElementById('clearAllNotesBtn').addEventListener('click',()=>this.clearWrongNotes());
    document.getElementById('retryPlaylistBtn').addEventListener('click',()=>this.startRetryPlaylist());

    document.getElementById('authBtn').addEventListener('click',()=>{
      if(document.getElementById('authInput').value==='yyyyynny'){
        this.playSound('success');
        try { localStorage.setItem('chem_auth_v4', 'pass'); } catch(e) {}
        document.getElementById('authOverlay').style.display='none';
      }else{
        this.playSound('error'); this.playHaptic('error');
        const err = document.getElementById('authError');
        err.style.display='block';
        setTimeout(()=>err.style.display='none',2000);
      }
    });

    document.getElementById('timerBtns').addEventListener('click',e=>{
      const b=e.target.closest('.timer-btn');if(!b)return;
      this.state.timerDuration=parseInt(b.dataset.sec)*1000;
      document.querySelectorAll('.timer-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');
      this.playSound('tap'); this.playHaptic('tap');
    });
    this.$.wrongNoteList.addEventListener('click',e=>{
      if(e.target.classList.contains('delete-note-btn'))this.deleteWrongNote(e.target.dataset.id);
      if(e.target.classList.contains('retry-note-btn')){
        const id=e.target.dataset.id;
        const note=this.state.wrongNotes.find(n=>n.id===id);
        if(note && isCardMode(note.mode)) this.viewFlashcardNote(note);
        else this.startRetry(id);
      }
    });
    document.getElementById('m6SaveWrongBtn').addEventListener('click',()=>this.m6SaveCurrentAsWrong());

    document.getElementById('cycleWrap').addEventListener('click',e=>{
      const diaBtn=e.target.closest('.dia-btn');
      if(diaBtn){
        this.state.showDiagram = diaBtn.dataset.dia==='on';
        try{localStorage.setItem('chem_diagram', this.state.showDiagram);}catch(e){}
        document.querySelectorAll('.dia-btn').forEach(x=>x.classList.toggle('active', x===diaBtn));
        this.renderExplain();
        this.playSound('tap'); this.playHaptic('tap');
        return;
      }
      /* 하위 유형 버튼이 고르는 값은 모드 번호 그 자체다 — setMode가 그대로 처리한다 */
      const subBtn=e.target.closest('.sub-btn');
      if(subBtn){
        this.setMode(parseInt(subBtn.dataset.sub));
        this.playSound('tap'); this.playHaptic('tap');
        return;
      }
      const dirBtn=e.target.closest('.dir-btn');
      if(dirBtn){
        document.querySelectorAll('.dir-btn').forEach(b=>b.classList.remove('active'));
        dirBtn.classList.add('active');
        this.state.m7Dir=dirBtn.dataset.dir;
        /* 방향이 바뀌면 남은 순환 큐도 새 방향으로 다시 돌아야 하므로 큐부터 초기화 */
        this.initCycleQueue();
        this.generateQuestion();
        this.playSound('tap'); this.playHaptic('tap');
        return;
      }
      const btn=e.target.closest('.cycle-btn');if(!btn)return;
      document.querySelectorAll('.cycle-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      this.state.isCycleMode=btn.dataset.cycle==='cycle';
      this.$.cycleProgressWrap.style.display=this.state.isCycleMode?'flex':'none';
      this.initCycleQueue();
      this.generateQuestion();
      this.playSound('tap'); this.playHaptic('tap');
    });

    document.addEventListener('keydown',e=>{
      if(document.getElementById('authOverlay').style.display !== 'none') {
        if(e.key === 'Enter') document.getElementById('authBtn').click();
        return;
      }
      if(document.getElementById('ptFullscreen').classList.contains('show')){
        if(e.key==='Escape')this.closePtFullscreen();
        return;
      }
      if(e.key==='Escape'){
        if(this.$.periodicModalOverlay.classList.contains('show')){this.$.periodicModalOverlay.classList.remove('show');return;}
        if(this.$.hintModalOverlay.classList.contains('show')){this.$.hintModalOverlay.classList.remove('show');return;}
        if(this.$.wrongNoteModalOverlay.classList.contains('show')){this.$.wrongNoteModalOverlay.classList.remove('show');return;}
        if(this.$.themeModalOverlay.classList.contains('show')){this.$.themeModalOverlay.classList.remove('show');return;}
      }
      /* 팝업이 떠 있는 동안은 아래 문제 풀이 단축키가 먹으면 안 된다 */
      if(this.$.hintModalOverlay.classList.contains('show')||this.$.wrongNoteModalOverlay.classList.contains('show')||this.$.themeModalOverlay.classList.contains('show'))return;
      if(document.getElementById('retryM6Card').style.display!=='none'){
        /* 오답노트 재풀이 중 플래시카드 복습 카드 — 숨겨진 실제 mode6 세션이 아니라 이 카드를 조작 */
        if(e.key===' '){e.preventDefault();document.getElementById('retryM6Flashcard').classList.toggle('flipped');}
        return;
      }
      if(isCardMode(this.state.currentMode)&&this.$.mode6Wrap.classList.contains('m6-active')){
        if(e.key==='ArrowRight')this.m6Next();
        else if(e.key==='ArrowLeft')this.m6Prev();
        else if(e.key===' '){e.preventDefault();this.m6Flip();}
        return;
      }
      /* 버튼에 포커스를 두고 Enter·Space를 누르면 그 버튼이 눌려야 한다. 여기서 가로채면
         보기 버튼으로 이동해 놓고 Enter를 눌러도 고르지 못하고 채점부터 되어, 키보드만으로는
         보기를 바꿀 수 없었다. 브라우저 기본 동작에 맡긴다. */
      const onBtn=document.activeElement&&document.activeElement.closest('button');
      if(onBtn&&(e.key==='Enter'||e.key===' ')) return;
      if(e.key>='0'&&e.key<='9')this.handleKeyPress(`NUM_${e.key}`);
      else if(e.key==='Backspace')this.handleKeyPress('DEL');
      else if(e.key==='ArrowLeft')this.handleKeyPress('LEFT');
      else if(e.key==='ArrowRight')this.handleKeyPress('RIGHT');
      else if(e.key==='Enter')this.handleKeyPress(this.state.isAnswerChecked&&!this.state.currentQuestion?.isTimedOut?'NEXT':'CONFIRM');
    });

    const m6o=document.getElementById('m6Outer');
    let tx=0,th2=false;
    m6o.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;th2=false;},{passive:true});
    /* 카드 안에 「다시 보기」 버튼이 들어가면서 탭 = 뒤집기와 겹쳤다.
       버튼을 눌렀을 때는 뒤집지 않는다 — 애니메이션만 다시 보고 싶은 것이다. */
    const onReplay=e=>!!(e.target&&e.target.closest&&e.target.closest('.dia-replay'));
    m6o.addEventListener('touchend',e=>{
      th2=true;const dx=e.changedTouches[0].clientX-tx;
      if(Math.abs(dx)>50){if(dx<0)this.m6Next();else this.m6Prev();}
      else if(!onReplay(e)) this.m6Flip();
    });
    m6o.addEventListener('click',e=>{if(!th2&&!onReplay(e))this.m6Flip();th2=false;});

    document.getElementById('m6WrongNoteBtn').addEventListener('click',()=>{
      this.playSound('tap'); this.playHaptic('tap');
      this.renderWrongNotes();this.$.wrongNoteModalOverlay.classList.add('show');
    });
    document.getElementById('retryM6Flashcard').addEventListener('click',e=>{
      /* 카드 안의 「다시 보기」를 누른 것이면 뒤집지 않는다 — 위임 처리 쪽에 맡긴다 */
      if(e.target.closest('.dia-replay')) return;
      this.playSound('tap'); this.playHaptic('tap');
      const card=document.getElementById('retryM6Flashcard');
      card.classList.toggle('flipped');
      this.restartAnim(document.getElementById(card.classList.contains('flipped')?'retryM6BContent':'retryM6FContent'));
    });
    document.getElementById('retryM6KnowBtn').addEventListener('click',()=>this.retryFlashcardKnow());
    document.getElementById('retryM6ForgotBtn').addEventListener('click',()=>this.retryFlashcardNext());
    document.getElementById('m6NextBtn').addEventListener('click',()=>this.m6Next());
    document.getElementById('m6PrevBtn').addEventListener('click',()=>this.m6Prev());
    document.getElementById('m6ShuffleBtn').addEventListener('click',()=>this.m6Shuffle());
    document.getElementById('m6TypeBtns').addEventListener('click',e=>{
      const b=e.target.closest('.m6-opt-btn');if(!b)return;
      document.querySelectorAll('#m6TypeBtns .m6-opt-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');
      this.state.m6Type=b.dataset.val;this.m6GenCards();this.m6Render();
    });
    document.getElementById('m6OrderBtns').addEventListener('click',e=>{
      const b=e.target.closest('.m6-opt-btn');if(!b)return;
      document.querySelectorAll('#m6OrderBtns .m6-opt-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');
      this.state.m6Order=b.dataset.val;this.m6Render();
    });
  },

  /* ── 이온 되기 (MODE 9) ──
     이온을 만드는 원소 + 이온이 되지 않는 18족을 한 풀에 담는다. 18족이 "이온이 되지 않는다"는
     것 자체가 [9과11-04]의 학습 내용이라 오답 보기가 아니라 정답으로 나와야 한다. */
  /* 보기를 고르면 그 문자열이 그대로 답이 된다. 다시 고를 수 있게 두고 확인은 따로 누르게 한다 —
     잘못 눌렀는데 바로 채점되면 억울하다. */
  pickChoice(val){
    const q=this.state.currentQuestion;
    if(!q||!q.choices) return;
    if(this.state.isAnswerChecked&&!q.isTimedOut) return;
    if(this.state.isLastWrongAttempt){this.state.isLastWrongAttempt=false;this.state.wrongBlanks={};}
    q.inputs[q.blanks[0].key]=val;
    this.playSound('tap'); this.playHaptic('tap');
    this.renderAll();
  },
  /* 결합 차수 문제는 공유 결합만 대상이고, 분자 안의 결합이 전부 같은 차수여야 답이 하나로 정해진다.
     (지금 데이터는 전부 균일하지만 나중에 섞인 분자를 넣더라도 자동으로 걸러지게 해 둔다.) */
  orderPool(){
    if(!this._orderPool){
      this._orderPool=BONDS.filter(b=>b.type==='covalent'&&
        b.ligands.every(l=>l.pairs===b.ligands[0].pairs)&&BOND_ORDER_NAME[b.ligands[0].pairs]);
    }
    return this._orderPool;
  },
  ionPool(){
    if(!this._ionPool){
      this._ionPool=ION_FORMING.concat(ION_NOBLE.map(z=>({z,noble:true})));
    }
    return this._ionPool;
  },
  ionAnswerText(item){
    if(item.noble) return '이온이 되지 않는다';
    return `전자 ${item.n}개를 ${item.dir==='lose'?'잃는다':'얻는다'}`;
  },
  /* 오답 보기는 무작위가 아니라 학생이 실제로 하는 착각에서 만든다.
     ① 방향 착각: 잃어야 하는데 얻는다고 생각
     ② 옥텟 착각: 바깥 껍질에 2개뿐인 Mg가 6개를 "얻어서" 8을 채운다고 생각 (가장 흔한 오답)
     ③ 18족도 이온이 된다고 생각
     보기는 매번 섞어서 위치로 답을 외우지 못하게 한다.

     숫자는 원자가 전자가 아니라 outerShellOf(실제로 껍질에 든 개수)로 만든다.
     원자가 전자로 만들면 18족 보기가 「전자 0개를 잃는다」가 되어 보기 자체가 성립하지 않는다. */
  ionChoices(item,answer){
    const outer=outerShellOf(item.z);
    const full=fullShellOf(item.z);
    const set=new Set([answer]);
    if(item.noble){
      set.add(`전자 ${outer}개를 잃는다`);
      set.add(`전자 ${outer}개를 얻는다`);
      set.add('전자 1개를 얻는다');
    }else{
      const opp=item.dir==='lose'?'얻는다':'잃는다';
      set.add(`전자 ${item.n}개를 ${opp}`);
      const other=full-item.n;
      if(other>0&&other!==item.n) set.add(`전자 ${other}개를 ${opp}`);
      set.add('이온이 되지 않는다');
      /* 수소는 full이 2라 옥텟 착각 보기가 정답과 겹쳐 사라진다. 대신 "꽉 찬 껍질이 2개니까
         2개를 얻어야 한다"는, 껍질 정원과 주고받는 개수를 헷갈리는 착각을 보기로 쓴다. */
      if(set.size<4) set.add(`전자 ${full}개를 ${item.dir==='lose'?'잃는다':'얻는다'}`);
    }
    const arr=[...set].slice(0,4).map(v=>{
      const note=this.ionChoiceNote(item,v);
      return note?{v,note}:v;
    });
    for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
    return arr;
  },
  /* 오답 보기가 "완전히 틀린 말"이 아닐 때는 왜 여기서는 답이 아닌지 한 줄 붙인다.
     수소의 H⁺는 실제로 존재하고 산·염기에서 배우는 내용이라, 없는 것처럼 하면 그것도 거짓말이 된다. */
  ionChoiceNote(item,v){
    if(item.z===1&&v==='전자 1개를 잃는다') return '고2에서 다시 만나요';
    return '';
  },
  /* 보기 항목은 문자열이거나 {v, note, swatch} 객체다. 채점·비교는 언제나 v 문자열로 한다. */
  choiceValue(c){ return typeof c==='string'?c:c.v; },
  /* 앙금 색 동그라미. 색 이름이 표에 없으면 아무것도 안 그린다(「앙금이 생기지 않는다」). */
  swatch(colorName){
    const c=PRECIP_COLORS[colorName];
    return c?`<span class="ppt-sw" style="--sw:${c}"></span>`:'';
  },
  /* 「흰색 앙금」처럼 색 이름으로 시작하는 문구 앞에 그 색 동그라미를 붙인다 */
  withSwatch(text){
    const name=Object.keys(PRECIP_COLORS).find(k=>String(text).startsWith(k));
    return (name?this.swatch(name):'')+text;
  },
  /* 지금 풀고 있는 모드가 속한 구역의 반응식. 기준은 state.section이 아니라 모드다 —
     오답노트 재풀이에서는 모드가 먼저 바뀌고 구역 탭이 나중에 따라오므로, state.section을 보면
     한 문제 동안 엉뚱한 구역의 반응식이 섞인다. */
  rxPool(mode){ return reactionsInSection(sectionOf(mode===undefined?this.state.currentMode:mode)); },
  initCycleQueue(){
    const mode=this.state.currentMode;
    const rx=this.rxPool(mode);
    let pool=[];
    if(mode===5) pool=CHEMICALS.map((_,i)=>i);
    else if(mode===7) pool=PT_QUIZ_ELEMENTS.map((_,i)=>i);
    else if(mode===8) pool=SHELL_QUIZ_ELEMENTS.map((_,i)=>i);
    else if(mode===9) pool=this.ionPool().map((_,i)=>i);
    else if(mode===10) pool=BONDS.map((_,i)=>i);
    else if(mode===11) pool=IONS_WRITE.map((_,i)=>i);
    else if(mode===12) pool=this.orderPool().map((_,i)=>i);
    else if(mode===13) pool=PRECIPITATES.map((_,i)=>i);
    else if(mode===14) pool=ORBITAL_KINDS.map((_,i)=>i);
    else if(mode===15) pool=ORBITAL_SHELLS.map((_,i)=>i);
    /* 모드 1의 순환 큐는 「계수 템플릿 + 반응식」을 한 줄로 이어 붙인 것이다.
       길이를 숫자로 박아 두면 반응식을 하나만 더해도 마지막 문제가 영영 안 나온다.
       generateQuestion의 인덱스 산술(idx < COEF_TEMPLATES.length ? 템플릿 : 반응식)과 짝이라
       한쪽만 고치면 큐 뒤쪽이 없는 반응식을 가리킨다 — 둘은 언제나 같은 배열을 봐야 한다. */
    else if(mode===1) pool=Array.from({length: COEF_TEMPLATES.length+rx.length}, (_,i)=>i);
    else pool=rx.map((_,i)=>i);
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    this.state.cycleQueue=[...pool];
    this.state.cycleTotal=pool.length;
    this.renderCycleProgress();
  },

  renderCycleProgress(){
    if(!this.state.isCycleMode)return;
    const done=this.state.cycleTotal-this.state.cycleQueue.length;
    const total=this.state.cycleTotal;
    if(this.$.cycleProgressText) this.$.cycleProgressText.textContent=`${done} / ${total}`;
    if(this.$.cycleProgressFill) this.$.cycleProgressFill.style.transform=`scaleX(${total>0?done/total:0})`;
  },

  startTimer(){
    clearInterval(this.state.timerInterval);
    this.state.currentMaxTime=this.state.timerDuration;this.state.timerLeft=this.state.currentMaxTime;
    this.$.timerBar.style.transition='none';this.$.timerBar.style.transform='scaleX(1)';this.$.timerBar.classList.remove('danger');

    if(this.state.timerDuration === 0) return;

    void this.$.timerBar.offsetWidth;this.$.timerBar.style.transition='';
    let lt=Date.now();
    this.state.timerInterval=setInterval(()=>{
      /* 모달이 열려 있는 동안은 시간을 세지 않는다. 주기율표나 반응식 목록을 띄워 두면
         뒤에서 제한시간이 만료돼 풀지도 않은 문제가 오답으로 기록됐다.
         (인증 화면도 같은 이유로 여기서 걸린다.) */
      if(document.getElementById('authOverlay').style.display !== 'none' ||
         document.querySelector('.modal-overlay.show')) {
        lt = Date.now();
        return;
      }
      if(this.state.isAnswerChecked){clearInterval(this.state.timerInterval);return;}
      const now=Date.now();this.state.timerLeft-=(now-lt);lt=now;
      if(this.state.timerLeft<=0){this.state.timerLeft=0;clearInterval(this.state.timerInterval);this.$.timerBar.style.transform='scaleX(0)';this.timeOutForceWrong();}
      else{const p=(this.state.timerLeft/this.state.currentMaxTime)*100;this.$.timerBar.style.transform=`scaleX(${p/100})`;if(p<30)this.$.timerBar.classList.add('danger');}
    },50);
  },

  timeOutForceWrong(){
    this.playSound('error'); this.playHaptic('error');
    this.state.isAnswerRevealed=false;this.state.score.streak=0;this.state.score.wrong++;
    const q=this.state.currentQuestion;q.isTimedOut=true;

    if(!this.state.retryNoteId) {
      this.generateBeautifulWrongNote(q);
    } else {
      const note = this.state.wrongNotes.find(n => n.id === this.state.retryNoteId);
      if(note) {
        note.failCount = Math.min((note.failCount || 1) + 1, 3);
        try{localStorage.setItem('chem_wrong_notes_v4', JSON.stringify(this.state.wrongNotes));}catch(e){}
        this.renderWrongNotes();
      }
    }

    this.renderAll(null);
    this.$.resultBanner.className='result-banner wrong-banner show';
    this.$.resultBanner.innerHTML=`<div style="display:flex;align-items:center;width:100%;justify-content:space-between;flex-wrap:wrap;gap:8px"><span><span style="color:var(--c-wrong)">⏰ 시간 초과!</span> <span style="font-weight:400;margin-left:10px">마저 답을 입력해보세요.</span></span><button class="show-answer-btn">정답 확인</button></div>`;
  },

  handleKeyPress(key){
    if(key.startsWith('NUM_')||key.startsWith('ELEM_')||key.startsWith('CHG_')||key==='DEL'||key==='LEFT'||key==='RIGHT'){
      if(this.state.isAnswerChecked&&!this.state.currentQuestion?.isTimedOut)return;
      /* 보기에서 고르는 문제는 답이 통째로 들어오므로 글자 단위 편집이 있으면 안 된다.
         화면의 편집키는 숨기지만 물리 키보드는 그대로 살아 있어서, 「이온결합」을 고른 뒤
         ⌫를 누르면 「이온결」이 되고 숫자를 누르면 「이온결합5」가 되어 오답 처리됐다.
         입력 경로 자체를 여기서 막는다 — 숨기는 것만으로는 부족하다. */
      if(this.state.currentQuestion?.choices) return;
      const q=this.state.currentQuestion;if(!q||!q.activeKey)return;

      const wasWrong=this.state.isLastWrongAttempt;
      if(wasWrong){
        this.state.isLastWrongAttempt=false;
        this.state.wrongBlanks={};
      }

      this.playSound('tap'); this.playHaptic('tap');
      q.cursor = q.cursor || {};
      let val = q.inputs[q.activeKey] || '';
      let pos = q.cursor[q.activeKey] !== undefined ? q.cursor[q.activeKey] : val.length;

      if(key === 'LEFT') {
        if(pos > 0) q.cursor[q.activeKey] = pos - 1;
        else {
          /* 칸의 맨 왼쪽에서 한 번 더 누르면 바로 이전 블랭크의 맨 끝으로 이동 */
          const idx = q.blanks.findIndex(b=>b.key===q.activeKey);
          if(idx > 0) {
            const prevKey = q.blanks[idx-1].key;
            q.activeKey = prevKey;
            q.cursor[prevKey] = (q.inputs[prevKey]||'').length;
          }
        }
      } else if(key === 'RIGHT') {
        if(pos < val.length) q.cursor[q.activeKey] = pos + 1;
        else {
          /* 칸의 맨 오른쪽에서 한 번 더 누르면 바로 다음 블랭크의 맨 앞으로 이동 */
          const idx = q.blanks.findIndex(b=>b.key===q.activeKey);
          if(idx >= 0 && idx < q.blanks.length-1) {
            const nextKey = q.blanks[idx+1].key;
            q.activeKey = nextKey;
            q.cursor[nextKey] = 0;
          }
        }
      } else if(key.startsWith('NUM_')) {
        let char = key.replace('NUM_','');
        q.inputs[q.activeKey] = val.slice(0, pos) + char + val.slice(pos);
        q.cursor[q.activeKey] = pos + char.length;
      } else if(key.startsWith('CHG_')) {
        /* 전하는 늘 맨 끝에 하나만 붙는다. 커서 위치와 무관하게 끝에 놓고, 이미 있으면 교체한다. */
        const body = val.replace(/\^\d*[+-]$/, '');
        q.inputs[q.activeKey] = body + '^' + key.replace('CHG_','');
        q.cursor[q.activeKey] = q.inputs[q.activeKey].length;
      } else if(key.startsWith('ELEM_')) {
        let char = key.replace('ELEM_','');
        q.inputs[q.activeKey] = val.slice(0, pos) + char + val.slice(pos);
        q.cursor[q.activeKey] = pos + char.length;
      } else if(key === 'DEL') {
        if(pos > 0) {
          let dl = 1;
          let beforeCursor = val.slice(0, pos);
          if(/[a-z]$/.test(beforeCursor) && beforeCursor.length >= 2 && /[A-Z]/.test(beforeCursor.slice(-2,-1))) dl = 2;
          /* 전하는 '^2-'처럼 한 덩어리로 들어갔으니 지울 때도 한 덩어리로 지운다 */
          const chg = beforeCursor.match(/\^\d*[+-]$/);
          if(chg) dl = chg[0].length;
          q.inputs[q.activeKey] = val.slice(0, pos - dl) + val.slice(pos);
          q.cursor[q.activeKey] = pos - dl;
        }
      }

      if(wasWrong) this.renderAll(); else this.renderEquation();

    } else if(key==='CONFIRM'){
      if(!this.state.isAnswerChecked||this.state.currentQuestion?.isTimedOut) {
        const q=this.state.currentQuestion;
        /* ── [BUG FIX LOW] 현재 칸 공백 여부와 무관하게 빈 칸 전체 탐색 ── */
        if(q) {
          const emptyB = q.blanks.find(b => !(q.inputs[b.key]));
          if(emptyB) {
            q.activeKey = emptyB.key;
            q.cursor = q.cursor || {};
            if(q.cursor[emptyB.key] === undefined) q.cursor[emptyB.key] = (q.inputs[emptyB.key]||'').length;
            this.playSound('tap'); this.playHaptic('tap');
            this.renderEquation();
            return;
          }
        }
        this.checkAnswer();
      }
    } else if(key==='NEXT'){
      this.playSound('tap'); this.playHaptic('tap');
      if((this.state.isAnswerChecked&&!this.state.currentQuestion?.isTimedOut)||this.state.isLastWrongAttempt) {
        if(this.state.isRetryPlaylistMode) {
          if (this.state.isAnswerRevealed || this.state.isLastWrongAttempt) {
            let skipped = this.state.retryPlaylist.shift();
            this.state.retryPlaylist.push(skipped);
            this.loadNextRetryPlaylistItem();
          } else if (this.state.isAnswerChecked) {
            this.loadNextRetryPlaylistItem();
          }
        } else if(this.state.retryNoteId) {
          this.exitRetry();
        } else {
          this.generateQuestion();
        }
      }
    }
  },

  setMode(mode, preserveCycle = false){
    if(this.state.retryNoteId || this.state.isRetryPlaylistMode) {
      /* 재풀이 중에 모드 탭을 누르면 재풀이에서 나간다. 예전에는 여기서 상태만 지웠는데,
         마침 지금 모드의 탭을 누른 경우 바로 아래 "같은 모드면 반환"에 걸려 화면이
         제한시간·출제 방식 줄이 사라진 채로 굳었고, 남아 있던 재풀이 문제가 정상 문제인 양
         점수에 기록됐다. exitRetry가 화면 복구와 순환 큐 복원까지 하므로 그쪽으로 넘긴다. */
      this.exitRetry();
      if(this.state.currentMode===mode) return;  /* exitRetry가 이미 이 모드로 되돌려 놨다 */
    }
    if(this.state.currentMode===mode)return;

    this.state.currentMode=mode;
    /* 다른 구역의 모드로 바로 들어올 수 있다(오답노트 재풀이). 구역 표시를 먼저 맞춰야
       활성 탭이 사라진 것처럼 보이지 않는다. */
    const sec=sectionOf(mode);
    if(sec && sec!==this.state.section){
      this.state.section=sec;
      try{localStorage.setItem('chem_section', sec);}catch(e){}
      this.renderSectionTabs();
      this.renderSectionNote();
    }
    this.renderModeTabs();
    this.renderSubModeBtns();
    /* 플래시카드는 구역마다 하나씩 있으므로 모드 번호로 판별하면 안 된다 */
    const isCard=modeRoot(mode)&&modeRoot(mode).custom==='flashcard';
    this.$.questionCard.style.display=isCard?'none':'';
    this.$.keyboardWrap.style.display=isCard?'none':'';
    this.$.timerSelectWrap.style.display=isCard?'none':'';
    this.$.mode6Wrap.classList.toggle('m6-active', isCard);
    this.$.cycleWrap.style.display=(!isCard)?'flex':'none';
    this.$.cycleWrap.classList.toggle('m7', mode===7);
    this.$.cycleWrap.classList.toggle('has-dia', this.hasDiagram({['isMode'+mode]:true}));

    /* 플래시카드에는 순환 출제라는 게 없다. 그런데도 initCycleQueue가 돌아 (해당 분기가 없어
       반응식 풀로 떨어지면서) 순환 진행률이 초기화됐다 — 카드를 잠깐 보고 돌아오면
       풀던 진도가 사라진다. 카드 모드로 빠지는 길보다 뒤에 둔다. */
    if(isCard){clearInterval(this.state.timerInterval);this.m6GenCards();this.m6Render();return;}

    if(!preserveCycle) this.initCycleQueue();
    /* 원소 기호 키패드는 generateQuestion이 문제를 만든 뒤 syncElemRow로 맞춘다 (MODE 7은 출제 방향에 따라 달라짐) */
    this.generateQuestion();
  },

  setActiveBlank(key){
    if(this.state.isAnswerChecked&&!this.state.currentQuestion?.isTimedOut&&!this.state.isLastWrongAttempt)return;
    const q=this.state.currentQuestion;if(q){
      q.activeKey=key;
      q.cursor = q.cursor || {};
      if(q.cursor[key] === undefined) q.cursor[key] = (q.inputs[key]||'').length;
      this.playSound('tap'); this.playHaptic('tap'); this.renderEquation();
    }
  },

  generateQuestion(){
    this.state.isAnswerChecked=false;this.state.isAnswerRevealed=false;
    this.state.isLastWrongAttempt=false;this.state.wrongBlanks={};this.state.wrongAlreadyPenalized=false;
    const q={blanks:[],inputs:{},isTimedOut:false};
    const f2s=c=>{let s=c.coef>1?c.coef.toString():'';s+=c.formula.map(p=>p.sym+(p.sub?p.sub.toString():'')).join('');return s;};

    const useCycle=this.state.isCycleMode&&!isCardMode(this.state.currentMode);
    /* 같은 문제가 연달아 나오지 않게 한다. 그런데 풀 항목의 name과 화면에 뜨는 q.name의 꼴이
       다른 모드가 있어서 비교가 늘 빗나갔다 — 이온 되기 풀은 {z,n,dir}뿐이라 name이 아예 없고,
       앙금 제목은 「은 이온 + 염화 이온」이며, 오비탈 제목은 「K 껍질 (n=1)」이다.
       특히 오비탈은 문항이 4개뿐이라 회피가 안 되면 같은 문제가 바로 다시 나온다.
       그래서 항목에서 비교할 이름을 꺼내는 함수를 받는다 — 그 모드가 q.name을 짓는 방식과
       똑같이 지어야 한다(검증에서 연속 중복이 나오는지로 확인한다). */
    const pickRandom=(pool,nameOf)=>{
      const nameAt=nameOf||(it=>it&&it.name);
      let idx=Math.floor(Math.random()*pool.length);
      if(pool.length>1&&this.state.lastQuestionName){
        let tries=0;
        while(nameAt(pool[idx])===this.state.lastQuestionName&&tries<10){idx=Math.floor(Math.random()*pool.length);tries++;}
      }
      return idx;
    };
    const pickIndex=(pool,nameOf)=>{
      if(useCycle){
        if(this.state.cycleQueue.length===0) this.initCycleQueue();
        return this.state.cycleQueue.shift();
      }
      return pickRandom(pool,nameOf);
    };

    switch(this.state.currentMode){
      case 1:
        let isTemplate = false; let rxIdx = 0;
        /* 이 모드가 속한 구역의 반응식만 쓴다. 아래 인덱스 산술은 initCycleQueue가 만든 큐와
           같은 배열을 가리켜야 하므로 둘 다 이 pool을 본다. */
        const pool1 = this.rxPool();
        if(useCycle) {
          const idx = pickIndex(Array.from({length: COEF_TEMPLATES.length+pool1.length}, (_,i)=>i));
          if(idx < COEF_TEMPLATES.length) { isTemplate = true; rxIdx = idx; }
          else { isTemplate = false; rxIdx = idx - COEF_TEMPLATES.length; }
        } else {
          isTemplate = Math.random() < 0.5;
          /* 계수 템플릿 쪽에는 중복 회피가 아예 없어서 7개짜리 풀에서 같은 문제가 연달아 나왔다.
             템플릿은 이름이 label이고 반응식은 name이라 뽑는 함수에 그 차이만 알려 준다. */
          rxIdx = isTemplate ? pickRandom(COEF_TEMPLATES, t=>t.label) : pickRandom(pool1);
        }
        if(isTemplate){
          const tmpl = COEF_TEMPLATES[rxIdx];
          const data = tmpl.gen(); q.name = tmpl.label; q.isAbstract = true;
          q.displayReactants = data.fmt.map(f=>({...f})); q.displayProducts = data.fmtP.map(f=>({...f}));
        } else {
          const rx = pool1[rxIdx]; q.name = rx.name; q.isAbstract = false;
          q.displayReactants = rx.reactants.map(f=>({...f})); q.displayProducts = rx.products.map(f=>({...f}));
        }
        q.displayReactants.forEach((r,i)=>q.blanks.push({key:`R${i}`,answer:r.coef.toString()}));
        q.displayProducts.forEach((p,i)=>q.blanks.push({key:`P${i}`,answer:p.coef.toString()}));
        q.type='계수 맞추기';
        break;
      case 2:{const rp=this.rxPool();const idx=pickIndex(rp);const rx=rp[idx];q.reaction=rx;q.name=rx.name;q.type='반응물 맞추기';q.isAbstract=false;q.displayReactants=rx.reactants.map(r=>({...r,isBlank:true}));q.displayProducts=rx.products.map(p=>({...p,isBlank:false}));rx.reactants.forEach((r,i)=>q.blanks.push({key:`R${i}`,answer:f2s(r)}));break;}
      case 3:{const rp=this.rxPool();const idx=pickIndex(rp);const rx=rp[idx];q.reaction=rx;q.name=rx.name;q.type='생성물 맞추기';q.isAbstract=false;q.displayReactants=rx.reactants.map(r=>({...r,isBlank:false}));q.displayProducts=rx.products.map(p=>({...p,isBlank:true}));rx.products.forEach((p,i)=>q.blanks.push({key:`P${i}`,answer:f2s(p)}));break;}
      case 4:{const rp=this.rxPool();const idx=pickIndex(rp);const rx=rp[idx];q.reaction=rx;q.name=rx.name;q.type='전체 반응식';q.isAbstract=false;q.displayReactants=rx.reactants.map(r=>({...r,isBlank:true}));q.displayProducts=rx.products.map(p=>({...p,isBlank:true}));rx.reactants.forEach((r,i)=>q.blanks.push({key:`R${i}`,answer:f2s(r)}));rx.products.forEach((p,i)=>q.blanks.push({key:`P${i}`,answer:f2s(p)}));break;}
      case 5:{const idx=pickIndex(CHEMICALS);const c=CHEMICALS[idx];q.name=c.name;q.type='화학식 암기';q.isMode5=true;q.isAbstract=false;const fs=c.formula.map(p=>p.sym+(p.sub?p.sub.toString():'')).join('');q.blanks.push({key:'M5',answer:fs});break;}
      case 7:{
        const idx=pickIndex(PT_QUIZ_ELEMENTS);const el=PT_QUIZ_ELEMENTS[idx];
        q.type='주기·족 맞추기';q.isMode7=true;q.isAbstract=false;
        /* q.name은 어느 방향이든 한글 원소명 — 중복 출제 회피(lastQuestionName)와 오답노트 제목이 이걸 쓴다 */
        q.name=el.name;q.z=el.z;q.sym=el.sym;q.dir=this.state.m7Dir;
        if(q.dir==='toElem'){
          /* 역방향에서는 헤더에 q.name(=정답)을 그대로 띄우면 답이 새므로 문제 문구를 따로 둔다 */
          q.sub=`${el.period}주기 ${el.group}족`;
          q.blanks.push({key:'M7E',answer:el.sym});
        }else{
          q.blanks.push({key:'M7P',answer:String(el.period)});
          q.blanks.push({key:'M7G',answer:String(el.group)});
        }
        break;
      }
      case 8:{
        const idx=pickIndex(SHELL_QUIZ_ELEMENTS);const el=SHELL_QUIZ_ELEMENTS[idx];
        q.type='원자가 전자';q.isMode8=true;q.isAbstract=false;
        q.name=el.name;q.z=el.z;q.sym=el.sym;q.shells=shellsOf(el.z);
        q.blanks.push({key:'M8',answer:String(valenceOf(el.z))});
        break;
      }
      case 9:{
        const pool=this.ionPool();
        const idx=pickIndex(pool,it=>(ELEMENTS.find(x=>x.z===it.z)||{}).name);const item=pool[idx];
        const el=ELEMENTS.find(x=>x.z===item.z);
        q.type='이온 되기';q.isMode9=true;q.isAbstract=false;
        q.name=el.name;q.z=el.z;q.sym=el.sym;q.shells=shellsOf(el.z);q.ion=item;
        const ans=this.ionAnswerText(item);
        q.choices=this.ionChoices(item,ans);
        q.blanks.push({key:'M9',answer:ans});
        break;
      }
      case 13:{
        const idx=pickIndex(PRECIPITATES,p=>`${ionKo(p.a)} + ${ionKo(p.b)}`);const p=PRECIPITATES[idx];
        q.type='앙금 생성';q.isMode13=true;q.isAbstract=false;
        /* 제목은 오답노트 목록에 그대로 뜬다 — 식을 쓰면 ^가 노출되므로 한글 이름으로 짓는다 */
        q.name=`${ionKo(p.a)} + ${ionKo(p.b)}`;q.pIdx=idx;q.pKey=`${p.a}|${p.b}`;
        q.sub='두 이온을 섞으면?';
        q.choices=[{v:'흰색 앙금',swatch:'흰색'},{v:'노란색 앙금',swatch:'노란색'},
                   {v:'검은색 앙금',swatch:'검은색'},'앙금이 생기지 않는다'];
        q.blanks.push({key:'M13',answer:p.none?'앙금이 생기지 않는다':p.color+' 앙금'});
        break;
      }
      case 14:{
        const idx=pickIndex(ORBITAL_KINDS,o=>`${o.kind} 오비탈`);const o=ORBITAL_KINDS[idx];
        q.type='오비탈 개수';q.isMode14=true;q.isAbstract=false;
        q.name=`${o.kind} 오비탈`;q.orb=o;
        /* 헤더는 「s 오비탈」, 본문은 「[ ] 개」뿐이라 개수를 묻는지 전자 수를 묻는지 알 수 없었다.
           q.sub로 넣으면 헤더의 원소·껍질 이름이 사라지므로 발문은 본문 앞에 붙인다. */
        q.prompt='한 껍질에';
        q.blanks.push({key:'M14',answer:String(o.count)});
        break;
      }
      case 15:{
        const idx=pickIndex(ORBITAL_SHELLS,o=>`${o.name} 껍질 (n=${o.n})`);const o=ORBITAL_SHELLS[idx];
        q.type='껍질 최대 전자';q.isMode15=true;q.isAbstract=false;
        q.name=`${o.name} 껍질 (n=${o.n})`;q.orb=o;
        q.prompt='전자가 최대';
        q.blanks.push({key:'M15',answer:String(o.max)});
        break;
      }
      case 11:{
        const idx=pickIndex(IONS_WRITE);const it=IONS_WRITE[idx];
        q.type='이온식 쓰기';q.isMode11=true;q.isAbstract=false;
        q.name=it.name;
        q.blanks.push({key:'M11',answer:it.f});
        break;
      }
      case 12:{
        const pool=this.orderPool();
        /* 답이 세 가지뿐인데 분자 구성이 단일에 몰려 있어(6 : 2 : 1) 「단일결합」만 찍어도
           3분의 2를 맞혔다. 분자를 고르기 전에 답(결합 차수)부터 고르고 그 안에서 분자를 뽑아
           세 답이 고르게 나오게 한다. 직전과 같은 차수는 가능하면 피한다.
           순환 출제에서는 큐가 이미 모든 분자를 한 바퀴 돌리므로 그대로 둔다. */
        const idx=useCycle?pickIndex(pool):this.pickByBondOrder(pool);const bd=pool[idx];
        q.type='결합 차수';q.isMode12=true;q.isAbstract=false;
        q.name=bd.name;q.f=bd.f;q.bondName=bd.name;
        q.choices=['단일결합','이중결합','삼중결합'];
        q.blanks.push({key:'M12',answer:BOND_ORDER_NAME[bd.ligands[0].pairs]});
        break;
      }
      case 10:{
        const idx=pickIndex(BONDS);const bd=BONDS[idx];
        q.type='결합 맞추기';q.isMode10=true;q.isAbstract=false;
        q.name=bd.name;q.bondIdx=idx;q.bondName=bd.name;q.f=bd.f;
        q.choices=['이온결합','공유결합'];
        q.blanks.push({key:'M10',answer:bd.type==='ionic'?'이온결합':'공유결합'});
        break;
      }
      default:{
        /* 등록되지 않은 모드 — 저장된 설정이나 옛 오답노트에 남은 번호로 들어올 수 있다.
           그대로 두면 blanks가 빈 문제로 렌더가 돌아 화면이 통째로 멈춘다. */
        const fallback=(modesInSection(this.state.section)||[])[0]||1;
        if(fallback!==this.state.currentMode){ this.setMode(fallback); return; }
        q.type='문제를 만들 수 없습니다';q.name='다른 모드를 골라 주세요';q.isAbstract=false;
        break;
      }
    }
    this.state.lastQuestionName=q.name;
    if(q.blanks.length>0)q.activeKey=q.blanks[0].key;
    this.state.currentQuestion=q;
    this.syncElemRow(this.state.currentMode,q);
    this.renderCycleProgress();
    this.renderAll();this.startTimer();
    this.markFresh();
  },
  /* 새 문제가 들어왔다는 신호. 지금까지는 글자만 소리 없이 갈렸다 — 답을 맞히고 다음으로
     넘어갔는지, 같은 문제가 그대로인지 화면이 말해 주지 않았다.
     자리는 그대로 두고 4px만 올라오며 나타난다. 문제를 읽는 눈높이가 흔들리면 안 된다.
     **여기서만** 부른다. renderAll은 키를 누를 때마다 도는데 그때마다 다시 뜨면 글자가 떤다. */
  markFresh(){
    const els=[document.getElementById('questionHeader'), this.$.equationDisplay].filter(Boolean);
    els.forEach(el=>{ el.style.animationName='none'; });
    if(els[0]) void els[0].offsetWidth;
    els.forEach(el=>{ el.style.animationName=''; });
  },

  checkAnswer(){
    const q=this.state.currentQuestion;if(!q)return;
    let ok=true,ce=false;
    /* '1'+정답 오입력은 계수 생략 규칙을 놓친 것 — 계수를 안 쓰는 MODE 1과, 답이 애초에 숫자인 MODE 7(예: 7족에 17 입력)은 제외 */
    /* '1'+정답 오입력은 계수 생략 규칙을 놓친 것. 정답이 애초에 숫자인 모드에서는
       (예: 7족 답에 17을 입력) 오작동하므로 MODES의 noCoefWarning으로 끈다. */
    const skipCoefWarn=!!(modeRoot(this.state.currentMode)||{}).noCoefWarning;
    q.blanks.forEach(b=>{const v=q.inputs[b.key]||'';if(v!==b.answer){ok=false;if(!skipCoefWarn&&v==='1'+b.answer)ce=true;}});

    if(this.state.isRetryPlaylistMode) {
      if(ok) {
        if(q.isTimedOut) {
          this.playSound('success'); this.playHaptic('success');
          /* ── [BUG FIX HIGH] 타임아웃 후 정답 시 플레이리스트에서 제거 ── */
          this.state.retryPlaylist.shift();
          this.state.isAnswerChecked=true;
          q.isTimedOut=false;
          clearInterval(this.state.timerInterval);
          this.renderAll('retry_timeout_correct');
        } else {
          this.playSound('success'); this.playHaptic('success');
          this.deleteWrongNote(this.state.retryNoteId);
          this.state.retryPlaylist.shift();
          this.state.isAnswerChecked=true;
          clearInterval(this.state.timerInterval);
          if (this.state.retryPlaylist.length > 0) {
            this.renderAll('retry_playlist_correct_next');
          } else {
            this.renderAll('retry_playlist_correct_done');
          }
        }
      } else {
        this.playSound('error'); this.playHaptic('error');
        if(!q.isTimedOut) {
          const note = this.state.wrongNotes.find(n => n.id === this.state.retryNoteId);
          if(note) {
            note.failCount = Math.min((note.failCount || 1) + 1, 3);
            try{localStorage.setItem('chem_wrong_notes_v4', JSON.stringify(this.state.wrongNotes));}catch(e){}
            this.renderWrongNotes();
          }
        }
        /* 채점이 끝났으면 타이머는 멈춰야 한다. 안 멈추면 틀린 뒤 화면을 그대로 두었을 때
           제한시간이 다시 만료되면서 같은 문제의 오답 횟수가 한 번 더 올라갔다. */
        clearInterval(this.state.timerInterval);
        this.state.wrongBlanks={};
        q.blanks.forEach(b=>{if((q.inputs[b.key]||'')!==b.answer)this.state.wrongBlanks[b.key]=true;});
        q.coefOneErrorFlag=ce;
        this.state.isLastWrongAttempt=true;
        this.state.isAnswerChecked=false;
        this.renderAll(false);
      }
      return;
    }

    if(this.state.retryNoteId) {
      if(ok) {
        if(q.isTimedOut) {
          this.playSound('success'); this.playHaptic('success');
          this.state.isAnswerChecked=true;
          q.isTimedOut=false;
          clearInterval(this.state.timerInterval);
          this.renderAll('retry_timeout_correct');
        } else {
          this.playSound('success'); this.playHaptic('success');
          this.deleteWrongNote(this.state.retryNoteId);
          this.state.retryNoteId = null;
          document.getElementById('retryBanner').style.display='none';
          this.$.timerSelectWrap.style.display='flex';
          this.state.isAnswerChecked=true;
          clearInterval(this.state.timerInterval);
          this.renderAll('retry_correct');
        }
      } else {
        this.playSound('error'); this.playHaptic('error');
        if(!q.isTimedOut) {
          const note = this.state.wrongNotes.find(n => n.id === this.state.retryNoteId);
          if(note) {
            note.failCount = Math.min((note.failCount || 1) + 1, 3);
            try{localStorage.setItem('chem_wrong_notes_v4', JSON.stringify(this.state.wrongNotes));}catch(e){}
            this.renderWrongNotes();
          }
        }
        /* 채점이 끝났으면 타이머는 멈춰야 한다. 안 멈추면 틀린 뒤 화면을 그대로 두었을 때
           제한시간이 다시 만료되면서 같은 문제의 오답 횟수가 한 번 더 올라갔다. */
        clearInterval(this.state.timerInterval);
        this.state.wrongBlanks={};
        q.blanks.forEach(b=>{if((q.inputs[b.key]||'')!==b.answer)this.state.wrongBlanks[b.key]=true;});
        q.coefOneErrorFlag=ce;
        this.state.isLastWrongAttempt=true;
        this.state.isAnswerChecked=false;
        this.renderAll(false);
      }
      return;
    }

    if(q.isTimedOut){
      if(!ok){this.playSound('error'); this.playHaptic('error'); q.coefOneErrorFlag=ce;this.state.isAnswerChecked=false;this.renderAll(false);}
      else{this.playSound('success'); this.playHaptic('success'); this.state.isAnswerChecked=true;q.isTimedOut=false;this.state.isLastWrongAttempt=false;this.state.wrongBlanks={};clearInterval(this.state.timerInterval);this.renderAll('timeout_correct');}
    }else{
      clearInterval(this.state.timerInterval);
      if(ok){
        this.playSound('success'); this.playHaptic('success');
        if(!this.state.isLastWrongAttempt){this.state.score.streak++;this.state.score.correct++;}
        this.state.isLastWrongAttempt=false;this.state.wrongBlanks={};
        this.state.isAnswerChecked=true;
        this.renderAll(true);
      }else{
        this.playSound('error'); this.playHaptic('error');
        if(!this.state.wrongAlreadyPenalized){
          this.state.score.streak=0;this.state.score.wrong++;
          this.generateBeautifulWrongNote(q);
          this.state.wrongAlreadyPenalized=true;
        }
        this.state.wrongBlanks={};
        q.blanks.forEach(b=>{if((q.inputs[b.key]||'')!==b.answer)this.state.wrongBlanks[b.key]=true;});
        q.coefOneErrorFlag=ce;
        this.state.isLastWrongAttempt=true;
        this.state.isAnswerChecked=false;
        this.renderAll(false);
      }
    }
  },

  generateBeautifulWrongNote(q){
    const fmt=side=>side.map(c=>(c.coef>1?`<span class="eq-text">${c.coef}</span>`:'')+c.formula.map(p=>p.sym+(p.sub?`<sub>${p.sub}</sub>`:'')).join('')+this.phaseHTML(c.phase)).join(' <span class="eq-plus">+</span> ');
    let h='';
    if(q.isMode5){h=`<span class="eq-text" style="font-size:20px;font-weight:bold;color:var(--c-correct)">${this.formatInput(q.blanks[0].answer)}</span>`;}
    else if(q.isMode7){
      const el=PT_QUIZ_ELEMENTS.find(e=>e.z===q.z);
      h=`<span class="eq-text" style="font-size:20px;font-weight:bold;color:var(--c-correct)">${q.sym} · ${el?`${el.period}주기 ${el.group}족`:''}</span>`;
    }
    else if(q.isMode13){
      const p=this.precipOf(q);
      h=`<span class="eq-text" style="font-size:18px;font-weight:bold;color:var(--c-correct)">`+
        `${this.formatInput(p.a)} + ${this.formatInput(p.b)} → `+
        (p.none?'앙금 없음':`${this.fmtFormulaStr(p.f)}${this.phaseHTML('↓')} (${p.name}, ${p.color})`)+`</span>`;
    }
    else if(q.isMode14||q.isMode15){
      h=`<span class="eq-text" style="font-size:18px;font-weight:bold;color:var(--c-correct)">${q.name} · ${q.blanks[0].answer}개</span>`;
    }
    else if(q.isMode11||q.isMode12){
      h=`<span class="eq-text" style="font-size:20px;font-weight:bold;color:var(--c-correct)">`+
        (q.isMode12?`${this.fmtFormulaStr(q.f)} · `:'')+
        `${this.formatInput(q.blanks[0].answer)}</span>`;
    }
    else if(q.isMode10){
      const bd=BONDS[q.bondIdx];
      h=`<span class="eq-text" style="font-size:18px;font-weight:bold;color:var(--c-correct)">${this.fmtFormulaStr(bd.f)} · ${q.blanks[0].answer}</span>`;
    }
    else if(q.isMode8||q.isMode9){
      /* 껍질 배치를 같이 남겨야 나중에 노트만 봐도 왜 그 답인지 알 수 있다 */
      h=`<span class="eq-text" style="font-size:18px;font-weight:bold;color:var(--c-correct)">${q.sym} (${(q.shells||[]).join('-')}) · ${q.blanks[0].answer}</span>`;
    }
    else if(q.isAbstract===true){
      const r=q.displayReactants.map((c,i)=>{const bd=q.blanks.find(b=>b.key===`R${i}`); return(bd?`<span class="eq-text">${bd.answer}</span>`:'')+this.formatFormula(c.formula)+this.phaseHTML(c.phase);}).join(' <span class="eq-plus">+</span> ');
      const p=q.displayProducts.map((c,i)=>{const bd=q.blanks.find(b=>b.key===`P${i}`); return(bd?`<span class="eq-text">${bd.answer}</span>`:'')+this.formatFormula(c.formula)+this.phaseHTML(c.phase);}).join(' <span class="eq-plus">+</span> ');
      h=`${r} <span class="eq-arrow">→</span> ${p}`;
    }else{const rx=REACTIONS.find(r=>r.name===q.name);if(rx)h=`${fmt(rx.reactants)} <span class="eq-arrow">→</span> ${fmt(rx.products)}`;}
    this.saveWrongNote(this.state.currentMode,q.name,h,q);
  },

  revealAnswers(){
    this.state.isAnswerRevealed=true;this.state.isAnswerChecked=true;
    this.state.isLastWrongAttempt=false;this.state.wrongBlanks={};
    if(this.state.currentQuestion)this.state.currentQuestion.isTimedOut=false;
    clearInterval(this.state.timerInterval);this.renderAll(false);
  },

  /* ── 해설 그림 ──
     정답을 확인한 뒤에만 띄운다. 그림이 먼저 보이면 답이 새기 때문이다.
     [10통과1-02-03] 해설이 결합 이유를 "전자껍질 모형을 이용한 전자배치를 통해" 설명하라고
     명시하므로, 이 그림은 정답을 알려주는 장식이 아니라 왜 그런지를 보여주는 본문이다. */
  /* 오답노트는 오래 남는다. 배열 인덱스를 저장해 두면 BONDS 순서를 바꾼 순간
     옛 노트가 다른 물질로 바뀐다. 이름으로 찾고, 이름이 없는 옛 노트만 인덱스로 되돌린다. */
  bondOf(q){ return BONDS.find(x=>x.name===q.bondName) || BONDS[q.bondIdx]; },
  precipOf(q){ return PRECIPITATES.find(p=>`${p.a}|${p.b}`===q.pKey) || PRECIPITATES[q.pIdx]; },
  /* 결합 차수별로 나눠 담고 차수를 먼저 고른다 — 분자 수가 아니라 답이 고르게 나오도록 */
  pickByBondOrder(pool){
    const groups={};
    pool.forEach((b,i)=>{ const k=b.ligands[0].pairs; (groups[k]=groups[k]||[]).push(i); });
    const all=Object.keys(groups);
    const rest=all.filter(k=>k!==String(this.state.lastBondOrder));
    const from=rest.length?rest:all;
    const k=from[Math.floor(Math.random()*from.length)];
    this.state.lastBondOrder=k;
    const g=groups[k];
    return g[Math.floor(Math.random()*g.length)];
  },
  hasDiagram(q){ return !!(q&&(q.isMode8||q.isMode9||q.isMode10||q.isMode12||q.isMode13||q.isMode14||q.isMode15)); },
  renderExplain(){
    const box=document.getElementById('explainBox');
    if(!box) return;
    const q=this.state.currentQuestion;
    const revealed=this.state.isAnswerChecked&&!q?.isTimedOut;
    if(!revealed||!this.state.showDiagram||!this.hasDiagram(q)){box.innerHTML='';return;}
    if(q.isMode10) box.innerHTML=bondDiagramHTML(this.bondOf(q));
    else if(q.isMode13){
      const p=this.precipOf(q);
      box.innerHTML=`<div class="dia-wrap"><p class="dia-exp">`+(p.none
        ? `${this.formatInput(p.a)} + ${this.formatInput(p.b)} → <b>앙금이 생기지 않는다</b>. `+
          `1족 이온이나 질산 이온이 든 염은 물에 잘 녹기 때문이다.`
        : `${this.formatInput(p.a)} + ${this.formatInput(p.b)} → <b>${this.fmtFormulaStr(p.f)}${this.phaseHTML('↓')}</b> `+
          `(${p.name}) — ${this.swatch(p.color)}<b>${p.color}</b> 앙금이 가라앉는다.`+
          `<span class="later-note">화학식 뒤의 <b>↓</b>는 물에 안 녹고 가라앉는 앙금이라는 표시다. `+
          `기체가 되어 빠져나갈 때는 <b>↑</b>를 쓴다.</span>`)+`</p></div>`;
    }
    else if(q.isMode14){
      const o=q.orb;
      /* d는 3번째(M), f는 4번째(N) 껍질부터 생긴다. 그냥 "한 껍질에"라고 쓰면
         K·L 껍질에도 d 오비탈이 있는 것처럼 읽힌다. */
      const where=o.from>1?`${'KLMN'[o.from-1]} 껍질(n=${o.from})부터 `:'';
      box.innerHTML=`<div class="dia-wrap"><p class="dia-exp">`+
        `<b>${o.kind}</b> 오비탈은 ${where}한 껍질에 <b>${o.count}개</b>씩 있고, `+
        `오비탈 하나에 전자가 2개씩 들어가므로 모두 <b>${o.max}개</b>를 담는다.</p></div>`;
    }
    else if(q.isMode15){
      const o=q.orb;
      box.innerHTML=`<div class="dia-wrap"><p class="dia-exp">`+
        `${o.name} 껍질은 <b>${o.make}</b> 오비탈로 이루어져 최대 <b>${o.max}개</b>다. `+
        `2×${o.n}<sup>2</sup> = ${o.max} — 껍질에 2·8·18·32가 들어가는 이유가 이것이다.</p></div>`;
    }
    else if(q.isMode12) box.innerHTML=covalentDiagramHTML(this.bondOf(q),{order:true});
    else{
      /* 이온 되기에서는 이온이 되는 "과정"을 보여줘야 "왜 그 답인지"가 보인다 */
      box.innerHTML=(q.isMode8?shellDiagramHTML(q.z):ionFormingDiagramHTML(q.z,q.ion))+
        `<p class="dia-exp">${q.isMode8?this.valenceExplain(q):this.ionExplain(q)}</p>`;
    }
  },
  /* 「다시 보기」 — 같은 HTML을 다시 넣으면 요소가 새로 만들어져 CSS 애니메이션이
     처음부터 재생된다. 별도 재생 제어가 필요 없다.

     예전에는 무조건 renderExplain()을 불렀는데, 그건 퀴즈 화면의 해설 상자만 다시 그린다.
     같은 버튼이 플래시카드 안에도 들어가므로 카드에서는 눌러도 아무 일이 없었다.
     버튼이 들어 있는 상자를 찾아 그 상자만 다시 그린다. */
  replayDiagram(btn){
    this.playSound('tap'); this.playHaptic('tap');
    const host=btn&&btn.closest('#explainBox, .m6-face, #retryM6FContent, #retryM6BContent');
    if(!host||host.id==='explainBox'){ this.renderExplain(); return; }
    this.restartAnim(host);
  },
  /* 상자 안의 애니메이션을 처음부터 다시 재생한다.
     **DOM을 다시 만들지 않는다.** 예전에는 innerHTML을 자기 자신으로 다시 넣어 요소를
     새로 만들었는데, 그 대가가 컸다:
       · 카드 면(.m6-face)은 overflow-y:auto인 스크롤러다. 안을 새로 만들면 스크롤이 0으로
         돌아가, 긴 해설을 읽으려고 내려 둔 화면이 카드를 뒤집는 순간 툭 위로 올라갔다.
       · 뒤집는 바로 그 프레임에 HTML을 통째로 새로 파싱한다(그림 카드는 SVG 전체).
     애니메이션만 되감으면 되는 일이었다. cancel() 뒤 play()면 CSS 애니메이션이 처음부터
     다시 돈다 — 요소는 그대로 있으므로 스크롤도, 포커스도, 진행 중인 전환도 그대로다. */
  restartAnim(host){
    if(!host) return;
    /* animation-name을 잠깐 none으로 껐다 되돌리면 CSS 애니메이션이 처음부터 다시 돈다.
       사이에 강제 리플로우가 한 번 있어야 한다 — 없으면 브라우저가 두 변경을 한 번에 묶어
       아무 일도 일어나지 않는다.

       왜 하필 animation-name인가: 그림의 전자는 인라인 style에 animation-delay를 갖고 있다
       (전자마다 0.3초씩 밀려 들어와야 몇 개가 움직였는지 셀 수 있다). `animation` 단축 속성을
       건드리면 그 delay까지 함께 지워져 전자가 한꺼번에 출발한다. 장축(longhand) 하나만 만진다.

       왜 Animation API(cancel+play)가 아닌가: CSS가 만든 애니메이션을 cancel하면 요소에서
       떨어져 나가 play해도 돌아오지 않았다(검사가 잡았다). 이 방법은 CSS에 그대로 맡긴다. */
    const els = host.querySelectorAll('*');
    els.forEach(el => { el.style.animationName = 'none'; });
    void host.offsetHeight;
    els.forEach(el => { el.style.animationName = ''; });
  },
  /* 원자가 전자 해설 — 18족 답이 0인 이유를 여기서 설명하지 않으면
     껍질에 8개가 그려져 있는데 답은 0이라 학생 눈에는 오류로 보인다. */
  valenceExplain(q){
    const outer=outerShellOf(q.z), v=valenceOf(q.z), shell='KLMN'[q.shells.length-1];
    if(v===0)
      return `${josa(q.name,'은','는')} 바깥 껍질(${shell})에 전자가 <b>${outer}개</b> 있어 이미 꽉 찼다. `+
             `꽉 찬 껍질의 전자는 결합에 쓰이지 않으므로 <b>원자가 전자는 0개</b>다.`;
    return `${josa(q.name,'은','는')} 바깥 껍질(${shell})에 전자가 <b>${outer}개</b> 있고 `+
           `${outer===1?'이 전자가':'이 전자들이'} 결합에 참여하므로, <b>원자가 전자는 ${v}개</b>다.`;
  },
  /* 이온 되기 해설 — 주고받는 개수가 "그냥 외우는 숫자"가 아니라
     비활성 기체와 같은 배치가 되는 개수라는 점이 핵심이다. */
  ionExplain(q){
    const ion=q.ion;
    if(!ion) return '';
    if(ion.noble)
      return `${josa(q.name,'은','는')} 바깥 껍질이 이미 꽉 차 <b>원자가 전자가 0개</b>다. `+
             `주고받을 전자가 없으니 <b>이온이 되지 않는다</b>.`;
    const target=ionTargetNoble(ion);
    const like=target?`<b>${target.name}(${target.sym})과 같은 배치</b>`:'꽉 찬 배치';
    /* 예전에는 「전자를 잃으면 껍질에 남는 전자가 없다 → 그러니 얻는다」고 적었는데,
       이건 성립하지 않는 논리다. 전자를 잃은 것이 바로 H⁺이고 산에서 배우는 실제 이온이다.
       여기서 보는 쪽이 어느 쪽인지만 분명히 하고, 다른 쪽도 있다는 사실을 감추지 않는다. */
    if(q.z===1)
      return `수소는 바깥 껍질에 전자가 <b>1개</b> 있다. 전자 <b>1개를 얻어</b> K 껍질을 전자 2개로 채우면 `+
             `${like}가 되어 안정해진다 — 금속과 만날 때 이렇게 된다. `+
             `<span class="later-note">반대로 전자를 잃어 H<sup>+</sup>가 되는 길도 있다. 산을 배울 때 다시 나온다.</span>`;
    return `원자가 전자 <b>${valenceOf(q.z)}개</b>인 ${josa(q.name,'은','는')} 전자 <b>${ion.n}개</b>를 `+
           `${ion.dir==='lose'?'내주면':'받으면'} ${like}가 되어 안정해진다.`;
  },
  renderAll(isCorrect=null){
    this.renderScore();this.renderQuestionHeader();this.renderEquation();this.renderKeyboard();this.renderExplain();
    if(this.state.currentQuestion&&this.state.currentQuestion.isTimedOut&&!this.state.isAnswerChecked&&isCorrect===null){}
    else if(isCorrect!==null)this.renderResultBanner(isCorrect);
    else this.$.resultBanner.className='result-banner';
  },

  renderScore(){
    const{streak,correct,wrong}=this.state.score;
    const bump=el=>{el.classList.add('bump');setTimeout(()=>el.classList.remove('bump'),this.motionMs('--dur-tap'));};
    if(this.$.streakCount.textContent!==streak.toString()){this.$.streakCount.textContent=streak;bump(this.$.streakCount);}
    if(this.$.totalCorrect.textContent!==correct.toString()){this.$.totalCorrect.textContent=correct;bump(this.$.totalCorrect);}
    if(this.$.totalWrong.textContent!==wrong.toString()){this.$.totalWrong.textContent=wrong;bump(this.$.totalWrong);}
    this.$.streakFlames.textContent=streak>=10?'🔥🔥🔥':streak>=5?'🔥🔥':streak>=3?'🔥':'';
  },

  /* q.sub는 q.name이 곧 정답이라 헤더에 띄울 수 없는 문제(MODE 7 역방향)를 위한 대체 문구 */
  /* 하위 유형이 생기면서 모드 번호와 탭이 1:1이 아니게 됐다("MODE 9"인데 9번 탭이 없음).
     번호 대신 모드 이름을 띄운다 — MODE_NAMES가 "이온 만들기 · 이온 되기"처럼 하위 유형까지 담는다. */
  renderQuestionHeader(){const q=this.state.currentQuestion;if(!q)return;this.$.qLabel.textContent=MODE_NAMES[this.state.currentMode]||q.type;this.$.qSubLabel.textContent=q.sub||q.name;},

  renderEquation(){
    const q=this.state.currentQuestion;if(!q){this.$.equationDisplay.innerHTML='';return;}
    if(q.isMode5){this.$.equationDisplay.innerHTML=this.renderBlankBox('M5',q.blanks[0].answer);return;}
    /* MODE 7은 반응식이 아니라서 아래 반응물/생성물 렌더링 경로를 절대 타면 안 된다 (displayReactants가 없음) */
    if(q.isMode7){
      if(q.dir==='toElem'){
        this.$.equationDisplay.innerHTML=`<span class="eq-term">${this.renderBlankBox('M7E',q.blanks[0].answer)}</span>`;
      }else{
        const b=q.blanks;
        this.$.equationDisplay.innerHTML=
          `<span class="eq-term"><span class="eq-text">${q.sym}</span></span>`+
          `<span class="eq-term">${this.renderBlankBox('M7P',b[0].answer)}<span class="eq-text eq-unit">주기</span></span>`+
          `<span class="eq-term">${this.renderBlankBox('M7G',b[1].answer)}<span class="eq-text eq-unit">족</span></span>`;
      }
      return;
    }
    /* MODE 8·9도 반응식이 아니다 — 전자껍질 배치를 보여주고 그 위에서 묻는다.
       배치를 보여주는 게 핵심이다. 외운 답을 떠올리는 게 아니라 그림에서 세도록 하는 게
       [9과11-04]가 요구하는 접근이다. */
    if(q.isMode13){
      const p=this.precipOf(q);
      this.$.equationDisplay.innerHTML=
        `<span class="eq-term"><span class="eq-text">${this.formatInput(p.a)}</span></span>`+
        `<span class="eq-plus">+</span>`+
        `<span class="eq-term"><span class="eq-text">${this.formatInput(p.b)}</span></span>`+
        `<span class="eq-arrow">→</span>`+
        `<span class="eq-term">${this.renderBlankBox('M13',q.blanks[0].answer,'choice')}</span>`;
      return;
    }
    if(q.isMode14||q.isMode15){
      const key=q.isMode14?'M14':'M15';
      this.$.equationDisplay.innerHTML=
        (q.prompt?`<span class="eq-term"><span class="eq-text eq-unit">${q.prompt}</span></span>`:'')+
        `<span class="eq-term">${this.renderBlankBox(key,q.blanks[0].answer)}<span class="eq-text eq-unit">개</span></span>`;
      return;
    }
    if(q.isMode11){
      this.$.equationDisplay.innerHTML=`<span class="eq-term">${this.renderBlankBox('M11',q.blanks[0].answer)}</span>`;
      return;
    }
    if(q.isMode12){
      this.$.equationDisplay.innerHTML=
        `<span class="eq-term"><span class="eq-text">${this.fmtFormulaStr(q.f)}</span></span>`+
        `<span class="eq-term">${this.renderBlankBox('M12',q.blanks[0].answer,'choice')}</span>`;
      return;
    }
    if(q.isMode10){
      this.$.equationDisplay.innerHTML=
        `<span class="eq-term"><span class="eq-text">${this.fmtFormulaStr(q.f)}</span></span>`+
        `<span class="eq-term">${this.renderBlankBox('M10',q.blanks[0].answer,'choice')}</span>`;
      return;
    }
    if(q.isMode8||q.isMode9){
      const shells=`<span class="shell-line">${q.shells.map((n,i)=>`<span class="shell-cell"><span class="shell-n">${'KLMN'[i]}</span>${n}</span>`).join('')}</span>`;
      const head=`<span class="eq-term"><span class="eq-text">${q.sym}</span></span>${shells}`;
      if(q.isMode8){
        this.$.equationDisplay.innerHTML=head+
          `<span class="eq-term">${this.renderBlankBox('M8',q.blanks[0].answer)}<span class="eq-text eq-unit">개</span></span>`;
      }else{
        this.$.equationDisplay.innerHTML=head+
          `<span class="eq-term">${this.renderBlankBox('M9',q.blanks[0].answer,'choice')}</span>`;
      }
      return;
    }
    const fc=(list,pre)=>list.map((c,i)=>{
      const key=`${pre}${i}`,bd=q.blanks.find(b=>b.key===key);
      let term, blanked=false;
      if(this.state.currentMode===1)term=bd?this.renderBlankBox(key,bd.answer)+this.formatFormula(c.formula):this.formatFormula(c.formula);
      else if(c.isBlank||bd){term=this.renderBlankBox(key,bd?bd.answer:'');blanked=true;}
      else term=(c.coef>1?`<span class="eq-text">${c.coef}</span>`:'')+this.formatFormula(c.formula);
      /* 화학식이 빈칸이면 채점 전까지 ↓·↑를 붙이지 않는다. 「생성물 맞추기」에서 두 생성물 중
         하나에만 ↓가 붙어 있으면 그게 앙금이라고 알려 주는 꼴이라 문제가 쉬워진다. */
      if(!blanked||this.state.isAnswerChecked) term += this.phaseHTML(c.phase);
      /* equation-display가 flex라 첨자(<sub>)까지 개별 flex 아이템이 되어 가운데 정렬+간격이 생기는 걸 방지:
         한 항 전체를 inline-block으로 감싸 flex 아이템 단위를 "항"으로 고정 */
      return `<span class="eq-term">${term}</span>`;
    }).join(' <span class="eq-plus">+</span> ');
    this.$.equationDisplay.innerHTML=`${fc(q.displayReactants,'R')} <span class="eq-arrow">→</span> ${fc(q.displayProducts,'P')}`;
  },

  /* '^' 뒤는 전하라 위첨자로 올린다. '^'는 화면에 그리지 않는다 —
     전하 키가 넣어 주는 경계 표시일 뿐이고, 이게 있어야 SO4^2-를 SO₄²⁻로 확정해서 읽을 수 있다.
     빼기 기호는 하이픈이 아니라 진짜 빼기표(−)로 그린다. */
  formatInput(s, cursorPos = -1) {
    if(!s) s = '';
    const caret = s.indexOf('^');
    let html = '';
    for(let i=0; i<=s.length; i++){
      if(cursorPos === i) html += '<b style="border-left:2px solid var(--c-accent-1); animation:blink 1s step-end infinite; margin-right:-2px; vertical-align:middle; display:inline-block; height:1em"></b>';
      if(i<s.length){
        let c = s[i];
        if(c === '^') continue;
        if(caret >= 0 && i > caret){ html += `<sup>${c === '-' ? '−' : c}</sup>`; continue; }
        let isCoef = true;
        for(let j=0; j<=i; j++) if(/[a-zA-Z]/.test(s[j])) isCoef = false;
        if(/\d/.test(c) && !isCoef) html += `<sub>${c}</sub>`;
        else html += c;
      }
    }
    return html;
  },

  /* extraCls: 보기 답처럼 한글 문장이 들어가는 칸은 'choice'를 넘겨 폭이 늘어나게 한다 */
  renderBlankBox(key,answer,extraCls){
    const q=this.state.currentQuestion;
    let inp=q.inputs[key]||'';
    let cls='blank-box'+(extraCls?' '+extraCls:'');
    let isActive = q.activeKey===key && (!this.state.isAnswerChecked||q.isTimedOut);

    if(isActive) cls+=' active';

    let disp='';
    if(this.state.isAnswerChecked&&!q.isTimedOut){
      const ok=inp===answer;cls+=ok?' correct':' wrong';
      /* 보기형 답은 화학식이 아니라 한글 문구다 — 색 이름으로 시작하면 동그라미를 앞에 붙인다 */
      const fmt=v=>extraCls==='choice'?this.withSwatch(v):this.formatInput(v);
      if(this.state.isAnswerRevealed&&!ok)disp=fmt(answer);
      else disp=fmt(inp);
    }else if(this.state.isLastWrongAttempt&&(this.state.wrongBlanks||{})[key]){
      cls+=' wrong';
      disp=this.formatInput(inp, isActive ? (q.cursor && q.cursor[key] !== undefined ? q.cursor[key] : inp.length) : -1);
    }else{
      if(inp===''&&(!this.state.isAnswerChecked||q.isTimedOut))cls+=' placeholder';
      disp=this.formatInput(inp, isActive ? (q.cursor && q.cursor[key] !== undefined ? q.cursor[key] : inp.length) : -1);
    }
    return`<span class="${cls}" data-key="${key}">${disp}</span>`;
  },

  renderResultBanner(isCorrect){
    if(isCorrect==='retry_playlist_correct_next'){this.$.resultBanner.className='result-banner correct-banner show';this.$.resultBanner.innerHTML='✅ 완벽합니다! 다음 오답 문제로 이동하세요.';}
    else if(isCorrect==='retry_playlist_correct_done'){this.$.resultBanner.className='result-banner correct-banner show';this.$.resultBanner.innerHTML='🎉 축하합니다! 모든 오답을 정복했습니다.';}
    else if(isCorrect==='retry_timeout_correct'){this.$.resultBanner.className='result-banner correct-banner show';this.$.resultBanner.innerHTML='✅ 정답! (단, 시간 초과로 오답 노트에서 삭제되지 않음)';}
    else if(isCorrect==='retry_correct'){this.$.resultBanner.className='result-banner correct-banner show';this.$.resultBanner.innerHTML='✅ 완벽합니다! 오답 노트에서 완전히 삭제되었습니다.';}
    else if(isCorrect==='timeout_correct'){this.$.resultBanner.className='result-banner correct-banner show';this.$.resultBanner.innerHTML='✅ 늦었지만 정답입니다! (다음 문제로 넘어가세요)';}
    else if(isCorrect===true){this.$.resultBanner.className='result-banner correct-banner show';this.$.resultBanner.innerHTML=`✅ 정답입니다! 연속 ${this.state.score.streak}회 성공!`;}
    else{
      this.$.resultBanner.className='result-banner wrong-banner show';
      let w='';if(this.state.currentQuestion.coefOneErrorFlag)w=`<div style="color:var(--c-wrong);font-size:13px;margin-bottom:8px;width:100%">⚠️ 주의: 화학에서 계수 '1'은 생략해야 합니다.</div>`;
      if(this.state.isAnswerRevealed)this.$.resultBanner.innerHTML=`${w}<div style="display:flex;align-items:center;width:100%">❌ 오답입니다. 정답이 표시되었습니다.</div>`;
      else if(this.state.isRetryPlaylistMode) this.$.resultBanner.innerHTML=`${w}<div style="display:flex;align-items:center;width:100%;justify-content:space-between;flex-wrap:wrap;gap:8px"><span>❌ 오답입니다. (계속 풀거나 건너뛰기 가능)</span><button class="show-answer-btn">정답 확인</button></div>`;
      else this.$.resultBanner.innerHTML=`${w}<div style="display:flex;align-items:center;width:100%;justify-content:space-between;flex-wrap:wrap;gap:8px"><span>❌ 오답입니다.</span><button class="show-answer-btn">정답 확인</button></div>`;
    }
  },

  /* 보기 버튼은 q.choices가 있을 때만 나오고, 그때는 숫자·원소 줄을 숨긴다.
     고른 값을 q.inputs에 넣는 것으로 끝나므로 채점 엔진은 문자열 비교 그대로다. */
  renderChoiceRow(){
    const q=this.state.currentQuestion;
    const row=document.getElementById('choiceRow'), label=document.getElementById('choiceRowLabel');
    const on=!!(q&&q.choices);
    row.style.display=on?'grid':'none';
    label.style.display=on?'block':'none';
    document.getElementById('numRow').style.display=on?'none':'grid';
    document.getElementById('numRowLabel').style.display=on?'none':'block';
    /* 편집키도 같이 숨긴다 — 보기 답은 통째로 들어오므로 글자를 지우거나 커서를 옮길 일이 없고,
       눌리면 답이 깨진다. (물리 키보드는 handleKeyPress에서 따로 막는다.) */
    document.querySelectorAll('.kb-edit').forEach(b=>{b.style.display=on?'none':'flex';});
    if(!on){row.innerHTML='';return;}
    const key=q.blanks[0].key, picked=q.inputs[key];
    const locked=this.state.isAnswerChecked&&!q.isTimedOut;
    row.innerHTML=q.choices.map(c=>{
      const v=this.choiceValue(c), note=typeof c==='string'?'':c.note;
      const sw=(typeof c==='string'?false:c.swatch)?this.swatch(c.swatch):'';
      return `<button class="choice-btn${v===picked?' picked':''}"${locked?' disabled':''} data-choice="${v}">`+
             `<span class="choice-main">${sw}${v}</span>`+
             (note?`<span class="choice-note">${note}</span>`:'')+`</button>`;
    }).join('');
  },
  renderKeyboard(){
    const done=this.state.isAnswerChecked&&!this.state.currentQuestion?.isTimedOut;
    const wrongPending=this.state.isLastWrongAttempt;
    this.renderChoiceRow();
    this.$.confirmBtn.style.display=done?'none':'flex';
    this.$.nextBtn.style.display=(done||wrongPending)?'flex':'none';
  },

  /* ── MODE 6 ── */
  m6Fmt(side){return side.map(r=>(r.coef>1?r.coef:'')+r.formula.map(p=>p.sym+(p.sub?`<sub>${p.sub}</sub>`:'')).join('')+this.phaseHTML(r.phase)).join(' + ');},
  /* 카드 유형(t)에서 카드 배열만 순수하게 만들어낸다 — 오답노트 재풀이(renderRetryFlashcard)에서도
     실제 mode6 세션 상태(state.m6Cards/m6Index)를 건드리지 않고 재사용하기 위해 분리 */
  /* 카드 유형 정의 — 구역마다 다루는 내용이 다르므로 MODES[n].cards로 어떤 유형을 쓸지 고른다 */
  m6TypeLabel(t){ return cardType(t).label; },
  /* secId를 받는 이유: 오답노트 재풀이는 저장된 노트의 모드로 카드를 다시 만드는데,
     그때 화면의 현재 모드는 딴 구역일 수 있다. 현재 모드로 거르면 저장해 둔 카드를 못 찾는다. */
  m6BuildCards(t, secId){
    const sec = secId || sectionOf(this.state.currentMode);
    const rx = reactionsInSection(sec);
    let cards=[];
    if(t==='bond'){
      cards=BONDS.map(b=>({fhtml:`<span class="m6-korean">${b.name}</span><div class="m6-formula m6-sub-formula">${this.fmtFormulaStr(b.f)}</div>`,
        btag:b.type==='ionic'?'이온 결합':'공유 결합',bhtml:bondDiagramHTML(b)}));
    }
    else if(t==='group'){
      cards=PT_QUIZ_ELEMENTS.map(e=>({fhtml:`<span class="m6-korean">${e.name} (${e.sym})</span>`,
        bhtml:`<span class="m6-formula">${e.period}주기 ${e.group}족</span>`}));
    }
    else if(t==='ion'){
      cards=IONS_WRITE.map(i=>({fhtml:`<span class="m6-korean">${i.name}</span>`,
        bhtml:`<span class="m6-formula">${this.formatInput(i.f)}</span>`}));
    }
    else if(t==='order'){
      cards=this.orderPool().map(b=>({fhtml:`<span class="m6-korean">${b.name}</span><div class="m6-formula m6-sub-formula">${this.fmtFormulaStr(b.f)}</div>`,
        bhtml:`<span class="m6-formula">${BOND_ORDER_NAME[b.ligands[0].pairs]}</span>`}));
    }
    else if(t==='precip'){
      /* 앙금이 생기는 카드와 안 생기는 카드는 뒷면 이름이 달라야 뒤집기 전에 답이 새지 않는다.
         색은 글자로만 쓰지 않고 동그라미를 같이 붙인다 — 「흰색 앙금」과 「노란색 앙금」은
         실험에서 눈으로 가리는 것이라 색 이름만 외우면 정작 시험관을 보고는 못 고른다.
         퀴즈 모드 13이 쓰는 swatch()를 그대로 쓴다. 여기서 색을 따로 적으면 언젠가 어긋난다. */
      cards=PRECIPITATES.map(p=>({fhtml:`<span class="m6-formula">${this.formatInput(p.a)} + ${this.formatInput(p.b)}</span>`,
        btag:p.none?'앙금 없음':'앙금',
        bhtml:`<span class="m6-formula">${p.none?'물에 잘 녹아 앙금이 생기지 않는다':`${this.fmtFormulaStr(p.f)}${this.phaseHTML('↓')}<br><span style="font-size:.8em">${p.name} · ${this.swatch(p.color)}${p.color}</span>`}</span>`}));
    }
    else if(t==='orbital'){
      cards=ORBITAL_SHELLS.map(o=>({ftag:'껍질',fhtml:`<span class="m6-korean">${o.name} 껍질 (n=${o.n})</span>`,
        bhtml:`<span class="m6-formula">${o.max}개<br><span style="font-size:.6em">${o.make} · 2×${o.n}²</span></span>`}))
        .concat(ORBITAL_KINDS.map(o=>({ftag:'오비탈',fhtml:`<span class="m6-korean">${o.kind} 오비탈</span>`,
        btag:'개수 · 최대 전자',bhtml:`<span class="m6-formula">${o.count}개 · 전자 ${o.max}개</span>`})));
    }
    else if(t==='full'){cards=rx.map(r=>({fhtml:`<span class="m6-korean">${r.name}</span>`,bhtml:`<span class="m6-formula">${this.m6Fmt(r.reactants)} → ${this.m6Fmt(r.products)}</span>`}));}
    else if(t==='reactant'){cards=rx.map(r=>({fhtml:`<span class="m6-korean">${r.name}</span>`,bhtml:`<span class="m6-formula">${this.m6Fmt(r.reactants)}</span>`}));}
    else if(t==='product'){cards=rx.map(r=>({fhtml:`<span class="m6-korean">${r.name}</span>`,bhtml:`<span class="m6-formula">${this.m6Fmt(r.products)}</span>`}));}
    else{cards=CHEMICALS.map(c=>({fhtml:`<span class="m6-korean">${c.name}</span>`,bhtml:`<span class="m6-formula">${c.formula.map(p=>p.sym+(p.sub?`<sub>${p.sub}</sub>`:'')).join('')}</span>`}));}
    /* 앞뒤 이름은 유형에서 온다. 카드가 따로 정한 것만 그대로 둔다(앙금 유무, 오비탈 두 갈래). */
    const d=cardType(t);
    return cards.map(c=>({ftag:d.front,btag:d.back,...c}));
  },
  /* 구역마다 쓸 수 있는 카드 유형이 다르다. MODES[n].cards에서 버튼을 만들고,
     현재 유형이 그 구역에 없으면 첫 번째로 되돌린다(다른 구역 유형이 남아 빈 카드가 되는 걸 막는다). */
  m6SyncTypes(){
    const root=modeRoot(this.state.currentMode);
    const list=(root&&root.cards)||['full','reactant','product','formula'];
    if(!list.includes(this.state.m6Type)) this.state.m6Type=list[0];
    document.getElementById('m6TypeBtns').innerHTML=list.map(t=>
      `<button class="m6-opt-btn${t===this.state.m6Type?' active':''}" data-val="${t}">${this.m6TypeLabel(t)}</button>`
    ).join('');
    this.m6SyncOrder();
  },
  /* 「먼저 보기」 라벨은 카드 유형에서 나온다. 값(korean/formula)은 그대로 둔다 —
     이미 저장된 오답노트가 이 값을 담고 있어서 바꾸면 복원이 깨진다.
     korean = 앞면부터, formula = 뒷면부터라는 뜻이고, 라벨만 유형에 맞게 붙인다. */
  m6SyncOrder(){
    const d=cardType(this.state.m6Type);
    const f=d.btnFront||d.front, b=d.btnBack||d.back;
    document.getElementById('m6OrderBtns').innerHTML=
      `<button class="m6-opt-btn${this.state.m6Order==='korean'?' active':''}" data-val="korean">${f} 먼저</button>`+
      `<button class="m6-opt-btn${this.state.m6Order==='formula'?' active':''}" data-val="formula">${b} 먼저</button>`;
  },
  m6GenCards(){
    this.m6SyncTypes();
    this.state.m6Cards=this.m6BuildCards(this.state.m6Type);this.state.m6Index=0;this.state.m6Flipped=false;
  },
  m6Render(dir){
    const{m6Cards,m6Index,m6Order}=this.state;const card=m6Cards[m6Index];if(!card)return;
    const isKorFirst=m6Order==='korean';
    document.getElementById('m6FTag').textContent=isKorFirst?card.ftag:card.btag;
    document.getElementById('m6FContent').innerHTML=isKorFirst?card.fhtml:card.bhtml;
    document.getElementById('m6BTag').textContent=isKorFirst?card.btag:card.ftag;
    document.getElementById('m6BContent').innerHTML=isKorFirst?card.bhtml:card.fhtml;
    this.state.m6Flipped=false;document.getElementById('m6Card').classList.remove('flipped');
    document.getElementById('m6Counter').textContent=`${m6Index+1} / ${m6Cards.length}`;
    document.getElementById('m6PFill').style.transform=`scaleX(${(m6Index+1)/m6Cards.length})`;
    this.m6SyncSaveBtn();
    if(dir){const o=document.getElementById('m6Outer'),cls=dir==='next'?'m6-slide-r':'m6-slide-l';o.classList.remove('m6-slide-r','m6-slide-l');void o.offsetWidth;o.classList.add(cls);}
  },
  /* 카드는 앞·뒷면 HTML을 한꺼번에 넣어 둔다. 그래서 그림이 든 면의 애니메이션은
     뒤집기도 전에 뒤에서 이미 다 끝나 있었다 — 뒤집으면 볼 게 없었다.
     그래서 **이제 보이게 되는 면**의 애니메이션만 그 시점에 되감는다.
     안 보이는 면은 건드리지 않는다. 되감기는 DOM을 새로 만들지 않으므로(restartAnim 참고)
     읽던 스크롤 위치도 그대로 남는다. */
  m6Flip(){
    this.playSound('tap'); this.playHaptic('tap');
    this.state.m6Flipped=!this.state.m6Flipped;
    document.getElementById('m6Card').classList.toggle('flipped',this.state.m6Flipped);
    this.restartAnim(document.getElementById(this.state.m6Flipped?'m6BContent':'m6FContent'));
  },
  m6Next(){this.playSound('tap'); this.state.m6Index=(this.state.m6Index+1)%this.state.m6Cards.length;this.m6Render('next');},
  m6Prev(){this.playSound('tap'); this.state.m6Index=(this.state.m6Index-1+this.state.m6Cards.length)%this.state.m6Cards.length;this.m6Render('prev');},
  m6Shuffle(){this.playSound('tap'); const c=[...this.state.m6Cards];for(let i=c.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[c[i],c[j]]=[c[j],c[i]];}this.state.m6Cards=c;this.state.m6Index=0;this.m6Render();},

  M6_SAVE_LABEL:'🔖 이 카드 오답노트에 저장',
  /* 카드 → 오답노트 저장용 {title, html} (저장·저장여부 판정 공용) */
  m6CardNoteData(card){
    const title=card.fhtml.replace(/<[^>]+>/g,'').trim()||card.ftag;
    /* 앞/뒤를 2단으로 쌓지 않고 "앞 → 뒤" 한 줄로 압축 (반응식 노트와 높이가 비슷해지도록) */
    const html=`<div class="m6-note-row">${card.fhtml}<span class="eq-arrow">→</span>${card.bhtml}</div>`;
    return {title,html};
  },
  /* 저장된 노트가 가리키는 카드를 찾는다. 카드 앞면이 곧 그 카드의 신원이다
     (같은 유형 안에서 앞면은 겹치지 않는다). 앞면이 없는 옛 노트만 인덱스로 되돌린다. */
  m6FindCard(cards, q){
    if(q && q.cardFront){
      const i = cards.findIndex(c => c.fhtml === q.cardFront);
      if(i >= 0) return i;
    }
    return Math.min(Math.max(0, (q && q.cardIndex) || 0), cards.length - 1);
  },
  m6CurrentSaved(){
    const card=this.state.m6Cards[this.state.m6Index];if(!card)return false;
    const {html}=this.m6CardNoteData(card);
    return this.state.wrongNotes.some(n=>isCardMode(n.mode)&&n.html===html);
  },
  m6SyncSaveBtn(){
    const btn=document.getElementById('m6SaveWrongBtn');if(!btn)return;
    if(this.m6CurrentSaved()){
      btn.textContent='✅ 오답노트에 저장됨';
      btn.classList.add('saved');
      btn.disabled=true;
    }else{
      btn.textContent=this.M6_SAVE_LABEL;
      btn.classList.remove('saved');
      btn.disabled=false;
    }
  },
  m6SaveCurrentAsWrong(){
    const card=this.state.m6Cards[this.state.m6Index];if(!card)return;
    if(this.m6CurrentSaved()){this.playSound('tap');return;} /* 이미 저장됨 → 중복 저장 방지 */
    const {title,html}=this.m6CardNoteData(card);
    /* cardIndex는 "섞인 배열에서 몇 번째"라 복원할 때(원래 순서로 다시 만든다) 다른 카드가 열렸다.
       카드 앞면 자체를 저장해 그 카드를 찾는다. cardIndex는 옛 노트 복원용으로만 남긴다. */
    const qData={m6Type:this.state.m6Type,m6Order:this.state.m6Order,
                 cardFront:card.fhtml,cardIndex:this.state.m6Index,title};
    this.saveWrongNote(this.state.currentMode,title,html,qData,false);
    this.playSound('success'); this.playHaptic('success');
    this.m6SyncSaveBtn();
  },
  viewFlashcardNote(note){
    this.$.wrongNoteModalOverlay.classList.remove('show');
    /* 플래시카드는 구역마다 하나씩(6·16·17·18) 있으므로 6번으로 고정하면 안 된다.
       고2 「이온식」 카드를 저장해 놓고 다시보기를 누르면 중학 반응식 카드가 떴다. */
    this.setMode(note.mode);
    const q=note.qData||{};
    this.state.m6Type=q.m6Type||'full';
    this.state.m6Order=q.m6Order||'korean';
    /* 유형·먼저보기 버튼은 m6GenCards가 상태를 보고 다시 그린다 — 여기서 따로 켤 필요가 없다 */
    this.m6GenCards();
    this.state.m6Index=this.m6FindCard(this.state.m6Cards,q);
    this.m6Render();
  },

  formatFormula(f){return f.map(p=>p.sym+(p.sub?`<sub>${p.sub}</sub>`:'')).join('');},
  /* 앙금(↓)·기체(↑) 표기. 화학식 뒤에 별도 span으로 붙는다 —
     학생이 입력하는 답(f2s)에는 절대 들어가지 않는다. 채점은 coef와 formula만 본다. */
  phaseHTML(ph){ return ph?`<span class="eq-phase" aria-hidden="true">${ph}</span>`:''; },
  /* BONDS의 화학식은 'CaCl2' 같은 문자열이다 — 숫자를 아래첨자로 바꾼다 */
  fmtFormulaStr(s){return String(s).replace(/(\d+)/g,'<sub>$1</sub>');},
  /* ── 테마 ──
     화면에 붙는 테마 클래스는 항상 한 개다. 새 것을 붙이기 전에 나머지를 전부 떼므로
     테마를 여러 번 바꿔도 이전 테마의 변수가 남아 섞이지 않는다. */
  /* 첫 방문에 쓸 테마를 폰 설정에서 고른다. 「잘 안 보인다」는 설정이 색보다 급하므로 먼저 본다.
     matchMedia가 없는 낡은 환경에서는 그냥 기본값으로 떨어진다. */
  systemTheme(){
    try{
      if(window.matchMedia('(prefers-contrast: more)').matches) return 'contrast';
      if(window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    }catch(e){}
    return THEME_DEFAULT;
  },
  /* persist: 학생이 직접 고른 것인가. 첫 화면을 그릴 때(폰 설정을 따라 고른 것)는 저장하지 않는다 —
     저장해 버리면 그 뒤로 폰을 밝게 바꿔도 앱은 영영 어두운 채로 남고, 「내가 고른 것」과
     「그날 폰이 그랬던 것」을 구분할 수 없게 된다. */
  applyTheme(id, persist){
    const t=themeMeta(id);
    this.state.theme=t.id;
    /* 클래스는 <html>에 붙인다 — 화면 전체 바탕색이 <html> 배경에서 오기 때문(css/style.css 참고) */
    THEMES.forEach(x=>document.documentElement.classList.toggle('theme-'+x.id, x.id===t.id));
    document.getElementById('themeBtn').textContent=t.icon;
    if(persist){ try{localStorage.setItem('chem_theme',t.id);}catch(e){} }
    /* 열려 있는 상세 패널의 헤더 색은 테마별 팔레트를 쓰므로, 테마 전환 시 다시 그려 새 팔레트를 즉시 반영 */
    [this.$.ptDetailPanel,this.$.ptFsDetailPanel].forEach(panel=>{
      if(panel&&panel.classList.contains('open')){
        const e=ELEMENTS.find(x=>x.z===parseInt(panel.dataset.z));
        if(e) panel.querySelector('.pt-detail-content').innerHTML=this.ptDetailHTML(e);
      }
    });
  },
  /* 지금 테마가 밝은 배경인가 — 주기율표 분류 색을 어느 쪽으로 고를지에 쓴다 */
  isLightTheme(){ return !!themeMeta(this.state.theme).light; },
  renderThemeList(){
    this.$.themeList.innerHTML=THEMES.map(t=>{
      const on=t.id===this.state.theme;
      /* 미리보기 네 칸: 글자·강조·맞음·틀림. 배경은 조각 자체가 깔고 있다 */
      const sw=['--c-text-primary','--c-accent-1','--c-correct','--c-wrong']
        .map(v=>`<span style="background:var(${v})"></span>`).join('');
      return `<button type="button" class="theme-opt${on?' active':''}" data-theme="${t.id}" aria-current="${on}">
        <span class="theme-swatch theme-pv theme-${t.id}" aria-hidden="true">${sw}</span>
        <span>
          <span class="theme-opt-name">${t.icon} ${t.label}</span>
          <span class="theme-opt-hint">${t.hint}</span>
        </span>
        <span class="theme-opt-check">${on?'✓':''}</span>
      </button>`;
    }).join('');
  },

  /* ── 주기율표 ── */
  ptLegendHTML(){
    return `<div class="pt-legend">${PT_CATEGORIES.map(([cls,label])=>`<span class="pt-legend-item"><span class="pt-legend-swatch pt-cat-${cls}"></span>${label}</span>`).join('')}</div>`;
  },
  ptCellHTML(e,col,row){
    const pos = (col!=null && row!=null) ? `grid-column:${col};grid-row:${row}` : '';
    return `<div class="pt-cell pt-cat-${e.cat}" data-z="${e.z}" style="${pos}" title="${e.z}. ${e.name} (${e.sym})"><span class="pt-z">${e.z}</span><span class="pt-sym">${e.sym}</span><span class="pt-name">${e.name}</span></div>`;
  },
  /* 원소 칸과 동일한 레이아웃(pt-z/pt-sym/pt-name)을 재사용하되, 배경을 족 색상 대신 실제 불꽃 반응 색으로,
     맨 위 숫자 칸은 원자번호 대신 색 이름으로 바꿔서 보여준다 */
  ptFlameCellHTML(e,fc){
    return `<div class="pt-cell" data-z="${e.z}" style="background:${fc.color}" title="${e.name}(${e.sym}) 불꽃 반응: ${fc.label}색"><span class="pt-z">${fc.label}</span><span class="pt-sym">${e.sym}</span><span class="pt-name">${e.name}</span></div>`;
  },
  /* 표 본체 HTML 생성 (모달·전체화면 공용). 1열/1행은 주기·족 번호 라벨용이라 원소는 +1 오프셋 배치 */
  ptTableHTML(){
    const simple=this.state.isSimplePeriodic;
    let cells='';
    if(simple){
      cells+=`<div class="pt-axis" style="grid-column:1;grid-row:1;font-size:9px;line-height:1.1;text-align:center">족<br>주기</div>`;
      const groupLabels=[1,2,13,14,15,16,17,18];
      groupLabels.forEach((g,i)=>{cells+=`<div class="pt-axis pt-axis-group" style="grid-column:${i+2};grid-row:1">${g}족</div>`;});
      [1,2,3,4,5,6].forEach(p=>{cells+=`<div class="pt-axis pt-axis-period" style="grid-column:1;grid-row:${p+1}">${p}주기</div>`;});
      ELEMENTS.filter(e=>(e.z<=20||PT_SIMPLE_EXTRA_Z.includes(e.z))&&!e.f).forEach(e=>{
        const col=(e.group<=2?e.group:e.group-10)+1;
        cells+=this.ptCellHTML(e,col,e.period+1);
      });
      let extraHTML='';
      PT_FLAME_COLORS.forEach(fc=>{
        const e=ELEMENTS.find(el=>el.z===fc.z);if(e)extraHTML+=this.ptFlameCellHTML(e,fc);
      });
      return {
        grid:`<div class="pt-grid pt-simple" style="grid-template-columns:40px repeat(8,1fr);grid-template-rows:repeat(7,1fr)">${cells}</div>`,
        extra:`<hr class="pt-extra-divider"><div class="pt-extra-label">🔥 불꽃 반응 색</div><div class="pt-extra-row">${extraHTML}</div>`
      };
    }
    cells+=`<div class="pt-axis" style="grid-column:1;grid-row:1;font-size:9px;line-height:1.1;text-align:center">족<br>주기</div>`;
    for(let g=1;g<=18;g++){cells+=`<div class="pt-axis pt-axis-group" style="grid-column:${g+1};grid-row:1">${g}</div>`;}
    for(let p=1;p<=7;p++){cells+=`<div class="pt-axis pt-axis-period" style="grid-column:1;grid-row:${p+1}">${p}</div>`;}
    ELEMENTS.filter(e=>!e.f).forEach(e=>{cells+=this.ptCellHTML(e,e.group+1,e.period+1);});
    cells+=`<div class="pt-cell pt-placeholder" style="grid-column:4;grid-row:7">57~71</div>`;
    cells+=`<div class="pt-cell pt-placeholder" style="grid-column:4;grid-row:8">89~103</div>`;
    ELEMENTS.filter(e=>e.f).forEach(e=>{
      const row=e.period===6?9:10,col=3+e.f;
      cells+=this.ptCellHTML(e,col,row);
    });
    return {
      grid:`<div class="pt-grid" style="grid-template-columns:56px repeat(18,1fr);grid-template-rows:repeat(10,1fr)">${cells}</div>`,
      extra:''
    };
  },
  renderPeriodicTable(){
    const t=this.ptTableHTML();
    this.$.periodicContent.innerHTML=`${this.ptLegendHTML()}<div class="pt-scroll">${t.grid}</div>${t.extra}`;
    this.closePtDetail(this.$.ptDetailPanel);
  },
  openPtFullscreen(){
    const t=this.ptTableHTML();
    const content=document.getElementById('ptFsContent');
    content.innerHTML=`${t.grid}${t.extra}`;
    /* 여는 순간에는 확대 레이어에 전환을 걸지 않는다 — 여는 전환(.pt-fullscreen)과 겹쳐
       표가 두 번 움직이는 것처럼 보인다. 확대/축소 전환은 그때그때 따로 건다. */
    content.style.transition='';
    clearTimeout(this._ptFitTimer); clearTimeout(this._ptResetTimer); clearTimeout(this._ptCloseTimer);
    /* reserve: 상세 패널이 아래를 덮는 높이. 화면이 돌아가 다시 계산할 때도 이 값을 써야
       패널을 열어 둔 채로 기기를 돌렸을 때 확보해 둔 자리가 사라지지 않는다. */
    this.ptZoom={scale:1,tx:0,ty:0,baseFit:1,vpW:1,vpH:1,layerH:1,cw:1,ch:1,reserve:0};
    const fs=document.getElementById('ptFullscreen');
    /* 닫히는 도중에 다시 열 수 있다 — 접히던 것을 도로 펴야 하므로 닫기 표시를 먼저 뗀다 */
    fs.classList.remove('pt-closing');
    fs.classList.add('show');
    /* 배율은 여는 이 순간에만 1로 되돌린다 — 그 밖의 재계산(상세 열기, 화면 회전)에서
       말없이 버리면 확대해 둔 것이 툭 풀린다. */
    this.layoutPtFullscreen(0, true);
  },
  closePtFullscreen(){
    const fs=document.getElementById('ptFullscreen');
    if(!fs.classList.contains('show')) return;
    clearTimeout(this._ptFitTimer); clearTimeout(this._ptResetTimer); clearTimeout(this._ptCloseTimer);
    /* 닫는 동안만 .pt-closing을 붙인다. 이게 있어야 회전자가 「가로인 채로 접히는」 쪽으로 가고,
       없으면 닫힘 기본 상태(세로)로 90도를 되감아 버린다.
       .show를 떼는 것과 같은 프레임에 붙여야 한 번의 전환으로 이어진다. */
    fs.classList.add('pt-closing');
    fs.classList.remove('show');
    /* 전환이 끝난 뒤에 뒷정리한다. 지금 바로 상세를 닫으면 접히는 화면 안에서
       패널이 따로 접히는 게 보여 두 동작이 겹친다. 시간은 CSS에서 읽으므로 어긋나지 않는다. */
    this._ptCloseTimer=setTimeout(()=>{
      /* 전환 없이 한 번에 닫힘 기본 상태로 돌려놓는다 — 강제 리플로우가 그 사이에 있어야
         브라우저가 두 변경을 묶지 않고 새 값을 전환 없이 확정한다. */
      fs.classList.add('pt-instant');
      fs.classList.remove('pt-closing');
      void fs.offsetWidth;
      fs.classList.remove('pt-instant');
      const rotor=document.querySelector('.pt-fs-rotor');
      if(rotor) rotor.classList.remove('pt-detail-open');
      this.closePtDetail(this.$.ptFsDetailPanel);
    }, this.motionMs('--dur-view-out')+20);
  },
  /* 원소 상세 설명 패널: 기호·이름·원자번호 헤더 + desc 본문.
     기호·이름 글자색은 주기율표 칸의 분류 색(PT_CAT_COLORS)과 맞춰 어떤 칸을 눌렀는지 한눈에 이어지게 함 */
  ptDetailHTML(e){
    const palette=this.isLightTheme()?PT_CAT_COLORS_LIGHT:PT_CAT_COLORS;
    const catColor=palette[e.cat]||'var(--c-accent-1)';
    /* 이 앱이 문제로 묻는 값들 — 주기·족(모드 7), 원자가 전자(모드 8), 이온(모드 9·11) —
       을 설명 문단보다 먼저 보여 준다. 예전에는 원자번호·기호·이름과 줄글뿐이라,
       정작 학생이 확인하고 싶은 숫자가 화면에 없었다.
       값은 전부 문제의 정답을 만드는 함수에서 그대로 가져온다(shellsOf·valenceOf·ELEMENTS).
       따로 적어 두면 언젠가 정답과 어긋나는데, 교육용에서 그건 허용할 수 없다. */
    const cat=(PT_CATEGORIES.find(([c])=>c===e.cat)||[,''])[1];
    /* 란타넘족·악티늄족 30종은 족 번호가 없다 — 주기율표가 이들을 3족 자리에 묶어
       따로 떼어 놓기 때문이고, 번호를 안 매기는 게 맞다. 그대로 찍으면 「undefined족」이
       화면에 나온다(실제로 냈고 검사가 잡았다). 없는 값은 그 사실을 적는다. */
    const groupText = e.group ? `${e.group}족` : '3족 자리에 함께 둔다';
    const rows=[['주기',`${e.period}주기`],['족',groupText],['분류',cat]];
    /* 껍질 배치는 1~20번에서만 교과서와 일치한다(shellsOf 주석 참고) — 그 밖에는 적지 않는다.
       모르는 값을 그럴듯하게 채우는 것보다 비워 두는 편이 낫다. */
    if(e.z<=20){
      const sh=shellsOf(e.z);
      rows.push(['전자 배치', sh.map((n,i)=>`<b>${'KLMN'[i]}</b> ${n}`).join(' · ')]);
      rows.push(['원자가 전자', `${valenceOf(e.z)}개`]);
      /* 이온 설명은 모드 9의 정답 문구를 그대로 쓴다(ionAnswerText) — 여기서 따로 쓰면
         언젠가 문제의 정답과 말이 달라진다. 이온식은 앱의 위첨자 렌더러에 맡긴다. */
      const ion=ION_FORMING.find(x=>x.z===e.z);
      if(ion){
        const sym=ion.noble ? '' :
          this.formatInput(`${e.sym}^${ion.n>1?ion.n:''}${ion.dir==='lose'?'+':'-'}`)+' — ';
        rows.push(['이온', sym + this.ionAnswerText(ion)]);
      }
    }
    const facts=`<dl class="pt-facts">${rows.map(([k,v])=>
      `<div class="pt-fact"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
    return `<div class="pt-detail-head"><span class="pt-detail-z">${e.z}</span><span class="pt-detail-sym" style="color:${catColor}">${e.sym}</span><span class="pt-detail-name" style="color:${catColor}">${e.name}</span><button class="pt-detail-close" aria-label="닫기">✕</button></div>${facts}<p class="pt-detail-desc">${e.desc||''}</p>`;
  },
  /* 같은 칸을 다시 클릭하면 닫히고, 다른 칸을 클릭하면 내용을 교체 — 패널 하나당 항상 하나만 열림 */
  ptToggleDetail(panel,z){
    if(!panel) return;
    const e=ELEMENTS.find(x=>x.z===z); if(!e) return;
    if(panel.classList.contains('open') && panel.dataset.z===String(z)){
      this.closePtDetail(panel); return;
    }
    panel.querySelector('.pt-detail-content').innerHTML=this.ptDetailHTML(e);
    panel.dataset.z=z;
    panel.classList.add('open');
    this.ptSyncDetailSpace(panel);
  },
  closePtDetail(panel){
    if(!panel) return;
    panel.classList.remove('open');
    panel.dataset.z='';
    this.ptSyncDetailSpace(panel);
  },
  /* 패널이 열리면 그리드 하단 일부를 덮으므로, 덮인 칸도 계속 클릭 가능하도록 여유 공간을 확보한다.
     모달은 스크롤 컨테이너에 패딩을 줘서 스크롤로 덮인 칸을 피할 수 있게 하고,
     전체화면은 스크롤이 없으므로 뷰포트 맞춤 배율(baseFit)을 다시 계산해 표 전체를 살짝 축소한다
     (칸의 실측 픽셀 크기·폰트 계산에는 관여하지 않아 fullscreen 레이아웃의 기존 안정성을 해치지 않음). */
  ptSyncDetailSpace(panel){
    const isOpen=panel.classList.contains('open');
    const box=panel.querySelector('.pt-detail-content');
    /* offsetHeight로 잰다. 이유가 둘이다.
       · scrollHeight는 내용의 자연 높이라 max-height로 잘리는 상한을 무시한다 — 긴 설명이 붙은
         원소에서 실제보다 훨씬 큰 값이 나와, 그만큼을 표에서 빼앗아 표가 실처럼 찌부러졌다.
       · getBoundingClientRect는 회전 뷰에서 90° 돌아간 **화면 좌표계**의 바깥 상자를 준다.
         돌아간 요소에서는 높이 자리에 로컬 가로가 들어와 156px짜리 패널이 844px로 읽혔다.
       offsetHeight는 변환과 무관한 레이아웃 높이라 상한도 지키고 회전에도 흔들리지 않는다. */
    const h=isOpen ? box.offsetHeight : 0;
    if(panel===this.$.ptDetailPanel){
      this.$.periodicContent.style.paddingBottom = h ? (h+16)+'px' : '';
    } else if(panel===this.$.ptFsDetailPanel && document.getElementById('ptFullscreen').classList.contains('show')){
      /* layoutPtFullscreen이 다시 계산하는 배율(baseFit)은 transform으로 즉시 적용되므로,
         잠깐 transition을 걸어 표 전체가 뚝 끊기지 않고 부드럽게 커지고/줄어들게 한다.
         타이머는 ptZoomReset과 따로 둔다 — 하나를 같이 쓰면 리셋 직후 패널을 토글했을 때
         한쪽이 다른 쪽의 타이머를 지워 transition이 켜진 채로 남고, 그 상태로 핀치를 하면
         손가락을 늦게 따라오는 고무줄 같은 느낌이 난다. */
      const fsEl=document.getElementById('ptFsContent');
      /* 상세를 열면 표에 남는 세로가 절반 아래로 떨어진다. 그 좁은 자리를 불꽃 반응 줄까지
         나눠 쓰면 정작 표가 못 읽을 만큼 작아진다 — 상세를 보는 동안에는 곁다리를 접는다.
         레이아웃을 재기 **전에** 접어야 그만큼이 표 몫으로 돌아간다. */
      const rotor=document.querySelector('.pt-fs-rotor');
      if(rotor) rotor.classList.toggle('pt-detail-open', isOpen);
      /* 여기 .3s/ease 가 인라인으로 박혀 있었다 — CSS 밖이라 토큰 검사에도 안 걸리고,
         「움직임 줄이기」를 켠 사람에게도 그대로 0.3초를 움직였다. 뒤따르던 320 도
         그 숫자를 손으로 맞춘 값이라 한쪽만 바뀌면 전환이 도중에 끊긴다. 둘 다 토큰에서 읽는다. */
      fsEl.style.transition='transform var(--dur-move) var(--ease-move)';
      clearTimeout(this._ptFitTimer);
      this._ptFitTimer=setTimeout(()=>{fsEl.style.transition='';},this.motionMs('--dur-move')+20);
      this.layoutPtFullscreen(h);
    }
  },
  /* 회전 뷰의 열 폭·행 높이·폰트를 실측 픽셀 하나(cell)로 통일 계산해 인라인 적용.
     같은 cell 값에서 열폭·행높이·폰트를 전부 파생시켜 어떤 화면에서도 서로 맞물리게 한다.
     gap(4px)까지 정산해 실제 콘텐츠가 뷰포트를 넘지 않게 하고, 넘으면 baseFit로 축소해
     기본 배율(scale=1)에서 항상 전부 보이게 만든다. */
  layoutPtFullscreen(reserveBottom=0, resetScale=false){
    const scrollEl=document.getElementById('ptFsContent');
    const grid=scrollEl.querySelector('.pt-grid');
    if(!grid) return;
    const vp=document.getElementById('ptFsViewport');
    const title=document.querySelector('.pt-fs-title');
    const root=document.documentElement;
    const appW=parseFloat(getComputedStyle(root).getPropertyValue('--app-w'))||window.innerWidth;
    const appH=parseFloat(getComputedStyle(root).getPropertyValue('--app-h'))||window.innerHeight;
    const pad=32; /* .pt-fs-rotor padding:16px 상하좌우 */
    const gap=4;  /* .pt-grid gap:4px */
    const titleH=(title?title.offsetHeight:32)+10; /* 10 = title margin-bottom */
    const availW=Math.max(200, appH-pad);        /* 회전 전 가로(=appH) → 열이 늘어서는 축 */
    const availH=Math.max(160, appW-pad-titleH); /* 회전 전 세로(=appW) → 행 높이를 제한하는 축 */
    const simple=this.state.isSimplePeriodic;
    const cols=simple?9:19, rows=simple?7:10;
    const labelPx=simple?36:48;
    /* 열/행 사이 gap을 빼고 남는 폭·높이를 셀 개수로 나눠야 실제로 안 넘친다 */
    const cellByW=(availW-labelPx-(cols-1)*gap)/(cols-1);
    const cellByH=(availH-(rows-1)*gap)/rows;
    const cell=Math.max(28, Math.min(cellByW, cellByH, 64));
    grid.style.gridTemplateColumns=`${labelPx}px repeat(${cols-1},${cell}px)`;
    grid.style.gridTemplateRows=`repeat(${rows},${cell}px)`;
    /* 번호/기호/이름 세 폰트를 각자 독립 비율로 정하면(예전 방식) 합계가 칸 높이를 넘어서
       가운데 기호 행이 짜부러지며 이름과 겹칠 수 있다 — 번호·기호는 고정 px 행으로 못박고
       (그래야 이름이 아무리 커도 이 둘은 절대 밀리지 않음), 이름은 남는 공간에서 폰트를
       역산한 뒤 그 폰트가 실제로 필요로 하는 높이(2줄×line-height)를 다시 계산해 행에
       반영한다 — "이 정도 공간이 있으니 이 폰트려니" 식 어림값이 아니라 최종 폰트 크기에서
       거꾸로 필요 높이를 구해야 line-clamp:2 박스 실측과 항상 맞아떨어진다. */
    const padY=1; /* 회전 뷰 전용 .pt-fs-scroll .pt-cell padding:1px 2px와 짝 */
    const contentH=cell-2*padY;
    const zH=Math.max(7, Math.round(cell*.13));
    const symH=Math.max(10, Math.round(cell*.30));
    const nameBudget=Math.max(8, contentH-zH-symH);
    const nameLH=1.05;
    const nameFs=Math.max(4, Math.floor(nameBudget/(2*nameLH)));
    const nameH=Math.ceil(nameFs*nameLH*2)+1; /* 실제 폰트 기준 필요 높이 + 1px 서브픽셀 안전마진 */
    scrollEl.style.setProperty('--pt-fs-sym', Math.max(9,symH-1)+'px');
    scrollEl.style.setProperty('--pt-fs-name', nameFs+'px');
    scrollEl.style.setProperty('--pt-fs-z', Math.max(6,zH-1)+'px');
    scrollEl.style.setProperty('--pt-cell-zh', zH+'px');
    scrollEl.style.setProperty('--pt-cell-symh', symH+'px');
    scrollEl.style.setProperty('--pt-cell-nameh', nameH+'px');
    /* 주입·사이징 후 실제 콘텐츠를 실측해 baseFit 산출.
       전에는 그리드와 불꽃반응 행 둘만 더하고 사이의 구분선·제목 줄은 빼먹었다 —
       실제 콘텐츠가 계산보다 12px쯤 커서 세로 중앙이 그만큼 위로 밀리고, 딱 맞춰 놓았다는
       배율에서도 아래가 조금 잘렸다. 자식을 전부 훑어 바깥 여백까지 더한다
       (flex 컨테이너라 위아래 margin이 서로 상쇄되지 않고 그대로 자리를 차지한다). */
    let cw=0, ch=0;
    for(const el of scrollEl.children){
      const cs=getComputedStyle(el);
      /* 접힌 자식은 상자가 없다. 그런데 getComputedStyle은 display:none이어도 지정된 margin을
         그대로 돌려주므로, 거르지 않으면 있지도 않은 여백을 세어 표를 그만큼 작게 만든다. */
      if(cs.display==='none') continue;
      ch+=el.offsetHeight+(parseFloat(cs.marginTop)||0)+(parseFloat(cs.marginBottom)||0);
      cw=Math.max(cw, el.offsetWidth);
    }
    if(!ch){ cw=grid.offsetWidth; ch=grid.offsetHeight; }
    const z=this.ptZoom||(this.ptZoom={scale:1,tx:0,ty:0});
    /* 상세 패널이 덮는 높이. 화면이 돌아 다시 계산할 때(reserveBottom 없이 불릴 때)도
       패널이 열려 있으면 그 자리를 계속 비워 둬야 한다. */
    if(arguments.length) z.reserve=reserveBottom; else reserveBottom=z.reserve||0;
    const vpW=vp.clientWidth||1, layerH=vp.clientHeight||1;
    /* 패널이 화면을 다 먹어 표가 실처럼 찌부러지는 것을 막는다 — 표 몫으로 최소 45%는 남긴다 */
    reserveBottom=Math.min(reserveBottom, layerH*0.55);
    const vpH=Math.max(80, layerH-reserveBottom);
    z.baseFit=Math.min(vpW/cw, vpH/ch, 1);
    /* vpH는 "표를 얼마에 맞출까"이고 layerH는 "CSS가 무엇을 기준으로 가운데 두는가"다.
       .pt-fs-scroll은 height:100%에 justify-content:center라 언제나 layerH를 기준으로 삼는다.
       예전에는 clampPtZoom이 줄인 vpH로 중앙 오프셋을 계산해, 패널을 열면 표가 세로로만
       (가로는 안 줄이므로) S·reserve/2만큼 미끄러졌다. 둘을 따로 들고 있어야 어긋나지 않는다. */
    z.vpW=vpW; z.vpH=vpH; z.layerH=layerH; z.cw=cw; z.ch=ch;
    if(resetScale) z.scale=1;
    this.clampPtZoom(); this.applyPtZoom();
  },
  /* tx/ty가 허용되는 범위. clampPtZoom(하드 클램프)과 applyPtZoom의 고무줄 저항이
     같은 경계를 써야 어긋나지 않는다 — 그래서 계산을 여기 한 곳에만 둔다. */
  ptZoomBounds(){
    const z=this.ptZoom; if(!z) return null;
    const S=z.baseFit*z.scale, vpW=z.vpW, vpH=z.vpH, cw=z.cw, ch=z.ch;
    const rw=cw*S, rh=ch*S;
    /* 중앙정렬 오프셋은 CSS가 실제로 가운데를 잡는 기준(레이어 전체 높이)에서 구해야 한다.
       패널이 덮은 만큼 줄인 vpH로 구하면 그 차이의 절반만큼 표가 위로 밀린다. */
    const ox=(vpW-cw)/2*S, oy=((z.layerH||vpH)-ch)/2*S;
    const bx = rw<=vpW ? {min:(vpW-rw)/2-ox, max:(vpW-rw)/2-ox} : {min:vpW-rw-ox, max:-ox};
    const by = rh<=vpH ? {min:(vpH-rh)/2-oy, max:(vpH-rh)/2-oy} : {min:vpH-rh-oy, max:-oy};
    return {bx, by, vpW, vpH};
  },
  /* 경계를 넘은 만큼 점점 세게 눌러 되돌린다 — 손 밑에서 툭 멈추면 "죽었다"로 읽히고,
     계속 저항하며 늘어나면 "여기까지가 끝이다"가 자연스럽게 전해진다.
     constant가 작을수록 뻣뻣하다. overshoot의 부호를 그대로 갖고 나온다. */
  ptRubberband(overshoot, dim, constant=0.55){
    return (overshoot*dim*constant)/(dim+constant*Math.abs(overshoot));
  },
  /* 줌 레이어에 transform 적용. transform만 바꾸므로 리페인트/리플로우 없이 GPU 합성만.
     translate3d(3D 변환)로 오버레이가 열려 있는 동안 레이어를 상시 승격시켜, will-change를
     껐다 켤 때 생기던 승격/강등 재래스터화 플래시(=이따금 깜빡임)를 없앤다.

     z.tx/z.ty는 "논리적" 위치다 — 팬 중에는 경계를 넘어도 그대로 누적된다(clampPtZoom을
     안 부르므로). 여기서 렌더링할 때만 경계 밖이면 고무줄 저항을 입힌다. 그래서 손가락이
     계속 미는 동안은 점점 뻣뻣해지다가, 손을 떼면(ptSettlePan) 진짜 경계 안으로 튕겨 들어간다. */
  applyPtZoom(){
    const z=this.ptZoom; if(!z) return;
    const S=z.baseFit*z.scale;
    const b=this.ptZoomBounds();
    let tx=z.tx, ty=z.ty;
    if(b){
      if(tx<b.bx.min) tx=b.bx.min+this.ptRubberband(tx-b.bx.min, b.vpW);
      else if(tx>b.bx.max) tx=b.bx.max+this.ptRubberband(tx-b.bx.max, b.vpW);
      if(ty<b.by.min) ty=b.by.min+this.ptRubberband(ty-b.by.min, b.vpH);
      else if(ty>b.by.max) ty=b.by.max+this.ptRubberband(ty-b.by.max, b.vpH);
    }
    document.getElementById('ptFsContent').style.transform=`translate3d(${tx}px,${ty}px,0) scale(${S})`;
  },
  /* 콘텐츠가 뷰포트를 벗어나지 않게 tx/ty를 실제로(논리값째) 경계 안으로 되돌린다.
     핀치·리사이즈·리셋처럼 "지금 바로 결정돼야 하는" 경우에 쓴다. 팬 중에는 안 쓴다 —
     팬은 고무줄처럼 늘어나야 하므로 논리값을 경계 밖에 그대로 둔다(applyPtZoom 참고). */
  clampPtZoom(){
    const z=this.ptZoom; const b=this.ptZoomBounds(); if(!z||!b) return;
    z.tx=Math.min(b.bx.max,Math.max(b.bx.min,z.tx));
    z.ty=Math.min(b.by.max,Math.max(b.by.min,z.ty));
  },
  ptZoomReset(){
    const z=this.ptZoom; if(!z) return;
    const el=document.getElementById('ptFsContent');
    el.style.transition='transform var(--dur-move) var(--ease-move)';
    clearTimeout(this._ptResetTimer);
    this._ptResetTimer=setTimeout(()=>{el.style.transition='';}, this.motionMs('--dur-move')+20);
    z.scale=1; this.clampPtZoom(); this.applyPtZoom();
    this.playSound('tap'); this.playHaptic('tap');
  },
  /* 손을 뗀 뒤 경계 밖(고무줄이 늘어난 상태)이면 논리값을 경계로 되돌리고 전환으로 튕겨 들어간다.
     관성 도중에 경계에 걸려도 결국 여기로 온다 — ptPanFling이 속도가 다 죽으면 부른다. */
  ptSettlePan(){
    /* 취소만으로는 부족하다 — cancelAnimationFrame은 이미 실행 중인(막 콜백에 들어온) 프레임의
       ID는 못 무른다. 여기로 오는 한쪽 경로가 바로 그 프레임 안(step의 속도<30 분기)이라,
       ID를 null로도 비워야 "지금 날아가는 중이냐"를 묻는 자리(재잡기 판단 등)가 계속
       "그렇다"로 잘못 답하지 않는다. */
    cancelAnimationFrame(this._ptFlingRAF); this._ptFlingRAF=null;
    const z=this.ptZoom; const b=this.ptZoomBounds(); if(!z||!b) return;
    const inBounds = z.tx>=b.bx.min-.5&&z.tx<=b.bx.max+.5&&z.ty>=b.by.min-.5&&z.ty<=b.by.max+.5;
    if(inBounds){ this.applyPtZoom(); return; }
    const el=document.getElementById('ptFsContent');
    this.clampPtZoom();
    el.style.transition='transform var(--dur-move) var(--ease-move)';
    this.applyPtZoom();
    clearTimeout(this._ptSettleTimer);
    this._ptSettleTimer=setTimeout(()=>{ el.style.transition=''; }, this.motionMs('--dur-move')+20);
  },
  /* 던진 방향으로 속도를 갖고 더 가다가 감속해 멈춘다 — 관성. 벽에 부딪히면 그 프레임부터
     속도를 크게 깎는다(고무줄이 이미 applyPtZoom에서 시각적으로 눌러 주므로, 여기서는
     "계속 뚫고 나가지 않게"만 하면 된다). 거의 멈추면 ptSettlePan이 마무리한다. */
  ptPanFling(vx, vy){
    const z=this.ptZoom; if(!z) return;
    cancelAnimationFrame(this._ptFlingRAF);
    const decel=0.994;
    let lastT=performance.now();
    const step=(now)=>{
      const dt=Math.min(32, now-lastT); lastT=now;
      if(Math.hypot(vx,vy)<30){ this.ptSettlePan(); return; }
      z.tx+=vx*dt/1000; z.ty+=vy*dt/1000;
      const decayFrame=Math.pow(decel, dt);
      vx*=decayFrame; vy*=decayFrame;
      const b=this.ptZoomBounds();
      if(b){
        if(z.tx<b.bx.min||z.tx>b.bx.max) vx*=0.62;
        if(z.ty<b.by.min||z.ty>b.by.max) vy*=0.62;
      }
      this.applyPtZoom();
      this._ptFlingRAF=requestAnimationFrame(step);
    };
    this._ptFlingRAF=requestAnimationFrame(step);
  },
  /* 팬을 놓았을 때 — 이미 경계 밖(고무줄 상태)이면 관성 없이 바로 튕겨 들어가고
     (늘어난 채로 또 날아가면 이상하다), 경계 안이면 마지막 속도로 관성을 준다. */
  ptPanRelease(vx, vy){
    const z=this.ptZoom; const b=this.ptZoomBounds(); if(!z||!b) return;
    const outOfBounds = z.tx<b.bx.min-.5||z.tx>b.bx.max+.5||z.ty<b.by.min-.5||z.ty>b.by.max+.5;
    if(outOfBounds || (!vx&&!vy)) this.ptSettlePan();
    else this.ptPanFling(vx, vy);
  },
  /* 회전 뷰 자체 핀치/팬/더블탭 줌 — 네이티브 줌(고정+회전 요소 재래스터화로 버벅/깜빡) 대신
     transform:scale만 GPU로 걸어 매끈하게. 화면 좌표를 90° 역회전해 가로(로컬) 공간으로 매핑. */
  setupPtZoom(){
    const vp=document.getElementById('ptFsViewport');
    const rotor=document.querySelector('.pt-fs-rotor');
    if(!vp||!rotor) return;
    let mode=null, startDist=0, startScale=1, focal=null, lastMid=null, lastPan=null, lastTap=0, tapStart=null;
    let panHist=[];
    /* 손가락을 대는 순간 transform 전환을 끈다. 상세 패널 토글이나 배율 리셋이 걸어 둔
       transition이 살아 있는 채로 핀치를 시작하면 표가 손가락을 0.3초 늦게 따라와
       고무줄처럼 물컹거린다 — 직접 조작 중에는 전환이 있으면 안 된다.
       관성이나 스냅백이 도는 중에 다시 잡을 수도 있다 — 그때는 **목표값이 아니라 지금 화면에
       실제로 보이는 값**에서 이어받아야 한다. 목표값에서 시작하면 잡는 순간 화면이 튄다. */
    const grabNow=()=>{
      clearTimeout(this._ptFitTimer); clearTimeout(this._ptResetTimer); clearTimeout(this._ptSettleTimer);
      cancelAnimationFrame(this._ptFlingRAF); this._ptFlingRAF=null;
      const el=document.getElementById('ptFsContent');
      if(!el) return;
      if(el.style.transition){
        const m=new DOMMatrixReadOnly(getComputedStyle(el).transform);
        const z=this.ptZoom;
        if(z){ z.tx=m.m41; z.ty=m.m42; if(z.baseFit) z.scale=m.a/z.baseFit; }
      }
      el.style.transition='';
    };
    const dist=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
    const mid=(a,b)=>({x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2});
    /* 화면 좌표 → 뷰포트 로컬(가로 공간) 좌표. rotor는 화면 중앙 고정(회전 원점=바운딩 중심).
       rotate(90°)의 역: 화면 오프셋(ox,oy) → 로컬(oy,-ox). rotor 바운딩 폭=appW, 높이=appH이고
       rotor 로컬 폭=appH·높이=appW라 중앙기준→좌상단기준 보정은 각각 r.height/2, r.width/2. */
    const toLocal=(cx,cy)=>{
      const r=rotor.getBoundingClientRect();
      const ox=cx-(r.left+r.width/2), oy=cy-(r.top+r.height/2);
      return { x:(oy+r.height/2)-vp.offsetLeft, y:(-ox+r.width/2)-vp.offsetTop };
    };
    vp.addEventListener('touchstart',e=>{
      grabNow();
      if(e.touches.length===2){
        mode='pinch'; startDist=dist(e.touches[0],e.touches[1])||1;
        startScale=this.ptZoom.scale;
        const m0=mid(e.touches[0],e.touches[1]); focal=toLocal(m0.x,m0.y); lastMid=m0;
        e.preventDefault();
      } else if(e.touches.length===1){
        const now=Date.now();
        if(now-lastTap<300){ lastTap=0; mode=null; this.ptZoomReset(); e.preventDefault(); return; }
        lastTap=now;
        if(this.ptZoom.scale>1.001){
          mode='pan'; lastPan={x:e.touches[0].clientX,y:e.touches[0].clientY}; e.preventDefault();
          panHist=[{tx:this.ptZoom.tx,ty:this.ptZoom.ty,t:performance.now()}];
          /* 확대 상태에서는 touchstart가 preventDefault돼 합성 click이 안 나므로, 이동이 거의 없는
             짧은 터치를 직접 "탭"으로 간주해 상세 패널을 연다(아래 touchmove/end 참고). */
          tapStart={x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()};
        }
        else { mode=null; }
      }
    },{passive:false});
    vp.addEventListener('touchmove',e=>{
      const z=this.ptZoom;
      if(mode==='pinch'&&e.touches.length===2){
        const d=dist(e.touches[0],e.touches[1]);
        const ns=Math.max(1,Math.min(4,startScale*(d/startDist)));
        const S0=z.baseFit*z.scale, S1=z.baseFit*ns;
        z.tx=focal.x-(focal.x-z.tx)*(S1/S0);
        z.ty=focal.y-(focal.y-z.ty)*(S1/S0);
        z.scale=ns;
        const m=mid(e.touches[0],e.touches[1]);
        z.tx+=(m.y-lastMid.y); z.ty+=-(m.x-lastMid.x); lastMid=m; /* 두 손가락 드래그=팬 */
        this.clampPtZoom(); this.applyPtZoom(); e.preventDefault();
        tapStart=null;
      } else if(mode==='pan'&&e.touches.length===1){
        const dx=e.touches[0].clientX-lastPan.x, dy=e.touches[0].clientY-lastPan.y;
        lastPan={x:e.touches[0].clientX,y:e.touches[0].clientY};
        /* 팬 중에는 클램프하지 않는다 — 논리값이 경계를 넘어가야 applyPtZoom의 고무줄이
           그만큼 저항해 보인다(경계를 넘을수록 점점 뻣뻣해진다). 손을 떼면 ptPanRelease가
           경계 안으로 되돌리거나(늘어난 상태) 관성을 준다(경계 안이면). */
        z.tx+=dy; z.ty+=-dx; this.applyPtZoom(); e.preventDefault();
        /* 최근 표본만 남긴다 — 손 뗄 때 속도는 "방금 움직인 방향"이어야지 제스처 시작부터의
           평균이면 안 된다(중간에 방향을 바꿨을 수 있다). */
        const now=performance.now();
        panHist.push({tx:z.tx,ty:z.ty,t:now});
        while(panHist.length>2 && now-panHist[0].t>100) panHist.shift();
        if(tapStart && Math.hypot(e.touches[0].clientX-tapStart.x,e.touches[0].clientY-tapStart.y)>8) tapStart=null;
      }
    },{passive:false});
    const end=e=>{
      if(tapStart && Date.now()-tapStart.t<300){
        const el=document.elementFromPoint(tapStart.x,tapStart.y);
        const cell=el&&el.closest('.pt-cell[data-z]');
        if(cell) this.ptToggleDetail(this.$.ptFsDetailPanel, parseInt(cell.dataset.z));
      }
      tapStart=null;
      if(e.touches.length===0){
        const wasPan=mode==='pan';
        if(this.ptZoom.scale<=1.001){ this.ptZoom.scale=1; this.clampPtZoom(); this.applyPtZoom(); }
        else if(wasPan){
          let vx=0,vy=0;
          if(panHist.length>=2){
            const a=panHist[0], last=panHist[panHist.length-1], dt=(last.t-a.t)/1000;
            if(dt>0){ vx=(last.tx-a.tx)/dt; vy=(last.ty-a.ty)/dt; }
          }
          this.ptPanRelease(vx,vy);
        }
        mode=null; panHist=[];
      } else if(e.touches.length===1&&mode==='pinch'){
        mode=this.ptZoom.scale>1.001?'pan':null;
        lastPan={x:e.touches[0].clientX,y:e.touches[0].clientY};
        panHist=[{tx:this.ptZoom.tx,ty:this.ptZoom.ty,t:performance.now()}];
      }
    };
    vp.addEventListener('touchend',end,{passive:false});
    vp.addEventListener('touchcancel',end,{passive:false});
    vp.addEventListener('gesturestart',e=>e.preventDefault());
  }
};

document.addEventListener('DOMContentLoaded',()=>App.init());
