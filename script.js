const engine = new AnalysisEngine();
let charts = {};
const virtualTableState = {};
const PRODUCTIVITY_VERSION = "6.1";
const DASHBOARD_CARD_CONFIG_KEY = "scalplayer_dashboard_cards_v61";
const FAVORITE_ENGINE_KEY = "scalplayer_favorite_engine_v61";
const SEARCH_QUERY_KEY = "scalplayer_fast_search_query_v61";
const DEFAULT_DASHBOARD_CARDS = [
  { id: "labDashboard", label: "Research Lab Summary", visible: true },
  { id: "workspaceDashboard", label: "Workspace Summary", visible: true },
  { id: "strategyDashboard", label: "Research Strategy Summary", visible: true },
  { id: "hypothesisDashboard", label: "Hypothesis Summary", visible: true },
  { id: "lineageDashboard", label: "Hypothesis Lineage Summary", visible: true },
  { id: "engineDnaDashboard", label: "Engine DNA Summary", visible: true },
  { id: "knowledgeGraphDashboard", label: "Knowledge Graph Summary", visible: true },
  { id: "trendDashboard", label: "Research Trend", visible: true },
  { id: "analysisWarnings", label: "Analysis Warnings", visible: true },
  { id: "performancePanel", label: "Performance Panel", visible: true },
  { id: "progressPanel", label: "Research Progress", visible: true }
];

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupFileInput();
  setupButtons();
  setupVirtualTables();
  fillResearchSelects();
  if (byId("researchMemo")) byId("researchMemo").value = loadMemo();
  if (byId("workspaceMemo")) byId("workspaceMemo").value = ResearchWorkspaceStore.load().memo;
  renderAll();
});

function byId(id) {
  return document.getElementById(id);
}

function setupVirtualTables() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".load-more-table");
    if (!button) return;
    const key = button.dataset.tableKey;
    virtualTableState[key] = Number(button.dataset.nextLimit || 100);
    renderActiveTab();
  });
}

function on(id, event, handler) {
  const el = byId(id);
  if (!el) {
    console.warn(`Missing UI element: ${id}`);
    return;
  }
  el.addEventListener(event, handler);
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      button.classList.add("active");
      byId(button.dataset.tab)?.classList.add("active");
      setText("pageTitle", button.textContent);
      renderActiveTab();
    });
  });
}

function setupFileInput() {
  on("csvFiles", "change", async (e) => loadFiles(e.target.files));
  const zone = byId("dropZone");
  if (!zone) return;
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("dragover"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", async (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    await loadFiles(e.dataTransfer.files);
  });
}

function setupButtons() {
  on("resetButton", "click", () => { engine.reset(); renderAll(); });
  on("promptButton", "click", () => { activateTab("intelligence"); byId("chatgptPrompt")?.select(); });
  on("downloadHistoryButton", "click", downloadHistory);
  on("downloadReportButton", "click", downloadMarkdownReport);
  on("exportAllButton", "click", exportAllResearch);
  on("globalSearchInput", "input", (event) => {
    localStorage.setItem(SEARCH_QUERY_KEY, event.target.value || "");
    renderSearch();
  });
  on("clearSearchButton", "click", () => {
    localStorage.removeItem(SEARCH_QUERY_KEY);
    if (byId("globalSearchInput")) byId("globalSearchInput").value = "";
    renderSearch();
  });
  on("saveMemoButton", "click", () => {
    saveMemo(byId("researchMemo")?.value || "");
    setText("memoStatus", "Saved");
    setTimeout(() => setText("memoStatus", ""), 1600);
  });
  on("saveWorkspaceMemoButton", "click", () => {
    ResearchWorkspaceStore.saveMemo(byId("workspaceMemo")?.value || "");
    ResearchWorkspaceStore.addActivity("Memo", "Workspace memo saved", "localStorage only");
    setText("workspaceMemoStatus", "Saved");
    setTimeout(() => setText("workspaceMemoStatus", ""), 1600);
    renderWorkspace();
  });
  on("engineFilter", "change", (event) => {
    engine.results.selectedEngine = event.target.value;
    renderEngine();
    renderHeatmaps();
  });
  on("researchTemplate", "change", applyResearchTemplate);
  on("createResearchButton", "click", createResearchFromForm);
  on("exportResearchManagerButton", "click", exportResearchManager);
  on("importResearchManagerInput", "change", importResearchManager);
  document.addEventListener("click", (event) => {
    const bookmark = event.target.closest(".workspace-bookmark");
    if (bookmark) {
      ResearchWorkspaceStore.toggleBookmark({
        id: bookmark.dataset.id,
        type: bookmark.dataset.type,
        label: bookmark.dataset.label,
        targetId: bookmark.dataset.targetId || bookmark.dataset.id
      });
      renderWorkspace();
      renderDashboard();
      return;
    }
    const pin = event.target.closest(".workspace-pin");
    if (pin) {
      ResearchWorkspaceStore.togglePin({
        id: pin.dataset.id,
        type: pin.dataset.type,
        label: pin.dataset.label,
        targetId: pin.dataset.targetId || pin.dataset.id
      });
      renderWorkspace();
      renderDashboard();
      return;
    }
    const favorite = event.target.closest(".favorite-engine-button");
    if (favorite) {
      setFavoriteEngine(favorite.dataset.engine || "");
      renderDashboard();
      return;
    }
    const cardToggle = event.target.closest(".dashboard-card-toggle");
    if (cardToggle) {
      updateDashboardCard(cardToggle.dataset.cardId, { visible: cardToggle.checked });
      renderDashboard();
      return;
    }
    const move = event.target.closest(".dashboard-card-move");
    if (move) {
      moveDashboardCard(move.dataset.cardId, move.dataset.direction);
      renderDashboard();
    }
  });
  ["filterResearchStatus", "filterResearchCategory", "filterResearchDecision", "filterResearchPriority", "filterResearchConfidence", "filterResearchHealth", "researchSearch"].forEach((id) => {
    on(id, id === "researchSearch" ? "input" : "change", () => {
      renderResearchManager();
      renderResearchBoard();
      renderPortfolio();
    });
  });
}

async function loadFiles(files) {
  try {
    await engine.loadFiles(files);
    ResearchWorkspaceStore.addActivity("CSV Load", `${engine.files.size} CSV loaded`, Array.from(engine.files.keys()).join(", "));
  } catch (error) {
    console.error("CSV load failed", error);
  }
  renderAll();
}

function activateTab(id) {
  document.querySelector(`.tab[data-tab="${id}"]`)?.click();
}

function renderAll() {
  renderStatus();
  renderActiveTab();
}

function currentTabId() {
  return document.querySelector(".tab.active")?.dataset.tab || "dashboard";
}

function renderActiveTab() {
  const tab = currentTabId();
  const renderers = {
    dashboard: renderDashboard,
    lab: renderLabReport,
    engine: renderEngine,
    engineDna: renderEngineDna,
    condition: renderCondition,
    heatmap: renderHeatmaps,
    session: renderSession,
    nearmiss: renderNearMiss,
    trade: renderTrade,
    signal: renderSignal,
    manager: renderManager,
    dataQuality: renderDataQuality,
    crossCsv: renderCrossCsv,
    intelligence: renderIntelligence,
    researchManager: renderResearchManager,
    researchBoard: renderResearchBoard,
    portfolio: renderPortfolio,
    workspace: renderWorkspace,
    hypothesis: renderHypothesis,
    lineage: renderLineage,
    strategy: renderStrategy,
    search: renderSearch,
    brain: renderBrain,
    knowledgeGraph: renderKnowledgeGraph,
    timeline: renderTimeline
  };
  (renderers[tab] || renderDashboard)();
}

function renderStatus() {
  const loaded = engine.files.size;
  byId("statusDot")?.classList.toggle("ready", loaded > 0);
  setText("statusTitle", loaded ? `${loaded} CSV loaded` : "No CSV loaded");
  setText("statusText", loaded ? "Research Lab updated." : "Load CSV files exported by the EA.");
}

