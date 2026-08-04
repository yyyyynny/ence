/* ── 앱 ── */
const App={
  state:{
    currentMode:null,score:{streak:0,correct:0,wrong:0},
    currentQuestion:null,isAnswerChecked:false,isAnswerRevealed:false,isDarkMode:true,
    isLastWrongAttempt:false,wrongBlanks:{},wrongAlreadyPenalized:false,
    timerDuration:DEFAULT_TIMER,currentMaxTime:DEFAULT_TIMER,timerLeft:DEFAULT_TIMER,timerInterval:null,
    wrongNotes:[],noteFilter:'all',retryNoteId:null,
    isCycleMode:false,cycleQueue:[],cycleTotal:0,lastQuestionName:null,
    m6Type:'full',m6Order:'korean',m6Cards:[],m6Index:0,m6Flipped:false,
    m7Dir:'toPG',
    section:'ms', showDiagram:true,
    isSoundOn:true, isHapticOn:true, isWideMode:false, isSimplePeriodic:false,
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
    simplePeriodicToggle:document.getElementById('simplePeriodicToggle'),
    ptDetailPanel:document.getElementById('ptDetailPanel'),ptFsDetailPanel:document.getElementById('ptFsDetailPanel')
  },

  init(){
    this.loadSettings();
    this.loadWrongNotes();
    this.buildKeyboard();
    this.buildModalList();
    this.attachEventListeners();
    document.body.addEventListener('click', () => this.initAudioContext(), {once:true});
    this.setupScrollFade(document.querySelector('.header-right'));
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
      this.state.isSimplePeriodic = localStorage.getItem('chem_pt_simple') === 'true';
      /* 저장된 구역이 개정으로 사라졌을 수 있으므로 실재하는지 확인하고 쓴다 */
      const savedSec = localStorage.getItem('chem_section');
      if(savedSec && sectionMeta(savedSec)) this.state.section = savedSec;
      this.state.showDiagram = localStorage.getItem('chem_diagram') !== 'false';
    }catch(e){}
    this.updateFeedbackBtns();
    if(this.state.isWideMode) document.body.classList.add('wide-mode');
    this.$.layoutBtn.textContent = this.state.isWideMode ? '📱' : '↔️';
    this.$.simplePeriodicToggle.classList.toggle('on', this.state.isSimplePeriodic);
    this.$.simplePeriodicToggle.setAttribute('aria-checked', this.state.isSimplePeriodic);

    let authed=false;
    try{ authed = localStorage.getItem('chem_auth_v4')==='pass'; }catch(e){}
    if(authed) document.getElementById('authOverlay').style.display = 'none';
  },
  updateFeedbackBtns(){
    this.$.soundBtn.textContent = this.state.isSoundOn ? '🔊' : '🔇';
    this.$.soundBtn.style.opacity = this.state.isSoundOn ? '1' : '0.5';
    this.$.hapticBtn.textContent = this.state.isHapticOn ? '📳' : '📴';
    this.$.hapticBtn.style.opacity = this.state.isHapticOn ? '1' : '0.5';
  },
  toggleWideMode() {
    this.playSound('tap');
    this.state.isWideMode = !this.state.isWideMode;
    document.body.classList.toggle('wide-mode', this.state.isWideMode);
    try{localStorage.setItem('chem_wide', this.state.isWideMode);}catch(e){}
    this.$.layoutBtn.textContent = this.state.isWideMode ? '📱' : '↔️';
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

  loadWrongNotes(){try{const d=localStorage.getItem('chem_wrong_notes_v4');this.state.wrongNotes=d?JSON.parse(d):[];}catch(e){this.state.wrongNotes=[];}},
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

  /* 오답노트 재풀이 중 플래시카드(모드6) 노트 — 채점 없이 뒤집어 확인 후 기억/다시 로 진행 */
  renderRetryFlashcard(note){
    clearInterval(this.state.timerInterval);
    document.getElementById('retryM6Card').style.display = '';
    const q = note.qData||{};
    const cards = this.m6BuildCards(q.m6Type||'full');
    const idx = Math.min(q.cardIndex||0, cards.length-1);
    const card = cards[idx];
    const isKorFirst = (q.m6Order||'korean')==='korean';
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
    document.getElementById('sectionTabs').innerHTML=SECTIONS.map(s=>
      `<button class="section-tab${s.id===this.state.section?' active':''}" data-section="${s.id}">${s.label}<span class="section-sub">${s.sub}</span></button>`
    ).join('');
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
  buildModalList(){
    const fmt=side=>side.map(r=>(r.coef>1?`<span class="eq-text">${r.coef}</span>`:'')+r.formula.map(p=>p.sym+(p.sub?`<sub>${p.sub}</sub>`:'')).join('')).join(' <span class="eq-plus">+</span> ');
    this.$.reactionList.innerHTML=REACTIONS.map((rx,i)=>`<div class="reaction-item"><div class="reaction-header"><div class="reaction-name"><span class="reaction-num">${i+1}</span>${rx.name}</div></div><div class="reaction-eq">${fmt(rx.reactants)} <span class="eq-arrow">→</span> ${fmt(rx.products)}</div></div>`).join('');
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
      const ch=e.target.closest('.choice-btn');
      if(ch){this.pickChoice(ch.dataset.choice);return;}
      /* 그림은 매번 다시 그려지므로 버튼에 직접 리스너를 달 수 없다 — 위임으로 받는다 */
      if(e.target.closest('.dia-replay')){this.replayDiagram();return;}
      const th=e.target.closest('#themeBtn'),hi=e.target.closest('#hintBtn'),wn=e.target.closest('#wrongNoteBtn'),sa=e.target.closest('.show-answer-btn');
      const snd=e.target.closest('#soundBtn'),hpt=e.target.closest('#hapticBtn'),lyt=e.target.closest('#layoutBtn');
      const extR=e.target.closest('#exitRetryBtn'),pt=e.target.closest('#periodicBtn');
      if(mt)this.setMode(parseInt(mt.dataset.mode));
      if(bb)this.setActiveBlank(bb.dataset.key);
      if(kb)this.handleKeyPress(kb.dataset.key);
      if(th)this.toggleTheme();
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
        document.body.appendChild(p);setTimeout(()=>p.remove(),800);
      }
      const fl=document.createElement('div');
      Object.assign(fl.style,{position:'fixed',inset:0,zIndex:9999998,background:'linear-gradient(135deg,rgba(255,182,193,.9),rgba(200,162,200,.9))',display:'flex',alignItems:'center',justifyContent:'center',opacity:0,transition:'opacity .5s ease-out',pointerEvents:'none'});
      fl.innerHTML='<div style="font-size:clamp(28px,9vw,80px);text-align:center;padding:0 24px;word-break:keep-all;white-space:normal">💖 깜짝이야! 💖</div>';
      document.body.appendChild(fl);
      setTimeout(()=>fl.style.opacity=1,50);

      setTimeout(()=>{
        fl.style.opacity=0;
        setTimeout(()=>{
          fl.remove();
          try { localStorage.removeItem('chem_auth_v4'); } catch(e) {}
          document.getElementById('authInput').value = '';
          document.getElementById('authOverlay').style.display = 'flex';
        },500);
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
    /* 어두운 배경 탭 시 모달 닫기 (인증 모달 제외) */
    [this.$.hintModalOverlay,this.$.wrongNoteModalOverlay,this.$.periodicModalOverlay].forEach(ov=>{
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
      }
      if(this.$.hintModalOverlay.classList.contains('show')||this.$.wrongNoteModalOverlay.classList.contains('show'))return;
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
      if(e.key>='0'&&e.key<='9')this.handleKeyPress(`NUM_${e.key}`);
      else if(e.key==='Backspace')this.handleKeyPress('DEL');
      else if(e.key==='ArrowLeft')this.handleKeyPress('LEFT');
      else if(e.key==='ArrowRight')this.handleKeyPress('RIGHT');
      else if(e.key==='Enter')this.handleKeyPress(this.state.isAnswerChecked&&!this.state.currentQuestion?.isTimedOut?'NEXT':'CONFIRM');
    });

    const m6o=document.getElementById('m6Outer');
    let tx=0,th2=false;
    m6o.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;th2=false;},{passive:true});
    m6o.addEventListener('touchend',e=>{
      th2=true;const dx=e.changedTouches[0].clientX-tx;
      if(Math.abs(dx)>50){if(dx<0)this.m6Next();else this.m6Prev();}else this.m6Flip();
    });
    m6o.addEventListener('click',()=>{if(!th2)this.m6Flip();th2=false;});

    document.getElementById('m6WrongNoteBtn').addEventListener('click',()=>{
      this.playSound('tap'); this.playHaptic('tap');
      this.renderWrongNotes();this.$.wrongNoteModalOverlay.classList.add('show');
    });
    document.getElementById('retryM6Flashcard').addEventListener('click',()=>{
      this.playSound('tap'); this.playHaptic('tap');
      document.getElementById('retryM6Flashcard').classList.toggle('flipped');
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
  /* 보기 항목은 문자열이거나 {v, note} 객체다. 채점·비교는 언제나 v 문자열로 한다. */
  choiceValue(c){ return typeof c==='string'?c:c.v; },
  initCycleQueue(){
    const mode=this.state.currentMode;
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
    else if(mode===1) pool=Array.from({length: 23}, (_,i)=>i);
    else pool=REACTIONS.map((_,i)=>i);
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
    if(this.$.cycleProgressFill) this.$.cycleProgressFill.style.width=`${total>0?(done/total)*100:0}%`;
  },

  startTimer(){
    clearInterval(this.state.timerInterval);
    this.state.currentMaxTime=this.state.timerDuration;this.state.timerLeft=this.state.currentMaxTime;
    this.$.timerBar.style.transition='none';this.$.timerBar.style.width='100%';this.$.timerBar.classList.remove('danger');

    if(this.state.timerDuration === 0) return;

    void this.$.timerBar.offsetWidth;this.$.timerBar.style.transition='width 0.1s linear, background 0.3s';
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
      if(this.state.timerLeft<=0){this.state.timerLeft=0;clearInterval(this.state.timerInterval);this.$.timerBar.style.width='0%';this.timeOutForceWrong();}
      else{const p=(this.state.timerLeft/this.state.currentMaxTime)*100;this.$.timerBar.style.width=`${p}%`;if(p<30)this.$.timerBar.classList.add('danger');}
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

    if(!preserveCycle) this.initCycleQueue();

    if(isCard){clearInterval(this.state.timerInterval);this.m6GenCards();this.m6Render();return;}
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

    const useCycle=this.state.isCycleMode&&this.state.currentMode!==6;
    const pickIndex=(pool)=>{
      if(useCycle){
        if(this.state.cycleQueue.length===0) this.initCycleQueue();
        return this.state.cycleQueue.shift();
      }
      let idx=Math.floor(Math.random()*pool.length);
      if(pool.length>1&&this.state.lastQuestionName){
        let tries=0;
        while(pool[idx].name===this.state.lastQuestionName&&tries<10){idx=Math.floor(Math.random()*pool.length);tries++;}
      }
      return idx;
    };

    switch(this.state.currentMode){
      case 1:
        let isTemplate = false; let rxIdx = 0;
        if(useCycle) {
          const idx = pickIndex(Array.from({length: 23}, (_,i)=>i));
          if(idx < COEF_TEMPLATES.length) { isTemplate = true; rxIdx = idx; }
          else { isTemplate = false; rxIdx = idx - COEF_TEMPLATES.length; }
        } else {
          isTemplate = Math.random() < 0.5;
          if(isTemplate) rxIdx = Math.floor(Math.random() * COEF_TEMPLATES.length);
          else {
            rxIdx = Math.floor(Math.random() * REACTIONS.length);
            if(REACTIONS.length > 1 && this.state.lastQuestionName) {
              let t2=0; while(REACTIONS[rxIdx].name === this.state.lastQuestionName && t2<10) { rxIdx=Math.floor(Math.random()*REACTIONS.length); t2++; }
            }
          }
        }
        if(isTemplate){
          const tmpl = COEF_TEMPLATES[rxIdx];
          const data = tmpl.gen(); q.name = tmpl.label; q.isAbstract = true;
          q.displayReactants = data.fmt.map(f=>({...f})); q.displayProducts = data.fmtP.map(f=>({...f}));
        } else {
          const rx = REACTIONS[rxIdx]; q.name = rx.name; q.isAbstract = false;
          q.displayReactants = rx.reactants.map(f=>({...f})); q.displayProducts = rx.products.map(f=>({...f}));
        }
        q.displayReactants.forEach((r,i)=>q.blanks.push({key:`R${i}`,answer:r.coef.toString()}));
        q.displayProducts.forEach((p,i)=>q.blanks.push({key:`P${i}`,answer:p.coef.toString()}));
        q.type='계수 맞추기';
        break;
      case 2:{const idx=pickIndex(REACTIONS);const rx=REACTIONS[idx];q.reaction=rx;q.name=rx.name;q.type='반응물 맞추기';q.isAbstract=false;q.displayReactants=rx.reactants.map(r=>({...r,isBlank:true}));q.displayProducts=rx.products.map(p=>({...p,isBlank:false}));rx.reactants.forEach((r,i)=>q.blanks.push({key:`R${i}`,answer:f2s(r)}));break;}
      case 3:{const idx=pickIndex(REACTIONS);const rx=REACTIONS[idx];q.reaction=rx;q.name=rx.name;q.type='생성물 맞추기';q.isAbstract=false;q.displayReactants=rx.reactants.map(r=>({...r,isBlank:false}));q.displayProducts=rx.products.map(p=>({...p,isBlank:true}));rx.products.forEach((p,i)=>q.blanks.push({key:`P${i}`,answer:f2s(p)}));break;}
      case 4:{const idx=pickIndex(REACTIONS);const rx=REACTIONS[idx];q.reaction=rx;q.name=rx.name;q.type='전체 반응식';q.isAbstract=false;q.displayReactants=rx.reactants.map(r=>({...r,isBlank:true}));q.displayProducts=rx.products.map(p=>({...p,isBlank:true}));rx.reactants.forEach((r,i)=>q.blanks.push({key:`R${i}`,answer:f2s(r)}));rx.products.forEach((p,i)=>q.blanks.push({key:`P${i}`,answer:f2s(p)}));break;}
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
        const idx=pickIndex(pool);const item=pool[idx];
        const el=ELEMENTS.find(x=>x.z===item.z);
        q.type='이온 되기';q.isMode9=true;q.isAbstract=false;
        q.name=el.name;q.z=el.z;q.sym=el.sym;q.shells=shellsOf(el.z);q.ion=item;
        const ans=this.ionAnswerText(item);
        q.choices=this.ionChoices(item,ans);
        q.blanks.push({key:'M9',answer:ans});
        break;
      }
      case 13:{
        const idx=pickIndex(PRECIPITATES);const p=PRECIPITATES[idx];
        q.type='앙금 생성';q.isMode13=true;q.isAbstract=false;
        /* 제목은 오답노트 목록에 그대로 뜬다 — 식을 쓰면 ^가 노출되므로 한글 이름으로 짓는다 */
        q.name=`${ionKo(p.a)} + ${ionKo(p.b)}`;q.pIdx=idx;
        q.sub='두 이온을 섞으면?';
        q.choices=['흰색 앙금','노란색 앙금','검은색 앙금','앙금이 생기지 않는다'];
        q.blanks.push({key:'M13',answer:p.none?'앙금이 생기지 않는다':p.color+' 앙금'});
        break;
      }
      case 14:{
        const idx=pickIndex(ORBITAL_KINDS);const o=ORBITAL_KINDS[idx];
        q.type='오비탈 개수';q.isMode14=true;q.isAbstract=false;
        q.name=`${o.kind} 오비탈`;q.orb=o;
        q.blanks.push({key:'M14',answer:String(o.count)});
        break;
      }
      case 15:{
        const idx=pickIndex(ORBITAL_SHELLS);const o=ORBITAL_SHELLS[idx];
        q.type='껍질 최대 전자';q.isMode15=true;q.isAbstract=false;
        q.name=`${o.name} 껍질 (n=${o.n})`;q.orb=o;
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
        const idx=pickIndex(pool);const bd=pool[idx];
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
    }
    this.state.lastQuestionName=q.name;
    if(q.blanks.length>0)q.activeKey=q.blanks[0].key;
    this.state.currentQuestion=q;
    this.syncElemRow(this.state.currentMode,q);
    this.renderCycleProgress();
    this.renderAll();this.startTimer();
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
    const fmt=side=>side.map(c=>(c.coef>1?`<span class="eq-text">${c.coef}</span>`:'')+c.formula.map(p=>p.sym+(p.sub?`<sub>${p.sub}</sub>`:'')).join('')).join(' <span class="eq-plus">+</span> ');
    let h='';
    if(q.isMode5){h=`<span class="eq-text" style="font-size:20px;font-weight:bold;color:var(--c-correct)">${this.formatInput(q.blanks[0].answer)}</span>`;}
    else if(q.isMode7){
      const el=PT_QUIZ_ELEMENTS.find(e=>e.z===q.z);
      h=`<span class="eq-text" style="font-size:20px;font-weight:bold;color:var(--c-correct)">${q.sym} · ${el?`${el.period}주기 ${el.group}족`:''}</span>`;
    }
    else if(q.isMode13){
      const p=PRECIPITATES[q.pIdx];
      h=`<span class="eq-text" style="font-size:18px;font-weight:bold;color:var(--c-correct)">`+
        `${this.formatInput(p.a)} + ${this.formatInput(p.b)} → `+
        (p.none?'앙금 없음':`${this.fmtFormulaStr(p.f)} (${p.name}, ${p.color})`)+`</span>`;
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
      const r=q.displayReactants.map((c,i)=>{const bd=q.blanks.find(b=>b.key===`R${i}`); return(bd?`<span class="eq-text">${bd.answer}</span>`:'')+this.formatFormula(c.formula);}).join(' <span class="eq-plus">+</span> ');
      const p=q.displayProducts.map((c,i)=>{const bd=q.blanks.find(b=>b.key===`P${i}`); return(bd?`<span class="eq-text">${bd.answer}</span>`:'')+this.formatFormula(c.formula);}).join(' <span class="eq-plus">+</span> ');
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
  hasDiagram(q){ return !!(q&&(q.isMode8||q.isMode9||q.isMode10||q.isMode12||q.isMode13||q.isMode14||q.isMode15)); },
  renderExplain(){
    const box=document.getElementById('explainBox');
    if(!box) return;
    const q=this.state.currentQuestion;
    const revealed=this.state.isAnswerChecked&&!q?.isTimedOut;
    if(!revealed||!this.state.showDiagram||!this.hasDiagram(q)){box.innerHTML='';return;}
    if(q.isMode10) box.innerHTML=bondDiagramHTML(this.bondOf(q));
    else if(q.isMode13){
      const p=PRECIPITATES[q.pIdx];
      box.innerHTML=`<div class="dia-wrap"><p class="dia-exp">`+(p.none
        ? `${this.formatInput(p.a)}과 ${this.formatInput(p.b)}은 만나도 <b>앙금이 생기지 않는다</b>. `+
          `1족 이온이나 질산 이온이 든 염은 물에 잘 녹기 때문이다.`
        : `${this.formatInput(p.a)} + ${this.formatInput(p.b)} → <b>${this.fmtFormulaStr(p.f)}</b> `+
          `(${p.name}) — <b>${p.color}</b> 앙금이 가라앉는다.`)+`</p></div>`;
    }
    else if(q.isMode14){
      const o=q.orb;
      box.innerHTML=`<div class="dia-wrap"><p class="dia-exp">`+
        `<b>${o.kind}</b> 오비탈은 한 껍질에 <b>${o.count}개</b> 있고, 오비탈 하나에 전자가 2개씩 들어가므로 `+
        `모두 <b>${o.max}개</b>를 담는다.</p></div>`;
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
  /* 「다시 보기」 — 그림 HTML을 다시 렌더하면 CSS 애니메이션이 처음부터 재생된다.
     별도 재생 제어가 필요 없다. */
  replayDiagram(){ this.playSound('tap'); this.playHaptic('tap'); this.renderExplain(); },
  /* 원자가 전자 해설 — 18족 답이 0인 이유를 여기서 설명하지 않으면
     껍질에 8개가 그려져 있는데 답은 0이라 학생 눈에는 오류로 보인다. */
  valenceExplain(q){
    const outer=outerShellOf(q.z), v=valenceOf(q.z), shell='KLMN'[q.shells.length-1];
    if(v===0)
      return `${q.name}은 바깥 껍질(${shell})에 전자가 <b>${outer}개</b> 있어 이미 꽉 찼다. `+
             `꽉 찬 껍질의 전자는 결합에 쓰이지 않으므로 <b>원자가 전자는 0개</b>다.`;
    return `${q.name}은 바깥 껍질(${shell})에 전자가 <b>${outer}개</b> 있고 이 전자들이 결합에 참여하므로, `+
           `<b>원자가 전자는 ${v}개</b>다.`;
  },
  /* 이온 되기 해설 — 주고받는 개수가 "그냥 외우는 숫자"가 아니라
     비활성 기체와 같은 배치가 되는 개수라는 점이 핵심이다. */
  ionExplain(q){
    const ion=q.ion;
    if(!ion) return '';
    if(ion.noble)
      return `${q.name}은 바깥 껍질이 이미 꽉 차 <b>원자가 전자가 0개</b>다. `+
             `주고받을 전자가 없으니 <b>이온이 되지 않는다</b>.`;
    const target=ionTargetNoble(ion);
    const like=target?`<b>${target.name}(${target.sym})과 같은 배치</b>`:'꽉 찬 배치';
    if(q.z===1)
      return `수소는 전자가 <b>1개뿐</b>이라 그걸 잃으면 껍질에 남는 전자가 없다. `+
             `전자 <b>1개를 얻어</b> K 껍질을 2개로 채우면 ${like}가 되어 안정해진다. `+
             `<span class="later-note">수소가 전자를 잃어 H<sup>+</sup>가 되는 것은 산을 배울 때 다시 나온다.</span>`;
    return `원자가 전자 <b>${valenceOf(q.z)}개</b>인 ${q.name}은 전자 <b>${ion.n}개</b>를 `+
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
    const bump=el=>{el.classList.add('bump');setTimeout(()=>el.classList.remove('bump'),200);};
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
      const p=PRECIPITATES[q.pIdx];
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
      const unit=q.isMode14?'개':'개';
      this.$.equationDisplay.innerHTML=
        `<span class="eq-term">${this.renderBlankBox(key,q.blanks[0].answer)}<span class="eq-text eq-unit">${unit}</span></span>`;
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
      let term;
      if(this.state.currentMode===1)term=bd?this.renderBlankBox(key,bd.answer)+this.formatFormula(c.formula):this.formatFormula(c.formula);
      else if(c.isBlank||bd)term=this.renderBlankBox(key,bd?bd.answer:'');
      else term=(c.coef>1?`<span class="eq-text">${c.coef}</span>`:'')+this.formatFormula(c.formula);
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
      if(this.state.isAnswerRevealed&&!ok)disp=this.formatInput(answer);
      else disp=this.formatInput(inp);
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
      return `<button class="choice-btn${v===picked?' picked':''}"${locked?' disabled':''} data-choice="${v}">`+
             `<span class="choice-main">${v}</span>`+
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
  m6Fmt(side){return side.map(r=>(r.coef>1?r.coef:'')+r.formula.map(p=>p.sym+(p.sub?`<sub>${p.sub}</sub>`:'')).join('')).join(' + ');},
  /* 카드 유형(t)에서 카드 배열만 순수하게 만들어낸다 — 오답노트 재풀이(renderRetryFlashcard)에서도
     실제 mode6 세션 상태(state.m6Cards/m6Index)를 건드리지 않고 재사용하기 위해 분리 */
  /* 카드 유형 정의 — 구역마다 다루는 내용이 다르므로 MODES[n].cards로 어떤 유형을 쓸지 고른다 */
  m6TypeLabel(t){
    return {full:'전체 반응식',reactant:'반응물',product:'생성물',formula:'화학식',
            bond:'결합 그림',group:'주기·족',ion:'이온식',order:'결합 차수',
            precip:'앙금',orbital:'오비탈'}[t]||t;
  },
  m6BuildCards(t){
    let cards=[];
    if(t==='bond'){
      cards=BONDS.map(b=>({ftag:'물질명',fhtml:`<span class="m6-korean">${b.name}</span><div class="m6-formula" style="font-size:.7em;opacity:.7">${this.fmtFormulaStr(b.f)}</div>`,
        btag:b.type==='ionic'?'이온 결합':'공유 결합',bhtml:bondDiagramHTML(b)}));
    }
    else if(t==='group'){
      cards=PT_QUIZ_ELEMENTS.map(e=>({ftag:'원소',fhtml:`<span class="m6-korean">${e.name} (${e.sym})</span>`,
        btag:'주기 · 족',bhtml:`<span class="m6-formula">${e.period}주기 ${e.group}족</span>`}));
    }
    else if(t==='ion'){
      cards=IONS_WRITE.map(i=>({ftag:'이온 이름',fhtml:`<span class="m6-korean">${i.name}</span>`,
        btag:'이온식',bhtml:`<span class="m6-formula">${this.formatInput(i.f)}</span>`}));
    }
    else if(t==='order'){
      cards=this.orderPool().map(b=>({ftag:'물질',fhtml:`<span class="m6-korean">${b.name}</span><div class="m6-formula" style="font-size:.7em;opacity:.7">${this.fmtFormulaStr(b.f)}</div>`,
        btag:'결합 차수',bhtml:`<span class="m6-formula">${BOND_ORDER_NAME[b.ligands[0].pairs]}</span>`}));
    }
    else if(t==='precip'){
      cards=PRECIPITATES.map(p=>({ftag:'두 이온을 섞으면?',fhtml:`<span class="m6-formula">${this.formatInput(p.a)} + ${this.formatInput(p.b)}</span>`,
        btag:p.none?'앙금 없음':'앙금',
        bhtml:`<span class="m6-formula">${p.none?'물에 잘 녹아 앙금이 생기지 않는다':`${this.fmtFormulaStr(p.f)}<br><span style="font-size:.7em">${p.name} · ${p.color}</span>`}</span>`}));
    }
    else if(t==='orbital'){
      cards=ORBITAL_SHELLS.map(o=>({ftag:'껍질',fhtml:`<span class="m6-korean">${o.name} 껍질 (n=${o.n})</span>`,
        btag:'최대 전자 수',bhtml:`<span class="m6-formula">${o.max}개<br><span style="font-size:.6em">${o.make} · 2×${o.n}²</span></span>`}))
        .concat(ORBITAL_KINDS.map(o=>({ftag:'오비탈',fhtml:`<span class="m6-korean">${o.kind} 오비탈</span>`,
        btag:'개수 · 최대 전자',bhtml:`<span class="m6-formula">${o.count}개 · 전자 ${o.max}개</span>`})));
    }
    else if(t==='full'){cards=REACTIONS.map(rx=>({ftag:'한글 반응식',fhtml:`<span class="m6-korean">${rx.name}</span>`,btag:'화학 반응식',bhtml:`<span class="m6-formula">${this.m6Fmt(rx.reactants)} → ${this.m6Fmt(rx.products)}</span>`}));}
    else if(t==='reactant'){cards=REACTIONS.map(rx=>({ftag:'반응물 이름',fhtml:`<span class="m6-korean">${rx.name}</span>`,btag:'반응물 화학식',bhtml:`<span class="m6-formula">${this.m6Fmt(rx.reactants)}</span>`}));}
    else if(t==='product'){cards=REACTIONS.map(rx=>({ftag:'생성물 이름',fhtml:`<span class="m6-korean">${rx.name}</span>`,btag:'생성물 화학식',bhtml:`<span class="m6-formula">${this.m6Fmt(rx.products)}</span>`}));}
    else{cards=CHEMICALS.map(c=>({ftag:'물질명',fhtml:`<span class="m6-korean">${c.name}</span>`,btag:'화학식',bhtml:`<span class="m6-formula">${c.formula.map(p=>p.sym+(p.sub?`<sub>${p.sub}</sub>`:'')).join('')}</span>`}));}
    return cards;
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
    document.getElementById('m6PFill').style.width=`${((m6Index+1)/m6Cards.length)*100}%`;
    this.m6SyncSaveBtn();
    if(dir){const o=document.getElementById('m6Outer'),cls=dir==='next'?'m6-slide-r':'m6-slide-l';o.classList.remove('m6-slide-r','m6-slide-l');void o.offsetWidth;o.classList.add(cls);}
  },
  m6Flip(){this.playSound('tap'); this.playHaptic('tap'); this.state.m6Flipped=!this.state.m6Flipped;document.getElementById('m6Card').classList.toggle('flipped',this.state.m6Flipped);},
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
    const qData={m6Type:this.state.m6Type,m6Order:this.state.m6Order,cardIndex:this.state.m6Index,title};
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
    document.querySelectorAll('#m6TypeBtns .m6-opt-btn').forEach(b=>b.classList.toggle('active',b.dataset.val===this.state.m6Type));
    this.state.m6Order=q.m6Order||'korean';
    document.querySelectorAll('#m6OrderBtns .m6-opt-btn').forEach(b=>b.classList.toggle('active',b.dataset.val===this.state.m6Order));
    this.m6GenCards();
    this.state.m6Index=Math.min(q.cardIndex||0,this.state.m6Cards.length-1);
    this.m6Render();
  },

  formatFormula(f){return f.map(p=>p.sym+(p.sub?`<sub>${p.sub}</sub>`:'')).join('');},
  /* BONDS의 화학식은 'CaCl2' 같은 문자열이다 — 숫자를 아래첨자로 바꾼다 */
  fmtFormulaStr(s){return String(s).replace(/(\d+)/g,'<sub>$1</sub>');},
  toggleTheme(){
    this.playSound('tap'); this.state.isDarkMode=!this.state.isDarkMode;document.body.classList.toggle('light',!this.state.isDarkMode);document.getElementById('themeBtn').textContent=this.state.isDarkMode?'🌙':'☀️';
    /* 열려 있는 상세 패널의 헤더 색은 테마별 팔레트를 쓰므로, 테마 전환 시 다시 그려 새 팔레트를 즉시 반영 */
    [this.$.ptDetailPanel,this.$.ptFsDetailPanel].forEach(panel=>{
      if(panel&&panel.classList.contains('open')){
        const e=ELEMENTS.find(x=>x.z===parseInt(panel.dataset.z));
        if(e) panel.querySelector('.pt-detail-content').innerHTML=this.ptDetailHTML(e);
      }
    });
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
    content.style.transition='';
    this.ptZoom={scale:1,tx:0,ty:0,baseFit:1,vpW:1,vpH:1,cw:1,ch:1};
    document.getElementById('ptFullscreen').classList.add('show');
    this.layoutPtFullscreen();
  },
  closePtFullscreen(){
    document.getElementById('ptFullscreen').classList.remove('show');
    this.closePtDetail(this.$.ptFsDetailPanel);
  },
  /* 원소 상세 설명 패널: 기호·이름·원자번호 헤더 + desc 본문.
     기호·이름 글자색은 주기율표 칸의 분류 색(PT_CAT_COLORS)과 맞춰 어떤 칸을 눌렀는지 한눈에 이어지게 함 */
  ptDetailHTML(e){
    const palette=this.state.isDarkMode?PT_CAT_COLORS:PT_CAT_COLORS_LIGHT;
    const catColor=palette[e.cat]||'var(--c-accent-1)';
    return `<div class="pt-detail-head"><span class="pt-detail-z">${e.z}</span><span class="pt-detail-sym" style="color:${catColor}">${e.sym}</span><span class="pt-detail-name" style="color:${catColor}">${e.name}</span><button class="pt-detail-close" aria-label="닫기">✕</button></div><p class="pt-detail-desc">${e.desc||''}</p>`;
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
    const h=isOpen ? panel.querySelector('.pt-detail-content').scrollHeight : 0;
    if(panel===this.$.ptDetailPanel){
      this.$.periodicContent.style.paddingBottom = h ? (h+16)+'px' : '';
    } else if(panel===this.$.ptFsDetailPanel && document.getElementById('ptFullscreen').classList.contains('show')){
      /* layoutPtFullscreen이 다시 계산하는 배율(baseFit)은 transform으로 즉시 적용되므로,
         ptZoomReset과 같은 방식으로 잠깐 transition을 걸어 표 전체가 뚝 끊기지 않고 부드럽게 커지고/줄어들게 한다 */
      const fsEl=document.getElementById('ptFsContent');
      fsEl.style.transition='transform .3s ease';
      clearTimeout(this._ptResetTimer);
      this._ptResetTimer=setTimeout(()=>{fsEl.style.transition='';},320);
      this.layoutPtFullscreen(h);
    }
  },
  /* 회전 뷰의 열 폭·행 높이·폰트를 실측 픽셀 하나(cell)로 통일 계산해 인라인 적용.
     같은 cell 값에서 열폭·행높이·폰트를 전부 파생시켜 어떤 화면에서도 서로 맞물리게 한다.
     gap(4px)까지 정산해 실제 콘텐츠가 뷰포트를 넘지 않게 하고, 넘으면 baseFit로 축소해
     기본 배율(scale=1)에서 항상 전부 보이게 만든다. */
  layoutPtFullscreen(reserveBottom=0){
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
    /* 주입·사이징 후 실제 콘텐츠(그리드+불꽃반응 행)를 실측해 baseFit 산출 */
    const extra=scrollEl.querySelector('.pt-extra-row');
    let cw=grid.offsetWidth, ch=grid.offsetHeight;
    if(extra){ cw=Math.max(cw, extra.offsetWidth); ch=grid.offsetHeight+extra.offsetHeight+12; }
    const vpW=vp.clientWidth||1, vpH=Math.max(1,(vp.clientHeight||1)-reserveBottom);
    const z=this.ptZoom||(this.ptZoom={scale:1,tx:0,ty:0});
    z.baseFit=Math.min(vpW/cw, vpH/ch, 1);
    z.vpW=vpW; z.vpH=vpH; z.cw=cw; z.ch=ch; z.scale=1;
    this.clampPtZoom(); this.applyPtZoom();
  },
  /* 줌 레이어에 transform 적용. transform만 바꾸므로 리페인트/리플로우 없이 GPU 합성만.
     translate3d(3D 변환)로 오버레이가 열려 있는 동안 레이어를 상시 승격시켜, will-change를
     껐다 켤 때 생기던 승격/강등 재래스터화 플래시(=이따금 깜빡임)를 없앤다. */
  applyPtZoom(){
    const z=this.ptZoom; if(!z) return;
    const S=z.baseFit*z.scale;
    document.getElementById('ptFsContent').style.transform=`translate3d(${z.tx}px,${z.ty}px,0) scale(${S})`;
  },
  /* 콘텐츠가 뷰포트를 벗어나지 않게 tx/ty 클램프. 콘텐츠는 뷰포트 크기 레이어 안에 중앙정렬돼
     있으므로 그 중앙 오프셋(ox,oy)까지 감안한다. 렌더 크기가 뷰포트보다 작으면 정확히 중앙 고정. */
  clampPtZoom(){
    const z=this.ptZoom; if(!z) return;
    const S=z.baseFit*z.scale, vpW=z.vpW, vpH=z.vpH, cw=z.cw, ch=z.ch;
    const rw=cw*S, rh=ch*S;               /* 화면에 렌더되는 콘텐츠 크기 */
    const ox=(vpW-cw)/2*S, oy=(vpH-ch)/2*S; /* 레이어 안 콘텐츠 중앙정렬 오프셋(스케일 반영) */
    if(rw<=vpW){ z.tx=(vpW-rw)/2-ox; }
    else { let l=z.tx+ox; l=Math.min(0,Math.max(vpW-rw,l)); z.tx=l-ox; }
    if(rh<=vpH){ z.ty=(vpH-rh)/2-oy; }
    else { let t=z.ty+oy; t=Math.min(0,Math.max(vpH-rh,t)); z.ty=t-oy; }
  },
  ptZoomReset(){
    const z=this.ptZoom; if(!z) return;
    const el=document.getElementById('ptFsContent');
    el.style.transition='transform .25s ease';
    clearTimeout(this._ptResetTimer);
    this._ptResetTimer=setTimeout(()=>{el.style.transition='';},280);
    z.scale=1; this.clampPtZoom(); this.applyPtZoom();
    this.playSound('tap'); this.playHaptic('tap');
  },
  /* 회전 뷰 자체 핀치/팬/더블탭 줌 — 네이티브 줌(고정+회전 요소 재래스터화로 버벅/깜빡) 대신
     transform:scale만 GPU로 걸어 매끈하게. 화면 좌표를 90° 역회전해 가로(로컬) 공간으로 매핑. */
  setupPtZoom(){
    const vp=document.getElementById('ptFsViewport');
    const rotor=document.querySelector('.pt-fs-rotor');
    if(!vp||!rotor) return;
    let mode=null, startDist=0, startScale=1, focal=null, lastMid=null, lastPan=null, lastTap=0, tapStart=null;
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
        z.tx+=dy; z.ty+=-dx; this.clampPtZoom(); this.applyPtZoom(); e.preventDefault();
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
        if(this.ptZoom.scale<=1.001){ this.ptZoom.scale=1; this.clampPtZoom(); this.applyPtZoom(); }
        mode=null;
      } else if(e.touches.length===1&&mode==='pinch'){
        mode=this.ptZoom.scale>1.001?'pan':null;
        lastPan={x:e.touches[0].clientX,y:e.touches[0].clientY};
      }
    };
    vp.addEventListener('touchend',end,{passive:false});
    vp.addEventListener('touchcancel',end,{passive:false});
    vp.addEventListener('gesturestart',e=>e.preventDefault());
  }
};

document.addEventListener('DOMContentLoaded',()=>App.init());
