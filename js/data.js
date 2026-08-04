/* ── 데이터 ── */
const DEFAULT_TIMER=20000;
const REACTIONS=[
  {name:"일산화탄소 + 산소 → 이산화탄소",reactants:[{coef:2,formula:[{sym:"CO"}]},{coef:1,formula:[{sym:"O",sub:2}]}],products:[{coef:2,formula:[{sym:"CO",sub:2}]}]},
  {name:"메테인 + 산소 → 이산화탄소 + 물",reactants:[{coef:1,formula:[{sym:"CH",sub:4}]},{coef:2,formula:[{sym:"O",sub:2}]}],products:[{coef:1,formula:[{sym:"CO",sub:2}]},{coef:2,formula:[{sym:"H",sub:2},{sym:"O"}]}]},
  {name:"구리 + 산소 → 산화구리(Ⅱ)",reactants:[{coef:2,formula:[{sym:"Cu"}]},{coef:1,formula:[{sym:"O",sub:2}]}],products:[{coef:2,formula:[{sym:"Cu"},{sym:"O"}]}]},
  {name:"과산화수소 → 물 + 산소",reactants:[{coef:2,formula:[{sym:"H",sub:2},{sym:"O",sub:2}]}],products:[{coef:2,formula:[{sym:"H",sub:2},{sym:"O"}]},{coef:1,formula:[{sym:"O",sub:2}]}]},
  {name:"수소 + 염소 → 염화수소",reactants:[{coef:1,formula:[{sym:"H",sub:2}]},{coef:1,formula:[{sym:"Cl",sub:2}]}],products:[{coef:2,formula:[{sym:"H"},{sym:"Cl"}]}]},
  {name:"마그네슘 + 산소 → 산화마그네슘",reactants:[{coef:2,formula:[{sym:"Mg"}]},{coef:1,formula:[{sym:"O",sub:2}]}],products:[{coef:2,formula:[{sym:"Mg"},{sym:"O"}]}]},
  {name:"질소 + 산소 → 이산화질소",reactants:[{coef:1,formula:[{sym:"N",sub:2}]},{coef:2,formula:[{sym:"O",sub:2}]}],products:[{coef:2,formula:[{sym:"N"},{sym:"O",sub:2}]}]},
  {name:"질소 + 수소 → 암모니아",reactants:[{coef:1,formula:[{sym:"N",sub:2}]},{coef:3,formula:[{sym:"H",sub:2}]}],products:[{coef:2,formula:[{sym:"N"},{sym:"H",sub:3}]}]},
  {name:"에탄올 + 산소 → 이산화탄소 + 물",reactants:[{coef:1,formula:[{sym:"C",sub:2},{sym:"H",sub:5},{sym:"O"},{sym:"H"}]},{coef:3,formula:[{sym:"O",sub:2}]}],products:[{coef:2,formula:[{sym:"CO",sub:2}]},{coef:3,formula:[{sym:"H",sub:2},{sym:"O"}]}]},
  {name:"탄산나트륨 + 염화칼슘 → 염화나트륨 + 탄산칼슘",reactants:[{coef:1,formula:[{sym:"Na",sub:2},{sym:"CO",sub:3}]},{coef:1,formula:[{sym:"Ca"},{sym:"Cl",sub:2}]}],products:[{coef:2,formula:[{sym:"Na"},{sym:"Cl"}]},{coef:1,formula:[{sym:"Ca"},{sym:"CO",sub:3}]}]},
  {name:"탄산수소나트륨 → 탄산나트륨 + 이산화탄소 + 물",reactants:[{coef:2,formula:[{sym:"Na"},{sym:"H"},{sym:"CO",sub:3}]}],products:[{coef:1,formula:[{sym:"Na",sub:2},{sym:"CO",sub:3}]},{coef:1,formula:[{sym:"CO",sub:2}]},{coef:1,formula:[{sym:"H",sub:2},{sym:"O"}]}]},
  {name:"프로페인 + 산소 → 이산화탄소 + 물",reactants:[{coef:1,formula:[{sym:"C",sub:3},{sym:"H",sub:8}]},{coef:5,formula:[{sym:"O",sub:2}]}],products:[{coef:3,formula:[{sym:"CO",sub:2}]},{coef:4,formula:[{sym:"H",sub:2},{sym:"O"}]}]},
  {name:"뷰테인 + 산소 → 이산화탄소 + 물",reactants:[{coef:2,formula:[{sym:"C",sub:4},{sym:"H",sub:10}]},{coef:13,formula:[{sym:"O",sub:2}]}],products:[{coef:8,formula:[{sym:"CO",sub:2}]},{coef:10,formula:[{sym:"H",sub:2},{sym:"O"}]}]},
  {name:"마그네슘 + 염산 → 염화마그네슘 + 수소",reactants:[{coef:1,formula:[{sym:"Mg"}]},{coef:2,formula:[{sym:"H"},{sym:"Cl"}]}],products:[{coef:1,formula:[{sym:"Mg"},{sym:"Cl",sub:2}]},{coef:1,formula:[{sym:"H",sub:2}]}]},
  {name:"탄산칼슘 + 염산 → 염화칼슘 + 물 + 이산화탄소",reactants:[{coef:1,formula:[{sym:"Ca"},{sym:"CO",sub:3}]},{coef:2,formula:[{sym:"H"},{sym:"Cl"}]}],products:[{coef:1,formula:[{sym:"Ca"},{sym:"Cl",sub:2}]},{coef:1,formula:[{sym:"H",sub:2},{sym:"O"}]},{coef:1,formula:[{sym:"CO",sub:2}]}]},
  {name:"염화나트륨 + 질산은 → 질산나트륨 + 염화은",reactants:[{coef:1,formula:[{sym:"Na"},{sym:"Cl"}]},{coef:1,formula:[{sym:"Ag"},{sym:"NO",sub:3}]}],products:[{coef:1,formula:[{sym:"Na"},{sym:"NO",sub:3}]},{coef:1,formula:[{sym:"Ag"},{sym:"Cl"}]}]}
];
const CHEMICALS=[
  {name:"일산화탄소",formula:[{sym:"CO"}]},{name:"이산화탄소",formula:[{sym:"CO",sub:2}]},
  {name:"산소",formula:[{sym:"O",sub:2}]},{name:"물",formula:[{sym:"H",sub:2},{sym:"O"}]},
  {name:"메테인",formula:[{sym:"CH",sub:4}]},{name:"구리",formula:[{sym:"Cu"}]},
  {name:"산화구리(Ⅱ)",formula:[{sym:"Cu"},{sym:"O"}]},{name:"과산화수소",formula:[{sym:"H",sub:2},{sym:"O",sub:2}]},
  {name:"수소",formula:[{sym:"H",sub:2}]},{name:"염소",formula:[{sym:"Cl",sub:2}]},
  {name:"염화수소(염산)",formula:[{sym:"H"},{sym:"Cl"}]},{name:"마그네슘",formula:[{sym:"Mg"}]},
  {name:"산화마그네슘",formula:[{sym:"Mg"},{sym:"O"}]},{name:"염화마그네슘",formula:[{sym:"Mg"},{sym:"Cl",sub:2}]},
  {name:"질소",formula:[{sym:"N",sub:2}]},{name:"이산화질소",formula:[{sym:"N"},{sym:"O",sub:2}]},
  {name:"암모니아",formula:[{sym:"N"},{sym:"H",sub:3}]},{name:"에탄올",formula:[{sym:"C",sub:2},{sym:"H",sub:5},{sym:"O"},{sym:"H"}]},
  {name:"탄산나트륨",formula:[{sym:"Na",sub:2},{sym:"CO",sub:3}]},{name:"염화칼슘",formula:[{sym:"Ca"},{sym:"Cl",sub:2}]},
  {name:"염화나트륨",formula:[{sym:"Na"},{sym:"Cl"}]},{name:"탄산칼슘",formula:[{sym:"Ca"},{sym:"CO",sub:3}]},
  {name:"탄산수소나트륨",formula:[{sym:"Na"},{sym:"H"},{sym:"CO",sub:3}]},{name:"질산은",formula:[{sym:"Ag"},{sym:"NO",sub:3}]},
  {name:"염화은",formula:[{sym:"Ag"},{sym:"Cl"}]},{name:"질산나트륨",formula:[{sym:"Na"},{sym:"NO",sub:3}]},
  {name:"프로페인",formula:[{sym:"C",sub:3},{sym:"H",sub:8}]},{name:"뷰테인",formula:[{sym:"C",sub:4},{sym:"H",sub:10}]},
  {name:"황",formula:[{sym:"S"}]},{name:"인",formula:[{sym:"P"}]}
];
const COEF_TEMPLATES=[
  {label:"A₂ + B₂ → AB₂",gen:()=>({fmt:[{coef:1,formula:[{sym:"A",sub:2}]},{coef:2,formula:[{sym:"B",sub:2}]}],fmtP:[{coef:2,formula:[{sym:"A"},{sym:"B",sub:2}]}]})},
  {label:"A₃ + B₂ → A₆B",gen:()=>({fmt:[{coef:4,formula:[{sym:"A",sub:3}]},{coef:1,formula:[{sym:"B",sub:2}]}],fmtP:[{coef:2,formula:[{sym:"A",sub:6},{sym:"B"}]}]})},
  {label:"A₂ + B₃ → A₂B",gen:()=>({fmt:[{coef:3,formula:[{sym:"A",sub:2}]},{coef:1,formula:[{sym:"B",sub:3}]}],fmtP:[{coef:3,formula:[{sym:"A",sub:2},{sym:"B"}]}]})},
  {label:"A + B₃ → A₃B",gen:()=>({fmt:[{coef:9,formula:[{sym:"A"}]},{coef:1,formula:[{sym:"B",sub:3}]}],fmtP:[{coef:3,formula:[{sym:"A",sub:3},{sym:"B"}]}]})},
  {label:"A₃ + B → AB₂",gen:()=>({fmt:[{coef:1,formula:[{sym:"A",sub:3}]},{coef:6,formula:[{sym:"B"}]}],fmtP:[{coef:3,formula:[{sym:"A"},{sym:"B",sub:2}]}]})},
  {label:"A₂ + B → AB₃",gen:()=>({fmt:[{coef:1,formula:[{sym:"A",sub:2}]},{coef:6,formula:[{sym:"B"}]}],fmtP:[{coef:2,formula:[{sym:"A"},{sym:"B",sub:3}]}]})},
  {label:"A + B₂ → A₂B₃",gen:()=>({fmt:[{coef:4,formula:[{sym:"A"}]},{coef:3,formula:[{sym:"B",sub:2}]}],fmtP:[{coef:2,formula:[{sym:"A",sub:2},{sym:"B",sub:3}]}]})}
];
const CORE_ELEMENTS=['H','C','O','N','S','P','Na','Mg','Ca','Cu','Ag','Cl','A','B'];
/* MODE_NAMES / MODE_ICONS는 js/curriculum.js의 MODES에서 파생된다 */

