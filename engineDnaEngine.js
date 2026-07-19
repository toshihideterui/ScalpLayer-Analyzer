class EngineDnaEngine {
  constructor({ analysisEngine }) {
    this.analysisEngine = analysisEngine;
    this.results = analysisEngine?.results || {};
    this.datasets = analysisEngine?.datasets || {};
  }

  snapshot() {
    const cache = this.analysisEngine._snapshotCache ||= {};
    if (cache.engineDna?.version === this.analysisEngine.analysisVersion) {
      if (typeof PerformanceUtil !== "undefined") PerformanceUtil.cacheHit("EngineDNA");
      return cache.engineDna.snapshot;
    }
    if (typeof PerformanceUtil !== "undefined") PerformanceUtil.cacheMiss("EngineDNA");
    const profiles = this.buildProfiles();
    const similarity = this.engineSimilarity(profiles);
    const clusters = this.engineClusters(profiles);
    const hidden = this.hiddenOpportunity(profiles);
    const evolution = this.engineEvolution(profiles);
    const snapshot = {
      version: "4.5",
      profiles,
      topEngine: profiles[0] || null,
      similarity,
      clusters,
      hiddenOpportunity: hidden,
      evolution,
      summary: this.summary(profiles, hidden, evolution)
    };
    cache.engineDna = { version: this.analysisEngine.analysisVersion, snapshot };
    return snapshot;
  }

  buildProfiles() {
    const tradeMap = mapDnaByEngine(this.results.tradeByEngine || [], (x) => x.name);
    const activityMap = mapDnaByEngine(this.results.engineActivity || [], (x) => x.engine);
    const signalMap = mapDnaByEngine(this.results.signal?.table || [], (x) => x.engine);
    const nearMap = countDnaRows(this.datasets.nearMiss || [], (row) => pickDna(row, ["Engine"]));
    const tradeRows = groupDnaBy(this.results.trades || [], (row) => row.engine || "Unknown");
    const sessionRows = groupDnaBy(this.results.trades || [], (row) => row.engine || "Unknown");
    const names = uniqueDnaNames([
      ...Object.keys(tradeMap),
      ...Object.keys(activityMap),
      ...Object.keys(signalMap),
      ...Object.keys(nearMap),
      ...Object.keys(tradeRows)
    ]);
    return names.map((name) => {
      const key = normalizeDna(name);
      const trade = tradeMap[key] || {};
      const activity = activityMap[key] || {};
      const signals = Number(signalMap[key]?.signals || 0);
      const nearMiss = Number(nearMap[key]?.count || 0);
      const rows = tradeRows[key] || [];
      const dominantSession = dominantDna(rows.map((x) => x.session).filter(Boolean)) || dominantDna((this.results.session || []).map((x) => x.session)) || "Unknown";
      const topNg = activity.topNg || [];
      const avgHolding = avgDna(rows, "holding");
      const avgSpread = avgDna(rows, "spread");
      const avgRsi = avgDna(rows, "rsi");
      const avgAtr = avgDna(rows, "atr");
      const winRate = Number(trade.winRate || 0);
      const profitFactor = Number(trade.profitFactor || 0);
      const expectancy = Number(trade.averagePips || 0);
      const profile = {
        engine: displayDnaName(name),
        researchScore: activity.researchScore || starsDna(activity.score || 0),
        confidence: activity.confidence || confidenceDna({ trades: trade.trades, nearMiss, signals }),
        tradeCount: Number(trade.trades || 0),
        nearMissCount: nearMiss,
        signalCount: signals,
        topNg,
        session: dominantSession,
        averageHolding: roundDna(avgHolding),
        averageSpread: roundDna(avgSpread),
        averageRsi: roundDna(avgRsi),
        averageAtr: roundDna(avgAtr),
        averageWin: roundDna(trade.averageWin || 0),
        averageLoss: roundDna(trade.averageLoss || 0),
        expectancy: roundDna(expectancy),
        profitFactor: roundDna(profitFactor),
        winRate: roundDna(winRate),
        personality: "",
        cluster: "",
        strength: [],
        weakness: [],
        stability: "",
        dnaScore: 0
      };
      profile.personality = personalityDna(profile);
      profile.cluster = clusterDna(profile);
      profile.strength = strengthDna(profile);
      profile.weakness = weaknessDna(profile);
      profile.stability = stabilityDna(profile);
      profile.dnaScore = dnaScore(profile);
      return profile;
    }).sort((a, b) => b.dnaScore - a.dnaScore || b.tradeCount - a.tradeCount || b.nearMissCount - a.nearMissCount);
  }

  engineSimilarity(profiles) {
    const rows = [];
    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        rows.push({
          engineA: profiles[i].engine,
          engineB: profiles[j].engine,
          similarity: similarityDna(profiles[i], profiles[j]),
          shared: sharedDna(profiles[i], profiles[j])
        });
      }
    }
    return rows.sort((a, b) => b.similarity - a.similarity);
  }

  engineClusters(profiles) {
    const grouped = groupDnaBy(profiles, (x) => x.cluster || "Unknown Group");
    return Object.entries(grouped).map(([cluster, list]) => ({
      cluster,
      count: list.length,
      engines: list.map((x) => x.engine),
      averageDnaScore: roundDna(avgPlainDna(list.map((x) => x.dnaScore))),
      averageStability: starsDna(avgPlainDna(list.map((x) => scoreFromStarsDna(x.stability))))
    })).sort((a, b) => b.averageDnaScore - a.averageDnaScore);
  }

  hiddenOpportunity(profiles) {
    return profiles.filter((x) => x.tradeCount <= 5 && (x.nearMissCount >= 20 || x.signalCount >= 20)).map((x) => ({
      engine: x.engine,
      trades: x.tradeCount,
      nearMiss: x.nearMissCount,
      signals: x.signalCount,
      reason: `${x.engine}: low Trade count with high NearMiss/Signal. Treat as Research candidate, not condition change.`,
      priority: x.nearMissCount + x.signalCount >= 100 ? "High" : "Medium"
    })).sort((a, b) => (b.nearMiss + b.signals) - (a.nearMiss + a.signals));
  }

  engineEvolution(profiles) {
    const history = normalizeDnaHistory(loadResearchHistory());
    return profiles.map((profile) => {
      const points = history.map((snap) => {
        const item = (snap.engineRank || []).find((x) => normalizeDna(x.name || x.engine) === normalizeDna(profile.engine)) || {};
        return {
          datetime: snap.datetime,
          score: Number(item.score || 0),
          entries: Number(item.entries || 0),
          timeOk: Number(item.timeOk || 0),
          checks: Number(item.checks || 0)
        };
      }).filter((x) => x.score || x.entries || x.timeOk || x.checks);
      const first = points[0] || {};
      const last = points[points.length - 1] || {};
      const delta = Number(last.score || 0) - Number(first.score || 0);
      return {
        engine: profile.engine,
        points: points.length,
        firstScore: roundDna(first.score || 0),
        lastScore: roundDna(last.score || 0),
        delta: roundDna(delta),
        status: delta > 1 ? "Improving" : delta < -1 ? "Declining" : points.length ? "Stable" : "No History"
      };
    }).sort((a, b) => b.delta - a.delta || b.points - a.points);
  }

  summary(profiles, hidden, evolution) {
    const stable = profiles.find((x) => x.personality === "Stable") || profiles[0];
    const improving = evolution.find((x) => x.status === "Improving");
    const hiddenTop = hidden[0];
    const lines = [];
    if (stable) lines.push(`${stable.engine} is ${stable.personality} with stability ${stable.stability}.`);
    if (improving) lines.push(`${improving.engine} is improving in historical snapshots.`);
    if (hiddenTop) lines.push(`${hiddenTop.engine} requires additional NearMiss Research.`);
    if (!lines.length) lines.push("Engine DNA needs more TradeHistory, NearMiss, Signal, and EngineActivity data.");
    return lines.join(" ");
  }
}