function renderDashboard() {
  const d = engine.results.dashboard;
  const bestEngine = engine.results.tradeByEngine[0]?.name || "-";
  const mostActive = engine.results.engineActivity[0]?.engine || "-";
  const mostNear = engine.results.nearMiss.closestEngine?.engine || "-";
  const target = engine.results.intelligence[0]?.title || "-";
  const dna = engine.results.engineDna || (typeof EngineDnaEngine !== "undefined" ? new EngineDnaEngine({ analysisEngine: engine }).snapshot() : null);
  if (dna) engine.results.engineDna = dna;
  const kg = engine.results.knowledgeGraph || (typeof KnowledgeGraphEngine !== "undefined" ? new KnowledgeGraphEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  if (kg) engine.results.knowledgeGraph = kg;
  const hypothesis = engine.results.hypothesis || (typeof ResearchHypothesisEngine !== "undefined" ? new ResearchHypothesisEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  if (hypothesis) engine.results.hypothesis = hypothesis;
  const lineage = engine.results.hypothesisLineage || (typeof HypothesisLineageEngine !== "undefined" ? new HypothesisLineageEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  if (lineage) engine.results.hypothesisLineage = lineage;
  const workspace = engine.results.workspace || (typeof ResearchWorkspaceEngine !== "undefined" ? new ResearchWorkspaceEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  if (workspace) engine.results.workspace = workspace;
  const strategy = engine.results.researchStrategy || (typeof ResearchStrategyEngine !== "undefined" ? new ResearchStrategyEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  if (strategy) engine.results.researchStrategy = strategy;
  setHtml("labDashboard", [
    researchItem("Best Engine", bestEngine, "Highest current trade performance"),
    researchItem("Most Active Engine", mostActive, "Highest research score from activity"),
    researchItem("Current Research Target", target, engine.results.intelligence[0]?.target || "Load CSV")
  ].join(""));
  setHtml("engineDnaDashboard", dna ? `<h3>Top Engine DNA</h3>${metrics([
    ["Top Engine", dna.topEngine?.engine || "-"],
    ["Personality", dna.topEngine?.personality || "-"],
    ["Stability", dna.topEngine?.stability || "-"],
    ["Hidden Opportunity", dna.hiddenOpportunity?.[0]?.engine || "-"]
  ])}<p>${escapeHtml(dna.summary || "Load CSV to activate Engine DNA.")}</p>` : `<h3>Top Engine DNA</h3><p class="empty">Engine DNA module is not loaded.</p>`);
  setHtml("knowledgeGraphDashboard", kg ? `<h3>Knowledge Graph Summary</h3>${metrics([
    ["Largest Cluster", kg.largestCluster?.label || "-"],
    ["Most Connected Engine", kg.topConnectedEngine?.label || "-"],
    ["Most Connected TopNG", kg.topConnectedTopNg?.label || "-"],
    ["Research Hub", kg.researchHub?.label || "-"],
    ["Graph Density", `${kg.graphStatistics?.density || 0}%`]
  ])}<p>${escapeHtml(kg.insight?.[0] || "Load CSV and Research Manager data to activate Knowledge Graph.")}</p>` : `<h3>Knowledge Graph Summary</h3><p class="empty">Knowledge Graph module is not loaded.</p>`);
  setHtml("workspaceDashboard", workspace ? `<h3>Workspace Summary</h3>${metrics([
    ["Today's Focus", workspace.summary.title],
    ["Queue", workspace.summary.queueCount],
    ["Bookmarks", workspace.summary.bookmarkCount],
    ["Pinned", workspace.summary.pinCount],
    ["Recent Activity", workspace.summary.recentActivityCount]
  ])}<p><strong>Reason:</strong> ${escapeHtml(workspace.summary.reason)}</p><p>${escapeHtml(workspace.summary.next)}</p>` : `<h3>Workspace Summary</h3><p class="empty">Workspace module is not loaded.</p>`);
  setHtml("hypothesisDashboard", hypothesis ? `<h3>Hypothesis Summary</h3>${metrics([
    ["Hypotheses", hypothesis.hypothesisSummary.total],
    ["Top Hypothesis", hypothesis.hypothesisSummary.topTitle],
    ["Top Score", `${hypothesis.hypothesisSummary.topScore}/100`],
    ["Confidence", hypothesis.hypothesisSummary.topConfidence],
    ["Evidence", hypothesis.evidenceSummary.total],
    ["Open Questions", hypothesis.openQuestions.length]
  ])}` : `<h3>Hypothesis Summary</h3><p class="empty">Hypothesis module is not loaded.</p>`);
  setHtml("lineageDashboard", lineage ? `<h3>Hypothesis Lineage Summary</h3>${metrics([
    ["Largest Family", lineage.hypothesisLineageSummary.largestFamily],
    ["Most Connected", lineage.hypothesisLineageSummary.mostConnectedHypothesis],
    ["Orphans", lineage.hypothesisLineageSummary.orphanCount],
    ["Duplicates", lineage.hypothesisLineageSummary.duplicateCandidateCount],
    ["Avg Weighted Evidence", lineage.hypothesisLineageSummary.averageWeightedEvidence],
    ["Avg Readiness", `${lineage.hypothesisLineageSummary.averageValidationReadiness}%`],
    ["Top Score 2.0", `${lineage.hypothesisLineageSummary.topScore2}/100`],
    ["Top Confidence", `${lineage.hypothesisLineageSummary.topConfidencePercent}%`]
  ])}` : `<h3>Hypothesis Lineage Summary</h3><p class="empty">Hypothesis Lineage module is not loaded.</p>`);
  setHtml("strategyDashboard", strategy ? `<h3>Research Strategy Summary</h3>${metrics([
    ["Current Best Research", strategy.strategySummary.currentBestResearch],
    ["Highest ROI", strategy.strategySummary.highestROI],
    ["Highest Impact", strategy.strategySummary.highestImpact],
    ["Lowest Cost", strategy.strategySummary.lowestCost],
    ["Current Blocker", strategy.strategySummary.currentBlocker],
    ["Coverage", strategy.strategySummary.coverage],
    ["Roadmap", strategy.strategySummary.roadmap],
    ["Quick Win", strategy.strategySummary.quickWin]
  ])}<p>${escapeHtml(strategy.strategySummary.summary)}</p>` : `<h3>Research Strategy Summary</h3><p class="empty">Research Strategy module is not loaded.</p>`);
  const trend = new TrendEngine({ analysisEngine: engine, researchManager }).snapshot();
  engine.results.trend = trend;
  setHtml("trendDashboard", `<h3>Research Trend</h3>${metrics([
    ["Snapshots", trend.count],
    ["Trend", trend.forecast[0]?.status || "Need Data"],
    ["Best Metric", trend.bestSnapshot[0]?.metric || "-"],
    ["Recommendation", trend.recommendations[0]?.title || "Continue Timeline Collection"]
  ])}`);
  renderWarnings();
  renderPerformancePanel();
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
  renderProductivityPanels();
  applyDashboardCardLayout();
}

function renderProductivityPanels() {
  const favorite = getFavoriteEngine();
  const engineNames = getEngineNames();
  const favoriteData = getEngineSummary(favorite);
  setHtml("productivityBar", productivityBarHtml());
  setHtml("favoriteEnginePanel", favoriteEngineHtml(engineNames, favorite, favoriteData));
  setHtml("snapshotComparePanel", snapshotCompareHtml());
  setHtml("dashboardCustomizePanel", dashboardCustomizeHtml());
}

function productivityBarHtml() {
  const history = loadResearchHistory();
  const comparison = snapshotDiff(history.at(-2), history.at(-1));
  const strategy = engine.results.researchStrategy;
  return [
    `<div class="productivity-card primary"><span>Focus</span><strong>${escapeHtml(strategy?.strategySummary?.currentBestResearch || engine.results.intelligence[0]?.title || "Load CSV")}</strong><p>${escapeHtml(strategy?.strategySummary?.summary || "Research-only productivity layer is ready.")}</p></div>`,
    `<div class="productivity-card"><span>Last Snapshot</span><strong>${history.length ? formatDate(history.at(-1).datetime) : "No history"}</strong><p>${history.length} snapshots stored locally.</p></div>`,
    `<div class="productivity-card"><span>Latest Diff</span><strong>${comparison ? signed(comparison.trades) : "0"} Trades</strong><p>NearMiss ${comparison ? signed(comparison.nearMiss) : "0"} / PF ${comparison ? signed(round(comparison.profitFactor)) : "0"}</p></div>`,
    `<div class="productivity-card"><span>Export</span><strong>MD / JSON / CSV</strong><p>Use Export All for a research package.</p></div>`
  ].join("");
}

function getDashboardCards() {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(DASHBOARD_CARD_CONFIG_KEY) || "[]"); } catch { saved = []; }
  const bySaved = new Map(saved.map((x) => [x.id, x]));
  const merged = DEFAULT_DASHBOARD_CARDS.map((card) => ({ ...card, ...(bySaved.get(card.id) || {}) }));
  const savedIds = new Set(saved.map((x) => x.id));
  const newCards = DEFAULT_DASHBOARD_CARDS.filter((x) => !savedIds.has(x.id));
  return saved.length ? [...saved.filter((x) => DEFAULT_DASHBOARD_CARDS.some((d) => d.id === x.id)).map((x) => ({ ...DEFAULT_DASHBOARD_CARDS.find((d) => d.id === x.id), ...x })), ...newCards] : merged;
}

function saveDashboardCards(cards) {
  localStorage.setItem(DASHBOARD_CARD_CONFIG_KEY, JSON.stringify(cards));
}

function updateDashboardCard(id, patch) {
  saveDashboardCards(getDashboardCards().map((card) => card.id === id ? { ...card, ...patch } : card));
}

function moveDashboardCard(id, direction) {
  const cards = getDashboardCards();
  const index = cards.findIndex((card) => card.id === id);
  const next = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || next < 0 || next >= cards.length) return;
  [cards[index], cards[next]] = [cards[next], cards[index]];
  saveDashboardCards(cards);
}

function applyDashboardCardLayout() {
  const container = byId("dashboardCards");
  if (!container) return;
  getDashboardCards().forEach((card) => {
    const el = byId(card.id);
    if (!el) return;
    el.style.display = card.visible ? "" : "none";
    container.appendChild(el);
  });
}

function dashboardCustomizeHtml() {
  const cards = getDashboardCards();
  return `<div class="dashboard-customize">${cards.map((card, index) => `<div class="customize-row"><label><input class="dashboard-card-toggle" data-card-id="${escapeHtml(card.id)}" type="checkbox" ${card.visible ? "checked" : ""}> ${escapeHtml(card.label)}</label><div><button class="tiny-button dashboard-card-move" data-card-id="${escapeHtml(card.id)}" data-direction="up" ${index === 0 ? "disabled" : ""}>Up</button> <button class="tiny-button dashboard-card-move" data-card-id="${escapeHtml(card.id)}" data-direction="down" ${index === cards.length - 1 ? "disabled" : ""}>Down</button></div></div>`).join("")}</div>`;
}

function getEngineNames() {
  const names = new Set();
  engine.results.engineActivity.forEach((x) => names.add(x.engine));
  engine.results.tradeByEngine.forEach((x) => names.add(x.name));
  (engine.results.engineDna?.profiles || []).forEach((x) => names.add(x.engine));
  return Array.from(names).filter(Boolean).sort();
}

function getFavoriteEngine() {
  return localStorage.getItem(FAVORITE_ENGINE_KEY) || getEngineNames()[0] || "";
}

function setFavoriteEngine(name) {
  if (name) localStorage.setItem(FAVORITE_ENGINE_KEY, name);
}

function getEngineSummary(name) {
  if (!name) return null;
  const activity = engine.results.engineActivity.find((x) => x.engine === name);
  const trade = engine.results.tradeByEngine.find((x) => x.name === name);
  const dna = engine.results.engineDna?.profiles?.find((x) => x.engine === name);
  return { activity, trade, dna };
}

function favoriteEngineHtml(engineNames, favorite, data) {
  const buttons = engineNames.slice(0, 10).map((name) => `<button class="tiny-button favorite-engine-button ${name === favorite ? "active" : ""}" data-engine="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join(" ");
  if (!favorite) return `<div class="empty">Load CSV to choose a favorite Engine.</div>`;
  return `${metrics([
    ["Favorite", favorite],
    ["Trades", data?.trade?.trades || 0],
    ["WinRate", pct(data?.trade?.winRate || 0)],
    ["Pips", round(data?.trade?.pips || 0)],
    ["Checks", data?.activity?.checks || 0],
    ["EntryRate", pct(data?.activity?.entryRate || 0)],
    ["Health", data?.activity?.health || data?.dna?.stability || "-"],
    ["TopNG", data?.activity?.topNg?.[0]?.name || data?.dna?.topNg?.[0]?.name || "-"]
  ])}<div class="favorite-buttons">${buttons || "<span class='empty'>No Engine data.</span>"}</div>`;
}

function snapshotCompareHtml() {
  const history = loadResearchHistory();
  if (history.length < 2) return `<div class="empty">Run Analyzer at least twice to compare snapshots.</div>`;
  const current = history.at(-1);
  const previous = history.at(-2);
  const previousDay = findPreviousDaySnapshot(history);
  const avg7 = averageSnapshots(history.slice(-7));
  const rows = [
    ["Previous", previous],
    ["Previous Day", previousDay],
    ["Last 7 Avg", avg7]
  ].filter((x) => x[1]).map(([label, base]) => snapshotDiffRow(label, base, current));
  return rawTable(["Compare", "Trades", "NearMiss", "WinRate", "PF", "Quality"], rows);
}

function snapshotDiffRow(label, base, current) {
  const diff = snapshotDiff(base, current);
  return [
    label,
    changeBadge(diff.trades, false),
    changeBadge(diff.nearMiss, true),
    changeBadge(round(diff.winRate), false, "%"),
    changeBadge(round(diff.profitFactor), false),
    changeBadge(round(diff.qualityScore), false)
  ];
}

function snapshotDiff(base, current) {
  return {
    trades: (current?.trades || 0) - (base?.trades || 0),
    nearMiss: (current?.nearMiss || 0) - (base?.nearMiss || 0),
    winRate: (current?.winRate || 0) - (base?.winRate || 0),
    profitFactor: (current?.profitFactor || 0) - (base?.profitFactor || 0),
    qualityScore: (current?.qualityScore || 0) - (base?.qualityScore || 0)
  };
}

function findPreviousDaySnapshot(history) {
  const latest = history.at(-1);
  if (!latest?.datetime) return history.at(-2);
  const latestDay = new Date(latest.datetime).toDateString();
  return [...history].reverse().find((x) => x !== latest && x.datetime && new Date(x.datetime).toDateString() !== latestDay) || history.at(-2);
}

function averageSnapshots(items) {
  if (!items.length) return null;
  return {
    trades: avgPlain(items, "trades"),
    nearMiss: avgPlain(items, "nearMiss"),
    winRate: avgPlain(items, "winRate"),
    profitFactor: avgPlain(items, "profitFactor"),
    qualityScore: avgPlain(items, "qualityScore")
  };
}

function avgPlain(items, key) {
  return items.reduce((acc, item) => acc + (Number(item?.[key]) || 0), 0) / items.length;
}

function changeBadge(value, lowerIsGood = false, suffix = "") {
  const n = Number(value) || 0;
  const cls = n === 0 ? "flat" : ((n > 0) !== lowerIsGood ? "good" : "bad");
  return `<span class="change ${cls}">${escapeHtml(`${signed(round(n))}${suffix}`)}</span>`;
}

function renderEngineDna() {
  if (!byId("engineDnaOverview")) return;
  if (typeof EngineDnaEngine === "undefined") {
    setHtml("engineDnaOverview", `<span class="pill">Engine DNA</span><h3>Engine DNA module is not loaded.</h3>`);
    return;
  }
  const dna = new EngineDnaEngine({ analysisEngine: engine }).snapshot();
  engine.results.engineDna = dna;
  const top = dna.topEngine;
  setHtml("engineDnaOverview", `<span class="pill">Engine DNA</span><h3>${escapeHtml(top ? `${top.engine} / ${top.personality}` : "Load CSV to build Engine DNA.")}</h3><p>${escapeHtml(dna.summary || "Engine DNA analyzes personality, similarity, cluster, strength, weakness, and evolution without changing EA or CSV data.")}</p>`);
  setHtml("engineDnaMetrics", metrics([
    ["Engines", dna.profiles.length],
    ["Top DNA Score", top ? top.researchScore : "0"],
    ["Top Confidence", top ? top.confidence : "No Data"],
    ["Clusters", dna.clusters.length],
    ["Similarity Pairs", dna.similarity.length],
    ["Hidden Opportunities", dna.hiddenOpportunity.length],
    ["Evolution Items", dna.evolution.length],
    ["Mode", "Research Only"]
  ]));
  setHtml("engineDnaProfiles", table(["Engine", "Score", "Confidence", "Personality", "Cluster", "Trades", "NearMiss", "Signals", "WinRate", "PF", "Expectancy", "TopNG"], dna.profiles.map((x) => [x.engine, x.researchScore, x.confidence, x.personality, x.cluster, x.tradeCount, x.nearMissCount, x.signalCount, pct(x.winRate), pf(x.profitFactor), round(x.expectancy), (x.topNg || []).slice(0, 3).map((n) => `${n.name}:${n.count}`).join(" / ")])));
  setHtml("enginePersonality", table(["Engine", "Personality", "Strength", "Weakness"], dna.profiles.map((x) => [x.engine, x.personality, (x.strength || []).join(" / ") || "-", (x.weakness || []).join(" / ") || "-"])));
  setHtml("engineStability", table(["Engine", "Stability", "Avg Win", "Avg Loss", "Avg Hold", "Avg Spread", "Avg RSI", "Avg ATR"], dna.profiles.map((x) => [x.engine, x.stability, round(x.averageWin), round(x.averageLoss), round(x.averageHolding), round(x.averageSpread), round(x.averageRsi), round(x.averageAtr)])));
  setHtml("engineSimilarity", table(["Engine A", "Engine B", "Similarity", "Shared Signals"], dna.similarity.slice(0, 30).map((x) => [x.engineA, x.engineB, `${x.similarity}%`, x.shared.join(" / ") || "-"])));
  setHtml("engineCluster", table(["Cluster", "Count", "Engines", "Avg DNA", "Avg Stability"], dna.clusters.map((x) => [x.cluster, x.count, x.engines.join(", "), x.averageDnaScore, x.averageStability])));
  setHtml("engineStrength", table(["Engine", "Strength"], dna.profiles.map((x) => [x.engine, (x.strength || []).join(" / ") || "-"])));
  setHtml("engineWeakness", table(["Engine", "Weakness"], dna.profiles.map((x) => [x.engine, (x.weakness || []).join(" / ") || "-"])));
  setHtml("hiddenOpportunity", table(["Priority", "Engine", "Trades", "NearMiss", "Signals", "Reason"], dna.hiddenOpportunity.map((x) => [x.priority, x.engine, x.trades, x.nearMiss, x.signals, x.reason])));
  setHtml("engineDnaEvolution", table(["Engine", "Points", "First", "Last", "Delta", "Status"], dna.evolution.map((x) => [x.engine, x.points, x.firstScore, x.lastScore, signed(x.delta), x.status])));
  renderDnaCompare(dna);
}

function renderDnaCompare(dna) {
  const aSelect = byId("dnaCompareA");
  const bSelect = byId("dnaCompareB");
  if (!aSelect || !bSelect) return;
  const names = dna.profiles.map((x) => x.engine);
  const previousA = aSelect.value || names[0] || "";
  const previousB = bSelect.value || names.find((x) => x !== previousA) || names[1] || previousA;
  const options = names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  aSelect.innerHTML = options;
  bSelect.innerHTML = options;
  aSelect.value = names.includes(previousA) ? previousA : names[0] || "";
  bSelect.value = names.includes(previousB) ? previousB : names.find((x) => x !== aSelect.value) || names[0] || "";
  aSelect.onchange = () => renderEngineDna();
  bSelect.onchange = () => renderEngineDna();
  const a = dna.profiles.find((x) => x.engine === aSelect.value);
  const b = dna.profiles.find((x) => x.engine === bSelect.value);
  const sim = dna.similarity.find((x) => (x.engineA === a?.engine && x.engineB === b?.engine) || (x.engineA === b?.engine && x.engineB === a?.engine));
  if (!a || !b) {
    setHtml("engineDnaCompare", `<div class="empty">Load CSV to compare Engine DNA.</div>`);
    return;
  }
  setHtml("engineDnaCompare", `${metrics([
    ["Similarity", sim ? `${sim.similarity}%` : "100%"],
    ["Shared", sim ? sim.shared.join(" / ") || "-" : "Same Engine"],
    ["A Personality", a.personality],
    ["B Personality", b.personality]
  ])}${table(["Metric", a.engine, b.engine], [
    ["Research Score", a.researchScore, b.researchScore],
    ["Confidence", a.confidence, b.confidence],
    ["Stability", a.stability, b.stability],
    ["Trade Count", a.tradeCount, b.tradeCount],
    ["NearMiss Count", a.nearMissCount, b.nearMissCount],
    ["Signal Count", a.signalCount, b.signalCount],
    ["WinRate", pct(a.winRate), pct(b.winRate)],
    ["Profit Factor", pf(a.profitFactor), pf(b.profitFactor)],
    ["Expectancy", round(a.expectancy), round(b.expectancy)],
    ["TopNG", (a.topNg || []).slice(0, 3).map((n) => n.name).join(" / ") || "-", (b.topNg || []).slice(0, 3).map((n) => n.name).join(" / ") || "-"]
  ])}`);
}

function renderKnowledgeGraph() {
  if (!byId("knowledgeOverview")) return;
  if (typeof KnowledgeGraphEngine === "undefined") {
    setHtml("knowledgeOverview", `<span class="pill">Knowledge Graph</span><h3>Knowledge Graph module is not loaded.</h3>`);
    return;
  }
  const kg = new KnowledgeGraphEngine({ analysisEngine: engine, researchManager }).snapshot();
  engine.results.knowledgeGraph = kg;
  setHtml("knowledgeOverview", `<span class="pill">Research Knowledge Graph</span><h3>${escapeHtml(kg.topConnectedEngine?.label || "Knowledge Graph needs more data.")}</h3><p>${escapeHtml((kg.insight || []).join(" "))}</p>`);
  setHtml("knowledgeMetrics", metrics([
    ["Nodes", kg.graphStatistics.nodeCount],
    ["Edges", kg.graphStatistics.edgeCount],
    ["Engines", kg.graphStatistics.engineCount],
    ["Research", kg.graphStatistics.researchCount],
    ["Conditions", kg.graphStatistics.conditionCount],
    ["Sessions", kg.graphStatistics.sessionCount],
    ["Components", kg.graphStatistics.connectedComponents],
    ["Density", `${kg.graphStatistics.density}%`]
  ]));
  setHtml("knowledgeGraphView", graphPreviewHtml(kg.nodes, kg.edges, "Knowledge Graph"));
  setHtml("engineNetwork", `${graphPreviewHtml(kg.engineSimilarityGraph.nodes, kg.engineSimilarityGraph.edges, "Engine Similarity")}${table(["Engine A", "Engine B", "Similarity"], kg.engineSimilarityGraph.edges.slice(0, 20).map((x) => [labelFromNodeId(x.source), labelFromNodeId(x.target), x.label]))}`);
  setHtml("researchNetwork", table(["Research", "Engine", "Category", "Status"], kg.dependencyGraph.nodes.slice(0, 30).map((x) => [x.label, x.engine || "-", x.category || "-", x.status || "-"])));
  setHtml("clusterTree", clusterTreeHtml(kg.engineClusterGraph));
  setHtml("opportunityFlow", flowHtml(kg.opportunityFlow));
  setHtml("sessionFlow", table(["Session", "Trades", "NearMiss", "WinRate", "Research Score"], kg.sessionFlow.map((x) => [x.session, x.trades, x.nearMiss, pct(x.winRate), x.researchScore])));
  setHtml("topNgNetwork", table(["Source", "Target", "Type", "Weight"], kg.bottleneckGraph.slice(0, 40).map((x) => [labelFromNodeId(x.source), labelFromNodeId(x.target), x.type, x.weight])));
  setHtml("dependencyGraph", table(["Research A", "Research B", "Dependency"], kg.dependencyGraph.edges.slice(0, 40).map((x) => [labelFromResearchId(kg.dependencyGraph.nodes, x.source), labelFromResearchId(kg.dependencyGraph.nodes, x.target), x.label])));
  setHtml("graphStatistics", table(["Metric", "Value"], [
    ["Node Count", kg.graphStatistics.nodeCount],
    ["Edge Count", kg.graphStatistics.edgeCount],
    ["Engine Count", kg.graphStatistics.engineCount],
    ["Research Count", kg.graphStatistics.researchCount],
    ["Condition Count", kg.graphStatistics.conditionCount],
    ["Session Count", kg.graphStatistics.sessionCount],
    ["TopNG Count", kg.graphStatistics.topNgCount],
    ["Connected Components", kg.graphStatistics.connectedComponents],
    ["Graph Density", `${kg.graphStatistics.density}%`],
    ["Largest Cluster", `${kg.largestCluster.label} (${kg.largestCluster.count})`],
    ["Research Hub", `${kg.researchHub.label} (${kg.researchHub.degree})`],
    ["Top Connected Engine", `${kg.topConnectedEngine.label} (${kg.topConnectedEngine.degree})`],
    ["Top Connected TopNG", `${kg.topConnectedTopNg.label} (${kg.topConnectedTopNg.degree})`]
  ]));
}

function renderWorkspace() {
  if (!byId("workspaceOverview")) return;
  if (typeof ResearchWorkspaceEngine === "undefined") {
    setHtml("workspaceOverview", `<span class="pill">Research Workspace</span><h3>Workspace module is not loaded.</h3>`);
    return;
  }
  const workspace = new ResearchWorkspaceEngine({ analysisEngine: engine, researchManager }).snapshot();
  engine.results.workspace = workspace;
  if (byId("workspaceMemo")) byId("workspaceMemo").value = ResearchWorkspaceStore.load().memo;
  setHtml("workspaceOverview", `<span class="pill">Research Workspace</span><h3>${escapeHtml(workspace.summary.title)}</h3><p><strong>Reason:</strong> ${escapeHtml(workspace.summary.reason)}</p><p>${escapeHtml(workspace.summary.next)}</p>`);
  setHtml("workspaceMetrics", metrics([
    ["Focus", workspace.focus.length],
    ["Queue", workspace.queue.length],
    ["Bookmarks", workspace.bookmarks.length],
    ["Pinned", workspace.pins.length],
    ["Recent Activity", workspace.recentActivity.length],
    ["Memo", `${workspace.memoLength} chars`],
    ["Mode", "Research Only"],
    ["Storage", "localStorage"]
  ]));
  setHtml("todaysFocus", workspace.focus.length ? workspace.focus.map((x, i) => workspaceItemHtml(x, i + 1, true)).join("") : `<div class="empty">No focus yet. Load CSV or create Research items.</div>`);
  setHtml("researchQueue", workspace.queue.length ? `<div class="workspace-list">${workspace.queue.map((x, i) => workspaceItemHtml(x, i + 1)).join("")}</div>` : `<div class="empty">No Research Queue yet.</div>`);
  setHtml("workspaceBookmarks", workspace.bookmarks.length ? `<div class="workspace-list">${workspace.bookmarks.map((x, i) => workspaceSavedItemHtml(x, i + 1, "bookmark")).join("")}</div>` : `<div class="empty">No bookmarks yet.</div>`);
  setHtml("workspacePins", workspace.pins.length ? `<div class="workspace-list">${workspace.pins.map((x, i) => workspaceSavedItemHtml(x, i + 1, "pin")).join("")}</div>` : `<div class="empty">No pinned items yet.</div>`);
  setHtml("workspaceRecentActivity", workspace.recentActivity.length ? table(["Time", "Type", "Title", "Detail"], workspace.recentActivity.map((x) => [formatDate(x.at), x.type, x.title, x.detail || "-"])) : `<div class="empty">No recent activity yet.</div>`);
}

function renderHypothesis() {
  if (!byId("hypothesisOverview")) return;
  if (typeof ResearchHypothesisEngine === "undefined") {
    setHtml("hypothesisOverview", `<span class="pill">Research Hypothesis</span><h3>Hypothesis module is not loaded.</h3>`);
    return;
  }
  const snapshot = new ResearchHypothesisEngine({ analysisEngine: engine, researchManager }).snapshot();
  engine.results.hypothesis = snapshot;
  const lineage = typeof HypothesisLineageEngine !== "undefined" ? new HypothesisLineageEngine({ analysisEngine: engine, researchManager }).snapshot() : null;
  if (lineage) engine.results.hypothesisLineage = lineage;
  const top = snapshot.hypotheses[0];
  setHtml("hypothesisOverview", `<span class="pill">Research Hypothesis</span><h3>${escapeHtml(top?.title || "No hypothesis yet.")}</h3><p>${escapeHtml(top ? `${top.hypothesis} / Confidence ${top.confidence} / Score ${top.score}` : "Create Research items or load CSV to generate hypotheses.")}</p>`);
  setHtml("hypothesisMetrics", metrics([
    ["Hypotheses", snapshot.hypothesisSummary.total],
    ["Verified", snapshot.hypothesisSummary.verified],
    ["Rejected", snapshot.hypothesisSummary.rejected],
    ["Top Score", `${snapshot.hypothesisSummary.topScore}/100`],
    ["Evidence", snapshot.evidenceSummary.total],
    ["Support", snapshot.evidenceSummary.support],
    ["Contradiction", snapshot.evidenceSummary.contradiction],
    ["Open Questions", snapshot.openQuestions.length]
  ]));
  setHtml("hypothesisScore2Table", lineage ? table(["Title", "Score 2.0", "Confidence %", "Weighted Evidence", "Validation", "Contradictions", "Open Questions"], lineage.hypothesisScore2.slice(0, 20).map((x) => [x.title, `${x.score}/100`, `${x.confidencePercent}%`, x.weightedEvidence, `${x.validationReadiness}%`, x.contradictions, x.openQuestions])) : `<div class="empty">Hypothesis Lineage module is not loaded.</div>`);
  setHtml("hypothesisFlow", flowHtml(snapshot.researchFlow.map((step, index) => ({ from: step, to: snapshot.researchFlow[index + 1] || "Done", value: index + 1, label: step === "Archive" ? "Archive complete" : `${step} -> ${snapshot.researchFlow[index + 1]}` })).slice(0, -1)));
  setHtml("hypothesisList", snapshot.hypotheses.length ? `<div class="workspace-list">${snapshot.hypotheses.map(hypothesisCardHtml).join("")}</div>` : `<div class="empty">No hypothesis yet.</div>`);
  setHtml("evidenceSummary", `${metrics([
    ["Total Evidence", snapshot.evidenceSummary.total],
    ["Support", snapshot.evidenceSummary.support],
    ["Neutral", snapshot.evidenceSummary.neutral],
    ["Contradiction", snapshot.evidenceSummary.contradiction]
  ])}${table(["Source", "Count"], snapshot.evidenceSummary.bySource.map((x) => [x.name, x.count]))}`);
  setHtml("openQuestions", table(["Open Question", "Count"], snapshot.openQuestions.map((x) => [x.question, x.count])));
  setHtml("hypothesisContradictions", table(["Hypothesis", "Source", "Evidence", "Value", "Reason"], snapshot.contradictions.map((x) => [x.hypothesis, x.source, x.title, x.value, x.reason])));
  document.querySelectorAll(".hypothesis-status").forEach((select) => {
    select.addEventListener("change", () => {
      ResearchHypothesisStore.setStatus(select.dataset.id, select.value);
      invalidateLineageCache();
      renderHypothesis();
      renderDashboard();
    });
  });
}

function renderLineage() {
  if (!byId("lineageOverview")) return;
  if (typeof HypothesisLineageEngine === "undefined") {
    setHtml("lineageOverview", `<span class="pill">Hypothesis Lineage</span><h3>Hypothesis Lineage module is not loaded.</h3>`);
    return;
  }
  const snapshot = new HypothesisLineageEngine({ analysisEngine: engine, researchManager }).snapshot();
  engine.results.hypothesisLineage = snapshot;
  const summary = snapshot.hypothesisLineageSummary;
  setHtml("lineageOverview", `<span class="pill">Hypothesis Lineage</span><h3>${escapeHtml(summary.topHypothesis || "No hypothesis yet.")}</h3><p>Score 2.0 ${escapeHtml(summary.topScore2)} / Confidence ${escapeHtml(summary.topConfidencePercent)}% / Largest Family: ${escapeHtml(summary.largestFamily || "-")}</p><p>This screen manages Research relations only. It never changes the EA, CSV, or trading conditions.</p>`);
  setHtml("lineageMetrics", metrics([
    ["Hypothesis Count", snapshot.lineagesStatistics.hypothesisCount],
    ["Relation Count", snapshot.lineagesStatistics.relationCount],
    ["Family Count", snapshot.hypothesisFamilies.length],
    ["Orphan Count", snapshot.hypothesisLineageSummary.orphanCount],
    ["Duplicate Candidates", snapshot.hypothesisLineageSummary.duplicateCandidateCount],
    ["Average Weighted Evidence", snapshot.hypothesisLineageSummary.averageWeightedEvidence],
    ["Average Readiness", `${snapshot.hypothesisLineageSummary.averageValidationReadiness}%`],
    ["Top Confidence", `${snapshot.hypothesisLineageSummary.topConfidencePercent}%`]
  ]));
  renderLineageEditor(snapshot);
  setHtml("lineageNetwork", lineageNetworkHtml(snapshot.hypothesisLineage.nodes, snapshot.hypothesisLineage.edges));
  setHtml("lineageStatistics", table(["Metric", "Value"], Object.entries(snapshot.lineagesStatistics).map(([k, v]) => [k, v])));
  setHtml("lineageRelations", lineageRelationsHtml(snapshot));
  setHtml("lineageFamilies", table(["Family", "Root", "Count", "Verified", "Rejected", "Avg Score", "Avg Confidence", "Evidence", "Contradictions", "Open Questions"], snapshot.hypothesisFamilies.map((x) => [x.name, x.rootHypothesis, x.hypothesisCount, x.verifiedCount, x.rejectedCount, x.averageScore, `${x.averageConfidence}%`, x.evidenceCount, x.contradictionCount, x.openQuestionCount])));
  setHtml("evidenceWeightSettings", evidenceWeightEditorHtml(snapshot.evidenceWeights));
  setHtml("weightedEvidenceSummary", table(["Evidence Source", "Weight", "Evidence Count", "Weighted Score"], snapshot.weightedEvidenceSummary.bySource.map((x) => [x.source, x.weight, x.evidenceCount, x.weightedScore])));
  setHtml("validationReadinessTable", table(["Title", "Readiness", "Label", "Checklist Done"], snapshot.enrichedHypotheses.slice(0, 30).map((x) => [x.title, `${x.validationReadiness}%`, x.validationReadinessLabel, `${x.validationChecklist.filter((c) => c.done).length}/${x.validationChecklist.length}`])));
  setHtml("duplicateHypotheses", snapshot.duplicateHypotheses.length ? table(["Source", "Target", "Similarity", "Suggested Relation"], snapshot.duplicateHypotheses.map((x) => [x.sourceTitle, x.targetTitle, `${x.similarity}%`, x.suggestedRelationType])) : `<div class="empty">No duplicate candidates.</div>`);
  setHtml("orphanHypotheses", snapshot.orphanHypotheses.length ? table(["Title", "Status", "Score", "Confidence", "Source", "Suggested Relation Candidate"], snapshot.orphanHypotheses.map((x) => [x.title, x.status, x.score, x.confidence, x.source, x.suggestedRelationCandidate])) : `<div class="empty">No orphan hypotheses.</div>`);
  setHtml("supersededHypotheses", snapshot.supersededHypotheses.length ? table(["Hypothesis", "Superseded By", "Note"], snapshot.supersededHypotheses.map((x) => [x.title, x.supersededBy, x.note])) : `<div class="empty">No superseded hypotheses.</div>`);
  renderHypothesisCompare(snapshot);
  setHtml("hypothesisTimeline", snapshot.hypothesisHistory.length ? table(["Date", "Hypothesis", "Event Type", "Before", "After", "Note"], snapshot.hypothesisHistory.map((x) => [formatDate(x.date), x.hypothesis, x.eventType, x.before || "-", x.after || "-", x.note || "-"])) : `<div class="empty">No hypothesis history yet.</div>`);
  bindLineageEvents();
}

function renderLineageEditor(snapshot) {
  const options = snapshot.enrichedHypotheses.map((h) => `<option value="${escapeHtml(h.id)}">${escapeHtml(h.title)}</option>`).join("");
  setHtml("lineageSource", options);
  setHtml("lineageTarget", options);
  setHtml("lineageType", snapshot.relationTypes.map((x) => `<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join(""));
}

function lineageRelationsHtml(snapshot) {
  if (!snapshot.hypothesisRelations.length) return `<div class="empty">No manual relations yet. Add a relation above.</div>`;
  const titleById = Object.fromEntries(snapshot.enrichedHypotheses.map((h) => [h.id, h.title]));
  const rows = snapshot.hypothesisRelations.map((r) => [
    escapeHtml(titleById[r.sourceId] || r.sourceId),
    `<select class="lineage-edit-type" data-id="${escapeHtml(r.id)}">${HYPOTHESIS_RELATION_TYPES.map((t) => `<option value="${escapeHtml(t)}" ${t === r.relationType ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}</select>`,
    escapeHtml(titleById[r.targetId] || r.targetId),
    `<input class="lineage-edit-note" data-id="${escapeHtml(r.id)}" value="${escapeHtml(r.note || "")}" placeholder="Note">`,
    `<button class="tiny-button lineage-save" data-id="${escapeHtml(r.id)}">Edit</button>`,
    `<button class="tiny-button lineage-delete" data-id="${escapeHtml(r.id)}">Delete</button>`
  ]);
  return `<table><thead><tr>${["Source", "Relation Type", "Target", "Note", "Edit", "Delete"].map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function lineageNetworkHtml(nodes, edges) {
  if (!nodes.length) return `<div class="empty">No hypothesis nodes.</div>`;
  const shownNodes = nodes.slice(0, 24);
  const shownEdges = edges.slice(0, 40);
  return `<div class="lineage-network"><div class="graph-title">Hypothesis Network / Nodes ${nodes.length} / Edges ${edges.length}</div><div class="lineage-nodes">${shownNodes.map((n) => `<div class="lineage-node"><strong>${escapeHtml(n.title)}</strong><span>${escapeHtml(n.status)} / Score ${escapeHtml(n.score)} / ${escapeHtml(n.confidencePercent)}%</span></div>`).join("")}</div><div class="graph-edges">${shownEdges.map((e) => `<div><strong>${escapeHtml(labelFromLineageNode(nodes, e.source))}</strong> -> <strong>${escapeHtml(labelFromLineageNode(nodes, e.target))}</strong> <span>${escapeHtml(e.relationType)} / ${escapeHtml(e.note || "-")}</span></div>`).join("")}</div></div>`;
}

function labelFromLineageNode(nodes, id) {
  return nodes.find((x) => x.id === id)?.title || id || "-";
}

function evidenceWeightEditorHtml(weights) {
  return `<div class="form-grid compact">${Object.entries(weights).map(([source, weight]) => `<label>${escapeHtml(source)}<input class="evidence-weight-input" data-source="${escapeHtml(source)}" type="number" min="0" max="2" step="0.05" value="${escapeHtml(weight)}"></label>`).join("")}</div><div class="memo-actions"><button id="saveEvidenceWeightsButton" class="ghost-button">Save Evidence Weights</button><button id="resetEvidenceWeightsButton" class="ghost-button">Reset Evidence Weights</button><span id="evidenceWeightStatus"></span></div>`;
}

function renderHypothesisCompare(snapshot) {
  const options = snapshot.enrichedHypotheses.map((h) => `<option value="${escapeHtml(h.id)}">${escapeHtml(h.title)}</option>`).join("");
  setHtml("compareHypothesisA", options);
  setHtml("compareHypothesisB", options);
  const renderSelectedCompare = () => {
    const a = snapshot.enrichedHypotheses.find((x) => x.id === byId("compareHypothesisA")?.value) || snapshot.enrichedHypotheses[0];
    const b = snapshot.enrichedHypotheses.find((x) => x.id === byId("compareHypothesisB")?.value) || snapshot.enrichedHypotheses[1];
    const compare = hypothesisCompareFromPair(a, b);
    setHtml("hypothesisCompare", compare ? `${table(["Metric", compare.hypothesisA, compare.hypothesisB, "Winner"], compare.rows.map((x) => [x.label, x.a, x.b, x.winner]))}<h4>Result</h4>${table(["Item", "Value"], Object.entries(compare.result).map(([k, v]) => [k, v]))}` : `<div class="empty">At least two hypotheses are required.</div>`);
  };
  if (snapshot.enrichedHypotheses[1]) byId("compareHypothesisB").value = snapshot.enrichedHypotheses[1].id;
  byId("compareHypothesisA")?.addEventListener("change", renderSelectedCompare);
  byId("compareHypothesisB")?.addEventListener("change", renderSelectedCompare);
  renderSelectedCompare();
}

function hypothesisCompareFromPair(a, b) {
  if (!a || !b) return null;
  const compare = (label, av, bv, bigger = true) => ({ label, a: av, b: bv, winner: av === bv ? "Tie" : (bigger ? av > bv : av < bv) ? a.title : b.title });
  return {
    hypothesisA: a.title,
    hypothesisB: b.title,
    rows: [
      compare("Status", a.status, b.status),
      compare("Score 2.0", a.score2, b.score2),
      compare("Confidence Percent", a.confidencePercent, b.confidencePercent),
      compare("Evidence Count", a.evidence.length, b.evidence.length),
      compare("Weighted Evidence", a.weightedEvidenceScore, b.weightedEvidenceScore),
      compare("Source Diversity", a.sourceDiversity, b.sourceDiversity),
      compare("Contradiction Count", a.contradictions.length, b.contradictions.length, false),
      compare("Open Question Count", a.openQuestions.length, b.openQuestions.length, false),
      compare("Validation Readiness", a.validationReadiness, b.validationReadiness),
      compare("History Count", a.historyCount, b.historyCount)
    ],
    result: {
      strongerEvidence: a.weightedEvidenceScore >= b.weightedEvidenceScore ? a.title : b.title,
      higherConfidence: a.confidencePercent >= b.confidencePercent ? a.title : b.title,
      betterValidationReadiness: a.validationReadiness >= b.validationReadiness ? a.title : b.title,
      moreContradictions: a.contradictions.length >= b.contradictions.length ? a.title : b.title,
      moreOpenQuestions: a.openQuestions.length >= b.openQuestions.length ? a.title : b.title,
      recommendedResearchPriority: (a.score2 - a.validationReadiness) >= (b.score2 - b.validationReadiness) ? `${a.title} / Research candidate with readiness gap.` : `${b.title} / Research candidate with readiness gap.`
    }
  };
}

function bindLineageEvents() {
  byId("addLineageRelationButton")?.addEventListener("click", () => {
    HypothesisLineageStore.addRelation({
      sourceId: byId("lineageSource")?.value,
      targetId: byId("lineageTarget")?.value,
      relationType: byId("lineageType")?.value,
      note: byId("lineageNote")?.value || ""
    });
    setText("lineageRelationStatus", "Relation saved.");
    invalidateLineageCache();
    renderLineage();
    renderDashboard();
  });
  document.querySelectorAll(".lineage-save").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.id;
    const type = Array.from(document.querySelectorAll(".lineage-edit-type")).find((x) => x.dataset.id === id)?.value;
    const note = Array.from(document.querySelectorAll(".lineage-edit-note")).find((x) => x.dataset.id === id)?.value;
    HypothesisLineageStore.updateRelation(id, { relationType: type, note });
    invalidateLineageCache();
    renderLineage();
  }));
  document.querySelectorAll(".lineage-delete").forEach((button) => button.addEventListener("click", () => {
    if (!confirm("Delete this relation?")) return;
    HypothesisLineageStore.deleteRelation(button.dataset.id);
    invalidateLineageCache();
    renderLineage();
    renderDashboard();
  }));
  byId("saveEvidenceWeightsButton")?.addEventListener("click", () => {
    const weights = {};
    document.querySelectorAll(".evidence-weight-input").forEach((input) => { weights[input.dataset.source] = input.value; });
    EvidenceWeightStore.save(weights);
    setText("evidenceWeightStatus", "Weights saved.");
    invalidateLineageCache();
    renderLineage();
    renderHypothesis();
    renderDashboard();
  });
  byId("resetEvidenceWeightsButton")?.addEventListener("click", () => {
    EvidenceWeightStore.reset();
    setText("evidenceWeightStatus", "Weights reset.");
    invalidateLineageCache();
    renderLineage();
    renderHypothesis();
    renderDashboard();
  });
}

function invalidateLineageCache() {
  if (engine._snapshotCache) delete engine._snapshotCache.hypothesisLineage;
  if (engine._snapshotCache) delete engine._snapshotCache.knowledgeGraph;
  if (engine._snapshotCache) delete engine._snapshotCache.researchStrategy;
  engine.results.hypothesisLineage = null;
  engine.results.knowledgeGraph = null;
  engine.results.workspace = null;
  engine.results.researchStrategy = null;
}

function renderStrategy() {
  if (!byId("strategyOverview")) return;
  if (typeof ResearchStrategyEngine === "undefined") {
    setHtml("strategyOverview", `<span class="pill">Research Strategy</span><h3>Research Strategy module is not loaded.</h3>`);
    return;
  }
  const snapshot = new ResearchStrategyEngine({ analysisEngine: engine, researchManager }).snapshot();
  engine.results.researchStrategy = snapshot;
  const s = snapshot.strategySummary;
  setHtml("strategyOverview", `<span class="pill">Research Strategy Engine</span><h3>${escapeHtml(s.currentBestResearch || "No Research Strategy yet.")}</h3><p>${escapeHtml(s.summary)}</p><p>This is Research priority, not trading priority. It never rewrites EA, CSV, or trading conditions.</p>`);
  setHtml("strategyMetrics", metrics([
    ["Candidates", snapshot.researchStrategy.length],
    ["Highest ROI", s.highestROI],
    ["Highest Impact", s.highestImpact],
    ["Lowest Cost", s.lowestCost],
    ["Current Blocker", s.currentBlocker],
    ["Coverage", s.coverage],
    ["Blockers", s.blockerCount],
    ["Roadmap Progress", `${s.roadmapProgress}%`]
  ]));
  setHtml("strategyPriorityMatrix", table(["Priority", "Count", "Top Items"], snapshot.priorityMatrix.map((x) => [x.priority, x.count, x.items.slice(0, 3).map((i) => i.title).join(" / ") || "-"])));
  setHtml("strategyRoiTable", table(["Research", "Priority", "ROI", "Value", "Cost", "Risk", "Target", "Reason"], snapshot.researchROI.slice(0, 20).map((x) => [x.title, x.priority, x.researchROI, x.expectedResearchValue, x.researchCost, x.researchRisk, x.target, x.reason])));
  setHtml("strategyCoverage", table(["Area", "Base", "Researched", "Coverage", "Status"], snapshot.coverage.map((x) => [x.area, x.baseCount, x.researchedCount, `${x.coveragePercent}%`, x.status])));
  setHtml("strategyBlockers", snapshot.blockers.length ? table(["Blocker", "Count"], snapshot.blockers.map((x) => [x.name, x.count])) : `<div class="empty">No blockers detected.</div>`);
  setHtml("strategyQuickWin", strategyCardList(snapshot.quickWin));
  setHtml("strategyLongProject", strategyCardList(snapshot.longProject));
  setHtml("strategyRoadmap", table(["Step", "Research", "Priority", "ROI", "Action", "Blocker"], snapshot.roadmap.map((x) => [x.step, x.title, x.priority, x.roi, x.action, x.blocker])));
  setHtml("strategyDuplicate", snapshot.duplicateResearch.length ? table(["Research A", "Research B", "Similarity", "Note"], snapshot.duplicateResearch.map((x) => [x.source, x.target, `${x.similarity}%`, x.note])) : `<div class="empty">No duplicate Research detected.</div>`);
  setHtml("strategyMissing", snapshot.missingResearch.length ? table(["Area", "Coverage", "Status", "Reason"], snapshot.missingResearch.map((x) => [x.area, `${x.coveragePercent}%`, x.status, x.reason])) : `<div class="empty">No missing Research area detected.</div>`);
  setHtml("strategyDependencies", table(["Research", "Required Before", "Blockers", "Relation"], snapshot.dependencyAnalyzer.slice(0, 30).map((x) => [x.research, x.requiredBefore, x.blockers, x.relation])));
  setHtml("strategyHeatmap", researchHeatmapHtml(snapshot.researchHeatMap));
}

function strategyCardList(items) {
  if (!items?.length) return `<div class="empty">No items.</div>`;
  return `<div class="workspace-list">${items.slice(0, 10).map((x, index) => `<div class="workspace-item"><div class="workspace-rank">${index + 1}</div><div><h4>${escapeHtml(x.title)}</h4><p><span class="tag">${escapeHtml(x.priority)}</span> <span class="tag">ROI ${escapeHtml(x.researchROI)}</span> <span class="tag">${escapeHtml(x.researchCost)}</span> <span class="tag">Risk ${escapeHtml(x.researchRisk)}</span></p><p>${escapeHtml(x.reason)}</p></div></div>`).join("")}</div>`;
}

function researchHeatmapHtml(rows) {
  if (!rows?.length) return `<div class="empty">No heatmap data.</div>`;
  const max = Math.max(1, ...rows.map((x) => x.coveragePercent || 0));
  return `<table class="heatmap"><thead><tr><th>Area</th><th>Coverage</th><th>State</th></tr></thead><tbody>${rows.map((x) => {
    const alpha = Math.max(.12, (x.coveragePercent || 0) / max * .75);
    return `<tr><td>${escapeHtml(x.area)}</td><td style="background: rgba(57, 216, 255, ${alpha})">${escapeHtml(`${x.coveragePercent}%`)}</td><td>${escapeHtml(x.state)}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function renderSearch() {
  if (!byId("globalSearchResults")) return;
  const input = byId("globalSearchInput");
  const stored = localStorage.getItem(SEARCH_QUERY_KEY) || "";
  if (input && input.value !== stored) input.value = stored;
  const query = (input?.value || stored || "").trim();
  const index = buildSearchIndex();
  if (!query) {
    setText("globalSearchStatus", `${index.length} searchable items`);
    setHtml("globalSearchResults", `<div class="empty">Type a keyword to search Research, Hypothesis, Knowledge Graph, TopNG, and Engine data.</div>`);
    return;
  }
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = index.map((item) => {
    const haystack = `${item.type} ${item.title} ${item.detail} ${item.tags}`.toLowerCase();
    const score = tokens.reduce((acc, token) => acc + (haystack.includes(token) ? 1 : 0), 0);
    return { ...item, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.type.localeCompare(b.type)).slice(0, 50);
  setText("globalSearchStatus", `${rows.length} results / ${index.length} searchable items`);
  setHtml("globalSearchResults", rows.length ? table(["Type", "Title", "Detail", "Score"], rows.map((x) => [x.type, x.title, x.detail, x.score])) : `<div class="empty">No result for "${escapeHtml(query)}".</div>`);
}

function buildSearchIndex() {
  const rows = [];
  const add = (type, title, detail = "", tags = "") => rows.push({ type, title: String(title || "-"), detail: String(detail || "-"), tags: String(tags || "") });
  engine.results.engineActivity.forEach((x) => add("Engine", x.engine, `Health ${x.health} Checks ${x.checks} TimeOK ${x.timeOk} Full ${x.full} Entries ${x.entries}`, (x.topNg || []).map((n) => n.name).join(" ")));
  engine.results.tradeByEngine.forEach((x) => add("Engine Trade", x.name, `Trades ${x.trades} WinRate ${round(x.winRate)} Pips ${round(x.pips)}`, "trade winrate profit"));
  (engine.results.nearMiss.ngReasons || []).forEach((x) => add("TopNG", x.name, `Count ${x.count}`, "nearmiss bottleneck"));
  (engine.results.intelligence || []).forEach((x) => add("Research", x.title, `${x.target} ${x.reason}`, `${x.stars} ${x.score}`));
  (engine.results.researchStrategy?.researchStrategy || []).forEach((x) => add("Strategy", x.title, `${x.priority} ROI ${x.researchROI} ${x.reason}`, `${x.engine} ${x.condition} ${x.session}`));
  (researchManager?.items || []).forEach((x) => add("Research Manager", x.title, `${x.status} ${x.priority} ${x.hypothesis || ""}`, `${x.engine || ""} ${x.condition || ""} ${(x.tags || []).join(" ")}`));
  (engine.results.hypothesis?.hypotheses || []).forEach((x) => add("Hypothesis", x.title, `${x.status} ${x.confidence} ${x.hypothesis}`, `${x.engine || ""} ${x.condition || ""}`));
  (engine.results.hypothesisLineage?.enrichedHypotheses || []).forEach((x) => add("Lineage", x.title, `Score2 ${x.score2} Confidence ${x.confidencePercent}% Family ${x.family}`, `${x.engine || ""} ${x.condition || ""}`));
  (engine.results.knowledgeGraph?.nodes || []).forEach((x) => add("KnowledgeGraph", x.label, `${x.type} Degree ${x.degree || 0}`, x.id));
  (engine.results.engineDna?.profiles || []).forEach((x) => add("Engine DNA", x.engine, `${x.personality} ${x.cluster} ${x.stability} Score ${x.researchScore}`, `${(x.strength || []).join(" ")} ${(x.weakness || []).join(" ")}`));
  return rows;
}

function hypothesisCardHtml(h) {
  const lineage = engine.results.hypothesisLineage?.enrichedHypotheses?.find((x) => x.id === h.id);
  const warning = lineage?.superseded ? `<p class="warning-list">Superseded Warning: This hypothesis has a Supersedes relation.</p>` : lineage?.possibleDuplicate ? `<p class="warning-list">Possible Duplicate Warning: Similar hypothesis detected.</p>` : "";
  return `<div class="workspace-item"><div class="workspace-rank">${escapeHtml(lineage?.score2 ?? h.score)}</div><div><h4>${escapeHtml(h.title)}</h4><p><span class="tag">${escapeHtml(lineage?.confidence2 || h.confidence)}</span> <span class="tag">${escapeHtml(h.source)}</span> <span class="tag">${escapeHtml(h.engine || h.condition || "-")}</span> <span class="tag">Readiness ${escapeHtml(lineage?.validationReadiness ?? "-")}%</span></p>${warning}<p><strong>Hypothesis:</strong> ${escapeHtml(h.hypothesis)}</p><p><strong>Reason:</strong> ${escapeHtml(h.reason)}</p><div class="form-grid compact"><label>Status<select class="hypothesis-status" data-id="${escapeHtml(h.id)}">${HYPOTHESIS_STATUSES.map((status) => `<option value="${escapeHtml(status)}" ${status === h.status ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}</select></label><label>Confidence<input type="text" value="${escapeHtml(lineage ? `${lineage.confidence2} / ${lineage.confidencePercent}%` : h.confidence)}" readonly></label><label>Score 2.0<input type="text" value="${escapeHtml(lineage ? `${lineage.score2}/100` : `${h.score}/100`)}" readonly></label><label>Evidence<input type="text" value="${h.evidence.length}" readonly></label></div>${lineage ? scoreBreakdownHtml(lineage.scoreBreakdown) : ""}<h5>Evidence</h5>${table(["Source", "Title", "Value", "Polarity", "Strength", "Weighted"], (lineage?.weightedEvidence || h.evidence).slice(0, 8).map((e) => [e.source, e.title, e.value, e.polarity, e.strength || "-", e.weightedScore ?? "-"]))}<h5>Family / Relations</h5><p>${escapeHtml(lineage ? `${lineage.family} / Parent ${lineage.parents.length} / Child ${lineage.children.length} / Supports ${lineage.supports.length} / Contradicts ${lineage.contradicts.length} / History ${lineage.historyCount}` : "-")}</p><h5>Validation Checklist</h5>${lineage ? checklistHtml(lineage.validationChecklist) : ""}<h5>Open Questions</h5><p>${escapeHtml(h.openQuestions.join(" / ") || "-")}</p></div></div>`;
}

function scoreBreakdownHtml(b) {
  if (!b) return "";
  return `<div class="score-breakdown">${table(["Score Item", "Value"], [
    ["Base Evidence", b.baseEvidence],
    ["Quality Bonus", b.qualityBonus],
    ["Cross CSV Bonus", b.crossCsvBonus],
    ["Stability Bonus", b.stabilityBonus],
    ["Timeline Bonus", b.timelineBonus],
    ["Validation Bonus", b.validationBonus],
    ["Contradiction Penalty", b.contradictionPenalty],
    ["Open Question Penalty", b.openQuestionPenalty],
    ["Lineage Penalty", b.lineagePenalty],
    ["Final Score", b.finalScore]
  ])}</div>`;
}

function checklistHtml(items) {
  return `<div class="checklist">${(items || []).map((x) => `<span class="${x.done ? "ok" : "ng"}">${x.done ? "OK" : "NG"} ${escapeHtml(x.name)}</span>`).join("")}</div>`;
}

function workspaceItemHtml(item, rank, compact = false) {
  return `<div class="suggestion"><div class="stars">${rank}</div><div><h4>${escapeHtml(item.title)}</h4><p><span class="tag">${escapeHtml(item.priority)}</span> <span class="tag">${escapeHtml(item.researchScore)}</span> <span class="tag">${escapeHtml(item.confidence)}</span> <span class="tag">${escapeHtml(item.source || item.type)}</span></p><p>${escapeHtml(item.reason)}</p>${compact ? `<p>${escapeHtml(item.expectedImpact)}</p>` : ""}<div class="mini-actions">${workspaceActionsHtml(item)}</div></div></div>`;
}

function workspaceActionsHtml(item, state = {}) {
  const id = escapeHtml(item.id || item.title || item.label);
  const label = escapeHtml(item.title || item.label || item.id);
  const type = escapeHtml(item.type || "Workspace");
  return `<button class="tiny-button workspace-bookmark" data-id="${id}" data-label="${label}" data-type="${type}">${state.bookmarked ? "Remove Bookmark" : "Bookmark"}</button> <button class="tiny-button workspace-pin" data-id="${id}" data-label="${label}" data-type="${type}">${state.pinned ? "Unpin" : "Pin"}</button>`;
}

function workspaceSavedItemHtml(item, rank, mode) {
  const removeState = mode === "bookmark" ? { bookmarked: true } : { pinned: true };
  return `<div class="workspace-item"><div class="workspace-rank">${rank}</div><div><h4>${escapeHtml(item.label || item.title || item.id)}</h4><p><span class="tag">${escapeHtml(item.type || "Workspace")}</span> <span class="tag">${escapeHtml(item.status || "-")}</span> <span class="tag">${escapeHtml(item.priority || "-")}</span></p><p>Created: ${escapeHtml(formatDate(item.createdAt))}</p><div class="mini-actions">${workspaceActionsHtml(item, removeState)}</div></div></div>`;
}

function graphPreviewHtml(nodes, edges, title) {
  if (!nodes?.length) return `<div class="empty">No graph data for ${escapeHtml(title)}.</div>`;
  const shownNodes = nodes.slice(0, 18);
  const shownEdges = edges.slice(0, 30);
  return `<div class="graph-panel"><div class="graph-title">${escapeHtml(title)} / Nodes ${nodes.length} / Edges ${edges.length}</div><div class="graph-nodes">${shownNodes.map((node) => `<span class="graph-node type-${escapeHtml(node.type)}">${escapeHtml(node.label)}<small>${escapeHtml(node.type)}</small></span>`).join("")}</div><div class="graph-edges">${shownEdges.map((edge) => `<div><strong>${escapeHtml(labelFromNodeId(edge.source))}</strong> -> <strong>${escapeHtml(labelFromNodeId(edge.target))}</strong> <span>${escapeHtml(edge.label || edge.type)} / ${escapeHtml(edge.weight)}</span></div>`).join("")}</div></div>`;
}

function clusterTreeHtml(clusters) {
  if (!clusters?.length) return `<div class="empty">No cluster data.</div>`;
  return `<div class="cluster-tree">${clusters.map((cluster) => `<div class="cluster-branch"><h4>${escapeHtml(cluster.cluster)}</h4><p>${escapeHtml(`Count ${cluster.count} / Avg DNA ${cluster.averageDnaScore || "-"}`)}</p><div>${(cluster.engines || []).map((engineName) => `<span class="tag">${escapeHtml(engineName)}</span>`).join(" ")}</div></div>`).join("")}</div>`;
}

function flowHtml(flow) {
  if (!flow?.length) return `<div class="empty">No flow data.</div>`;
  return `<div class="flow-list">${flow.map((x) => `<div class="flow-row"><span>${escapeHtml(x.from)}</span><strong>-></strong><span>${escapeHtml(x.to)}</span><em>${escapeHtml(x.value)}</em><small>${escapeHtml(x.label)}</small></div>`).join("")}</div>`;
}

function labelFromNodeId(id) {
  return String(id || "").replace(/^[^:]+:/, "").replace(/_/g, " ") || "-";
}

function labelFromResearchId(nodes, id) {
  return nodes.find((x) => x.id === id)?.label || id || "-";
}

function renderPerformancePanel() {
  const p = PerformanceUtil.analysisStatistics(engine);
  setHtml("performancePanel", `<h3>Performance Summary</h3>${metrics([
    ["Analysis Time", `${p.analysisTime}ms`],
    ["Cross CSV Time", `${p.crossTime}ms`],
    ["Brain Time", `${p.brainTime}ms`],
    ["Data Quality Time", `${p.qualityTime}ms`],
    ["Memory", p.memory],
    ["Analysis Version", p.analysisVersion],
    ["Cache Hit Rate", `${p.cacheHitRate}%`],
    ["Cache", p.cacheStatus]
  ])}`);
}

function renderWarnings() {
  const warnings = [];
  engine.results.validation.forEach((v) => (v.warnings || []).forEach((w) => warnings.push(`${v.fileName}: ${w}`)));
  if (engine.results.comparison?.warning) warnings.push(engine.results.comparison.warning);
  setHtml("analysisWarnings", warnings.length ? `<h3>Analysis Warnings</h3><div class="warning-list">${warnings.map((w) => `<div>${escapeHtml(w)}</div>`).join("")}</div>` : `<h3>Analysis Warnings</h3><p class="empty">No warnings.</p>`);
}

function renderLabReport() {
  setText("researchReportText", engine.results.report?.text || "Load CSV files to generate report.");
  const c = engine.results.comparison;
  setHtml("researchComparison", c ? table(["Metric", "Diff"], [["Trade", signed(c.trades)], ["NearMiss", signed(c.nearMiss)], ["WinRate", `${signed(round(c.winRate))}%`], ["PF", signed(round(c.profitFactor))], ["Research Score", `${stars(c.previousTopResearch)} -> ${stars(c.currentTopResearch)}`], ["Warning", c.warning || "-"]]) : `<div class="empty">No previous Analyzer run yet.</div>`);
  setHtml("researchProgressDetails", progressHtml(true));
}

function renderTrade() {
  drawBar("tradeEngineChart", engine.results.tradeByEngine.map((x) => x.name), engine.results.tradeByEngine.map((x) => round(x.winRate)), "WinRate %");
  const weekdays = groupTradeByWeekday(engine.results.trades);
  drawBar("weekdayChart", weekdays.map((x) => x.name), weekdays.map((x) => round(x.winRate)), "Weekday WinRate %");
  setHtml("tradeTable", table(["Engine", "Trades", "WinRate", "Pips", "Avg", "Avg Hold", "WinStreak", "LossStreak"], engine.results.tradeByEngine.map((x) => [x.name, x.trades, pct(x.winRate), round(x.pips), round(x.averagePips), `${round(x.averageHolding)} min`, x.streakWin, x.streakLoss])));
  setHtml("holdingTable", table(["Holding", "Trades", "WinRate", "AvgPips", "Status"], engine.results.holding.map((x) => [x.bucket, x.trades, pct(x.winRate), round(x.averagePips), x.status])));
  setHtml("spreadTable", table(["Spread", "Trades", "NearMiss", "WinRate", "AvgPips", "AvgSpread"], engine.results.spread.map((x) => [x.bucket, x.trades, x.nearMiss, pct(x.winRate), round(x.averagePips), round(x.averageSpread)])));
}

function renderEngine() {
  renderEngineFilter();
  const selected = engine.results.selectedEngine || "All Engines";
  const list = selected === "All Engines" ? engine.results.engineActivity : engine.results.engineActivity.filter((e) => e.engine === selected);
  setHtml("engineCards", list.map((e) => `
    <div class="engine-card">
      <h4>${escapeHtml(e.engine)}</h4>
      <span class="health ${healthClass(e.health)}">${escapeHtml(e.health)}</span>
      <div class="kv">
        <span>Research Score</span><strong>${e.researchScore}</strong>
        <span>Confidence</span><strong>${escapeHtml(e.confidence)}</strong>
        <span>Trades</span><strong>${fmt(e.trade?.trades || 0)}</strong>
        <span>NearMiss</span><strong>${fmt(engine.results.nearMiss.byEngine?.find((n) => normalizeName(n.name) === normalizeName(e.engine))?.count || 0)}</strong>
        <span>TimeOK</span><strong>${fmt(e.timeOk)}</strong>
        <span>EntryRate</span><strong>${pct(e.entryRate)}</strong>
        <span>TopNG</span><strong>${escapeHtml(e.topNg.map((x) => x.name).join(" / ") || "-")}</strong>
      </div>
      <div class="score-breakdown">${table(["Score Detail", "Point"], e.breakdown.map((x) => [x[0], x[1]]))}</div>
    </div>
  `).join("") || `<div class="empty">Load EngineActivity CSV.</div>`);
  setHtml("topNgTable", topNgTable());
  drawRadar("engineRadarChart", list[0] || engine.results.engineActivity[0]);
}

function renderEngineFilter() {
  const select = byId("engineFilter");
  if (!select) return;
  const options = ["All Engines", ...engine.results.engineActivity.map((e) => e.engine)];
  const current = engine.results.selectedEngine || "All Engines";
  select.innerHTML = options.map((x) => `<option value="${escapeHtml(x)}"${x === current ? " selected" : ""}>${escapeHtml(x)}</option>`).join("");
}

function renderCondition() {
  setHtml("conditionTable", table(["Condition", "Trade", "NearMiss / TopNG", "Research Score", "Note"], engine.results.condition.map((x) => [x.condition, x.trades, x.nearMiss, x.researchScore, x.note])));
}

function renderHeatmaps() {
  const selected = engine.results.selectedEngine || "All Engines";
  const engineRows = selected === "All Engines" ? engine.results.heatmaps.engineRows : engine.results.heatmaps.engineRows.filter((r) => r.engine === selected);
  setHtml("topNgHeatmap", heatmapTable(["Engine", ...engine.results.heatmaps.ngLabels], engineRows.map((r) => [r.engine, ...engine.results.heatmaps.ngLabels.map((l) => r[l] || 0)])));
  setHtml("sessionHeatmap", heatmapTable(["Session", "Trade", "NearMiss", "WinRate", "ResearchScore"], engine.results.heatmaps.sessionRows.map((r) => [r.session, r.Trade, r.NearMiss, r.WinRate, r.ResearchScore])));
}

function renderNearMiss() {
  const n = engine.results.nearMiss;
  drawPie("nearMissChart", ["1 condition left", "2 conditions left", "3+ conditions"], [n.buckets?.one || 0, n.buckets?.two || 0, n.buckets?.threePlus || 0], "NearMiss");
  setHtml("closestEngine", n.closestEngine ? `<div class="metric"><span>Closest Engine</span><strong>${escapeHtml(n.closestEngine.engine)}</strong><p>${fmt(n.closestEngine.count)} records</p></div>` : `<div class="empty">Load NearMissHistory CSV.</div>`);
  setHtml("nearMissComboTable", table(["NG Combo", "Count"], (n.combos || []).slice(0, 15).map((x) => [x.name, x.count])));
  setHtml("nearMissTable", table(["NG Reason", "Count"], (n.ngReasons || []).slice(0, 15).map((x) => [x.name, x.count])));
  setHtml("nearMissDeepTable", table(["Engine", "Session", "Total", "1 Left", "2 Left", "3+ Left", "TopNG"], (engine.results.nearMissDeep.engineSession || []).slice(0, 20).map((x) => [x.engine, x.session, x.total, x.one, x.two, x.threePlus, x.topNg.map((n) => `${n.name}:${n.count}`).join(" / ")])));
  const singles = engine.results.nearMissDeep.singleBottlenecks || [];
  const totalSingle = singles.reduce((acc, x) => acc + x.count, 0) || 1;
  setHtml("singleBottleneckTable", table(["Engine", "Session", "Remaining NG", "Count", "Share"], singles.slice(0, 20).map((x) => [x.engine, x.session, x.reason, x.count, pct(ratio(x.count, totalSingle))])));
}

function renderSession() {
  const s = engine.results.session;
  drawBar("sessionChart", s.map((x) => x.session), s.map((x) => x.nearMiss), "NearMiss");
  drawBar("sessionConditionChart", s.map((x) => x.session), s.map((x) => round(x.winRate)), "WinRate %");
  setHtml("sessionTable", table(["Session", "Trades", "NearMiss", "WinRate", "AvgPips", "TopNG", "Research"], s.map((x) => [x.session, x.trades, x.nearMiss, pct(x.winRate), round(x.averagePips), x.topNg.map((n) => n.name).join(" / "), x.researchScore])));
  setHtml("sessionConditionMatrix", heatmapTable(["Session", "RSI", "ATR", "BB", "Volume", "Spread", "Time"], engine.results.sessionConditionMatrix.map((x) => [x.session, x.RSI, x.ATR, x.BB, x.Volume, x.Spread, x.Time])));
}

function renderSignal() {
  const s = engine.results.signal;
  drawBar("signalChart", (s.table || []).map((x) => x.engine), (s.table || []).map((x) => x.signals), "Signals");
  setHtml("signalSummary", metrics([["Signals", fmt(s.totalSignals || 0)], ["Engines", fmt((s.table || []).length)], ["Entry Success", pct(avgSignalSuccess(s.table || []))]]));
  setHtml("signalTable", table(["Engine", "Signals", "Entries", "SuccessRate"], (s.table || []).map((x) => [x.engine, x.signals, x.entries, pct(x.successRate)])));
}

function renderManager() {
  setHtml("csvManagerTable", table(["CSV", "Exists", "Rows", "Columns", "Detected Type", "Method", "Schema", "Original Columns", "Normalized Columns", "Alias Applied", "Validation", "Warnings"], engine.results.csvManager.map((x) => [x.label, x.exists ? "Yes" : "No", x.rows, x.columns, x.detectedType || "-", x.detectionMethod || "-", x.schemaVersion || x.version, x.originalColumns || "-", x.normalizedColumns || "-", x.aliasesApplied || "-", x.validation, x.warnings.join(" / ") || "-"])));
  setHtml("csvSpecTable", table(["CSV", "Purpose", "Screen"], CSV_TYPES.map((x) => [x.label, x.description, x.usage])));
}

function renderDataQuality() {
  if (!byId("qualityOverview")) return;
  const q = new DataQualityEngine(engine).snapshot();
  engine.results.dataQuality = q;
  setHtml("qualityOverview", `<span class="pill">Research Data Quality</span><h3>${q.qualityScore}/100 ${q.qualityStars} / ${escapeHtml(q.dataQuality)}</h3><p>Confidence: <strong>${escapeHtml(q.confidence)}</strong> / Research Reliability: <strong>${q.reliability.percent}%</strong></p><p>${escapeHtml(q.reliability.reasons.join(" "))}</p>`);
  setHtml("qualityMetrics", metrics([
    ["Overall Score", `${q.qualityScore}/100`],
    ["Confidence", q.confidence],
    ["Data Quality", q.dataQuality],
    ["Reliability", `${q.reliability.percent}%`],
    ["Warnings", q.warnings.length],
    ["Recommendations", q.recommendations.length]
  ]));
  setHtml("qualityCsvHealth", table(["CSV", "Health", "Rows", "Status"], q.health.map((x) => [x.csv, x.stars, x.rows, x.status])));
  setHtml("qualityConfidence", table(["Dimension", "Score", "Stars", "Label"], Object.entries(q.confidenceScore).filter(([k]) => k !== "overall" && k !== "average").map(([k, v]) => [k, v.score, v.stars, v.label]).concat([["Overall", q.confidenceScore.average, q.confidence, q.confidence]])));
  setHtml("qualityCoverage", table(["CSV", "Rows", "Coverage", "Status", "Points"], q.coverage.map((x) => [x.label, x.rows, x.coverage, x.status, `${x.earned}/${x.points}`])));
  setHtml("qualityMissing", table(["CSV", "Missing Columns", "Missing Values", "Missing Engine", "Missing Session", "Missing Date", "Missing Time", "Missing Pips"], q.missing.map((x) => [x.csv, x.missingColumns.join(" / ") || "-", x.missingValues, x.missingEngine, x.missingSession, x.missingDate, x.missingTime, x.missingPips])));
  setHtml("qualityDuplicates", table(["CSV", "Rows", "IDs", "Trade", "Timestamp", "Signal"], q.duplicates.map((x) => [x.csv, x.duplicateRows, x.duplicateIds, x.duplicateTrade, x.duplicateTimestamp, x.duplicateSignal])));
  setHtml("qualitySessionBalance", table(["Session", "Count", "Share", "Status"], q.sessionBalance.map((x) => [x.name, x.count, `${round(x.share)}%`, x.status])));
  setHtml("qualityEngineBalance", table(["Engine", "Trades", "Signals", "NearMiss", "Status"], q.engineBalance.map((x) => [x.engine, x.trades, x.signals, x.nearMiss, x.status])));
  setHtml("qualityTimeFreshness", table(["Item", "Value"], [
    ["Start Date", q.timeCoverage.startDate || "-"],
    ["End Date", q.timeCoverage.endDate || "-"],
    ["Total Days", q.timeCoverage.totalDays],
    ["Missing Days", q.timeCoverage.missingDays],
    ["Continuous Days", q.timeCoverage.continuousDays],
    ["Newest CSV", q.freshness.newestCsv],
    ["Oldest CSV", q.freshness.oldestCsv],
    ["CSV Age Days", q.freshness.csvAgeDays ?? "-"],
    ["Freshness", q.freshness.status]
  ]));
  setHtml("qualityWarnings", q.warnings.length ? `<div class="warning-list">${q.warnings.map((w) => `<div>${escapeHtml(w)}</div>`).join("")}</div>` : `<div class="empty">No major data quality warnings.</div>`);
  setHtml("qualityRecommendations", `<div class="warning-list">${q.recommendations.map((r) => `<div>${escapeHtml(r)}</div>`).join("")}</div>`);
}

function renderCrossCsv() {
  if (!byId("crossOverview")) return;
  const cross = new CrossCsvEngine(engine).snapshot();
  engine.results.crossCsv = cross;
  setHtml("crossOverview", `<span class="pill">Cross CSV Intelligence</span><h3>${cross.correlationScore}/100 / ${escapeHtml(cross.crossSummary.status)}</h3><pre>${escapeHtml(cross.insight)}</pre>`);
  const perf = PerformanceUtil.analysisStatistics(engine);
  setHtml("crossPerformance", metrics([
    ["Cross Analysis Time", `${perf.crossTime}ms`],
    ["Correlation Count", cross.engineCorrelation.length + cross.sessionCorrelation.length],
    ["Cache Status", perf.crossCache],
    ["Analysis Version", perf.analysisVersion]
  ]));
  setHtml("crossMetrics", metrics([
    ["Loaded CSV", `${cross.crossSummary.loadedCsvCount}/${cross.crossSummary.expectedCsvCount}`],
    ["Coverage", `${cross.crossSummary.coverage}%`],
    ["Correlation", `${cross.correlationScore}/100`],
    ["Engines", cross.engineCorrelation.length],
    ["Sessions", cross.sessionCorrelation.length],
    ["Warnings", cross.warnings.length],
    ["Recommendations", cross.recommendations.length],
    ["High Opportunity", cross.opportunityMatrix.filter((x) => x.level === "High").length]
  ]));
  setHtml("crossEngineCorrelation", table(["Engine", "Trades", "WinRate", "Signals", "Signal Success", "NearMiss", "Checks", "TimeOK", "Full", "Score", "Confidence", "Opportunity"], cross.engineCorrelation.slice(0, 20).map((x) => [x.engine, x.trades, pct(x.winRate), x.signals, `${x.signalSuccess}%`, x.nearMiss, x.checks, x.timeOk, x.full, `${x.correlationScore}/100`, x.confidence, x.opportunity])));
  setHtml("crossSessionCorrelation", table(["Session", "Trades", "NearMiss", "Signals", "WinRate", "AvgPips", "Research", "Opportunity"], cross.sessionCorrelation.map((x) => [x.session, x.trades, x.nearMiss, x.signals, `${round(x.winRate)}%`, round(x.averagePips), x.researchScore, x.sessionOpportunity])));
  const s = cross.signalCorrelation;
  setHtml("crossSignalCorrelation", `${metrics([["Signals", s.totalSignals], ["Entries", s.totalEntries], ["Trades", s.totalTrades], ["Signal->Entry", `${s.signalToEntry}%`], ["Entry->Trade", `${s.entryToTrade}%`], ["Signal->Trade", `${s.signalToTrade}%`], ["WinRate", `${s.winRate}%`]])}${table(["Engine", "Signals", "Entries", "Trades", "Success", "WinRate"], (s.table || []).slice(0, 12).map((x) => [x.engine, x.signals, x.entries, x.trades, `${x.signalSuccess}%`, pct(x.winRate)]))}`);
  setHtml("crossNearMissCorrelation", table(["Engine", "NearMiss", "Trades", "Signals", "Near/Trade", "Signal/Near", "Interpretation"], cross.nearMissCorrelation.slice(0, 20).map((x) => [x.engine, x.nearMiss, x.trades, x.signals, `${x.nearTradeRatio}%`, `${x.signalNearRatio}%`, x.interpretation])));
  setHtml("crossOpportunityMatrix", table(["Level", "Type", "Target", "Score", "Trades", "NearMiss", "Signals", "Reason"], cross.opportunityMatrix.slice(0, 20).map((x) => [x.level, x.type, x.target, `${x.score}/100`, x.trades, x.nearMiss, x.signals, x.reason])));
  setHtml("crossRecommendations", cross.recommendations.length ? cross.recommendations.map((x) => `<div class="suggestion"><div class="stars">${x.stars}</div><div><h4>${escapeHtml(x.title)}</h4><p><span class="tag">${escapeHtml(x.target)}</span></p><p>${escapeHtml(x.reason)}</p></div></div>`).join("") : `<div class="empty">No Cross CSV recommendations yet.</div>`);
  setHtml("crossWarnings", cross.warnings.length ? `<div class="warning-list">${cross.warnings.map((x) => `<div>${escapeHtml(x)}</div>`).join("")}</div>` : `<div class="empty">No Cross CSV warnings.</div>`);
}

function renderIntelligence() {
  const top = engine.results.intelligence[0];
  setHtml("intelligenceHero", top ? `<span class="pill">Today's AI Recommendation</span><h3>${top.stars} ${escapeHtml(top.title)}</h3><p><strong>${escapeHtml(top.target)}</strong> - ${escapeHtml(top.reason)}</p>` : `<span class="pill">Research Intelligence</span><h3>Load CSV to generate Research candidates.</h3><p>This lab shows Research candidates, not trading-condition changes.</p>`);
  setHtml("researchSuggestions", engine.results.intelligence.map((s, i) => `<div class="suggestion"><div class="stars">${s.stars}</div><div><h4>${escapeHtml(s.title)}</h4><p><span class="tag">${escapeHtml(s.target)}</span></p><p>${escapeHtml(s.reason)}</p><button class="mini-button add-research" data-index="${i}">Add to Research Manager</button></div></div>`).join("") || `<div class="empty">No Research candidates yet.</div>`);
  document.querySelectorAll(".add-research").forEach((button) => {
    button.addEventListener("click", () => {
      const suggestion = engine.results.intelligence[Number(button.dataset.index)];
      if (!suggestion) return;
      const result = researchManager.createFromSuggestion(suggestion, analyzerSnapshot());
      if (!result.ok && result.duplicate) {
        const proceed = window.confirm(`Duplicate Research candidate detected:\n${result.duplicate.title}\n\nAdd anyway?`);
        if (!proceed) return;
        researchManager.createFromSuggestion(suggestion, analyzerSnapshot(), { force: true });
      }
      ResearchWorkspaceStore.addActivity("Research Added", suggestion.title, suggestion.target || "Research Intelligence");
      invalidateBrainCache();
      renderResearchManager();
      renderResearchBoard();
      renderPortfolio();
      activateTab("researchManager");
    });
  });
  if (byId("chatgptPrompt")) byId("chatgptPrompt").value = engine.getPrompt();
}

function renderTimeline() {
  const trend = new TrendEngine({ analysisEngine: engine, researchManager }).snapshot();
  engine.results.trend = trend;
  setHtml("trendOverview", `<span class="pill">Research Timeline</span><h3>${escapeHtml(trend.forecast[0]?.status || "Need Data")} / ${trend.count} snapshots</h3><p>${escapeHtml(trend.trendSummary)}</p>`);
  setHtml("trendMetrics", metrics([
    ["Snapshots", trend.count],
    ["Daily Points", trend.longTermTrend.daily.length],
    ["Weekly Points", trend.longTermTrend.weekly.length],
    ["Monthly Points", trend.longTermTrend.monthly.length],
    ["Milestones Reached", trend.milestones.filter((x) => x.status === "Reached").length],
    ["Events", trend.events.length],
    ["Recommendations", trend.recommendations.length],
    ["Compare Items", trend.compare.length]
  ]));
  drawMultiLine("timelineChart", trend.trendChart.labels, trend.trendChart.series);
  setHtml("trendImprovement", table(["Metric", "Previous", "Current", "Delta", "Trend"], trend.improvement.map((x) => [x.metric, x.previous, x.current, x.display, x.trend])));
  setHtml("longTermTrend", table(["Period", "Research", "Quality", "Correlation", "Opportunity", "Confidence", "WinRate", "PF", "NearMiss", "Trade", "CSV"], trend.longTermTrend.daily.slice(-30).map((x) => [x.period, x.researchScore, x.qualityScore, x.correlationScore, x.opportunityScore, x.confidenceScore, `${x.winRate}%`, x.profitFactor, x.nearMiss, x.trades, x.csvCount])));
  setHtml("trendForecast", table(["Item", "Delta", "Status"], trend.forecast.map((x) => [x.label, x.delta, x.status])));
  setHtml("bestSnapshot", table(["Metric", "Date", "Value"], trend.bestSnapshot.map((x) => [x.metric, x.date, x.value])));
  setHtml("worstSnapshot", table(["Metric", "Date", "Value", "Reason"], trend.worstSnapshot.map((x) => [x.metric, x.date, x.value, x.reason])));
  setHtml("trendMilestones", table(["Milestone", "Value", "Target", "Progress", "Status"], trend.milestones.map((x) => [x.title, x.value, x.target, `${x.percent}%`, x.status])));
  setHtml("trendRecommendations", trend.recommendations.map((x) => `<div class="suggestion"><div class="stars">${escapeHtml(x.priority)}</div><div><h4>${escapeHtml(x.title)}</h4><p>${escapeHtml(x.reason)}</p></div></div>`).join("") || `<div class="empty">No trend recommendation yet.</div>`);
  setHtml("historyCompare", table(["Metric", "First", "Latest", "Delta", "Trend"], trend.compare.map((x) => [x.metric, x.previous, x.current, x.display, x.trend])));
  setHtml("timelineEvents", table(["Date", "Type", "Title", "Detail"], trend.events.map((x) => [new Date(x.datetime).toLocaleString(), x.type, x.title, x.detail])));
  setHtml("engineEvolution", engineEvolution(loadResearchHistory()));
}

function fillResearchSelects() {
  fillSelect("researchCategory", RESEARCH_CATEGORIES);
  fillSelect("filterResearchCategory", ["All", ...RESEARCH_CATEGORIES]);
  fillSelect("researchStatus", RESEARCH_STATUSES);
  fillSelect("filterResearchStatus", ["All", ...RESEARCH_STATUSES]);
  fillSelect("filterResearchDecision", ["All", ...RESEARCH_DECISIONS]);
  fillSelect("filterResearchPriority", ["All", ...RESEARCH_PRIORITIES]);
  fillSelect("filterResearchConfidence", ["All", "High", "Medium", "Low", "Insufficient"]);
  fillSelect("filterResearchHealth", ["All", "Healthy", "Needs Data", "Blocked", "Stale", "Completed", "Warning", "Review Required"]);
  fillSelect("researchPriority", RESEARCH_PRIORITIES);
  fillSelect("researchTemplate", Object.keys(RESEARCH_TEMPLATES));
}

function fillSelect(id, values) {
  const el = byId(id);
  if (!el) return;
  el.innerHTML = values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
}

function applyResearchTemplate() {
  const template = RESEARCH_TEMPLATES[byId("researchTemplate")?.value || "Blank"];
  if (!template) return;
  setInput("researchCategory", template.category || "Other");
  setInput("researchHypothesis", template.hypothesis || "");
  setInput("researchValidationPlan", template.validationPlan || "");
  setInput("researchCondition", (template.tags || []).join(", "));
  if (!byId("researchTitle")?.value) setInput("researchTitle", template.title || "");
}

function createResearchFromForm() {
  const title = valueOf("researchTitle") || "Untitled Research";
  const item = researchManager.create({
    title,
    category: valueOf("researchCategory"),
    status: valueOf("researchStatus"),
    priority: valueOf("researchPriority"),
    engine: valueOf("researchEngine"),
    condition: valueOf("researchCondition"),
    session: valueOf("researchSession"),
    hypothesis: valueOf("researchHypothesis"),
    validationPlan: valueOf("researchValidationPlan"),
    requiredData: RESEARCH_TEMPLATES[valueOf("researchTemplate")]?.requiredData || "",
    successCriteria: RESEARCH_TEMPLATES[valueOf("researchTemplate")]?.successCriteria || "",
    failureCriteria: RESEARCH_TEMPLATES[valueOf("researchTemplate")]?.failureCriteria || "",
    tags: normalizeTags(valueOf("researchCondition")),
    sourceAnalyzerSnapshot: analyzerSnapshot()
  });
  ResearchWorkspaceStore.addActivity("Research Added", item.title, item.engine || item.category || "Manual");
  setInput("researchTitle", "");
  researchManager.selectedId = item.id;
  invalidateBrainCache();
  renderResearchManager();
  renderResearchBoard();
  renderPortfolio();
}

function renderResearchManager() {
  if (!byId("researchList")) return;
  const rows = researchManager.filtered({
    status: valueOf("filterResearchStatus") || "All",
    category: valueOf("filterResearchCategory") || "All",
    decision: valueOf("filterResearchDecision") || "All",
    priority: valueOf("filterResearchPriority") || "All",
    confidence: valueOf("filterResearchConfidence") || "All",
    health: valueOf("filterResearchHealth") || "All",
    search: valueOf("researchSearch")
  });
  const message = researchManager.lastMessage ? `<div class="empty">${escapeHtml(researchManager.lastMessage)}</div>` : "";
  setHtml("researchList", `${message}${rows.length ? `<table><thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Score</th><th>Confidence</th><th>Progress</th><th>Health</th><th>Next Action</th><th>Open</th></tr></thead><tbody>${rows.map((item) => `<tr><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.priority)}</td><td>${escapeHtml(item.researchScore)}</td><td>${escapeHtml(item.confidence)}</td><td>${researchProgress(item)}%</td><td>${escapeHtml(researchHealth(item))}</td><td>${escapeHtml(nextAction(item))}</td><td><button class="mini-button open-research" data-id="${escapeHtml(item.id)}">Open</button></td></tr>`).join("")}</tbody></table>` : `<div class="empty">No research items yet. Add a candidate from Research Intelligence or create one manually.</div>`}`);
  document.querySelectorAll(".open-research").forEach((button) => button.addEventListener("click", () => {
    researchManager.selectedId = button.dataset.id;
    renderResearchDetail();
  }));
  renderResearchDetail();
}

function renderResearchDetail() {
  const item = researchManager.get(researchManager.selectedId);
  if (!item) {
    setHtml("researchDetail", `<div class="empty">Select a research item.</div>`);
    return;
  }
  setHtml("researchDetail", `
    <label>Title<input id="detailTitle" type="text" value="${escapeHtml(item.title)}"></label>
    <div class="form-grid compact">
      <label>Category<select id="detailCategory">${RESEARCH_CATEGORIES.map((x) => `<option value="${escapeHtml(x)}" ${x === item.category ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}</select></label>
      <label>Status<select id="detailStatus">${RESEARCH_STATUSES.map((x) => `<option value="${escapeHtml(x)}" ${x === item.status ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}</select></label>
      <label>Priority<select id="detailPriority">${RESEARCH_PRIORITIES.map((x) => `<option value="${escapeHtml(x)}" ${x === item.priority ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}</select></label>
      <label>Decision<select id="detailDecision">${RESEARCH_DECISIONS.map((x) => `<option value="${escapeHtml(x)}" ${x === item.decision ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}</select></label>
    </div>
    <div class="metric-grid">${metrics([["Progress", `${researchProgress(item)}%`], ["Health", researchHealth(item)], ["Score", item.researchScore], ["Confidence", item.confidence]])}</div>
    <div class="form-grid compact">
      <label>Engine<input id="detailEngine" type="text" value="${escapeHtml(item.engine)}"></label>
      <label>Condition<input id="detailCondition" type="text" value="${escapeHtml(item.condition)}"></label>
      <label>Session<input id="detailSession" type="text" value="${escapeHtml(item.session)}"></label>
      <label>Tags<input id="detailTags" type="text" value="${escapeHtml((item.tags || []).join(", "))}"></label>
    </div>
    <h4>Hypothesis</h4><textarea id="detailHypothesis">${escapeHtml(item.hypothesis)}</textarea>
    <h4>Reason</h4><textarea id="detailReason">${escapeHtml(item.reason)}</textarea>
    <h4>Required Data</h4><textarea id="detailRequiredData">${escapeHtml(item.requiredData)}</textarea>
    <h4>Validation Plan</h4><textarea id="detailValidation">${escapeHtml(item.validationPlan)}</textarea>
    <h4>Success Criteria</h4><textarea id="detailSuccess">${escapeHtml(item.successCriteria)}</textarea>
    <h4>Failure Criteria</h4><textarea id="detailFailure">${escapeHtml(item.failureCriteria)}</textarea>
    <h4>Result Summary</h4><textarea id="detailResult">${escapeHtml(item.resultSummary)}</textarea>
    <h4>Next Action Override</h4><textarea id="detailNextAction">${escapeHtml(item.nextAction)}</textarea>
    <p><strong>Next Action:</strong> ${escapeHtml(nextAction(item))}</p>
    <div class="button-row">
      <button class="mini-button" id="saveResearchDetail">Save Detail</button>
      <button class="mini-button" id="addResearchEvidence">Add Evidence</button>
      <button class="mini-button" id="downloadResearchMarkdown">Export Markdown</button>
    </div>
    <div class="button-row">
      ${RESEARCH_DECISIONS.filter((d) => d !== "Undecided").map((decision) => `<button class="mini-button decision-button" data-decision="${escapeHtml(decision)}">${escapeHtml(decision)}</button>`).join("")}
    </div>
    <h4>Evidence</h4>
    ${table(["Date", "Type", "Title", "Value", "Note", "Source"], (item.evidence || []).map((e) => [e.date || "-", e.type || "-", e.title || "-", e.value || "-", e.note || "-", e.source || "-"]))}
    <h4>Decision Log</h4>
    ${table(["Date", "Decision", "Reason", "User Note"], (item.decisionLog || []).map((d) => [new Date(d.date).toLocaleString(), d.decision, d.reason, d.userNote]))}
    <h4>History</h4>
    ${table(["At", "Type", "Note"], (item.history || []).slice(-12).reverse().map((h) => [new Date(h.at).toLocaleString(), h.type, h.note || "-"]))}
  `);
  on("saveResearchDetail", "click", () => {
    const previousDecision = item.decision;
    researchManager.update(item.id, {
      title: valueOf("detailTitle"),
      category: valueOf("detailCategory"),
      status: valueOf("detailStatus"),
      priority: valueOf("detailPriority"),
      decision: valueOf("detailDecision"),
      engine: valueOf("detailEngine"),
      condition: valueOf("detailCondition"),
      session: valueOf("detailSession"),
      tags: normalizeTags(valueOf("detailTags")),
      hypothesis: valueOf("detailHypothesis"),
      reason: valueOf("detailReason"),
      requiredData: valueOf("detailRequiredData"),
      validationPlan: valueOf("detailValidation"),
      successCriteria: valueOf("detailSuccess"),
      failureCriteria: valueOf("detailFailure"),
      resultSummary: valueOf("detailResult"),
      nextAction: valueOf("detailNextAction")
    });
    if (previousDecision !== valueOf("detailDecision")) {
      researchManager.setDecision(item.id, valueOf("detailDecision"), valueOf("detailResult"), "Changed from detail editor.", analyzerSnapshot());
      ResearchWorkspaceStore.addActivity("Decision", item.title, valueOf("detailDecision"));
    } else {
      ResearchWorkspaceStore.addActivity("Research Updated", item.title, valueOf("detailStatus"));
    }
    invalidateBrainCache();
    renderResearchManager();
    renderResearchBoard();
    renderPortfolio();
  });
  on("addResearchEvidence", "click", () => {
    const note = window.prompt("Evidence note");
    if (!note) return;
    researchManager.addEvidence(item.id, {
      type: "Memo",
      title: "Manual Evidence",
      note,
      source: "Manual",
      snapshotId: analyzerSnapshot().datetime
    });
    ResearchWorkspaceStore.addActivity("Evidence", item.title, note);
    invalidateBrainCache();
    renderResearchManager();
    renderResearchBoard();
    renderPortfolio();
  });
  on("downloadResearchMarkdown", "click", () => downloadText(`${safeFileName(item.title)}.md`, researchItemMarkdown(item), "text/markdown"));
  document.querySelectorAll(".decision-button").forEach((button) => button.addEventListener("click", () => {
    researchManager.setDecision(item.id, button.dataset.decision, valueOf("detailResult"));
    ResearchWorkspaceStore.addActivity("Decision", item.title, button.dataset.decision);
    invalidateBrainCache();
    renderResearchManager();
    renderResearchBoard();
    renderPortfolio();
  }));
}

function renderResearchBoard() {
  if (!byId("researchBoardView")) return;
  const boardStatuses = RESEARCH_STATUSES;
  setHtml("researchBoardView", boardStatuses.map((status) => {
    const items = researchManager.items.filter((item) => item.status === status);
    return `<div class="board-column"><h4>${escapeHtml(status)} <span>${items.length}</span></h4>${items.map(researchCard).join("") || `<div class="empty">No items.</div>`}</div>`;
  }).join(""));
  document.querySelectorAll(".move-research").forEach((button) => button.addEventListener("click", () => {
    researchManager.update(button.dataset.id, { status: button.dataset.status });
    ResearchWorkspaceStore.addActivity("Research Updated", button.dataset.id, `Moved to ${button.dataset.status}`);
    invalidateBrainCache();
    renderResearchManager();
    renderResearchBoard();
    renderPortfolio();
  }));
}

function researchCard(item) {
  const next = {
    Backlog: "Hypothesis",
    Hypothesis: "Ready",
    Ready: "Collecting Data",
    "Collecting Data": "Testing",
    Testing: "Review",
    Review: "Completed",
    Completed: "Revalidation",
    "On Hold": "Ready",
    Revalidation: "Testing"
  }[item.status];
  return `<div class="research-card"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.engine || item.condition || item.session || item.category)}</p><p>${escapeHtml(item.category)} / ${escapeHtml(item.priority)}</p><p>${escapeHtml(item.researchScore)} / ${escapeHtml(item.confidence)} / ${researchProgress(item)}%</p><p>${escapeHtml(researchHealth(item))}</p><p>${escapeHtml(nextAction(item))}</p><p>Updated: ${escapeHtml(new Date(item.updatedAt).toLocaleString())}</p>${next ? `<button class="mini-button move-research" data-id="${escapeHtml(item.id)}" data-status="${escapeHtml(next)}">Move to ${escapeHtml(next)}</button>` : ""}</div>`;
}

function renderPortfolio() {
  if (!byId("portfolioMetrics")) return;
  const p = researchManager.portfolio();
  setHtml("portfolioMetrics", metrics([["Total", p.total], ["Adopted", p.adopted], ["Rejected", p.rejected], ["On Hold", p.onHold], ["Stale", p.stale], ["Critical", p.critical], ["Avg Score", p.averageScore], ["Avg Confidence", p.averageConfidence], ["Avg Progress", `${p.averageProgress}%`], ["Warning", p.warning], ["Review Required", p.reviewRequired]]));
  setHtml("priorityMatrix", priorityMatrixHtml());
  const rec = researchManager.recommended();
  setHtml("nextResearchRecommendation", rec ? `<div class="suggestion"><div class="stars">${escapeHtml(rec.researchScore)}</div><div><h4>${escapeHtml(rec.title)}</h4><p>${escapeHtml(nextAction(rec))}</p><p><span class="tag">${escapeHtml(rec.priority)}</span> <span class="tag">${escapeHtml(rec.confidence)}</span></p></div></div>` : `<div class="empty">No active research recommendation.</div>`);
  setHtml("staleResearchTable", table(["Title", "Status", "Updated", "Next Action"], researchManager.stale().map((item) => [item.title, item.status, new Date(item.updatedAt).toLocaleString(), nextAction(item)])));
}

function renderBrain() {
  if (!byId("brainOverview")) return;
  const brain = new BrainEngine({ researchManager, analysisEngine: engine });
  const data = brain.snapshot();
  const quality = new DataQualityEngine(engine).snapshot();
  const cross = engine.results.crossCsv || new CrossCsvEngine(engine).snapshot();
  const trend = engine.results.trend || new TrendEngine({ analysisEngine: engine, researchManager }).snapshot();
  const dna = engine.results.engineDna || (typeof EngineDnaEngine !== "undefined" ? new EngineDnaEngine({ analysisEngine: engine }).snapshot() : null);
  if (dna) engine.results.engineDna = dna;
  const kg = engine.results.knowledgeGraph || (typeof KnowledgeGraphEngine !== "undefined" ? new KnowledgeGraphEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  if (kg) engine.results.knowledgeGraph = kg;
  const workspace = engine.results.workspace || (typeof ResearchWorkspaceEngine !== "undefined" ? new ResearchWorkspaceEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  if (workspace) engine.results.workspace = workspace;
  const hypothesis = engine.results.hypothesis || (typeof ResearchHypothesisEngine !== "undefined" ? new ResearchHypothesisEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  if (hypothesis) engine.results.hypothesis = hypothesis;
  const lineage = engine.results.hypothesisLineage || (typeof HypothesisLineageEngine !== "undefined" ? new HypothesisLineageEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  if (lineage) engine.results.hypothesisLineage = lineage;
  const strategy = engine.results.researchStrategy || (typeof ResearchStrategyEngine !== "undefined" ? new ResearchStrategyEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  if (strategy) engine.results.researchStrategy = strategy;
  setHtml("brainOverview", `<span class="pill">AI Research Brain</span><h3>Next Research is selected from workflow quality, evidence, confidence, progress, risk, Cross CSV relation, trend, Engine DNA, Knowledge Graph, Workspace, Hypothesis, Lineage, and Strategy.</h3><p>${escapeHtml(data.insights[0] || "Load CSV and create Research items to activate Brain.")}</p><p><strong>Today's Cross Insight:</strong> ${escapeHtml(cross.recommendations?.[0]?.reason || cross.crossSummary?.status || "Cross CSV data is not loaded yet.")}</p><p><strong>Trend Summary:</strong> ${escapeHtml(trend.trendSummary)}</p><p><strong>Engine DNA Summary:</strong> ${escapeHtml(dna?.summary || "Engine DNA data is not ready yet.")}</p><p><strong>Knowledge Graph Insight:</strong> ${escapeHtml(kg?.insight?.[0] || "Knowledge Graph data is not ready yet.")}</p><p><strong>Hypothesis Summary:</strong> ${escapeHtml(hypothesis?.hypothesisSummary?.topTitle || "Hypothesis data is not ready yet.")}</p><p><strong>Lineage Summary:</strong> ${escapeHtml(lineage?.hypothesisLineageSummary?.largestFamily || "Hypothesis Lineage data is not ready yet.")}</p><p><strong>Strategy Summary:</strong> ${escapeHtml(strategy?.strategySummary?.summary || "Research Strategy data is not ready yet.")}</p>`);
  setHtml("brainOverviewMetrics", metrics([
    ["In Progress", data.overview.inProgress],
    ["Protected", data.overview.protected],
    ["Adopted", data.overview.adopted],
    ["Rejected", data.overview.rejected],
    ["Stale", data.overview.stale],
    ["Critical", data.overview.critical],
    ["Total", data.overview.total],
    ["Data Quality", `${quality.qualityScore}/100`],
    ["CSV Confidence", quality.confidence],
    ["Cross Score", `${cross.correlationScore || 0}/100`],
    ["Cross Status", cross.crossSummary?.status || "No Data"],
    ["Trend Snapshots", trend.count],
    ["Trend Status", trend.forecast[0]?.status || "Need Data"],
    ["Top DNA", dna?.topEngine?.engine || "-"],
    ["DNA Cluster", dna?.topEngine?.cluster || "-"],
    ["Graph Nodes", kg?.graphStatistics?.nodeCount || 0],
    ["Graph Density", `${kg?.graphStatistics?.density || 0}%`],
    ["Hypotheses", hypothesis?.hypothesisSummary?.total || 0],
    ["Top Hypothesis", hypothesis?.hypothesisSummary?.topScore || 0],
    ["Lineage Relations", lineage?.hypothesisLineageSummary?.relationCount || 0],
    ["Top Score 2.0", lineage?.hypothesisLineageSummary?.topScore2 || 0],
    ["Strategy Candidates", strategy?.researchStrategy?.length || 0],
    ["Strategy Coverage", strategy?.strategySummary?.coverage || "-"]
  ]));
  const perf = PerformanceUtil.analysisStatistics(engine);
  setHtml("brainPerformance", metrics([
    ["Analysis Version", perf.analysisVersion],
    ["Cache Status", perf.cacheStatus],
    ["Cross CSV Cache", perf.crossCache],
    ["Brain Cache", perf.brainCache],
    ["Data Quality Cache", perf.qualityCache],
    ["Memory", perf.memory]
  ]));
  setHtml("brainRecommendations", data.recommendations.length ? data.recommendations.map((rec, index) => `<div class="suggestion"><div class="stars">${index + 1}</div><div><h4>${escapeHtml(rec.item.title)}</h4><p><span class="tag">${escapeHtml(rec.item.engine || rec.item.category)}</span> <span class="tag">${escapeHtml(rec.item.priority)}</span> <span class="tag">${escapeHtml(rec.item.researchScore)}</span></p><p>${escapeHtml(rec.reasons.join(" / "))}</p><p>Brain Score: ${rec.score}</p></div></div>`).join("") : `<div class="empty">No active Research recommendations.</div>`);
  setHtml("brainBottlenecks", table(["Bottleneck", "Count"], data.bottlenecks.map((x) => [x.name, x.count])));
  setHtml("brainRequiredData", table(["Required Data", "Research Count", "Missing", "Collection Rate"], data.requiredData.map((x) => [x.csv, x.count, x.missing, `${x.collectionRate}%`])));
  setHtml("brainPriorityRanking", table(["Rank", "Title", "Status", "Priority", "Quality", "Progress", "Health", "Advisor"], data.priorityRanking.slice(0, 20).map((x, i) => [i + 1, x.item.title, x.item.status, x.item.priority, x.qualityScore, `${researchProgress(x.item)}%`, researchHealth(x.item), x.advisor])));
  setHtml("brainRoadmap", table(["Status", "Count"], data.roadmap.map((x) => [x.status, x.count])));
  drawMultiLine("brainTimelineChart", data.timeline.map((x) => x.date), [
    { label: "Research", data: data.timeline.map((x) => x.research) },
    { label: "Evidence", data: data.timeline.map((x) => x.evidence) },
    { label: "Decision", data: data.timeline.map((x) => x.decisions) },
    { label: "Adopt", data: data.timeline.map((x) => x.adopted) }
  ]);
  setHtml("brainStatistics", metrics([
    ["Avg Duration", `${round(data.statistics.averageDuration)} days`],
    ["Avg Evidence", round(data.statistics.averageEvidence)],
    ["Avg Progress", `${round(data.statistics.averageProgress)}%`],
    ["Avg Research Score", round(data.statistics.averageResearchScore)],
    ["Avg Confidence", round(data.statistics.averageConfidence)],
    ["Avg Decision Time", `${round(data.statistics.averageDecisionTime)} days`]
  ]));
  setHtml("brainRisks", table(["Research", "Risks"], data.risks.slice(0, 20).map((x) => [x.item.title, x.risks.join(" / ")])));
  setHtml("brainKnowledge", table(["Title", "Decision", "Conclusion", "Tags"], data.knowledge.slice(0, 20).map((x) => [x.title, x.decision, x.conclusion, (x.tags || []).join(", ")])));
  setHtml("brainClusters", `<h4>Category</h4>${table(["Cluster", "Count", "Completed", "Avg Progress"], data.clusters.category.map((x) => [x.name, x.count, x.completed, `${x.averageProgress}%`]))}<h4>Engine</h4>${table(["Cluster", "Count", "Completed", "Avg Progress"], data.clusters.engine.map((x) => [x.name, x.count, x.completed, `${x.averageProgress}%`]))}`);
  setHtml("brainKnowledgeGraph", kg ? `<div class="warning-list">${kg.insight.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</div>${metrics([
    ["Largest Cluster", kg.largestCluster.label],
    ["Research Hub", kg.researchHub.label],
    ["Top Engine", kg.topConnectedEngine.label],
    ["TopNG Hub", kg.topConnectedTopNg.label]
  ])}` : `<div class="empty">Knowledge Graph data is not ready.</div>`);
  setHtml("brainWorkspaceSummary", workspace ? `<div class="warning-list"><div><strong>Today's Focus:</strong> ${escapeHtml(workspace.summary.title)}</div><div><strong>Reason:</strong> ${escapeHtml(workspace.summary.reason)}</div><div><strong>Next:</strong> ${escapeHtml(workspace.summary.next)}</div></div>${metrics([
    ["Queue", workspace.summary.queueCount],
    ["Bookmarks", workspace.summary.bookmarkCount],
    ["Pinned", workspace.summary.pinCount],
    ["Recent Activity", workspace.summary.recentActivityCount]
  ])}` : `<div class="empty">Workspace data is not ready.</div>`);
  setHtml("brainHypothesisSummary", hypothesis ? `<div class="warning-list"><div><strong>Top Hypothesis:</strong> ${escapeHtml(hypothesis.hypothesisSummary.topTitle)}</div><div><strong>Confidence:</strong> ${escapeHtml(hypothesis.hypothesisSummary.topConfidence)}</div><div><strong>Evidence:</strong> ${hypothesis.evidenceSummary.total}</div></div>${metrics([
    ["Hypotheses", hypothesis.hypothesisSummary.total],
    ["Verified", hypothesis.hypothesisSummary.verified],
    ["Rejected", hypothesis.hypothesisSummary.rejected],
    ["Open Questions", hypothesis.openQuestions.length]
  ])}` : `<div class="empty">Hypothesis data is not ready.</div>`);
  setHtml("brainLineageSummary", lineage ? `<div class="warning-list"><div><strong>Largest Hypothesis Family:</strong> ${escapeHtml(lineage.hypothesisLineageSummary.largestFamily)}</div><div><strong>Most Connected Hypothesis:</strong> ${escapeHtml(lineage.hypothesisLineageSummary.mostConnectedHypothesis)}</div><div><strong>Top Weighted Evidence:</strong> ${escapeHtml(lineage.hypothesisLineageSummary.topWeightedEvidence)}</div><div><strong>Lowest Validation Readiness:</strong> ${escapeHtml(lineage.hypothesisLineageSummary.lowestValidationReadiness)}</div><div><strong>Duplicate Candidate:</strong> ${escapeHtml(lineage.hypothesisLineageSummary.duplicateCandidate)}</div><div><strong>Orphan Hypothesis:</strong> ${escapeHtml(lineage.hypothesisLineageSummary.orphanHypothesis)}</div><div><strong>Superseded Hypothesis:</strong> ${escapeHtml(lineage.hypothesisLineageSummary.supersededHypothesis)}</div><div><strong>Top Contradiction:</strong> ${escapeHtml(lineage.hypothesisLineageSummary.topContradiction)}</div></div>${metrics([
    ["Relations", lineage.hypothesisLineageSummary.relationCount],
    ["Families", lineage.hypothesisLineageSummary.familyCount],
    ["Avg Weighted Evidence", lineage.hypothesisLineageSummary.averageWeightedEvidence],
    ["Avg Readiness", `${lineage.hypothesisLineageSummary.averageValidationReadiness}%`]
  ])}` : `<div class="empty">Hypothesis Lineage data is not ready.</div>`);
  setHtml("brainStrategySummary", strategy ? `<div class="warning-list"><div><strong>Next Best Research:</strong> ${escapeHtml(strategy.strategySummary.currentBestResearch)}</div><div><strong>Highest ROI:</strong> ${escapeHtml(strategy.strategySummary.highestROI)}</div><div><strong>Highest Impact:</strong> ${escapeHtml(strategy.strategySummary.highestImpact)}</div><div><strong>Lowest Cost:</strong> ${escapeHtml(strategy.strategySummary.lowestCost)}</div><div><strong>Current Blocker:</strong> ${escapeHtml(strategy.strategySummary.currentBlocker)}</div><div><strong>Roadmap:</strong> ${escapeHtml(strategy.strategySummary.roadmap)}</div></div>${metrics([
    ["Coverage", strategy.strategySummary.coverage],
    ["Blockers", strategy.strategySummary.blockerCount],
    ["Roadmap Progress", `${strategy.strategySummary.roadmapProgress}%`],
    ["Quick Win", strategy.strategySummary.quickWin]
  ])}<p>Research candidates only. No EA or trading-condition changes are proposed here.</p>` : `<div class="empty">Research Strategy data is not ready.</div>`);
  setHtml("brainInsights", `<div class="warning-list">${data.insights.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</div>`);
  setHtml("brainSummary", table(["Period", "Added", "Completed", "Evidence", "Decisions"], [
    ["Weekly", data.weekly.added, data.weekly.completed, data.weekly.evidence, data.weekly.decisions],
    ["Monthly", data.monthly.added, data.monthly.completed, data.monthly.evidence, data.monthly.decisions]
  ]));
}

function priorityMatrixHtml() {
  const cells = [
    ["High Score / High Confidence", (x) => scoreWeight(x.researchScore) >= 4 && ["High", "Medium"].includes(x.confidence)],
    ["High Score / Low Confidence", (x) => scoreWeight(x.researchScore) >= 4 && !["High", "Medium"].includes(x.confidence)],
    ["Low Score / High Confidence", (x) => scoreWeight(x.researchScore) < 4 && ["High", "Medium"].includes(x.confidence)],
    ["Low Score / Low Confidence", (x) => scoreWeight(x.researchScore) < 4 && !["High", "Medium"].includes(x.confidence)]
  ];
  return `<div class="matrix-grid">${cells.map(([label, pred]) => {
    const items = researchManager.items.filter(pred);
    return `<div class="matrix-cell"><h4>${escapeHtml(label)}</h4><strong>${items.length}</strong><p>${items.slice(0, 3).map((x) => escapeHtml(x.title)).join("<br>") || "No items"}</p></div>`;
  }).join("")}</div>`;
}

function exportResearchManager() {
  ResearchWorkspaceStore.addActivity("Export", "Research Manager exported", `${researchManager.items.length} items`);
  downloadText("ScalpLayer_Research_Manager.json", JSON.stringify(ResearchStorage.exportBundle(researchManager.items, researchManager.settings), null, 2), "application/json");
}

async function importResearchManager(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const result = researchManager.importBundle(text);
  if (!result.ok) {
    window.alert(result.error);
    return;
  }
  if (result.warnings?.length) window.alert(`Import completed with warnings:\n${result.warnings.slice(0, 8).join("\n")}`);
  ResearchWorkspaceStore.addActivity("Import", "Research Manager imported", result.warnings?.length ? `${result.warnings.length} warnings` : "Completed");
  invalidateBrainCache();
  renderResearchManager();
  renderResearchBoard();
  renderPortfolio();
}

function invalidateBrainCache() {
  if (engine._snapshotCache) delete engine._snapshotCache.brain;
}

function analyzerSnapshot() {
  const quality = new DataQualityEngine(engine).snapshot();
  const cross = engine.results.crossCsv || new CrossCsvEngine(engine).snapshot();
  const perf = PerformanceUtil.analysisStatistics(engine);
  const trendSnapshot = engine.results.trend || new TrendEngine({ analysisEngine: engine, researchManager }).snapshot();
  const dna = engine.results.engineDna || (typeof EngineDnaEngine !== "undefined" ? new EngineDnaEngine({ analysisEngine: engine }).snapshot() : null);
  const kg = engine.results.knowledgeGraph || (typeof KnowledgeGraphEngine !== "undefined" ? new KnowledgeGraphEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  const workspace = engine.results.workspace || (typeof ResearchWorkspaceEngine !== "undefined" ? new ResearchWorkspaceEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  const hypothesis = engine.results.hypothesis || (typeof ResearchHypothesisEngine !== "undefined" ? new ResearchHypothesisEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  const lineage = engine.results.hypothesisLineage || (typeof HypothesisLineageEngine !== "undefined" ? new HypothesisLineageEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  const strategy = engine.results.researchStrategy || (typeof ResearchStrategyEngine !== "undefined" ? new ResearchStrategyEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  return {
    datetime: new Date().toISOString(),
    files: Array.from(engine.files.keys()),
    dataset: engine.results.datasetSummary || null,
    analysisVersion: engine.analysisVersion,
    performance: perf,
    cacheStatus: perf.cacheStatus,
    analysisTime: perf.analysisTime,
    crossTime: perf.crossTime,
    brainTime: perf.brainTime,
    qualityTime: perf.qualityTime,
    timeline: trendSnapshot.events?.slice(0, 20) || [],
    trend: trendSnapshot.improvement || [],
    milestones: trendSnapshot.milestones || [],
    bestSnapshot: trendSnapshot.bestSnapshot || [],
    worstSnapshot: trendSnapshot.worstSnapshot || [],
    trendSummary: trendSnapshot.trendSummary || "",
    engineDNA: dna?.profiles?.slice(0, 12) || [],
    engineCluster: dna?.clusters || [],
    engineSimilarity: dna?.similarity?.slice(0, 12) || [],
    engineEvolution: dna?.evolution || [],
    engineDnaSummary: dna?.summary || "",
    knowledgeGraph: kg ? { nodes: kg.nodes.slice(0, 60), edges: kg.edges.slice(0, 120) } : null,
    graphSummary: kg?.graphSummary || null,
    largestCluster: kg?.largestCluster || null,
    researchHub: kg?.researchHub || null,
    topConnectedEngine: kg?.topConnectedEngine || null,
    graphStatistics: kg?.graphStatistics || null,
    dependencyGraph: kg?.dependencyGraph || null,
    workspace: workspace ? {
      focus: workspace.focus,
      queue: workspace.queue.slice(0, 12),
      bookmarks: workspace.bookmarks,
      pins: workspace.pins,
      recentActivity: workspace.recentActivity
    } : null,
    workspaceSummary: workspace?.summary || null,
    bookmark: workspace?.bookmarks || [],
    pin: workspace?.pins || [],
    recentActivity: workspace?.recentActivity || [],
    hypothesis: hypothesis?.hypotheses || [],
    hypothesisSummary: hypothesis?.hypothesisSummary || null,
    evidenceSummary: hypothesis?.evidenceSummary || null,
    contradictions: hypothesis?.contradictions || [],
    openQuestions: hypothesis?.openQuestions || [],
    hypothesisLineage: lineage?.hypothesisLineage || null,
    hypothesisRelations: lineage?.hypothesisRelations || [],
    hypothesisFamilies: lineage?.hypothesisFamilies || [],
    hypothesisLineageSummary: lineage?.hypothesisLineageSummary || null,
    evidenceWeights: lineage?.evidenceWeights || null,
    weightedEvidenceSummary: lineage?.weightedEvidenceSummary || null,
    hypothesisScore2: lineage?.hypothesisScore2?.slice(0, 20) || [],
    hypothesisConfidence2: lineage?.hypothesisConfidence2?.slice(0, 20) || [],
    validationReadiness: lineage?.validationReadiness?.slice(0, 20) || [],
    validationChecklist: lineage?.validationChecklist?.slice(0, 20) || [],
    hypothesisHistory: lineage?.hypothesisHistory?.slice(0, 30) || [],
    duplicateHypotheses: lineage?.duplicateHypotheses || [],
    orphanHypotheses: lineage?.orphanHypotheses || [],
    supersededHypotheses: lineage?.supersededHypotheses || [],
    hypothesisCompareSummary: lineage?.hypothesisCompareSummary || null,
    researchStrategy: strategy?.researchStrategy || [],
    priorityMatrix: strategy?.priorityMatrix || [],
    researchROI: strategy?.researchROI || [],
    coverage: strategy?.coverage || [],
    roadmap: strategy?.roadmap || [],
    quickWin: strategy?.quickWin || [],
    longProject: strategy?.longProject || [],
    duplicateResearch: strategy?.duplicateResearch || [],
    missingResearch: strategy?.missingResearch || [],
    blockers: strategy?.blockers || [],
    strategySummary: strategy?.strategySummary || null,
    productivity: {
      version: PRODUCTIVITY_VERSION,
      dashboardCards: getDashboardCards(),
      favoriteEngine: getFavoriteEngine(),
      snapshotCompare: loadResearchHistory().length >= 2 ? snapshotDiff(loadResearchHistory().at(-2), loadResearchHistory().at(-1)) : null,
      searchIndexCount: buildSearchIndex().length
    },
    dataQuality: quality,
    crossCsv: {
      score: cross.correlationScore,
      status: cross.crossSummary?.status,
      summary: cross.crossSummary,
      engineCorrelation: cross.engineCorrelation?.slice(0, 10) || [],
      sessionCorrelation: cross.sessionCorrelation || [],
      signalCorrelation: cross.signalCorrelation || {},
      opportunityMatrix: cross.opportunityMatrix?.slice(0, 10) || [],
      recommendations: cross.recommendations?.slice(0, 10) || []
    },
    trade: engine.results.dashboard || null,
    nearMiss: engine.results.nearMiss || null,
    topNg: engine.results.nearMiss.ngReasons?.slice(0, 10) || [],
    engine: engine.results.engineActivity?.slice(0, 10) || [],
    session: engine.results.session || [],
    research: engine.results.intelligence?.slice(0, 10) || [],
    validation: engine.results.warnings || [],
    csvTypes: Array.from(engine.files.keys())
  };
}

function researchItemMarkdown(item) {
  const before = item.beforeSnapshot || item.sourceAnalyzerSnapshot || {};
  const after = item.afterSnapshot || {};
  return [
    `# ${item.title}`,
    "",
    `- Category: ${item.category}`,
    `- Status: ${item.status}`,
    `- Priority: ${item.priority}`,
    `- Research Score: ${item.researchScore}`,
    `- Confidence: ${item.confidence}`,
    `- Progress: ${researchProgress(item)}%`,
    `- Health: ${researchHealth(item)}`,
    `- Decision: ${item.decision}`,
    `- Engine: ${item.engine || "-"}`,
    `- Condition: ${item.condition || "-"}`,
    `- Session: ${item.session || "-"}`,
    `- Tags: ${(item.tags || []).join(", ") || "-"}`,
    "",
    "## Hypothesis",
    item.hypothesis || "-",
    "",
    "## Reason",
    item.reason || "-",
    "",
    "## Required Data",
    item.requiredData || "-",
    "",
    "## Validation Plan",
    item.validationPlan || "-",
    "",
    "## Success Criteria",
    item.successCriteria || "-",
    "",
    "## Failure Criteria",
    item.failureCriteria || "-",
    "",
    "## Progress",
    `- Progress: ${researchProgress(item)}%`,
    `- Health: ${researchHealth(item)}`,
    `- Next Action: ${nextAction(item)}`,
    "",
    "## Evidence",
    ...(item.evidence?.length ? item.evidence.map((e) => `- ${e.createdAt || e.date}: [${e.type}] ${e.title} / ${e.value || "-"} / ${e.note || "-"}`) : ["- No evidence yet."]),
    "",
    "## Decision Log",
    ...(item.decisionLog?.length ? item.decisionLog.map((d) => `- ${d.date}: ${d.decision} / ${d.reason || "-"} / ${d.userNote || "-"}`) : ["- No decision log yet."]),
    "",
    "## History",
    ...(item.history?.length ? item.history.map((h) => `- ${h.at}: ${h.type} / ${h.note || "-"}`) : ["- No history yet."]),
    "",
    "## Before / After Snapshot",
    `- Before Trade Count: ${before.trade?.totalTrades ?? before.dashboard?.totalTrades ?? "-"}`,
    `- After Trade Count: ${after.trade?.totalTrades ?? after.dashboard?.totalTrades ?? "-"}`,
    `- Before NearMiss: ${before.nearMiss?.total ?? "-"}`,
    `- After NearMiss: ${after.nearMiss?.total ?? "-"}`,
    `- Before CSV Types: ${(before.csvTypes || before.files || []).join(", ") || "-"}`,
    `- After CSV Types: ${(after.csvTypes || after.files || []).join(", ") || "-"}`,
    "",
    "## Result Summary",
    item.resultSummary || "-",
    "",
    "## Next Action",
    nextAction(item)
  ].join("\n");
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
  const key = virtualTableKey(headers, rows.length);
  const useVirtual = rows.length > 1000;
  const limit = useVirtual ? Math.min(rows.length, virtualTableState[key] || 100) : rows.length;
  const visibleRows = rows.slice(0, limit);
  const body = `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${visibleRows.map((row) => `<tr>${row.map((v) => `<td>${escapeHtml(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  if (!useVirtual || limit >= rows.length) return body;
  return `${body}<div class="table-more"><span>Showing ${limit} / ${rows.length}</span><button class="mini-button load-more-table" data-table-key="${escapeHtml(key)}" data-next-limit="${Math.min(rows.length, limit + 100)}">Load More</button></div>`;
}

function rawTable(headers, rows) {
  if (!rows.length) return `<div class="empty">No data.</div>`;
  return `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v, i) => `<td>${i === 0 ? escapeHtml(v) : v}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function virtualTableKey(headers, length) {
  return `${headers.join("|")}:${length}`.replace(/[^a-zA-Z0-9:_|-]/g, "_");
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
  return table(["Metric", "Previous", "Current", "Diff", "Trend"], [
    ["Trade", prev.trades, cur.trades, signed(cur.trades - prev.trades), trend(cur.trades - prev.trades)],
    ["NearMiss", prev.nearMiss, cur.nearMiss, signed(cur.nearMiss - prev.nearMiss), "Use normalized rates"],
    ["WinRate", `${round(prev.winRate)}%`, `${round(cur.winRate)}%`, `${signed(round(cur.winRate - prev.winRate))}%`, trend(cur.winRate - prev.winRate)],
    ["ProfitFactor", round(prev.profitFactor), round(cur.profitFactor), signed(round(cur.profitFactor - prev.profitFactor)), trend(cur.profitFactor - prev.profitFactor)]
  ]);
}

function drawLine(id, points, label) { makeChart(id, { type: "line", data: { labels: points.map((p) => p.x), datasets: [{ label, data: points.map((p) => p.y), borderColor: "#49a9ff", backgroundColor: "rgba(73,169,255,.18)", tension: .28, fill: true }] } }); }
function drawMultiLine(id, labels, series) { const colors = ["#49a9ff", "#48d597", "#f0a33a", "#a78bfa"]; makeChart(id, { type: "line", data: { labels, datasets: series.map((s, i) => ({ label: s.label, data: s.data, borderColor: colors[i % colors.length], backgroundColor: "transparent", tension: .25 })) } }); }
function drawBar(id, labels, data, label) { makeChart(id, { type: "bar", data: { labels, datasets: [{ label, data, backgroundColor: "rgba(73,169,255,.55)", borderColor: "#49a9ff", borderWidth: 1 }] } }); }
function drawPie(id, labels, data, label) { makeChart(id, { type: "doughnut", data: { labels, datasets: [{ label, data, backgroundColor: ["#48d597", "#f0a33a", "#ff6b77"] }] } }); }
function drawRadar(id, e) { const data = e ? [Math.min(e.trade?.trades || 0, 100), Math.min(e.trade?.winRate || 0, 100), Math.min(e.timeOk, 100), Math.min(e.entryRate, 100), e.score * 20, e.topNg.length ? 70 : 20] : [0, 0, 0, 0, 0, 0]; makeChart(id, { type: "radar", data: { labels: ["Trade", "WinRate", "TimeOK", "EntryRate", "Health", "ResearchScore"], datasets: [{ label: e?.engine || "Engine", data, borderColor: "#39d8ff", backgroundColor: "rgba(57,216,255,.18)" }] } }); }

function makeChart(id, config) {
  const canvas = byId(id);
  if (!canvas || !window.Chart) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(canvas, { ...config, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#cce8ff" } } }, scales: config.type === "doughnut" || config.type === "radar" ? {} : { x: { ticks: { color: "#9db5cc" }, grid: { color: "rgba(157,181,204,.14)" } }, y: { ticks: { color: "#9db5cc" }, grid: { color: "rgba(157,181,204,.14)" } } } } });
}

function setHtml(id, html) { const el = byId(id); if (el) el.innerHTML = html; }
function setText(id, text) { const el = byId(id); if (el) el.textContent = text; }
function setInput(id, value) { const el = byId(id); if (el) el.value = value ?? ""; }
function valueOf(id) { return byId(id)?.value || ""; }
function fmt(value) { return Number(value || 0).toLocaleString(); }
function pct(value) { return `${round(value)}%`; }
function pf(value) { return value >= 999 ? "Infinity" : String(round(value)); }
function signed(value) { return value > 0 ? `+${value}` : String(value); }
function trend(value) { return value > 0 ? "Improving" : value < 0 ? "Worsening" : "Stable"; }
function healthClass(value) { return value === "Needs Research" ? "Needs" : value || "Inactive"; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m])); }
function safeFileName(value) { return String(value || "Research").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80) || "Research"; }
function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function downloadHistory() { downloadText("ResearchHistory.json", JSON.stringify(loadResearchHistory(), null, 2), "application/json"); }

function exportAllResearch() {
  ResearchWorkspaceStore.addActivity("Export", "All Research exports downloaded", "Markdown / JSON / CSV");
  const snapshot = analyzerSnapshot();
  const q = new DataQualityEngine(engine).snapshot();
  const cross = engine.results.crossCsv || new CrossCsvEngine(engine).snapshot();
  const perf = PerformanceUtil.analysisStatistics(engine);
  const trendSnapshot = engine.results.trend || new TrendEngine({ analysisEngine: engine, researchManager }).snapshot();
  const dna = engine.results.engineDna || (typeof EngineDnaEngine !== "undefined" ? new EngineDnaEngine({ analysisEngine: engine }).snapshot() : null);
  const kg = engine.results.knowledgeGraph || (typeof KnowledgeGraphEngine !== "undefined" ? new KnowledgeGraphEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  const workspace = engine.results.workspace || (typeof ResearchWorkspaceEngine !== "undefined" ? new ResearchWorkspaceEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  const hypothesis = engine.results.hypothesis || (typeof ResearchHypothesisEngine !== "undefined" ? new ResearchHypothesisEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  const lineage = engine.results.hypothesisLineage || (typeof HypothesisLineageEngine !== "undefined" ? new HypothesisLineageEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  const strategy = engine.results.researchStrategy || (typeof ResearchStrategyEngine !== "undefined" ? new ResearchStrategyEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  const markdown = `${buildMarkdownReport(engine.results, byId("researchMemo")?.value || "")}\n\n${productivityMarkdown()}\n\n${workspaceMarkdown(workspace)}\n\n${hypothesisMarkdown(hypothesis)}\n\n${hypothesisLineageMarkdown(lineage)}\n\n${researchStrategyMarkdown(strategy)}\n\n${dataQualityMarkdown(q)}\n\n${crossCsvMarkdown(cross)}\n\n${engineDnaMarkdown(dna)}\n\n${knowledgeGraphMarkdown(kg)}\n\n${trendMarkdown(trendSnapshot)}\n\n${performanceMarkdown(perf)}`;
  downloadText("ScalpLayer_Research_Export.md", markdown, "text/markdown");
  setTimeout(() => downloadText("ScalpLayer_AnalyzerSnapshot.json", JSON.stringify(snapshot, null, 2), "application/json"), 250);
  setTimeout(() => downloadText("ScalpLayer_Research_Summary.csv", buildResearchSummaryCsv(), "text/csv;charset=utf-8"), 500);
}

function buildResearchSummaryCsv() {
  const rows = [["Section", "Name", "MetricA", "MetricB", "MetricC", "Note"]];
  engine.results.engineActivity.forEach((x) => rows.push(["EngineActivity", x.engine, x.checks, x.timeOk, x.entries, (x.topNg || []).slice(0, 3).map((n) => `${n.name}:${n.count}`).join(" / ")]));
  engine.results.tradeByEngine.forEach((x) => rows.push(["TradeByEngine", x.name, x.trades, round(x.winRate), round(x.pips), `PF=${pf(x.profitFactor || 0)}`]));
  (engine.results.nearMiss.ngReasons || []).forEach((x) => rows.push(["TopNG", x.name, x.count, "", "", "NearMiss bottleneck"]));
  (engine.results.researchStrategy?.researchROI || []).slice(0, 30).forEach((x) => rows.push(["ResearchROI", x.title, x.priority, x.researchROI, x.researchCost, x.reason]));
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadMarkdownReport() {
  const q = new DataQualityEngine(engine).snapshot();
  const cross = engine.results.crossCsv || new CrossCsvEngine(engine).snapshot();
  const perf = PerformanceUtil.analysisStatistics(engine);
  const trendSnapshot = engine.results.trend || new TrendEngine({ analysisEngine: engine, researchManager }).snapshot();
  const dna = engine.results.engineDna || (typeof EngineDnaEngine !== "undefined" ? new EngineDnaEngine({ analysisEngine: engine }).snapshot() : null);
  const kg = engine.results.knowledgeGraph || (typeof KnowledgeGraphEngine !== "undefined" ? new KnowledgeGraphEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  const workspace = engine.results.workspace || (typeof ResearchWorkspaceEngine !== "undefined" ? new ResearchWorkspaceEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  const hypothesis = engine.results.hypothesis || (typeof ResearchHypothesisEngine !== "undefined" ? new ResearchHypothesisEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  ResearchWorkspaceStore.addActivity("Snapshot", "ResearchReport.md exported", "Workspace summary included");
  const lineage = engine.results.hypothesisLineage || (typeof HypothesisLineageEngine !== "undefined" ? new HypothesisLineageEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  const strategy = engine.results.researchStrategy || (typeof ResearchStrategyEngine !== "undefined" ? new ResearchStrategyEngine({ analysisEngine: engine, researchManager }).snapshot() : null);
  downloadText("ResearchReport.md", `${buildMarkdownReport(engine.results, byId("researchMemo")?.value || "")}\n\n${productivityMarkdown()}\n\n${workspaceMarkdown(workspace)}\n\n${hypothesisMarkdown(hypothesis)}\n\n${hypothesisLineageMarkdown(lineage)}\n\n${researchStrategyMarkdown(strategy)}\n\n${dataQualityMarkdown(q)}\n\n${crossCsvMarkdown(cross)}\n\n${engineDnaMarkdown(dna)}\n\n${knowledgeGraphMarkdown(kg)}\n\n${trendMarkdown(trendSnapshot)}\n\n${performanceMarkdown(perf)}`, "text/markdown");
}

function dataQualityMarkdown(q) {
  return [
    "## Research Data Quality",
    "",
    `- Overall Quality: ${q.qualityScore}/100 ${q.qualityStars}`,
    `- Confidence: ${q.confidence}`,
    `- Data Quality: ${q.dataQuality}`,
    `- Research Reliability: ${q.reliability.percent}%`,
    "",
    "### Coverage",
    ...q.coverage.map((x) => `- ${x.label}: ${x.rows} rows / ${x.coverage} / ${x.earned}/${x.points}`),
    "",
    "### Warnings",
    ...(q.warnings.length ? q.warnings.map((x) => `- ${x}`) : ["- No major warnings."]),
    "",
    "### Recommendations",
    ...q.recommendations.map((x) => `- ${x}`),
    "",
    "### CSV Health",
    ...q.health.map((x) => `- ${x.csv}: ${x.stars} / ${x.status} / Rows ${x.rows}`)
  ].join("\n");
}

function crossCsvMarkdown(cross) {
  return [
    "## Cross CSV Intelligence",
    "",
    `- Status: ${cross.crossSummary.status}`,
    `- Loaded CSV: ${cross.crossSummary.loadedCsvCount}/${cross.crossSummary.expectedCsvCount}`,
    `- Coverage: ${cross.crossSummary.coverage}%`,
    `- Correlation Score: ${cross.correlationScore}/100`,
    "",
    "### Cross Summary",
    ...cross.crossSummary.rows.map((x) => `- ${x.csv}: ${x.loaded ? "Loaded" : "Missing"} / Rows ${x.rows}`),
    "",
    "### Engine Correlation",
    ...cross.engineCorrelation.slice(0, 10).map((x) => `- ${x.engine}: Trades ${x.trades}, Signals ${x.signals}, NearMiss ${x.nearMiss}, Score ${x.correlationScore}/100, Confidence ${x.confidence}`),
    "",
    "### Session Correlation",
    ...cross.sessionCorrelation.map((x) => `- ${x.session}: Trades ${x.trades}, NearMiss ${x.nearMiss}, Signals ${x.signals}, Score ${x.researchScore}`),
    "",
    "### Opportunity Matrix",
    ...cross.opportunityMatrix.slice(0, 10).map((x) => `- ${x.level} / ${x.type} / ${x.target}: ${x.reason}`),
    "",
    "### Recommendations",
    ...cross.recommendations.map((x) => `- ${x.stars} ${x.title}: ${x.reason}`),
    "",
    "### Warnings",
    ...(cross.warnings.length ? cross.warnings.map((x) => `- ${x}`) : ["- No Cross CSV warnings."])
  ].join("\n");
}

function performanceMarkdown(perf) {
  return [
    "## Performance",
    "",
    `- Analysis Time: ${perf.analysisTime}ms`,
    `- Cross CSV Time: ${perf.crossTime}ms`,
    `- Brain Time: ${perf.brainTime}ms`,
    `- Data Quality Time: ${perf.qualityTime}ms`,
    `- Memory: ${perf.memory}`,
    `- Cache Status: ${perf.cacheStatus}`,
    `- Cache Hit Rate: ${perf.cacheHitRate}%`,
    `- Analysis Version: ${perf.analysisVersion}`
  ].join("\n");
}

function trendMarkdown(trendSnapshot) {
  return [
    "## Research Timeline",
    "",
    `- Snapshots: ${trendSnapshot.count}`,
    `- Trend Summary: ${trendSnapshot.trendSummary}`,
    "",
    "### Trend",
    ...trendSnapshot.improvement.map((x) => `- ${x.metric}: ${x.display} / ${x.trend}`),
    "",
    "### Best Snapshot",
    ...trendSnapshot.bestSnapshot.map((x) => `- ${x.metric}: ${x.value} at ${x.date}`),
    "",
    "### Worst Snapshot",
    ...trendSnapshot.worstSnapshot.map((x) => `- ${x.metric}: ${x.value} at ${x.date} / ${x.reason}`),
    "",
    "### Milestones",
    ...trendSnapshot.milestones.map((x) => `- ${x.title}: ${x.value}/${x.target} (${x.percent}%) ${x.status}`),
    "",
    "### Trend Recommendation",
    ...trendSnapshot.recommendations.map((x) => `- ${x.priority}: ${x.title} / ${x.reason}`)
  ].join("\n");
}

function engineDnaMarkdown(dna) {
  if (!dna) {
    return ["## Engine DNA", "", "- Engine DNA module is not loaded."].join("\n");
  }
  return [
    "## Engine DNA",
    "",
    `- Summary: ${dna.summary || "-"}`,
    `- Top Engine: ${dna.topEngine?.engine || "-"}`,
    `- Top Personality: ${dna.topEngine?.personality || "-"}`,
    `- Top Stability: ${dna.topEngine?.stability || "-"}`,
    "",
    "### DNA Profile",
    ...dna.profiles.map((x) => `- ${x.engine}: Score ${x.researchScore}, Confidence ${x.confidence}, Personality ${x.personality}, Cluster ${x.cluster}, Trades ${x.tradeCount}, NearMiss ${x.nearMissCount}, Signals ${x.signalCount}, PF ${x.profitFactor}, Expectancy ${x.expectancy}`),
    "",
    "### Personality",
    ...dna.profiles.map((x) => `- ${x.engine}: ${x.personality}`),
    "",
    "### Cluster",
    ...dna.clusters.map((x) => `- ${x.cluster}: ${x.engines.join(", ")} / Avg DNA ${x.averageScore}`),
    "",
    "### Similarity",
    ...dna.similarity.slice(0, 10).map((x) => `- ${x.engineA} vs ${x.engineB}: ${x.similarity}% / ${x.shared.join(", ") || "No shared labels"}`),
    "",
    "### Strength",
    ...dna.profiles.map((x) => `- ${x.engine}: ${(x.strength || []).join(", ") || "-"}`),
    "",
    "### Weakness",
    ...dna.profiles.map((x) => `- ${x.engine}: ${(x.weakness || []).join(", ") || "-"}`),
    "",
    "### Evolution",
    ...(dna.evolution.length ? dna.evolution.map((x) => `- ${x.engine}: ${x.status} / ${x.firstScore} -> ${x.lastScore} / Delta ${x.delta}`) : ["- More snapshots are required."]),
    "",
    "### Hidden Opportunity",
    ...(dna.hiddenOpportunity.length ? dna.hiddenOpportunity.map((x) => `- ${x.priority} ${x.engine}: ${x.reason}`) : ["- No hidden opportunity detected yet."])
  ].join("\n");
}

function knowledgeGraphMarkdown(kg) {
  if (!kg) return ["## Knowledge Graph", "", "- Knowledge Graph module is not loaded."].join("\n");
  return [
    "## Knowledge Graph",
    "",
    "### Graph Summary",
    `- Nodes: ${kg.graphStatistics.nodeCount}`,
    `- Edges: ${kg.graphStatistics.edgeCount}`,
    `- Largest Cluster: ${kg.largestCluster.label} (${kg.largestCluster.count})`,
    `- Research Hub: ${kg.researchHub.label}`,
    `- Top Connected Engine: ${kg.topConnectedEngine.label}`,
    `- Top Connected TopNG: ${kg.topConnectedTopNg.label}`,
    `- Graph Density: ${kg.graphStatistics.density}%`,
    "",
    "### Knowledge Graph Insight",
    ...kg.insight.map((x) => `- ${x}`),
    "",
    "### Opportunity Flow",
    ...kg.opportunityFlow.map((x) => `- ${x.label}: ${x.value}`),
    "",
    "### Dependency Summary",
    ...(kg.dependencyGraph.edges.length ? kg.dependencyGraph.edges.slice(0, 20).map((x) => `- ${labelFromResearchId(kg.dependencyGraph.nodes, x.source)} -> ${labelFromResearchId(kg.dependencyGraph.nodes, x.target)} / ${x.label}`) : ["- No Research dependency detected."]),
    "",
    "### Graph Statistics",
    `- Engine Count: ${kg.graphStatistics.engineCount}`,
    `- Research Count: ${kg.graphStatistics.researchCount}`,
    `- Condition Count: ${kg.graphStatistics.conditionCount}`,
    `- Session Count: ${kg.graphStatistics.sessionCount}`,
    `- TopNG Count: ${kg.graphStatistics.topNgCount}`,
    `- Connected Components: ${kg.graphStatistics.connectedComponents}`
  ].join("\n");
}

function workspaceMarkdown(workspace) {
  if (!workspace) return ["## Research Workspace", "", "- Workspace module is not loaded."].join("\n");
  return [
    "## Research Workspace",
    "",
    "### Workspace Summary",
    `- Today's Focus: ${workspace.summary.title}`,
    `- Reason: ${workspace.summary.reason}`,
    `- Next: ${workspace.summary.next}`,
    `- Queue: ${workspace.summary.queueCount}`,
    `- Bookmarks: ${workspace.summary.bookmarkCount}`,
    `- Pinned: ${workspace.summary.pinCount}`,
    `- Recent Activity: ${workspace.summary.recentActivityCount}`,
    "",
    "### Today's Focus",
    ...(workspace.focus.length ? workspace.focus.map((x, i) => `- ${i + 1}. ${x.title} / ${x.researchScore} / ${x.reason}`) : ["- No focus yet."]),
    "",
    "### Bookmark",
    ...(workspace.bookmarks.length ? workspace.bookmarks.map((x) => `- ${x.type}: ${x.label}`) : ["- No bookmarks."]),
    "",
    "### Pinned",
    ...(workspace.pins.length ? workspace.pins.map((x) => `- ${x.type}: ${x.label}`) : ["- No pinned items."]),
    "",
    "### Recent Activity",
    ...(workspace.recentActivity.length ? workspace.recentActivity.map((x) => `- ${formatDate(x.at)} / ${x.type}: ${x.title} / ${x.detail || "-"}`) : ["- No recent activity."])
  ].join("\n");
}

function productivityMarkdown() {
  const history = loadResearchHistory();
  const favorite = getFavoriteEngine();
  const favoriteData = getEngineSummary(favorite);
  const cards = getDashboardCards();
  const previous = history.length >= 2 ? snapshotDiff(history.at(-2), history.at(-1)) : null;
  return [
    "## Research Productivity v6.1",
    "",
    "### Favorite Engine",
    `- Engine: ${favorite || "-"}`,
    `- Trades: ${favoriteData?.trade?.trades || 0}`,
    `- WinRate: ${round(favoriteData?.trade?.winRate || 0)}%`,
    `- TimeOK: ${favoriteData?.activity?.timeOk || 0}`,
    `- EntryRate: ${round(favoriteData?.activity?.entryRate || 0)}%`,
    "",
    "### Snapshot Compare",
    previous ? `- Previous Snapshot: Trades ${signed(previous.trades)}, NearMiss ${signed(previous.nearMiss)}, WinRate ${signed(round(previous.winRate))}%, PF ${signed(round(previous.profitFactor))}` : "- Previous Snapshot: Need at least two snapshots.",
    "",
    "### Dashboard Customize",
    ...cards.map((card, index) => `- ${index + 1}. ${card.label}: ${card.visible ? "ON" : "OFF"}`),
    "",
    "### Export",
    "- Export All includes Markdown, JSON snapshot, and CSV summary.",
    "- This is Research export only. It does not rewrite EA, CSV, or trading conditions."
  ].join("\n");
}

function hypothesisMarkdown(hypothesis) {
  if (!hypothesis) return ["## Research Hypothesis", "", "- Hypothesis module is not loaded."].join("\n");
  return [
    "## Research Hypothesis",
    "",
    "### Hypothesis Summary",
    `- Total: ${hypothesis.hypothesisSummary.total}`,
    `- Top: ${hypothesis.hypothesisSummary.topTitle}`,
    `- Top Score: ${hypothesis.hypothesisSummary.topScore}/100`,
    `- Top Confidence: ${hypothesis.hypothesisSummary.topConfidence}`,
    `- Verified: ${hypothesis.hypothesisSummary.verified}`,
    `- Rejected: ${hypothesis.hypothesisSummary.rejected}`,
    "",
    "### Hypothesis List",
    ...hypothesis.hypotheses.map((h) => `- ${h.title}: ${h.status} / ${h.confidence} / ${h.score}/100 / ${h.hypothesis}`),
    "",
    "### Evidence",
    `- Total: ${hypothesis.evidenceSummary.total}`,
    `- Support: ${hypothesis.evidenceSummary.support}`,
    `- Neutral: ${hypothesis.evidenceSummary.neutral}`,
    `- Contradiction: ${hypothesis.evidenceSummary.contradiction}`,
    ...hypothesis.evidenceSummary.bySource.map((x) => `- ${x.name}: ${x.count}`),
    "",
    "### Contradictions",
    ...(hypothesis.contradictions.length ? hypothesis.contradictions.map((x) => `- ${x.hypothesis} / ${x.source}: ${x.title} = ${x.value} / ${x.reason}`) : ["- No contradictions detected."]),
    "",
    "### Open Questions",
    ...(hypothesis.openQuestions.length ? hypothesis.openQuestions.map((x) => `- ${x.question}: ${x.count}`) : ["- No open questions detected."])
  ].join("\n");
}

function hypothesisLineageMarkdown(lineage) {
  if (!lineage) return ["## Hypothesis Lineage Summary", "", "- Hypothesis Lineage module is not loaded."].join("\n");
  const s = lineage.hypothesisLineageSummary || {};
  return [
    "## Hypothesis Lineage Summary",
    "",
    `- Hypothesis Count: ${lineage.lineagesStatistics?.hypothesisCount || 0}`,
    `- Relation Count: ${lineage.lineagesStatistics?.relationCount || 0}`,
    `- Largest Family: ${s.largestFamily || "-"}`,
    `- Most Connected Hypothesis: ${s.mostConnectedHypothesis || "-"}`,
    `- Orphan Count: ${s.orphanCount || 0}`,
    `- Duplicate Candidate Count: ${s.duplicateCandidateCount || 0}`,
    `- Average Weighted Evidence: ${s.averageWeightedEvidence || 0}`,
    `- Average Validation Readiness: ${s.averageValidationReadiness || 0}%`,
    `- Top Score 2.0: ${s.topScore2 || 0}`,
    `- Top Confidence Percent: ${s.topConfidencePercent || 0}%`,
    "",
    "## Evidence Weighting",
    "",
    ...(lineage.weightedEvidenceSummary?.bySource || []).map((x) => `- ${x.source}: Weight ${x.weight} / Evidence ${x.evidenceCount} / Weighted Score ${x.weightedScore}`),
    "",
    "## Hypothesis Score 2.0",
    "",
    ...(lineage.hypothesisScore2 || []).slice(0, 10).map((x) => `- ${x.title}: Score ${x.score}/100 / Confidence ${x.confidencePercent}% / Weighted Evidence ${x.weightedEvidence} / Validation ${x.validationReadiness}% / Contradictions ${x.contradictions} / Open Questions ${x.openQuestions}`),
    "",
    "## Hypothesis Families",
    "",
    ...(lineage.hypothesisFamilies || []).map((x) => `- ${x.name}: Root ${x.rootHypothesis} / Count ${x.hypothesisCount} / Verified ${x.verifiedCount} / Rejected ${x.rejectedCount} / Avg Score ${x.averageScore}`),
    "",
    "## Hypothesis Relations",
    "",
    ...((lineage.hypothesisRelations || []).length ? lineage.hypothesisRelations.map((x) => `- ${x.sourceId} / ${x.relationType} / ${x.targetId} / ${x.note || "-"}`) : ["- No relations registered."]),
    "",
    "## Hypothesis History",
    "",
    ...((lineage.hypothesisHistory || []).slice(0, 30).map((x) => `- ${formatDate(x.date)} / ${x.hypothesis} / ${x.eventType} / ${x.before || "-"} -> ${x.after || "-"} / ${x.note || "-"}`)),
    "",
    "## Duplicate Candidates",
    "",
    ...((lineage.duplicateHypotheses || []).length ? lineage.duplicateHypotheses.map((x) => `- ${x.sourceTitle} / ${x.targetTitle} / ${x.similarity}%`) : ["- No duplicate candidates."]),
    "",
    "## Orphan Hypotheses",
    "",
    ...((lineage.orphanHypotheses || []).length ? lineage.orphanHypotheses.map((x) => `- ${x.title}: ${x.suggestedRelationCandidate}`) : ["- No orphan hypotheses."]),
    "",
    "## Superseded Hypotheses",
    "",
    ...((lineage.supersededHypotheses || []).length ? lineage.supersededHypotheses.map((x) => `- ${x.title}: superseded by ${x.supersededBy} / ${x.note}`) : ["- No superseded hypotheses."])
  ].join("\n");
}

function researchStrategyMarkdown(strategy) {
  if (!strategy) return ["## Research Strategy", "", "- Research Strategy module is not loaded."].join("\n");
  const s = strategy.strategySummary || {};
  return [
    "## Research Strategy",
    "",
    `- Current Best Research: ${s.currentBestResearch || "-"}`,
    `- Highest ROI: ${s.highestROI || "-"}`,
    `- Highest Impact: ${s.highestImpact || "-"}`,
    `- Lowest Cost: ${s.lowestCost || "-"}`,
    `- Current Blocker: ${s.currentBlocker || "-"}`,
    `- Coverage: ${s.coverage || "-"}`,
    `- Roadmap: ${s.roadmap || "-"}`,
    "",
    "### Priority Matrix",
    ...strategy.priorityMatrix.map((x) => `- ${x.priority}: ${x.count}`),
    "",
    "### ROI",
    ...strategy.researchROI.slice(0, 10).map((x) => `- ${x.title}: Priority ${x.priority} / ROI ${x.researchROI} / Value ${x.expectedResearchValue} / Cost ${x.researchCost} / Risk ${x.researchRisk}`),
    "",
    "### Coverage",
    ...strategy.coverage.map((x) => `- ${x.area}: ${x.coveragePercent}% / ${x.status}`),
    "",
    "### Roadmap",
    ...strategy.roadmap.map((x) => `- Step ${x.step}: ${x.title} / ${x.action} / Blocker ${x.blocker}`),
    "",
    "### Quick Win",
    ...(strategy.quickWin.length ? strategy.quickWin.map((x) => `- ${x.title}: ROI ${x.researchROI} / Cost ${x.researchCost}`) : ["- No quick win candidate."]),
    "",
    "### Long Project",
    ...(strategy.longProject.length ? strategy.longProject.map((x) => `- ${x.title}: Value ${x.expectedResearchValue} / Cost ${x.researchCost}`) : ["- No long project candidate."]),
    "",
    "### Duplicate Research",
    ...(strategy.duplicateResearch.length ? strategy.duplicateResearch.map((x) => `- ${x.source} / ${x.target}: ${x.similarity}%`) : ["- No duplicate Research detected."]),
    "",
    "### Missing Research",
    ...(strategy.missingResearch.length ? strategy.missingResearch.map((x) => `- ${x.area}: ${x.coveragePercent}% / ${x.reason}`) : ["- No missing Research area detected."]),
    "",
    "### Blockers",
    ...(strategy.blockers.length ? strategy.blockers.map((x) => `- ${x.name}: ${x.count}`) : ["- No blockers detected."])
  ].join("\n");
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
