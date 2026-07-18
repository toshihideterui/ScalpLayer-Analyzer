const engine = new AnalysisEngine();
let charts = {};

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupFileInput();
  setupButtons();
  document.getElementById("researchMemo").value = loadMemo();
  renderAll();
});

function setupTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(button.dataset.tab).classList.add("active");
      document.getElementById("pageTitle").textContent = button.textContent;
    });
  });
}

function setupFileInput() {
  const input = document.getElementById("csvFiles");
  input.addEventListener("change", async (e) => loadFiles(e.target.files));
  const zone = document.getElementById("dropZone");
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("dragover"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", async (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    await loadFiles(e.dataTransfer.files);
  });
}

function setupButtons() {
  document.getElementById("resetButton").addEventListener("click", () => {
    engine.reset();
    renderAll();
  });
  document.getElementById("promptButton").addEventListener("click", () => {
    activateTab("intelligence");
    document.getElementById("chatgptPrompt").focus();
    document.getElementById("chatgptPrompt").select();
  });
  document.getElementById("downloadHistoryButton").addEventListener("click", downloadHistory);
  document.getElementById("saveMemoButton").addEventListener("click", () => {
    saveMemo(document.getElementById("researchMemo").value);
    document.getElementById("memoStatus").textContent = "保存しました";
    setTimeout(() => document.getElementById("memoStatus").textContent = "", 1800);
  });
}

async function loadFiles(files) {
  await engine.loadFiles(files);
  renderAll();
}

function activateTab(id) {
  document.querySelector(`.tab[data-tab="${id}"]`)?.click();
}

function renderAll() {
  renderStatus();
  renderDashboard();
  renderTrade();
  renderEngine();
  renderNearMiss();
  renderSession();
  renderSignal();
  renderManager();
  renderIntelligence();
  renderTimeline();
}

function renderStatus() {
  const loaded = engine.files.size;
  document.getElementById("statusDot").classList.toggle("ready", loaded > 0);
  document.getElementById("statusTitle").textContent = loaded ? `${loaded} CSV読込済み` : "CSV未読込";
  document.getElementById("statusText").textContent = loaded ? "Research Intelligenceを更新しました。" : "EAが出力したCSVを読み込んでください。";
}

function renderDashboard() {
  const d = engine.results.dashboard;
  setHtml("dashboardMetrics", metrics([
    ["総トレード数", fmt(d.totalTrades)],
    ["勝率", pct(d.winRate)],
    ["ProfitFactor", pf(d.profitFactor)],
    ["総利益", moneyOrNum(d.totalProfit)],
    ["期待値", `${round(d.expectancy)} pips`],
    ["最大DD", `${round(d.maxDD)} pips`],
    ["平均利益", `${round(d.averageWin)} pips`],
    ["平均損失", `${round(d.averageLoss)} pips`]
  ]));
  renderTodaysResearch();
  drawLine("equityChart", cumulativeSeries(engine.results.trades), "Cumulative Pips");
  drawBar("engineProfitChart", engine.results.tradeByEngine.map((x) => x.name), engine.results.tradeByEngine.map((x) => round(x.pips)), "Pips");
  setHtml("engineProfitRanking", table(["Engine", "Trades", "WinRate", "Pips", "Avg"], engine.results.tradeByEngine.slice(0, 10).map((x) => [x.name, x.trades, pct(x.winRate), round(x.pips), round(x.averagePips)])));
  setHtml("timeWeekSummary", timeWeekSummary());
}

function renderTodaysResearch() {
  const top = engine.results.intelligence.slice(0, 3);
  if (!top.length) {
    setHtml("todaysResearch", `<div class="empty">CSVを読み込むと、今日のResearch候補を表示します。</div>`);
    return;
  }
  setHtml("todaysResearch", top.map((x, i) => `
    <div class="research-item">
      <span>${i + 1}位 ${x.stars}</span>
      <strong>${escapeHtml(x.title)}</strong>
      <p>${escapeHtml(x.target)} / ${escapeHtml(x.reason)}</p>
    </div>
  `).join(""));
}