function mapDnaByEngine(list, getName) {
  return (list || []).reduce((acc, item) => {
    const key = normalizeDna(getName(item) || "Unknown");
    acc[key] = item;
    return acc;
  }, {});
}

function countDnaRows(rows, getName) {
  return (rows || []).reduce((acc, row) => {
    const key = normalizeDna(getName(row) || "Unknown");
    const rec = acc[key] ||= { count: 0 };
    rec.count++;
    return acc;
  }, {});
}

function groupDnaBy(list, fn) {
  return (list || []).reduce((acc, item) => {
    const key = normalizeDna(fn(item) || "Unknown");
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}

function uniqueDnaNames(keys) {
  const seen = new Set();
  return keys.map(displayDnaName).filter((name) => {
    const key = normalizeDna(name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function personalityDna(p) {
  if (!p.tradeCount && !p.nearMissCount && !p.signalCount) return "Unknown";
  if (p.tradeCount >= 50 && p.winRate >= 60 && p.profitFactor >= 1.5) return "Stable";
  if (p.tradeCount >= 80) return "High Frequency";
  if (p.tradeCount <= 5 && (p.nearMissCount || p.signalCount)) return "Rare Entry";
  if (p.expectancy >= 5 && p.averageLoss < -8) return "Aggressive";
  if (p.averageLoss >= -5 && p.profitFactor >= 1.2) return "Conservative";
  if (p.topNg.some((x) => /RecentRise|Bull|Momentum/i.test(x.name))) return "Momentum";
  if (p.topNg.some((x) => /RecentDrop|Bear|LowUpdate|HighUpdate/i.test(x.name))) return "Reversal";
  if (p.signalCount && !p.tradeCount) return "Experimental";
  return "Trend";
}

function clusterDna(p) {
  if (p.personality === "Rare Entry") return "Rare Entry Group";
  if (["Momentum", "High Frequency"].includes(p.personality)) return "Momentum Group";
  if (["Stable", "Conservative"].includes(p.personality)) return "Stable Group";
  if (["Experimental", "Unknown"].includes(p.personality)) return "Experimental Group";
  return "Trend Group";
}

function strengthDna(p) {
  const list = [];
  if (p.session && p.session !== "Unknown") list.push(p.session);
  if (p.winRate >= 60) list.push("WinRate");
  if (p.profitFactor >= 1.5) list.push("Profit Factor");
  if (p.expectancy > 0) list.push("Expectancy");
  if (p.averageSpread && p.averageSpread <= 2) list.push("Spread");
  if (p.averageRsi) list.push("RSI");
  if (p.averageAtr) list.push("ATR");
  return list.slice(0, 6);
}

function weaknessDna(p) {
  const list = [];
  if (p.nearMissCount > p.tradeCount * 3) list.push("NearMiss");
  if (p.signalCount > p.tradeCount * 3) list.push("Signal Conversion");
  if (p.topNg[0]) list.push(p.topNg[0].name);
  if (p.profitFactor > 0 && p.profitFactor < 1.2) list.push("Profit Factor");
  if (p.winRate > 0 && p.winRate < 50) list.push("WinRate");
  if (!p.tradeCount) list.push("Trade Count");
  return list.slice(0, 6);
}

function stabilityDna(p) {
  let score = 1;
  if (p.tradeCount >= 20) score++;
  if (p.tradeCount >= 50) score++;
  if (p.winRate >= 55) score++;
  if (p.profitFactor >= 1.5) score++;
  if (p.averageLoss >= -10) score++;
  if (p.nearMissCount > p.tradeCount * 8) score--;
  return starsDna(Math.max(1, Math.min(5, score)));
}

function dnaScore(p) {
  let score = 0;
  score += Math.min(25, p.tradeCount * 2);
  score += Math.min(18, p.nearMissCount / 4);
  score += Math.min(14, p.signalCount / 5);
  score += Math.min(20, p.winRate / 4);
  score += Math.min(16, Math.max(0, p.expectancy) * 2);
  score += Math.min(12, Math.max(0, p.profitFactor) * 4);
  return Math.round(Math.max(0, Math.min(100, score)));
}

function similarityDna(a, b) {
  let score = 0;
  if (a.personality === b.personality) score += 20;
  if (a.cluster === b.cluster) score += 18;
  if (a.session === b.session) score += 14;
  score += 12 - Math.min(12, Math.abs(a.winRate - b.winRate) / 5);
  score += 12 - Math.min(12, Math.abs(a.expectancy - b.expectancy) * 2);
  score += 10 - Math.min(10, Math.abs(a.profitFactor - b.profitFactor) * 3);
  score += 8 - Math.min(8, Math.abs(a.averageSpread - b.averageSpread) * 2);
  score += 6 - Math.min(6, Math.abs(a.averageRsi - b.averageRsi) / 10);
  return Math.round(Math.max(0, Math.min(100, score)));
}

function sharedDna(a, b) {
  const shared = [];
  if (a.personality === b.personality) shared.push(a.personality);
  if (a.cluster === b.cluster) shared.push(a.cluster);
  if (a.session === b.session) shared.push(a.session);
  return shared;
}

function pickDna(row, keys) {
  for (const key of keys) if (row?.[key] !== undefined && row[key] !== "") return row[key];
  return "";
}

function dominantDna(values) {
  const counts = {};
  values.forEach((value) => counts[value] = (counts[value] || 0) + 1);
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function avgDna(rows, key) {
  const nums = (rows || []).map((x) => Number(x[key])).filter(Number.isFinite).filter((x) => x !== 0);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function avgPlainDna(values) {
  const nums = (values || []).map(Number).filter(Number.isFinite);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function scoreFromStarsDna(stars) {
  return String(stars || "").split("★").length - 1;
}

function displayDnaName(value) {
  const raw = String(value || "Unknown").trim();
  const map = {
    corerulee: "Core Rule E",
    coreeexpansiona: "Core E Expansion A",
    candidateg: "Candidate G",
    morningprime: "Morning Prime",
    dayrulea: "Day Rule A",
    eveningrulec: "Evening Rule C",
    honmei17: "Honmei17"
  };
  return map[normalizeDna(raw)] || raw || "Unknown";
}

function normalizeDna(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
}

function roundDna(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function starsDna(score) {
  const n = Math.max(1, Math.min(5, Math.round(Number(score || 0))));
  return "★★★★★☆☆☆☆☆".slice(5 - n, 10 - n);
}

function confidenceDna(x) {
  const total = Number(x.trades || 0) + Number(x.nearMiss || 0) + Number(x.signals || 0);
  if (total >= 100) return "High";
  if (total >= 30) return "Medium";
  if (total > 0) return "Low";
  return "Insufficient";
}

function normalizeDnaHistory(history) {
  return Array.isArray(history) ? history : [];
}
