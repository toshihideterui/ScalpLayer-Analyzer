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
  document.getElementById("resetButton").addEventListener("click", () => { engine.reset(); renderAll(); });
  document.getElementById("promptButton").addEventListener("click", () => { activateTab("intelligence"); document.getElementById("chatgptPrompt").select(); });
  document.getElementById("downloadHistoryButton").addEventListener("click", downloadHistory);
  document.getElementById("downloadReportButton").addEventListener("click", downloadMarkdownReport);
  document.getElementById("saveMemoButton").addEventListener("click", () => {
    saveMemo(document.getElementById("researchMemo").value);
    document.getElementById("memoStatus").textContent = "Saved";
    setTimeout(() => document.getElementById("memoStatus").textContent = "", 1600);
  });
}

async function loadFiles(files) {
  await engine.loadFiles(files);
  renderAll();
}

function activateTab(id) { document.querySelector(`.tab[data-tab="${id}"]`)?.click(); }

function renderAll() {
  renderStatus();
  renderDashboard();
  renderLabReport();
  renderTrade();
  renderEngine();
  renderCondition();
  renderHeatmaps();
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
  document.getElementById("statusTitle").textContent = loaded ? `${loaded} CSV loaded` : "No CSV loaded";
  document.getElementById("statusText").textContent = loaded ? "Research Lab updated." : "Load CSV files exported by the EA.";
}

function renderDashboard() {
  const d = engine.results.dashboard;
  const bestEngine = engine.results.tradeByEngine[0]?.name || "-";
  const mostActive = engine.results.engineActivity[0]?.engine || "-";
  const mostNear = engine.results.nearMiss.closestEngine?.engine || "-";
  const target = engine.results.intelligence[0]?.title || "-";
  setHtml("labDashboard", [
    researchItem("Best Engine", bestEngine, "Highest current trade performance"),
    researchItem("Most Active Engine", mostActive, "Highest research score from activity"),
    researchItem("Current Research Target", target, engine.results.intelligence[0]?.target || "Load CSV")
  ].join(""));
  setHtml("progressPanel", progressHtml());
  setHtml("dashboardMetrics", metrics([
    ["Trades", fmt(d.totalTrades)],
    ["WinRate", pct(d.winRate)],
    ["ProfitFactor", pf(d.profitFactor)],
    ["Total Pips", round(d.totalPips)],
    ["Expectancy", `${round(d.expectancy)} pips`],
    ["Max DD", `${round(d.maxDD)} pips`],
    ["Avg Win", `${round(d.averageWin)} pips`],
    ["Avg Loss", `${round(d.averageLoss)} pips`]
  ]));
  drawLine("equityChart", cumulativeSeries(engine.results.trades), "Cumulative Pips");
  drawBar("engineProfitChart", engine.results.tradeByEngine.map((x) => x.name), engine.results.tradeByEngine.map((x) => round(x.pips)), "Pips");
  setHtml("engineProfitRanking", table(["Engine", "Trades", "WinRate", "Pips", "Avg"], engine.results.tradeByEngine.slice(0, 10).map((x) => [x.name, x.trades, pct(x.winRate), round(x.pips), round(x.averagePips)])));
  setHtml("timeWeekSummary", timeWeekSummary());
}

function renderLabReport() {
  setText("researchReportText", engine.results.report?.text || "Load CSV files to generate report.");
  const c = engine.results.comparison;
  setHtml("researchComparison", c ? table(["Metric", "Diff"], [["Trade", signed(c.trades)], ["NearMiss", signed(c.nearMiss)], ["WinRate", `${signed(round(c.winRate))}%`], ["PF", signed(round(c.profitFactor))], ["Research Score", `${stars(c.previousTopResearch)} -> ${stars(c.currentTopResearch)}`]]) : `<div class="empty">No previous Analyzer run yet.</div>`);
  setHtml("researchProgressDetails", progressHtml(true));
}

