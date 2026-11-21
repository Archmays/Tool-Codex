import type { MaterialId } from './materials';

interface Part {
  title: string;
  description: string;
  materialIds: readonly MaterialId[];
  sourcePreview: string;
}

export const pencilParts = {
  "all": {
    title: "铅笔里面藏着什么？",
    description: "外面是薄漆和两片开槽木壳，正中间夹着一根从头通到尾的笔芯。点任意部件，看它的材料和来历。",
    materialIds: ["wood", "graphite", "clay", "lacquer"],
    sourcePreview: "点「透视看」或拖动滑条拆开它",
  },
  "wood-upper": {
    title: "上半木壳",
    description: "里面刨着一条半圆凹槽，和另一片木壳粘合后，把细脆的笔芯保护在正中间，也方便小手握住和卷笔刀削尖。",
    materialIds: ["wood"],
    sourcePreview: "来自森林原木 → 锯板烘干 → 刨出半圆槽",
  },
  "wood-lower": {
    title: "下半木壳",
    description: "里面刨着一条半圆凹槽，和另一片木壳粘合后，把细脆的笔芯保护在正中间，也方便小手握住和卷笔刀削尖。",
    materialIds: ["wood"],
    sourcePreview: "来自森林原木 → 锯板烘干 → 刨出半圆槽",
  },
  "core": {
    title: "连续笔芯",
    description: "真正负责写字的零件！从笔尖一直延伸到笔尾，摩擦纸面时留下极细的石墨颗粒。它不含金属铅。",
    materialIds: ["graphite", "clay"],
    sourcePreview: "来自地下石墨矿与黏土矿 → 混合挤条高温烧结",
  },
  "paint-upper": {
    title: "上半涂层",
    description: "紧贴在未削木杆表面的光滑保护薄层，防潮防脏不扎手，还能印上 HB/2B 型号。（剥离展示仅为看清薄层）",
    materialIds: ["lacquer"],
    sourcePreview: "矿物/有机颜料与树脂调配 → 多次薄涂烘干",
  },
  "paint-lower": {
    title: "下半涂层",
    description: "紧贴在未削木杆表面的光滑保护薄层，防潮防脏不扎手，还能印上 HB/2B 型号。（剥离展示仅为看清薄层）",
    materialIds: ["lacquer"],
    sourcePreview: "矿物/有机颜料与树脂调配 → 多次薄涂烘干",
  },
  "seam": {
    title: "中间胶合缝",
    description: "两片开槽木壳和笔芯之间涂有木工胶，干透后把三部分牢牢粘成一体，写字时笔芯不会滑动。",
    materialIds: ["glue"],
    sourcePreview: "合成水性树脂胶液 → 涂槽压合固化",
  },
  "tip": {
    title: "笔尖区域",
    description: "卷笔刀削去前端涂层和一圈木头，露出裸露木纹和尖尖的笔芯。它是写字的工作区，不是另外装上去的零件。",
    materialIds: ["wood", "graphite", "clay"],
    sourcePreview: "削切后同时露出木壳与笔芯两种材料",
  },
} satisfies Record<string, Part>;

export type PencilPartId = keyof typeof pencilParts;
