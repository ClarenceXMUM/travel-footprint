/* ═══════════════════════════════════════════════════════════════
   足迹地图 · ECharts 6 双模式（复刻 glm5.3 参考版，接入真实数据）
   模式：flight（飞行足迹） / city（城市足迹）
   数据：localStorage 飞行记录 + Obsidian trip-data + airport-geo
   ═══════════════════════════════════════════════════════════════ */

const FPMap = {
  chart: null,
  mode: 'flight',            // 'flight' | 'city'
  year: 'all',
  layers: { provinces: true, cities: true, heat: false, labels: true },
  chinaGeo: null,            // 中国省界 GeoJSON
  airportByCode: {},         // code → airport
  provinceByAirport: {},     // code → 省名
  tripCities: [],            // Obsidian 城市（含省判定）
  filterAirline: null,      // 航司筛选（null=全部）
  worldGeo: null,           // 世界地图 GeoJSON
  asiaGeo: null,            // 合并地图（中国省+马来分区+印尼群岛）
  fullscreen: false,        // 全屏仪表盘模式
  ready: false,
};

// ── 工具：haversine 球面距离 ──
function fmHaversine(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ── 点是否在多边形内（平面 ray-casting，投影前用经纬度）──
function fmPointInPoly(lng, lat, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// 点所属省（遍历省界所有环）
function fmProvinceOf(lng, lat) {
  if (!FPMap.chinaGeo) return null;
  for (const f of FPMap.chinaGeo.features) {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const poly of polys) {
      for (const ring of poly) {
        if (fmPointInPoly(lng, lat, ring)) return f.properties.name;
      }
    }
  }
  return null;
}

// ── 省名缩写 ──
function fmShortProvince(name) {
  return String(name || '')
    .replace(/(维吾尔|回族|壮族)?自治区/, '')
    .replace(/特别行政区/, '')
    .replace(/省|市$/, '');
}

// ── 初始化：加载数据 ──
async function initFootprintMap() {
  const container = document.getElementById('flightMap');
  const wrap = document.getElementById('flightMapWrap');
  if (!container || !window.echarts || !wrap) return;
  try {
    const [airports, trip, provinceMap, china, world, asia] = await Promise.all([
      fetch('assets/airport-geo.json').then((r) => r.json()),
      fetch('assets/trip-data.json').then((r) => r.json()),
      fetch('assets/airport-province.json').then((r) => r.json()).catch(() => ({})),
      fetch('assets/china-provinces.json').then((r) => r.json()),
      fetch('assets/world-geo.json').then((r) => r.json()),
      fetch('assets/asia-oceania-map.json').then((r) => r.json()).catch(() => null),
    ]);
    airports.forEach((a) => { FPMap.airportByCode[a.code] = a; });
    FPMap.provinceByAirport = provinceMap;
    FPMap.chinaGeo = china;
    FPMap.worldGeo = world;
    FPMap.asiaGeo = asia;
    FPMap.tripCities = (trip.cities || []).filter((c) => c.coord && c.country === '中国');
    echarts.registerMap('china', china);
    echarts.registerMap('world', world);
    if (asia) echarts.registerMap('asia', asia);
    FPMap.ready = true;
    // 先显示容器，再 init（ECharts 在隐藏/0尺寸容器上 init 会损坏）
    wrap.classList.remove('hidden');
    bindFootprintMapUI();
    renderFootprintMap(true);
  } catch (err) {
    console.warn('足迹地图初始化失败', err);
  }
}

// ── 数据桥接：飞行记录 → glm 模型 ──
function fmBuildFlights() {
  const records = (typeof life !== 'undefined' ? life.records : []) || [];
  return records
    .filter((r) => r.from && r.to && FPMap.airportByCode[r.from] && FPMap.airportByCode[r.to])
    .map((r) => {
      const from = FPMap.airportByCode[r.from];
      const to = FPMap.airportByCode[r.to];
      const fromCoord = [from.lng, from.lat];
      const toCoord = [to.lng, to.lat];
      const distanceKm = Math.round(fmHaversine(fromCoord, toCoord));
      return {
        date: r.date || '',
        flightNo: r.flightNo || '',
        airline: r.airline || '',
        from: r.from,
        to: r.to,
        aircraft: r.aircraft || '',
        cabin: r.cabin || 'economy',
        fromCity: from.city,
        toCity: to.city,
        distanceKm,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── 个人锚点：家乡 / 求学 / 大本营 ──
const FM_HOMETOWN_PROV = '福建';                       // 家乡省 → 特殊金色
const FM_SCHOOL_REGIONS = new Set(['雪兰莪', '吉隆坡']); // 求学地 → 特殊紫色
const FM_HOME_AIRPORTS = new Set(['FOC', 'XMN', 'KUL']); // 大本营机场
const FM_CITY_COLOR = { normal: '#7cc7ff', home: '#f5c451', school: '#a78bfa' };

// ── 城市数据：Obsidian 已完成 + 手动 + 飞行足迹城市 ──
function fmBuildCities() {
  const cities = [];
  const seen = new Set();
  const add = (city, province, coord, visits, first, tags, isHome, isSchool) => {
    if (!city || seen.has(city)) return;
    seen.add(city);
    cities.push({ name: city, province, coord, visits, first, tags: tags || [], isHome: !!isHome, isSchool: !!isSchool });
  };
  // Obsidian 已完成城市
  FPMap.tripCities.forEach((c) => {
    if (c.status !== '已完成') return;
    const name = c.title.split('，')[0] || c.name;
    const province = fmProvinceOf(c.coord[1], c.coord[0]);
    add(name, province, [c.coord[1], c.coord[0]], 1, (c.dates && c.dates[0]) || '2026-01', [],
      province === FM_HOMETOWN_PROV, name === '吉隆坡');
  });
  // 飞行足迹城市（机场）
  fmBuildFlights().forEach((f) => {
    const fa = FPMap.airportByCode[f.from];
    const ta = FPMap.airportByCode[f.to];
    if (fa) add(fa.city, fmProvinceOf(fa.lng, fa.lat), [fa.lng, fa.lat], 0, f.date, [],
      fmProvinceOf(fa.lng, fa.lat) === FM_HOMETOWN_PROV, fa.city === '吉隆坡');
    if (ta) add(ta.city, fmProvinceOf(ta.lng, ta.lat), [ta.lng, ta.lat], 0, f.date, [],
      fmProvinceOf(ta.lng, ta.lat) === FM_HOMETOWN_PROV, ta.city === '吉隆坡');
  });
  // 手动点亮城市（app.js localStorage，坐标取机场城市表）
  if (typeof getManualCities === 'function' && typeof flightMap !== 'undefined' && flightMap.cityCoord) {
    getManualCities().forEach((name) => {
      const c = flightMap.cityCoord[name];
      if (c) {
        const prov = fmProvinceOf(c.lng, c.lat);
        add(name, prov, [c.lng, c.lat], 1, '', ['手动'], prov === FM_HOMETOWN_PROV, name === '吉隆坡');
      }
    });
  }
  return cities;
}

// ── 渲染：模式分发 ──
function renderFootprintMap(fit) {
  if (!FPMap.ready || !FPMap.chart) return;
  try {
    if (FPMap.mode === 'flight') renderFlightMode();
    else renderCityMode();
    fmRenderSideStats();
    if (fit && typeof fmDefaultFrame === 'function') {
      setTimeout(() => { try { fmDefaultFrame(); } catch (e) {} }, 120);
    }
  } catch (err) {
    console.warn('足迹地图渲染失败', err);
  }
}

// ── 右侧面板：飞行报告 + 成就 + 常坐航司 + 高频航线 + 最近航班 ──
function fmBuildStats() {
  const flights = fmBuildFlights();
  const airports = new Set();
  const countries = new Set();
  const cabinMap = { economy: 0, premium: 0, business: 0, first: 0 };
  const yearMap = {};
  const routeMap = {};
  const airlineMap = {};
  const airportMap = {};
  let totalKm = 0;
  flights.forEach((f) => {
    airports.add(f.from);
    airports.add(f.to);
    const fa = FPMap.airportByCode[f.from];
    const ta = FPMap.airportByCode[f.to];
    if (fa && fa.country) countries.add(fa.country);
    if (ta && ta.country) countries.add(ta.country);
    if (cabinMap[f.cabin] !== undefined) cabinMap[f.cabin] += 1;
    const y = f.date.slice(0, 4);
    yearMap[y] = (yearMap[y] || 0) + 1;
    const key = [f.from, f.to].sort().join('-');
    routeMap[key] = (routeMap[key] || 0) + 1;
    airlineMap[f.airline] = (airlineMap[f.airline] || 0) + 1;
    airportMap[f.from] = (airportMap[f.from] || 0) + 1;
    airportMap[f.to] = (airportMap[f.to] || 0) + 1;
    totalKm += f.distanceKm;
  });
  const cabinTotal = cabinMap.economy + cabinMap.premium + cabinMap.business + cabinMap.first;
  const businessPct = cabinTotal ? Math.round(((cabinMap.business + cabinMap.first) / cabinTotal) * 100) : 0;
  return {
    flights, airports: [...airports], countries: [...countries], cabinMap, yearMap,
    routeMap, airlineMap, airportMap, totalKm, businessPct,
    topRoute: Object.entries(routeMap).sort((a, b) => b[1] - a[1])[0],
  };
}

function fmRenderSideStats() {
  const stats = fmBuildStats();
  const reportEl = document.getElementById('fmSideStats');
  const achEl = document.getElementById('fmAchievements');
  const airlineEl = document.getElementById('fmTopAirlines');
  const routeEl = document.getElementById('fmTopRoutes');
  const tagEl = document.getElementById('fmAirportTags');
  const flightEl = document.getElementById('fmRecentFlights');
  if (!reportEl) return;

  // ── 飞行报告 ──
  reportEl.innerHTML = [
    { num: stats.flights.length, label: '飞行次数' },
    { num: stats.airports.length, label: '足迹机场' },
    { num: stats.countries.length, label: '覆盖国家/地区' },
    { num: (stats.totalKm / 10000).toFixed(1), label: '累计里程(万km)' },
    { num: Object.keys(stats.yearMap).length, label: '飞行年份' },
    { num: stats.businessPct + '%', label: '商务+头等占比' },
  ].map((c) => `<div class="fm-dash-stat"><span class="fm-dash-stat-num">${c.num}</span><span class="fm-dash-stat-label">${c.label}</span></div>`).join('')
    + (stats.topRoute
      ? `<div class="fm-dash-route">${stats.topRoute[0].split('-').map((code) => FPMap.airportByCode[code]?.city || code).join(' ⇄ ')} <b>${stats.topRoute[1]} 次</b></div>`
      : '');

  // ── 成就系统（难忘的飞行）──
  if (achEl) {
    const flights = stats.flights;
    const defs = [
      { icon: 'plane', name: '人生首飞', desc: '开启飞行生涯', earned: flights.length > 0, detail: flights[0] ? `${flights[0].date} ${flights[0].fromCity} → ${flights[0].toCity}` : '记录第一条航班' },
      { icon: 'ten', name: '十次飞行', desc: '累计飞行 10 次', earned: flights.length >= 10, detail: flights.length >= 10 ? `已飞 ${flights.length} 次` : `还差 ${10 - flights.length} 次` },
      { icon: 'globe', name: '跨洲达人', desc: '飞行覆盖 2+ 大洲', earned: stats.countries.length >= 2, detail: `覆盖 ${stats.countries.length} 个国家/地区` },
      { icon: 'ruler', name: '万里长航', desc: '单次飞行 5000km+', earned: flights.some((f) => f.distanceKm >= 5000), detail: flights.some((f) => f.distanceKm >= 5000) ? `最远 ${Math.round(Math.max(...flights.map((f) => f.distanceKm)))}km` : '挑战跨洋航线' },
      { icon: 'seat', name: '升舱体验', desc: '坐过商务/头等舱', earned: stats.cabinMap.business + stats.cabinMap.first > 0, detail: `商务+头等 ${stats.cabinMap.business + stats.cabinMap.first} 次` },
      { icon: 'pin', name: '多城足迹', desc: '打卡 5+ 个机场', earned: stats.airports.length >= 5, detail: `已到访 ${stats.airports.length} 个机场` },
      { icon: 'route', name: '环游之路', desc: '累计里程 2 万公里', earned: stats.totalKm >= 20000, detail: `累计 ${(stats.totalKm / 10000).toFixed(1)} 万公里` },
      { icon: 'target', name: '航线猎手', desc: '飞过 5+ 条不同航线', earned: Object.keys(stats.routeMap).length >= 5, detail: `已飞 ${Object.keys(stats.routeMap).length} 条航线` },
      { icon: 'land', name: '着陆达人', desc: '一个机场起降 3+ 次', earned: Math.max(...Object.values(stats.airportMap), 0) >= 3, detail: `最常去 ${Object.entries(stats.airportMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-'}（${Math.max(...Object.values(stats.airportMap), 0)} 次）` },
      { icon: 'home', name: '故乡起点', desc: '从吉隆坡出发飞行', earned: flights.some((f) => f.from === 'KUL'), detail: flights.some((f) => f.from === 'KUL') ? '吉隆坡启程' : '从 KUL 出发过一次' },
      { icon: 'cal', name: '年度飞行家', desc: '单年飞行 3+ 次', earned: Math.max(...Object.values(stats.yearMap), 0) >= 3, detail: Object.entries(stats.yearMap).sort((a, b) => b[1] - a[1])[0] ? `${Object.entries(stats.yearMap).sort((a, b) => b[1] - a[1])[0][0]} 年 ${Object.entries(stats.yearMap).sort((a, b) => b[1] - a[1])[0][1]} 次` : '保持年度节奏' },
      { icon: 'island', name: '海岛探险', desc: '到访海岛目的地', earned: flights.some((f) => ['DPS', 'HKT', 'CNX', 'PVG', 'XMN', 'DPS'].includes(f.to) || ['DPS', 'HKT'].includes(f.from)), detail: '巴厘岛/普吉/厦门等' },
    ];
    achEl.innerHTML = defs.map((d) => `
      <div class="fm-ach-item" title="${escapeHtml2(d.detail)}">
        <div class="fm-ach-icon ${d.earned ? 'earned' : 'locked'}">${fmAchIcon(d.icon)}</div>
        <div class="fm-ach-body">
          <div class="fm-ach-name">${d.name}</div>
          <div class="fm-ach-desc">${d.detail}</div>
        </div>
        <div class="fm-ach-done">${d.earned ? '✓' : '🔒'}</div>
      </div>`).join('');
  }

  // ── 常坐航司 TOP5 ──
  if (airlineEl) {
    const top = Object.entries(stats.airlineMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = top[0] ? top[0][1] : 1;
    airlineEl.innerHTML = top.length
      ? top.map(([code, n], i) => `
        <div class="fm-rank-row">
          <span class="fm-rank-no">${i + 1}</span>
          <span class="fm-rank-name">${escapeHtml2(code)}</span>
          <div class="fm-rank-bar"><span style="width:${(n / max) * 100}%"></span></div>
          <span class="fm-rank-val">${n} 次</span>
        </div>`).join('')
      : '<div style="color:#5f7ba6;font-size:11px">暂无飞行记录</div>';
  }

  // ── 高频航线 TOP4 ──
  if (routeEl) {
    const top = Object.entries(stats.routeMap).sort((a, b) => b[1] - a[1]).slice(0, 4);
    routeEl.innerHTML = top.length
      ? top.map(([key, n]) => {
          const [from, to] = key.split('-');
          return `<div class="fm-route-row">
            <span class="fm-route-code">${from} ⇄ ${to}</span>
            <span class="fm-route-name">${escapeHtml2(FPMap.airportByCode[from]?.city || from)} — ${escapeHtml2(FPMap.airportByCode[to]?.city || to)}</span>
            <span class="fm-route-val">${n} 次</span>
          </div>`;
        }).join('')
      : '<div style="color:#5f7ba6;font-size:11px">暂无航线</div>';
  }

  // ── 机场标签 TOP6 ──
  if (tagEl) {
    const top = Object.entries(stats.airportMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
    tagEl.innerHTML = top.map(([code, n]) =>
      `<span class="fm-airport-tag">${code} <b>${n}</b></span>`).join('');
  }

  // ── 最近航班 ──
  if (flightEl) {
    const recent = [...stats.flights].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    flightEl.innerHTML = recent.length
      ? recent.map((f) => `
        <div class="fm-flight-row">
          <span class="fm-flight-date">${f.date.slice(5)}</span>
          <div class="fm-flight-main">
            <b>${escapeHtml2(f.fromCity)} → ${escapeHtml2(f.toCity)}</b>
            <span class="fm-flight-meta">${escapeHtml2(f.flightNo || f.airline)} · ${f.distanceKm.toLocaleString()}km</span>
          </div>
          <span class="fm-flight-cabin ${f.cabin}">${f.cabin === 'economy' ? '经济' : f.cabin === 'premium' ? '超经' : f.cabin === 'business' ? '商务' : '头等'}</span>
        </div>`).join('')
      : '<div style="color:#5f7ba6;font-size:11px">暂无航班</div>';
  }
}

// 成就 SVG 线性图标（比 emoji 精致）
function fmAchIcon(name) {
  const paths = {
    plane: 'M21 3 3 10.5l7.5 1.5L12 20l2-5 5.5 2L21 3z',
    ten: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3v14M7 12h10',
    globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-10 10h20M12 2c3 3.5 3 16.5 0 20-3-3.5-3-16.5 0-20z',
    ruler: 'M3 17 17 3l4 4L7 21l-4-4zM7 13l2 2M11 9l2 2M15 5l2 2',
    seat: 'M5 12h14v7H5v-7zM7 5h10v7H7V5zm3 0v7m4-7v7',
    pin: 'M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    route: 'M4 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm16 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM4 18h6l4-8h6M10 18l-2-8H4',
    target: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    land: 'M2 20h20M4 17l3-8 4 3 4-7 5 12H4z',
    home: 'M3 11 12 3l9 8M5 10v10h14V10M9 20v-6h6v6',
    cal: 'M4 5h16v16H4V5zm2-3v4m12-4v4M4 10h16M8 14h3m2 0h3',
    island: 'M4 19c4-6 12-6 16 0M6 16l-1 3m14-3 1 3M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  };
  const d = paths[name] || paths.pin;
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
}

function escapeHtml2(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── 初始视野：固定框（福建居右上、西马居左下，覆盖中国+东南亚）──
function fmDefaultFrame() {
  if (!FPMap.chart) return;
  const B = { lngMin: 96.5, lngMax: 124, latMin: -6.5, latMax: 34 };
  const center = [(B.lngMin + B.lngMax) / 2, (B.latMin + B.latMax) / 2];
  try { FPMap.chart.setOption({ geo: { center, zoom: 1 } }); } catch (e) {}
  try {
    const w = FPMap.chart.getWidth();
    const h = FPMap.chart.getHeight();
    const a = FPMap.chart.convertToPixel({ geoIndex: 0 }, [B.lngMin, B.latMin]);
    const b = FPMap.chart.convertToPixel({ geoIndex: 0 }, [B.lngMax, B.latMax]);
    if (a && b && isFinite(a[0]) && isFinite(b[0]) && isFinite(a[1]) && isFinite(b[1])) {
      const dx = Math.abs(b[0] - a[0]) || 1;
      const dy = Math.abs(b[1] - a[1]) || 1;
      const zoom = Math.min(12, Math.max(1, Math.min((w * 0.92) / dx, (h * 0.9) / dy)));
      FPMap.chart.setOption({ geo: { center, zoom } });
      return;
    }
  } catch (e) { console.warn('初始视野测量失败，使用兜底 zoom', e); }
  try { FPMap.chart.setOption({ geo: { center, zoom: 3 } }); } catch (e) {}
}

// ════════════ 飞行足迹模式（复刻航旅纵横）════════════
function renderFlightMode() {
  const flights = fmBuildFlights().filter((f) => {
    const yearOk = FPMap.year === 'all' || f.date.startsWith(FPMap.year);
    const airlineOk = !FPMap.filterAirline || f.airline === FPMap.filterAirline;
    return yearOk && airlineOk;
  });
  const airportCount = new Map();
  const visitedCountries = new Set();
  flights.forEach((f) => {
    airportCount.set(f.from, (airportCount.get(f.from) || 0) + 1);
    airportCount.set(f.to, (airportCount.get(f.to) || 0) + 1);
    const fa = FPMap.airportByCode[f.from];
    const ta = FPMap.airportByCode[f.to];
    if (fa && fa.country) visitedCountries.add(fa.country);
    if (ta && ta.country) visitedCountries.add(ta.country);
  });

  const linesData = flights.map((f) => ({
    name: `${f.flightNo || ''} ${f.fromCity}—${f.toCity}`,
    value: f.distanceKm,
    coords: [
      [FPMap.airportByCode[f.from].lng, FPMap.airportByCode[f.from].lat],
      [FPMap.airportByCode[f.to].lng, FPMap.airportByCode[f.to].lat],
    ],
    flight: f,
  }));

  const scatterData = [...airportCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code, n]) => {
      const a = FPMap.airportByCode[code];
      return { name: a.city, value: [a.lng, a.lat, n], code };
    });
  // 大本营机场常显（有无航班记录都标注）
  const homeBases = [...FM_HOME_AIRPORTS]
    .filter((code) => FPMap.airportByCode[code])
    .map((code) => {
      const a = FPMap.airportByCode[code];
      return { name: a.city, value: [a.lng, a.lat, airportCount.get(code) || 0], code };
    });
  const normalAirports = scatterData.filter((d) => !FM_HOME_AIRPORTS.has(d.code));

  // 中文国家名 → 世界地图英文名（ECharts regions 按 name 匹配）
  const COUNTRY_EN = {
    '中国': 'China', '马来西亚': 'Malaysia', '新加坡': 'Singapore', '印度尼西亚': 'Indonesia',
    '印尼': 'Indonesia', '泰国': 'Thailand', '越南': 'Vietnam', '菲律宾': 'Philippines',
    '柬埔寨': 'Cambodia', '老挝': 'Laos', '缅甸': 'Myanmar', '文莱': 'Brunei', '日本': 'Japan',
    '韩国': 'South Korea', '卡塔尔': 'Qatar', '阿联酋': 'United Arab Emirates', '土耳其': 'Turkey',
    '英国': 'United Kingdom', '法国': 'France', '德国': 'Germany', '荷兰': 'Netherlands',
    '澳大利亚': 'Australia', '新西兰': 'New Zealand', '美国': 'United States of America',
    '台湾': 'Taiwan', '中国香港': 'Hong Kong', '香港': 'Hong Kong', '中国澳门': 'Macao', '澳门': 'Macao',
  };
  const regions = [...visitedCountries].filter(Boolean).map((cn) => {
    const en = COUNTRY_EN[cn] || cn;
    return { name: en, itemStyle: { areaColor: '#16305e' } };
  });

  FPMap.chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(9,20,42,0.94)',
      borderColor: 'rgba(90,150,255,0.35)',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: '#CFE3FF', fontSize: 13 },
      extraCssText: 'box-shadow: 0 10px 30px rgba(0,10,40,0.6); border-radius: 12px;',
    },
    geo: {
      map: FPMap.asiaGeo ? 'asia' : 'world',
      roam: true,
      layoutCenter: ['50%', '52%'],
      layoutSize: '100%',
      scaleLimit: { min: 0.9, max: 12 },
      itemStyle: {
        areaColor: '#0E1E3C',
        borderColor: 'rgba(96,150,255,0.28)',
        borderWidth: 0.8,
      },
      emphasis: {
        itemStyle: { areaColor: '#1C3668' },
        label: { show: true, color: '#8FB7FF', fontSize: 10 },
      },
      regions,
    },
    series: [
      {
        type: 'lines',
        coordinateSystem: 'geo',
        geoIndex: 0,
        data: linesData,
        lineStyle: { color: 'rgba(110,170,255,0.14)', width: 1.2, curveness: 0.28 },
        silent: true,
        zlevel: 1,
      },
      {
        type: 'lines',
        coordinateSystem: 'geo',
        geoIndex: 0,
        data: linesData,
        effect: {
          show: true,
          period: 8,
          trailLength: 0.2,
          symbol: 'path://M22 2l-7 20-4-9-9-4 20-7z',
          symbolSize: 9,
          color: '#7CC7FF',
        },
        lineStyle: { color: 'rgba(95,184,255,0.5)', width: 1.5, curveness: 0.28 },
        zlevel: 2,
      },
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        geoIndex: 0,
        data: normalAirports,
        symbolSize: (val) => Math.min(26, 8 + Math.sqrt(val[2]) * 4.2),
        rippleEffect: { brushType: 'stroke', scale: 3.6, period: 4.5 },
        itemStyle: {
          color: '#6FD3FF',
        },
        label: {
          show: FPMap.layers.labels,
          position: 'right',
          distance: 5,
          formatter: (p) => ((p.data && p.data.value && p.data.value[2]) >= 2 ? String(p.name || '') : ''),
          color: '#9FC6FF',
          fontSize: 11,
          fontWeight: 600,
        },
        zlevel: 3,
      },
      {
        // 大本营机场光环（FOC/XMN/KUL · 静态金环）
        type: 'scatter',
        coordinateSystem: 'geo',
        geoIndex: 0,
        data: homeBases.map((d) => ({ ...d, itemStyle: { color: 'rgba(0,0,0,0)', borderColor: '#f5c451' } })),
        symbol: 'circle',
        symbolSize: 34,
        animation: false,
        silent: true,
        itemStyle: { borderWidth: 1.5, opacity: 0.9 },
        zlevel: 4,
      },
      {
        // 大本营机场核心点 + 常显标签
        type: 'scatter',
        coordinateSystem: 'geo',
        geoIndex: 0,
        data: homeBases,
        symbol: 'circle',
        symbolSize: 15,
        animation: false,
        itemStyle: { color: '#f5c451', borderColor: '#fff', borderWidth: 2 },
        label: {
          show: FPMap.layers.labels,
          position: 'right',
          distance: 11,
          formatter: (p) => `${p.name} · 大本营`,
          color: '#ffe9b3',
          fontSize: 11.5,
          fontWeight: 700,
          backgroundColor: 'rgba(38,28,6,0.85)',
          borderColor: 'rgba(245,196,81,0.55)',
          borderWidth: 1,
          borderRadius: 9,
          padding: [2, 9],
        },
        zlevel: 5,
      },
    ],
  }, { notMerge: FPMap._lastMode !== 'flight' });
  FPMap._lastMode = 'flight';

  const stats = document.getElementById('flightMapStats');
  if (stats) stats.innerHTML = `<span>航线 <b>${flights.length}</b> 条</span><span>机场 <b>${scatterData.length}</b> 个</span>`;
}

// ════════════ 城市足迹模式（SVG 渲染，精确多边形点亮）════════════

// 多边形集合缓存：马来州界 + 印尼分岛
function fmAllRings(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return geom.coordinates;
  if (geom.type === 'MultiPolygon') return geom.coordinates.flatMap((p) => p);
  return [];
}

function fmRegionAt(lng, lat) {
  if (!FPMap.asiaGeo) return null;
  if (!FPMap._regionFeats) {
    FPMap._regionFeats = FPMap.asiaGeo.features
      .filter((f) => f.properties && (f.properties.kind === 'my-state' || f.properties.kind === 'idn-island'))
      .map((f) => ({ name: f.properties.name, kind: f.properties.kind, rings: fmAllRings(f.geometry) }));
  }
  for (const rf of FPMap._regionFeats) {
    for (const ring of rf.rings) {
      if (fmPointInPoly(lng, lat, ring)) return { name: rf.name, kind: rf.kind };
    }
  }
  const prov = fmProvinceOf(lng, lat);
  return prov ? { name: prov, kind: 'cn' } : null;
}

const FM_REGION_STYLE = {
  cn: { fill: '#1d4ed8', border: 'rgba(96,165,250,0.9)' },
  my: { fill: '#0e7490', border: 'rgba(45,212,191,0.95)' },
  idn: { fill: '#a16207', border: 'rgba(251,191,36,0.95)' },
  intl: { fill: '#312e81', border: 'rgba(129,140,248,0.8)' },
  home: { fill: '#8a681c', border: 'rgba(245,196,81,0.95)' },
  school: { fill: '#4c3387', border: 'rgba(167,139,250,0.95)' },
};

function renderCityMode() {
  const cities = fmBuildCities();
  // 中文国家名 → 合并地图英文名（fallback）
  const COUNTRY_EN = {
    '中国': 'China', '马来西亚': 'Malaysia', '新加坡': 'Singapore', '印度尼西亚': 'Indonesia',
    '印尼': 'Indonesia', '泰国': 'Thailand', '越南': 'Vietnam', '菲律宾': 'Philippines',
    '柬埔寨': 'Cambodia', '老挝': 'Laos', '缅甸': 'Myanmar', '文莱': 'Brunei', '日本': 'Japan',
    '韩国': 'South Korea', '卡塔尔': 'Qatar', '阿联酋': 'United Arab Emirates', '土耳其': 'Turkey',
    '英国': 'United Kingdom', '法国': 'France', '德国': 'Germany', '荷兰': 'Netherlands',
    '澳大利亚': 'Australia', '新西兰': 'New Zealand', '美国': 'United States of America',
    '台湾': 'Taiwan', '中国香港': 'Hong Kong', '香港': 'Hong Kong', '中国澳门': 'Macao', '澳门': 'Macao',
  };
  // 城市坐标 → 点亮区域（精确多边形：印尼分岛 > 马来州 > 中国省 > 国家 fallback）
  const regionHeat = new Map();
  cities.forEach((c) => {
    const lng = c.coord[0], lat = c.coord[1];
    const hit = fmRegionAt(lng, lat);
    let name = null;
    let kind = 'intl';
    if (hit) {
      name = hit.name;
      kind = hit.kind;
    } else {
      let cn = null, best = 1e9;
      Object.values(FPMap.airportByCode).forEach((a) => {
        const d = Math.hypot(a.lng - lng, a.lat - lat);
        if (d < best) { best = d; cn = a.country; }
      });
      name = COUNTRY_EN[cn] || cn;
    }
    if (name) {
      const e = regionHeat.get(name) || { cities: 0, kind };
      e.cities += 1;
      regionHeat.set(name, e);
    }
  });

  const regions = [];
  if (FPMap.layers.provinces) {
    [...regionHeat.entries()].forEach(([name, e]) => {
      let st = FM_REGION_STYLE[e.kind] || FM_REGION_STYLE.intl;
      if (name === FM_HOMETOWN_PROV) st = FM_REGION_STYLE.home;
      else if (FM_SCHOOL_REGIONS.has(name)) st = FM_REGION_STYLE.school;
      regions.push({ name, itemStyle: { areaColor: st.fill, borderColor: st.border, borderWidth: 1.2 } });
    });
  }

  const clsColor = (c) => (c.isHome ? FM_CITY_COLOR.home : c.isSchool ? FM_CITY_COLOR.school : FM_CITY_COLOR.normal);
  const ringData = cities.map((c) => ({
    name: c.name,
    value: [...c.coord, 1],
    raw: c,
    itemStyle: { color: 'rgba(0,0,0,0)', borderColor: clsColor(c) },
  }));
  const coreData = cities.map((c) => ({
    name: c.name,
    value: [...c.coord, 1],
    raw: c,
    itemStyle: { color: clsColor(c) },
  }));

  FPMap.chart.setOption({
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(9,20,42,0.94)',
      borderColor: 'rgba(90,150,255,0.35)',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: '#CFE3FF', fontSize: 13 },
      formatter: (p) => {
        if (p.seriesType !== 'scatter' || !p.data || !p.data.raw) return p.name;
        const c = p.data.raw;
        const tag = c.isHome ? ' · 家乡' : c.isSchool ? ' · 求学' : c.tags && c.tags.length ? ` · ${c.tags.join('/')}` : '';
        return `${p.name}${tag}`;
      },
    },
    geo: {
      map: FPMap.asiaGeo ? 'asia' : 'world',
      roam: true,
      layoutCenter: ['50%', '52%'],
      layoutSize: '100%',
      scaleLimit: { min: 0.9, max: 12 },
      itemStyle: {
        areaColor: '#0E1E3C',
        borderColor: 'rgba(96,150,255,0.28)',
        borderWidth: 0.8,
      },
      emphasis: {
        itemStyle: { areaColor: '#1C3668' },
        label: { show: true, color: '#8FB7FF', fontSize: 10 },
      },
      regions,
    },
    series: [
      {
        // 外圈光环：静态细描边圆环（家乡/求学更大更醒目）
        type: 'scatter',
        coordinateSystem: 'geo',
        geoIndex: 0,
        data: FPMap.layers.cities ? ringData : [],
        symbol: 'circle',
        symbolSize: (val, params) => {
          const c = params.data && params.data.raw;
          return c && (c.isHome || c.isSchool) ? 30 : 20;
        },
        animation: false,
        silent: true,
        itemStyle: { borderWidth: 1.5, opacity: 0.85 },
        zlevel: 3,
      },
      {
        // 实心圆点：白描边 + 分类色（家乡金 / 求学紫 / 常规蓝）
        type: 'scatter',
        coordinateSystem: 'geo',
        geoIndex: 0,
        data: FPMap.layers.cities ? coreData : [],
        symbol: 'circle',
        symbolSize: (val, params) => {
          const c = params.data && params.data.raw;
          return c && (c.isHome || c.isSchool) ? 13 : 9;
        },
        animation: false,
        itemStyle: {
          borderColor: 'rgba(255,255,255,0.95)',
          borderWidth: 1.6,
        },
        label: {
          show: FPMap.layers.labels,
          position: 'right',
          distance: 9,
          formatter: (p) => {
            const c = p.data && p.data.raw;
            if (c && c.isHome) return `${p.name} · 家乡`;
            if (c && c.isSchool) return `${p.name} · 求学`;
            return p.name;
          },
          color: '#dfe9ff',
          fontSize: 11,
          fontWeight: 600,
          backgroundColor: 'rgba(6,12,26,0.78)',
          borderColor: 'rgba(90,150,255,0.28)',
          borderWidth: 1,
          borderRadius: 9,
          padding: [2, 8],
        },
        zlevel: 4,
      },
    ],
  }, { notMerge: FPMap._lastMode !== 'city' });
  FPMap._lastMode = 'city';

  const stats = document.getElementById('flightMapStats');
  if (stats) stats.innerHTML = `<span>点亮区域 <b>${regionHeat.size}</b></span><span>城市 <b>${cities.length}</b> 座</span>`;
}