function renderTrade() {
  drawBar("tradeEngineChart", engine.results.tradeByEngine.map((x) => x.name), engine.results.tradeByEngine.map((x) => round(x.winRate)), "WinRate %");
  const weekdays = groupTradeByWeekday(engine.results.trades);
  drawBar("weekdayChart", weekdays.map((x) => x.name), weekdays.map((x) => round(x.winRate)), "Weekday WinRate %");
  setHtml("tradeTable", table(["Engine", "Trades", "WinRate", "Pips", "Avg", "Avg Hold", "WinStreak", "LossStreak"], engine.results.tradeByEngine.map((x) => [x.name, x.trades, pct(x.winRate), round(x.pips), round(x.averagePips), `${round(x.averageHolding)}分`, x.streakWin, x.streakLoss])));
}

function renderEngine() {
  const cards = engine.results.engineActivity.map((e) => `
    <div class="engine-card">
      <h4>${escapeHtml(e.engine)}</h4>
      <span class="health ${healthClass(e.health)}">${escapeHtml(e.health)}</span>
      <div class="kv">
        <span>Checks</span><strong>${fmt(e.checks)}</strong>
        <span>TimeOK</span><strong>${fmt(e.timeOk)}</strong>
        <span>Full</span><strong>${fmt(e.full)}</strong>
        <span>Entries</span><strong>${fmt(e.entries)}</strong>
        <span>EntryRate</span><strong>${pct(e.entryRate)}</strong>
        <span>Research</span><strong>${e.researchScore}</strong>
        <span>TopNG</span><strong>${escapeHtml(e.topNg.map((x) => x.name).join(" / ") || "-")}</strong>
      </div>
    </div>
  `).join("");
  setHtml("engineCards", cards || `<div class="empty">EngineActivity CSVを読み込んでください。</div>`);
  setHtml("topNgTable", topNgTable());
  const radarTarget = engine.results.engineActivity[0];
  drawRadar("engineRadarChart", radarTarget);
}

function renderNearMiss() {
  const n = engine.results.nearMiss;
  drawPie("nearMissChart", ["あと1条件", "あと2条件", "あと3条件以上"], [n.buckets?.one || 0, n.buckets?.two || 0, n.buckets?.threePlus || 0], "NearMiss");
  setHtml("closestEngine", n.closestEngine ? `<div class="metric"><span>一番惜しいEngine</span><strong>${escapeHtml(n.closestEngine.engine)}</strong><p>${fmt(n.closestEngine.count)}件</p></div>` : `<div class="empty">NearMissHistory CSVを読み込んでください。</div>`);
  setHtml("nearMissComboTable", table(["NG組み合わせ", "Count"], (n.combos || []).slice(0, 15).map((x) => [x.name, x.count])));
  setHtml("nearMissTable", table(["NG条件", "Count"], (n.ngReasons || []).slice(0, 15).map((x) => [x.name, x.count])));
}

function renderSession() {
  const s = engine.results.session;
  drawBar("sessionChart", s.map((x) => x.session), s.map((x) => x.nearMiss), "NearMiss");
  drawBar("sessionConditionChart", s.map((x) => x.session), s.map((x) => round(x.winRate)), "WinRate %");
  setHtml("sessionTable", table(["Session", "Trades", "NearMiss", "WinRate", "AvgPips", "TopNG", "Research"], s.map((x) => [x.session, x.trades, x.nearMiss, pct(x.winRate), round(x.averagePips), x.topNg.map((n) => n.name).join(" / "), x.researchScore])));
}

function renderSignal() {
  const s = engine.results.signal;
  drawBar("signalChart", (s.table || []).map((x) => x.engine), (s.table || []).map((x) => x.signals), "Signals");
  setHtml("signalSummary", metrics([["Signal数", fmt(s.totalSignals || 0)], ["Engine数", fmt((s.table || []).length)], ["Entry成功率", pct(avgSignalSuccess(s.table || []))]]));
  setHtml("signalTable", table(["Engine", "Signals", "Entries", "SuccessRate"], (s.table || []).map((x) => [x.engine, x.signals, x.entries, pct(x.successRate)])));
}