/* z=원자번호, sym=원소기호, name=한글이름, cat=분류(색상), group=족(1~18), period=주기(1~7), f=란타넘족/악티늄족일 때의 순번(1~15) */
const ELEMENTS=[
  {z:1,sym:'H',name:'수소',cat:'nonmetal',group:1,period:1,desc:'수소는 <strong>공유결합</strong>으로 동일 원소끼리 이원자 분자(<strong>H₂</strong>)를 이루며, 다른 비금속과도 전자쌍을 공유하는 <strong>공유결합</strong>을 주로 만든다. 금속과 결합할 땐 <strong>H⁻</strong>(수소화 이온), 산에서는 <strong>H⁺</strong>(양성자)가 되기도 한다. 물(H₂O)을 이루는 원소이며 수소 연료전지 자동차의 에너지원으로도 쓰인다.'},
  {z:2,sym:'He',name:'헬륨',cat:'noble',group:18,period:1,desc:'헬륨은 바깥 껍질이 이미 꽉 차 있어 <strong>원자가 전자가 0개</strong>다. 그래서 다른 원자와 결합도, 이온도 거의 만들지 않는 비활성 기체로 언제나 낱개 원자(단원자 분자) 상태로 존재한다. 공기보다 가벼워 풍선에 쓰이고, 끓는점이 매우 낮아 MRI 장비의 초전도 자석 냉각에도 활용된다.'},
  {z:3,sym:'Li',name:'리튬',cat:'alkali',group:1,period:2,desc:'리튬은 <strong>금속결합</strong>을 하는 알칼리 금속으로, 비금속과 만나면 전자 1개를 잃고 <strong>Li⁺</strong> 양이온이 되어 <strong>이온결합</strong> 화합물을 만든다. 물에 넣으면 반응해 수소 기체를 내는데, 알칼리 금속 중에서는 가장 온화하게 반응한다. 리튬이온전지의 핵심 원료로 스마트폰과 전기차에 널리 쓰인다.'},
  {z:4,sym:'Be',name:'베릴륨',cat:'alkaline',group:2,period:2,desc:'베릴륨은 <strong>금속결합</strong>을 하는 알칼리 토금속으로, 화합물에서는 전자 2개를 잃고 <strong>Be²⁺</strong> 양이온이 되지만 다른 2족 원소보다 <strong>공유결합</strong>성이 강한 편이다. X선을 잘 투과시켜 X선 장비의 창(window) 재료로 쓰이며, 분진 흡입 시 독성이 있어 취급에 주의가 필요하다.'},
  {z:5,sym:'B',name:'붕소',cat:'metalloid',group:13,period:2,desc:'붕소는 원자가전자가 3개뿐이라 이온이 되기보다 전자쌍을 공유하는 <strong>공유결합</strong> 화합물(삼플루오린화붕소 등)을 주로 만드는 준금속이다. 붕산은 소독제·바퀴벌레 퇴치제로, 붕규산유리(파이렉스)는 내열 조리기구 재료로 쓰인다.'},
  {z:6,sym:'C',name:'탄소',cat:'nonmetal',group:14,period:2,desc:'탄소는 최대 4개의 원자와 전자쌍을 공유하는 <strong>공유결합</strong>으로 유기물의 근간을 이루며, 이온이 되는 경우는 드물다. 동소체로는 다이아몬드(가장 단단한 물질)와 흑연(연필심 재료)이 있고, 최근에는 탄소 섬유가 항공·스포츠용 신소재로 주목받고 있다.'},
  {z:7,sym:'N',name:'질소',cat:'nonmetal',group:15,period:2,desc:'질소는 삼중 <strong>공유결합</strong>(N≡N)으로 동일 원소 이원자 분자(<strong>N₂</strong>)를 이루어 매우 안정하고 반응성이 낮다. 화합물에서는 전자를 받아 <strong>N³⁻</strong> 음이온이 되거나 암모늄이온(<strong>NH₄⁺</strong>)처럼 양전하를 띠기도 한다. 대기의 약 78%를 차지하며, 하버-보슈법으로 합성한 암모니아는 화학비료 생산에 필수적이다.'},
  {z:8,sym:'O',name:'산소',cat:'nonmetal',group:16,period:2,desc:'산소는 <strong>공유결합</strong>으로 동일 원소 이원자 분자(<strong>O₂</strong>)를 이루며, 화합물에서는 전자 2개를 받아 <strong>O²⁻</strong> 음이온이 되는 반응성 큰 비금속이다. 동소체로 우리가 호흡하는 산소(O₂)와 자외선을 막아주는 오존(O₃)이 있으며, 생명체의 호흡과 물질의 연소에 필수적이다.'},
  {z:9,sym:'F',name:'플루오린',cat:'halogen',group:17,period:2,desc:'플루오린은 전기음성도가 모든 원소 중 가장 커서 전자 1개를 강하게 끌어당겨 <strong>F⁻</strong> 음이온이 되기 쉬우며, 같은 원소끼리는 <strong>공유결합</strong>으로 이원자 분자(<strong>F₂</strong>)를 이룬다. 치약 속 불소 성분이 충치 예방에 쓰이고, 프라이팬 코팅재 테플론의 원료이기도 하다.'},
  {z:10,sym:'Ne',name:'네온',cat:'noble',group:18,period:2,desc:'네온은 바깥 껍질이 전자 8개로 꽉 차 있어 <strong>원자가 전자가 0개</strong>이고, 그래서 결합도 이온도 거의 만들지 않는 비활성 기체로 언제나 낱개 원자로 존재한다. 저압에서 방전시키면 붉은빛을 내는 성질 때문에 네온사인 조명에 쓰이며, 극저온 냉각제로도 활용된다.'},
  {z:11,sym:'Na',name:'나트륨',cat:'alkali',group:1,period:3,desc:'나트륨은 <strong>금속결합</strong>을 하는 알칼리 금속으로, 비금속과 만나면 전자 1개를 잃고 <strong>Na⁺</strong> 양이온이 되는 <strong>이온결합</strong> 화합물을 만든다. 염화 이온(<strong>Cl⁻</strong>)과 결합해 우리가 먹는 소금(염화나트륨)을 이루며, 신경 신호 전달에 필수적인 전해질이다.'},
  {z:12,sym:'Mg',name:'마그네슘',cat:'alkaline',group:2,period:3,desc:'마그네슘은 <strong>금속결합</strong>을 하는 알칼리 토금속으로, 화합물에서는 전자 2개를 잃고 <strong>Mg²⁺</strong> 양이온이 되는 <strong>이온결합</strong>을 형성한다. 식물의 엽록소 분자 중심에 자리해 광합성에 필수적이며, 불에 타면서 밝은 흰빛을 내 불꽃놀이 재료로도 쓰인다.'},
  {z:13,sym:'Al',name:'알루미늄',cat:'post',group:13,period:3,desc:'알루미늄은 <strong>금속결합</strong>을 하는 금속으로, 화합물에서는 전자 3개를 잃고 <strong>Al³⁺</strong> 양이온이 되는 <strong>이온결합</strong>을 만든다. 표면에 얇은 산화막(산화알루미늄)이 저절로 생겨 부식에 강하며, 알루미늄 캔·호일과 항공기 동체 재료로 널리 쓰인다.'},
  {z:14,sym:'Si',name:'규소',cat:'metalloid',group:14,period:3,desc:'규소는 탄소처럼 최대 4개의 원자와 전자쌍을 공유하는 <strong>공유결합</strong>을 하는 준금속으로, 이온이 되는 경우는 드물다. 반도체 성질을 지녀 컴퓨터 칩의 핵심 재료이며, 모래와 유리의 주성분(이산화규소)이기도 하다.'},
  {z:15,sym:'P',name:'인',cat:'nonmetal',group:15,period:3,desc:'인은 비금속으로 주로 <strong>공유결합</strong> 화합물을 만들며, 금속과 만나면 전자 3개를 받아 <strong>P³⁻</strong>(인화 이온)이 되기도 한다. 인산이온(<strong>PO₄³⁻</strong>)처럼 여러 원자가 뭉친 음이온 형태로 존재하는 경우가 많다. 동소체로 자연발화하는 흰인과 비교적 안정한 붉은인이 있고, 인산칼슘 형태로 뼈와 치아를 구성한다.'},
  {z:16,sym:'S',name:'황',cat:'nonmetal',group:16,period:3,desc:'황은 비금속으로 <strong>공유결합</strong>을 통해 원자끼리 고리 구조(대표 동소체 사방황은 황 원자 8개가 고리를 이룬 S₈)를 잘 만들며, 금속과 만나면 전자 2개를 받아 <strong>S²⁻</strong>(황화 이온)이 되며, 황산이온(<strong>SO₄²⁻</strong>)처럼 여러 원자가 뭉친 음이온으로도 존재한다. 화약과 성냥의 원료이며, 생고무를 가황하면 탄력 있고 단단한 고무가 된다.'},
  {z:17,sym:'Cl',name:'염소',cat:'halogen',group:17,period:3,desc:'염소는 같은 원소끼리 <strong>공유결합</strong>해 이원자 분자(<strong>Cl₂</strong>)를 이루며, 금속과 만나면 전자 1개를 받아 <strong>Cl⁻</strong> 음이온이 되는 반응성 큰 할로젠이다. 수돗물과 수영장 물을 소독하는 데 쓰이며, 나트륨과 결합해 소금(염화나트륨)을 이룬다.'},
  {z:18,sym:'Ar',name:'아르곤',cat:'noble',group:18,period:3,desc:'아르곤은 바깥 껍질이 전자 8개로 꽉 차 <strong>원자가 전자가 0개</strong>인 비활성 기체로, 결합도 이온도 거의 만들지 않아 언제나 낱개 원자로 존재한다. 백열전구나 형광등 내부를 채워 필라멘트의 산화를 막고, 용접 시 산소를 차단하는 보호 기체로도 쓰인다.'},
  {z:19,sym:'K',name:'칼륨',cat:'alkali',group:1,period:4,desc:'칼륨은 <strong>금속결합</strong>을 하는 알칼리 금속으로, 비금속과 만나면 전자 1개를 잃고 <strong>K⁺</strong> 양이온이 되는 <strong>이온결합</strong> 화합물을 만든다. 물에 넣으면 격렬히 반응하며 보라색 불꽃을 낸다. 식물 비료의 핵심 성분이며 바나나 등에 풍부해 신경과 근육 기능 유지에 중요하다.'},
  {z:20,sym:'Ca',name:'칼슘',cat:'alkaline',group:2,period:4,desc:'칼슘은 <strong>금속결합</strong>을 하는 알칼리 토금속으로, 화합물에서는 전자 2개를 잃고 <strong>Ca²⁺</strong> 양이온이 되는 <strong>이온결합</strong>을 형성한다. 인산칼슘 형태로 뼈와 치아를, 탄산칼슘 형태로 석회암·대리석·조개껍데기를 이루며, 불꽃 반응 시 주황빛을 낸다.'},
  {z:21,sym:'Sc',name:'스칸듐',cat:'transition',group:3,period:4,desc:'스칸듐은 <strong>금속결합</strong>을 하는 전이 금속으로, 화합물에서는 주로 <strong>Sc³⁺</strong> 양이온이 되는 <strong>이온결합</strong>을 만든다. 알루미늄에 소량 첨가하면 강도를 크게 높이는 합금이 되어 항공우주 부품이나 고급 자전거 프레임에 쓰인다.'},
  {z:22,sym:'Ti',name:'타이타늄',cat:'transition',group:4,period:4,desc:'타이타늄은 <strong>금속결합</strong>을 하는 전이 금속으로, 화합물에서는 주로 <strong>Ti⁴⁺</strong> 양이온이 된다. 강철에 버금가는 강도를 가지면서도 훨씬 가볍고 부식에 강해 인공관절·치아 임플란트·항공기 부품 재료로 쓰인다.'},
  {z:23,sym:'V',name:'바나듐',cat:'transition',group:5,period:4,desc:'바나듐은 <strong>금속결합</strong>을 하는 전이 금속으로, <strong>V²⁺</strong>부터 <strong>V⁵⁺</strong>까지 다양한 산화수의 이온을 만들 수 있어 여러 반응의 촉매로 활용된다. 바나듐강은 공구·스프링 재료로, 대용량 전력저장용 레독스 흐름전지에도 쓰인다.'},
  {z:24,sym:'Cr',name:'크로뮴',cat:'transition',group:6,period:4,desc:'크로뮴은 <strong>금속결합</strong>을 하는 전이 금속으로, <strong>Cr³⁺</strong>·<strong>Cr⁶⁺</strong> 등 여러 산화수의 이온을 만든다. 표면에 산화막을 형성해 광택과 내식성을 주는 스테인리스강의 핵심 첨가 금속이며, 크롬 도금으로 광택을 낸다.'},
  {z:25,sym:'Mn',name:'망가니즈',cat:'transition',group:7,period:4,desc:'망가니즈는 <strong>금속결합</strong>을 하는 전이 금속으로, <strong>Mn²⁺</strong>부터 <strong>Mn⁷⁺</strong>까지 다양한 산화수의 이온을 만든다. 철에 섞으면 강도와 내마모성이 크게 높아지며, 알칼리 건전지 속 이산화망가니즈 형태로도 쓰인다.'},
  {z:26,sym:'Fe',name:'철',cat:'transition',group:8,period:4,desc:'철은 <strong>금속결합</strong>을 하는 대표적인 전이 금속으로, 화합물에서는 <strong>Fe²⁺</strong>·<strong>Fe³⁺</strong> 두 가지 이온을 흔히 만든다. 공기 중 수분과 만나면 산화되어 붉은 녹이 슬며, 강철의 주성분이자 혈액 속 헤모글로빈의 중심 원소로 온몸에 산소를 운반하는 데 꼭 필요하다.'},
  {z:27,sym:'Co',name:'코발트',cat:'transition',group:9,period:4,desc:'코발트는 <strong>금속결합</strong>을 하는 전이 금속으로, <strong>Co²⁺</strong>·<strong>Co³⁺</strong> 이온을 만든다. 상온에서 자성을 띠는 몇 안 되는 금속 중 하나로, 리튬이온 배터리 양극재와 비타민 B12의 중심 원소, 파란색 안료(코발트 블루)로 쓰인다.'},
  {z:28,sym:'Ni',name:'니켈',cat:'transition',group:10,period:4,desc:'니켈은 <strong>금속결합</strong>을 하는 전이 금속으로, 주로 <strong>Ni²⁺</strong> 양이온이 되는 화합물을 만든다. 부식에 강하고 자성을 띠어 동전 합금과 스테인리스강 첨가물, 니켈-카드뮴 충전지 전극 재료로 쓰인다.'},
  {z:29,sym:'Cu',name:'구리',cat:'transition',group:11,period:4,desc:'구리는 <strong>금속결합</strong>을 하는 전이 금속으로, <strong>Cu⁺</strong>·<strong>Cu²⁺</strong> 두 가지 이온을 만든다. 전기·열전도성이 매우 뛰어나 전선의 핵심 재료이며, 공기 중에서 산화되면 청록색 녹청이 생기고 불꽃 반응 시에도 청록색을 낸다.'},
  {z:30,sym:'Zn',name:'아연',cat:'transition',group:12,period:4,desc:'아연은 <strong>금속결합</strong>을 하는 전이 금속으로, 화합물에서는 전자 2개를 잃고 <strong>Zn²⁺</strong> 양이온이 되는 <strong>이온결합</strong>을 형성한다. 철 표면에 도금하면 부식을 막아주며, 건전지 음극재이자 사람 몸에 소량 필요한 필수 미량 원소이기도 하다.'},
  {z:31,sym:'Ga',name:'갈륨',cat:'post',group:13,period:4,desc:'갈륨은 <strong>금속결합</strong>을 하며, 화합물에서는 전자 3개를 잃고 <strong>Ga³⁺</strong> 양이온이 된다. 질소와 <strong>공유결합</strong>한 질화갈륨(GaN)은 LED와 5G 통신 부품의 반도체 재료로 쓰이며, 녹는점이 약 30℃라 손바닥 위에서도 녹는다.'},
  {z:32,sym:'Ge',name:'저마늄',cat:'metalloid',group:14,period:4,desc:'저마늄은 규소처럼 원자 4개와 전자쌍을 공유하는 <strong>공유결합</strong>을 하는 준금속으로, 이온이 되는 경우는 드물다. 초기 트랜지스터에 쓰인 반도체 재료였고, 오늘날에는 광섬유 케이블의 굴절률을 높이는 첨가물로 쓰인다.'},
  {z:33,sym:'As',name:'비소',cat:'metalloid',group:15,period:4,desc:'비소는 준금속으로 <strong>공유결합</strong> 화합물을 주로 만들지만 <strong>As³⁻</strong>·<strong>As³⁺</strong>·<strong>As⁵⁺</strong> 등 산화수에 따라 다양한 이온 상태로도 존재한다. 갈륨과 결합한 갈륨비소(GaAs)는 고속 반도체 재료로 쓰이며, 독성이 강해 예전 살충제 용도는 대부분 금지되었다.'},
  {z:34,sym:'Se',name:'셀레늄',cat:'nonmetal',group:16,period:4,desc:'셀레늄은 비금속으로 황처럼 원자끼리 사슬·고리 구조의 <strong>공유결합</strong>을 잘 만들며, 화합물에서는 전자 2개를 받아 <strong>Se²⁻</strong> 음이온이 되기도 한다. 빛을 받으면 전기전도도가 변하는 광전 특성이 있어 복사기 감광드럼에 쓰였고, 인체 필수 미량 원소이기도 하다.'},
  {z:35,sym:'Br',name:'브로민',cat:'halogen',group:17,period:4,desc:'브로민은 같은 원소끼리 <strong>공유결합</strong>해 이원자 분자(<strong>Br₂</strong>)를 이루는, 상온에서 액체로 존재하는 유일한 비금속이다. 금속과 만나면 전자 1개를 받아 <strong>Br⁻</strong> 음이온이 된다. 붉은 갈색 증기를 내며 소독제·난연제 원료로 쓰인다.'},
  {z:36,sym:'Kr',name:'크립톤',cat:'noble',group:18,period:4,desc:'크립톤은 비활성 기체로 결합이나 이온을 거의 만들지 않지만, 반응성이 강한 플루오린과는 예외적으로 <strong>공유결합</strong> 화합물(이플루오린화크립톤 KrF₂)을 만들 수 있다. 고성능 카메라 플래시와 이중창 사이 단열 기체로 쓰인다.'},
  {z:37,sym:'Rb',name:'루비듐',cat:'alkali',group:1,period:5,desc:'루비듐은 <strong>금속결합</strong>을 하는 알칼리 금속으로, 전자 1개를 잃고 <strong>Rb⁺</strong> 양이온이 되는 <strong>이온결합</strong> 화합물을 만든다. 나트륨·칼륨보다도 반응성이 더 커서 물에 닿으면 폭발적으로 반응하며, 원자시계의 기준 발진 원소로 쓰인다.'},
  {z:38,sym:'Sr',name:'스트론튬',cat:'alkaline',group:2,period:5,desc:'스트론튬은 <strong>금속결합</strong>을 하는 알칼리 토금속으로, 전자 2개를 잃고 <strong>Sr²⁺</strong> 양이온이 되는 <strong>이온결합</strong>을 형성한다. 칼슘과 화학적 성질이 비슷해 뼈에 축적될 수 있으며, 불꽃놀이에서 선명한 빨간색을 내는 데 널리 쓰인다.'},
  {z:39,sym:'Y',name:'이트륨',cat:'transition',group:3,period:5,desc:'이트륨은 <strong>금속결합</strong>을 하는 전이 금속으로, 화합물에서는 주로 <strong>Y³⁺</strong> 양이온이 된다. 희토류로 분류되며 산화물이 형광 특성을 지녀 디스플레이의 적색 형광체와 YAG 레이저의 핵심 소재로 쓰인다.'},
  {z:40,sym:'Zr',name:'지르코늄',cat:'transition',group:4,period:5,desc:'지르코늄은 <strong>금속결합</strong>을 하는 전이 금속으로, 화합물에서는 주로 <strong>Zr⁴⁺</strong> 양이온이 된다. 부식과 고온에 매우 강해 원자로 연료봉 피복재로 쓰이며, 산화지르코늄(큐빅 지르코니아)은 인조 보석 재료로 널리 쓰인다.'},
  {z:41,sym:'Nb',name:'나이오븀',cat:'transition',group:5,period:5,desc:'나이오븀은 <strong>금속결합</strong>을 하는 전이 금속으로, 화합물에서는 주로 <strong>Nb⁵⁺</strong> 양이온이 된다. 극저온에서 전기저항이 사라지는 초전도 현상을 보여 MRI 장비의 초전도 자석 전선(니오븀-티타늄 합금) 재료로 쓰인다.'},
  {z:42,sym:'Mo',name:'몰리브데넘',cat:'transition',group:6,period:5,desc:'몰리브데넘은 <strong>금속결합</strong>을 하는 전이 금속으로, <strong>Mo⁴⁺</strong>·<strong>Mo⁶⁺</strong> 등 여러 산화수의 이온을 만든다. 고온에서도 강도를 잘 유지해 절삭공구·엔진 부품용 특수강 첨가물로 쓰이며, 생물체 효소의 필수 미량 원소이기도 하다.'},
  {z:43,sym:'Tc',name:'테크네튬',cat:'transition',group:7,period:5,desc:'테크네튬은 <strong>금속결합</strong>을 하는 전이 금속으로, <strong>Tc⁴⁺</strong>·<strong>Tc⁷⁺</strong> 등의 이온을 만들 수 있는 최초의 인공 방사성 원소다. 방사성 동위원소 테크네튬-99m은 오늘날 핵의학 영상 진단에 가장 널리 쓰이는 방사성 추적자다.'},
  {z:44,sym:'Ru',name:'루테늄',cat:'transition',group:8,period:5,desc:'루테늄은 <strong>금속결합</strong>을 하는 백금족 전이 금속으로, 여러 산화수의 이온을 만들 수 있다. 다른 귀금속에 소량 섞으면 내마모성을 크게 높여, 만년필 펜촉이나 염료감응 태양전지의 촉매로 쓰인다.'},
  {z:45,sym:'Rh',name:'로듐',cat:'transition',group:9,period:5,desc:'로듐은 <strong>금속결합</strong>을 하는 백금족 전이 금속으로, 주로 <strong>Rh³⁺</strong> 이온을 만든다. 백금족 금속 중 반사율이 가장 높고 부식에 강해, 자동차 배기가스를 정화하는 촉매변환기의 핵심 촉매이자 보석류의 광택 도금재로 쓰인다.'},
  {z:46,sym:'Pd',name:'팔라듐',cat:'transition',group:10,period:5,desc:'팔라듐은 <strong>금속결합</strong>을 하는 전이 금속으로, 주로 <strong>Pd²⁺</strong> 이온을 만든다. 자기 부피의 수백 배에 달하는 수소 기체를 흡수하는 독특한 성질이 있어, 자동차 촉매변환기와 치과용 합금 재료로 쓰인다.'},
  {z:47,sym:'Ag',name:'은',cat:'transition',group:11,period:5,desc:'은은 <strong>금속결합</strong>을 하는 전이 금속으로, 화합물에서는 <strong>Ag⁺</strong> 이온이 된다. 모든 금속 중 전기·열전도율이 가장 높으며, 항균 성질이 있어 상처 드레싱재나 항균 코팅재로도 쓰이고, 과거엔 사진 필름의 감광 재료(할로젠화은)이기도 했다.'},
  {z:48,sym:'Cd',name:'카드뮴',cat:'transition',group:12,period:5,desc:'카드뮴은 <strong>금속결합</strong>을 하는 전이 금속으로, 화합물에서는 <strong>Cd²⁺</strong> 이온이 된다. 아연과 화학적 성질이 비슷하지만 독성이 강해, 니켈-카드뮴 충전지 전극에 쓰였고 안료로도 쓰였으나 지금은 사용이 크게 제한된다.'},
  {z:49,sym:'In',name:'인듐',cat:'post',group:13,period:5,desc:'인듐은 <strong>금속결합</strong>을 하는 전이 후 금속으로, 화합물에서는 주로 <strong>In³⁺</strong> 이온이 된다. 산화인듐주석(ITO) 형태로 전기가 통하면서도 투명해, 스마트폰과 TV 화면의 터치스크린용 투명 전극 재료로 필수적으로 쓰인다.'},
  {z:50,sym:'Sn',name:'주석',cat:'post',group:14,period:5,desc:'주석은 <strong>금속결합</strong>을 하는 전이 후 금속으로, <strong>Sn²⁺</strong>·<strong>Sn⁴⁺</strong> 두 가지 이온을 만든다. 철 표면에 도금하면 부식을 막아 통조림 캔(양철)에 쓰이고, 구리와 합금한 청동은 인류가 아주 오래전부터 사용해 온 합금이다.'},
  {z:51,sym:'Sb',name:'안티모니',cat:'metalloid',group:15,period:5,desc:'안티모니는 준금속으로 <strong>공유결합</strong> 화합물을 주로 만들지만 <strong>Sb³⁺</strong>·<strong>Sb⁵⁺</strong> 이온 상태로도 존재한다. 다른 금속과 합금하면 강도를 높여 배터리 극판에 쓰이고, 삼산화안티모니는 옷감·플라스틱의 난연제로 쓰인다.'},
  {z:52,sym:'Te',name:'텔루륨',cat:'metalloid',group:16,period:5,desc:'텔루륨은 준금속으로 황·셀레늄처럼 원자끼리 사슬 구조의 <strong>공유결합</strong>을 만들며, 화합물에서는 전자 2개를 받아 <strong>Te²⁻</strong> 음이온이 되기도 한다. 카드뮴텔루라이드(CdTe) 박막 태양전지의 핵심 재료로 쓰인다.'},
  {z:53,sym:'I',name:'아이오딘',cat:'halogen',group:17,period:5,desc:'아이오딘은 같은 원소끼리 <strong>공유결합</strong>해 이원자 분자(<strong>I₂</strong>)를 이루며, 금속과 만나면 전자 1개를 받아 <strong>I⁻</strong> 음이온이 되는 할로젠이다. 가열하면 액체를 거치지 않고 바로 보라색 기체로 승화하며, 갑상샘 호르몬 합성에 꼭 필요한 영양소다.'},
  {z:54,sym:'Xe',name:'제논',cat:'noble',group:18,period:5,desc:'제논은 비활성 기체이지만 반응성이 강한 플루오린과는 <strong>공유결합</strong> 화합물(이플루오린화제논 XeF₂)을 만들 수 있다. 밝고 선명한 빛을 내 자동차 헤드라이트와 사진 플래시에 쓰이며, 우주선의 이온 추진 엔진 연료로도 활용된다.'},
  {z:55,sym:'Cs',name:'세슘',cat:'alkali',group:1,period:6,desc:'세슘은 <strong>금속결합</strong>을 하는 알칼리 금속으로, 전자 1개를 잃고 <strong>Cs⁺</strong> 양이온이 되는 <strong>이온결합</strong> 화합물을 만든다. 안정한 원소로 존재하는 알칼리 금속 중 반응성이 가장 크며, 세슘 원자의 진동수를 기준으로 1초를 정의하는 원자시계에 쓰인다.'},
  {z:56,sym:'Ba',name:'바륨',cat:'alkaline',group:2,period:6,desc:'바륨은 <strong>금속결합</strong>을 하는 알칼리 토금속으로, 전자 2개를 잃고 <strong>Ba²⁺</strong> 양이온이 되는 <strong>이온결합</strong>을 형성한다. 물에 녹지 않아 독성이 낮은 황산바륨은 위장관 X선 조영제로 쓰이며, 불꽃놀이에서 선명한 황록색을 낸다.'},
  {z:57,sym:'La',name:'란타넘',cat:'lanth',period:6,f:1,desc:'란타넘은 <strong>금속결합</strong>을 하는 란타넘족 첫 원소로, 화합물에서는 전자 3개를 잃고 <strong>La³⁺</strong> 이온이 되는 안정한 상태를 이룬다. 석유 정제 촉매로 쓰이며, 세륨·프라세오디뮴·네오디뮴과 섞은 합금(미시메탈)은 라이터 발화석과 니켈수소전지 전극에 쓰인다.'},
  {z:58,sym:'Ce',name:'세륨',cat:'lanth',period:6,f:2,desc:'세륨은 <strong>금속결합</strong>을 하는 란타넘족 금속으로, <strong>Ce³⁺</strong>와 <strong>Ce⁴⁺</strong> 두 가지 이온 상태를 오가며 반응하는 독특한 산화-환원 성질이 있다. 이 성질 덕분에 자동차 배기가스 정화 촉매로 쓰이며, 정밀 유리 연마제의 핵심 성분이기도 하다.'},
  {z:59,sym:'Pr',name:'프라세오디뮴',cat:'lanth',period:6,f:3,desc:'프라세오디뮴은 <strong>금속결합</strong>을 하는 란타넘족 금속으로, 화합물에서는 주로 <strong>Pr³⁺</strong> 이온이 된다. 홀로 쓰이기보다는 네오디뮴과 함께 강력하고 내구성이 뛰어난 영구자석을 만드는 데 쓰인다.'},
  {z:60,sym:'Nd',name:'네오디뮴',cat:'lanth',period:6,f:4,desc:'네오디뮴은 <strong>금속결합</strong>을 하는 란타넘족 금속으로, 화합물에서는 주로 <strong>Nd³⁺</strong> 이온이 된다. 철·붕소와 결합한 네오디뮴자석(Nd₂Fe₁₄B)은 현재까지 알려진 영구자석 중 가장 강력한 축에 속해 풍력발전기, 전기차 모터, 이어폰 스피커 등에 널리 쓰인다.'},
  {z:61,sym:'Pm',name:'프로메튬',cat:'lanth',period:6,f:5,desc:'프로메튬은 <strong>금속결합</strong>을 하는 란타넘족 금속으로, 화합물에서는 주로 <strong>Pm³⁺</strong> 이온이 된다. 란타넘족 중 유일하게 안정한 동위원소가 없는 방사성 원소로, 베타선을 방출하는 성질을 이용해 야광 도료나 소형 원자력전지에 쓰인다.'},
  {z:62,sym:'Sm',name:'사마륨',cat:'lanth',period:6,f:6,desc:'사마륨은 <strong>금속결합</strong>을 하는 란타넘족 금속으로, 주로 <strong>Sm³⁺</strong> 이온이 된다. 코발트와 결합한 사마륨코발트 자석은 고온에서도 자성을 거의 잃지 않아 항공우주·군사 장비에 쓰인다.'},
  {z:63,sym:'Eu',name:'유로퓸',cat:'lanth',period:6,f:7,desc:'유로퓸은 <strong>금속결합</strong>을 하는 란타넘족 금속으로, <strong>Eu²⁺</strong>와 <strong>Eu³⁺</strong> 두 가지 이온 상태를 모두 만들 수 있는 독특한 원소다. 자외선을 받으면 붉은색·파란색 형광을 강하게 내 TV·디스플레이의 적색 형광체와 유로화 지폐의 위조 방지 잉크로 쓰인다.'},
  {z:64,sym:'Gd',name:'가돌리늄',cat:'lanth',period:6,f:8,desc:'가돌리늄은 <strong>금속결합</strong>을 하는 란타넘족 금속으로, 주로 <strong>Gd³⁺</strong> 이온이 된다. 강한 상자성을 띠어 주변 자기장을 크게 왜곡시키는 성질 덕분에 병변을 선명하게 보이게 하는 MRI 조영제로 널리 쓰인다.'},
  {z:65,sym:'Tb',name:'터븀',cat:'lanth',period:6,f:9,desc:'터븀은 <strong>금속결합</strong>을 하는 란타넘족 금속으로, 주로 <strong>Tb³⁺</strong> 이온이 된다. 자외선을 받으면 녹색 형광을 강하게 내 형광등과 디스플레이의 녹색 형광체 성분으로 쓰인다.'},
  {z:66,sym:'Dy',name:'디스프로슘',cat:'lanth',period:6,f:10,desc:'디스프로슘은 <strong>금속결합</strong>을 하는 란타넘족 금속으로, 주로 <strong>Dy³⁺</strong> 이온이 된다. 고온에서도 자성을 유지하도록 네오디뮴 자석에 소량 첨가되어, 전기차 모터처럼 열이 많이 나는 곳에 쓰이는 고성능 영구자석에 활용된다.'},
  {z:67,sym:'Ho',name:'홀뮴',cat:'lanth',period:6,f:11,desc:'홀뮴은 <strong>금속결합</strong>을 하는 란타넘족 금속으로, 주로 <strong>Ho³⁺</strong> 이온이 된다. 자연에 존재하는 원소 중 가장 강한 자기모멘트를 가진 원소로 꼽히며, 홀뮴 레이저는 요로결석을 정밀하게 부수는 의료 수술 장비에 쓰인다.'},
  {z:68,sym:'Er',name:'어븀',cat:'lanth',period:6,f:12,desc:'어븀은 <strong>금속결합</strong>을 하는 란타넘족 금속으로, 주로 <strong>Er³⁺</strong> 이온이 된다. 특정 파장의 빛을 흡수·증폭하는 성질이 있어, 광섬유 통신 신호를 멀리까지 증폭하는 어븀 첨가 광섬유 증폭기(EDFA)의 핵심 재료로 쓰인다.'},
  {z:69,sym:'Tm',name:'툴륨',cat:'lanth',period:6,f:13,desc:'툴륨은 <strong>금속결합</strong>을 하는 란타넘족 금속으로, 주로 <strong>Tm³⁺</strong> 이온이 된다. 방사성인 프로메튬을 제외하면 란타넘족 원소 중 매장량이 가장 적어 특히 희귀하며, 방사성 동위원소 형태로 휴대용 X선 장비의 소형 방사선원에 쓰인다.'},
  {z:70,sym:'Yb',name:'이터븀',cat:'lanth',period:6,f:14,desc:'이터븀은 <strong>금속결합</strong>을 하는 란타넘족 금속으로, 주로 <strong>Yb³⁺</strong>(간혹 <strong>Yb²⁺</strong>) 이온이 된다. 매우 정밀한 원자시계를 만드는 데 활용되며, 광섬유 레이저의 증폭 매질로도 쓰인다.'},
  {z:71,sym:'Lu',name:'루테튬',cat:'lanth',period:6,f:15,desc:'루테튬은 <strong>금속결합</strong>을 하는 란타넘족 금속으로, 주로 <strong>Lu³⁺</strong> 이온이 되는 란타넘족의 마지막 원소다. 방사성 동위원소 루테튬-177은 암 치료용 방사성 의약품으로 쓰이고, PET 촬영 장비의 섬광 결정 재료로도 활용된다.'},
  {z:72,sym:'Hf',name:'하프늄',cat:'transition',group:4,period:6,desc:'하프늄은 <strong>금속결합</strong>을 하는 전이 금속으로, 주로 <strong>Hf⁴⁺</strong> 이온이 된다. 지르코늄과 화학적 성질이 매우 비슷하지만 중성자를 잘 흡수해 원자로 제어봉 재료로 쓰이며, 최신 반도체 공정의 절연막(하이-k 유전체) 재료로도 활용된다.'},
  {z:73,sym:'Ta',name:'탄탈럼',cat:'transition',group:5,period:6,desc:'탄탈럼은 <strong>금속결합</strong>을 하는 전이 금속으로, 주로 <strong>Ta⁵⁺</strong> 이온이 된다. 산과 부식에 매우 강하고 전하를 저장하는 성질이 뛰어나, 스마트폰 등 소형 전자기기의 탄탈럼 커패시터(축전기) 재료로 쓰인다.'},
  {z:74,sym:'W',name:'텅스텐',cat:'transition',group:6,period:6,desc:'텅스텐은 <strong>금속결합</strong>을 하는 전이 금속으로, <strong>W⁴⁺</strong>·<strong>W⁶⁺</strong> 등의 이온을 만든다. 모든 금속 중 녹는점이 가장 높아(약 3400℃) 예전 백열전구 필라멘트와 절삭공구·드릴 팁에 쓰인다.'},
  {z:75,sym:'Re',name:'레늄',cat:'transition',group:7,period:6,desc:'레늄은 <strong>금속결합</strong>을 하는 전이 금속으로, 여러 산화수의 이온을 만들 수 있다. 지각에 매우 희귀하게 존재하며 녹는점이 매우 높아, 제트 엔진용 초내열합금 첨가물과 백금-레늄 촉매(석유 정제)에 쓰인다.'},
  {z:76,sym:'Os',name:'오스뮴',cat:'transition',group:8,period:6,desc:'오스뮴은 <strong>금속결합</strong>을 하는 전이 금속으로, 여러 산화수의 이온을 만든다. 자연에서 발견되는 원소 중 밀도가 가장 높으며, 매우 단단하고 마모에 강해 만년필 펜촉이나 전기 접점 합금에 쓰인다.'},
  {z:77,sym:'Ir',name:'이리듐',cat:'transition',group:9,period:6,desc:'이리듐은 <strong>금속결합</strong>을 하는 백금족 전이 금속으로, 주로 <strong>Ir³⁺</strong>·<strong>Ir⁴⁺</strong> 이온이 된다. 부식과 고온에 극도로 강해 과거 국제 표준원기의 백금-이리듐 합금 재료였으며, 오늘날엔 점화플러그 전극에 쓰인다.'},
  {z:78,sym:'Pt',name:'백금',cat:'transition',group:10,period:6,desc:'백금은 <strong>금속결합</strong>을 하는 귀금속으로, 주로 <strong>Pt²⁺</strong>·<strong>Pt⁴⁺</strong> 이온이 되지만 화학적으로 거의 반응하지 않아 매우 안정하다. 자동차 배기가스 정화 촉매변환기의 핵심 촉매이며, 항암제 시스플라틴의 핵심 성분이기도 하다.'},
  {z:79,sym:'Au',name:'금',cat:'transition',group:11,period:6,desc:'금은 <strong>금속결합</strong>을 하는 귀금속으로, 드물게 <strong>Au⁺</strong>·<strong>Au³⁺</strong> 이온이 되지만 반응성이 거의 없어 녹슬거나 변색되지 않는다. 전기전도성도 뛰어나 전자 회로 기판의 접점 도금재로 쓰이며, 오랫동안 화폐·자산 가치 저장 수단으로도 쓰여왔다.'},
  {z:80,sym:'Hg',name:'수은',cat:'transition',group:12,period:6,desc:'수은은 <strong>금속결합</strong>을 하면서도 상온에서 액체 상태로 존재하는 유일한 금속으로, <strong>Hg²⁺</strong> 이온뿐 아니라 수은 원자 두 개가 결합한 특이한 이온(<strong>Hg₂²⁺</strong>)도 만든다. 예전엔 체온계·혈압계에 쓰였으나 독성 문제로 사용이 크게 줄었다.'},
  {z:81,sym:'Tl',name:'탈륨',cat:'post',group:13,period:6,desc:'탈륨은 <strong>금속결합</strong>을 하는 전이 후 금속으로, <strong>Tl⁺</strong>·<strong>Tl³⁺</strong> 이온이 된다. 인체에 매우 강한 독성을 지녀 과거 쥐약으로 쓰였으나 지금은 대부분 금지되었고, 방사성 동위원소(탈륨-201) 형태로 심장 질환 진단에 쓰인다.'},
  {z:82,sym:'Pb',name:'납',cat:'post',group:14,period:6,desc:'납은 <strong>금속결합</strong>을 하는 전이 후 금속으로, <strong>Pb²⁺</strong>·<strong>Pb⁴⁺</strong> 이온이 된다. 무르고 밀도가 높아 방사선을 잘 차단해 X선실 방호복 재료로 쓰이지만, 신경독성이 있어 페인트나 수도관에 쓰는 것은 대부분 금지되었다.'},
  {z:83,sym:'Bi',name:'비스무트',cat:'post',group:15,period:6,desc:'비스무트는 <strong>금속결합</strong>을 하는 전이 후 금속으로, 주로 <strong>Bi³⁺</strong> 이온이 된다. 무거운 원소 중에서도 방사성이 극히 미약해 사실상 안정한 원소로 여겨지며, 위장약(펩토비스몰류)의 주성분으로 쓰인다.'},
  {z:84,sym:'Po',name:'폴로늄',cat:'metalloid',group:16,period:6,desc:'폴로늄은 금속과 준금속의 중간 성질을 보이는 매우 강한 방사성 원소로, <strong>Po²⁺</strong>·<strong>Po⁴⁺</strong> 이온이 된다. 마리 퀴리와 피에르 퀴리가 발견해 마리 퀴리의 조국인 폴란드의 이름을 땄으며, 강한 알파선을 방출해 정전기 제거 장치의 방사선원으로 쓰인다.'},
  {z:85,sym:'At',name:'아스타틴',cat:'halogen',group:17,period:6,desc:'아스타틴은 금속과 만나면 전자 1개를 받아 <strong>At⁻</strong> 음이온이 될 것으로 여겨지는 할로젠으로, 모든 동위원소의 반감기가 매우 짧은 극도로 불안정한 방사성 원소다. 자연에 존재하는 원소 중 가장 희귀한 축에 속하며, 표적 암 치료용 방사성 의약품 연구에 활용되고 있다.'},
  {z:86,sym:'Rn',name:'라돈',cat:'noble',group:18,period:6,desc:'라돈은 자연에 존재하는 비활성 기체 중 유일하게 방사성을 띠며, 다른 비활성 기체처럼 결합이나 이온을 거의 만들지 않는다. 우라늄을 포함한 토양·암반에서 자연적으로 스며 나오며, 환기가 안 되는 실내에 쌓이면 폐암 위험을 높일 수 있다.'},
  {z:87,sym:'Fr',name:'프랑슘',cat:'alkali',group:1,period:7,desc:'프랑슘은 <strong>금속결합</strong>을 하는 알칼리 금속으로, 전자 1개를 잃고 <strong>Fr⁺</strong> 양이온이 되는 <strong>이온결합</strong> 화합물을 이론적으로 만든다. 주기율표 경향상 반응성이 매우 클 것으로 예측되면서도 자연에 존재하는 원소 중 손꼽히게 불안정한 방사성 원소로, 지각 전체에 있는 양이 한 순간에 30g이 채 안 될 만큼 극히 희귀하다.'},
  {z:88,sym:'Ra',name:'라듐',cat:'alkaline',group:2,period:7,desc:'라듐은 <strong>금속결합</strong>을 하는 알칼리 토금속으로, 전자 2개를 잃고 <strong>Ra²⁺</strong> 양이온이 되는 <strong>이온결합</strong>을 형성한다. 마리 퀴리가 발견한 강한 방사성 원소로 어둠 속에서 스스로 빛을 내며, 20세기 초 시계 문자판 야광 도료에 쓰였으나 방사선 피폭 문제로 사용이 중단되었다.'},
  {z:89,sym:'Ac',name:'악티늄',cat:'actin',period:7,f:1,desc:'악티늄은 <strong>금속결합</strong>을 하는 악티늄족 첫 원소로, 화합물에서는 전자 3개를 잃고 <strong>Ac³⁺</strong> 양이온이 된다. 공기 중 산소·수분과 빠르게 반응해 흰색 산화막을 만들며, 방사성 동위원소 악티늄-225는 암세포를 표적 공격하는 방사선 치료제로 연구되고 있다.'},
  {z:90,sym:'Th',name:'토륨',cat:'actin',period:7,f:2,desc:'토륨은 <strong>금속결합</strong>을 하는 악티늄족 금속으로, 화합물에서는 주로 <strong>Th⁴⁺</strong> 양이온이 된다. 우라늄보다 지각에 훨씬 풍부하게 존재하는 방사성 원소로, 20세기 초 가스등 맨틀 코팅재로 쓰였고 오늘날엔 차세대 원자로 연료로 연구되고 있다.'},
  {z:91,sym:'Pa',name:'프로트악티늄',cat:'actin',period:7,f:3,desc:'프로트악티늄은 <strong>금속결합</strong>을 하는 방사성 금속으로, 화합물에서 <strong>Pa⁴⁺</strong>·<strong>Pa⁵⁺</strong> 이온이 된다. 핵분열 연쇄반응을 일으킬 수 있지만 매장량이 극히 적고 정제가 어려워 주로 학술 연구에만 극미량 쓰인다.'},
  {z:92,sym:'U',name:'우라늄',cat:'actin',period:7,f:4,desc:'우라늄은 <strong>금속결합</strong>을 하는 방사성 금속으로, <strong>U⁴⁺</strong>·<strong>U⁶⁺</strong> 이온이 되며 특히 우라닐이온(<strong>UO₂²⁺</strong>) 형태로 흔히 존재한다. 핵분열 연쇄반응을 일으켜 원자력 발전소의 핵연료로 쓰이며, 20세기 초에는 우라늄 화합물을 섞어 형광 녹색을 내는 우라늄 유리를 만들기도 했다.'},
  {z:93,sym:'Np',name:'넵투늄',cat:'actin',period:7,f:5,desc:'넵투늄은 <strong>금속결합</strong>을 하는 인공 방사성 금속으로, <strong>Np³⁺</strong>부터 <strong>Np⁷⁺</strong>까지 다양한 산화수의 이온을 만든다. 우라늄보다 무거운 최초의 인공 원소로, 붕괴를 거쳐 우주탐사선 전력원으로 쓰이는 플루토늄-238을 만드는 전 단계 물질이다.'},
  {z:94,sym:'Pu',name:'플루토늄',cat:'actin',period:7,f:6,desc:'플루토늄은 <strong>금속결합</strong>을 하는 강한 방사성 금속으로, <strong>Pu³⁺</strong>부터 <strong>Pu⁶⁺</strong>까지 다양한 산화수의 이온을 만든다. 플루토늄-239는 원자력 발전과 핵무기의 핵심 원료이며, 붕괴열을 내는 플루토늄-238은 태양빛이 닿지 않는 먼 우주 탐사선의 전력원으로 쓰인다.'},
  {z:95,sym:'Am',name:'아메리슘',cat:'actin',period:7,f:7,desc:'아메리슘은 <strong>금속결합</strong>을 하는 인공 방사성 금속으로, 주로 <strong>Am³⁺</strong> 이온이 된다. 알파선을 안정적으로 방출해 가정용 화재경보기(연기감지기) 내부의 연기 감지 센서로 쓰이는, 실생활에서 가장 친숙한 초우라늄 원소다.'},
  {z:96,sym:'Cm',name:'퀴륨',cat:'actin',period:7,f:8,desc:'퀴륨은 <strong>금속결합</strong>을 하는 인공 방사성 금속으로, 주로 <strong>Cm³⁺</strong> 이온이 된다. 마리 퀴리와 피에르 퀴리 부부의 이름을 땄으며, 화성 탐사로버에 실린 알파입자 X선 분광기의 방사선원으로 쓰여 화성 암석 성분을 분석하는 데 활용된다.'},
  {z:97,sym:'Bk',name:'버클륨',cat:'actin',period:7,f:9,desc:'버클륨은 <strong>금속결합</strong>을 하는 인공 방사성 금속으로, <strong>Bk³⁺</strong>·<strong>Bk⁴⁺</strong> 이온이 된다. 처음 합성된 미국 캘리포니아대학교 버클리의 이름을 땄으며, 극히 소량만 합성돼 실용적 용도 없이 더 무거운 원소를 만드는 표적 물질로만 쓰인다.'},
  {z:98,sym:'Cf',name:'캘리포늄',cat:'actin',period:7,f:10,desc:'캘리포늄은 <strong>금속결합</strong>을 하는 인공 방사성 금속으로, 주로 <strong>Cf³⁺</strong> 이온이 된다. 중성자를 매우 강하게 방출하는 성질을 이용해 금·은 광석을 찾는 중성자방사화분석과 공항의 폭발물 탐지 장비, 암 치료용 중성자원으로 쓰인다.'},
  {z:99,sym:'Es',name:'아인슈타이늄',cat:'actin',period:7,f:11,desc:'아인슈타이늄은 <strong>금속결합</strong>을 하는 인공 방사성 금속으로, 이온 상태는 주로 <strong>Es³⁺</strong>로 예측된다. 1952년 최초의 수소폭탄 실험 잔해에서 발견되어 알베르트 아인슈타인의 이름을 땄으며, 극도로 희귀해 기초 핵물리학 연구에만 쓰인다.'},
  {z:100,sym:'Fm',name:'페르뮴',cat:'actin',period:7,f:12,desc:'페르뮴은 <strong>금속결합</strong>을 하는 인공 방사성 금속으로, 이온 상태는 주로 <strong>Fm³⁺</strong>로 예측된다. 아인슈타이늄과 마찬가지로 1952년 수소폭탄 실험 잔해에서 발견되어 원자로 개발자 엔리코 페르미의 이름을 땄으며, 합성이 극히 어려워 학술 연구에만 쓰인다.'},
  {z:101,sym:'Md',name:'멘델레븀',cat:'actin',period:7,f:13,desc:'멘델레븀은 <strong>금속결합</strong>을 하는 인공 방사성 금속으로, <strong>Md²⁺</strong>·<strong>Md³⁺</strong> 이온 상태를 가질 것으로 예측된다. 주기율표를 고안한 드미트리 멘델레예프의 이름을 땄으며, 한 번에 원자 하나씩만 만들어 존재를 확인한 최초의 원소로 유명하다.'},
  {z:102,sym:'No',name:'노벨륨',cat:'actin',period:7,f:14,desc:'노벨륨은 <strong>금속결합</strong>을 하는 인공 방사성 금속으로, 다른 악티늄족과 달리 <strong>No²⁺</strong> 이온이 유독 안정하게 존재할 것으로 예측된다. 다이너마이트를 발명한 알프레드 노벨의 이름을 땄으며, 반감기가 매우 짧아 실용적 용도는 없다.'},
  {z:103,sym:'Lr',name:'로렌슘',cat:'actin',period:7,f:15,desc:'로렌슘은 <strong>금속결합</strong>을 하는 인공 방사성 금속으로, 이온 상태는 주로 <strong>Lr³⁺</strong>로 예측되는 악티늄족의 마지막 원소다. 입자가속기를 발명한 어니스트 로런스의 이름을 땄으며, 반감기가 매우 짧아 초중원소 연구용으로만 쓰인다.'},
  {z:104,sym:'Rf',name:'러더포듐',cat:'transition',group:4,period:7,desc:'러더포듐은 4족 원소답게 하프늄·지르코늄처럼 <strong>Rf⁴⁺</strong> 이온이 될 것으로 예측되는 최초의 초악티늄족 인공 원소다. 원자핵 구조를 밝힌 물리학자 어니스트 러더퍼드의 이름을 땄으며, 반감기가 매우 짧아 순수 연구용으로만 극미량 합성된다.'},
  {z:105,sym:'Db',name:'더브늄',cat:'transition',group:5,period:7,desc:'더브늄은 5족 원소답게 탄탈럼처럼 <strong>Db⁵⁺</strong> 이온이 될 것으로 예측되는 인공 방사성 원소다. 최초 합성지인 러시아 두브나 합동원자핵연구소의 지명을 땄으며, 반감기가 매우 짧아 실용적 용도는 없다.'},
  {z:106,sym:'Sg',name:'시보귬',cat:'transition',group:6,period:7,desc:'시보귬은 6족 원소답게 텅스텐처럼 <strong>Sg⁶⁺</strong> 이온이 될 것으로 예측되는 인공 방사성 원소다. 초우라늄 원소를 다수 발견한 화학자 글렌 시보그의 이름을 땄으며, 살아있는 과학자의 이름을 딴 최초의 원소로도 유명하다.'},
  {z:107,sym:'Bh',name:'보륨',cat:'transition',group:7,period:7,desc:'보륨은 7족 원소답게 레늄처럼 <strong>Bh⁷⁺</strong> 이온이 될 것으로 예측되는 인공 방사성 원소로, 1981년 독일 GSI 연구소에서 처음 합성되었다. 원자모형을 제시한 물리학자 닐스 보어의 이름을 땄으며 반감기가 극히 짧아 실용적 용도는 없다.'},
  {z:108,sym:'Hs',name:'하슘',cat:'transition',group:8,period:7,desc:'하슘은 8족 원소답게 <strong>오스뮴처럼 높은 산화수 이온이 될 것으로 예측</strong>되는 인공 방사성 원소로, 1984년 GSI 연구소에서 합성되었다. 최초 합성지인 독일 헤센 주의 라틴어 이름을 땄으며 반감기가 매우 짧아 실용적 용도는 없다.'},
  {z:109,sym:'Mt',name:'마이트너륨',cat:'unknown',group:9,period:7,desc:'마이트너륨은 9족 원소로 <strong>이리듐과 비슷한 화학적 성질을 가질 것으로 예측</strong>되는 인공 방사성 원소로, 1982년 GSI 연구소에서 합성되었다. 핵분열 이론에 기여한 물리학자 리제 마이트너의 이름을 딴, 여성 과학자 한 사람의 이름을 단독으로 딴 최초의 원소다.'},
  {z:110,sym:'Ds',name:'다름슈타튬',cat:'unknown',group:10,period:7,desc:'다름슈타튬은 10족 원소로 <strong>백금과 비슷한 화학적 성질을 가질 것으로 예측</strong>되는 인공 방사성 원소로, 1994년 독일 다름슈타트 GSI 연구소에서 니켈과 납 원자를 융합해 합성했다. 발견 도시의 이름을 땄으며 반감기가 극히 짧아 실용적 용도는 없다.'},
  {z:111,sym:'Rg',name:'뢴트게늄',cat:'unknown',group:11,period:7,desc:'뢴트게늄은 11족 원소로 <strong>금과 비슷한 화학적 성질을 가질 것으로 예측</strong>되는 인공 방사성 원소로, 1994년 GSI 연구소에서 합성되었다. X선을 발견해 최초의 노벨 물리학상을 받은 빌헬름 뢴트겐의 이름을 땄으며 반감기가 극히 짧아 실용적 용도는 없다.'},
  {z:112,sym:'Cn',name:'코페르니슘',cat:'transition',group:12,period:7,desc:'코페르니슘은 12족 원소로 수은처럼 상온 부근에서 휘발성이 있고 <strong>Cn²⁺</strong> 이온이 될 것으로 예측되는 인공 방사성 원소로, 1996년 GSI 연구소에서 합성되었다. 지동설을 주장한 천문학자 니콜라우스 코페르니쿠스의 이름을 땄다.'},
  {z:113,sym:'Nh',name:'니호늄',cat:'unknown',group:13,period:7,desc:'니호늄은 13족 원소로 탈륨처럼 <strong>Nh⁺</strong>·<strong>Nh³⁺</strong> 이온이 될 것으로 예측되는 인공 방사성 원소다. 일본 이화학연구소(리켄)가 처음 합성에 성공해 일본의 옛 이름 니혼을 땄으며, 아시아 연구기관이 이름을 붙인 최초의 원소다.'},
  {z:114,sym:'Fl',name:'플레로븀',cat:'post',group:14,period:7,desc:'플레로븀은 14족 원소이지만 <strong>상대론적 효과로 인해 비활성 기체에 가까운 성질을 가질 것으로 예측</strong>되는 특이한 인공 방사성 원소다. 초중원소 합성에 업적을 남긴 러시아 물리학자 게오르기 플료로프의 이름을 땄으며, 1998년 플루토늄과 칼슘을 융합해 합성했다.'},
  {z:115,sym:'Mc',name:'모스코븀',cat:'unknown',group:15,period:7,desc:'모스코븀은 15족 원소로 비스무트와 비슷하게 <strong>Mc⁺</strong>·<strong>Mc³⁺</strong> 이온이 될 것으로 예측되는 인공 방사성 원소다. 최초 합성지인 러시아 두브나가 위치한 모스크바주의 이름을 땄으며, 반감기가 극히 짧아 실용적 용도는 없다.'},
  {z:116,sym:'Lv',name:'리버모륨',cat:'unknown',group:16,period:7,desc:'리버모륨은 16족 원소로 폴로늄처럼 <strong>Lv²⁺</strong> 이온이 될 것으로 예측되는 인공 방사성 원소다. 미국 로렌스 리버모어 국립연구소의 이름을 땄으며, 러시아 두브나 연구소와의 공동 연구로 합성되었다.'},
  {z:117,sym:'Ts',name:'테네신',cat:'unknown',group:17,period:7,desc:'테네신은 17족 할로젠으로, 다른 할로젠처럼 <strong>Ts⁻</strong> 음이온이 될 것으로 예측되지만 금속에 가까운 성질도 함께 예측되는 인공 방사성 원소다. 미국 테네시주의 오크리지 국립연구소 등이 공동 연구에 기여해 주(州) 이름을 땄다.'},
  {z:118,sym:'Og',name:'오가네손',cat:'unknown',group:18,period:7,desc:'오가네손은 18족(비활성 기체)에 속하지만 <strong>상대론적 효과로 전자를 더 쉽게 내주어 다른 비활성 기체와 달리 화합물을 만들 수 있을 것으로 예측</strong>되는 인공 방사성 원소다. 초중원소 연구에 업적을 남긴 러시아 물리학자 유리 오가네시안의 이름을 땄으며, 현재까지 공식 발견된 원소 중 가장 무겁다.'}
];
const PT_CATEGORIES=[
  ['alkali','알칼리 금속'],['alkaline','알칼리 토금속'],['transition','전이 금속'],
  ['lanth','란타넘족'],['actin','악티늄족'],['post','전이 후 금속'],
  ['metalloid','준금속'],['nonmetal','비금속'],['halogen','할로젠'],['noble','비활성 기체']
];
/* 상세 패널 헤더(기호·이름) 글자색을 그 칸의 분류 색과 맞추는 용도.
   다크 모드용은 .pt-cat-* 배경색과 항상 같은 값으로 유지할 것 — 하나를 바꾸면 여기도 같이 바꿔야 함.
   라이트 모드(흰 배경)에서는 같은 원색을 글자색으로 쓰면 대비가 너무 약해(특히 노랑·라임·연회색)
   거의 안 보이므로, 같은 색상 계열의 더 짙은 톤을 별도로 둔다. */