function renderTrade() {
  drawBar("tradeEngineChart", engine.results.tradeByEngine.map((x) => x.name), engine.results.tradeByEngine.map((x) => round(x.winRate)), "WinRate %");
  const weekdays = groupTradeByWeekday(engine.results.trades);
  drawBar("weekdayChart", weekdays.map((x) => x.name), weekdays.map((x) => round(x.winRate)), "Weekday WinRate %");
  setHtml("tradeTable", table(["Engine", "Trades", "WinRate", "Pips", "Avg", "Avg Hold", "WinStreak", "LossStreak"], engine.results.tradeByEngine.map((x) => [x.name, x.trades, pct(x.winRate), round(x.pips), round(x.averagePips), `${round(x.averageHolding)} min`, x.streakWin, x.streakLoss])));
}

function renderEngine() {
  setHtml("engineCards", engine.results.engineActivity.map((e) => `
    <div class="engine-card">
      <h4>${escapeHtml(e.engine)}</h4>
      <span class="health ${healthClass(e.health)}">${escapeHtml(e.health)}</span>
      <div class="kv">
        <span>Research Score</span><strong>${e.researchScore}</strong>
        <span>Trades</span><strong>${fmt(e.trade?.trades || 0)}</strong>
        <span>NearMiss</span><strong>${fmt(engine.results.nearMiss.byEngine?.find((n) => normalizeName(n.name) === normalizeName(e.engine))?.count || 0)}</strong>
        <span>TimeOK</span><strong>${fmt(e.timeOk)}</strong>
        <span>EntryRate</span><strong>${pct(e.entryRate)}</strong>
        <span>TopNG</span><strong>${escapeHtml(e.topNg.map((x) => x.name).join(" / ") || "-")}</strong>
      </div>
    </div>
  `).join("") || `<div class="empty">Load EngineActivity CSV.</div>`);
  setHtml("topNgTable", topNgTable());
  drawRadar("engineRadarChart", engine.results.engineActivity[0]);
}

function renderCondition() {
  setHtml("conditionTable", table(["Condition", "Trade", "NearMiss / TopNG", "Research Score", "Note"], engine.results.condition.map((x) => [x.condition, x.trades, x.nearMiss, x.researchScore, x.note])));
}

function renderHeatmaps() {
  setHtml("topNgHeatmap", heatmapTable(["Engine", ...engine.results.heatmaps.ngLabels], engine.results.heatmaps.engineRows.map((r) => [r.engine, ...engine.results.heatmaps.ngLabels.map((l) => r[l] || 0)])));
  setHtml("sessionHeatmap", heatmapTable(["Session", "Trade", "NearMiss", "WinRate", "ResearchScore"], engine.results.heatmaps.sessionRows.map((r) => [r.session, r.Trade, r.NearMiss, r.WinRate, r.ResearchScore])));
}

function renderNearMiss() {
  const n = engine.results.nearMiss;
  drawPie("nearMissChart", ["1 condition left", "2 conditions left", "3+ conditions"], [n.buckets?.one || 0, n.buckets?.two || 0, n.buckets?.threePlus || 0], "NearMiss");
  setHtml("closestEngine", n.closestEngine ? `<div class="metric"><span>Closest Engine</span><strong>${escapeHtml(n.closestEngine.engine)}</strong><p>${fmt(n.closestEngine.count)} records</p></div>` : `<div class="empty">Load NearMissHistory CSV.</div>`);
  setHtml("nearMissComboTable", table(["NG Combo", "Count"], (n.combos || []).slice(0, 15).map((x) => [x.name, x.count])));
  setHtml("nearMissTable", table(["NG Reason", "Count"], (n.ngReasons || []).slice(0, 15).map((x) => [x.name, x.count])));
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
  setHtml("signalSummary", metrics([["Signals", fmt(s.totalSignals || 0)], ["Engines", fmt((s.table || []).length)], ["Entry Success", pct(avgSignalSuccess(s.table || []))]]));
  setHtml("signalTable", table(["Engine", "Signals", "Entries", "SuccessRate"], (s.table || []).map((x) => [x.engine, x.signals, x.entries, pct(x.successRate)])));
}