// ── UI 绑定 ──
function bindFootprintMapUI() {
  const container = document.getElementById('flightMap');
  if (!container) return;
  if (FPMap.chart) { try { FPMap.chart.dispose(); } catch (e) {} FPMap.chart = null; }
  try {
    // SVG 渲染器：DOM 元素随拖拽移动，从根上杜绝 canvas 残影
    FPMap.chart = echarts.init(container, null, { renderer: 'svg' });
  } catch (err) {
    console.warn('ECharts init 失败', err);
    FPMap.chart = null;
  }
  // 拖拽/缩放时暂停 effect 动画，结束后恢复 —— 消除残影
  let effectPaused = false;
  const pauseEffects = () => {
    if (effectPaused || !FPMap.chart) return;
    effectPaused = true;
    FPMap.chart.setOption({ animation: false });
  };
  const resumeEffects = () => {
    if (!effectPaused || !FPMap.chart) return;
    effectPaused = false;
    FPMap.chart.setOption({ animation: true });
  };
  FPMap.chart.on('georoam', () => {
    pauseEffects();
    clearTimeout(FPMap._roamTimer);
    FPMap._roamTimer = setTimeout(resumeEffects, 150);
  });
  window.addEventListener('resize', () => {
    if (FPMap.chart && document.getElementById('flightMapWrap') && !document.getElementById('flightMapWrap').classList.contains('hidden')) {
      try { FPMap.chart.resize(); } catch (e) {}
    }
  });

  // 模式切换
  const flightBtn = document.getElementById('fmModeFlight');
  const cityBtn = document.getElementById('fmModeCity');
  if (flightBtn) flightBtn.addEventListener('click', () => setFPMode('flight'));
  if (cityBtn) cityBtn.addEventListener('click', () => setFPMode('city'));

  // 地名标签开关（两个模式共用）
  const labelBtn = document.getElementById('fmLabelBtn');
  if (labelBtn) labelBtn.addEventListener('click', () => {
    FPMap.layers.labels = !FPMap.layers.labels;
    labelBtn.classList.toggle('chip-on', FPMap.layers.labels);
    renderFootprintMap();
  });

  // 全屏仪表盘切换
  const fsBtn = document.getElementById('fmFullscreenBtn');
  const wrap = document.getElementById('flightMapWrap');
  if (fsBtn) fsBtn.addEventListener('click', () => toggleFMDashboard());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && FPMap.fullscreen) toggleFMDashboard();
  });
}

