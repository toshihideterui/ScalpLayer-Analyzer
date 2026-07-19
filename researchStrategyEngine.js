class ResearchStrategyEngine {
  constructor({ analysisEngine, researchManager } = {}) {
    this.analysisEngine = analysisEngine;
    this.researchManager = researchManager;
    this.results = analysisEngine?.results || {};
  }

  snapshot() {
    if (this.analysisEngine && !this.analysisEngine._snapshotCache) this.analysisEngine._snapshotCache = {};
    const cache = this.analysisEngine?._snapshotCache || {};
    const key = `${this.analysisEngine?.analysisVersion || 0}:${this.researchItems().length}:${this.history().length}:${this.results.hypothesisLineage?.hypothesisRelations?.length || 0}`;
    if (cache.researchStrategy?.key === key) {
      if (typeof PerformanceUtil !== "undefined") PerformanceUtil.cacheHit("ResearchStrategy");
      return cache.researchStrategy.snapshot;
    }
    if (typeof PerformanceUtil !== "undefined") PerformanceUtil.cacheMiss("ResearchStrategy");

    const candidates = this.buildCandidates();
    const priorityMatrix = this.priorityMatrix(candidates);
    const researchROI = this.researchROI(candidates);
    const coverage = this.coverage(candidates);
    const blockers = this.blockers(candidates);
    const quickWin = researchROI.filter((x) => ["Very Small", "Small"].includes(x.researchCost)).slice(0, 10);
    const longProject = researchROI.filter((x) => ["Large", "Very Large"].includes(x.researchCost) && ["Very High", "High"].includes(x.expectedResearchValue)).slice(0, 10);
    const duplicateResearch = this.duplicateResearch(candidates);
    const missingResearch = this.missingResearch(candidates, coverage);
    const roadmap = this.roadmap(researchROI, blockers, missingResearch);
    const heatmap = this.researchHeatmap(candidates, coverage);
    const dependencies = this.dependencies(candidates);
    const strategySummary = this.strategySummary({ researchROI, coverage, blockers, roadmap, quickWin, longProject });
    const snapshot = {
      version: "6.0",
      researchStrategy: candidates,
      priorityMatrix,
      researchROI,
      coverage,
      roadmap,
      quickWin,
      longProject,
      duplicateResearch,
      missingResearch,
      blockers,
      dependencyAnalyzer: dependencies,
      researchHeatMap: heatmap,
      strategySummary
    };
    cache.researchStrategy = { key, snapshot };
    return snapshot;
  }

  buildCandidates() {
    const rows = [];
    const add = (item) => {
      if (!item?.title) return;
      rows.push({
        id: item.id || `STR-${rows.length}-${item.title}`,
        title: item.title,
        source: item.source || "Analyzer",
        target: item.target || item.engine || item.condition || item.session || "-",
        engine: item.engine || "",
        session: item.session || "",
        condition: item.condition || "",
        reason: item.reason || "Research candidate generated from Analyzer data.",
        expectedImpact: item.expectedImpact || "Clarifies next Research direction.",
        evidenceCount: Number(item.evidenceCount || 0),
        confidence: item.confidence || "Medium",
        score: Number(item.score || 0),
        validationReadiness: Number(item.validationReadiness || 0),
        blockerReasons: item.blockerReasons || []
      });
    };

    (this.results.workspace?.queue || []).slice(0, 40).forEach((x) => add({
      id: `WS-${x.id}`,
      title: x.title,
      source: x.source || "Research Workspace",
      target: x.engine || x.type,
      engine: x.engine || "",
      reason: x.reason,
      expectedImpact: x.expectedImpact,
      confidence: x.confidence,
      score: starScoreRs(x.researchScore) * 20,
      validationReadiness: x.type === "Hypothesis Lineage" ? extractPercentRs(x.reason) : 55
    }));

    (this.results.intelligence || []).slice(0, 30).forEach((x, i) => add({
      id: `INT-${i}`,
      title: x.title,
      source: "Research Intelligence",
      target: x.target,
      engine: x.engine || x.target || "",
      reason: x.reason,
      expectedImpact: "Uses current Research Intelligence ranking.",
      confidence: x.confidence || "Medium",
      score: Number(x.score || 0),
      validationReadiness: 50
    }));

    (this.results.crossCsv?.recommendations || []).slice(0, 20).forEach((x, i) => add({
      id: `CROSS-${i}`,
      title: x.title,
      source: "Cross CSV",
      target: x.target || x.title,
      reason: x.reason,
      expectedImpact: "Cross CSV relation can improve reproducibility review.",
      confidence: "Cross CSV",
      score: starScoreRs(x.stars) * 20,
      validationReadiness: 62
    }));

    (this.results.hypothesisLineage?.enrichedHypotheses || []).slice(0, 30).forEach((x) => add({
      id: `HYP-${x.id}`,
      title: `${x.title} Strategy Review`,
      source: "Hypothesis Lineage",
      target: x.engine || x.condition || x.source,
      engine: x.engine || "",
      session: x.session || "",
      condition: x.condition || "",
      reason: `Score2=${x.score2}, Readiness=${x.validationReadiness}, Confidence=${x.confidencePercent}%.`,
      expectedImpact: "Decides whether this hypothesis is ready for validation.",
      confidence: `${x.confidence2} / ${x.confidencePercent}%`,
      score: Number(x.score2 || 0),
      validationReadiness: Number(x.validationReadiness || 0),
      evidenceCount: x.evidence?.length || 0,
      blockerReasons: (x.openQuestions || []).map((q) => String(q))
    }));

    (this.results.engineDna?.hiddenOpportunity || []).slice(0, 12).forEach((x, i) => add({
      id: `DNA-HIDDEN-${i}`,
      title: `${x.engine} Hidden Opportunity Research`,
      source: "Engine DNA",
      target: x.engine,
      engine: x.engine,
      reason: x.reason,
      expectedImpact: "Investigates Engine profile with signals or NearMiss but low trades.",
      confidence: "Needs Research",
      score: 68,
      validationReadiness: x.trades ? 55 : 35,
      blockerReasons: x.trades ? [] : ["Trade insufficient"]
    }));

    (this.results.nearMiss?.ngReasons || []).slice(0, 12).forEach((x, i) => add({
      id: `TOPNG-${i}-${x.name}`,
      title: `${x.name} Bottleneck Research`,
      source: "NearMiss",
      target: x.name,
      condition: x.name,
      reason: `${x.name} is a TopNG condition with ${x.count} events.`,
      expectedImpact: "Clarifies whether this condition is a real blocker.",
      confidence: x.count >= 100 ? "High" : x.count >= 30 ? "Medium" : "Low",
      score: Math.min(90, 45 + Number(x.count || 0) / 3),
      validationReadiness: x.count >= 30 ? 65 : 35,
      blockerReasons: []
    }));

    this.researchItems().slice(0, 80).forEach((item) => add({
      id: `RM-${item.id}`,
      title: item.title,
      source: "Research Manager",
      target: item.engine || item.condition || item.category || "-",
      engine: item.engine || "",
      session: item.session || "",
      condition: item.condition || "",
      reason: item.reason || item.validationPlan || "-",
      expectedImpact: item.nextAction || "Continue managed Research item.",
      confidence: item.confidence || "Research Manager",
      score: starScoreRs(item.researchScore) * 20 || progressScoreRs(item),
      validationReadiness: readinessFromResearchItemRs(item),
      evidenceCount: item.evidence?.length || 0,
      blockerReasons: blockerFromResearchItemRs(item)
    }));

    return dedupeStrategyRs(rows).map((x) => this.enrichCandidate(x)).sort((a, b) => b.strategyScore - a.strategyScore).slice(0, 500);
  }

  enrichCandidate(item) {
    const cost = researchCostRs(item);
    const value = expectedValueRs(item);
    const roiScore = roiScoreRs(value, cost, item);
    const priority = priorityRs(item, roiScore);
    const risk = researchRiskRs(item);
    const blockers = this.candidateBlockers(item);
    return {
      ...item,
      priority,
      researchCost: cost,
      expectedResearchValue: value,
      researchROI: starsFromScoreRs(roiScore),
      roiScore,
      researchRisk: risk,
      blockers,
      strategyScore: Math.round(roiScore * 14 + priorityRankRs(priority) * 8 - blockers.length * 5 - riskRankRs(risk) * 3)
    };
  }

  candidateBlockers(item) {
    const blockers = new Set(item.blockerReasons || []);
    if ((item.evidenceCount || 0) < 2 && /Hypothesis|Research Manager/i.test(item.source)) blockers.add("Evidence insufficient");
    if (!this.results.trades?.length) blockers.add("Trade insufficient");
    if (!this.results.nearMiss?.total) blockers.add("NearMiss insufficient");
    if (!this.results.session?.length) blockers.add("Session insufficient");
    if (!this.results.knowledgeGraph?.nodes?.length) blockers.add("Knowledge Graph insufficient");
    if (!this.results.crossCsv) blockers.add("Cross CSV insufficient");
    if (!this.results.timeline?.length) blockers.add("Timeline insufficient");
    if ((item.validationReadiness || 0) < 45) blockers.add("Validation insufficient");
    return Array.from(blockers).slice(0, 8);
  }

  priorityMatrix(candidates) {
    const groups = ["Critical", "High", "Medium", "Low", "Deferred"];
    return groups.map((priority) => ({
      priority,
      count: candidates.filter((x) => x.priority === priority).length,
      items: candidates.filter((x) => x.priority === priority).slice(0, 10)
    }));
  }

  researchROI(candidates) {
    return candidates.slice().sort((a, b) => b.roiScore - a.roiScore || b.strategyScore - a.strategyScore).slice(0, 50);
  }

  coverage(candidates) {
    const areas = [
      ["Engine", this.results.engineActivity?.map((x) => x.engine) || [], candidates.map((x) => x.engine).filter(Boolean)],
      ["Session", (this.results.session || []).map((x) => x.session), candidates.map((x) => x.session).filter(Boolean)],
      ["Condition", (this.results.condition || []).map((x) => x.condition), candidates.map((x) => x.condition).filter(Boolean)],
      ["TopNG", (this.results.nearMiss?.ngReasons || []).map((x) => x.name), candidates.map((x) => x.condition).filter(Boolean)],
      ["Knowledge Graph", this.results.knowledgeGraph?.nodes?.map((x) => x.label) || [], candidates.map((x) => x.target)],
      ["Research Manager", this.researchItems().map((x) => x.title), candidates.filter((x) => x.source === "Research Manager").map((x) => x.title)],
      ["Workspace", this.results.workspace?.queue?.map((x) => x.title) || [], candidates.filter((x) => x.source === "Research Workspace").map((x) => x.title)],
      ["Hypothesis", this.results.hypothesis?.hypotheses?.map((x) => x.title) || [], candidates.filter((x) => /Hypothesis/i.test(x.source)).map((x) => x.title)],
      ["Cross CSV", this.results.crossCsv?.recommendations?.map((x) => x.title) || [], candidates.filter((x) => x.source === "Cross CSV").map((x) => x.title)],
      ["Timeline", this.results.timeline?.map((x) => x.datetime || x.date || "Snapshot") || [], candidates.filter((x) => x.source === "Timeline").map((x) => x.title)]
    ];
    return areas.map(([area, base, researched]) => {
      const baseSet = new Set((base || []).map(normalizeRs).filter(Boolean));
      const researchSet = new Set((researched || []).map(normalizeRs).filter(Boolean));
      const overlap = Array.from(baseSet).filter((x) => researchSet.has(x)).length;
      const percent = baseSet.size ? Math.round((overlap / baseSet.size) * 100) : (researchSet.size ? 100 : 0);
      return { area, baseCount: baseSet.size, researchedCount: researchSet.size, coveragePercent: percent, status: coverageStatusRs(percent) };
    });
  }

  blockers(candidates) {
    const counts = new Map();
    candidates.forEach((c) => c.blockers.forEach((b) => counts.set(b, (counts.get(b) || 0) + 1)));
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }

  roadmap(researchROI, blockers, missingResearch) {
    const selected = [];
    researchROI.slice(0, 8).forEach((item) => selected.push({
      step: selected.length + 1,
      title: item.title,
      priority: item.priority,
      roi: item.researchROI,
      action: `Research ${item.target}. Do not change trading conditions from this screen.`,
      blocker: item.blockers[0] || "-"
    }));
    missingResearch.slice(0, 2).forEach((item) => selected.push({
      step: selected.length + 1,
      title: item.title,
      priority: "Medium",
      roi: "2/5",
      action: item.reason,
      blocker: blockers[0]?.name || "-"
    }));
    return selected.slice(0, 10);
  }

  duplicateResearch(candidates) {
    const rows = [];
    for (let i = 0; i < candidates.length; i += 1) {
      for (let j = i + 1; j < Math.min(candidates.length, i + 80); j += 1) {
        const score = similarityRs(`${candidates[i].title} ${candidates[i].target}`, `${candidates[j].title} ${candidates[j].target}`);
        if (score >= 80) rows.push({ source: candidates[i].title, target: candidates[j].title, similarity: score, note: "Possible duplicate Research. Do not merge automatically." });
      }
    }
    return rows.slice(0, 40);
  }

  missingResearch(candidates, coverage) {
    return coverage.filter((x) => x.coveragePercent < 40).map((x) => ({
      title: `${x.area} Coverage Research`,
      area: x.area,
      reason: `${x.area} coverage is ${x.coveragePercent}%. Add research review if this area matters.`,
      coveragePercent: x.coveragePercent,
      status: x.status
    }));
  }

  researchHeatmap(candidates, coverage) {
    const researchedTargets = new Set(candidates.map((x) => normalizeRs(x.target || x.title)));
    return coverage.map((x) => ({
      area: x.area,
      coveragePercent: x.coveragePercent,
      state: x.coveragePercent >= 70 ? "Researched" : x.coveragePercent >= 30 ? "In Research" : "Unresearched",
      researchedTargets: researchedTargets.size
    }));
  }

  dependencies(candidates) {
    return candidates.slice(0, 50).map((candidate) => ({
      research: candidate.title,
      requiredBefore: candidate.blockers.includes("Evidence insufficient") ? "Collect Evidence" : candidate.blockers.includes("Timeline insufficient") ? "Collect Timeline Snapshot" : candidate.blockers.includes("Cross CSV insufficient") ? "Load Cross CSV Inputs" : "-",
      blockers: candidate.blockers.join(" / ") || "-",
      relation: candidate.source
    }));
  }

  strategySummary({ researchROI, coverage, blockers, roadmap, quickWin, longProject }) {
    const best = researchROI[0];
    const highestImpact = researchROI.find((x) => x.expectedResearchValue === "Very High") || best;
    const lowestCost = researchROI.find((x) => x.researchCost === "Very Small") || researchROI.find((x) => x.researchCost === "Small") || best;
    const coveragePercent = Math.round(avgRs(coverage.map((x) => x.coveragePercent)));
    return {
      currentBestResearch: best?.title || "-",
      highestROI: best?.title || "-",
      highestImpact: highestImpact?.title || "-",
      lowestCost: lowestCost?.title || "-",
      currentBlocker: blockers[0]?.name || "-",
      coverage: `${coveragePercent}%`,
      coveragePercent,
      roadmap: roadmap[0]?.title || "-",
      quickWin: quickWin[0]?.title || "-",
      longProject: longProject[0]?.title || "-",
      blockerCount: blockers.length,
      roadmapProgress: roadmap.length ? Math.round((roadmap.filter((x) => x.blocker === "-").length / roadmap.length) * 100) : 0,
      summary: best ? `Next Research candidate is ${best.title}. Priority=${best.priority}, ROI=${best.researchROI}, Risk=${best.researchRisk}.` : "Load CSV or create Research items to activate Strategy Engine."
    };
  }

  researchItems() {
    if (Array.isArray(this.researchManager?.items)) return this.researchManager.items;
    if (typeof ResearchStorage !== "undefined") return ResearchStorage.loadItems();
    return [];
  }

  history() {
    try {
      if (typeof loadResearchHistory === "function") return loadResearchHistory();
      return JSON.parse(localStorage.getItem("scalplayerResearchHistory") || "[]");
    } catch {
      return [];
    }
  }
}

