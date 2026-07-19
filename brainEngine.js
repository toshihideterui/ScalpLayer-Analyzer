class BrainEngine {
  constructor({ researchManager, analysisEngine }) {
    this.researchManager = researchManager;
    this.analysisEngine = analysisEngine;
    this.recommendationEngine = new RecommendationEngine(researchManager, analysisEngine);
    this.knowledgeEngine = new KnowledgeEngine(researchManager);
  }

  snapshot() {
    const cache = this.analysisEngine._snapshotCache ||= {};
    if (cache.brain?.version === this.analysisEngine.analysisVersion) {
      if (typeof PerformanceUtil !== "undefined") PerformanceUtil.cacheHit("Brain");
      return cache.brain.snapshot;
    }
    if (typeof PerformanceUtil !== "undefined") {
      PerformanceUtil.cacheMiss("Brain");
      PerformanceUtil.startTimer("Brain");
    }
    const items = this.researchManager.items || [];
    const portfolio = this.researchManager.portfolio();
    const recommendations = this.recommendationEngine.recommendations(5);
    const knowledge = this.knowledgeEngine.entries();
    const clusters = this.knowledgeEngine.clusters();
    const snapshot = {
      overview: this.overview(items, portfolio),
      priorityRanking: this.priorityRanking(items),
      recommendations,
      dependencies: this.dependencies(items),
      roadmap: this.roadmap(items),
      timeline: this.timeline(items),
      statistics: this.statistics(items),
      bottlenecks: this.bottlenecks(items),
      requiredData: this.requiredDataForecast(items),
      queue: this.recommendationEngine.queue(),
      risks: this.risks(items),
      knowledge,
      clusters,
      duplicates: this.knowledgeEngine.duplicates(),
      insights: this.insights(items),
      weekly: this.summaryByDays(items, 7),
      monthly: this.summaryByDays(items, 30)
    };
    cache.brain = { version: this.analysisEngine.analysisVersion, snapshot };
    if (typeof PerformanceUtil !== "undefined") PerformanceUtil.stopTimer("Brain");
    return snapshot;
  }

  overview(items, portfolio) {
    return {
      inProgress: items.filter((x) => !["Completed", "Rejected", "Adopted"].includes(x.status)).length,
      protected: items.filter((x) => ["Completed", "Adopted"].includes(x.status)).length,
      adopted: portfolio.adopted,
      rejected: portfolio.rejected,
      stale: portfolio.stale,
      critical: portfolio.critical,
      total: portfolio.total
    };
  }

  priorityRanking(items) {
    return items.map((item) => ({
      item,
      qualityScore: researchQualityScore(item),
      advisor: advisorText(item)
    })).sort((a, b) => b.qualityScore - a.qualityScore);
  }

  dependencies(items) {
    return items.map((item) => {
      const dependsOn = [];
      if ((item.requiredData || "").includes("NearMiss") && !hasCsv("NearMissHistory")) dependsOn.push("NearMissHistory.csv");
      if ((item.requiredData || "").includes("TradeHistory") && !hasCsv("TradeHistory")) dependsOn.push("TradeHistory.csv");
      if ((item.requiredData || "").includes("EngineActivity") && !hasCsv("EngineActivity")) dependsOn.push("EngineActivity_v2.csv");
      if ((item.requiredData || "").includes("SessionResearch") && !hasCsv("SessionResearch")) dependsOn.push("SessionResearch.csv");
      return { item, dependsOn };
    }).filter((x) => x.dependsOn.length);
  }

  roadmap(items) {
    const statuses = ["Backlog", "Hypothesis", "Ready", "Collecting Data", "Testing", "Review", "Completed", "Revalidation"];
    return statuses.map((status) => ({ status, count: items.filter((x) => x.status === status).length }));
  }

  timeline(items) {
    const rows = [];
    items.forEach((item) => {
      (item.history || []).forEach((h) => rows.push({ date: (h.at || "").slice(0, 10), type: h.type, item }));
      (item.evidence || []).forEach((e) => rows.push({ date: (e.createdAt || e.date || "").slice(0, 10), type: "Evidence", item }));
      (item.decisionLog || []).forEach((d) => rows.push({ date: (d.date || "").slice(0, 10), type: "Decision", item }));
    });
    const grouped = groupBy(rows, (x) => x.date || "Unknown");
    return Object.entries(grouped).map(([date, list]) => ({
      date,
      research: new Set(list.map((x) => x.item.id)).size,
      evidence: list.filter((x) => x.type === "Evidence").length,
      decisions: list.filter((x) => x.type === "Decision").length,
      adopted: list.filter((x) => x.item.decision === "Adopt").length,
      rejected: list.filter((x) => x.item.decision === "Reject").length
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  statistics(items) {
    const done = items.filter((x) => ["Completed", "Adopted", "Rejected"].includes(x.status));
    const durations = done.map((x) => dayDiff(x.createdAt, x.completedAt || x.updatedAt)).filter((x) => Number.isFinite(x));
    return {
      averageDuration: average(durations),
      averageEvidence: average(items.map((x) => (x.evidence || []).length)),
      averageProgress: average(items.map(researchProgress)),
      averageResearchScore: average(items.map((x) => scoreWeight(x.researchScore))),
      averageConfidence: confidenceAverage(items),
      averageDecisionTime: average((items || []).filter((x) => x.decision !== "Undecided").map((x) => dayDiff(x.createdAt, x.updatedAt)))
    };
  }

  bottlenecks(items) {
    return [
      { name: "Evidence missing", count: items.filter((x) => !(x.evidence || []).length).length },
      { name: "Testing stopped", count: items.filter((x) => x.status === "Testing" && !(x.evidence || []).length).length },
      { name: "Review waiting", count: items.filter((x) => x.status === "Review" && x.decision === "Undecided").length },
      { name: "RequiredData missing", count: items.filter((x) => !x.requiredData).length },
      { name: "Stale", count: items.filter(isStaleItem).length }
    ].sort((a, b) => b.count - a.count);
  }

  requiredDataForecast(items) {
    const rows = [];
    items.forEach((item) => {
      const parts = String(item.requiredData || "").split(",").map((x) => x.trim()).filter(Boolean);
      parts.forEach((part) => rows.push({ item, csv: part, exists: hasCsv(part.replace(".csv", "")) }));
    });
    const grouped = groupBy(rows, (x) => x.csv);
    return Object.entries(grouped).map(([csv, list]) => ({
      csv,
      count: list.length,
      missing: list.filter((x) => !x.exists).length,
      collectionRate: Math.round(list.filter((x) => x.exists).length / Math.max(1, list.length) * 100)
    })).sort((a, b) => b.missing - a.missing || b.count - a.count);
  }

  risks(items) {
    return items.map((item) => {
      const risks = [];
      if (!(item.evidence || []).length) risks.push("Low Evidence");
      if (isOldSnapshot(item)) risks.push("Old Snapshot");
      if (["Low", "Insufficient"].includes(item.confidence)) risks.push("Low Confidence");
      if (scoreWeight(item.researchScore) >= 4 && ["Low", "Insufficient"].includes(item.confidence)) risks.push("High Score / Low Confidence");
      if (isStaleItem(item)) risks.push("Stale");
      return { item, risks };
    }).filter((x) => x.risks.length);
  }

  insights(items) {
    const lines = [];
    const top = this.recommendationEngine.recommendations(1)[0];
    if (top) lines.push(`Today priority: ${top.item.title}. ${top.reasons.join(" / ")}.`);
    const bottleneck = this.bottlenecks(items)[0];
    if (bottleneck?.count) lines.push(`Main Research bottleneck: ${bottleneck.name} (${bottleneck.count}).`);
    const stale = items.filter(isStaleItem).length;
    if (stale) lines.push(`${stale} Research items are stale. Review before adding new work.`);
    const duplicates = this.knowledgeEngine.duplicates().length;
    if (duplicates) lines.push(`${duplicates} duplicate Research groups found. Consider merging knowledge.`);
    if (!lines.length) lines.push("Research flow is stable. Continue collecting CSV and evidence.");
    return lines;
  }

  summaryByDays(items, days) {
    const since = Date.now() - days * 86400000;
    return {
      added: items.filter((x) => Date.parse(x.createdAt || "") >= since).length,
      completed: items.filter((x) => ["Completed", "Adopted", "Rejected"].includes(x.status) && Date.parse(x.completedAt || x.updatedAt || "") >= since).length,
      evidence: items.reduce((sum, item) => sum + (item.evidence || []).filter((e) => Date.parse(e.createdAt || e.date || "") >= since).length, 0),
      decisions: items.reduce((sum, item) => sum + (item.decisionLog || []).filter((d) => Date.parse(d.date || "") >= since).length, 0)
    };
  }
}

function researchQualityScore(item) {
  let score = 0;
  score += scoreWeight(item.researchScore) * 12;
  score += confidenceWeight(item.confidence) * 10;
  score += researchProgress(item) * 0.35;
  score += Math.min(20, (item.evidence || []).length * 4);
  if (item.validationPlan) score += 8;
  if (item.sourceAnalyzerSnapshot) score += 6;
  if (item.decision !== "Undecided") score += 8;
  if (researchHealth(item) === "Stale") score -= 12;
  if (researchHealth(item) === "Blocked") score -= 10;
  return Math.max(0, Math.round(score));
}

function advisorText(item) {
  if (!(item.evidence || []).length) return "Evidence is insufficient. Add logs or CSV observations before decision.";
  if (!item.validationPlan) return "Validation plan is missing. Define comparison method first.";
  if (item.status === "Review") return "Decision is required. Record Adopt / Reject / Hold / Revalidate.";
  if (isStaleItem(item)) return "Research is stale. Re-check with latest CSV before continuing.";
  return "Continue current workflow. Do not change EA conditions directly from this screen.";
}

function hasCsv(name) {
  const files = Array.from(engine?.files?.keys?.() || []);
  return files.some((file) => file.toLowerCase().includes(String(name).toLowerCase().replace(".csv", "")));
}

function dayDiff(a, b) {
  const da = Date.parse(a || "");
  const db = Date.parse(b || "");
  if (!da || !db) return NaN;
  return Math.max(0, Math.round((db - da) / 86400000));
}

function average(values) {
  const nums = values.filter((x) => Number.isFinite(Number(x)));
  return nums.length ? nums.reduce((a, b) => a + Number(b), 0) / nums.length : 0;
}

function isOldSnapshot(item, days = 21) {
  const date = Date.parse(item.sourceAnalyzerSnapshot?.datetime || item.beforeSnapshot?.datetime || "");
  return Boolean(date && (Date.now() - date) / 86400000 >= days);
}
