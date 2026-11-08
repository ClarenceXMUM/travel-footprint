# 旅行足迹 · 项目运维手册

> 纯静态个人站点。ECharts 画航线/城市点亮，航司卡片墙由 `life.records` 驱动点亮状态。
> **改任何代码之前先读完本文件**——航司增删、logo 素材、交互约定、部署缓存都记在这里。

- 线上：https://clarencexmum.github.io/travel-footprint/
- 本地：`python3 -m http.server 8799 --bind 127.0.0.1` → http://127.0.0.1:8799/
  （**别用 8765**，本机那个端口被美签工位占着）
- 仓库：GitHub `ClarenceXMUM/travel-footprint`，main 分支根目录 = Pages 根目录

## 项目结构

```
index.html                 唯一入口（资源都带 ?v= 版本号）
assets/life-core.js        AIRLINES 列表 / 航司卡片渲染 / 记录弹窗 / 徽章逻辑
assets/footprint-map.js    ECharts 地图 + 右侧统计面板
assets/standalone-init.js  启动、种子数据、导入导出
assets/app.css             卡片与 logo 样式
assets/airlines/           29 张航司 logo（png，上海航空是 svg）
assets/seed-data.json      首次打开自动灌入的真实记录
```

## 一、增删航司

1. 改 `assets/life-core.js` 的 `AIRLINES` 数组，字段：`id / name / en / iata / pfx / home`。
   **按地区顺序插进去**，不要一律追加到末尾（卡片未点亮时按数组顺序排）。
2. 放 `assets/airlines/<id>.png`（或 `.svg`，见第二节）。
3. 验证：
   ```bash
   node --check assets/life-core.js
   ```
   然后浏览器实测：卡片数 = 数组长度、下拉选项数一致、每张 logo `img.complete && img.naturalWidth > 0`。
4. **删除航司**：同时删 logo 文件；先确认 `life.records` 里没有该 id 的记录，否则会出现找不到航司的孤儿记录（会给该 id 补迁移或直接清掉）。

🔴 中文名别重复。`菲律宾航空`(PR) 和 `PAL Express`(2P) 曾并存，最后合并成一家 PR，2P 删了。以后加子公司类航司要想清楚命名。

## 二、logo 素材流水线

卡片 logo 框是 **96px 正方形**，`img` 用 `object-fit: contain; padding: 8px`。

### 源优先级

| 优先级 | 源 | 说明 |
|--------|-----|------|
| 1 | `logo.wine/a/logo/<Name>/<Name>-Logo.wine.svg` | 官方矢量，最清晰，常是横版「图形+文字」，需要裁 |
| 2 | `pics.avs.io/al_square/400/400/<IATA>.png` | 400px 方形，**自带品牌色底**，个别 IATA 对错图 |
| 3 | `images.kiwi.com/airlines/128/<IATA>.png` | 128px，透明底居多 |
| 4 | `gstatic.com/flights/airline_logos/70px/<IATA>.png` | 70px 偏小；**FM 这张是奥地利航空，不是上航** |

### 落地前必须验图

用 `vision_analyze` 看图确认「这张是不是该航司」，**不要只信文件名或 IATA**。已经踩过的坑：

- `gstatic FM.png` = 奥地利航空（不是上海航空）
- 旧版 `csouthern.png` = 雅库特航空（俄罗斯）
- `avs 8B` = INTIRA AIRLINES 字标（和 TransNusa 图形标不是一回事）

### 保留原版还是换新（用户明确表态）

- **默认保留原版**。2026-11 用户看过全量对比后说「纯 logo 不带背景的好看，原来大部分都可以保留」。
- 只有三种情况换：① 原图是错图；② 原图太小（<150px，96px 框里发虚）；③ 新版明显更清晰。
- 换新版要**抠掉背景**成透明，不要贴色卡。

### 抠底

```bash
# 纯色底，从左上角扩散（安全，不动内部同色区）
magick in.png -fuzz 6% -fill none -draw "color 0,0 floodfill" -strip out.png
# 边缘残留白边
magick out.png -channel A -morphology Erode Disk:1 +channel -strip out.png
```

- 四角透明、主体满幅色块时 floodfill 找不到入口 → 改用 `-fuzz 8% -transparent '#RRGGBB'`（取非透明区采样色）。
- **不是所有 logo 都适合去底**：官方本身就是「色底 + 白图形」的，去底后只剩白色部分、标志不完整。
  - 能去：宿务、新航、泰航、斯里兰卡、飞萤、东航（红蓝燕）
  - **不能去**：南航（蓝底红棉）、KLM（浅蓝底白字，用户要蓝字）、上海航空（红底白鹤，用户要红底）、亚航（红圆）
  - 拿不准就问用户，不要自己定。

### 矢量化（位图放大发虚时的终极解）

```bash
magick p.png -filter point -resize 800% big.png   # 硬边放大，保留像素块给 potrace
magick big.png -alpha extract mask_alpha.pbm       # 整体轮廓
potrace mask_alpha.pbm -s -o alpha.svg -t 3 -a 1.0
# 白色主体单独描摹一遍，合成时填白
```

