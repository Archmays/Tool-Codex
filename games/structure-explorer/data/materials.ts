export const materialIds = ["wood", "graphite", "clay", "lacquer", "glue", "paper-fiber", "rubber"] as const;
export type MaterialId = typeof materialIds[number];

export interface Material {
  id: MaterialId;
  shortName: string;
  name: string;
  category: string;
  swatchColor: string;
  traits: readonly string[];
  sourceHeadline: string;
  originSteps: readonly { iconId: string; stage: string; title: string; detail: string }[];
  whyThisMaterial: { question: string; answer: string };
  usedInExhibits: readonly string[];
  scienceNote: string;
}

export const materials: Record<MaterialId, Material> = {
  "wood": {
    id: "wood",
    shortName: "木材",
    name: "软质直纹木材（如香柏、椴木）",
    category: "来自森林植物",
    swatchColor: "#ce9b65",
    traits: ["质地较软好削", "木纹笔直不易弯", "轻巧不压手"],
    sourceHeadline: "来自森林里专门培育的树木（常见如雪松/香柏、椴木）。",
    originSteps: [
      { iconId: "tree", stage: "原料", title: "森林原木", detail: "挑选木纹笔直、质地偏软的树干（如香柏或椴木），采伐后运到木材厂。" },
      { iconId: "slats", stage: "准备", title: "锯板烘干", detail: "把原木锯成薄薄的窄木板，再烘干去掉多余水分，这样以后不容易弯翘开裂。" },
      { iconId: "groove", stage: "加工", title: "刨出凹槽", detail: "用机器在木板表面刨出整齐的半圆形长凹槽，刚好能稳稳放进细细的笔芯。" },
      { iconId: "press", stage: "成形", title: "夹芯成形", detail: "涂上胶水放进笔芯，盖上另一片开槽木板压紧，再刨切打磨成六角形或圆形笔杆。" },
    ],
    whyThisMaterial: {
      question: "如果把木壳换成硬铁管或很硬的橡木，会发生什么？",
      answer: "卷笔刀会根本削不动，而且拿在手里又重又滑！软质直纹木既能保护里面脆弱的笔芯不断，又能让卷笔刀顺着木纹轻松削出尖尖的笔头。",
    },
    usedInExhibits: ['pencil'],
    scienceNote: "工厂实际生产时会用宽木板一次开出多条槽，压合后再切分成多支铅笔；这里用单支上下两片木壳展示相同的“三明治夹芯”原理。",
  },
  "graphite": {
    id: "graphite",
    shortName: "石墨",
    name: "石墨（天然碳矿物）",
    category: "来自地下矿藏（也可工业高温制得）",
    swatchColor: "#444951",
    traits: ["颜色深黑", "层状结构很滑溜", "摩擦易脱落留痕"],
    sourceHeadline: "来自地底下的石墨矿石（由碳元素组成），不是金属铅。",
    originSteps: [
      { iconId: "mine", stage: "原料", title: "开采石墨矿", detail: "工人从地下的石墨矿脉里开采出灰黑色、摸起来滑滑的石墨矿石（部分也可由含碳原料高温制成）。" },
      { iconId: "sieve", stage: "准备", title: "粉碎淘洗", detail: "把矿石碾碎成非常细腻的黑色粉末，洗掉里面混杂的砂石杂质。" },
      { iconId: "mix", stage: "加工", title: "混合黏土", detail: "把石墨粉和黏土粉按配方比例加水揉匀——石墨越多，笔芯就越软、写出来越黑。" },
      { iconId: "kiln", stage: "成形", title: "挤条烧结", detail: "把黑泥挤成细长的圆条，烘干后送进高温窑炉烧结定型，再浸少量蜡让写字更顺滑。" },
    ],
    whyThisMaterial: {
      question: "为什么叫“铅笔”，里面却不用真的金属铅？",
      answer: "几百年前人们刚发现石墨矿时，误以为它是一种黑铅，所以沿用了“铅笔”的名字。金属铅既重又有毒，而石墨安全无毒，它的微观结构像一叠很容易滑开的薄纸片，轻轻一蹭就能在纸上留下黑印。",
    },
    usedInExhibits: ['pencil'],
    scienceNote: "现代铅笔芯有时也会使用人造石墨；高温烧结温度与浸蜡配方因厂家而异，此处讲的是通用制造原理。",
  },
  "clay": {
    id: "clay",
    shortName: "黏土",
    name: "细黏土（如高岭土）",
    category: "来自地层黏土矿",
    swatchColor: "#ae765f",
    traits: ["加水可塑形", "高温烧后变坚硬", "调节笔芯软硬"],
    sourceHeadline: "来自地下的黏土矿层，和烧制陶瓷用的是同一类细黏土。",
    originSteps: [
      { iconId: "mine", stage: "原料", title: "采掘黏土", detail: "从天然黏土矿层中挖出细腻的黏土原料。" },
      { iconId: "sieve", stage: "准备", title: "水洗提纯", detail: "加水搅拌沉淀，筛掉粗砂粒，只留下极细滑的黏土泥浆。" },
      { iconId: "mix", stage: "加工", title: "与石墨配比", detail: "和石墨粉按比例混合——想做硬笔芯（如 2H）就多放黏土，想做软笔芯（如 2B）就少放黏土。" },
      { iconId: "kiln", stage: "成形", title: "窑炉烧硬", detail: "混合挤成细丝后，在高温窑炉里烧结，黏土会变硬，像“骨架”一样把石墨粉牢牢拉在一起。" },
    ],
    whyThisMaterial: {
      question: "如果笔芯里 100% 全是石墨、一点黏土都不加，会怎样？",
      answer: "纯石墨太软也太容易碎，稍微一用力就会折断，还会把手指和纸面蹭得黑乎乎的。加入黏土烧结，就像给石墨搭了坚固的骨架，还能调出从硬到软的不同型号。",
    },
    usedInExhibits: ['pencil'],
    scienceNote: "不同厂家会调整黏土种类、配方和烧制条件。",
  },
  "lacquer": {
    id: "lacquer",
    shortName: "漆膜",
    name: "颜料与树脂漆膜",
    category: "矿物/合成颜料 + 树脂调配",
    swatchColor: "#ddac28",
    traits: ["防潮防脏", "表面光滑不扎手", "颜色醒目易辨认"],
    sourceHeadline: "由着色的颜料和能结成薄膜的树脂在工厂调配而成。",
    originSteps: [
      { iconId: "mix", stage: "原料", title: "准备颜料与树脂", detail: "把负责上色的矿物或有机颜料，与负责结膜保护的树脂（水性或油性漆基）混合调匀。" },
      { iconId: "coat", stage: "准备", title: "多次薄涂", detail: "把打磨好的裸木笔杆一次次穿过涂漆槽，让漆液均匀裹在木头表面。" },
      { iconId: "kiln", stage: "加工", title: "烘干固化", detail: "每涂一层就烘干，通常会涂好几层，形成光滑紧贴木头的薄保护膜。" },
      { iconId: "stamp", stage: "成形", title: "印上标记", detail: "在干透的漆面上压印型号（如 HB、2B），方便一眼认出这支笔的软硬。" },
    ],
    whyThisMaterial: {
      question: "不刷漆的裸木铅笔也能写字，为什么要多加这一层漆？",
      answer: "这层薄漆像给木头穿上雨衣：手心的汗水不容易浸进木头让笔杆发潮变形，表面更光滑不会有小木刺，也能清楚印上型号标志。",
    },
    usedInExhibits: ['pencil'],
    scienceNote: "漆膜牢固附着在木壳表面；3D 中把涂层剥开展示，仅是为了看清它很薄，现实中不能整片拆下。",
  },
  "glue": {
    id: "glue",
    shortName: "木工胶",
    name: "木工胶黏剂（如白胶）",
    category: "化工合成树脂乳液",
    swatchColor: "#ae9870",
    traits: ["干后牢固粘合", "把两片木壳合二为一", "固定笔芯不滑动"],
    sourceHeadline: "工厂用化工原料合成的水性树脂胶液（常见如木工白胶）。",
    originSteps: [
      { iconId: "mix", stage: "原料", title: "合成胶液", detail: "在化工厂将树脂原料制成乳白色、带黏性的水性木工胶。" },
      { iconId: "coat", stage: "准备", title: "涂布槽面", detail: "将胶水均匀涂在刨好凹槽的木板表面和槽内。" },
      { iconId: "press", stage: "加工", title: "合盖加压", detail: "放入笔芯后盖上另一片木板，用压力机紧紧压合。" },
      { iconId: "slats", stage: "成形", title: "固化定型", detail: "胶水干透变硬后，两片木壳和笔芯就紧紧粘成一个整体，只在端面留下一条极细的接合缝。" },
    ],
    whyThisMaterial: {
      question: "如果不涂胶水，只把两片木头拼在一起包住笔芯，写字时会怎样？",
      answer: "一用力写字，两片木头就会错开散架，笔芯也会往笔杆里面缩进去！胶水把三个零件变成了一支结实的笔。",
    },
    usedInExhibits: ['pencil'],
    scienceNote: "这条线表示接合位置，线宽不是胶层的实际厚度。",
  },
  "paper-fiber": {
    id: "paper-fiber",
    shortName: "纸纤维",
    name: "植物纤维（纤维素）",
    category: "来自树木与回收废纸",
    swatchColor: "#e8dfc7",
    traits: ["纤维交错成网", "微观表面有凹凸", "能磨下石墨颗粒"],
    sourceHeadline: "主要来自森林树木的木浆纤维，也可以来自回收再利用的旧纸。",
    originSteps: [
      { iconId: "tree", stage: "原料", title: "木材切片", detail: "树干去掉树皮后切成小木片（或收集分类好的回收废纸）。" },
      { iconId: "mix", stage: "准备", title: "制浆分散", detail: "通过蒸煮或机械研磨，把木片分散成无数根极细的植物纤维，混在水里变成纸浆。" },
      { iconId: "sieve", stage: "加工", title: "抄网脱水", detail: "把纸浆均匀铺在细密的滤网上，沥掉大部分水，纤维就纵横交错地贴在一起。" },
      { iconId: "press", stage: "成形", title: "压榨烘干", detail: "经过热滚筒压平烘干，变成看起来平整、放大后其实凹凸不平的纸张。" },
    ],
    whyThisMaterial: {
      question: "为什么铅笔在纸上很容易写出黑线，在光滑的玻璃上却几乎写不出来？",
      answer: "纸由无数植物纤维交错压成，放大看像微小的山丘和山谷，正好能把铅笔芯上的石墨颗粒磨下来卡在缝隙里；玻璃太光滑了，磨不下石墨。",
    },
    usedInExhibits: ['pencil'],
    scienceNote: "纸面的凹凸是放大示意；不同纸张的纤维和表面处理会不同。",
  },
  "rubber": {
    id: "rubber",
    shortName: "橡皮",
    name: "天然橡胶或合成橡胶/软质塑料",
    category: "橡胶树乳汁 或 石油化工合成",
    swatchColor: "#cc8e92",
    traits: ["柔软有弹性", "摩擦易黏附颗粒", "边擦边卷成屑"],
    sourceHeadline: "传统橡皮来自热带橡胶树的白色乳汁，现代学生橡皮也常用石油提炼的合成橡胶或软质塑料（如聚氯乙烯或热塑性橡胶）制成。",
    originSteps: [
      { iconId: "tree", stage: "原料", title: "获取原料", detail: "从橡胶树割取白色天然乳胶，或在化工厂合成弹性橡胶/软塑颗粒。" },
      { iconId: "mix", stage: "准备", title: "加入配料", detail: "混入软化剂、细微填料和颜料，让橡皮既不会太硬划破纸，也不会太黏糊成一团。" },
      { iconId: "press", stage: "加工", title: "加热压模", detail: "把混好的橡皮料加热软化，压制成方块或长条形状。" },
      { iconId: "stamp", stage: "成形", title: "切割包装", detail: "冷却定型后切成趁手的大小，就能用来把纸面上的石墨颗粒粘走。" },
    ],
    whyThisMaterial: {
      question: "橡皮把黑字擦掉后，那些黑色是“消失不见”了吗？",
      answer: "没有消失！橡皮比纸更能“抓住”石墨颗粒，摩擦时橡皮表层会裹着石墨一起搓成灰黑色的橡皮屑掉下来，只是把石墨从纸面转移走了。",
    },
    usedInExhibits: ['pencil'],
    scienceNote: "天然橡胶、合成橡胶和软质塑料橡皮的配方与工艺各有不同。摩擦使接触处变形并裹走石墨，橡皮不必熔化。",
  },
};
