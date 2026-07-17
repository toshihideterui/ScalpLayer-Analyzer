class AnalysisEngine {
  constructor() {
    this.files = new Map();
    this.datasets = {};
    this.results = this.emptyResults();
  }

  emptyResults() {
    return {
      dashboard: {},
      trades: [],
      tradeByEngine: [],
      engineActivity: [],
      nearMiss: {},
      session: [],
      signal: {},
      suggestions: [],
      csvManager: []
    };
  }

  async loadFiles(fileList) {
    const files = Array.from(fileList || []);
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".csv")) continue;
      const text = await file.text();
      const parsed = parseCsv(text);
      const type = detectCsvType(file.name, parsed.headers);
      this.files.set(type.key, {
        name: file.name,
        type,
        size: file.size,
        updated: file.lastModified ? new Date(file.lastModified) : null,
        headers: parsed.headers,
        rows: parsed.rows
      });
    }
    this.rebuild();
    return this.results;
  }

  reset() {
    this.files.clear();
    this.datasets = {};
    this.results = this.emptyResults();
  }

  rebuild() {
    this.datasets = {
      tradeHistory: this.getRows("tradeHistory"),
      nearMiss: this.getRows("nearMiss"),
      engineActivity: this.getRows("engineActivityV2").length ? this.getRows("engineActivityV2") : this.getRows("engineActivity"),
      engineRuntime: this.getRows("engineRuntime"),
      sessionResearch: this.getRows("sessionResearch"),
      signalLog: this.getRows("signalLog")
    };

    this.results.trades = normalizeTrades(this.datasets.tradeHistory);
    this.results.dashboard = analyzeDashboard(this.results.trades);
    this.results.tradeByEngine = groupTradePerformance(this.results.trades, "engine");
    this.results.engineActivity = analyzeEngineActivity(this.datasets.engineActivity);
    this.results.nearMiss = analyzeNearMiss(this.datasets.nearMiss);
    this.results.session = analyzeSessionResearch(this.datasets.sessionResearch, this.results.trades, this.datasets.nearMiss);
    this.results.signal = analyzeSignals(this.datasets.signalLog, this.results.trades);
    this.results.suggestions = buildSuggestions(this.results);
    this.results.csvManager = buildCsvManager(Array.from(this.files.values()));
  }

  getRows(key) {
    return this.files.get(key)?.rows || [];
  }

  getPrompt() {
    const top = this.results.suggestions.slice(0, 3);
    const lines = [
      "このScalpLayer Analyzerの結果を分析してください。",
      "",
      "目的:",
      "ScalpLayer USDJPY Integrated EAのリアル運用CSVから、勝ちやすい条件、負けやすい条件、次回Research候補を発見すること。",
      "",
      "Analyzer推奨Research候補:"
    ];
    top.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.engine} / ${s.theme} / Score ${s.stars}`);
      lines.push(`理由: ${s.reason}`);
    });
    lines.push("");
    lines.push("Engine、Session、Spread、Holding、RSI、ATR、BB、NearMiss、TopNGを総合評価してください。");
    lines.push("条件をすぐ緩める提案ではなく、Research vNextで検証すべき仮説として整理してください。");
    return lines.join("\n");
  }
}

const CSV_TYPES = [
  {
    key: "tradeHistory",
    names: ["tradehistory.csv"],
    label: "TradeHistory.csv",
    version: "Research Edition",
    description: "実際の約定・決済履歴",
    usage: "Dashboard / Trade Analysis / Suggestions"
  },
  {
    key: "nearMiss",
    names: ["nearmisshistory.csv"],
    label: "NearMissHistory.csv",
    version: "Session Research v34+",
    description: "あと1〜2条件で不成立だった候補履歴",
    usage: "Near Miss Analysis / Suggestions"
  },
  {
    key: "engineActivityV2",
    names: ["engineactivity_v2.csv"],
    label: "EngineActivity_v2.csv",
    version: "Engine Activity v2",
    description: "Engine別活動統計。EntryRate列あり",
    usage: "Engine Analysis / Suggestions"
  },
  {
    key: "engineActivity",
    names: ["engineactivity.csv"],
    label: "EngineActivity.csv",
    version: "Engine Activity",
    description: "Engine別活動統計",
    usage: "Engine Analysis / Suggestions"
  },
  {
    key: "engineRuntime",
    names: ["engineruntime.csv"],
    label: "EngineRuntime.csv",
    version: "Engine Monitor v35+",
    description: "EngineのACTIVE / WAIT状態履歴",
    usage: "CSV Manager / future runtime view"
  },
  {
    key: "sessionResearch",
    names: ["sessionresearch.csv"],
    label: "SessionResearch.csv",
    version: "Session Research v34+",
    description: "時間帯別・Engine別の条件成立統計",
    usage: "Session Analysis"
  },
  {
    key: "signalLog",
    names: ["scalplayer_integrated_signal_log.csv", "signallog.csv"],
    label: "ScalpLayer_Integrated_signal_log.csv",
    version: "Integrated EA",
    description: "FullSignalや発注候補の記録",
    usage: "Signal Analysis"
  }
];

const engine = new AnalysisEngine();
let charts = {};

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupFileInput();
  setupButtons();
  renderAll();
});

function setupTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      button.classList.add("active");
      const id = button.dataset.tab;
      document.getElementById(id).classList.add("active");
      document.getElementById("pageTitle").textContent = button.textContent;
    });
  });
}

function setupFileInput() {
  const input = document.getElementById("csvFiles");
  input.addEventListener("change", async (e) => {
    await loadFiles(e.target.files);
  });

  const zone = document.getElementById("dropZone");
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });
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
  document.getElementById("samplePromptButton").addEventListener("click", () => {
    activateTab("suggestions");
    document.getElementById("chatgptPrompt").focus();
    document.getElementById("chatgptPrompt").select();
  });
}

async function loadFiles(files) {
  await engine.loadFiles(files);
  renderAll();
}

function activateTab(id) {
  document.querySelector(`.tab[data-tab="${id}"]`)?.click();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const normalized = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const next = normalized[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((v) => v.trim() !== "")) rows.push(row);
  }

  const headers = (rows.shift() || []).map((h) => h.trim());
  const objects = rows.map((values) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] ?? "";
    });
    return obj;
  });
  return { headers, rows: objects };
}

function detectCsvType(name, headers) {
  const lower = name.toLowerCase();
  const found = CSV_TYPES.find((type) => type.names.includes(lower));
  if (found) return found;

  const headerText = headers.join("|").toLowerCase();
  if (headerText.includes("ngreasons") && headerText.includes("okcount")) return CSV_TYPES.find((t) => t.key === "nearMiss");
  if (headerText.includes("timewindowentercount") && headerText.includes("fullsignaltruecount")) return CSV_TYPES.find((t) => t.key === "engineActivityV2");
  if (headerText.includes("entry") && headerText.includes("exit") && headerText.includes("pips")) return CSV_TYPES.find((t) => t.key === "tradeHistory");
  if (headerText.includes("session") && headerText.includes("nearmiss")) return CSV_TYPES.find((t) => t.key === "sessionResearch");
  if (headerText.includes("fullsignal") && headerText.includes("engine")) return CSV_TYPES.find((t) => t.key === "signalLog");
  return { key: `unknown:${lower}`, label: name, version: "Unknown", description: "未分類CSV", usage: "CSV Manager" };
}

function normalizeTrades(rows) {
  return rows.map((row, index) => {
    const pips = num(getAny(row, ["Pips", "pips", "ProfitPips"]));
    const profit = num(getAny(row, ["Profit", "profit", "ProfitYen", "損益円"]));
    const value = Number.isFinite(profit) && profit !== 0 ? profit : pips;
    const date = getAny(row, ["Date", "date"]);
    const time = getAny(row, ["Time", "time"]);
    return {
      id: index + 1,
      date,
      time,
      datetime: parseDateTime(date, time),
      engine: normalizeEngine(getAny(row, ["Engine", "engine", "Rule"])),
      direction: getAny(row, ["BUYSELL", "Direction", "Side", "BUY/SELL"]) || "-",
      entry: num(getAny(row, ["Entry", "EntryPrice"])),
      exit: num(getAny(row, ["Exit", "ExitPrice"])),
      pips,
      profit: Number.isFinite(profit) ? profit : pips,
      value,
      holding: num(getAny(row, ["HoldingMinutes", "Holding", "HoldingTime"])),
      atr: num(getAny(row, ["ATR", "Atr"])),
      rsi: num(getAny(row, ["RSI", "Rsi"])),
      spread: num(getAny(row, ["Spread", "SpreadPips"])),
      volume: num(getAny(row, ["Volume", "Vol"])),
      recentDrop: num(getAny(row, ["RecentDrop"])),
      recentRise: num(getAny(row, ["RecentRise"])),
      bb: getAny(row, ["BB", "BBPosition", "Bb"]),
      session: getAny(row, ["Session"]) || sessionFromTime(time),
      spreadClass: getAny(row, ["SpreadClass"]) || spreadClass(num(getAny(row, ["Spread", "SpreadPips"]))),
      holdingClass: getAny(row, ["HoldingClass"]) || holdingClass(num(getAny(row, ["HoldingMinutes", "Holding"]))),
      result: getAny(row, ["Result"]) || (pips > 0 || profit > 0 ? "Win" : "Lose"),
      reason: getAny(row, ["Reason"])
    };
  }).filter((t) => t.engine !== "-" || Number.isFinite(t.pips) || Number.isFinite(t.profit));
}

function analyzeDashboard(trades) {
  const total = trades.length;
  const wins = trades.filter((t) => t.value > 0);
  const losses = trades.filter((t) => t.value < 0);
  const grossProfit = sum(wins, "value");
  const grossLoss = Math.abs(sum(losses, "value"));
  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? sum(losses, "value") / losses.length : 0;
  return {
    total,
    wins: wins.length,
    losses: losses.length,
    winRate: pct(wins.length, total),
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    totalProfit: sum(trades, "value"),
    avgProfit: total ? sum(trades, "value") / total : 0,
    avgWin,
    avgLoss,
    maxDD: maxDrawdown(trades.map((t) => t.value)),
    expectancy: total ? sum(trades, "pips") / total : 0,
    largestWin: wins.length ? Math.max(...wins.map((t) => t.value)) : 0,
    largestLoss: losses.length ? Math.min(...losses.map((t) => t.value)) : 0,
    avgHolding: avg(trades, "holding")
  };
}

function groupTradePerformance(trades, key) {
  const groups = groupBy(trades, (t) => t[key] || "-");
  return Object.entries(groups).map(([name, items]) => {
    const wins = items.filter((t) => t.value > 0);
    const losses = items.filter((t) => t.value < 0);
    return {
      name,
      trades: items.length,
      wins: wins.length,
      losses: losses.length,
      winRate: pct(wins.length, items.length),
      profit: sum(items, "value"),
      pips: sum(items, "pips"),
      avgProfit: avg(items, "value"),
      avgWin: wins.length ? avg(wins, "value") : 0,
      avgLoss: losses.length ? avg(losses, "value") : 0,
      avgHolding: avg(items, "holding"),
      streak: streaks(items)
    };
  }).sort((a, b) => b.profit - a.profit);
}

function analyzeEngineActivity(rows) {
  const latest = latestSnapshots(rows, ["Date", "Engine"]);
  const groups = groupBy(latest, (r) => normalizeEngine(getAny(r, ["Engine"])));
  return Object.entries(groups).map(([engineName, items]) => {
    const topNg = {};
    for (const item of items) {
      addTopNg(topNg, getAny(item, ["TopNG1"]), num(getAny(item, ["TopNG1Count"])));
      addTopNg(topNg, getAny(item, ["TopNG2"]), num(getAny(item, ["TopNG2Count"])));
      addTopNg(topNg, getAny(item, ["TopNG3"]), num(getAny(item, ["TopNG3Count"])));
    }
    const totals = {
      engine: engineName,
      enabled: items.some((r) => asBool(getAny(r, ["Enabled"]))),
      timeWindowEnter: sumCol(items, "TimeWindowEnterCount"),
      checks: sumCol(items, "CheckCount"),
      timeOk: sumCol(items, "TimeOKCount"),
      full: sumCol(items, "FullSignalTrueCount"),
      fullFalse: sumCol(items, "FullSignalFalseCount"),
      attempts: sumCol(items, "OrderAttemptCount"),
      success: sumCol(items, "OrderSuccessCount"),
      failed: sumCol(items, "OrderFailedCount"),
      entries: sumCol(items, "PositionOpenedCount"),
      closed: sumCol(items, "PositionClosedCount"),
      entryRate: 0,
      topNg: Object.entries(topNg).sort((a, b) => b[1] - a[1]).slice(0, 3)
    };
    totals.entryRate = totals.timeOk ? totals.entries * 100 / totals.timeOk : 0;
    return totals;
  }).sort((a, b) => b.timeOk - a.timeOk);
}

function analyzeNearMiss(rows) {
  const normalized = rows.map((r) => ({
    date: getAny(r, ["Date"]),
    time: getAny(r, ["Time"]),
    session: getAny(r, ["Session"]) || sessionFromTime(getAny(r, ["Time"])),
    engine: normalizeEngine(getAny(r, ["Engine"])),
    direction: getAny(r, ["Direction"]),
    ok: num(getAny(r, ["OKCount"])),
    ng: num(getAny(r, ["NGCount"])),
    reasons: splitReasons(getAny(r, ["NGReasons"])),
    rsi: num(getAny(r, ["RSI"])),
    atr: num(getAny(r, ["ATR"])),
    spread: num(getAny(r, ["Spread"])),
    bb: getAny(r, ["BB"]),
    recentDrop: num(getAny(r, ["RecentDrop"])),
    recentRise: num(getAny(r, ["RecentRise"]))
  }));
  const ng1 = normalized.filter((r) => r.ng === 1).length;
  const ng2 = normalized.filter((r) => r.ng === 2).length;
  const reasonCounts = {};
  const engineCounts = {};
  for (const row of normalized) {
    engineCounts[row.engine] = (engineCounts[row.engine] || 0) + 1;
    for (const reason of row.reasons) {
      if (!reason || reason === "-") continue;
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    }
  }
  const byEngine = Object.entries(engineCounts).map(([engineName, count]) => ({ engine: engineName, count }))
    .sort((a, b) => b.count - a.count);
  return {
    rows: normalized,
    total: normalized.length,
    ng1,
    ng2,
    byEngine,
    reasonRanking: Object.entries(reasonCounts).map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    closest: byEngine[0] || null
  };
}

function analyzeSessionResearch(sessionRows, trades, nearMissRows) {
  const latest = latestSnapshots(sessionRows, ["Date", "Session", "Engine"]);
  const groups = groupBy(latest, (r) => getAny(r, ["Session"]) || "Other");
  const tradePerf = groupTradePerformance(trades, "session");
  const nearGroups = groupBy(nearMissRows, (r) => getAny(r, ["Session"]) || "Other");
  return ["Tokyo", "London", "NY", "Other"].map((session) => {
    const items = groups[session] || [];
    const perf = tradePerf.find((p) => p.name === session) || {};
    const near = nearGroups[session]?.length || 0;
    const bars = sumCol(items, "Bars");
    return {
      session,
      bars,
      trades: perf.trades || 0,
      winRate: perf.winRate || 0,
      profit: perf.profit || 0,
      nearMiss: near,
      rsiRate: pct(sumCol(items, "RSI_OK"), bars),
      bbRate: pct(sumCol(items, "BB_OK"), bars),
      atrRate: pct(sumCol(items, "ATR_OK"), bars),
      volRate: pct(sumCol(items, "Vol_OK"), bars),
      full: sumCol(items, "FullSignalTrue"),
      entries: sumCol(items, "Entries")
    };
  });
}

function analyzeSignals(rows, trades) {
  const normalized = rows.map((r) => ({
    engine: normalizeEngine(getAny(r, ["Engine"])),
    full: asBool(getAny(r, ["FullSignal", "Full", "Signal"])),
    direction: getAny(r, ["Direction", "BUYSELL"])
  }));
  const byEngine = Object.entries(groupBy(normalized, (r) => r.engine)).map(([engineName, items]) => {
    const tradeCount = trades.filter((t) => t.engine === engineName).length;
    return {
      engine: engineName,
      signals: items.length,
      full: items.filter((i) => i.full).length,
      entries: tradeCount,
      entryRate: items.length ? tradeCount * 100 / items.length : 0
    };
  }).sort((a, b) => b.signals - a.signals);
  return {
    total: normalized.length,
    full: normalized.filter((r) => r.full).length,
    byEngine
  };
}

function buildSuggestions(results) {
  const suggestions = [];

  for (const item of results.engineActivity) {
    const top = item.topNg[0];
    if (!top) continue;
    const score = scoreResearchCandidate(item.timeOk, item.full, item.entries, top[1]);
    suggestions.push({
      engine: item.engine,
      theme: `${top[0]}閾値研究`,
      stars: stars(score),
      score,
      reason: `TimeOK ${fmt(item.timeOk)}回に対してFull ${fmt(item.full)}回、Entries ${fmt(item.entries)}回。最大NGは${top[0]} ${fmt(top[1])}回です。`,
      type: "EngineActivity"
    });
  }

  if (results.nearMiss.closest) {
    const c = results.nearMiss.closest;
    suggestions.push({
      engine: c.engine,
      theme: "NearMiss解析",
      stars: stars(Math.min(5, Math.max(2, Math.ceil(c.count / 10)))),
      score: Math.min(5, Math.max(2, Math.ceil(c.count / 10))),
      reason: `NearMissが${fmt(c.count)}件あります。あと1〜2条件で止まる候補を優先的にResearchできます。`,
      type: "NearMiss"
    });
  }

  for (const session of results.session) {
    if (session.nearMiss > 0 && session.trades === 0) {
      suggestions.push({
        engine: `${session.session} Session`,
        theme: "時間帯研究",
        stars: stars(session.nearMiss >= 20 ? 4 : 3),
        score: session.nearMiss >= 20 ? 4 : 3,
        reason: `${session.session}はNearMiss ${fmt(session.nearMiss)}件ですがTradeが少ないため、時間帯別の条件成立率を確認する価値があります。`,
        type: "Session"
      });
    }
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 8);
}

function buildCsvManager(files) {
  return CSV_TYPES.map((type) => {
    const loaded = files.find((f) => f.type.key === type.key || (type.key === "engineActivity" && f.type.key === "engineActivityV2"));
    return {
      file: type.label,
      exists: Boolean(loaded),
      rows: loaded?.rows.length || 0,
      columns: loaded?.headers.length || 0,
      updated: loaded?.updated ? loaded.updated.toLocaleString("ja-JP") : "-",
      version: loaded?.type.version || type.version,
      description: type.description,
      usage: type.usage
    };
  });
}

function renderAll() {
  updateStatus();
  renderDashboard();
  renderTradeAnalysis();
  renderEngineAnalysis();
  renderNearMiss();
  renderSession();
  renderSignal();
  renderSuggestions();
  renderCsvManager();
}

function updateStatus() {
  const loaded = engine.files.size;
  const dot = document.getElementById("statusDot");
  dot.classList.toggle("ready", loaded > 0);
  document.getElementById("statusTitle").textContent = loaded ? `${loaded} CSV loaded` : "CSV未読込";
  document.getElementById("statusText").textContent = loaded ? "解析結果を更新しました。" : "EAが出力したCSVを読み込んでください。";
}

function renderDashboard() {
  const d = engine.results.dashboard;
  const hasTrade = engine.results.trades.length > 0;
  document.getElementById("healthCard").innerHTML = renderHealthCard();
  document.getElementById("dashboardMetrics").innerHTML = [
    metric("総トレード数", fmt(d.total || 0)),
    metric("勝率", `${fmtPct(d.winRate || 0)}%`),
    metric("ProfitFactor", formatPf(d.profitFactor || 0)),
    metric("総利益", money(d.totalProfit || 0)),
    metric("期待値", `${numText(d.expectancy || 0)} pips`),
    metric("最大DD", money(d.maxDD || 0)),
    metric("平均利益", money(d.avgWin || 0)),
    metric("平均損失", money(d.avgLoss || 0))
  ].join("");

  document.getElementById("engineProfitRanking").innerHTML = table(
    ["Engine", "Trades", "WinRate", "Profit", "Avg", "Hold"],
    engine.results.tradeByEngine.map((r) => [r.name, r.trades, `${fmtPct(r.winRate)}%`, money(r.profit), money(r.avgProfit), `${numText(r.avgHolding)}m`]),
    "TradeHistory.csvを読み込むと表示されます。"
  );

  const sessionPerf = groupTradePerformance(engine.results.trades, "session");
  const weekdayPerf = groupTradePerformance(engine.results.trades.map((t) => ({ ...t, weekday: weekdayName(t.datetime) })), "weekday");
  document.getElementById("timeWeekSummary").innerHTML = table(
    ["Type", "Name", "Trades", "WinRate", "Profit"],
    [
      ...sessionPerf.map((r) => ["Session", r.name, r.trades, `${fmtPct(r.winRate)}%`, money(r.profit)]),
      ...weekdayPerf.map((r) => ["Weekday", r.name, r.trades, `${fmtPct(r.winRate)}%`, money(r.profit)])
    ],
    "TradeHistory.csvを読み込むと表示されます。"
  );

  drawLine("equityChart", hasTrade ? cumulativeSeries(engine.results.trades) : [], "Cumulative");
  drawBar("engineProfitChart", engine.results.tradeByEngine.map((r) => r.name), engine.results.tradeByEngine.map((r) => r.profit), "Profit");
}

function renderTradeAnalysis() {
  const rows = engine.results.tradeByEngine;
  document.getElementById("tradeTable").innerHTML = table(
    ["Engine", "Trades", "Win", "Lose", "WinRate", "Profit", "AvgWin", "AvgLoss", "AvgHold", "WinStreak", "LoseStreak"],
    rows.map((r) => [r.name, r.trades, r.wins, r.losses, `${fmtPct(r.winRate)}%`, money(r.profit), money(r.avgWin), money(r.avgLoss), `${numText(r.avgHolding)}m`, r.streak.maxWin, r.streak.maxLoss]),
    "TradeHistory.csvを読み込むと表示されます。"
  );
  drawBar("tradeEngineChart", rows.map((r) => r.name), rows.map((r) => r.winRate), "WinRate %");
  const weekdays = groupTradePerformance(engine.results.trades.map((t) => ({ ...t, weekday: weekdayName(t.datetime) })), "weekday");
  drawBar("weekdayChart", weekdays.map((r) => r.name), weekdays.map((r) => r.winRate), "Weekday WinRate %");
}

function renderEngineAnalysis() {
  const rows = engine.results.engineActivity;
  document.getElementById("engineCards").innerHTML = rows.length ? rows.map((r) => `
    <div class="engine-card">
      <h4>${escapeHtml(r.engine)}</h4>
      <div class="mini-stats">
        <div><span>Checks</span><strong>${fmt(r.checks)}</strong></div>
        <div><span>TimeOK</span><strong>${fmt(r.timeOk)}</strong></div>
        <div><span>Full</span><strong>${fmt(r.full)}</strong></div>
        <div><span>Entries</span><strong>${fmt(r.entries)}</strong></div>
        <div><span>EntryRate</span><strong>${fmtPct(r.entryRate)}%</strong></div>
        <div><span>TopNG</span><strong>${escapeHtml(r.topNg.map(([n]) => n).join(" / ") || "-")}</strong></div>
      </div>
    </div>
  `).join("") : empty("EngineActivity.csv または EngineActivity_v2.csvを読み込むと表示されます。");

  const ngRows = [];
  for (const r of rows) {
    for (const [reason, count] of r.topNg) ngRows.push([r.engine, reason, count]);
  }
  document.getElementById("topNgTable").innerHTML = table(["Engine", "NG Reason", "Count"], ngRows, "TopNGデータがありません。");
}

function renderNearMiss() {
  const n = engine.results.nearMiss;
  document.getElementById("closestEngine").innerHTML = n.closest ? `
    <div class="metric"><span>Engine</span><strong>${escapeHtml(n.closest.engine)}</strong></div>
    <div class="metric"><span>NearMiss</span><strong>${fmt(n.closest.count)}</strong></div>
    <p>このEngineはFullSignal直前まで来ている候補が最も多いです。条件変更ではなく、まずResearch候補として扱います。</p>
  ` : empty("NearMissHistory.csvを読み込むと表示されます。");
  document.getElementById("nearMissTable").innerHTML = table(
    ["NG Reason", "Count"],
    (n.reasonRanking || []).map((r) => [r.reason, r.count]),
    "NearMissデータがありません。"
  );
  drawBar("nearMissChart", ["あと1条件", "あと2条件"], [n.ng1 || 0, n.ng2 || 0], "NearMiss");
}

function renderSession() {
  const rows = engine.results.session;
  document.getElementById("sessionTable").innerHTML = table(
    ["Session", "Bars", "Trades", "WinRate", "Profit", "NearMiss", "RSI%", "BB%", "ATR%", "Vol%"],
    rows.map((r) => [r.session, fmt(r.bars), fmt(r.trades), `${fmtPct(r.winRate)}%`, money(r.profit), fmt(r.nearMiss), `${fmtPct(r.rsiRate)}%`, `${fmtPct(r.bbRate)}%`, `${fmtPct(r.atrRate)}%`, `${fmtPct(r.volRate)}%`]),
    "SessionResearch.csvを読み込むと表示されます。"
  );
  drawBar("sessionChart", rows.map((r) => r.session), rows.map((r) => r.nearMiss), "NearMiss");
  drawMultiBar("sessionConditionChart", rows.map((r) => r.session), [
    { label: "RSI", data: rows.map((r) => r.rsiRate) },
    { label: "BB", data: rows.map((r) => r.bbRate) },
    { label: "ATR", data: rows.map((r) => r.atrRate) },
    { label: "Vol", data: rows.map((r) => r.volRate) }
  ]);
}

function renderSignal() {
  const s = engine.results.signal;
  document.getElementById("signalSummary").innerHTML = `
    ${metric("Signal数", fmt(s.total || 0))}
    ${metric("FullSignal", fmt(s.full || 0))}
  `;
  document.getElementById("signalTable").innerHTML = table(
    ["Engine", "Signals", "Full", "Entries", "EntryRate"],
    (s.byEngine || []).map((r) => [r.engine, fmt(r.signals), fmt(r.full), fmt(r.entries), `${fmtPct(r.entryRate)}%`]),
    "signal_logを読み込むと表示されます。"
  );
  drawBar("signalChart", (s.byEngine || []).map((r) => r.engine), (s.byEngine || []).map((r) => r.signals), "Signals");
}

function renderSuggestions() {
  const rows = engine.results.suggestions;
  document.getElementById("suggestionList").innerHTML = rows.length ? rows.map((s, i) => `
    <article class="suggestion">
      <span class="stars">${s.stars}</span>
      <h3>${i + 1}. ${escapeHtml(s.engine)} / ${escapeHtml(s.theme)}</h3>
      <p>${escapeHtml(s.reason)}</p>
      <span class="pill">${escapeHtml(s.type)}</span>
    </article>
  `).join("") : empty("EngineActivity / NearMiss / SessionResearchを読み込むとResearch候補を表示します。");
  document.getElementById("chatgptPrompt").value = engine.getPrompt();
}

function renderCsvManager() {
  const rows = engine.results.csvManager;
  document.getElementById("csvManagerTable").innerHTML = table(
    ["CSV", "存在", "件数", "列数", "更新日時", "対応Version"],
    rows.map((r) => [r.file, r.exists ? "Yes" : "No", fmt(r.rows), fmt(r.columns), r.updated, r.version]),
    "CSV情報がありません。"
  );
  document.getElementById("csvSpecTable").innerHTML = table(
    ["CSV", "説明", "使用画面"],
    CSV_TYPES.map((r) => [r.label, r.description, r.usage]),
    ""
  );
}

function renderHealthCard() {
  const loaded = engine.files.size;
  const d = engine.results.dashboard;
  const suggestions = engine.results.suggestions;
  if (!loaded) {
    return `<span class="pill">Research Status</span><h3>CSVを読み込むと、EAの健康状態を自動評価します。</h3><p>複数CSVをまとめて読み込めます。存在しないCSVは自動スキップします。</p>`;
  }
  const status = d.total >= 30 ? "Research Ready" : d.total > 0 ? "Collect More Data" : "Runtime Diagnostics";
  const top = suggestions[0];
  return `<span class="pill">${status}</span><h3>${top ? `${escapeHtml(top.engine)} を次回Research候補として優先` : "CSV解析が完了しました"}</h3><p>${top ? escapeHtml(top.reason) : "TradeHistoryが少ない場合はEngineActivityとNearMissを中心に観察してください。"}</p>`;
}

function metric(label, value) {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function table(headers, rows, emptyText) {
  if (!rows || !rows.length) return empty(emptyText);
  return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell ?? "-"))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function empty(text) {
  return `<div class="empty">${escapeHtml(text || "データがありません。")}</div>`;
}

function drawLine(id, values, label) {
  const labels = values.map((_, i) => i + 1);
  chart(id, "line", labels, [{ label, data: values }]);
}

function drawBar(id, labels, values, label) {
  chart(id, "bar", labels, [{ label, data: values }]);
}

function drawMultiBar(id, labels, datasets) {
  chart(id, "bar", labels, datasets);
}

function chart(id, type, labels, datasets) {
  const canvas = document.getElementById(id);
  if (!canvas || typeof Chart === "undefined") return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(canvas, {
    type,
    data: {
      labels,
      datasets: datasets.map((d, i) => ({
        label: d.label,
        data: d.data,
        borderColor: ["#49a9ff", "#48d597", "#f0a33a", "#ff6b77"][i % 4],
        backgroundColor: ["rgba(73,169,255,.35)", "rgba(72,213,151,.35)", "rgba(240,163,58,.35)", "rgba(255,107,119,.35)"][i % 4],
        tension: .28
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#9db5cc" } } },
      scales: {
        x: { ticks: { color: "#9db5cc" }, grid: { color: "rgba(35,64,93,.45)" } },
        y: { ticks: { color: "#9db5cc" }, grid: { color: "rgba(35,64,93,.45)" } }
      }
    }
  });
}

function getAny(row, names) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== "") return row[name];
    const found = Object.keys(row).find((k) => k.toLowerCase() === name.toLowerCase());
    if (found && row[found] !== "") return row[found];
  }
  return "";
}

function num(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(String(value).replace(/[,%円pips分]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function sum(items, key) {
  return items.reduce((acc, item) => acc + num(item[key]), 0);
}

function avg(items, key) {
  return items.length ? sum(items, key) / items.length : 0;
}

function sumCol(items, key) {
  return items.reduce((acc, row) => acc + num(getAny(row, [key])), 0);
}

function pct(part, total) {
  return total ? part * 100 / total : 0;
}

function fmt(value) {
  return Number(value || 0).toLocaleString("ja-JP", { maximumFractionDigits: 0 });
}

function fmtPct(value) {
  return Number(value || 0).toLocaleString("ja-JP", { maximumFractionDigits: 1 });
}

function numText(value) {
  return Number(value || 0).toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

function money(value) {
  return Number(value || 0).toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

function formatPf(value) {
  if (value === Infinity) return "∞";
  return numText(value);
}

function groupBy(items, fn) {
  return items.reduce((acc, item) => {
    const key = fn(item) || "-";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function normalizeEngine(value) {
  const v = String(value || "-").trim();
  const lower = v.toLowerCase().replace(/\s+/g, "");
  if (lower.includes("expansion")) return "Core E Expansion A";
  if (lower.includes("corerulee") || lower === "coreengine" || lower === "core") return "Core Rule E";
  if (lower.includes("candidateg")) return "Candidate G";
  if (lower.includes("morningprime") || lower === "morning") return "Morning Prime";
  if (lower.includes("dayrulea") || lower === "daya") return "Day Rule A";
  if (lower.includes("eveningrulec")) return "Evening Rule C";
  if (lower.includes("honmei17")) return "Honmei17";
  return v || "-";
}

function parseDateTime(date, time) {
  const text = `${date || ""} ${time || ""}`.trim().replace(/\./g, "-").replace(/\//g, "-");
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
}

function weekdayName(date) {
  if (!date) return "-";
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
}

function sessionFromTime(time) {
  const hour = Number(String(time || "").slice(0, 2));
  if (!Number.isFinite(hour)) return "Other";
  if (hour >= 9 && hour < 15) return "Tokyo";
  if (hour >= 15 && hour < 21) return "London";
  if (hour >= 21 || hour < 2) return "NY";
  return "Other";
}

function spreadClass(spread) {
  if (spread < 1) return "0-1";
  if (spread < 2) return "1-2";
  if (spread < 3) return "2-3";
  return "3+";
}

function holdingClass(minutes) {
  if (minutes < 5) return "<5";
  if (minutes < 15) return "5-15";
  if (minutes < 30) return "15-30";
  if (minutes < 60) return "30-60";
  return "60+";
}

function streaks(items) {
  let maxWin = 0, maxLoss = 0, currentWin = 0, currentLoss = 0;
  for (const item of items) {
    if (item.value > 0) {
      currentWin++;
      currentLoss = 0;
    } else if (item.value < 0) {
      currentLoss++;
      currentWin = 0;
    } else {
      currentWin = 0;
      currentLoss = 0;
    }
    maxWin = Math.max(maxWin, currentWin);
    maxLoss = Math.max(maxLoss, currentLoss);
  }
  return { maxWin, maxLoss };
}

function maxDrawdown(values) {
  let peak = 0;
  let equity = 0;
  let dd = 0;
  for (const value of values) {
    equity += num(value);
    peak = Math.max(peak, equity);
    dd = Math.max(dd, peak - equity);
  }
  return dd;
}

function cumulativeSeries(trades) {
  let total = 0;
  return trades.map((t) => {
    total += num(t.value);
    return Number(total.toFixed(2));
  });
}

function latestSnapshots(rows, keys) {
  const map = new Map();
  rows.forEach((row, index) => {
    const key = keys.map((k) => normalizeEngine(getAny(row, [k])) || getAny(row, [k])).join("|");
    map.set(key, { ...row, __index: index });
  });
  return Array.from(map.values());
}

function addTopNg(obj, reason, count) {
  if (!reason || reason === "-" || !count) return;
  obj[reason] = (obj[reason] || 0) + count;
}

function splitReasons(value) {
  return String(value || "")
    .split(/[;|/、\s]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function asBool(value) {
  const v = String(value || "").toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "ok";
}

function scoreResearchCandidate(timeOk, full, entries, topNgCount) {
  let score = 1;
  if (timeOk >= 50) score++;
  if (timeOk >= 150) score++;
  if (full === 0 && topNgCount >= 30) score++;
  if (entries === 0 && timeOk >= 100) score++;
  if (full > 0 || entries > 0) score = Math.max(score, 3);
  return Math.min(5, score);
}

function stars(score) {
  const filled = Math.max(1, Math.min(5, Math.round(score)));
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