function renderManager() {
  setHtml("csvManagerTable", table(["CSV", "Exists", "Rows", "Columns", "Updated", "Version"], engine.results.csvManager.map((x) => [x.label, x.exists ? "Yes" : "No", x.rows, x.columns, x.updated ? x.updated.toLocaleString() : "-", x.version])));
  setHtml("csvSpecTable", table(["CSV", "Purpose", "Screen"], CSV_TYPES.map((x) => [x.label, x.description, x.usage])));
}

function renderIntelligence() {
  const top = engine.results.intelligence[0];
  setHtml("intelligenceHero", top ? `<span class="pill">Today's AI Recommendation</span><h3>${top.stars} ${escapeHtml(top.title)}</h3><p><strong>${escapeHtml(top.target)}</strong> - ${escapeHtml(top.reason)}</p>` : `<span class="pill">Research Intelligence</span><h3>Load CSV to generate Research candidates.</h3><p>This lab shows Research candidates, not trading-condition changes.</p>`);
  setHtml("researchSuggestions", engine.results.intelligence.map((s) => `<div class="suggestion"><div class="stars">${s.stars}</div><div><h4>${escapeHtml(s.title)}</h4><p><span class="tag">${escapeHtml(s.target)}</span></p><p>${escapeHtml(s.reason)}</p></div></div>`).join("") || `<div class="empty">No Research candidates yet.</div>`);
  document.getElementById("chatgptPrompt").value = engine.getPrompt();
}

function renderTimeline() {
  const history = loadResearchHistory();
  drawMultiLine("timelineChart", history.map((x) => new Date(x.datetime).toLocaleString()), [
    { label: "Trades", data: history.map((x) => x.trades) },
    { label: "NearMiss", data: history.map((x) => x.nearMiss) },
    { label: "WinRate", data: history.map((x) => round(x.winRate)) },
    { label: "PF", data: history.map((x) => round(x.profitFactor)) }
  ]);
  setHtml("engineEvolution", engineEvolution(history));
}

function researchItem(label, value, note) {
  return `<div class="research-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(note)}</p></div>`;
}

function progressHtml(detail = false) {
  const p = engine.results.progress || { percent: 0, checks: [] };
  const rows = p.checks.map(([name, ok]) => [name, ok ? "Complete" : "Need Data"]);
  return `<h3>Research Progress ${p.percent || 0}%</h3><div class="progress"><div style="width:${p.percent || 0}%"></div></div>${detail ? table(["Item", "Status"], rows) : ""}`;
}

function metrics(items) {
  return items.map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
}

function table(headers, rows) {
  if (!rows.length) return `<div class="empty">No data.</div>`;
  return `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v) => `<td>${escapeHtml(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function heatmapTable(headers, rows) {
  if (!rows.length) return `<div class="empty">No heatmap data.</div>`;
  const maxValue = Math.max(1, ...rows.flat().slice(1).map((v) => Number(v) || 0));
  return `<table class="heatmap"><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v, i) => {
    const intensity = i === 0 ? 0 : Math.min(0.82, (Number(v) || 0) / maxValue);
    return `<td style="${i === 0 ? "" : `background:rgba(57,216,255,${0.08 + intensity});color:${intensity > 0.45 ? "#03111f" : "#dcefff"};`}">${escapeHtml(v)}</td>`;
  }).join("")}</tr>`).join("")}</tbody></table>`;
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
  return `<h4>Session</h4>${table(["Session", "Trades", "WinRate", "AvgPips"], Object.entries(bySession).map(([k, list]) => [k, list.length, pct(ratio(list.filter((x) => x.pips > 0).length, list.length)), round(avg(list, "pips"))]))}<h4>Weekday</h4>${table(["Weekday", "Trades", "WinRate"], weekdays.map((x) => [x.name, x.trades, pct(x.winRate)]))}`;
}

function groupTradeByWeekday(trades) {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const groups = {};
  trades.forEach((t) => { const key = t.datetime ? names[t.datetime.getDay()] : "Unknown"; (groups[key] ||= []).push(t); });
  return Object.entries(groups).map(([name, list]) => ({ name, trades: list.length, winRate: ratio(list.filter((x) => x.pips > 0).length, list.length) }));
}

