export const WORLD_COPY = {
  title: "工具箱",
  treasureTitle: "游戏百宝箱",
  treasureAction: "打开百宝箱",
  settingsAction: "声音、画面和家长角",
  closeAction: "返回工具箱",
} as const;

export const WORLD_PRIMARY_COPY = Object.values(WORLD_COPY).join("\n");
