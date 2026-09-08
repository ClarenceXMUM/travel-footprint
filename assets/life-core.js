/* 旅行足迹 · 数据与航司卡片层（自 hermes-dashboard app.js 抽离，纯 localStorage，无后端）*/

const state = { toastTimer: null };

/* ── ICON_PATHS ── */
const ICON_PATHS = {
  cal: 'M4 5h16v16H4V5zm2-3v4m12-4v4M4 10h16M8 14h3m2 0h3',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4v6l4 2',
  clipboard: 'M9 4h6v2H9zM7 5h-.5A1.5 1.5 0 0 0 5 6.5v13A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 17.5 5H17M9 12l2 2 4-4',
  terminal: 'M4 17l6-5-6-5M12 19h8',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  mail: 'M4 4h16v16H4zM4 6l8 6 8-6',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
  'book-open': 'M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z',
  gem: 'M6 3h12l4 6-10 13L2 9l4-6zM2 9h20M11 3 8 9l4 13 4-13-3-6',
  cpu: 'M5 5h14v14H5zM9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3M9 9h6v6H9z',
  briefcase: 'M3 8h18v12H3zM8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18',
  box: 'M21 8v8l-9 5-9-5V8l9-5 9 5zM3 8l9 5 9-5M12 13v8',
  folder: 'M3 7h6l2 2h10v10H3zM3 7V5h6l2 2',
  file: 'M6 2h8l4 4v16H6zM14 2v4h4',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.35-4.35',
  mic: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v4',
  scroll: 'M6 2h9l5 5v15H6zM15 2v5h5M9 12h6M9 16h6',
  palette: 'M12 2a10 10 0 1 0 0 20 2 2 0 0 0 2-2c0-.6-.2-1-.6-1.4a2 2 0 0 1 1.4-3.4H18a4 4 0 0 0 4-4C22 5.4 17.5 2 12 2zM7 10h.01M11 7h.01M15.5 10.5h.01',
  globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-10 10h20M12 2c3 3.5 3 16.5 0 20-3-3.5-3-16.5 0-20z',
  microscope: 'M6 18h8M3 22h18M14 22a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM13 13l3-3M3 3l4 4M14 3l2 2 4-4',
  landmark: 'M3 21h18M4 18h16M6 18v-7M10 18v-7M14 18v-7M18 18v-7M3 11l9-6 9 6H3z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  grad: 'M2 9l10-4 10 4-10 4L2 9zM6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5M22 9v6',
  note: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z',
  waves: 'M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0',
  plane: 'M21 3 3 10.5l7.5 1.5L12 20l2-5 5.5 2L21 3z',
  compass: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.24 5.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  check: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM8 12l3 3 5-5',
  alert: 'M12 3 2 20h20L12 3zM12 10v4M12 17.5h.01',
  activity: 'M3 12h4l3 8 4-16 3 8h4',
  lock: 'M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4',
};

// 数据源 emoji → 图标名（skills_meta / cron_meta / assets.json 里的图标映射到线性 SVG）