function groupSimple(list, key) { return list.reduce((acc, item) => { const k = item[key] || "Unknown"; (acc[k] ||= []).push(item); return acc; }, {}); }
function cumulativeSeries(trades) { let total = 0; return trades.map((t, i) => ({ x: i + 1, y: round(total += t.pips) })); }
function avgSignalSuccess(rows) { return rows.length ? rows.reduce((acc, x) => acc + x.successRate, 0) / rows.length : 0; }

function engineEvolution(history) {
  if (history.length < 2) return `<div class="empty">Run Analyzer at least twice to show evolution.</div>`;
  const prev = history[history.length - 2], cur = history[history.length - 1];
  return table(["Metric", "Diff"], [["Trade", signed(cur.trades - prev.trades)], ["NearMiss", signed(cur.nearMiss - prev.nearMiss)], ["WinRate", `${signed(round(cur.winRate - prev.winRate))}%`], ["ProfitFactor", signed(round(cur.profitFactor - prev.profitFactor))]]);
}

function drawLine(id, points, label) { makeChart(id, { type: "line", data: { labels: points.map((p) => p.x), datasets: [{ label, data: points.map((p) => p.y), borderColor: "#49a9ff", backgroundColor: "rgba(73,169,255,.18)", tension: .28, fill: true }] } }); }
function drawMultiLine(id, labels, series) { const colors = ["#49a9ff", "#48d597", "#f0a33a", "#a78bfa"]; makeChart(id, { type: "line", data: { labels, datasets: series.map((s, i) => ({ label: s.label, data: s.data, borderColor: colors[i % colors.length], backgroundColor: "transparent", tension: .25 })) } }); }
function drawBar(id, labels, data, label) { makeChart(id, { type: "bar", data: { labels, datasets: [{ label, data, backgroundColor: "rgba(73,169,255,.55)", borderColor: "#49a9ff", borderWidth: 1 }] } }); }
function drawPie(id, labels, data, label) { makeChart(id, { type: "doughnut", data: { labels, datasets: [{ label, data, backgroundColor: ["#48d597", "#f0a33a", "#ff6b77"] }] } }); }
function drawRadar(id, e) { const data = e ? [Math.min(e.trade?.trades || 0, 100), Math.min(e.trade?.winRate || 0, 100), Math.min(e.timeOk, 100), Math.min(e.entryRate, 100), e.score * 20, e.topNg.length ? 70 : 20] : [0, 0, 0, 0, 0, 0]; makeChart(id, { type: "radar", data: { labels: ["Trade", "WinRate", "TimeOK", "EntryRate", "Health", "ResearchScore"], datasets: [{ label: e?.engine || "Engine", data, borderColor: "#39d8ff", backgroundColor: "rgba(57,216,255,.18)" }] } }); }

function makeChart(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas || !window.Chart) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(canvas, { ...config, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#cce8ff" } } }, scales: config.type === "doughnut" || config.type === "radar" ? {} : { x: { ticks: { color: "#9db5cc" }, grid: { color: "rgba(157,181,204,.14)" } }, y: { ticks: { color: "#9db5cc" }, grid: { color: "rgba(157,181,204,.14)" } } } } });
}

function setHtml(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function fmt(value) { return Number(value || 0).toLocaleString(); }
function pct(value) { return `${round(value)}%`; }
function pf(value) { return value >= 999 ? "Infinity" : String(round(value)); }
function signed(value) { return value > 0 ? `+${value}` : String(value); }
function healthClass(value) { return value === "Needs Research" ? "Needs" : value || "Inactive"; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m])); }

function downloadHistory() {
  downloadText("ResearchHistory.json", JSON.stringify(loadResearchHistory(), null, 2), "application/json");
}

function downloadMarkdownReport() {
  const memo = document.getElementById("researchMemo").value;
  downloadText("ResearchReport.md", buildMarkdownReport(engine.results, memo), "text/markdown");
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
