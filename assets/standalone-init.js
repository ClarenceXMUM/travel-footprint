/* 旅行足迹 · 独立站点启动脚本
   数据全部存放在浏览器 localStorage（hermes.life.*），不经过任何服务器。 */
const TM_KEYS = ['hermes.life.flightRecords.v1', 'hermes.life.manualCities.v1', 'hermes.life.airlineStatus.v1'];

function tmToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._tmTimer);
  el._tmTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* 没有任何航班记录时，默认展示城市足迹，避免首屏空白 */
function tmDefaultMode() {
  let tries = 0;
  const tick = () => {
    tries += 1;
    const hasRecords = (typeof life !== 'undefined' && Array.isArray(life.records)) ? life.records.length > 0 : false;
    const ready = typeof FPMap !== 'undefined' && FPMap.ready;
    if (ready && !hasRecords && typeof setFPMode === 'function') {
      setFPMode('city');
      return;
    }
    if (tries < 20 && !hasRecords) setTimeout(tick, 150);
  };
  setTimeout(tick, 120);
}

/* ── 导出 / 导入（本地备份，换设备时用） ── */
function tmExportData() {
  const data = { app: 'travel-footprint', exportedAt: new Date().toISOString(), keys: {} };
  TM_KEYS.forEach((k) => {
    const v = localStorage.getItem(k);
    if (v !== null) data.keys[k] = v;
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `travel-footprint-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  tmToast('已导出数据文件');
}

function tmImportData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const keys = data && data.keys ? data.keys : null;
      if (!keys) throw new Error('文件格式不对');
      let n = 0;
      TM_KEYS.forEach((k) => {
        if (typeof keys[k] === 'string') { localStorage.setItem(k, keys[k]); n += 1; }
      });
      if (!n) throw new Error('文件里没有可导入的数据');
      tmToast(`已导入 ${n} 项数据，正在刷新…`);
      setTimeout(() => location.reload(), 700);
    } catch (e) {
      tmToast('导入失败：' + e.message);
    }
  };
  reader.readAsText(file);
}

function tmInit() {
  loadLife();
  initFlightDatalists();
  initAirlineSelect();

  const modal = document.getElementById('flightModal');
  const closeBtn = document.querySelector('[data-close-flight]');
  if (closeBtn) closeBtn.addEventListener('click', closeFlightModal);
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeFlightModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) closeFlightModal();
  });

  const form = document.getElementById('flightForm');
  if (form) form.addEventListener('submit', addFlightRecord);

  const addBtn = document.getElementById('tmAddFlightBtn');
  if (addBtn) addBtn.addEventListener('click', () => openFlightModal(null));

  const exportBtn = document.getElementById('tmExportBtn');
  if (exportBtn) exportBtn.addEventListener('click', tmExportData);
  const importBtn = document.getElementById('tmImportBtn');
  const importFile = document.getElementById('tmImportFile');
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', () => {
      if (importFile.files && importFile.files[0]) tmImportData(importFile.files[0]);
      importFile.value = '';
    });
  }

  renderLifePage();
  tmDefaultMode();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tmInit);
else tmInit();