function renderManager() {
  setHtml("csvManagerTable", table(["CSV", "存在", "件数", "列数", "更新日時", "Version"], engine.results.csvManager.map((x) => [x.label, x.exists ? "Yes" : "No", x.rows, x.columns, x.updated ? x.updated.toLocaleString() : "-", x.version])));
  setHtml("csvSpecTable", table(["CSV", "用途", "使用画面"], CSV_TYPES.map((x) => [x.label, x.description, x.usage])));
}

function renderIntelligence() {
  const top = engine.results.intelligence[0];
  setHtml("intelligenceHero", top ? `
    <span class="pill">Today's AI Recommendation</span>
    <h3>${top.stars} ${escapeHtml(top.title)}</h3>
    <p><strong>${escapeHtml(top.target)}</strong> - ${escapeHtml(top.reason)}</p>
  ` : `
    <span class="pill">Research Intelligence</span>
    <h3>CSVを読み込むとResearch候補を自動生成します。</h3>
    <p>Analyzerは条件を変更しません。どこを研究すべきかを可視化します。</p>
  `);
  setHtml("researchSuggestions", engine.results.intelligence.map((s) => `
    <div class="suggestion">
      <div class="stars">${s.stars}</div>
      <div>
        <h4>${escapeHtml(s.title)}</h4>
        <p><span class="tag">${escapeHtml(s.target)}</span></p>
        <p>${escapeHtml(s.reason)}</p>
      </div>
    </div>
  `).join("") || `<div class="empty">Research候補はまだありません。</div>`);
  document.getElementById("chatgptPrompt").value = engine.getPrompt();
}

function renderTimeline() {
  const history = loadResearchHistory();
  const labels = history.map((x) => new Date(x.datetime).toLocaleString());
  drawMultiLine("timelineChart", labels, [
    { label: "Trades", data: history.map((x) => x.trades) },
    { label: "NearMiss", data: history.map((x) => x.nearMiss) },
    { label: "WinRate", data: history.map((x) => round(x.winRate)) },
    { label: "PF", data: history.map((x) => round(x.profitFactor)) }
  ]);
  setHtml("engineEvolution", engineEvolution(history));
}

function metrics(items) {
  return items.map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
}