/* ── icon ── */
function icon(name, size = 16) {
  const d = ICON_PATHS[name] || ICON_PATHS.activity;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="${d}"/></svg>`;
}

// 把数据里的 emoji（或任意图标字符）渲染成线性 SVG；未知则回退到 fallback 指定的图标

/* ── AIRLINES ── */
const AIRLINES = [
  { id: 'airasia',      name: '亚航',         en: 'AirAsia',            iata: 'AK', pfx: 'AK', home: '马来西亚' },
  { id: 'scoot',        name: '酷航',         en: 'Scoot',              iata: 'TR', pfx: 'TR', home: '新加坡' },
  { id: 'malaysia',     name: '马来西亚航空', en: 'Malaysia Airlines',  iata: 'MH', pfx: 'MH', home: '马来西亚' },
  { id: 'singapore',    name: '新加坡航空',   en: 'Singapore Airlines', iata: 'SQ', pfx: 'SQ', home: '新加坡' },
  { id: 'xiamen',       name: '厦门航空',     en: 'Xiamen Air',         iata: 'MF', pfx: 'MF', home: '中国·厦门' },
  { id: 'csouthern',    name: '中国南方航空', en: 'China Southern',     iata: 'CZ', pfx: 'CZ', home: '中国·广州' },
  { id: 'ceastern',     name: '中国东方航空', en: 'China Eastern',      iata: 'MU', pfx: 'MU', home: '中国·上海' },
  { id: 'airchina',     name: '中国国际航空', en: 'Air China',          iata: 'CA', pfx: 'CA', home: '中国·北京' },
  { id: 'cathay',       name: '国泰航空',     en: 'Cathay Pacific',     iata: 'CX', pfx: 'CX', home: '中国香港' },
  { id: 'thai',         name: '泰国国际航空', en: 'Thai Airways',       iata: 'TG', pfx: 'TG', home: '泰国' },
  { id: 'bangkok',      name: '曼谷航空',     en: 'Bangkok Airways',    iata: 'PG', pfx: 'PG', home: '泰国' },
  { id: 'vietjet',      name: '越捷航空',     en: 'VietJet Air',        iata: 'VJ', pfx: 'VJ', home: '越南' },
  { id: 'vietnam',      name: '越南航空',     en: 'Vietnam Airlines',   iata: 'VN', pfx: 'VN', home: '越南' },
  { id: 'lion',         name: '狮子航空',     en: 'Lion Air',           iata: 'JT', pfx: 'JT', home: '印尼' },
  { id: 'garuda',       name: '印尼鹰航',     en: 'Garuda Indonesia',   iata: 'GA', pfx: 'GA', home: '印尼' },
  { id: 'cebu',         name: '宿务航空',     en: 'Cebu Pacific',       iata: '5J', pfx: '5J', home: '菲律宾' },
  { id: 'philippine',   name: '菲律宾航空',   en: 'Philippine Airlines', iata: 'PR', pfx: 'PR', home: '菲律宾' },
  { id: 'spring',       name: '春秋航空',     en: 'Spring Airlines',    iata: '9C', pfx: '9C', home: '中国·上海' },
  { id: 'chinaairlines', name: '中华航空',     en: 'China Airlines',     iata: 'CI', pfx: 'CI', home: '中国·台湾' },
  { id: 'starlux',      name: '星宇航空',     en: 'STARLUX Airlines',    iata: 'JX', pfx: 'JX', home: '中国·台湾' },
  { id: 'batik',        name: '峇迪航空',     en: 'Batik Air',           iata: 'ID', pfx: 'ID', home: '印尼' },
  { id: 'firefly',      name: '飞萤航空',     en: 'Firefly',             iata: 'FY', pfx: 'FY', home: '马来西亚' },
  { id: 'citilink',     name: '连城航空',     en: 'Citilink',            iata: 'QG', pfx: 'QG', home: '印尼' },
  { id: 'palexpress',   name: '菲航快运',     en: 'PAL Express',         iata: '2P', pfx: '2P', home: '菲律宾' },
  { id: 'hkexpress',    name: '香港快运',     en: 'HK Express',          iata: 'UO', pfx: 'UO', home: '中国香港' },
  { id: 'tigerair',     name: '台湾虎航',     en: 'Tigerair Taiwan',     iata: 'IT', pfx: 'IT', home: '中国·台湾' },
  { id: 'nokair',       name: '皇雀航空',     en: 'Nok Air',             iata: 'DD', pfx: 'DD', home: '泰国' },
  { id: 'royalbrunei',  name: '文莱皇家航空', en: 'Royal Brunei',        iata: 'BI', pfx: 'BI', home: '文莱' },
  { id: 'laoairlines',  name: '老挝航空',     en: 'Lao Airlines',        iata: 'QV', pfx: 'QV', home: '老挝' },
];

/* ── 航司品牌徽标：品牌渐变色 + 特征图形 + IATA 代码（纯内嵌 SVG，离线可用） ── */

/* ── AIRLINE_BRAND ── */
const AIRLINE_BRAND = {
  airasia:    { c: ['#f0342c', '#8f1213'], glyph: 'wing',    fg: '#ffffff' },
  scoot:      { c: ['#ffd200', '#f0a500'], glyph: 'bolt',    fg: '#20242e' },
  malaysia:   { c: ['#0a5aa6', '#072c58'], glyph: 'kite',    fg: '#f3f6ff' },
  singapore:  { c: ['#123a6e', '#061a3a'], glyph: 'bird',    fg: '#e5b95a' },
  xiamen:     { c: ['#23a8e0', '#0b5f92'], glyph: 'bird',    fg: '#ffffff' },
  csouthern:  { c: ['#2456b8', '#0c2b63'], glyph: 'flower',  fg: '#ef4456' },
  ceastern:   { c: ['#d8232f', '#7a0d15'], glyph: 'swallow', fg: '#ffffff' },
  airchina:   { c: ['#d40e0e', '#7d0000'], glyph: 'phoenix', fg: '#f2c14e' },
  cathay:     { c: ['#00706e', '#013a3f'], glyph: 'brush',   fg: '#ffffff' },
  thai:       { c: ['#5b3386', '#2a1244'], glyph: 'lotus',   fg: '#ecc463' },
  bangkok:    { c: ['#3a7ec2', '#163d63'], glyph: 'wave',    fg: '#ffffff' },
  vietjet:    { c: ['#f1242c', '#8f0f14'], glyph: 'star',    fg: '#ffd200' },
  vietnam:    { c: ['#0a6b8f', '#02303f'], glyph: 'lotus',   fg: '#ecc463' },
  lion:       { c: ['#e8141f', '#7e040b'], glyph: 'mane',    fg: '#ffffff' },
  garuda:     { c: ['#0a5596', '#011f3d'], glyph: 'wings',   fg: '#8fd8f8' },
  cebu:       { c: ['#0a74d8', '#003a6e'], glyph: 'sun',     fg: '#ffcc00' },
  philippine: { c: ['#0a46c2', '#011a52'], glyph: 'sail',    fg: '#fcd116' },
  spring:     { c: ['#0aad4e', '#005c28'], glyph: 'leaf',    fg: '#ffffff' },
};

/* 特征图形均绘制在 96×96 视窗内，fg 为图形主色 */

/* ── AIRLINE_GLYPHS ── */
const AIRLINE_GLYPHS = {
  wing: (fg) => `
    <path d="M14 62 Q32 30 82 24 Q68 54 32 64 Q20 67 14 62 Z" fill="${fg}"/>
    <path d="M30 58 Q50 44 70 36" stroke="${fg}" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".55"/>`,
  bird: (fg) => `
    <path d="M18 58 Q30 32 58 30 Q46 39 42 49 Q56 41 78 39 Q66 55 46 61 Q30 66 18 58 Z" fill="${fg}"/>`,
  wings: (fg) => `
    <path d="M14 42 Q30 24 48 36 Q66 24 82 42 Q66 38 58 46 Q66 50 70 60 Q58 54 48 56 Q38 54 26 60 Q30 50 38 46 Q30 38 14 42 Z" fill="${fg}"/>`,
  kite: (fg) => `
    <path d="M48 14 L70 46 L48 82 L26 46 Z" fill="${fg}" opacity=".95"/>
    <path d="M48 14 L48 82 M26 46 L70 46" stroke="rgba(6,12,30,.35)" stroke-width="2.5" fill="none"/>`,
  flower: (fg) => `
    <g fill="${fg}">
      <ellipse cx="48" cy="34" rx="7.5" ry="13"/>
      <ellipse cx="48" cy="34" rx="7.5" ry="13" transform="rotate(72 48 48)"/>
      <ellipse cx="48" cy="34" rx="7.5" ry="13" transform="rotate(144 48 48)"/>
      <ellipse cx="48" cy="34" rx="7.5" ry="13" transform="rotate(216 48 48)"/>
      <ellipse cx="48" cy="34" rx="7.5" ry="13" transform="rotate(288 48 48)"/>
    </g>
    <circle cx="48" cy="48" r="5" fill="#ffe9a8"/>`,
  swallow: (fg) => `
    <path d="M22 24 Q42 42 48 60 Q54 42 74 24 Q68 52 54 68 L48 78 L42 68 Q28 52 22 24 Z" fill="${fg}"/>`,
  phoenix: (fg) => `
    <path d="M50 16 Q72 25 69 47 Q66 66 46 73 Q58 62 54 49 Q50 38 36 41 Q43 28 50 16 Z" fill="${fg}"/>
    <circle cx="58" cy="37" r="2.6" fill="rgba(6,12,30,.45)"/>`,
  brush: (fg) => `
    <path d="M14 68 Q38 20 86 24 Q58 37 36 63 Q24 76 14 68 Z" fill="${fg}"/>`,
  star: (fg) => `
    <path d="M48 20 L55.6 38.4 L75 39.6 L60 52.6 L64.4 71.6 L48 61 L31.6 71.6 L36 52.6 L21 39.6 L40.4 38.4 Z" fill="${fg}"/>`,
  lotus: (fg) => `
    <g fill="${fg}">
      <path d="M48 22 Q58 40 48 58 Q38 40 48 22 Z"/>
      <path d="M24 38 Q42 44 46 62 Q28 58 24 38 Z"/>
      <path d="M72 38 Q54 44 50 62 Q68 58 72 38 Z"/>
    </g>
    <path d="M28 68 Q48 78 68 68" stroke="${fg}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  mane: (fg) => `
    <g fill="${fg}">
      <path d="M48 16 L53 30 L43 30 Z" transform="rotate(0 48 48)"/>
      <path d="M48 16 L53 30 L43 30 Z" transform="rotate(45 48 48)"/>
      <path d="M48 16 L53 30 L43 30 Z" transform="rotate(90 48 48)"/>
      <path d="M48 16 L53 30 L43 30 Z" transform="rotate(135 48 48)"/>
      <path d="M48 16 L53 30 L43 30 Z" transform="rotate(180 48 48)"/>
      <path d="M48 16 L53 30 L43 30 Z" transform="rotate(225 48 48)"/>
      <path d="M48 16 L53 30 L43 30 Z" transform="rotate(270 48 48)"/>
      <path d="M48 16 L53 30 L43 30 Z" transform="rotate(315 48 48)"/>
    </g>
    <circle cx="48" cy="48" r="13" fill="${fg}"/>`,
  sun: (fg) => `
    <circle cx="48" cy="46" r="12" fill="${fg}"/>
    <g stroke="${fg}" stroke-width="4" stroke-linecap="round">
      <path d="M48 22 L48 28"/><path d="M48 64 L48 70"/>
      <path d="M24 46 L30 46"/><path d="M66 46 L72 46"/>
      <path d="M31 29 L35.2 33.2"/><path d="M60.8 58.8 L65 63"/>
      <path d="M65 29 L60.8 33.2"/><path d="M35.2 58.8 L31 63"/>
    </g>`,
  sail: (fg) => `
    <path d="M28 20 L76 48 L28 76 Z" fill="${fg}"/>
    <circle cx="37" cy="48" r="5.5" fill="rgba(6,12,30,.4)"/>`,
  bolt: (fg) => `
    <path d="M54 14 L30 52 L45 52 L39 82 L64 42 L49 42 Z" fill="${fg}"/>`,
  wave: (fg) => `
    <path d="M16 42 Q32 24 48 42 Q64 60 80 42" stroke="${fg}" stroke-width="6.5" fill="none" stroke-linecap="round" opacity=".6"/>
    <path d="M16 60 Q32 42 48 60 Q64 78 80 60" stroke="${fg}" stroke-width="6.5" fill="none" stroke-linecap="round"/>`,
  leaf: (fg) => `
    <path d="M28 68 Q24 28 68 22 Q72 62 36 70 Q30 72 28 68 Z" fill="${fg}"/>
    <path d="M33 63 Q47 47 62 33" stroke="rgba(6,12,30,.3)" stroke-width="3" fill="none" stroke-linecap="round"/>`,
};

/* ── airlineLogoSvg ── */
function airlineLogoSvg(airline) {
  // 真实航司图形 icon（Google Flights CDN，本地离线）
  return `<img class="al-logo-img" src="assets/airlines/${airline.id}.png" alt="${escapeHtml(airline.en)} logo" loading="lazy" draggable="false">`;
}

/* ── flightRecordsKey ── */
const flightRecordsKey = 'hermes.life.flightRecords.v1';

/* ── flightManualKey ── */
const flightManualKey = 'hermes.life.airlineStatus.v1';

// ── 常用机型（供下拉选择）──

/* ── AIRCRAFT_TYPES ── */
const AIRCRAFT_TYPES = [
  'A320', 'A320neo', 'A321', 'A321neo', 'A330-300', 'A330-900neo',
  'A350-900', 'A350-1000', 'A380-800', 'A220-300',
  'B737-800', 'B737 MAX 8', 'B737 MAX 9', 'B777-200ER', 'B777-300ER',
  'B787-8', 'B787-9', 'B787-10', 'B747-8',
  'ATR 72-600', 'E190-E2', 'E195-E2', 'C919', 'ARJ21',
];

// ── 东南亚大区常用机场（供出发地/目的地下拉选择）──

/* ── AIRPORTS ── */
const AIRPORTS = [
  { code: 'KUL', name: '吉隆坡国际 (KUL)', country: '马来西亚' },
  { code: 'SIN', name: '樟宜机场 (SIN)', country: '新加坡' },
  { code: 'BKK', name: '素万那普 (BKK)', country: '泰国' },
  { code: 'DMK', name: '廊曼机场 (DMK)', country: '泰国' },
  { code: 'HKT', name: '普吉机场 (HKT)', country: '泰国' },
  { code: 'CNX', name: '清迈机场 (CNX)', country: '泰国' },
  { code: 'CGK', name: '苏加诺-哈达 (CGK)', country: '印尼' },
  { code: 'DPS', name: '巴厘岛登巴萨 (DPS)', country: '印尼' },
  { code: 'HAN', name: '河内内排 (HAN)', country: '越南' },
  { code: 'SGN', name: '胡志明新山一 (SGN)', country: '越南' },
  { code: 'MNL', name: '马尼拉 (MNL)', country: '菲律宾' },
  { code: 'CEB', name: '宿务 (CEB)', country: '菲律宾' },
  { code: 'PNH', name: '金边 (PNH)', country: '柬埔寨' },
  { code: 'REP', name: '暹粒 (REP)', country: '柬埔寨' },
  { code: 'VTE', name: '万象 (VTE)', country: '老挝' },
  { code: 'RGN', name: '仰光 (RGN)', country: '缅甸' },
  { code: 'BWN', name: '斯里巴加湾 (BWN)', country: '文莱' },
  { code: 'HKG', name: '香港国际 (HKG)', country: '中国·香港' },
  { code: 'MFM', name: '澳门 (MFM)', country: '中国·澳门' },
  { code: 'TPE', name: '桃园机场 (TPE)', country: '中国·台湾' },
  { code: 'KHH', name: '高雄 (KHH)', country: '中国·台湾' },
  { code: 'CAN', name: '广州白云 (CAN)', country: '中国·广州' },
  { code: 'SZX', name: '深圳宝安 (SZX)', country: '中国·深圳' },
  { code: 'PVG', name: '上海浦东 (PVG)', country: '中国·上海' },
  { code: 'SHA', name: '上海虹桥 (SHA)', country: '中国·上海' },
  { code: 'PEK', name: '北京首都 (PEK)', country: '中国·北京' },
  { code: 'PKX', name: '北京大兴 (PKX)', country: '中国·北京' },
  { code: 'XMN', name: '厦门高崎 (XMN)', country: '中国·厦门' },
  { code: 'FOC', name: '福州长乐 (FOC)', country: '中国·福州' },
  { code: 'HGH', name: '杭州萧山 (HGH)', country: '中国·杭州' },
  { code: 'NGB', name: '宁波栎社 (NGB)', country: '中国·宁波' },
  { code: 'WUH', name: '武汉天河 (WUH)', country: '中国·武汉' },
  { code: 'CKG', name: '重庆江北 (CKG)', country: '中国·重庆' },
  { code: 'CTU', name: '成都天府 (CTU)', country: '中国·成都' },
  { code: 'TFU', name: '成都双流 (TFU)', country: '中国·成都' },
  { code: 'KMG', name: '昆明长水 (KMG)', country: '中国·昆明' },
  { code: 'NRT', name: '东京成田 (NRT)', country: '日本' },
  { code: 'HND', name: '东京羽田 (HND)', country: '日本' },
  { code: 'KIX', name: '大阪关西 (KIX)', country: '日本' },
  { code: 'NGO', name: '名古屋 (NGO)', country: '日本' },
  { code: 'ICN', name: '首尔仁川 (ICN)', country: '韩国' },
  { code: 'GMP', name: '首尔金浦 (GMP)', country: '韩国' },
  { code: 'DOH', name: '多哈 (DOH)', country: '卡塔尔' },
  { code: 'DXB', name: '迪拜 (DXB)', country: '阿联酋' },
  { code: 'AUH', name: '阿布扎比 (AUH)', country: '阿联酋' },
  { code: 'IST', name: '伊斯坦布尔 (IST)', country: '土耳其' },
  { code: 'LHR', name: '伦敦希思罗 (LHR)', country: '英国' },
  { code: 'CDG', name: '巴黎戴高乐 (CDG)', country: '法国' },
  { code: 'FRA', name: '法兰克福 (FRA)', country: '德国' },
  { code: 'AMS', name: '阿姆斯特丹 (AMS)', country: '荷兰' },
  { code: 'SYD', name: '悉尼 (SYD)', country: '澳大利亚' },
  { code: 'MEL', name: '墨尔本 (MEL)', country: '澳大利亚' },
  { code: 'BNE', name: '布里斯班 (BNE)', country: '澳大利亚' },
  { code: 'PER', name: '珀斯 (PER)', country: '澳大利亚' },
  { code: 'AKL', name: '奥克兰 (AKL)', country: '新西兰' },
  { code: 'LAX', name: '洛杉矶 (LAX)', country: '美国' },
  { code: 'SFO', name: '旧金山 (SFO)', country: '美国' },
  { code: 'JFK', name: '纽约肯尼迪 (JFK)', country: '美国' },
];

// 舱位四档（按新航顺序从低到高）：经济 → 超经 → 商务 → 头等

/* ── CABIN_ORDER ── */
const CABIN_ORDER = ['economy', 'premium', 'business', 'first'];

/* ── cabinText ── */
const cabinText = {
  economy: '经济舱',
  premium: '超级经济舱',
  business: '商务舱',
  first: '头等舱',
};

/* ── airlineStatusText ── */
const airlineStatusText = {
  none: '未乘坐',
  economy: '经济舱',
  premium: '超级经济舱',
  business: '商务舱',
  first: '头等舱',
};

/* ── life ── */
const life = {
  records: [],
  manual: {},
  activeAirline: null,
};

/* ── loadLife ── */
function loadLife() {
  try {
    const records = JSON.parse(localStorage.getItem(flightRecordsKey) || '[]');
    life.records = Array.isArray(records) ? records : [];
  } catch {
    life.records = [];
  }
  // 亚航分公司合并迁移：thaiasia/airasiax 历史记录 → airasia
  const airlineMerge = { thaiasia: 'airasia', airasiax: 'airasia' };
  let merged = false;
  life.records = life.records.map((record) => {
    if (airlineMerge[record.airline]) {
      merged = true;
      return { ...record, airline: airlineMerge[record.airline] };
    }
    return record;
  });
  if (merged) saveLife();
  try {
    const manual = JSON.parse(localStorage.getItem(flightManualKey) || '{}');
    life.manual = manual && typeof manual === 'object' && !Array.isArray(manual) ? manual : {};
  } catch {
    life.manual = {};
  }
}

/* ── saveLife ── */
function saveLife() {
  localStorage.setItem(flightRecordsKey, JSON.stringify(life.records));
  localStorage.setItem(flightManualKey, JSON.stringify(life.manual));
  if (typeof renderFootprintMap === 'function' && FPMap.ready) {
    renderFootprintMap();
    if (typeof fmRenderYears === 'function') fmRenderYears();
  }
}

/* ── airlineRecords ── */
function airlineRecords(airlineId) {
  return life.records
    .filter((record) => record.airline === airlineId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

// 状态由航班记录推导：取所有记录中的最高舱位（first > business > premium > economy）；
// 没有记录时退回手动标记（点徽章切换）。

/* ── airlineStatus ── */
function airlineStatus(airlineId) {
  const records = airlineRecords(airlineId);
  if (records.length) {
    let highest = 'economy';
    for (const record of records) {
      const level = CABIN_ORDER.indexOf(record.cabin);
      if (level > CABIN_ORDER.indexOf(highest)) highest = record.cabin;
    }
    return highest;
  }
  return life.manual[airlineId] || 'none';
}

/* ── renderLifePage ── */
function renderLifePage() {
  renderFlightStats();
  renderAirlineGrid();
  renderRecentFlights();
  // 足迹地图：确保已初始化（页面加载时容器隐藏，ECharts 需在可见后 init/resize）
  if (typeof initFootprintMap === 'function' && !FPMap.ready) {
    initFootprintMap();
  }
  // 手动城市坐标库 + 添加城市 UI（cityCoord / datalist / 按钮绑定）
  if (typeof initFlightMap === 'function') {
    initFlightMap();
  }
  if (typeof FPMap !== 'undefined' && FPMap.chart) {
    setTimeout(() => FPMap.chart && FPMap.chart.resize(), 50);
  }
}

/* ── renderFlightStats ── */
function renderFlightStats() {
  const statsEl = document.getElementById('flightStats');
  const flown = AIRLINES.filter((airline) => airlineStatus(airline.id) !== 'none').length;
  const total = life.records.length;
  const premium = life.records.filter((record) => CABIN_ORDER.indexOf(record.cabin) >= CABIN_ORDER.indexOf('premium')).length;
  statsEl.innerHTML = `
    <div class="flight-stat"><span class="flight-stat-num">${flown}</span><span class="flight-stat-label">坐过的航司</span></div>
    <div class="flight-stat"><span class="flight-stat-num">${total}</span><span class="flight-stat-label">飞行次数</span></div>
    <div class="flight-stat"><span class="flight-stat-num gold">${premium}</span><span class="flight-stat-label">升舱体验</span></div>
  `;
}

/* ── renderAirlineGrid ── */
function renderAirlineGrid() {
  const targets = [
    document.getElementById('airlineGrid'),
    document.getElementById('airlineGridStrip'),
  ].filter(Boolean);
  if (!targets.length) return;

  // 排序：已点亮(有记录/手动标记)的排前面，按最近飞行时间从新到旧；未点亮的排后面按原顺序
  const sorted = [...AIRLINES].sort((a, b) => {
    const aStatus = airlineStatus(a.id);
    const bStatus = airlineStatus(b.id);
    const aActive = aStatus !== 'none';
    const bActive = bStatus !== 'none';
    if (aActive !== bActive) return aActive ? -1 : 1;
    if (aActive && bActive) {
      const aDate = airlineRecords(a.id)[0]?.date || '';
      const bDate = airlineRecords(b.id)[0]?.date || '';
      return (bDate || '').localeCompare(aDate || '');
    }
    return AIRLINES.indexOf(a) - AIRLINES.indexOf(b);
  });

  targets.forEach((grid) => {
    grid.innerHTML = '';

  sorted.forEach((airline, index) => {
    const status = airlineStatus(airline.id);
    const records = airlineRecords(airline.id);
    const latest = records[0];
    const meta = records.length
      ? `${records.length} 次飞行 · 最近 ${latest.date || '未知日期'}`
      : '还没有飞行记录';

    const card = document.createElement('article');
    card.className = 'airline-card';
    card.dataset.status = status;
    card.style.setProperty('--i', index);
    card.title = '点击记录航班';
    card.innerHTML = `
      <div class="al-logo">${airlineLogoSvg(airline)}</div>
      <div class="al-info">
        <div class="al-name">${escapeHtml(airline.name)}</div>
        <div class="al-en">${escapeHtml(airline.en)} · ${escapeHtml(airline.home)}</div>
        <div class="al-meta">${escapeHtml(meta)}</div>
      </div>
      <button class="al-badge ${status}" type="button" title="点击切换：未乘坐 → 经济舱 → 超级经济舱 → 商务舱 → 头等舱">${airlineStatusText[status]}</button>
    `;

    card.addEventListener('click', () => {
      // 点击卡片 = 筛选该航司的航线（再点取消）；徽章才是记录航班
      if (typeof FPMap !== 'undefined' && FPMap.ready) {
        if (FPMap.filterAirline === airline.id) {
          FPMap.filterAirline = null;
          card.classList.remove('al-filtered');
        } else {
          FPMap.filterAirline = airline.id;
          grid.querySelectorAll('.airline-card').forEach((c) => c.classList.remove('al-filtered'));
          card.classList.add('al-filtered');
        }
        renderFootprintMap();
      } else {
        openFlightModal(airline.id);
      }
    });
    card.querySelector('.al-badge').addEventListener('click', (event) => {
      event.stopPropagation();
      // 徽章 = 切换乘坐状态（点亮）：无记录循环切换 未乘坐→经济→超经→商务→头等；有记录自动推导并打开弹窗
      cycleAirlineStatus(airline.id);
    });
    grid.appendChild(card);
  });
  });
}

/* ── cycleAirlineStatus ── */
function cycleAirlineStatus(airlineId) {
  const airline = AIRLINES.find((item) => item.id === airlineId);
  if (!airline) return;

  if (airlineRecords(airlineId).length) {
    showToast(`${airline.name} 已有航班记录，状态由记录自动决定`, 'info');
    openFlightModal(airlineId);
    return;
  }

  const order = ['none', ...CABIN_ORDER];
  const current = life.manual[airlineId] || 'none';
  const next = order[(order.indexOf(current) + 1) % order.length];
  if (next === 'none') {
    delete life.manual[airlineId];
  } else {
    life.manual[airlineId] = next;
  }
  saveLife();
  renderLifePage();
  showToast(`${airline.name} · ${airlineStatusText[next]}`, next === 'none' ? 'info' : 'ok');
}

/* ── renderRecentFlights ── */
function renderRecentFlights() {
  const wrap = document.getElementById('recentFlightsWrap');
  const list = document.getElementById('recentFlights');
  if (!wrap || !list) return; // 普通模式区块已移除，最近航班只在全屏地图面板显示
  const recent = [...life.records]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 6);

  if (!recent.length) {
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');
  list.innerHTML = '';

  recent.forEach((record, index) => {
    const airline = AIRLINES.find((item) => item.id === record.airline);
    const item = document.createElement('div');
    item.className = 'recent-item';
    item.style.setProperty('--i', index);
    item.innerHTML = `
      <span class="recent-date">${escapeHtml(record.date || '')}</span>
      <span class="recent-route">${escapeHtml(record.from)} → ${escapeHtml(record.to)}</span>
      <span class="recent-flightno">${escapeHtml(airline?.name || record.airline)} · ${escapeHtml(record.flightNo)}${record.aircraft ? ` · ${escapeHtml(record.aircraft)}` : ''}</span>
      <span class="recent-cabin ${escapeHtml(record.cabin)}">${cabinText[record.cabin] || '经济舱'}</span>
    `;
    list.appendChild(item);
  });
}

/* ── openFlightModal ── */
function currentAirlineId() {
  const picker = document.getElementById('flightAirlineSelect');
  if (picker && picker.value && AIRLINES.some((a) => a.id === picker.value)) return picker.value;
  return life.activeAirline;
}

function initAirlineSelect() {
  const picker = document.getElementById('flightAirlineSelect');
  if (!picker) return;
  picker.innerHTML = AIRLINES.map((a) => `<option value="${a.id}">${escapeHtml(a.name)} · ${escapeHtml(a.en)}</option>`).join('');
  if (AIRLINES[0]) picker.value = AIRLINES[0].id;
  picker.addEventListener('change', () => {
    life.activeAirline = picker.value;
    const a = AIRLINES.find((x) => x.id === picker.value);
    const title = document.getElementById('flightModalTitle');
    if (a && title) title.innerHTML = `${icon('plane', 16)} ${escapeHtml(a.name)} · ${escapeHtml(a.en)}`;
    renderFlightRecords();
  });
}

function openFlightModal(airlineId) {
  const airline = AIRLINES.find((item) => item.id === (airlineId || life.activeAirline || (AIRLINES[0] && AIRLINES[0].id)));
  if (!airline) return;
  life.activeAirline = airline.id;
  const picker = document.getElementById('flightAirlineSelect');
  if (picker) picker.value = airline.id;

  document.getElementById('flightModalTitle').innerHTML = `${icon('plane', 16)} ${escapeHtml(airline.name)} · ${escapeHtml(airline.en)}`;
  const form = document.getElementById('flightForm');
  form.reset();
  form.elements.date.value = localDateString(new Date());
  // 默认航班编号：自动带航司 IATA 前缀（如 AK），数字部分留空等填
  if (airline.pfx) form.elements.flightNo.value = `${airline.pfx} `;
  renderFlightRecords();
  document.getElementById('flightModal').classList.remove('hidden');
}

/* ── closeFlightModal ── */
function closeFlightModal() {
  document.getElementById('flightModal').classList.add('hidden');
  life.activeAirline = null;
}

/* ── renderFlightRecords ── */
function renderFlightRecords() {
  const container = document.getElementById('flightRecords');
  const count = document.getElementById('flightRecordCount');
  const records = airlineRecords(currentAirlineId());

  count.textContent = records.length ? `共 ${records.length} 次` : '';
  container.innerHTML = '';

  if (!records.length) {
    container.innerHTML = '<div class="flight-records-empty">暂无记录，在下方添加第一次飞行 ✈️</div>';
    return;
  }

  records.forEach((record) => {
    const item = document.createElement('div');
    item.className = 'flight-record';
    item.innerHTML = `
      <span class="fr-date">${escapeHtml(record.date || '')}</span>
      <span class="fr-route">${escapeHtml(record.from)} → ${escapeHtml(record.to)}</span>
      <span class="fr-no">${escapeHtml(record.flightNo)}</span>
      ${record.aircraft ? `<span class="fr-aircraft">${escapeHtml(record.aircraft)}</span>` : ''}
      <span class="fr-cabin ${escapeHtml(record.cabin)}">${cabinText[record.cabin] || '经济舱'}</span>
      <button class="fr-del" type="button" title="删除这条记录">×</button>
    `;
    item.querySelector('.fr-del').addEventListener('click', () => deleteFlightRecord(record.id));
    container.appendChild(item);
  });
}

/* ── addFlightRecord ── */
function addFlightRecord(event) {
  event.preventDefault();
  const form = event.target;
  life.activeAirline = currentAirlineId();
  if (!life.activeAirline) return;
  const date = form.elements.date.value;
  const from = form.elements.from.value.trim().toUpperCase();
  const to = form.elements.to.value.trim().toUpperCase();
  const flightNo = form.elements.flightNo.value.trim().toUpperCase();
  const aircraft = form.elements.aircraft.value.trim();
  const cabin = CABIN_ORDER.includes(form.elements.cabin.value) ? form.elements.cabin.value : 'economy';

  if (!date || !from || !to || !flightNo) {
    showToast('日期、航线、航班编号不能为空', 'err');
    return;
  }

  life.records.push({
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    airline: life.activeAirline,
    date,
    from,
    to,
    flightNo,
    aircraft,
    cabin,
  });
  saveLife();

  const airline = AIRLINES.find((item) => item.id === life.activeAirline);
  form.reset();
  form.elements.date.value = date;
  renderFlightRecords();
  renderLifePage();
  showToast(`已记录 ${airline?.name || ''} ${flightNo} · ${cabinText[cabin]}`, 'ok');
}

/* ── deleteFlightRecord ── */
function deleteFlightRecord(recordId) {
  const index = life.records.findIndex((record) => record.id === recordId);
  if (index === -1) return;
  const [removed] = life.records.splice(index, 1);
  saveLife();
  renderFlightRecords();
  renderLifePage();
  showToast(`已删除 ${removed.flightNo} 的记录`, 'info');
}

/* ═══════════════════════════════════════════════════════════
   飞行足迹地图（d3.geo 自绘 · 点亮城市 + 航线弧线 + 小飞机）
   ═══════════════════════════════════════════════════════════ */

/* ── manualCitiesKey ── */
const manualCitiesKey = 'hermes.life.manualCities.v1';

/* ── CABIN_COLOR ── */
const CABIN_COLOR = { economy: '#6ea8ff', premium: '#1e3a8a', business: '#fbbf24', first: '#a78bfa' };

// 手动点亮城市坐标库（机场城市之外的补充：全国地级市 + 常去县城，覆盖高铁可达地）

/* ── EXTRA_CITY_COORD ── */
const EXTRA_CITY_COORD = {
  // 福建
  '泉州': [24.87, 118.68], '漳州': [24.51, 117.65], '莆田': [25.45, 119.01], '宁德': [26.66, 119.55],
  '南平': [26.64, 118.18], '三明': [26.26, 117.64], '龙岩': [25.08, 117.02], '武夷山': [27.75, 118.03],
  '福清': [25.72, 119.38], '长乐': [25.96, 119.52], '永安': [25.97, 117.37], '建瓯': [27.05, 118.32],
  // 贵州（2019 往返）
  '贵阳': [26.65, 106.63], '遵义': [27.72, 106.93], '安顺': [26.25, 105.95], '六盘水': [26.59, 104.83],
  '铜仁': [27.73, 109.19], '凯里': [26.58, 107.98], '都匀': [26.26, 107.52], '兴义': [25.09, 104.90],
  '毕节': [27.28, 105.29], '荔波': [25.41, 107.89], '镇远': [27.05, 108.42],
  // 江苏 / 安徽 / 山东
  '南京': [32.06, 118.80], '苏州': [31.30, 120.58], '无锡': [31.49, 120.31], '常州': [31.78, 119.97],
  '镇江': [32.19, 119.42], '扬州': [32.39, 119.41], '泰州': [32.46, 119.92], '南通': [31.98, 120.89],
  '盐城': [33.35, 120.16], '淮安': [33.61, 119.02], '宿迁': [33.96, 118.28], '徐州': [34.20, 117.28],
  '连云港': [34.60, 119.22],
  '合肥': [31.82, 117.23], '芜湖': [31.35, 118.43], '马鞍山': [31.67, 118.51], '黄山': [29.71, 118.34],
  '济南': [36.65, 117.12], '青岛': [36.07, 120.38], '烟台': [37.46, 121.44], '威海': [37.51, 122.12],
  '泰安': [36.20, 117.09], '曲阜': [35.58, 116.99], '日照': [35.42, 119.53], '潍坊': [36.70, 119.16],
  // 河南 / 山西 / 河北 / 天津 / 内蒙古
  '郑州': [34.75, 113.63], '洛阳': [34.62, 112.45], '开封': [34.80, 114.31], '新乡': [35.30, 113.88],
  '太原': [37.87, 112.55], '大同': [40.08, 113.30], '平遥': [37.20, 112.18], '临汾': [36.08, 111.52],
  '石家庄': [38.04, 114.51], '保定': [38.87, 115.46], '承德': [40.95, 117.96], '秦皇岛': [39.94, 119.60],
  '张家口': [40.77, 114.88], '唐山': [39.63, 118.18], '天津': [39.13, 117.20],
  '呼和浩特': [40.84, 111.75], '包头': [40.66, 109.84], '鄂尔多斯': [39.61, 109.78],
  // 东北
  '沈阳': [41.80, 123.43], '大连': [38.91, 121.61], '长春': [43.88, 125.32], '吉林市': [43.84, 126.55],
  '哈尔滨': [45.80, 126.53], '漠河': [52.97, 122.54], '延吉': [42.91, 129.51],
  // 西北 / 西南
  '西安': [34.34, 108.94], '咸阳': [34.33, 108.71], '宝鸡': [34.37, 107.24], '汉中': [33.07, 107.02],
  '延安': [36.59, 109.49],
  '兰州': [36.06, 103.83], '敦煌': [40.14, 94.66], '嘉峪关': [39.77, 98.29], '张掖': [38.93, 100.45],
  '西宁': [36.62, 101.78], '银川': [38.49, 106.23], '乌鲁木齐': [43.83, 87.62], '吐鲁番': [42.95, 89.19],
  '喀什': [39.47, 75.99], '伊宁': [43.92, 81.28],
  '拉萨': [29.65, 91.14], '林芝': [29.65, 94.36], '日喀则': [29.27, 88.88],
  '绵阳': [31.47, 104.68], '乐山': [29.55, 103.77], '峨眉山': [29.60, 103.48], '都江堰': [31.00, 103.62],
  '九寨沟': [33.26, 103.92], '稻城': [29.04, 100.30], '西昌': [27.89, 102.26], '康定': [30.05, 101.96],
  '大理': [25.60, 100.27], '丽江': [26.86, 100.23], '香格里拉': [27.83, 99.70], '景洪': [22.00, 100.80],
  '腾冲': [25.02, 98.50], '曲靖': [25.49, 103.80], '玉溪': [24.35, 102.55],
  // 广西 / 广东 / 海南
  '南宁': [22.82, 108.32], '桂林': [25.28, 110.29], '柳州': [24.33, 109.42], '北海': [21.48, 109.12],
  '阳朔': [24.78, 110.49], '梧州': [23.48, 111.28],
  '珠海': [22.27, 113.58], '佛山': [23.02, 113.12], '东莞': [23.02, 113.75], '中山': [22.52, 113.39],
  '惠州': [23.11, 114.42], '汕头': [23.35, 116.68], '潮州': [23.66, 116.62], '揭阳': [23.55, 116.37],
  '湛江': [21.27, 110.36], '韶关': [24.81, 113.60], '江门': [22.58, 113.08], '肇庆': [23.05, 112.47],
  '梅州': [24.29, 116.12], '河源': [23.74, 114.70],
  '海口': [20.04, 110.35], '三亚': [18.25, 109.51], '琼海': [19.26, 110.47], '文昌': [19.54, 110.75],
  // 湖南 / 湖北 / 江西 / 浙江
  '长沙': [28.23, 112.94], '张家界': [29.12, 110.48], '凤凰': [27.95, 109.60], '岳阳': [29.36, 113.13],
  '衡阳': [26.89, 112.57], '常德': [29.03, 111.70], '株洲': [27.83, 113.13], '湘潭': [27.83, 112.94],
  '宜昌': [30.69, 111.29], '十堰': [32.63, 110.80], '襄阳': [32.01, 112.12], '恩施': [30.27, 109.49],
  '神农架': [31.74, 110.68],
  '南昌': [28.68, 115.86], '九江': [29.71, 116.00], '景德镇': [29.27, 117.18], '婺源': [29.25, 117.86],
  '赣州': [25.83, 114.93], '吉安': [27.11, 114.99], '上饶': [28.45, 117.94], '宜春': [27.80, 114.42],
  '抚州': [27.98, 116.36], '新余': [27.82, 114.92], '鹰潭': [28.26, 117.07],
  '温州': [27.99, 120.70], '嘉兴': [30.75, 120.76], '绍兴': [30.03, 120.58], '金华': [29.08, 119.65],
  '义乌': [29.31, 120.08], '衢州': [28.94, 118.87], '舟山': [29.99, 122.21], '台州': [28.66, 121.42],
  '丽水': [28.45, 119.92], '湖州': [30.89, 120.09],
  // 台湾 / 香港周边
  '台中': [24.15, 120.67], '台南': [22.99, 120.21], '花莲': [23.98, 121.60], '嘉义': [23.48, 120.45],
  // 马来西亚（机场城市之外）
  '新山': [1.49, 103.74], '马六甲': [2.20, 102.25], '怡保': [4.60, 101.08], '关丹': [3.82, 103.33],
  '哥打京那巴鲁': [5.98, 116.07], '古晋': [1.55, 110.34], '太平': [4.85, 100.74], '芙蓉': [2.73, 101.94],
  '巴生': [3.04, 101.44],
};

/* ── flightMap ── */
const flightMap = {
  loaded: false,
  world: null,
  byCode: {},
  cityCoord: {},
  trip: null,
  level: 'world', // 'world' = 国家层, 'city' = 城市层
  year: 'all',
  rafId: null,
  focus: null,      // null=全球, 'CHN'=中国省界, 'MYS'=马来西亚州界
  provinces: {},    // iso3 -> GeoJSON（省界数据缓存）
};

/* ── getManualCities ── */
function getManualCities() {
  return getStoredList(manualCitiesKey).filter((city) => typeof city === 'string' && city);
}

/* ── saveManualCities ── */
function saveManualCities(list) {
  localStorage.setItem(manualCitiesKey, JSON.stringify(list));
}

/* ── initFlightMap ── */
async function initFlightMap() {
  const wrap = document.getElementById('flightMapWrap');
  if (!wrap) return;
  if (flightMap.loaded) return; // 已初始化：只装一次坐标库和按钮绑定
  try {
    const [airports, world, trip] = await Promise.all([
      fetch('/assets/airport-geo.json').then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetch('/assets/world-geo.json').then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetch('/assets/trip-data.json').then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
    ]);
    airports.forEach((airport) => {
      flightMap.byCode[airport.code] = airport;
      // 同城多机场（PEK/PKX → 北京）取第一个坐标
      if (!flightMap.cityCoord[airport.city]) flightMap.cityCoord[airport.city] = { lat: airport.lat, lng: airport.lng };
    });
    // 内置城市坐标库合并（机场城市优先，补充高铁小城等）
    Object.entries(EXTRA_CITY_COORD).forEach(([name, pair]) => {
      if (!flightMap.cityCoord[name]) flightMap.cityCoord[name] = { lat: pair[0], lng: pair[1] };
    });
    flightMap.loaded = true;
    const cityList = document.getElementById('fmCityList');
    if (cityList) {
      cityList.innerHTML = Object.keys(flightMap.cityCoord)
        .map((city) => `<option value="${escapeHtml(city)}"></option>`)
        .join('');
    }
    bindFlightMapUI();
    renderManualCityChips();
    wrap.classList.remove('hidden');
    // 地图渲染已由 initFootprintMap 接管（ECharts 版）
  } catch {
    // 底图/机场数据缺失时静默隐藏地图，不影响其余板块
    wrap.classList.add('hidden');
  }
}

/* ── bindFlightMapUI ── */
function bindFlightMapUI() {
  const pop = document.getElementById('fmCityPop');
  const input = document.getElementById('fmCityInput');
  document.getElementById('fmAddCityBtn').addEventListener('click', () => {
    pop.classList.toggle('hidden');
    if (!pop.classList.contains('hidden')) input.focus();
  });
  document.getElementById('fmCityAddBtn').addEventListener('click', addManualCity);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addManualCity();
    }
  });
}

/* ── addManualCity ── */
function addManualCity() {
  const input = document.getElementById('fmCityInput');
  const city = input.value.trim();
  if (!city) return;
  if (!flightMap.cityCoord[city]) {
    showToast(`暂无「${city}」的坐标（目前支持机场城市与主要城市）`, 'err');
    return;
  }
  const list = getManualCities();
  if (list.includes(city)) {
    showToast(`「${city}」已在足迹里`, 'info');
    return;
  }
  list.push(city);
  saveManualCities(list);
  input.value = '';
  renderManualCityChips();
  if (typeof renderFootprintMap === 'function') renderFootprintMap();
  showToast(`已点亮 ${city}`, 'ok');
}

/* ── removeManualCity ── */
function removeManualCity(city) {
  saveManualCities(getManualCities().filter((item) => item !== city));
  renderManualCityChips();
  if (typeof renderFootprintMap === 'function') renderFootprintMap();
  showToast(`已移除 ${city}`, 'info');
}

/* ── renderManualCityChips ── */
function renderManualCityChips() {
  const box = document.getElementById('fmCityChips');
  const list = getManualCities();
  box.innerHTML = '';
  if (!list.length) {
    box.innerHTML = '<span class="fm-city-empty">还没有手动添加的城市，输入城市名点亮足迹</span>';
    return;
  }
  list.forEach((city) => {
    const chipEl = document.createElement('span');
    chipEl.className = 'fm-city-chip';
    chipEl.innerHTML = `${escapeHtml(city)}<button type="button" title="移除" aria-label="移除 ${escapeHtml(city)}">×</button>`;
    chipEl.querySelector('button').addEventListener('click', () => removeManualCity(city));
    box.appendChild(chipEl);
  });
}

/* ── initFlightDatalists ── */
function initFlightDatalists() {
  const airportList = document.getElementById('airportList');
  if (airportList) {
    airportList.innerHTML = AIRPORTS.map(
      (a) => `<option value="${escapeHtml(a.code)}">${escapeHtml(a.name)} · ${escapeHtml(a.country)}</option>`
    ).join('');
  }
  const aircraftList = document.getElementById('aircraftList');
  if (aircraftList) {
    aircraftList.innerHTML = AIRCRAFT_TYPES.map((t) => `<option value="${escapeHtml(t)}"></option>`).join('');
  }
}

/* ── showToast ── */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  clearTimeout(state.toastTimer);
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  state.toastTimer = setTimeout(() => {
    toast.className = 'toast';
  }, 2800);
}

/* ── localDateString ── */
function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/* ── getStoredList ── */
function getStoredList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/* ── escapeHtml ── */
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