按元素填色（红底 path 填品牌红、鹤/鸟 path 填白），viewBox 收紧到图形 bbox + 10% 边距凑成 1:1。

🔴 **从完整 SVG 裁图形两个必踩的坑**：

1. 按 `M` 起点坐标分 path（如 `x > 2300` 是图形，其余是文字），只留图形 path，否则会带出「S」之类的字。
2. `path` 上的 `clip-path="url(#…)"` 在 defs 被删后会失效，**浏览器整块不显示**（ImageMagick 会忽略，本地看不出来）→ 必须删掉所有 `clip-path` 属性。

### 尺寸与留白

- 目标 400×400（或 SVG 1000 单位方形），主体四周留 8–10% 透明边。
- 满幅色底（如上航红底）要 `-resize 330x330 -background none -gravity center -extent 400x400`，否则比别的 logo 大一圈。
- 校验居中：`magick x.png -fuzz 15% -trim -format "%wx%h%O" info:`
- SVG 走 `AIRLINE_LOGO_SVG` 集合（`life-core.js` 里），命中就用 `.svg` 而不是 `.png`。

## 三、交互逻辑（2026-11 定稿，别改回去）

- **点舱位徽章 = 打开该航司记录弹窗**，不是自动升档。分三种：
  - 1 条记录 → 自动预填表单、按钮变「保存修改」
  - 多条 → 列出列表，点任一条进入编辑
  - 0 条 → 空表单新建
- 徽章文字 = 该航司所有记录里的**最高舱位**，由 `airlineStatus()` 推导，不是可手动设置的状态。
- 卡片本体点击 = 在地图上筛选该航司航线。
- 记录行可点击补航线（快速记录标「仅舱位 · 待补航线」）。

🔴 **`form.reset()` 会把 `<select>` 重置成第一项**：`openFlightModal()` 和 `addFlightRecord()` 里 reset 之后都必须重新 `picker.value = airline.id`，否则弹窗/保存后航司会跳回第一家（踩过两次）。

### 点亮视觉

- 光只有**卡片边框 + 顶部光条**一层。logo 自身不要再加 `drop-shadow`，两层叠加会糊成光团。
- 未乘坐状态**不要重度灰化**（旧的 `grayscale(.7) brightness(.86)` 让整屏发灰，是「点亮很怪」的元凶）。现在用 `brightness(.9) saturate(.92) + opacity .82`。

## 四、数据层

- 数据全在浏览器 `localStorage`，键：`hermes.life.flightRecords.v1` / `manualCities.v1` / `airlineStatus.v1`。
- 🔴 **localStorage 按域隔离**：`localhost:8899`（Hermes 驾驶舱）和 `clarencexmum.github.io` 是两套数据，**不会自动同步**。搬家靠「导出 → 导入」，或直接写进 `seed-data.json`。
- `seed-data.json` 只在**三个键都不存在**时灌入（`tmSeedIfEmpty()`），手动清空后不会复活。
- 记录字段：`{id, airline, date, from, to, flightNo, aircraft, cabin, quick?}`；`from/to` 为空 = 只点亮舱位、不画航线。

## 五、部署与缓存

- GitHub Pages（main 分支根目录），push 后 30–60 秒生效。
- 🔴 **HTML 的 `cache-control: max-age=600`**：push 完立刻打开看到的可能还是旧版，必须 `Cmd+Shift+R` 硬刷新，或加 `?v=<时间戳>` 打开。
- 每次改 JS/CSS，都要把 `index.html` 里 5 处 `?v=` 同步 +1，否则用户拿到旧脚本。
- logo 的 `<img>` **不要加 `loading="lazy"`**：快速滚动时会短暂空白，看起来像「没更新 / 图坏了」。30 张图合计不到 500KB，直接加载。
- 推送用 GitHub Desktop（用户偏好图形界面，不要命令行 push）。

## 六、验收闭环

代码检查不等于做完。固定三步：

1. `node --check assets/life-core.js`（改 JS 时）
2. 本地起服务，`python3 -m http.server 8799 --bind 127.0.0.1`
3. `browser_exec`（`local=true`）打开页面 → `capture_screenshot()` → `vision_analyze` 判图

vision 判图要问**具体问题**：「上海航空是不是红色旗形 + 白鹤」「有没有白底方块 / 白边 / 糊成光团」「这张 logo 是不是该航司」，不要笼统问「好看吗」。
logo 是否加载用 `img.complete && img.naturalWidth > 0` 判，不要靠肉眼。

## 当前状态（2026-11-09）

- 航司 29 家；新增了荷航 / 翎亚（TransNusa）/ 斯里兰卡 / 上海航空；移除了皇雀 / 曼谷 / 台湾虎航 / 菲律宾航空快运
- 上海航空用矢量 SVG（`assets/airlines/shanghai.svg`，从 logo.wine 官方 SVG 裁出图形部分）
- 数据：10 段真实航班 + 12 个手动点亮城市，已写入 `seed-data.json`