function researchCostRs(item) {
  const blockers = item.blockerReasons?.length || 0;
  const readiness = Number(item.validationReadiness || 0);
  if (readiness >= 80 && blockers <= 1) return "Very Small";
  if (readiness >= 60 && blockers <= 2) return "Small";
  if (readiness >= 40) return "Medium";
  if (blockers >= 4) return "Very Large";
  return "Large";
}

function expectedValueRs(item) {
  const score = Number(item.score || 0);
  const evidence = Number(item.evidenceCount || 0);
  if (score >= 80 || evidence >= 8) return "Very High";
  if (score >= 65 || evidence >= 4) return "High";
  if (score >= 45) return "Medium";
  if (score >= 25) return "Low";
  return "Very Low";
}

function roiScoreRs(value, cost, item) {
  const valueScore = { "Very Low": 1, Low: 2, Medium: 3, High: 4, "Very High": 5 }[value] || 3;
  const costScore = { "Very Small": 1, Small: 2, Medium: 3, Large: 4, "Very Large": 5 }[cost] || 3;
  const confidenceBonus = /High|Cross|Graph/i.test(item.confidence || "") ? 0.5 : 0;
  return Math.max(1, Math.min(5, Math.round((valueScore / costScore + confidenceBonus) * 1.2)));
}

