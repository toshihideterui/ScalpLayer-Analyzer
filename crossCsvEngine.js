class CrossCsvEngine {
  constructor(analysisEngine) {
    this.analysisEngine = analysisEngine;
    this.results = analysisEngine?.results || {};
    this.datasets = analysisEngine?.datasets || {};
    this.files = analysisEngine?.files || new Map();
  }

  snapshot() {
    const cache = this.analysisEngine._snapshotCache ||= {};
    if (cache.crossCsv?.version === this.analysisEngine.analysisVersion) {
      if (typeof PerformanceUtil !== "undefined") PerformanceUtil.cacheHit("CrossCsv");
      return cache.crossCsv.snapshot;
    }
    if (typeof PerformanceUtil !== "undefined") {
      PerformanceUtil.cacheMiss("CrossCsv");
      PerformanceUtil.startTimer("CrossCsv");
    }
    const summary = this.crossSummary();
    const engineCorrelation = this.engineCorrelation();
    const sessionCorrelation = this.sessionCorrelation();
    const nearMissCorrelation = this.nearMissCorrelation(engineCorrelation);
    const signalCorrelation = this.signalCorrelation(engineCorrelation);
    const opportunityMatrix = this.opportunityMatrix(engineCorrelation, sessionCorrelation);
    const warnings = this.crossWarnings(summary, engineCorrelation);
    const recommendations = this.recommendations(opportunityMatrix, warnings);
    const snapshot = {
      version: "4.2",
      crossSummary: summary,
      engineCorrelation,
      sessionCorrelation,
      nearMissCorrelation,
      signalCorrelation,
      opportunityMatrix,
      warnings,
      recommendations,
      correlationScore: this.overallCorrelationScore(engineCorrelation, summary, warnings),
      insight: this.crossInsight(engineCorrelation, sessionCorrelation, recommendations, warnings)
    };
    cache.crossCsv = { version: this.analysisEngine.analysisVersion, snapshot };
    if (typeof PerformanceUtil !== "undefined") PerformanceUtil.stopTimer("CrossCsv");
    return snapshot;
  }

  crossSummary() {
    const present = (key) => this.fileRows(key) > 0;
    const rows = [
      { csv: "TradeHistory", key: "tradeHistory", rows: this.fileRows("tradeHistory"), loaded: present("tradeHistory") },
      { csv: "NearMiss", key: "nearMiss", rows: this.fileRows("nearMiss"), loaded: present("nearMiss") },
      { csv: "Signal Log", key: "signalLog", rows: this.fileRows("signalLog"), loaded: present("signalLog") },
      { csv: "Engine Activity", key: "engineActivity", rows: this.fileRows("engineActivityV2") || this.fileRows("engineActivity"), loaded: present("engineActivityV2") || present("engineActivity") },
      { csv: "Session Research", key: "sessionResearch", rows: this.fileRows("sessionResearch"), loaded: present("sessionResearch") }
    ];
    const loaded = rows.filter((x) => x.loaded).length;
    return {
      loadedCsvCount: loaded,
      expectedCsvCount: rows.length,
      coverage: pct2(loaded, rows.length),
      status: loaded >= 4 ? "Cross Ready" : loaded >= 2 ? "Partial Cross" : loaded === 1 ? "Single CSV" : "No Data",
      rows
    };
  }

  engineCorrelation() {
    const tradeMap = mapByEngine(this.results.tradeByEngine || [], (x) => x.name);
    const activityMap = mapByEngine(this.results.engineActivity || [], (x) => x.engine);
    const signalMap = mapByEngine(this.results.signal?.table || [], (x) => x.engine);
    const nearMap = countRowsBy(this.datasets.nearMiss || [], (row) => pickLocal(row, ["Engine"]));
    const sessionMap = engineSessionCounts(this.datasets.sessionResearch || []);
    const names = uniqueNames([
      ...Object.keys(tradeMap),
      ...Object.keys(activityMap),
      ...Object.keys(signalMap),
      ...Object.keys(nearMap),
      ...Object.keys(sessionMap)
    ]);

    return names.map((name) => {
      const key = normalizeLocal(name);
      const trade = tradeMap[key] || {};
      const activity = activityMap[key] || {};
      const signal = signalMap[key] || {};
      const nearMiss = nearMap[key]?.count || 0;
      const signals = numLocal(signal.signals);
      const entriesFromSignals = numLocal(signal.entries);
      const trades = numLocal(trade.trades);
      const checks = numLocal(activity.checks);
      const timeOk = numLocal(activity.timeOk);
      const full = numLocal(activity.full);
      const entries = Math.max(numLocal(activity.entries), trades, entriesFromSignals);
      const winRate = numLocal(trade.winRate);
      const avgPips = numLocal(trade.averagePips);
      const topNg = activity.topNg || [];
      const score = correlationScore({ trades, winRate, avgPips, checks, timeOk, full, entries, nearMiss, signals, topNg });
      return {
        engine: displayName(name),
        trades,
        winRate,
        averagePips: avgPips,
        profit: numLocal(trade.profit),
        pips: numLocal(trade.pips),
        checks,
        timeOk,
        full,
        entries,
        signals,
        signalSuccess: pct2(entriesFromSignals || trades, signals),
        nearMiss,
        topNg,
        sessionRows: sessionMap[key]?.count || 0,
        researchScore: starsLocal(score),
        confidence: confidenceLabel({ trades, nearMiss, signals, checks }),
        dataQuality: dataQualityLabel({ trades, nearMiss, signals, checks }),
        correlationScore: score,
        opportunity: opportunityLabel({ trades, nearMiss, signals, timeOk, full, score }),
        note: engineNote({ trades, nearMiss, signals, timeOk, full, topNg })
      };
    }).sort((a, b) => b.correlationScore - a.correlationScore || b.nearMiss - a.nearMiss || b.trades - a.trades);
  }

  sessionCorrelation() {
    const tradeGroups = groupByLocal(this.results.trades || [], (x) => x.session || "Other");
    const nearGroups = groupByLocal(this.datasets.nearMiss || [], (row) => pickLocal(row, ["Session"]) || "Other");
    const signalGroups = groupByLocal(this.datasets.signalLog || [], (row) => pickLocal(row, ["Session"]) || classifySessionFromRow(row));
    const sessionRows = mapBySession(this.results.session || []);
    return ["Tokyo", "London", "NY", "Other"].map((session) => {
      const trades = tradeGroups[session] || [];
      const near = nearGroups[session] || [];
      const signal = signalGroups[session] || [];
      const sessionResult = sessionRows[session] || {};
      const winRate = trades.length ? pct2(trades.filter((x) => numLocal(x.pips) > 0).length, trades.length) : numLocal(sessionResult.winRate);
      const avgPips = trades.length ? avgLocal(trades, "pips") : numLocal(sessionResult.averagePips);
      const score = Math.min(100, Math.round((near.length ? 24 : 0) + (signal.length ? 16 : 0) + (trades.length ? 20 : 0) + Math.min(25, winRate / 3) + Math.min(15, Math.max(0, avgPips) * 3)));
      return {
        session,
        trades: trades.length || numLocal(sessionResult.trades),
        nearMiss: near.length || numLocal(sessionResult.nearMiss),
        signals: signal.length,
        winRate,
        averagePips: avgPips,
        researchScore: starsLocal(score / 20),
        score,
        sessionOpportunity: score >= 75 ? "High" : score >= 45 ? "Medium" : "Low",
        topNg: sessionResult.topNg || []
      };
    }).sort((a, b) => b.score - a.score);
  }

  nearMissCorrelation(engineRows) {
    return engineRows.filter((x) => x.nearMiss || x.trades || x.signals).map((x) => {
      const nearTradeRatio = pct2(x.nearMiss, Math.max(1, x.trades));
      const signalNearRatio = pct2(x.nearMiss, Math.max(1, x.signals));
      return {
        engine: x.engine,
        nearMiss: x.nearMiss,
        trades: x.trades,
        signals: x.signals,
        nearTradeRatio,
        signalNearRatio,
        interpretation: x.nearMiss >= 50 && x.trades <= 5 ? "High NearMiss / Low Trade" : x.nearMiss >= x.trades ? "Research Target" : "Trade Confirmed"
      };
    }).sort((a, b) => b.nearMiss - a.nearMiss);
  }

  signalCorrelation(engineRows) {
    const totalSignals = sumLocal(engineRows, "signals");
    const totalEntries = sumLocal(engineRows, "entries");
    const totalTrades = sumLocal(engineRows, "trades");
    const wins = (this.results.trades || []).filter((x) => numLocal(x.pips) > 0).length;
    return {
      totalSignals,
      totalEntries,
      totalTrades,
      signalToEntry: pct2(totalEntries, totalSignals),
      entryToTrade: pct2(totalTrades, totalEntries),
      signalToTrade: pct2(totalTrades, totalSignals),
      winRate: pct2(wins, totalTrades),
      table: engineRows.map((x) => ({
        engine: x.engine,
        signals: x.signals,
        entries: x.entries,
        trades: x.trades,
        signalSuccess: x.signalSuccess,
        winRate: x.winRate
      })).filter((x) => x.signals || x.entries || x.trades)
    };
  }

  opportunityMatrix(engineRows, sessionRows) {
    const engineItems = engineRows.map((x) => {
      const score = opportunityScore(x);
      return {
        type: "Engine",
        target: x.engine,
        level: score >= 70 ? "High" : score >= 40 ? "Medium" : "Low",
        score,
        trades: x.trades,
        nearMiss: x.nearMiss,
        signals: x.signals,
        reason: opportunityReason(x)
      };
    });
    const sessionItems = sessionRows.map((x) => ({
      type: "Session",
      target: x.session,
      level: x.score >= 75 ? "High" : x.score >= 45 ? "Medium" : "Low",
      score: x.score,
      trades: x.trades,
      nearMiss: x.nearMiss,
      signals: x.signals,
      reason: `${x.session}: Trades ${x.trades}, NearMiss ${x.nearMiss}, Signals ${x.signals}.`
    }));
    return [...engineItems, ...sessionItems].sort((a, b) => b.score - a.score).slice(0, 30);
  }

  crossWarnings(summary, engineRows) {
    const warnings = [];
    summary.rows.filter((x) => !x.loaded).forEach((x) => warnings.push(`${x.csv} is not loaded. Cross analysis is partial.`));
    if (!this.fileRows("tradeHistory")) warnings.push("TradeHistory is missing. WinRate, PF, and executed-trade correlation are unavailable.");
    if (!this.fileRows("nearMiss")) warnings.push("NearMissHistory is missing. Bottleneck opportunity may be underestimated.");
    if (!this.fileRows("signalLog")) warnings.push("Signal Log is missing. Signal-to-entry flow is unavailable.");
    if (!this.fileRows("engineActivity") && !this.fileRows("engineActivityV2")) warnings.push("EngineActivity is missing. CheckCount and TopNG cannot be cross-checked.");
    if (engineRows.length && engineRows.every((x) => !x.trades)) warnings.push("No executed trades found across engines.");
    if (engineRows.length && engineRows.every((x) => !x.nearMiss)) warnings.push("No NearMiss rows found across engines.");
    return warnings;
  }

  recommendations(matrix, warnings) {
    const recs = [];
    matrix.filter((x) => x.level === "High").slice(0, 5).forEach((x) => {
      recs.push({
        stars: "★★★★★",
        title: `${x.target} Cross Research`,
        target: x.target,
        reason: x.reason
      });
    });
    if (warnings.some((x) => x.includes("NearMissHistory"))) recs.push({ stars: "★★★★☆", title: "Collect NearMiss", target: "NearMissHistory.csv", reason: "NearMiss data is required to identify conditions that almost reached entry." });
    if (warnings.some((x) => x.includes("Signal Log"))) recs.push({ stars: "★★★★☆", title: "Collect Signal", target: "Signal Log CSV", reason: "Signal data is required to verify Signal -> Entry -> Trade conversion." });
    if (!recs.length) recs.push({ stars: "★★★☆☆", title: "Continue CSV Collection", target: "All CSV", reason: "Cross CSV coverage is not enough for a strong Research candidate yet." });
    return recs.slice(0, 10);
  }

  overallCorrelationScore(engineRows, summary, warnings) {
    const engineAvg = engineRows.length ? avgPlain(engineRows.map((x) => x.correlationScore)) : 0;
    const coverageBonus = summary.coverage * 0.35;
    const warningPenalty = Math.min(25, warnings.length * 5);
    return Math.max(0, Math.min(100, Math.round(engineAvg * 0.55 + coverageBonus - warningPenalty)));
  }

  crossInsight(engineRows, sessionRows, recs, warnings) {
    const topEngine = engineRows[0];
    const topSession = sessionRows[0];
    const lines = ["Today's Cross Insight"];
    if (topEngine) lines.push(`${topEngine.engine}: Trades ${topEngine.trades}, NearMiss ${topEngine.nearMiss}, Signals ${topEngine.signals}, Correlation ${topEngine.correlationScore}/100.`);
    if (topSession) lines.push(`${topSession.session}: Trades ${topSession.trades}, NearMiss ${topSession.nearMiss}, ResearchScore ${topSession.researchScore}.`);
    if (recs[0]) lines.push(`Priority Research candidate: ${recs[0].title} - ${recs[0].reason}`);
    if (warnings.length) lines.push(`Cross warning: ${warnings[0]}`);
    lines.push("Do not change EA conditions directly from this report. Treat it as a Cross CSV Research map.");
    return lines.join("\n");
  }

  fileRows(key) {
    if (key === "engineActivity") return (this.datasets.engineActivity || []).length;
    return (this.datasets[key] || []).length;
  }
}

