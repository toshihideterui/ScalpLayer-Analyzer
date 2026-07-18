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
    this.results.timeline = loadResearchHistory();
    this.results.csvManager = buildCsvManager(Array.from(this.files.values()));
  }

  getRows(key) {
    return this.files.get(key)?.rows || [];
  }

  getPrompt() {
    const top = this.results.intelligence.slice(0, 5);
    const lines = [
      "このScalpLayer Analyzer v2.0の結果を分析してください。",
      "",
      "目的:",
      "ScalpLayer USDJPY Integrated EAのCSVから、次回Researchで検証すべき候補を整理することです。",
      "",
      "重要:",
      "売買条件をすぐ変更する提案ではなく、Research候補として仮説を作ってください。",
      "",
      "Analyzer推奨Research候補:"
    ];
    top.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.title} / ${s.stars}`);
      lines.push(`対象: ${s.target}`);
      lines.push(`理由: ${s.reason}`);
    });
    lines.push("");
    lines.push("Engine、Session、NearMiss、TopNG、RSI、ATR、BB、Volume、Spread、Holding、曜日、時間帯の観点で、Research vNextの優先順位を提案してください。");
    return lines.join("\n");
  }
}

const CSV_TYPES = [
  { key: "tradeHistory", names: ["tradehistory.csv"], label: "TradeHistory.csv", version: "v1", description: "実際の約定・決済履歴", usage: "Dashboard / Trade" },
  { key: "nearMiss", names: ["nearmisshistory.csv"], label: "NearMissHistory.csv", version: "v1", description: "あと少しで成立しなかった候補履歴", usage: "NearMiss / Research Intelligence" },
  { key: "engineActivityV2", names: ["engineactivity_v2.csv"], label: "EngineActivity_v2.csv", version: "v2", description: "Engine別活動統計。EntryRate列あり", usage: "Engine / Research Intelligence" },
  { key: "engineActivity", names: ["engineactivity.csv"], label: "EngineActivity.csv", version: "v1", description: "Engine別活動統計", usage: "Engine / Research Intelligence" },
  { key: "engineRuntime", names: ["engineruntime.csv"], label: "EngineRuntime.csv", version: "v1", description: "EngineのACTIVE / WAIT履歴", usage: "CSV Manager" },
  { key: "sessionResearch", names: ["sessionresearch.csv"], label: "SessionResearch.csv", version: "v1", description: "時間帯別・Engine別の条件成立統計", usage: "Session" },
  { key: "signalLog", names: ["scalplayer_integrated_signal_log.csv", "signallog.csv"], label: "ScalpLayer_Integrated_signal_log.csv", version: "v1", description: "Signal発生履歴", usage: "Signal" }
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
  return { key: `unknown:${lower}`, names: [lower], label: name, version: "unknown", description: "未定義CSV", usage: "CSV Manager" };
}

function normalizeTrades(rows) {
  return rows.map((row, index) => {
    const pips = num(pick(row, ["Pips", "pips", "ProfitPips", "損益pips"]));
    const profit = num(pick(row, ["Profit", "ProfitYen", "損益円"]));
    const engine = clean(pick(row, ["Engine", "engine", "Rule"]));
    const side = clean(pick(row, ["BUYSELL", "Side", "Direction", "BUY/SELL"]));
    const date = clean(pick(row, ["Date", "日付"]));
    const time = clean(pick(row, ["Time", "時刻"]));
    return {
      id: index + 1,
      date,
      time,
      datetime: parseDateTime(date, time),
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
      session: clean(pick(row, ["Session"])) || classifySession(parseDateTime(date, time)),
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
  rows.forEach((row) => {
    const engine = clean(pick(row, ["Engine"])) || "Unknown";
    latest.set(engine, row);
  });
  return Array.from(latest.entries()).map(([engine, row]) => {
    const checks = num(pick(row, ["CheckCount", "Checks"]));
    const timeOk = num(pick(row, ["TimeOKCount", "TimeOK"]));
    const full = num(pick(row, ["FullSignalTrueCount", "FullSignal"]));
    const entries = num(pick(row, ["PositionOpenedCount", "Entries", "OrderSuccessCount"]));
    const entryRate = num(pick(row, ["EntryRate"])) || ratio(entries, timeOk);
    const topNg = topNgFromRow(row);
    const trade = tradeByEngine.find((x) => normalizeName(x.name) === normalizeName(engine));
    const near = 0;
    const score = scoreEngine({ trades: trade?.trades || 0, winRate: trade?.winRate || 0, avgPips: trade?.averagePips || 0, entryRate, nearMiss: near });
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
      score
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
    const ngText = clean(pick(row, ["NGReasons", "NGReason", "TopNG"]));
    const reasons = splitReasons(ngText);
    const ngCount = num(pick(row, ["NGCount"])) || reasons.length || 1;
    if (ngCount <= 1) buckets.one++;
    else if (ngCount === 2) buckets.two++;
    else buckets.threePlus++;
    byEngine[engine] = (byEngine[engine] || 0) + 1;
    reasons.forEach((r) => ngReasons[r] = (ngReasons[r] || 0) + 1);
    const combo = reasons.length ? reasons.sort().join("+") : "Unknown";
    combos[combo] = (combos[combo] || 0) + 1;
  });

  const closestEngine = Object.entries(byEngine).sort((a, b) => b[1] - a[1])[0] || ["None", 0];
  return {
    total: rows.length,
    buckets,
    byEngine: toRank(byEngine),
    ngReasons: toRank(ngReasons),
    combos: toRank(combos),
    closestEngine: { engine: closestEngine[0], count: closestEngine[1] }
  };
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
    const conditionRates = conditionRate(rs);
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
      conditionRates,
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
      items.push(makeSuggestion("Engine条件ボトルネック研究", e.engine, e.score, `${e.engine}はTimeOK ${e.timeOk}回に対してFullSignal 0回です。TopNG: ${e.topNg.map((x) => x.name).join(" / ") || "なし"}`));
    }
    e.topNg.slice(0, 3).forEach((ng, idx) => {
      const score = Math.max(1, Math.min(5, Math.round((ng.count / Math.max(1, e.checks)) * 10) + (idx === 0 ? 1 : 0)));
      items.push(makeSuggestion(`${ng.name}研究`, e.engine, score, `${e.engine}で${ng.name}が${ng.count}回NGです。条件変更ではなく、閾値・時間帯・相場状態のResearch候補です。`));
    });
  });

  results.nearMiss.ngReasons.slice(0, 8).forEach((ng, idx) => {
    const score = idx < 2 ? 5 : idx < 5 ? 4 : 3;
    items.push(makeSuggestion(`${ng.name} NearMiss研究`, "NearMiss", score, `NearMissで${ng.name}が${ng.count}回出ています。あと1条件・あと2条件の内訳確認を推奨します。`));
  });

  results.nearMiss.combos.slice(0, 6).forEach((combo, idx) => {
    items.push(makeSuggestion("NearMiss組み合わせ研究", combo.name, idx < 2 ? 5 : 4, `${combo.name} の組み合わせで ${combo.count} 回止まっています。単独条件ではなく複合条件のResearch候補です。`));
  });

  results.session.forEach((s) => {
    if (s.nearMiss > s.trades) {
      items.push(makeSuggestion("Session NearMiss研究", s.session, Math.min(5, Math.max(3, Math.round(s.nearMiss / 10))), `${s.session}はTrade ${s.trades}件に対してNearMiss ${s.nearMiss}件です。TopNG: ${s.topNg.map((x) => x.name).join(" / ") || "なし"}`));
    }
  });

  return dedupeSuggestions(items).sort((a, b) => b.score - a.score).slice(0, 30);
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
    topEngines: results.tradeByEngine.slice(0, 5).map((x) => ({ name: x.name, trades: x.trades, pips: round(x.pips), winRate: round(x.winRate) })),
    topResearch: results.intelligence.slice(0, 5).map((x) => ({ title: x.title, target: x.target, score: x.score })),
    topNG: results.nearMiss.ngReasons.slice(0, 5)
  };
  history.push(snapshot);
  localStorage.setItem("scalplayerResearchHistory", JSON.stringify(history.slice(-100)));
}

function loadResearchHistory() {
  try {
    return JSON.parse(localStorage.getItem("scalplayerResearchHistory") || "[]");
  } catch {
    return [];
  }
}

function loadMemo() {
  return localStorage.getItem("scalplayerResearchMemo") || "";
}

function saveMemo(text) {
  localStorage.setItem("scalplayerResearchMemo", text || "");
}

function pick(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== "") return row[key];
  }
  const lower = {};
  Object.keys(row).forEach((k) => lower[k.toLowerCase()] = row[k]);
  for (const key of keys) {
    const v = lower[key.toLowerCase()];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

function clean(value) {
  return String(value ?? "").trim();
}

function num(value) {
  const n = Number(String(value ?? "").replace(/[%円分pips]/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function sum(list, key) {
  return list.reduce((acc, item) => acc + num(item[key]), 0);
}

function avg(list, key) {
  return list.length ? sum(list, key) / list.length : 0;
}

function max(values) {
  return values.length ? Math.max(...values) : 0;
}

function min(values) {
  return values.length ? Math.min(...values) : 0;
}

function ratio(a, b) {
  return b ? (a / b) * 100 : 0;
}

function round(value, digits = 2) {
  return Number(num(value).toFixed(digits));
}

function groupBy(list, fn) {
  return list.reduce((acc, item) => {
    const key = fn(item) || "Unknown";
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}

function calcDrawdown(pipsList) {
  let equity = 0;
  let peak = 0;
  let dd = 0;
  pipsList.forEach((p) => {
    equity += p;
    peak = Math.max(peak, equity);
    dd = Math.max(dd, peak - equity);
  });
  return dd;
}

function maxStreak(list, win) {
  let best = 0;
  let cur = 0;
  list.forEach((t) => {
    const ok = win ? t.pips > 0 : t.pips < 0;
    cur = ok ? cur + 1 : 0;
    best = Math.max(best, cur);
  });
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

function normalizeName(name) {
  return clean(name).toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
}

function splitReasons(text) {
  return clean(text)
    .replace(/NG/g, "")
    .split(/[\/|;,＋+]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.replace(/\s+/g, ""));
}

function toRank(obj) {
  return Object.entries(obj).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

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
  fields.forEach((field) => {
    totals[field] = ratio(rows.reduce((acc, row) => acc + num(pick(row, [field])), 0), bars || rows.length);
  });
  return totals;
}

function scoreEngine({ trades, winRate, avgPips, entryRate, nearMiss }) {
  let score = 1;
  if (trades >= 20) score++;
  if (winRate >= 55) score++;
  if (avgPips > 0) score++;
  if (entryRate > 0 || nearMiss >= 10) score++;
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
  return "★".repeat(n) + "☆".repeat(5 - n);
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
    return {
      label: type.label,
      exists: Boolean(file),
      rows: file?.rows.length || 0,
      columns: file?.headers.length || 0,
      updated: file?.updated,
      version: type.version,
      description: type.description,
      usage: type.usage
    };
  });
}