function priorityRs(item, roiScore) {
  if ((item.score || 0) >= 80 && roiScore >= 4) return "Critical";
  if ((item.score || 0) >= 65 && roiScore >= 3) return "High";
  if ((item.score || 0) >= 45) return "Medium";
  if ((item.score || 0) >= 25) return "Low";
  return "Deferred";
}

function researchRiskRs(item) {
  const blockers = item.blockers?.length || item.blockerReasons?.length || 0;
  if (blockers >= 5 || (item.validationReadiness || 0) < 25) return "High";
  if (blockers >= 2 || (item.validationReadiness || 0) < 55) return "Medium";
  return "Low";
}

function readinessFromResearchItemRs(item) {
  let score = 0;
  if (item.hypothesis) score += 15;
  if (item.reason) score += 10;
  if (item.validationPlan) score += 15;
  if (item.successCriteria) score += 10;
  if (item.failureCriteria) score += 10;
  if (item.requiredData) score += 10;
  if (item.evidence?.length) score += Math.min(20, item.evidence.length * 5);
  if (item.decision && item.decision !== "Undecided") score += 10;
  return Math.min(100, score);
}

function blockerFromResearchItemRs(item) {
  const rows = [];
  if (!item.evidence?.length) rows.push("Evidence insufficient");
  if (!item.validationPlan) rows.push("Validation insufficient");
  if (!item.requiredData) rows.push("Required data insufficient");
  if (!item.successCriteria || !item.failureCriteria) rows.push("Criteria insufficient");
  return rows;
}