const PT_CAT_COLORS={
  alkali:'#F87171', alkaline:'#FB923C', transition:'#60A5FA', lanth:'#C084FC',
  actin:'#F472B6', post:'#D6D3D1', metalloid:'#A3E635', nonmetal:'#22D3EE',
  halogen:'#FDE047', noble:'#818CF8', unknown:'#94A3B8'
};
const PT_CAT_COLORS_LIGHT={
  alkali:'#DC2626', alkaline:'#C2410C', transition:'#2563EB', lanth:'#9333EA',
  actin:'#DB2777', post:'#57534E', metalloid:'#4D7C0F', nonmetal:'#0E7490',
  halogen:'#A16207', noble:'#4F46E5', unknown:'#475569'
};
/* 간략히 보기: 1~20번 외에 불꽃반응 예시로 다루는 원소 + 1족·17족 세로줄이 2족처럼 6주기까지
   끊기지 않고 이어지도록 채워 넣는 알칼리 금속·할로젠 (Fr은 7주기라 간략히 보기 격자에 자리가 없음) */
const PT_SIMPLE_EXTRA_Z=[35,37,38,53,55,56,85]; // Br, Rb, Sr, I, Cs, Ba, At
/* 중학교 불꽃 반응 색 (원소기호별 실제 관찰색) */
const PT_FLAME_COLORS=[
  {z:29,color:'#22D3EE',label:'청록'}, // 구리
  {z:3, color:'#EF4444',label:'빨강'}, // 리튬
  {z:11,color:'#FDE047',label:'노랑'}, // 나트륨
  {z:19,color:'#C084FC',label:'보라'}, // 칼륨
  {z:38,color:'#F87171',label:'빨강'}, // 스트론튬
  {z:56,color:'#A3E635',label:'황록'}, // 바륨
  {z:20,color:'#FB923C',label:'주황'}  // 칼슘
];
/* MODE 7(주기·족 맞추기) 출제 범위: 1~20번 + 할로젠 전부 + 알칼리 금속 전부 = 25종.
   7주기(Fr)는 교육과정에서 다루지 않으므로 period<=6으로 자른다 — 간략히 보기 표도 6주기까지만
   그리므로 이렇게 해야 퀴즈 범위와 주기율표가 정확히 일치한다.
   Ts(117)는 실제로는 17족이지만 cat이 'unknown'이라 여기서 자동으로 빠진다 — 교육과정에서 다루지 않으므로 의도된 결과.
   이 25종 안에서는 (주기, 족) 좌표가 서로 겹치지 않아 「주기·족 → 원소」 방향도 정답이 하나로 확정된다. */