function table(headers, rows) {
  if (!rows.length) return `<div class="empty">データがありません。</div>`;
  return `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v) => `<td>${escapeHtml(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function topNgTable() {
  const rows = [];
  engine.results.engineActivity.forEach((e) => e.topNg.forEach((ng) => rows.push([e.engine, ng.name, ng.count])));
  rows.sort((a, b) => b[2] - a[2]);
  return table(["Engine", "TopNG", "Count"], rows.slice(0, 20));
}

function timeWeekSummary() {
  const bySession = groupSimple(engine.results.trades, "session");
  const weekdays = groupTradeByWeekday(engine.results.trades);
  return `
    <h4>Session</h4>
    ${table(["Session", "Trades", "WinRate", "AvgPips"], Object.entries(bySession).map(([k, list]) => [k, list.length, pct(ratio(list.filter((x) => x.pips > 0).length, list.length)), round(avg(list, "pips"))]))}
    <h4>Weekday</h4>
    ${table(["Weekday", "Trades", "WinRate"], weekdays.map((x) => [x.name, x.trades, pct(x.winRate)]))}
  `;
}

function groupTradeByWeekday(trades) {
  const names = ["日", "月", "火", "水", "木", "金", "土"];
  const groups = {};
  trades.forEach((t) => {
    const key = t.datetime ? names[t.datetime.getDay()] : "Unknown";
    (groups[key] ||= []).push(t);
  });
  return Object.entries(groups).map(([name, list]) => ({ name, trades: list.length, winRate: ratio(list.filter((x) => x.pips > 0).length, list.length) }));
}

function groupSimple(list, key) {
  return list.reduce((acc, item) => {
    const k = item[key] || "Unknown";
    (acc[k] ||= []).push(item);
    return acc;
  }, {});
}

function cumulativeSeries(trades) {
  let total = 0;
  return trades.map((t, i) => ({ x: i + 1, y: round(total += t.pips) }));
}

function avgSignalSuccess(tableRows) {
  return tableRows.length ? tableRows.reduce((acc, x) => acc + x.successRate, 0) / tableRows.length : 0;
}

function engineEvolution(history) {
  if (history.length < 2) return `<div class="empty">履歴が2回以上あると前回との差分を表示します。</div>`;
  const prev = history[history.length - 2];
  const cur = history[history.length - 1];
  return table(["項目", "差分"], [
    ["Trade", signed(cur.trades - prev.trades)],
    ["NearMiss", signed(cur.nearMiss - prev.nearMiss)],
    ["WinRate", `${signed(round(cur.winRate - prev.winRate))}%`],
    ["ProfitFactor", signed(round(cur.profitFactor - prev.profitFactor))]
  ]);
}

function drawLine(id, points, label) {
  makeChart(id, { type: "line", data: { labels: points.map((p) => p.x), datasets: [{ label, data: points.map((p) => p.y), borderColor: "#49a9ff", backgroundColor: "rgba(73,169,255,.18)", tension: .28, fill: true }] } });
}

function drawMultiLine(id, labels, series) {
  const colors = ["#49a9ff", "#48d597", "#f0a33a", "#a78bfa"];
  makeChart(id, { type: "line", data: { labels, datasets: series.map((s, i) => ({ label: s.label, data: s.data, borderColor: colors[i % colors.length], backgroundColor: "transparent", tension: .25 })) } });
}

function drawBar(id, labels, data, label) {
  makeChart(id, { type: "bar", data: { labels, datasets: [{ label, data, backgroundColor: "rgba(73,169,255,.55)", borderColor: "#49a9ff", borderWidth: 1 }] } });
}

function drawPie(id, labels, data, label) {
  makeChart(id, { type: "doughnut", data: { labels, datasets: [{ label, data, backgroundColor: ["#48d597", "#f0a33a", "#ff6b77"] }] } });
}

function drawRadar(id, e) {
  const data = e ? [Math.min(e.entries, 100), Math.min(e.full, 100), Math.min(e.timeOk, 100), Math.min(e.entryRate, 100), e.score * 20, e.topNg.length ? 60 : 20] : [0, 0, 0, 0, 0, 0];
  makeChart(id, { type: "radar", data: { labels: ["Trade", "Full", "NearMiss", "EntryRate", "Health", "ResearchScore"], datasets: [{ label: e?.engine || "Engine", data, borderColor: "#39d8ff", backgroundColor: "rgba(57,216,255,.18)" }] } });
}

function makeChart(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas || !window.Chart) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(canvas, { ...config, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#cce8ff" } } }, scales: config.type === "doughnut" || config.type === "radar" ? {} : { x: { ticks: { color: "#9db5cc" }, grid: { color: "rgba(157,181,204,.14)" } }, y: { ticks: { color: "#9db5cc" }, grid: { color: "rgba(157,181,204,.14)" } } } } });
}

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function fmt(value) { return Number(value || 0).toLocaleString(); }
function pct(value) { return `${round(value)}%`; }
function pf(value) { return value >= 999 ? "∞" : String(round(value)); }
function moneyOrNum(value) { return round(value) ? round(value).toLocaleString() : "0"; }
function signed(value) { return value > 0 ? `+${value}` : String(value); }
function healthClass(value) { return value === "Needs Research" ? "Needs" : value || "Inactive"; }

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

function downloadHistory() {
  const blob = new Blob([JSON.stringify(loadResearchHistory(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ResearchHistory.json";
  a.click();
  URL.revokeObjectURL(url);
}