function progressScoreRs(item) {
  if (typeof researchProgress === "function") return researchProgress(item);
  return readinessFromResearchItemRs(item);
}

function starScoreRs(value) {
  const text = String(value || "");
  const match = text.match(/([1-5])\/5/);
  if (match) return Number(match[1]);
  const stars = (text.match(/★/g) || []).length;
  if (stars) return stars;
  const n = Number(text);
  if (Number.isFinite(n)) return n > 5 ? Math.round(n / 20) : Math.round(n);
  return 3;
}

function starsFromScoreRs(score) {
  const n = Math.max(1, Math.min(5, Math.round(Number(score || 0))));
  return `${n}/5`;
}

function priorityRankRs(priority) {
  return { Critical: 5, High: 4, Medium: 3, Low: 2, Deferred: 1 }[priority] || 1;
}

function riskRankRs(risk) {
  return { Low: 1, Medium: 2, High: 3 }[risk] || 2;
}

function coverageStatusRs(percent) {
  if (percent >= 70) return "Researched";
  if (percent >= 30) return "In Research";
  return "Unresearched";
}

function normalizeRs(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function dedupeStrategyRs(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = normalizeRs(`${row.title}:${row.source}:${row.target}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function similarityRs(a, b) {
  const aa = new Set(String(a || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const bb = new Set(String(b || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  if (!aa.size || !bb.size) return 0;
  const intersection = Array.from(aa).filter((x) => bb.has(x)).length;
  const union = new Set([...aa, ...bb]).size;
  return Math.round((intersection / union) * 100);
}

function avgRs(values) {
  const rows = (values || []).map(Number).filter(Number.isFinite);
  return rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : 0;
}

function extractPercentRs(value) {
  const match = String(value || "").match(/Readiness=(\d+)/i);
  return match ? Number(match[1]) : 55;
}