function toggleFMDashboard() {
  const wrap = document.getElementById('flightMapWrap');
  if (!wrap) return;
  FPMap.fullscreen = !FPMap.fullscreen;
  wrap.classList.toggle('fm-dashboard', FPMap.fullscreen);
  const fsBtn = document.getElementById('fmFullscreenBtn');
  if (fsBtn) fsBtn.innerHTML = FPMap.fullscreen
    ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
    : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
  // 全屏时移到 body 下（避开 .page 的 transform 导致 fixed 失效），退出移回原父级
  if (FPMap.fullscreen) {
    if (!wrap.__origParent) wrap.__origParent = wrap.parentElement;
    document.body.appendChild(wrap);
  } else if (wrap.__origParent) {
    wrap.__origParent.appendChild(wrap);
  }
  setTimeout(() => {
    if (FPMap.chart) { try { FPMap.chart.resize(); } catch (e) {} }
  }, 80);
}

function setFPMode(mode) {
  FPMap.mode = mode;
  const flightBtn = document.getElementById('fmModeFlight');
  const cityBtn = document.getElementById('fmModeCity');
  if (flightBtn) flightBtn.classList.toggle('chip-on', mode === 'flight');
  if (cityBtn) cityBtn.classList.toggle('chip-on', mode === 'city');
  // 城市模式隐藏年份筛选（无年份概念），飞行模式显示
  const yearsBox = document.getElementById('flightMapYears');
  if (yearsBox) yearsBox.style.display = mode === 'flight' ? '' : 'none';
  renderFootprintMap(true);
}

// 年份筛选（飞行模式）
function fmRenderYears() {
  const box = document.getElementById('flightMapYears');
  if (!box) return;
  const years = [...new Set(fmBuildFlights().map((f) => f.date.slice(0, 4)).filter(Boolean))].sort().reverse();
  box.innerHTML = '';
  ['all', ...years].forEach((y) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip${FPMap.year === y ? ' chip-on' : ''}`;
    chip.textContent = y === 'all' ? '全部' : y;
    chip.addEventListener('click', () => {
      FPMap.year = y;
      fmRenderYears();
      renderFootprintMap();
    });
    box.appendChild(chip);
  });
}