const PT_QUIZ_ELEMENTS=ELEMENTS.filter(e=>e.period<=6&&(e.z<=20||e.cat==='halogen'||e.cat==='alkali'));
const PT_QUIZ_SYMBOLS=PT_QUIZ_ELEMENTS.map(e=>e.sym);

/* ── 전자껍질 ──
   1~20번은 K·L·M·N 껍질에 2·8·8·2 순으로 채우면 교과서 배치와 정확히 일치한다.
   (M 껍질은 원리상 18개까지 들어가지만 19·20번 전자는 M이 8개 찬 뒤 N 껍질부터 들어가므로
    학교에서 쓰는 모형은 2,8,8,2다. 네 값의 합이 정확히 20이라 1~20번은 이 규칙만으로 전부 맞는다.)
   21번부터는 3d가 끼어들어 이 규칙이 깨지므로 이 함수는 1~20번 전용이다. */
const SHELL_CAPS=[2,8,8,2];
function shellsOf(z){
  const out=[]; let left=z;
  for(const cap of SHELL_CAPS){ if(left<=0) break; const n=Math.min(cap,left); out.push(n); left-=n; }
  return out;
}
/* ── 최외각 전자 vs 원자가 전자 ──
   두 값은 18족에서만 다르고, 그 차이가 이 앱에서 중요하다.

   · 최외각 전자 = 가장 바깥 껍질에 "실제로 들어 있는" 전자 수. He 2개, Ne·Ar 8개.
     그림에 점을 몇 개 찍을지, 오답 보기의 숫자를 뭘로 할지 같은 "눈에 보이는 개수"는 이쪽이다.
   · 원자가 전자 = 화학 결합에 "참여하는" 전자 수. 18족은 이미 안정해 결합에 관여하지 않으므로 0.
     퀴즈 정답은 이쪽이다 — 「Ne의 원자가 전자 = 0」이 「Ne은 이온이 되지 않는다」를 그 자체로 설명한다.

   족 번호로 구하면 헬륨에서 틀린다(He는 18족이지만 K 껍질뿐이라 최외각 2개다).
   껍질 배치의 마지막 값을 쓰면 항상 옳다. */
