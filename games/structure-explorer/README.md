# 结构探索馆

与汉字书房、英语书房同级的独立结构与原理工具。首页入口 → 目录 `?play=structure-explorer` → 铅笔 `?play=structure-explorer&exhibit=pencil` → 返回目录或首页。

## 使用

点击目录中的铅笔卡片，或展开材料图鉴中的七张材料卡。鼠标、触摸或键盘均可操作；四个模式用方向键切换，Tab 离开模式区域。纸面可点击或拖动，也可用滑条移动工具。

- **拆开看**：可看整支笔、透视、拆解、纵剖与横剖。BOOM 与拆开程度滑条联动。点击真实几何或部件芯片，在原位高亮并打开档案卡。可开关浮动标签，也可从档案卡主动打开单件大图。选择旋转或平移后，可用鼠标或单指拖动。滚轮或双指捏合可缩放，按住 Shift 可临时平移。辅助旋转、缩放与移动控件在折叠区。Esc 关闭大图，恢复原视图与打开按钮的焦点。再按 Esc 退出原位高亮。
- **材料从哪来**：大自然材料地图提供五类入口，展开木材、石墨、黏土、涂层、胶黏剂、纸纤维和橡皮的四步来源链。部件档案和橡皮卡可以直达对应材料。
- **比一比**：自由试写保留原有笔迹。笔芯等级带动石墨与黏土的定性配比示意；比较台分别控制笔芯、力度、纸面或遍数，每次只改一个变量。三条结果同时保留，换自由试写的纸不清空比较结果。
- **擦一擦**：从已有痕迹观察擦除，并查看橡皮的组成与来源。明确点“先画一条线”准备笔迹。自动擦除不会补画黑线。纸面局部示意可用上一步、下一步或滑条观察接触和石墨转移。

短问题与操作、结果紧邻，延伸问题按兴趣展开。笔迹深浅是定性教学模型，机器检查不证明实际儿童理解。

首期只有普通木杆铅笔：木壳与笔芯、石墨留下笔迹、橡皮带走部分石墨。目录从 data/exhibits.ts 读取展品，材料图鉴和铅笔材料地图共用 data/materials.ts，部件档案读取 data/pencil-parts.ts。

`structure-explorer/pencil.html` 是 Vite 的独立构建入口，保持原来的展品 URL 和 iframe 样式隔离；`games/structure-explorer/pencil.js` 管理展品，`pencil-geometry.ts` 定义三维部件，`pencil-3d.ts` 负责渲染、几何拾取与输入。Three.js 随项目打包，无 CDN。端面纹、顺纹和笔芯颗粒在本地生成。原 SVG 和预览图保留，三维运行时不再加载原结构 SVG。`public/structure-explorer/pencil-model.js` 按移动距离积分，避免动画采样次数影响单遍笔迹。父页根据文档高度调整 iframe，保持整页自然滚动；扩大观察时临时使用浏览器可见高度，关闭还原。手势取消、失焦、离开与后台停止继续生效，缓存返回可恢复三维画布。演示不保存数据。

原件来自 Family-Education-Codex 的 `output/family-learning-resource--pencil-anatomy--20261014/index.html`，SHA256 `6252380900898148fc83bda0dc193ab71578c8720c4ac56f3f8b27b15e709fca`，保持不变。科学依据和示意边界见 [sources.md](../../public/structure-explorer/sources.md)。预览图从原 SVG 结构图提取。

检查：`node --test tests/structure-explorer-model.test.js`；`node --import tsx --test tests/structure-explorer-data.test.js`；`pnpm run test:e2e:structure-explorer`；`pnpm run typecheck`；`pnpm build`。模型检查覆盖移动分段独立性、变量排序及空白擦除；浏览器覆盖桌面、360/390 手机横竖屏、768/1024 平板，实际键盘与鼠标、设备模拟触屏旋转/捏合、几何点击、单件返回、手势取消、对比留存、过程步骤与扩大观察。机器检查不代表真实设备体验、儿童兴趣或学习效果。

线上复查复用同一测试：设置 `STRUCTURE_BASE_URL` 为明确的站点根地址（保留仓库子目录），`STRUCTURE_EXPECTED_COMMIT` 为已发布的完整提交 SHA。该模式不启动本地服务器，并检查父页与铅笔 iframe 的构建标识；默认检查仍只访问本地。
