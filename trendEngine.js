class TrendEngine {
  constructor({ analysisEngine, researchManager }) {
    this.analysisEngine = analysisEngine;
    this.researchManager = researchManager;
    this.history = normalizeTrendHistory(loadResearchHistory());
    this.items = researchManager?.items || [];
  }

  snapshot() {
    const cache = this.analysisEngine._snapshotCache ||= {};
    const stamp = `${trendHistoryStamp(this.history)}::${trendManagerStamp(this.items)}`;
    if (cache.trend?.version === this.analysisEngine.analysisVersion && cache.trend?.stamp === stamp) {
      if (typeof PerformanceUtil !== "undefined") PerformanceUtil.cacheHit("Trend");
      return cache.trend.snapshot;
    }
    if (typeof PerformanceUtil !== "undefined") PerformanceUtil.cacheMiss("Trend");
    const longTermTrend = {
      daily: this.aggregate("day"),
      weekly: this.aggregate("week"),
      monthly: this.aggregate("month")
    };
    const improvement = this.improvementAnalysis();
    const bestSnapshot = this.bestSnapshots();
    const worstSnapshot = this.worstSnapshots();
    const milestones = this.milestones();
    const events = this.timelineEvents();
    const trendSummary = this.trendSummary(improvement);
    const recommendations = this.trendRecommendations(improvement, worstSnapshot);
    const snapshot = {
      version: "4.4",
      count: this.history.length,
      longTermTrend,
      trendChart: this.trendChart(longTermTrend.daily),
      improvement,
      bestSnapshot,
      worstSnapshot,
      forecast: this.forecast(improvement),
      milestones,
      events,
      recommendations,
      compare: this.compareSnapshots(),
      trendSummary
    };
    cache.trend = { version: this.analysisEngine.analysisVersion, stamp, snapshot };
    return snapshot;
  }

  aggregate(mode) {
    const grouped = {};
    this.history.forEach((snap) => {
      const key = trendBucketKey(snap.date, mode);
      grouped[key] = snap;
    });
    return Object.values(grouped).map((snap) => trendRow(snap)).sort((a, b) => a.period.localeCompare(b.period));
  }

  trendChart(rows) {
    return {
      labels: rows.map((x) => x.period),
      series: [
        { label: "Research Score", data: rows.map((x) => x.researchScore) },
        { label: "Correlation", data: rows.map((x) => x.correlationScore) },
        { label: "Quality", data: rows.map((x) => x.qualityScore) },
        { label: "Confidence", data: rows.map((x) => x.confidenceScore) }
      ]
    };
  }

  improvementAnalysis() {
    const latest = this.history[this.history.length - 1];
    const prev = this.history[this.history.length - 2];
    if (!latest || !prev) return [];
    return [
      deltaRow("Research Score", latest.researchScore, prev.researchScore),
      deltaRow("WinRate", latest.winRate, prev.winRate, "%"),
      deltaRow("NearMiss", latest.nearMiss, prev.nearMiss),
      deltaRow("Correlation", latest.correlationScore, prev.correlationScore),
      deltaRow("Quality", latest.qualityScore, prev.qualityScore),
      deltaRow("Opportunity", latest.opportunityScore, prev.opportunityScore),
      deltaRow("ProfitFactor", latest.profitFactor, prev.profitFactor),
      deltaRow("Trade", latest.trades, prev.trades),
      deltaRow("CSV", latest.csvCount, prev.csvCount)
    ];
  }

  bestSnapshots() {
    return [
      bestRow(this.history, "Research Score", "researchScore", true),
      bestRow(this.history, "Correlation", "correlationScore", true),
      bestRow(this.history, "Quality", "qualityScore", true),
      bestRow(this.history, "Confidence", "confidenceScore", true),
      bestRow(this.history, "WinRate", "winRate", true),
      bestRow(this.history, "ProfitFactor", "profitFactor", true)
    ].filter(Boolean);
  }

  worstSnapshots() {
    return [
      bestRow(this.history, "Research Score", "researchScore", false),
      bestRow(this.history, "Correlation", "correlationScore", false),
      bestRow(this.history, "Quality", "qualityScore", false),
      bestRow(this.history, "Confidence", "confidenceScore", false),
      bestRow(this.history, "Trade", "trades", false),
      bestRow(this.history, "NearMiss", "nearMiss", false)
    ].filter(Boolean).map((row) => ({
      ...row,
      reason: worstReason(row.snapshot)
    }));
  }

  forecast(improvement) {
    return [
      trendState("Research Quality", valueOfDelta(improvement, "Quality")),
      trendState("Cross CSV", valueOfDelta(improvement, "Correlation")),
      trendState("Confidence", valueOfDelta(improvement, "Research Score")),
      trendState("Data Collection", valueOfDelta(improvement, "CSV") + valueOfDelta(improvement, "Trade") + valueOfDelta(improvement, "NearMiss")),
      trendState("Trade Volume", valueOfDelta(improvement, "Trade")),
      trendState("NearMiss Collection", valueOfDelta(improvement, "NearMiss"))
    ];
  }

  milestones() {
    const latest = this.history[this.history.length - 1] || {};
    const researchCount = this.items.length;
    return [
      milestone("First 100 Trades", latest.trades, 100),
      milestone("Research Score 80", latest.researchScore, 80),
      milestone("Quality 90", latest.qualityScore, 90),
      milestone("Correlation 80", latest.correlationScore, 80),
      milestone("NearMiss 100", latest.nearMiss, 100),
      milestone("Research 100", researchCount, 100)
    ];
  }

  timelineEvents() {
    const events = [];
    this.history.forEach((snap) => {
      events.push({
        datetime: snap.datetime,
        type: "Snapshot",
        title: `Snapshot ${snap.date}`,
        detail: `Trade ${snap.trades}, NearMiss ${snap.nearMiss}, ResearchScore ${snap.researchScore}.`
      });
      if (snap.csvCount) events.push({
        datetime: snap.datetime,
        type: "CSV",
        title: `${snap.csvCount} CSV loaded`,
        detail: (snap.loadedCsvTypes || []).join(", ") || "CSV snapshot"
      });
    });
    this.items.forEach((item) => {
      (item.history || []).forEach((h) => events.push({
        datetime: h.at || item.updatedAt,
        type: h.type || "Research",
        title: item.title,
        detail: h.note || item.status || "-"
      }));
      (item.decisionLog || []).forEach((d) => events.push({
        datetime: d.date || item.updatedAt,
        type: d.decision || "Decision",
        title: item.title,
        detail: d.reason || d.userNote || "-"
      }));
    });
    return events.filter((x) => x.datetime).sort((a, b) => Date.parse(b.datetime) - Date.parse(a.datetime)).slice(0, 120);
  }

  trendRecommendations(improvement, worstRows) {
    const recs = [];
    const near = valueOfDelta(improvement, "NearMiss");
    const quality = valueOfDelta(improvement, "Quality");
    const trades = valueOfDelta(improvement, "Trade");
    const correlation = valueOfDelta(improvement, "Correlation");
    if (near > 0) recs.push({ priority: "High", title: "NearMiss Trend Research", reason: `NearMiss increased by ${near}. Research bottleneck trend before changing conditions.` });
    if (quality > 0) recs.push({ priority: "Medium", title: "Quality Improvement Review", reason: `Data Quality improved by ${quality}. Continue the current CSV collection process.` });
    if (trades < 0) recs.push({ priority: "High", title: "Trade Volume Decline Research", reason: `Trade count decreased by ${Math.abs(trades)}. Compare Signal and NearMiss trend.` });
    if (correlation > 0) recs.push({ priority: "Medium", title: "Cross CSV Continuation", reason: `Correlation improved by ${correlation}. Keep collecting matching CSV sets.` });
    const worst = worstRows[0];
    if (worst) recs.push({ priority: "Medium", title: `${worst.metric} Weak Snapshot Review`, reason: `${worst.date}: ${worst.reason}` });
    if (!recs.length) recs.push({ priority: "Low", title: "Continue Timeline Collection", reason: "Not enough movement between snapshots. Continue collecting data." });
    return recs.slice(0, 10);
  }

  compareSnapshots() {
    const first = this.history[0];
    const latest = this.history[this.history.length - 1];
    if (!first || !latest || first === latest) return [];
    return [
      deltaRow("Research", latest.researchScore, first.researchScore),
      deltaRow("Quality", latest.qualityScore, first.qualityScore),
      deltaRow("Confidence", latest.confidenceScore, first.confidenceScore),
      deltaRow("Correlation", latest.correlationScore, first.correlationScore),
      deltaRow("Opportunity", latest.opportunityScore, first.opportunityScore),
      deltaRow("CSV", latest.csvCount, first.csvCount),
      deltaRow("Trade", latest.trades, first.trades),
      deltaRow("NearMiss", latest.nearMiss, first.nearMiss)
    ];
  }

  trendSummary(improvement) {
    if (this.history.length < 2) return "Timeline needs at least two snapshots. Load CSV on multiple days to analyze long-term progress.";
    const research = valueOfDelta(improvement, "Research Score");
    const quality = valueOfDelta(improvement, "Quality");
    const near = valueOfDelta(improvement, "NearMiss");
    const trade = valueOfDelta(improvement, "Trade");
    const lines = [];
    lines.push(research > 0 ? "Research Score is improving." : research < 0 ? "Research Score is declining." : "Research Score is stable.");
    lines.push(quality > 0 ? "Data Quality has improved." : quality < 0 ? "Data Quality has weakened." : "Data Quality has remained stable.");
    lines.push(near > 0 ? "NearMiss collection has increased." : near < 0 ? "NearMiss collection has decreased." : "NearMiss collection is stable.");
    lines.push(trade > 0 ? "Trade volume has increased." : trade < 0 ? "Trade volume has decreased." : "Trade volume is stable.");
    return lines.join(" ");
  }
}