function outerShellOf(z){ const s=shellsOf(z); return s[s.length-1]; }
function valenceOf(z){
  const e=ELEMENTS.find(x=>x.z===z);
  return e && e.group===18 ? 0 : outerShellOf(z);
}
/* 그 껍질이 꽉 찬 상태의 전자 수. 1주기(H·He)는 K 껍질뿐이라 8이 아니라 2다(듀엣 규칙).
   이걸 8로 고정하면 수소 문제에 「전자 7개를 잃는다」 같은, 있지도 않은 전자를 잃는 보기가 생긴다. */
function fullShellOf(z){ return z<=2 ? 2 : 8; }

/* ── 이온 형성 (중학 [9과11-04]) ──
   단원자 이온을 만드는 1~20번 원소만 명시적으로 적는다. 규칙으로 자동 생성하지 않는 이유는
   족만 보고 만들면 화학적으로 틀린 이온이 섞이기 때문이다.
   · B(13족)·C·Si(14족)는 단원자 이온을 만들지 않고 공유결합을 하므로 뺐다.
   · He·Ne·Ar은 이미 안정해서 이온이 되지 않는다 — 그 자체가 학습 내용이라 문제에는 넣는다.
   n = 주고받는 전자 수, dir = 'lose'(양이온) | 'gain'(음이온) */
