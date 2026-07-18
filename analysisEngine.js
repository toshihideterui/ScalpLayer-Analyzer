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
      intelligence: [],
      report: {},
      condition: [],
      heatmaps: {},
      progress: {},
      comparison: null,
      timeline: [],
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
    saveResearchSnapshot(this.results);
    this.results.timeline = loadResearchHistory();
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
    this.results.engineActivity = analyzeEngineActivity(this.datasets.engineActivity, this.results.tradeByEngine);
    this.results.nearMiss = analyzeNearMiss(this.datasets.nearMiss);
    this.results.session = analyzeSessionResearch(this.datasets.sessionResearch, this.results.trades, this.datasets.nearMiss);
    this.results.signal = analyzeSignals(this.datasets.signalLog, this.results.trades);
    this.results.intelligence = buildResearchIntelligence(this.results);
    this.results.condition = analyzeConditions(this.results);
    this.results.heatmaps = buildHeatmaps(this.results);
    this.results.progress = analyzeResearchProgress(this.results);
    this.results.report = buildResearchReport(this.results);
    this.results.comparison = compareWithPrevious(this.results);
    this.results.timeline = loadResearchHistory();
    this.results.csvManager = buildCsvManager(Array.from(this.files.values()));
  }

  getRows(key) {
    return this.files.get(key)?.rows || [];
  }

  getPrompt() {
    const top = this.results.intelligence.slice(0, 8);
    const lines = [
      "Analyze this ScalpLayer Analyzer v3.0 result.",
      "",
      "Goal:",
      "Find Research candidates from real CSV data. Do not suggest immediate trading-condition changes.",
      "",
      "Research Report:",
      this.results.report?.text || "No report.",
      "",
      "Top Research Candidates:"
    ];
    top.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.stars} ${s.title}`);
      lines.push(`Target: ${s.target}`);
      lines.push(`Reason: ${s.reason}`);
    });
    lines.push("");
    lines.push("Please analyze Trade, NearMiss, TopNG, Session, Condition, Engine Health, and Research Timeline. Propose the next Research direction only.");
    return lines.join("\n");
  }
}

class AIAnalysisEngine {
  constructor(provider = "none") {
    this.provider = provider;
  }

  async analyze() {
    return {
      provider: this.provider,
      enabled: false,
      message: "Future AI connector placeholder. v3.0 does not call external AI APIs."
    };
  }
}

const CSV_TYPES = [
  { key: "tradeHistory", names: ["tradehistory.csv"], label: "TradeHistory.csv", version: "v1", description: "Executed trade history", usage: "Dashboard / Trade" },
  { key: "nearMiss", names: ["nearmisshistory.csv"], label: "NearMissHistory.csv", version: "v1", description: "NearMiss records before FullSignal", usage: "NearMiss / Research Intelligence" },
  { key: "engineActivityV2", names: ["engineactivity_v2.csv"], label: "EngineActivity_v2.csv", version: "v2", description: "Engine activity stats with EntryRate", usage: "Engine / Research Intelligence" },
  { key: "engineActivity", names: ["engineactivity.csv"], label: "EngineActivity.csv", version: "v1", description: "Engine activity stats", usage: "Engine / Research Intelligence" },
  { key: "engineRuntime", names: ["engineruntime.csv"], label: "EngineRuntime.csv", version: "v1", description: "Engine ACTIVE / WAIT history", usage: "CSV Manager" },
  { key: "sessionResearch", names: ["sessionresearch.csv"], label: "SessionResearch.csv", version: "v1", description: "Session and Engine condition stats", usage: "Session" },
  { key: "signalLog", names: ["scalplayer_integrated_signal_log.csv", "signallog.csv"], label: "ScalpLayer_Integrated_signal_log.csv", version: "v1", description: "Signal history", usage: "Signal" }
];

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
      if (row.some((v) => String(v).trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((v) => String(v).trim() !== "")) rows.push(row);
  }
  const headers = (rows.shift() || []).map((h) => h.trim());
  const objects = rows.map((values) => {
    const obj = {};
    headers.forEach((header, index) => obj[header] = values[index] ?? "");
    return obj;
  });
  return { headers, rows: objects };
}

function detectCsvType(name, headers) {
  const lower = name.toLowerCase();
  const hit = CSV_TYPES.find((type) => type.names.includes(lower));
  if (hit) return hit;
  const headerText = headers.join(",").toLowerCase();
  if (headerText.includes("nearmiss")) return CSV_TYPES.find((t) => t.key === "nearMiss");
  if (headerText.includes("fullsignaltruecount")) return CSV_TYPES.find((t) => t.key === "engineActivityV2");
  if (headerText.includes("engine") && headerText.includes("entry") && headerText.includes("exit")) return CSV_TYPES.find((t) => t.key === "tradeHistory");
  return { key: `unknown:${lower}`, names: [lower], label: name, version: "unknown", description: "Unknown CSV", usage: "CSV Manager" };
}

function normalizeTrades(rows) {
  return rows.map((row, index) => {
    const pips = num(pick(row, ["Pips", "pips", "ProfitPips"]));
    const profit = num(pick(row, ["Profit", "ProfitYen"]));
    const engine = clean(pick(row, ["Engine", "engine", "Rule"]));
    const side = clean(pick(row, ["BUYSELL", "Side", "Direction"]));
    const date = clean(pick(row, ["Date"]));
    const time = clean(pick(row, ["Time"]));
    const datetime = parseDateTime(date, time);
    return {
      id: index + 1,
      date,
      time,
      datetime,
      engine: engine || "Unknown",
      side: side || "Unknown",
      entry: num(pick(row, ["Entry", "EntryPrice", "OpenPrice"])),
      exit: num(pick(row, ["Exit", "ExitPrice", "ClosePrice"])),
      pips,
      profit,
      holding: num(pick(row, ["HoldingMinutes", "Holding", "HoldingTime"])),
      rsi: num(pick(row, ["RSI"])),
      atr: num(pick(row, ["ATR"])),
      spread: num(pick(row, ["Spread", "SpreadPips"])),
      volume: num(pick(row, ["Volume", "VolumeRatio"])),
      bb: clean(pick(row, ["BB", "BBPosition"])),
      session: clean(pick(row, ["Session"])) || classifySession(datetime),
      result: pips > 0 ? "Win" : pips < 0 ? "Lose" : "Flat"
    };
  });
}

function analyzeDashboard(trades) {
  const wins = trades.filter((t) => t.pips > 0);
  const losses = trades.filter((t) => t.pips < 0);
  const grossWin = sum(wins, "pips");
  const grossLoss = Math.abs(sum(losses, "pips"));
  return {
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: ratio(wins.length, trades.length),
    profitFactor: grossLoss ? grossWin / grossLoss : grossWin > 0 ? 999 : 0,
    totalPips: sum(trades, "pips"),
    totalProfit: sum(trades, "profit"),
    expectancy: avg(trades, "pips"),
    averageWin: avg(wins, "pips"),
    averageLoss: avg(losses, "pips"),
    largestWin: max(trades.map((t) => t.pips)),
    largestLoss: min(trades.map((t) => t.pips)),
    averageHolding: avg(trades, "holding"),
    maxDD: calcDrawdown(trades.map((t) => t.pips)),
    researchStatus: researchStatus(trades.length)
  };
}

function groupTradePerformance(trades, key) {
  const grouped = groupBy(trades, (t) => t[key] || "Unknown");
  return Object.entries(grouped).map(([name, list]) => {
    const wins = list.filter((t) => t.pips > 0);
    const losses = list.filter((t) => t.pips < 0);
    return {
      name,
      trades: list.length,
      wins: wins.length,
      losses: losses.length,
      winRate: ratio(wins.length, list.length),
      profit: sum(list, "profit"),
      pips: sum(list, "pips"),
      averagePips: avg(list, "pips"),
      averageWin: avg(wins, "pips"),
      averageLoss: avg(losses, "pips"),
      averageHolding: avg(list, "holding"),
      streakWin: maxStreak(list, true),
      streakLoss: maxStreak(list, false)
    };
  }).sort((a, b) => b.pips - a.pips);
}

function analyzeEngineActivity(rows, tradeByEngine) {
  const latest = new Map();
  rows.forEach((row) => latest.set(clean(pick(row, ["Engine"])) || "Unknown", row));
  return Array.from(latest.entries()).map(([engine, row]) => {
    const checks = num(pick(row, ["CheckCount", "Checks"]));
    const timeOk = num(pick(row, ["TimeOKCount", "TimeOK"]));
    const full = num(pick(row, ["FullSignalTrueCount", "FullSignal"]));
    const entries = num(pick(row, ["PositionOpenedCount", "Entries", "OrderSuccessCount"]));
    const entryRate = num(pick(row, ["EntryRate"])) || ratio(entries, timeOk);
    const topNg = topNgFromRow(row);
    const trade = tradeByEngine.find((x) => normalizeName(x.name) === normalizeName(engine));
    const score = researchScore2({ trade, checks, timeOk, full, entries, entryRate, topNg });
    return {
      engine,
      enabled: clean(pick(row, ["Enabled"])) || "true",
      timeWindowEnter: num(pick(row, ["TimeWindowEnterCount"])),
      checks,
      timeOk,
      full,
      falseCount: num(pick(row, ["FullSignalFalseCount"])),
      attempts: num(pick(row, ["OrderAttemptCount"])),
      success: num(pick(row, ["OrderSuccessCount"])),
      failed: num(pick(row, ["OrderFailedCount"])),
      entries,
      closed: num(pick(row, ["PositionClosedCount"])),
      entryRate,
      topNg,
      health: engineHealth({ checks, timeOk, full, entries, topNg, trade }),
      researchScore: stars(score),
      score,
      trade
    };
  }).sort((a, b) => b.score - a.score);
}

function analyzeNearMiss(rows) {
  const buckets = { one: 0, two: 0, threePlus: 0 };
  const byEngine = {};
  const ngReasons = {};
  const combos = {};
  rows.forEach((row) => {
    const engine = clean(pick(row, ["Engine"])) || "Unknown";
    const reasons = splitReasons(clean(pick(row, ["NGReasons", "NGReason", "TopNG"])));
    const ngCount = num(pick(row, ["NGCount"])) || reasons.length || 1;
    if (ngCount <= 1) buckets.one++;
    else if (ngCount === 2) buckets.two++;
    else buckets.threePlus++;
    byEngine[engine] = (byEngine[engine] || 0) + 1;
    reasons.forEach((r) => ngReasons[r] = (ngReasons[r] || 0) + 1);
    const combo = reasons.length ? reasons.map(normalizeConditionName).sort().join("+") : "Unknown";
    combos[combo] = (combos[combo] || 0) + 1;
  });
  const closestEngine = Object.entries(byEngine).sort((a, b) => b[1] - a[1])[0] || ["None", 0];
  return { total: rows.length, buckets, byEngine: toRank(byEngine), ngReasons: toRank(ngReasons), combos: toRank(combos), closestEngine: { engine: closestEngine[0], count: closestEngine[1] } };
}

function analyzeSessionResearch(rows, trades, nearRows) {
  const sessionNames = ["Tokyo", "London", "NY", "Other"];
  const tradeGroups = groupBy(trades, (t) => t.session || "Other");
  const nearGroups = groupBy(nearRows, (r) => clean(pick(r, ["Session"])) || "Other");
  const researchGroups = groupBy(rows, (r) => clean(pick(r, ["Session"])) || "Other");
  return sessionNames.map((session) => {
    const ts = tradeGroups[session] || [];
    const ns = nearGroups[session] || [];
    const rs = researchGroups[session] || [];
    const winRate = ratio(ts.filter((t) => t.pips > 0).length, ts.length);
    const score = scoreSession({ trades: ts.length, nearMiss: ns.length, winRate, avgPips: avg(ts, "pips") });
    return {
      session,
      trades: ts.length,
      nearMiss: ns.length,
      winRate,
      averagePips: avg(ts, "pips"),
      profit: sum(ts, "profit"),
      topNg: topNgSession(rs),
      conditionRates: conditionRate(rs),
      researchScore: stars(score),
      score
    };
  }).sort((a, b) => b.score - a.score);
}

function analyzeSignals(rows, trades) {
  const byEngine = {};
  rows.forEach((row) => {
    const engine = clean(pick(row, ["Engine"])) || "Unknown";
    byEngine[engine] = (byEngine[engine] || 0) + 1;
  });
  const entryByEngine = groupTradePerformance(trades, "engine").reduce((acc, item) => {
    acc[normalizeName(item.name)] = item.trades;
    return acc;
  }, {});
  const table = Object.entries(byEngine).map(([engine, signals]) => {
    const entries = entryByEngine[normalizeName(engine)] || 0;
    return { engine, signals, entries, successRate: ratio(entries, signals) };
  }).sort((a, b) => b.signals - a.signals);
  return { totalSignals: rows.length, table };
}

function buildResearchIntelligence(results) {
  const items = [];
  results.engineActivity.forEach((e) => {
    if (e.timeOk > 0 && e.full === 0) {
      items.push(makeSuggestion("Engine Bottleneck Research", e.engine, e.score, `${e.engine}: TimeOK ${e.timeOk}, FullSignal 0. TopNG: ${e.topNg.map((x) => x.name).join(" / ") || "None"}.`));
    }
    e.topNg.slice(0, 3).forEach((ng, idx) => {
      const score = Math.max(2, Math.min(5, Math.round((ng.count / Math.max(1, e.checks)) * 12) + (idx === 0 ? 1 : 0)));
      items.push(makeSuggestion(`${normalizeConditionName(ng.name)} Research`, e.engine, score, `${normalizeConditionName(ng.name)} appears ${ng.count} times as TopNG in ${e.engine}. Treat as Research target, not an immediate condition change.`));
    });
  });
  (results.nearMiss.ngReasons || []).slice(0, 8).forEach((ng, idx) => {
    items.push(makeSuggestion(`${normalizeConditionName(ng.name)} NearMiss Research`, "NearMiss", idx < 2 ? 5 : idx < 5 ? 4 : 3, `NearMiss stopped at ${ng.name} ${ng.count} times.`));
  });
  (results.nearMiss.combos || []).slice(0, 6).forEach((combo, idx) => {
    items.push(makeSuggestion("NearMiss Combo Research", combo.name, idx < 2 ? 5 : 4, `${combo.name} stopped ${combo.count} times.`));
  });
  results.session.forEach((s) => {
    if (s.nearMiss > s.trades) {
      items.push(makeSuggestion("Session Research", s.session, Math.min(5, Math.max(3, Math.round(s.nearMiss / 10))), `${s.session}: Trades ${s.trades}, NearMiss ${s.nearMiss}. TopNG: ${s.topNg.map((x) => x.name).join(" / ") || "None"}.`));
    }
  });
  return dedupeSuggestions(items).sort((a, b) => b.score - a.score).slice(0, 30);
}

function analyzeConditions(results) {
  const names = ["RSI", "ATR", "BB", "Volume", "Spread", "Time", "RecentDrop", "RecentRise", "LowUpdate", "HighUpdate", "BearStreak", "BullStreak"];
  const nearCounts = {};
  const notes = {};
  results.engineActivity.forEach((e) => {
    e.topNg.forEach((ng) => {
      const c = normalizeConditionName(ng.name);
      nearCounts[c] = (nearCounts[c] || 0) + ng.count;
      (notes[c] ||= []).push(`${e.engine}:${ng.count}`);
    });
  });
  (results.nearMiss.ngReasons || []).forEach((ng) => {
    const c = normalizeConditionName(ng.name);
    nearCounts[c] = (nearCounts[c] || 0) + ng.count;
  });
  return names.map((condition) => {
    const trades = results.trades.filter((t) => conditionTradeHit(t, condition)).length;
    const nearMiss = nearCounts[condition] || 0;
    const score = Math.min(5, Math.max(1, Math.round(nearMiss / 25) + (trades > 0 ? 1 : 0)));
    return { condition, trades, nearMiss, topNg: nearMiss, researchScore: stars(score), score, note: notes[condition]?.slice(0, 3).join(" / ") || "-" };
  }).sort((a, b) => b.score - a.score || b.nearMiss - a.nearMiss);
}

function buildHeatmaps(results) {
  const labels = ["RSI", "ATR", "BB", "Volume", "Spread", "Time", "RecentDrop", "RecentRise", "LowUpdate", "HighUpdate", "BearStreak", "BullStreak"];
  const engineRows = results.engineActivity.map((e) => {
    const row = { engine: e.engine };
    labels.forEach((label) => row[label] = 0);
    e.topNg.forEach((ng) => {
      const c = normalizeConditionName(ng.name);
      if (row[c] !== undefined) row[c] += ng.count;
    });
    return row;
  });
  const sessionRows = results.session.map((s) => ({ session: s.session, Trade: s.trades, NearMiss: s.nearMiss, WinRate: round(s.winRate), ResearchScore: s.score }));
  return { ngLabels: labels, engineRows, sessionRows };
}

function analyzeResearchProgress(results) {
  const checks = [
    ["Engine Analysis", results.engineActivity.length > 0],
    ["NearMiss Analysis", (results.nearMiss.total || 0) > 0],
    ["Session Analysis", results.session.some((s) => s.trades || s.nearMiss)],
    ["TopNG Analysis", results.engineActivity.some((e) => e.topNg.length > 0) || (results.nearMiss.ngReasons || []).length > 0],
    ["Trade Analysis", results.trades.length > 0],
    ["Engine Evolution", loadResearchHistory().length >= 2]
  ];
  const done = checks.filter((x) => x[1]).length;
  return { percent: Math.round((done / checks.length) * 100), checks };
}

function buildResearchReport(results) {
  const topEngine = results.engineActivity[0];
  const topNear = results.nearMiss.ngReasons?.[0];
  const topSession = results.session[0];
  const topResearch = results.intelligence[0];
  const lines = ["Today's Research Report", ""];
  if (topEngine) {
    lines.push(`${topEngine.engine} recorded ${topEngine.checks} checks, ${topEngine.timeOk} TimeOK, ${topEngine.full} FullSignal, and ${topEngine.entries} entries.`);
    if (topEngine.topNg.length) lines.push(`Most frequent TopNG: ${topEngine.topNg[0].name} (${topEngine.topNg[0].count}).`);
  } else {
    lines.push("EngineActivity data is not loaded yet.");
  }
  if (results.nearMiss.total) lines.push(`NearMiss total: ${results.nearMiss.total}. Largest bottleneck: ${topNear?.name || "Unknown"} (${topNear?.count || 0}).`);
  if (topSession) lines.push(`Priority session candidate: ${topSession.session}. Trades ${topSession.trades}, NearMiss ${topSession.nearMiss}, Score ${topSession.researchScore}.`);
  if (topResearch) lines.push(`Next Research candidate: ${topResearch.title} / ${topResearch.target} / ${topResearch.stars}.`);
  lines.push("");
  lines.push("This report is not a trading-condition change instruction. Use it as a Research candidate map.");
  return { text: lines.join("\n"), lines };
}

function compareWithPrevious(results) {
  const history = loadResearchHistory();
  if (!history.length) return null;
  const prev = history[history.length - 1];
  return {
    trades: (results.dashboard.totalTrades || 0) - (prev.trades || 0),
    nearMiss: (results.nearMiss.total || 0) - (prev.nearMiss || 0),
    winRate: (results.dashboard.winRate || 0) - (prev.winRate || 0),
    profitFactor: (results.dashboard.profitFactor || 0) - (prev.profitFactor || 0),
    previousTopResearch: prev.topResearch?.[0]?.score || 0,
    currentTopResearch: results.intelligence[0]?.score || 0
  };
}

function buildMarkdownReport(results, memo = "") {
  const lines = ["# ScalpLayer Research Report", "", "## Today's Research Report", "", results.report?.text || "No report.", "", "## Engine Health", ""];
  results.engineActivity.forEach((e) => lines.push(`- ${e.engine}: ${e.health}, Score ${e.researchScore}, TimeOK ${e.timeOk}, Full ${e.full}, Entries ${e.entries}, TopNG ${e.topNg.map((x) => x.name).join(" / ") || "-"}`));
  lines.push("", "## NearMiss", "", `- Total: ${results.nearMiss.total || 0}`);
  (results.nearMiss.ngReasons || []).slice(0, 10).forEach((x) => lines.push(`- ${x.name}: ${x.count}`));
  lines.push("", "## Condition Intelligence", "");
  results.condition.slice(0, 10).forEach((x) => lines.push(`- ${x.condition}: NearMiss ${x.nearMiss}, Trades ${x.trades}, Score ${x.researchScore}`));
  lines.push("", "## Session", "");
  results.session.forEach((s) => lines.push(`- ${s.session}: Trades ${s.trades}, NearMiss ${s.nearMiss}, WinRate ${round(s.winRate)}%, Score ${s.researchScore}`));
  lines.push("", "## Research Candidates", "");
  results.intelligence.slice(0, 10).forEach((x, i) => lines.push(`${i + 1}. ${x.stars} ${x.title} / ${x.target}: ${x.reason}`));
  lines.push("", "## Research Memo", "", memo || "No memo.");
  return lines.join("\n");
}

function makeSuggestion(title, target, score, reason) {
  return { title, target, score, stars: stars(score), reason };
}

function saveResearchSnapshot(results) {
  const history = loadResearchHistory();
  const snapshot = {
    datetime: new Date().toISOString(),
    trades: results.dashboard.totalTrades || 0,
    nearMiss: results.nearMiss.total || 0,
    winRate: results.dashboard.winRate || 0,
    profitFactor: results.dashboard.profitFactor || 0,
    engineRank: results.engineActivity.slice(0, 8).map((x) => ({ name: x.engine, health: x.health, score: x.score, entries: x.entries, timeOk: x.timeOk })),
    topEngines: results.tradeByEngine.slice(0, 5).map((x) => ({ name: x.name, trades: x.trades, pips: round(x.pips), winRate: round(x.winRate) })),
    topResearch: results.intelligence.slice(0, 5).map((x) => ({ title: x.title, target: x.target, score: x.score })),
    topNG: results.nearMiss.ngReasons.slice(0, 5),
    conditionRank: results.condition.slice(0, 8).map((x) => ({ condition: x.condition, score: x.score, nearMiss: x.nearMiss })),
    sessionRank: results.session.slice(0, 4).map((x) => ({ session: x.session, score: x.score, trades: x.trades, nearMiss: x.nearMiss })),
    engineHealth: results.engineActivity.map((x) => ({ engine: x.engine, health: x.health }))
  };
  history.push(snapshot);
  localStorage.setItem("scalplayerResearchHistory", JSON.stringify(history.slice(-100)));
}

function loadResearchHistory() {
  try { return JSON.parse(localStorage.getItem("scalplayerResearchHistory") || "[]"); } catch { return []; }
}

function loadMemo() { return localStorage.getItem("scalplayerResearchMemo") || ""; }
function saveMemo(text) { localStorage.setItem("scalplayerResearchMemo", text || ""); }

function pick(row, keys) {
  for (const key of keys) if (row[key] !== undefined && row[key] !== "") return row[key];
  const lower = {};
  Object.keys(row).forEach((k) => lower[k.toLowerCase()] = row[k]);
  for (const key of keys) {
    const v = lower[key.toLowerCase()];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

function clean(value) { return String(value ?? "").trim(); }
function num(value) { const n = Number(String(value ?? "").replace(/[%円分pips]/g, "").trim()); return Number.isFinite(n) ? n : 0; }
function sum(list, key) { return list.reduce((acc, item) => acc + num(item[key]), 0); }
function avg(list, key) { return list.length ? sum(list, key) / list.length : 0; }
function max(values) { return values.length ? Math.max(...values) : 0; }
function min(values) { return values.length ? Math.min(...values) : 0; }
function ratio(a, b) { return b ? (a / b) * 100 : 0; }
function round(value, digits = 2) { return Number(num(value).toFixed(digits)); }
function groupBy(list, fn) { return list.reduce((acc, item) => { const key = fn(item) || "Unknown"; (acc[key] ||= []).push(item); return acc; }, {}); }

function calcDrawdown(pipsList) {
  let equity = 0, peak = 0, dd = 0;
  pipsList.forEach((p) => { equity += p; peak = Math.max(peak, equity); dd = Math.max(dd, peak - equity); });
  return dd;
}

function maxStreak(list, win) {
  let best = 0, cur = 0;
  list.forEach((t) => { const ok = win ? t.pips > 0 : t.pips < 0; cur = ok ? cur + 1 : 0; best = Math.max(best, cur); });
  return best;
}

function parseDateTime(date, time) {
  const text = `${date || ""} ${time || ""}`.trim().replace(/\./g, "/").replace(/-/g, "/");
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
}

function classifySession(date) {
  if (!date) return "Other";
  const h = date.getHours();
  if (h >= 9 && h < 15) return "Tokyo";
  if (h >= 15 && h < 21) return "London";
  if (h >= 21 || h < 2) return "NY";
  return "Other";
}

function normalizeName(name) { return clean(name).toLowerCase().replace(/\s+/g, "").replace(/_/g, ""); }

function splitReasons(text) {
  return clean(text).replace(/NG/g, "").split(/[\/|;,＋+]/).map((x) => x.trim()).filter(Boolean).map((x) => x.replace(/\s+/g, ""));
}

function toRank(obj) { return Object.entries(obj).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count); }

function topNgFromRow(row) {
  const direct = [];
  for (let i = 1; i <= 3; i++) {
    const name = clean(pick(row, [`TopNG${i}`]));
    const count = num(pick(row, [`TopNG${i}Count`]));
    if (name) direct.push({ name, count });
  }
  if (direct.length) return direct;
  const keys = Object.keys(row).filter((k) => /NG$/i.test(k) || /NGCount$/i.test(k));
  return keys.map((k) => ({ name: k.replace(/Count$/i, ""), count: num(row[k]) })).filter((x) => x.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
}

function topNgSession(rows) {
  const counts = {};
  rows.forEach((row) => {
    for (let i = 1; i <= 3; i++) {
      const name = clean(pick(row, [`TopNG${i}`]));
      const count = num(pick(row, [`TopNG${i}Count`]));
      if (name) counts[name] = (counts[name] || 0) + count;
    }
  });
  return toRank(counts).slice(0, 3);
}

function conditionRate(rows) {
  const fields = ["RSI_OK", "RecentDrop_OK", "RecentRise_OK", "BB_OK", "ATR_OK", "Vol_OK", "Time_OK", "Spread_OK"];
  const totals = {};
  const bars = rows.reduce((acc, row) => acc + num(pick(row, ["Bars", "CheckCount"])), 0);
  fields.forEach((field) => totals[field] = ratio(rows.reduce((acc, row) => acc + num(pick(row, [field])), 0), bars || rows.length));
  return totals;
}

function researchScore2({ trade, checks, timeOk, full, entries, entryRate, topNg }) {
  let score = 1;
  if ((trade?.trades || 0) >= 10 || timeOk >= 50) score++;
  if ((trade?.winRate || 0) >= 55 || full > 0) score++;
  if ((trade?.averagePips || 0) > 0 || entries > 0) score++;
  if (topNg.length || entryRate > 0) score++;
  return Math.min(5, score);
}

function scoreSession({ trades, nearMiss, winRate, avgPips }) {
  let score = 1;
  if (trades >= 10 || nearMiss >= 10) score++;
  if (winRate >= 55) score++;
  if (avgPips > 0) score++;
  if (nearMiss >= trades && nearMiss > 0) score++;
  return Math.min(5, score);
}

function engineHealth({ checks, timeOk, full, entries, topNg, trade }) {
  if (!checks && !timeOk && !entries) return "Inactive";
  if ((trade?.trades || 0) >= 20 && (trade?.winRate || 0) >= 60) return "Excellent";
  if (entries > 0 || full > 0) return "Good";
  if (timeOk > 0 && topNg.length) return "Needs Research";
  return "Stable";
}

function stars(score) {
  const n = Math.max(1, Math.min(5, Math.round(score || 1)));
  return "\u2605".repeat(n) + "\u2606".repeat(5 - n);
}

function researchStatus(trades) {
  if (trades >= 100) return "Excellent";
  if (trades >= 30) return "Good";
  if (trades >= 10) return "Collect More Data";
  return "Insufficient Data";
}

function dedupeSuggestions(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.title}:${item.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildCsvManager(files) {
  return CSV_TYPES.map((type) => {
    const file = files.find((f) => f.type.key === type.key);
    return { label: type.label, exists: Boolean(file), rows: file?.rows.length || 0, columns: file?.headers.length || 0, updated: file?.updated, version: type.version, description: type.description, usage: type.usage };
  });
}

function normalizeConditionName(name) {
  const n = normalizeName(name);
  if (n.includes("rsi")) return "RSI";
  if (n.includes("atr")) return "ATR";
  if (n.includes("bb") || n.includes("bollinger")) return "BB";
  if (n.includes("vol")) return "Volume";
  if (n.includes("spread")) return "Spread";
  if (n.includes("time")) return "Time";
  if (n.includes("recentdrop") || n.includes("drop")) return "RecentDrop";
  if (n.includes("recentrise") || n.includes("rise")) return "RecentRise";
  if (n.includes("low")) return "LowUpdate";
  if (n.includes("high")) return "HighUpdate";
  if (n.includes("bear")) return "BearStreak";
  if (n.includes("bull")) return "BullStreak";
  return clean(name) || "Unknown";
}

function conditionTradeHit(t, name) {
  if (name === "RSI") return t.rsi > 0;
  if (name === "ATR") return t.atr > 0;
  if (name === "BB") return Boolean(t.bb);
  if (name === "Volume") return t.volume > 0;
  if (name === "Spread") return t.spread > 0;
  return false;
}