function mapByEngine(list, getName) {
  return (list || []).reduce((acc, item) => {
    const name = displayName(getName(item) || "Unknown");
    acc[normalizeLocal(name)] = { ...item, name, engine: name };
    return acc;
  }, {});
}

function mapBySession(list) {
  return (list || []).reduce((acc, item) => {
    acc[item.session || "Other"] = item;
    return acc;
  }, {});
}

function countRowsBy(rows, getKey) {
  return (rows || []).reduce((acc, row) => {
    const name = displayName(getKey(row) || "Unknown");
    const key = normalizeLocal(name);
    const rec = acc[key] ||= { name, count: 0 };
    rec.count++;
    return acc;
  }, {});
}

function engineSessionCounts(rows) {
  return (rows || []).reduce((acc, row) => {
    const name = displayName(pickLocal(row, ["Engine"]) || "Unknown");
    const key = normalizeLocal(name);
    const rec = acc[key] ||= { name, count: 0 };
    rec.count++;
    return acc;
  }, {});
}

function uniqueNames(keys) {
  const seen = new Set();
  return keys.map((x) => displayName(x)).filter((x) => {
    const key = normalizeLocal(x);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function displayName(value) {
  const raw = String(value || "Unknown").trim();
  const key = normalizeLocal(raw);
  const names = {
    corerulee: "Core Rule E",
    coreeexpansiona: "Core E Expansion A",
    candidateg: "Candidate G",
    morningprime: "Morning Prime",
    dayrulea: "Day Rule A",
    eveningrulec: "Evening Rule C",
    honmei17: "Honmei17"
  };
  return names[key] || raw || "Unknown";
}

function correlationScore(x) {
  let score = 0;
  if (x.checks) score += Math.min(16, x.checks / 40);
  if (x.timeOk) score += Math.min(14, x.timeOk / 20);
  if (x.signals) score += Math.min(16, x.signals / 8);
  if (x.nearMiss) score += Math.min(18, x.nearMiss / 10);
  if (x.trades) score += Math.min(18, x.trades * 3);
  if (x.winRate) score += Math.min(12, x.winRate / 8);
  if (x.avgPips > 0) score += Math.min(10, x.avgPips * 1.5);
  if (x.full && !x.trades) score += 4;
  if (x.topNg?.length) score += 4;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function opportunityScore(x) {
  let score = 0;
  score += Math.min(30, x.nearMiss / 4);
  score += Math.min(25, x.signals / 4);
  score += Math.min(20, x.timeOk / 30);
  score += Math.min(15, x.trades * 2);
  score += Math.min(10, Math.max(0, x.averagePips) * 2);
  if (x.nearMiss >= 30 && x.trades <= 5) score += 12;
  if (x.full > 0 && x.entries === 0) score += 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function opportunityReason(x) {
  if (x.nearMiss >= 30 && x.trades <= 5) return `${x.engine}: NearMiss is high but executed trades are low. Research the TopNG conditions.`;
  if (x.signals && !x.trades) return `${x.engine}: Signals exist but executed trades are missing. Research Signal -> Entry conversion.`;
  if (x.timeOk && !x.full) return `${x.engine}: TimeOK exists but FullSignal is 0. Research bottleneck conditions.`;
  if (x.trades && x.winRate >= 60) return `${x.engine}: Trades exist with positive WinRate. Cross-check against NearMiss and Signal data.`;
  return `${x.engine}: Continue collecting cross CSV data.`;
}

function opportunityLabel(x) {
  const score = Number(x.score || 0);
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  if (x.nearMiss || x.signals || x.timeOk) return "Low";
  return "Collect Data";
}

function engineNote(x) {
  if (x.timeOk && !x.full) return "TimeOK exists but FullSignal is not reached.";
  if (x.full && !x.entries) return "FullSignal exists but entry is not confirmed.";
  if (x.nearMiss && !x.trades) return "NearMiss exists without executed trades.";
  if (x.trades) return "Executed trades can be compared with NearMiss and Signal data.";
  if (x.topNg?.length) return `TopNG: ${x.topNg.map((n) => n.name).join(" / ")}.`;
  return "Collect more CSV data.";
}

function confidenceLabel(x) {
  const count = x.trades + x.nearMiss + x.signals + Math.min(50, x.checks / 10);
  if (count >= 100) return "High";
  if (count >= 30) return "Medium";
  if (count > 0) return "Low";
  return "Insufficient";
}

function dataQualityLabel(x) {
  const loaded = [x.trades, x.nearMiss, x.signals, x.checks].filter((v) => v > 0).length;
  if (loaded >= 3) return "Good";
  if (loaded === 2) return "Partial";
  if (loaded === 1) return "Limited";
  return "Missing";
}

function pickLocal(row, keys) {
  for (const key of keys) if (row?.[key] !== undefined && row[key] !== "") return row[key];
  const lower = {};
  Object.keys(row || {}).forEach((k) => lower[k.toLowerCase()] = row[k]);
  for (const key of keys) {
    const v = lower[key.toLowerCase()];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

function classifySessionFromRow(row) {
  const text = `${pickLocal(row, ["Date"])} ${pickLocal(row, ["Time"])}`.trim().replace(/\./g, "/").replace(/-/g, "/");
  const date = new Date(text);
  if (!Number.isFinite(date.getTime())) return "Other";
  const h = date.getHours();
  if (h >= 9 && h < 15) return "Tokyo";
  if (h >= 15 && h < 21) return "London";
  if (h >= 21 || h < 2) return "NY";
  return "Other";
}

function groupByLocal(list, fn) {
  return (list || []).reduce((acc, item) => {
    const key = fn(item) || "Unknown";
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}

function normalizeLocal(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
}

function numLocal(value) {
  const n = Number(String(value ?? "").replace(/[%円分pips]/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function sumLocal(list, key) {
  return (list || []).reduce((acc, item) => acc + numLocal(item[key]), 0);
}

function avgLocal(list, key) {
  return list?.length ? sumLocal(list, key) / list.length : 0;
}

function avgPlain(list) {
  const nums = (list || []).map(Number).filter(Number.isFinite);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function pct2(a, b) {
  return b ? Math.round((Number(a || 0) / Number(b || 0)) * 10000) / 100 : 0;
}

function starsLocal(score) {
  const n = Math.max(1, Math.min(5, Math.round(Number(score || 0))));
  return "★★★★★☆☆☆☆☆".slice(5 - n, 10 - n);
}