function normalizeTrendHistory(history) {
  return (history || []).map((snap, index) => {
    const date = new Date(snap.datetime || Date.now());
    const topResearch = (snap.topResearch || [])[0] || {};
    const qualityScore = Number(snap.dataQuality?.qualityScore ?? snap.qualityScore ?? 0);
    const correlationScore = Number(snap.crossCorrelationScore ?? snap.crossCsv?.score ?? snap.opportunityMatrix?.[0]?.score ?? 0);
    const opportunityScore = Number((snap.opportunityMatrix || [])[0]?.score ?? (snap.crossRecommendations || [])[0]?.score ?? 0);
    const confidenceScore = confidenceToNumber(snap.dataQuality?.confidence || snap.confidence || "");
    return {
      ...snap,
      index,
      datetime: snap.datetime || date.toISOString(),
      date,
      period: date.toISOString().slice(0, 10),
      trades: Number(snap.trades || 0),
      nearMiss: Number(snap.nearMiss || 0),
      winRate: Number(snap.winRate || 0),
      profitFactor: Number(snap.profitFactor || 0),
      checks: Number(snap.checks || 0),
      csvCount: (snap.loadedCsvTypes || []).length,
      loadedCsvTypes: snap.loadedCsvTypes || [],
      researchScore: Number(topResearch.score || snap.researchScore || 0),
      qualityScore,
      correlationScore,
      opportunityScore,
      confidenceScore
    };
  }).sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));
}