const ION_FORMING=[
  /* 수소는 전자가 1개뿐이라 그걸 잃으면 껍질이 통째로 사라진다 — 「전자를 주고받아 안정한
     배치가 된다」는 이 모드의 논리가 성립하지 않는다. 전자 1개를 얻어 K 껍질을 2개로 채우면
     헬륨과 같은 배치가 되고, 이것이 같은 앱의 공유결합 그림(H는 전부 pairs:1)과도 맞는다.
     H⁺가 틀린 게 아니라 산·염기에서 배우는 내용이라, 오답 보기에 그 안내를 붙여 둔다. */
  {z:1,  n:1, dir:'gain'},   /* H  → H⁻   전자 1개를 얻어 헬륨과 같은 배치 */
  {z:3,  n:1, dir:'lose'},   /* Li → Li⁺  */
  {z:11, n:1, dir:'lose'},   /* Na → Na⁺  */
  {z:19, n:1, dir:'lose'},   /* K  → K⁺   */
  {z:4,  n:2, dir:'lose'},   /* Be → Be²⁺ */
  {z:12, n:2, dir:'lose'},   /* Mg → Mg²⁺ */
  {z:20, n:2, dir:'lose'},   /* Ca → Ca²⁺ */
  {z:13, n:3, dir:'lose'},   /* Al → Al³⁺ */
  {z:7,  n:3, dir:'gain'},   /* N  → N³⁻  질화 이온 */
  {z:15, n:3, dir:'gain'},   /* P  → P³⁻  인화 이온 */
  {z:8,  n:2, dir:'gain'},   /* O  → O²⁻  */
  {z:16, n:2, dir:'gain'},   /* S  → S²⁻  */
  {z:9,  n:1, dir:'gain'},   /* F  → F⁻   */
  {z:17, n:1, dir:'gain'}    /* Cl → Cl⁻  */
];
/* 이온이 되지 않는 원소 — 바깥 껍질이 이미 꽉 차서 원자가 전자가 0이다 */
const ION_NOBLE=[2,10,18];   /* He, Ne, Ar */

