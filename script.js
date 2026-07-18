const engine = new AnalysisEngine();
let charts = {};

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupFileInput();
  setupButtons();
  fillResearchSelects();
  if (byId("researchMemo")) byId("researchMemo").value = loadMemo();
  renderAll();
});

function byId(id) {
  return document.getElementById(id);
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
  on("saveMemoButton", "click", () => {
    saveMemo(byId("researchMemo")?.value || "");
    setText("memoStatus", "Saved");
    setTimeout(() => setText("memoStatus", ""), 1600);
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
  ["filterResearchStatus", "filterResearchCategory", "filterResearchDecision", "researchSearch"].forEach((id) => {
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
  renderResearchManager();
  renderResearchBoard();
  renderPortfolio();
  renderTimeline();
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
  setHtml("labDashboard", [
    researchItem("Best Engine", bestEngine, "Highest current trade performance"),
    researchItem("Most Active Engine", mostActive, "Highest research score from activity"),
    researchItem("Current Research Target", target, engine.results.intelligence[0]?.target || "Load CSV")
  ].join(""));
  renderWarnings();
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
  setHtml("csvManagerTable", table(["CSV", "Exists", "Rows", "Columns", "Updated", "Version", "Validation", "Warnings", "Note"], engine.results.csvManager.map((x) => [x.label, x.exists ? "Yes" : "No", x.rows, x.columns, x.updated ? x.updated.toLocaleString() : "-", x.version, x.validation, x.warnings.join(" / ") || "-", x.replaced ? "Replaced previous file" : "-"])));
  setHtml("csvSpecTable", table(["CSV", "Purpose", "Screen"], CSV_TYPES.map((x) => [x.label, x.description, x.usage])));
}

function renderIntelligence() {
  const top = engine.results.intelligence[0];
  setHtml("intelligenceHero", top ? `<span class="pill">Today's AI Recommendation</span><h3>${top.stars} ${escapeHtml(top.title)}</h3><p><strong>${escapeHtml(top.target)}</strong> - ${escapeHtml(top.reason)}</p>` : `<span class="pill">Research Intelligence</span><h3>Load CSV to generate Research candidates.</h3><p>This lab shows Research candidates, not trading-condition changes.</p>`);
  setHtml("researchSuggestions", engine.results.intelligence.map((s, i) => `<div class="suggestion"><div class="stars">${s.stars}</div><div><h4>${escapeHtml(s.title)}</h4><p><span class="tag">${escapeHtml(s.target)}</span></p><p>${escapeHtml(s.reason)}</p><button class="mini-button add-research" data-index="${i}">Add to Research Manager</button></div></div>`).join("") || `<div class="empty">No Research candidates yet.</div>`);
  document.querySelectorAll(".add-research").forEach((button) => {
    button.addEventListener("click", () => {
      const suggestion = engine.results.intelligence[Number(button.dataset.index)];
      if (!suggestion) return;
      researchManager.createFromSuggestion(suggestion, analyzerSnapshot());
      renderResearchManager();
      renderResearchBoard();
      renderPortfolio();
      activateTab("researchManager");
    });
  });
  if (byId("chatgptPrompt")) byId("chatgptPrompt").value = engine.getPrompt();
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

function fillResearchSelects() {
  fillSelect("researchCategory", RESEARCH_CATEGORIES);
  fillSelect("filterResearchCategory", ["All", ...RESEARCH_CATEGORIES]);
  fillSelect("researchStatus", RESEARCH_STATUSES);
  fillSelect("filterResearchStatus", ["All", ...RESEARCH_STATUSES]);
  fillSelect("filterResearchDecision", ["All", ...RESEARCH_DECISIONS]);
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
    sourceAnalyzerSnapshot: analyzerSnapshot()
  });
  setInput("researchTitle", "");
  researchManager.selectedId = item.id;
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
    search: valueOf("researchSearch")
  });
  setHtml("researchList", rows.length ? `<table><thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Score</th><th>Health</th><th>Next Action</th><th>Open</th></tr></thead><tbody>${rows.map((item) => `<tr><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.priority)}</td><td>${escapeHtml(item.researchScore)}</td><td>${escapeHtml(researchHealth(item))}</td><td>${escapeHtml(nextAction(item))}</td><td><button class="mini-button open-research" data-id="${escapeHtml(item.id)}">Open</button></td></tr>`).join("")}</tbody></table>` : `<div class="empty">No research items yet. Add a candidate from Research Intelligence or create one manually.</div>`);
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
    <h3>${escapeHtml(item.title)}</h3>
    <p><span class="tag">${escapeHtml(item.category)}</span> <span class="tag">${escapeHtml(item.status)}</span> <span class="tag">${escapeHtml(item.priority)}</span> <span class="tag">${escapeHtml(item.decision)}</span></p>
    <div class="metric-grid">${metrics([["Progress", `${researchProgress(item)}%`], ["Health", researchHealth(item)], ["Score", item.researchScore], ["Confidence", item.confidence]])}</div>
    <h4>Hypothesis</h4><textarea id="detailHypothesis">${escapeHtml(item.hypothesis)}</textarea>
    <h4>Validation Plan</h4><textarea id="detailValidation">${escapeHtml(item.validationPlan)}</textarea>
    <h4>Success Criteria</h4><textarea id="detailSuccess">${escapeHtml(item.successCriteria)}</textarea>
    <h4>Failure Criteria</h4><textarea id="detailFailure">${escapeHtml(item.failureCriteria)}</textarea>
    <h4>Result Summary</h4><textarea id="detailResult">${escapeHtml(item.resultSummary)}</textarea>
    <p><strong>Required Data:</strong> ${escapeHtml(item.requiredData || "-")}</p>
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
    ${table(["At", "Note"], (item.evidence || []).map((e) => [new Date(e.at).toLocaleString(), e.note]))}
  `);
  on("saveResearchDetail", "click", () => {
    researchManager.update(item.id, {
      hypothesis: valueOf("detailHypothesis"),
      validationPlan: valueOf("detailValidation"),
      successCriteria: valueOf("detailSuccess"),
      failureCriteria: valueOf("detailFailure"),
      resultSummary: valueOf("detailResult")
    });
    renderResearchManager();
    renderResearchBoard();
    renderPortfolio();
  });
  on("addResearchEvidence", "click", () => {
    const note = window.prompt("Evidence note");
    if (!note) return;
    researchManager.addEvidence(item.id, note);
    renderResearchManager();
    renderResearchBoard();
    renderPortfolio();
  });
  on("downloadResearchMarkdown", "click", () => downloadText(`${safeFileName(item.title)}.md`, researchItemMarkdown(item), "text/markdown"));
  document.querySelectorAll(".decision-button").forEach((button) => button.addEventListener("click", () => {
    researchManager.setDecision(item.id, button.dataset.decision, valueOf("detailResult"));
    renderResearchManager();
    renderResearchBoard();
    renderPortfolio();
  }));
}

function renderResearchBoard() {
  if (!byId("researchBoardView")) return;
  const boardStatuses = ["Backlog", "Hypothesis", "Ready", "Collecting Data", "Testing", "Review", "Completed"];
  setHtml("researchBoardView", boardStatuses.map((status) => {
    const items = researchManager.items.filter((item) => item.status === status);
    return `<div class="board-column"><h4>${escapeHtml(status)} <span>${items.length}</span></h4>${items.map(researchCard).join("") || `<div class="empty">No items.</div>`}</div>`;
  }).join(""));
  document.querySelectorAll(".move-research").forEach((button) => button.addEventListener("click", () => {
    researchManager.update(button.dataset.id, { status: button.dataset.status });
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
    Review: "Completed"
  }[item.status];
  return `<div class="research-card"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.engine || item.condition || item.session || item.category)}</p><p>${escapeHtml(item.researchScore)} / ${escapeHtml(item.priority)}</p>${next ? `<button class="mini-button move-research" data-id="${escapeHtml(item.id)}" data-status="${escapeHtml(next)}">Move to ${escapeHtml(next)}</button>` : ""}</div>`;
}

function renderPortfolio() {
  if (!byId("portfolioMetrics")) return;
  const p = researchManager.portfolio();
  setHtml("portfolioMetrics", metrics([["Total", p.total], ["Adopted", p.adopted], ["Rejected", p.rejected], ["On Hold", p.onHold], ["Stale", p.stale], ["Critical", p.critical]]));
  setHtml("priorityMatrix", priorityMatrixHtml());
  const rec = researchManager.recommended();
  setHtml("nextResearchRecommendation", rec ? `<div class="suggestion"><div class="stars">${escapeHtml(rec.researchScore)}</div><div><h4>${escapeHtml(rec.title)}</h4><p>${escapeHtml(nextAction(rec))}</p><p><span class="tag">${escapeHtml(rec.priority)}</span> <span class="tag">${escapeHtml(rec.confidence)}</span></p></div></div>` : `<div class="empty">No active research recommendation.</div>`);
  setHtml("staleResearchTable", table(["Title", "Status", "Updated", "Next Action"], researchManager.stale().map((item) => [item.title, item.status, new Date(item.updatedAt).toLocaleString(), nextAction(item)])));
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
  downloadText("ScalpLayer_Research_Manager.json", JSON.stringify(ResearchStorage.exportBundle(researchManager.items, researchManager.settings), null, 2), "application/json");
}

async function importResearchManager(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const result = ResearchStorage.importBundle(text);
  if (!result.ok) {
    window.alert(result.error);
    return;
  }
  researchManager.items = result.items;
  researchManager.selectedId = result.items[0]?.id || "";
  renderResearchManager();
  renderResearchBoard();
  renderPortfolio();
}

function analyzerSnapshot() {
  return {
    datetime: new Date().toISOString(),
    files: Array.from(engine.files.keys()),
    dashboard: engine.results.dashboard,
    topIntelligence: engine.results.intelligence.slice(0, 5),
    topNg: engine.results.nearMiss.ngReasons?.slice(0, 10) || [],
    dataset: engine.results.datasetSummary || null
  };
}

function researchItemMarkdown(item) {
  return [
    `# ${item.title}`,
    "",
    `- Category: ${item.category}`,
    `- Status: ${item.status}`,
    `- Priority: ${item.priority}`,
    `- Research Score: ${item.researchScore}`,
    `- Confidence: ${item.confidence}`,
    `- Decision: ${item.decision}`,
    "",
    "## Hypothesis",
    item.hypothesis || "-",
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
    "## Evidence",
    ...(item.evidence?.length ? item.evidence.map((e) => `- ${e.at}: ${e.note}`) : ["- No evidence yet."]),
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

function downloadHistory() { downloadText("ResearchHistory.json", JSON.stringify(loadResearchHistory(), null, 2), "application/json"); }
function downloadMarkdownReport() { downloadText("ResearchReport.md", buildMarkdownReport(engine.results, byId("researchMemo")?.value || ""), "text/markdown"); }
function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