function trendRow(snap) {
  return {
    period: snap.period,
    datetime: snap.datetime,
    researchScore: roundTrend(snap.researchScore),
    qualityScore: roundTrend(snap.qualityScore),
    correlationScore: roundTrend(snap.correlationScore),
    opportunityScore: roundTrend(snap.opportunityScore),
    confidenceScore: roundTrend(snap.confidenceScore),
    winRate: roundTrend(snap.winRate),
    profitFactor: roundTrend(snap.profitFactor),
    nearMiss: snap.nearMiss,
    trades: snap.trades,
    csvCount: snap.csvCount
  };
}

function trendBucketKey(date, mode) {
  const d = new Date(date);
  if (mode === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (mode === "week") {
    const first = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d - first) / 86400000) + first.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  return d.toISOString().slice(0, 10);
}

function deltaRow(metric, current, previous, suffix = "") {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  const delta = roundTrend(c - p);
  return { metric, previous: roundTrend(p), current: roundTrend(c), delta, display: `${delta > 0 ? "+" : ""}${delta}${suffix}`, trend: delta > 0 ? "Improved" : delta < 0 ? "Declined" : "Stable" };
}

function bestRow(history, metric, key, highest) {
  if (!history.length) return null;
  const sorted = [...history].sort((a, b) => highest ? Number(b[key] || 0) - Number(a[key] || 0) : Number(a[key] || 0) - Number(b[key] || 0));
  const snap = sorted[0];
  return { metric, date: snap.period, value: roundTrend(snap[key] || 0), snapshot: snap };
}

function worstReason(snap) {
  const reasons = [];
  if (!snap.csvCount) reasons.push("CSV missing");
  if (!snap.nearMiss) reasons.push("NearMiss insufficient");
  if (!snap.trades) reasons.push("Trade insufficient");
  if (snap.qualityScore && snap.qualityScore < 50) reasons.push("Data Quality weak");
  if (snap.correlationScore && snap.correlationScore < 40) reasons.push("Correlation weak");
  return reasons.join(" / ") || "Lowest historical value";
}

function milestone(title, value, target) {
  const percent = Math.min(100, Math.round((Number(value || 0) / target) * 100));
  return { title, value: roundTrend(value), target, percent, status: percent >= 100 ? "Reached" : "In Progress" };
}

function trendState(label, delta) {
  return { label, delta: roundTrend(delta), status: delta > 2 ? "Improving" : delta < -2 ? "Declining" : "Stable" };
}

function valueOfDelta(rows, metric) {
  return Number((rows || []).find((x) => x.metric === metric)?.delta || 0);
}

function confidenceToNumber(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("high")) return 90;
  if (text.includes("medium")) return 65;
  if (text.includes("low")) return 35;
  if (text.includes("insufficient")) return 15;
  return Number(value || 0);
}

function roundTrend(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function trendManagerStamp(items) {
  return (items || []).map((x) => `${x.id || ""}:${x.updatedAt || ""}:${x.decision || ""}:${x.status || ""}`).join("|");
}

function trendHistoryStamp(history) {
  const last = (history || [])[history.length - 1];
  return `${(history || []).length}:${last?.datetime || ""}:${last?.fingerprint || ""}`;
}