/* 이온이 된 뒤의 전자 수는 위 14종 전부 정확히 He(2)·Ne(10)·Ar(18) 중 하나가 된다.
   "왜 하필 그 개수를 주고받는가"에 대한 답이 이것이므로 해설에서 이름으로 불러 준다.
   (수소가 전자를 얻어 헬륨과 같은 배치가 되는 것도 이 규칙 안에 있다.) */
function ionTargetNoble(item){
  const after=item.z+(item.dir==='gain'?item.n:-item.n);
  return ELEMENTS.find(e=>e.z===after&&e.group===18)||null;
}

/* 원자가 전자 문제는 1~20번 전부 낼 수 있다(18족은 답이 0이고, 그 0이 학습 내용이다).
   이온 문제만 위 목록으로 제한된다. */
const SHELL_QUIZ_ELEMENTS=ELEMENTS.filter(e=>e.z<=20);

/* ── 이온식 쓰기 (고2 「화학」) ──
   2022 개정에서 중학교의 이온식이 빠졌지만 없어진 게 아니라 고2로 미뤄졌다.
   [12화학04-03] 중화 반응의 양적 관계를 하려면 H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O를 써야 하고,
   진로선택 「화학 반응의 세계」의 반쪽 반응식도 마찬가지다. 그래서 이 구역에 둔다.

   f는 입력·채점용 원문(ASCII)이고 화면에는 아래첨자·위첨자로 렌더된다.
   전하는 끝에 붙는 [숫자][+/-] 꼴로 통일한다 — 전하 키가 통째로 넣어 주므로
   'SO4' 뒤의 '2'가 아래첨자인지 전하인지 모호해지지 않는다. */
const IONS_WRITE=[
  /* 단원자 — 중학에서 개념으로 배운 것을 여기서 표기까지 익힌다 */
  {name:'수소 이온',      f:'H^+'},
  {name:'나트륨 이온',    f:'Na^+'},
  {name:'칼륨 이온',      f:'K^+'},
  {name:'칼슘 이온',      f:'Ca^2+'},
  {name:'마그네슘 이온',  f:'Mg^2+'},
  {name:'알루미늄 이온',  f:'Al^3+'},
  {name:'염화 이온',      f:'Cl^-'},
  {name:'산화 이온',      f:'O^2-'},
  /* 다원자 — 중화 반응·산염기에서 실제로 필요한 것들.
     ^ 앞의 숫자는 아래첨자(원자 개수), ^ 뒤는 전하다. NH4^+ 는 질소 1·수소 4에 전하 +1이다. */
  {name:'암모늄 이온',    f:'NH4^+'},
  {name:'수산화 이온',    f:'OH^-'},
  {name:'질산 이온',      f:'NO3^-'},
  {name:'탄산 이온',      f:'CO3^2-'},
  {name:'탄산수소 이온',  f:'HCO3^-'},
  {name:'황산 이온',      f:'SO4^2-'},
  {name:'인산 이온',      f:'PO4^3-'},
  {name:'아세트산 이온',  f:'CH3COO^-'}
];
/* 이온식을 치려면 K·Al처럼 반응식용 키패드(CORE_ELEMENTS)에 없는 기호가 필요하다 */
const ION_WRITE_SYMBOLS=(()=>{
  const set=[];
  IONS_WRITE.forEach(i=>{
    (i.f.replace(/[0-9+\-]/g,'').match(/[A-Z][a-z]?/g)||[]).forEach(s=>{ if(!set.includes(s)) set.push(s); });
  });
  return set;
})();

/* ── 앙금 생성 반응 (심화 · 2022 개정 범위 밖) ──
   "앙금"은 2022 개정 고시 292쪽 전체에 0회 나온다. 2015 개정 중학교 [9과08-04] 탐구 활동에
   있었고 어느 학년에서도 다시 나오지 않으므로 심화로 둔다.

   문제는 이온식을 보여주고 앙금 이름·색만 묻는다. 이온식 자체는 고2 화학 구역 내용이라
   여기서 외우게 하면 순서가 꼬인다 — 읽기만 하면 되게 한다.
   색은 학교 실험에서 실제로 관찰되는 것만 넣었다. 애매한 것(탄산은 등)은 뺐다. */
const PRECIPITATES=[
  {a:'Ag^+', b:'Cl^-',   f:'AgCl',   name:'염화 은',      color:'흰색'},
  {a:'Ag^+', b:'I^-',    f:'AgI',    name:'아이오딘화 은', color:'노란색'},
  {a:'Ca^2+',b:'CO3^2-', f:'CaCO3',  name:'탄산 칼슘',    color:'흰색'},
  {a:'Ba^2+',b:'CO3^2-', f:'BaCO3',  name:'탄산 바륨',    color:'흰색'},
  {a:'Ba^2+',b:'SO4^2-', f:'BaSO4',  name:'황산 바륨',    color:'흰색'},
  {a:'Pb^2+',b:'I^-',    f:'PbI2',   name:'아이오딘화 납', color:'노란색'},
  {a:'Cu^2+',b:'S^2-',   f:'CuS',    name:'황화 구리',    color:'검은색'},
  {a:'Pb^2+',b:'S^2-',   f:'PbS',    name:'황화 납',      color:'검은색'},
  {a:'Cd^2+',b:'S^2-',   f:'CdS',    name:'황화 카드뮴',  color:'노란색'},
  /* 앙금이 생기지 않는 조합도 넣어야 "무조건 뭔가 생긴다"고 오해하지 않는다.
     1족 이온·질산 이온이 든 염은 물에 잘 녹는다. */
  {a:'Na^+', b:'Cl^-',   none:true},
  {a:'K^+',  b:'NO3^-',  none:true},
  {a:'Na^+', b:'SO4^2-', none:true},
  {a:'K^+',  b:'CO3^2-', none:true}
];

/* 앙금 문제의 오답노트 제목용 한글 이름.
   식을 그대로 제목에 쓰면 목록에 `Ag^+ + Cl^-`처럼 ^가 노출된다(^는 아래첨자와 전하를
   가르려고 넣은 내부 기호라 화면에 절대 나오면 안 된다). 제목은 학생이 읽는 말로 적는다.
   문제 화면의 식 자체는 그대로 위첨자로 렌더되므로 표기를 못 배우는 것도 아니다. */
const ION_KO={
  'Ag^+':'은 이온',      'Na^+':'나트륨 이온',  'K^+':'칼륨 이온',
  'Ca^2+':'칼슘 이온',   'Ba^2+':'바륨 이온',   'Pb^2+':'납 이온',
  'Cu^2+':'구리 이온',   'Cd^2+':'카드뮴 이온',
  'Cl^-':'염화 이온',    'I^-':'아이오딘화 이온','S^2-':'황화 이온',
  'NO3^-':'질산 이온',   'CO3^2-':'탄산 이온',  'SO4^2-':'황산 이온'
};
function ionKo(f){ return ION_KO[f]||String(f).replace(/\^/g,''); }

/* ── 오비탈 (심화 · 2022 개정 범위 밖) ──
   2015 화학Ⅰ에 있던 원자 구조·오비탈이 2022 개정 「화학」에서 통째로 빠졌다.
   그래서 학생은 전자껍질에 2·8·18개가 들어간다는 것을 쓰기만 하고 왜 그런지는 안 배운다.
   그 "왜"를 채우는 용도라 심화에 두기 딱 맞다. */
const ORBITAL_KINDS=[
  {kind:'s', count:1, max:2},
  {kind:'p', count:3, max:6},
  {kind:'d', count:5, max:10},
  {kind:'f', count:7, max:14}
];
/* 껍질별 최대 전자 수 = 2n². 그 안에 어떤 오비탈이 들어차는지도 함께 보여 준다. */
const ORBITAL_SHELLS=[
  {n:1, name:'K', max:2,  make:'1s'},
  {n:2, name:'L', max:8,  make:'2s + 2p'},
  {n:3, name:'M', max:18, make:'3s + 3p + 3d'},
  {n:4, name:'N', max:32, make:'4s + 4p + 4d + 4f'}
];

/* 결합 차수 이름 — 고2 「화학」 [12화학02-03] 루이스 전자점식에서 쓰는 용어다.
   통합과학1에서는 공유 전자쌍 개수를 그림으로만 다루고 이 이름은 쓰지 않는다. */
const BOND_ORDER_NAME={1:'단일결합',2:'이중결합',3:'삼중결합'};

/* ── 화학 결합 (통합과학1 [10통과1-02-04]) ──
   성취기준의 예시가 "물, 산소, 소금"이고, 내용 요소는 이온 결합·공유 결합 두 가지뿐이다.
   금속결합은 통합과학1 내용 요소에 없으므로 넣지 않는다.
   결합 차수(단일·이중·삼중)라는 용어도 고2 「화학」 소관이라 여기서는 쓰지 않는다 —
   공유 전자쌍의 개수는 그림에 사실대로 그리되 이름을 붙이지 않는다.

   ionic:    give = 금속 1개가 내놓는 전자 수, take = 비금속 1개가 받는 전자 수,
             nM·nX = 화학식 속 금속·비금속 원자 수. nM*give === nX*take 여야 전자 수지가 맞는다.
   covalent: center를 가운데 두고 ligands가 둘러싼 모양으로 그린다.
             pairs = 그 원자와 나누는 공유 전자쌍 수. */
const BONDS=[
  /* 이온 결합 — 금속이 전자를 내주고 비금속이 받는다 */
  {name:'염화나트륨', f:'NaCl',  type:'ionic', M:'Na', X:'Cl', give:1, take:1, nM:1, nX:1, note:'소금'},
  {name:'산화마그네슘',f:'MgO',   type:'ionic', M:'Mg', X:'O',  give:2, take:2, nM:1, nX:1},
  {name:'염화칼슘',   f:'CaCl2', type:'ionic', M:'Ca', X:'Cl', give:2, take:1, nM:1, nX:2},
  {name:'염화마그네슘',f:'MgCl2', type:'ionic', M:'Mg', X:'Cl', give:2, take:1, nM:1, nX:2},
  {name:'산화칼슘',   f:'CaO',   type:'ionic', M:'Ca', X:'O',  give:2, take:2, nM:1, nX:1},
  {name:'산화리튬',   f:'Li2O',  type:'ionic', M:'Li', X:'O',  give:1, take:2, nM:2, nX:1},
  {name:'플루오린화나트륨',f:'NaF',type:'ionic', M:'Na', X:'F',  give:1, take:1, nM:1, nX:1},
  {name:'염화칼륨',   f:'KCl',   type:'ionic', M:'K',  X:'Cl', give:1, take:1, nM:1, nX:1},

  /* 공유 결합 — 비금속끼리 전자쌍을 나눠 갖는다 */
  {name:'수소',   f:'H2',  type:'covalent', center:'H', ligands:[{sym:'H', pairs:1}]},
  {name:'염소',   f:'Cl2', type:'covalent', center:'Cl',ligands:[{sym:'Cl',pairs:1}]},
  {name:'산소',   f:'O2',  type:'covalent', center:'O', ligands:[{sym:'O', pairs:2}]},
  {name:'질소',   f:'N2',  type:'covalent', center:'N', ligands:[{sym:'N', pairs:3}]},
  {name:'물',     f:'H2O', type:'covalent', center:'O', ligands:[{sym:'H',pairs:1},{sym:'H',pairs:1}]},
  {name:'암모니아',f:'NH3', type:'covalent', center:'N', ligands:[{sym:'H',pairs:1},{sym:'H',pairs:1},{sym:'H',pairs:1}]},
  {name:'메테인', f:'CH4', type:'covalent', center:'C', ligands:[{sym:'H',pairs:1},{sym:'H',pairs:1},{sym:'H',pairs:1},{sym:'H',pairs:1}]},
  {name:'이산화탄소',f:'CO2',type:'covalent',center:'C', ligands:[{sym:'O',pairs:2},{sym:'O',pairs:2}]},
  {name:'염화수소',f:'HCl', type:'covalent', center:'Cl',ligands:[{sym:'H',pairs:1}]}
];

