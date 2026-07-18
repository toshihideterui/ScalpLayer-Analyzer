const HYPOTHESIS_LINEAGE_STORAGE_KEY = "scalplayerHypothesisLineage";
const EVIDENCE_WEIGHTS_STORAGE_KEY = "scalplayerEvidenceWeights";
const HYPOTHESIS_HISTORY_STORAGE_KEY = "scalplayerHypothesisHistory";
const HYPOTHESIS_REVIEW_STORAGE_KEY = "scalplayerHypothesisReview";

const HYPOTHESIS_RELATION_TYPES = [
  "Parent",
  "Child",
  "Supports",
  "Contradicts",
  "Derived From",
  "Duplicate",
  "Alternative",
  "Requires",
  "Supersedes"
];

const DEFAULT_EVIDENCE_WEIGHTS = {
  "Research Manager": 1.00,
  Trade: 1.00,
  NearMiss: 0.85,
  "Engine DNA": 0.80,
  "Cross CSV": 0.90,
  "Knowledge Graph": 0.70,
  Timeline: 0.65,
  "Data Quality": 0.95,
  "Manual Evidence": 0.75,
  Other: 0.50
};

class HypothesisLineageStore {
  static loadRelations() {
    try {
      const parsed = JSON.parse(localStorage.getItem(HYPOTHESIS_LINEAGE_STORAGE_KEY) || "{}");
      return Array.isArray(parsed.relations) ? parsed.relations : [];
    } catch (error) {
      console.warn("Hypothesis lineage storage was reset.", error);
      return [];
    }
  }

  static saveRelations(relations) {
    const safe = Array.isArray(relations) ? relations.slice(0, 2000) : [];
    localStorage.setItem(HYPOTHESIS_LINEAGE_STORAGE_KEY, JSON.stringify({ relations: safe }));
    return safe;
  }

  static addRelation({ sourceId, targetId, relationType, note = "" }) {
    const source = String(sourceId || "");
    const target = String(targetId || "");
    const type = HYPOTHESIS_RELATION_TYPES.includes(relationType) ? relationType : "Supports";
    if (!source || !target || source === target) return HypothesisLineageStore.loadRelations();
    const current = HypothesisLineageStore.loadRelations();
    const exists = current.some((x) => x.sourceId === source && x.targetId === target && x.relationType === type);
    if (exists) return current;
    const now = new Date().toISOString();
    const relation = {
      id: `REL-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sourceId: source,
      targetId: target,
      relationType: type,
      note: note || "",
      createdAt: now,
      updatedAt: now
    };
    const next = HypothesisLineageStore.saveRelations([relation, ...current]);
    HypothesisHistoryStore.add(source, "Relation Added", "", `${type} -> ${target}`, note || "");
    if (typeof ResearchWorkspaceStore !== "undefined") ResearchWorkspaceStore.addActivity("Relation Added", type, `${source} -> ${target}`);
    return next;
  }

  static updateRelation(id, patch = {}) {
    const current = HypothesisLineageStore.loadRelations();
    const next = current.map((x) => x.id === id ? {
      ...x,
      relationType: HYPOTHESIS_RELATION_TYPES.includes(patch.relationType) ? patch.relationType : x.relationType,
      note: patch.note ?? x.note,
      updatedAt: new Date().toISOString()
    } : x);
    HypothesisLineageStore.saveRelations(next);
    HypothesisHistoryStore.add(id, "Relation Updated", "", JSON.stringify(patch), patch.note || "");
    return next;
  }

  static deleteRelation(id) {
    const current = HypothesisLineageStore.loadRelations();
    const removed = current.find((x) => x.id === id);
    const next = HypothesisLineageStore.saveRelations(current.filter((x) => x.id !== id));
    if (removed) HypothesisHistoryStore.add(removed.sourceId, "Relation Removed", `${removed.relationType} -> ${removed.targetId}`, "", removed.note || "");
    return next;
  }
}

class EvidenceWeightStore {
  static load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(EVIDENCE_WEIGHTS_STORAGE_KEY) || "{}");
      return { ...DEFAULT_EVIDENCE_WEIGHTS, ...(parsed && typeof parsed === "object" ? parsed : {}) };
    } catch (error) {
      console.warn("Evidence weights were reset.", error);
      return { ...DEFAULT_EVIDENCE_WEIGHTS };
    }
  }

  static save(weights) {
    const next = {};
    Object.keys(DEFAULT_EVIDENCE_WEIGHTS).forEach((key) => {
      const value = Number(weights?.[key]);
      next[key] = Number.isFinite(value) ? Math.max(0, Math.min(2, Math.round(value * 100) / 100)) : DEFAULT_EVIDENCE_WEIGHTS[key];
    });
    localStorage.setItem(EVIDENCE_WEIGHTS_STORAGE_KEY, JSON.stringify(next));
    HypothesisHistoryStore.add("EvidenceWeights", "Evidence Weighted", "", JSON.stringify(next), "Save Evidence Weights");
    return next;
  }

  static reset() {
    localStorage.setItem(EVIDENCE_WEIGHTS_STORAGE_KEY, JSON.stringify(DEFAULT_EVIDENCE_WEIGHTS));
    HypothesisHistoryStore.add("EvidenceWeights", "Evidence Weighted", "", "Default", "Reset Evidence Weights");
    return { ...DEFAULT_EVIDENCE_WEIGHTS };
  }
}

class HypothesisHistoryStore {
  static load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(HYPOTHESIS_HISTORY_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.slice(0, 500) : [];
    } catch (error) {
      console.warn("Hypothesis history was reset.", error);
      return [];
    }
  }

  static save(history) {
    localStorage.setItem(HYPOTHESIS_HISTORY_STORAGE_KEY, JSON.stringify((history || []).slice(0, 500)));
  }

  static add(hypothesisId, type, before = "", after = "", note = "") {
    const item = {
      id: `HIS-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      hypothesisId,
      type,
      before,
      after,
      note,
      createdAt: new Date().toISOString()
    };
    HypothesisHistoryStore.save([item, ...HypothesisHistoryStore.load()]);
    return item;
  }
}

class HypothesisReviewStore {
  static load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(HYPOTHESIS_REVIEW_STORAGE_KEY) || "{}");
      return {
        contradictionsReviewed: parsed.contradictionsReviewed && typeof parsed.contradictionsReviewed === "object" ? parsed.contradictionsReviewed : {},
        openQuestionsReviewed: parsed.openQuestionsReviewed && typeof parsed.openQuestionsReviewed === "object" ? parsed.openQuestionsReviewed : {}
      };
    } catch (error) {
      console.warn("Hypothesis review storage was reset.", error);
      return { contradictionsReviewed: {}, openQuestionsReviewed: {} };
    }
  }

  static set(id, field, value) {
    const current = HypothesisReviewStore.load();
    if (!current[field]) current[field] = {};
    current[field][id] = Boolean(value);
    localStorage.setItem(HYPOTHESIS_REVIEW_STORAGE_KEY, JSON.stringify(current));
    HypothesisHistoryStore.add(id, field === "contradictionsReviewed" ? "Contradictions Reviewed" : "Open Questions Reviewed", "", String(Boolean(value)), "");
    return current;
  }
}

class HypothesisLineageEngine {
  constructor({ analysisEngine, researchManager } = {}) {
    this.analysisEngine = analysisEngine;
    this.researchManager = researchManager;
    this.results = analysisEngine?.results || {};
  }

  snapshot() {
    if (this.analysisEngine && !this.analysisEngine._snapshotCache) this.analysisEngine._snapshotCache = {};
    const cache = this.analysisEngine?._snapshotCache || {};
    const hypothesis = this.hypothesisSnapshot();
    const relations = HypothesisLineageStore.loadRelations();
    const weights = EvidenceWeightStore.load();
    const history = HypothesisHistoryStore.load();
    const review = HypothesisReviewStore.load();
    const key = `${this.analysisEngine?.analysisVersion || 0}:${hypothesis.hypotheses.length}:${relations.length}:${history.length}:${JSON.stringify(weights)}:${JSON.stringify(review)}`;
    if (cache.hypothesisLineage?.key === key) {
      if (typeof PerformanceUtil !== "undefined") PerformanceUtil.cacheHit("HypothesisLineage");
      return cache.hypothesisLineage.snapshot;
    }
    if (typeof PerformanceUtil !== "undefined") PerformanceUtil.cacheMiss("HypothesisLineage");

    const enriched = this.enrichHypotheses(hypothesis.hypotheses, relations, weights, history, review);
    const nodes = enriched.map((h) => this.nodeFromHypothesis(h));
    const edges = this.safeRelations(relations, enriched).map((r) => this.edgeFromRelation(r));
    const families = this.buildFamilies(enriched, edges);
    const statistics = this.statistics(enriched, edges, families);
    const duplicates = this.duplicateCandidates(enriched);
    const orphanHypotheses = this.orphans(enriched, edges, duplicates);
    const superseded = this.superseded(enriched, edges);
    const compareSummary = this.compareSummary(enriched, families, edges);
    const weightedEvidenceSummary = this.weightedEvidenceSummary(enriched, weights);
    const lineageSummary = this.lineageSummary(enriched, statistics, families, weightedEvidenceSummary, duplicates, orphanHypotheses, superseded);
    const timeline = this.timeline(history, enriched);
    const snapshot = {
      version: "5.3",
      relationTypes: HYPOTHESIS_RELATION_TYPES,
      hypothesisLineage: { nodes, edges },
      hypothesisRelations: this.safeRelations(relations, enriched),
      hypothesisFamilies: families,
      hypothesisLineageSummary: lineageSummary,
      lineagesStatistics: statistics,
      evidenceWeights: weights,
      weightedEvidenceSummary,
      hypothesisScore2: enriched.map((h) => this.scoreRow(h)),
      hypothesisConfidence2: enriched.map((h) => ({ id: h.id, title: h.title, confidence: h.confidence2, confidencePercent: h.confidencePercent, sourceDiversity: h.sourceDiversity })),
      validationReadiness: enriched.map((h) => ({ id: h.id, title: h.title, readiness: h.validationReadiness, readinessLabel: h.validationReadinessLabel })),
      validationChecklist: enriched.map((h) => ({ id: h.id, title: h.title, checklist: h.validationChecklist })),
      hypothesisHistory: timeline,
      duplicateHypotheses: duplicates,
      orphanHypotheses,
      supersededHypotheses: superseded,
      hypothesisCompareSummary: compareSummary,
      enrichedHypotheses: enriched,
      warnings: this.warnings({ duplicates, orphanHypotheses, superseded })
    };
    cache.hypothesisLineage = { key, snapshot };
    return snapshot;
  }

  hypothesisSnapshot() {
    if (this.results.hypothesis?.hypotheses) return this.results.hypothesis;
    if (typeof ResearchHypothesisEngine !== "undefined") return new ResearchHypothesisEngine({ analysisEngine: this.analysisEngine, researchManager: this.researchManager }).snapshot();
    return { hypotheses: [], hypothesisSummary: {}, evidenceSummary: {}, contradictions: [], openQuestions: [] };
  }

  enrichHypotheses(hypotheses, relations, weights, history, review) {
    const safeRelations = this.safeRelations(relations, hypotheses);
    const duplicates = this.duplicateCandidates(hypotheses);
    return (hypotheses || []).slice(0, 500).map((h) => {
      const weightedEvidence = (h.evidence || []).map((e) => this.weightEvidence(e, weights));
      const weightedEvidenceScore = roundHl(weightedEvidence.reduce((sum, e) => sum + e.weightedScore, 0));
      const sourceDiversity = new Set(weightedEvidence.map((e) => e.source)).size;
      const ownRelations = safeRelations.filter((r) => r.sourceId === h.id || r.targetId === h.id);
      const contradictionCount = (h.contradictions || []).length + ownRelations.filter((r) => r.relationType === "Contradicts").length;
      const openQuestionCount = (h.openQuestions || []).length;
      const scoreBreakdown = this.scoreBreakdown(h, weightedEvidenceScore, sourceDiversity, contradictionCount, openQuestionCount, ownRelations, duplicates);
      const validationChecklist = this.validationChecklist(h, sourceDiversity, review);
      const validationReadiness = validationChecklist.filter((x) => x.done).length / validationChecklist.length * 100;
      const confidencePercent = this.confidencePercent(h, weightedEvidenceScore, sourceDiversity, contradictionCount, openQuestionCount, validationReadiness, ownRelations);
      const family = this.familyName(h, safeRelations, hypotheses);
      return {
        ...h,
        weightedEvidence,
        weightedEvidenceScore,
        sourceDiversity,
        confidencePercent,
        confidence2: confidenceLabelHl(confidencePercent),
        scoreBreakdown,
        score2: scoreBreakdown.finalScore,
        validationChecklist,
        validationReadiness: Math.round(validationReadiness),
        validationReadinessLabel: readinessLabelHl(validationReadiness),
        family,
        parents: safeRelations.filter((r) => r.targetId === h.id && ["Parent", "Derived From", "Requires"].includes(r.relationType)).map((r) => r.sourceId),
        children: safeRelations.filter((r) => r.sourceId === h.id && ["Parent", "Derived From", "Requires"].includes(r.relationType)).map((r) => r.targetId),
        supports: safeRelations.filter((r) => (r.sourceId === h.id || r.targetId === h.id) && r.relationType === "Supports"),
        contradicts: safeRelations.filter((r) => (r.sourceId === h.id || r.targetId === h.id) && r.relationType === "Contradicts"),
        relations: ownRelations,
        historyCount: history.filter((x) => x.hypothesisId === h.id).length,
        possibleDuplicate: duplicates.some((d) => d.sourceId === h.id || d.targetId === h.id),
        superseded: safeRelations.some((r) => r.targetId === h.id && r.relationType === "Supersedes")
      };
    }).sort((a, b) => b.score2 - a.score2 || b.confidencePercent - a.confidencePercent);
  }

  safeRelations(relations, hypotheses) {
    const ids = new Set((hypotheses || []).map((h) => h.id));
    const unique = new Map();
    (relations || []).forEach((r) => {
      if (!ids.has(r.sourceId) || !ids.has(r.targetId) || r.sourceId === r.targetId) return;
      const type = HYPOTHESIS_RELATION_TYPES.includes(r.relationType) ? r.relationType : "Supports";
      const key = `${r.sourceId}|${r.targetId}|${type}`;
      if (!unique.has(key)) unique.set(key, { ...r, relationType: type });
    });
    return Array.from(unique.values()).slice(0, 2000);
  }

  weightEvidence(e, weights) {
    const source = e.source || "Other";
    const sourceWeight = Number(weights[source] ?? weights.Other ?? 0.5);
    const polarityWeight = { Support: 1, Neutral: 0.25, Contradiction: -1 }[e.polarity] ?? 0.25;
    const strength = this.evidenceStrength(e);
    const strengthWeight = { High: 1, Medium: 0.7, Low: 0.4, Unknown: 0.25 }[strength] || 0.25;
    return {
      ...e,
      sourceWeight,
      polarityWeight,
      strength,
      strengthWeight,
      weightedScore: roundHl(sourceWeight * polarityWeight * strengthWeight)
    };
  }

  evidenceStrength(e) {
    const text = `${e.value ?? ""} ${e.detail ?? ""} ${e.title ?? ""}`;
    const n = extractLargestNumberHl(text);
    if (e.source === "Trade") {
      if (n >= 50) return "High";
      if (n >= 20) return "Medium";
      if (n >= 1) return "Low";
      return "Unknown";
    }
    if (e.source === "NearMiss") {
      if (n >= 100) return "High";
      if (n >= 30) return "Medium";
      if (n >= 1) return "Low";
      return "Unknown";
    }
    if (e.source === "Data Quality") {
      if (n >= 80) return "High";
      if (n >= 60) return "Medium";
      if (n >= 1) return "Low";
      return "Unknown";
    }
    if (e.source === "Cross CSV") {
      if (n >= 75) return "High";
      if (n >= 50) return "Medium";
      if (n >= 1) return "Low";
    }
    if (e.source === "Engine DNA") {
      if (/High/i.test(text)) return "High";
      if (/Medium/i.test(text)) return "Medium";
      if (/Low/i.test(text)) return "Low";
    }
    if (e.source === "Timeline") {
      const snapshots = this.results.timeline?.length || 0;
      if (snapshots >= 6) return "High";
      if (snapshots >= 3) return "Medium";
      if (snapshots >= 1) return "Low";
    }
    if (e.source === "Knowledge Graph") {
      if (n >= 10) return "High";
      if (n >= 4) return "Medium";
      if (n >= 1) return "Low";
    }
    return n >= 10 ? "Medium" : n >= 1 ? "Low" : "Unknown";
  }

  scoreBreakdown(h, weightedEvidenceScore, sourceDiversity, contradictionCount, openQuestionCount, relations, duplicates) {
    const quality = Number(this.results.dataQuality?.qualityScore || 0);
    const cross = Number(this.results.crossCsv?.correlationScore || 0);
    const stability = h.evidence?.some((e) => e.source === "Engine DNA" && e.polarity === "Support") ? 8 : 0;
    const timeline = Math.min(8, (this.results.timeline?.length || 0) * 1.2);
    const validation = this.validationTextScore(h);
    const duplicatePenalty = duplicates.some((d) => d.sourceId === h.id || d.targetId === h.id) ? 8 : 0;
    const supersededPenalty = relations.some((r) => r.targetId === h.id && r.relationType === "Supersedes") ? 18 : 0;
    const contradictionPenalty = contradictionCount * 9;
    const openQuestionPenalty = openQuestionCount * 3;
    const lineagePenalty = duplicatePenalty + supersededPenalty;
    const baseEvidence = Math.max(0, Math.min(40, weightedEvidenceScore * 10 + 16));
    const finalScore = clampHl(Math.round(baseEvidence + quality * 0.1 + cross * 0.08 + stability + timeline + validation - contradictionPenalty - openQuestionPenalty - lineagePenalty), 0, 100);
    return {
      baseEvidence: roundHl(baseEvidence),
      qualityBonus: roundHl(quality * 0.1),
      crossCsvBonus: roundHl(cross * 0.08),
      stabilityBonus: stability,
      timelineBonus: roundHl(timeline),
      validationBonus: validation,
      contradictionPenalty,
      openQuestionPenalty,
      lineagePenalty,
      duplicatePenalty,
      supersededPenalty,
      finalScore
    };
  }

  validationTextScore(h) {
    let score = 0;
    if (h.hypothesis && h.hypothesis !== "-") score += 4;
    if (h.reason && h.reason !== "-") score += 4;
    const item = this.researchItems().find((x) => x.id === h.id);
    if (item?.validationPlan) score += 4;
    if (item?.successCriteria) score += 3;
    if (item?.failureCriteria) score += 3;
    if (item?.requiredData) score += 2;
    return score;
  }

  confidencePercent(h, weightedEvidenceScore, sourceDiversity, contradictionCount, openQuestionCount, readiness, relations) {
    const quality = Number(this.results.dataQuality?.qualityScore || 0);
    const tradeSample = Number((h.evidence || []).find((x) => x.source === "Trade")?.value || 0);
    const nearMissSample = Number((h.evidence || []).find((x) => x.source === "NearMiss")?.value || 0);
    const timelineCount = this.results.timeline?.length || 0;
    const duplicate = relations.some((r) => r.relationType === "Duplicate");
    const superseded = relations.some((r) => r.targetId === h.id && r.relationType === "Supersedes");
    const diversityBonus = sourceDiversity >= 4 ? 18 : sourceDiversity === 3 ? 12 : sourceDiversity === 2 ? 7 : 0;
    const sampleBonus = Math.min(10, tradeSample / 8) + Math.min(8, nearMissSample / 20) + Math.min(8, timelineCount * 1.2);
    const score = weightedEvidenceScore * 14 + diversityBonus + quality * 0.2 + sampleBonus + readiness * 0.16 - contradictionCount * 13 - openQuestionCount * 4 - (duplicate ? 10 : 0) - (superseded ? 22 : 0);
    return clampHl(Math.round(score), 0, 100);
  }

  validationChecklist(h, sourceDiversity, review) {
    const item = this.researchItems().find((x) => x.id === h.id) || {};
    const contradictions = (h.contradictions || []).length;
    const openQuestions = (h.openQuestions || []).length;
    return [
      { name: "Hypothesis Defined", done: Boolean(h.hypothesis && h.hypothesis !== "-") },
      { name: "Reason Defined", done: Boolean(h.reason && h.reason !== "-") },
      { name: "Validation Plan Defined", done: Boolean(item.validationPlan) },
      { name: "Success Criteria Defined", done: Boolean(item.successCriteria) },
      { name: "Failure Criteria Defined", done: Boolean(item.failureCriteria) },
      { name: "Required Data Defined", done: Boolean(item.requiredData) },
      { name: "Evidence Collected", done: (h.evidence || []).length > 0 },
      { name: "Multiple Evidence Sources", done: sourceDiversity >= 2 },
      { name: "Data Quality Checked", done: Boolean(this.results.dataQuality) },
      { name: "Contradictions Reviewed", done: contradictions === 0 || Boolean(review.contradictionsReviewed[h.id]) },
      { name: "Open Questions Reviewed", done: openQuestions === 0 || Boolean(review.openQuestionsReviewed[h.id]) },
      { name: "Decision Ready", done: sourceDiversity >= 2 && (h.evidence || []).length >= 3 && contradictions === 0 && openQuestions <= 2 }
    ];
  }

  nodeFromHypothesis(h) {
    return {
      id: h.id,
      title: h.title,
      status: h.status,
      score: h.score2,
      confidence: h.confidence2,
      confidencePercent: h.confidencePercent,
      evidenceCount: h.evidence?.length || 0,
      contradictionCount: (h.contradictions || []).length,
      openQuestionCount: (h.openQuestions || []).length,
      engine: h.engine || "-",
      condition: h.condition || "-",
      session: h.session || "-",
      source: h.source || "-",
      createdAt: h.createdAt || "-",
      updatedAt: new Date().toISOString()
    };
  }

  edgeFromRelation(r) {
    return {
      id: r.id,
      source: r.sourceId,
      target: r.targetId,
      relationType: r.relationType,
      note: r.note || "",
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  }

  buildFamilies(hypotheses, edges) {
    const parentTypes = new Set(["Parent", "Child", "Derived From", "Requires"]);
    const adjacency = new Map(hypotheses.map((h) => [h.id, new Set()]));
    edges.filter((e) => parentTypes.has(e.relationType)).forEach((e) => {
      adjacency.get(e.source)?.add(e.target);
      adjacency.get(e.target)?.add(e.source);
    });
    const byId = new Map(hypotheses.map((h) => [h.id, h]));
    const seen = new Set();
    const families = [];
    hypotheses.forEach((h) => {
      if (seen.has(h.id)) return;
      const stack = [h.id];
      const ids = [];
      seen.add(h.id);
      while (stack.length) {
        const id = stack.pop();
        ids.push(id);
        (adjacency.get(id) || new Set()).forEach((next) => {
          if (!seen.has(next)) {
            seen.add(next);
            stack.push(next);
          }
        });
      }
      const members = ids.map((id) => byId.get(id)).filter(Boolean);
      const root = members.sort((a, b) => b.score2 - a.score2)[0];
      const evidenceCount = members.reduce((sum, x) => sum + (x.evidence?.length || 0), 0);
      const contradictionCount = members.reduce((sum, x) => sum + (x.contradictions?.length || 0), 0);
      const openQuestionCount = members.reduce((sum, x) => sum + (x.openQuestions?.length || 0), 0);
      families.push({
        name: root?.title || "Hypothesis Family",
        rootHypothesis: root?.title || "-",
        rootId: root?.id || "-",
        hypothesisCount: members.length,
        verifiedCount: members.filter((x) => x.status === "Verified").length,
        rejectedCount: members.filter((x) => x.status === "Rejected").length,
        averageScore: roundHl(avgHl(members.map((x) => x.score2))),
        averageConfidence: roundHl(avgHl(members.map((x) => x.confidencePercent))),
        evidenceCount,
        contradictionCount,
        openQuestionCount,
        ids
      });
    });
    return families.sort((a, b) => b.hypothesisCount - a.hypothesisCount || b.averageScore - a.averageScore);
  }

  statistics(hypotheses, edges, families) {
    const relationCount = (type) => edges.filter((e) => e.relationType === type).length;
    const connectedIds = new Set(edges.flatMap((e) => [e.source, e.target]));
    const mostConnected = this.mostConnected(hypotheses, edges);
    const n = hypotheses.length;
    const density = n > 1 ? roundHl(edges.length / (n * (n - 1))) : 0;
    return {
      hypothesisCount: hypotheses.length,
      relationCount: edges.length,
      parentCount: relationCount("Parent"),
      childCount: relationCount("Child"),
      supportEdgeCount: relationCount("Supports"),
      contradictionEdgeCount: relationCount("Contradicts"),
      dependencyEdgeCount: relationCount("Requires") + relationCount("Derived From"),
      duplicateCount: relationCount("Duplicate"),
      alternativeCount: relationCount("Alternative"),
      supersededCount: relationCount("Supersedes"),
      orphanCount: hypotheses.filter((h) => !connectedIds.has(h.id)).length,
      connectedComponents: families.length,
      graphDensity: density,
      largestHypothesisFamily: families[0]?.name || "-",
      mostConnectedHypothesis: mostConnected.title,
      mostConnectedCount: mostConnected.count
    };
  }

  mostConnected(hypotheses, edges) {
    const counts = new Map();
    edges.forEach((e) => {
      counts.set(e.source, (counts.get(e.source) || 0) + 1);
      counts.set(e.target, (counts.get(e.target) || 0) + 1);
    });
    const best = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    const h = hypotheses.find((x) => x.id === best?.[0]);
    return { title: h?.title || "-", count: best?.[1] || 0 };
  }

  duplicateCandidates(hypotheses) {
    const rows = [];
    const list = (hypotheses || []).slice(0, 500);
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const score = similarityHl(this.duplicateKey(list[i]), this.duplicateKey(list[j]));
        if (score >= 80) rows.push({
          sourceId: list[i].id,
          sourceTitle: list[i].title,
          targetId: list[j].id,
          targetTitle: list[j].title,
          similarity: score,
          suggestedRelationType: "Duplicate"
        });
      }
    }
    return rows.slice(0, 80);
  }

  duplicateKey(h) {
    return [h.title, h.hypothesis, h.engine, h.condition, h.session, (h.tags || []).join(" ")].join(" ");
  }

  orphans(hypotheses, edges, duplicates) {
    const connected = new Set(edges.flatMap((e) => [e.source, e.target]));
    return hypotheses.filter((h) => !connected.has(h.id)).map((h) => {
      const duplicate = duplicates.find((d) => d.sourceId === h.id || d.targetId === h.id);
      const engineMatch = hypotheses.find((x) => x.id !== h.id && h.engine && x.engine === h.engine);
      return {
        id: h.id,
        title: h.title,
        status: h.status,
        score: h.score2,
        confidence: h.confidence2,
        source: h.source,
        suggestedRelationCandidate: duplicate ? `${duplicate.suggestedRelationType}: ${duplicate.sourceId === h.id ? duplicate.targetTitle : duplicate.sourceTitle}` : engineMatch ? `Engine match: ${engineMatch.title}` : "-"
      };
    });
  }

  superseded(hypotheses, edges) {
    return edges.filter((e) => e.relationType === "Supersedes").map((e) => {
      const oldHypothesis = hypotheses.find((h) => h.id === e.target);
      const newHypothesis = hypotheses.find((h) => h.id === e.source);
      return {
        id: e.target,
        title: oldHypothesis?.title || e.target,
        supersededBy: newHypothesis?.title || e.source,
        note: e.note || "Superseded relation exists. Status is not changed automatically."
      };
    });
  }

  compareSummary(hypotheses, families, edges) {
    if (hypotheses.length < 2) return null;
    const [a, b] = hypotheses;
    const compare = (label, av, bv, bigger = true) => ({ label, a: av, b: bv, winner: av === bv ? "Tie" : (bigger ? av > bv : av < bv) ? a.title : b.title });
    return {
      hypothesisA: a.title,
      hypothesisB: b.title,
      rows: [
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
        recommendedResearchPriority: this.researchPriority(a, b)
      },
      families: families.slice(0, 2).map((f) => f.name),
      relationCount: edges.length
    };
  }

  researchPriority(a, b) {
    const gapA = a.score2 - a.validationReadiness;
    const gapB = b.score2 - b.validationReadiness;
    return gapA >= gapB ? `${a.title} / high score but readiness gap remains.` : `${b.title} / high score but readiness gap remains.`;
  }

  weightedEvidenceSummary(hypotheses, weights) {
    const evidence = hypotheses.flatMap((h) => h.weightedEvidence || []);
    const bySource = Object.keys(weights).map((source) => {
      const rows = evidence.filter((e) => e.source === source);
      return {
        source,
        weight: weights[source],
        evidenceCount: rows.length,
        weightedScore: roundHl(rows.reduce((sum, e) => sum + e.weightedScore, 0))
      };
    });
    return {
      totalEvidence: evidence.length,
      averageWeightedEvidence: roundHl(avgHl(hypotheses.map((h) => h.weightedEvidenceScore))),
      totalWeightedScore: roundHl(evidence.reduce((sum, e) => sum + e.weightedScore, 0)),
      bySource
    };
  }

  lineageSummary(hypotheses, statistics, families, weightedEvidenceSummary, duplicates, orphans, superseded) {
    const top = hypotheses[0];
    const lowestReadiness = hypotheses.slice().sort((a, b) => a.validationReadiness - b.validationReadiness)[0];
    const topWeighted = hypotheses.slice().sort((a, b) => b.weightedEvidenceScore - a.weightedEvidenceScore)[0];
    const topContradiction = hypotheses.slice().sort((a, b) => (b.contradictions?.length || 0) - (a.contradictions?.length || 0))[0];
    return {
      largestFamily: statistics.largestHypothesisFamily,
      mostConnectedHypothesis: statistics.mostConnectedHypothesis,
      orphanCount: orphans.length,
      duplicateCandidateCount: duplicates.length,
      averageWeightedEvidence: weightedEvidenceSummary.averageWeightedEvidence,
      averageValidationReadiness: roundHl(avgHl(hypotheses.map((h) => h.validationReadiness))),
      topScore2: top?.score2 || 0,
      topConfidencePercent: top?.confidencePercent || 0,
      topHypothesis: top?.title || "-",
      topWeightedEvidence: topWeighted?.title || "-",
      lowestValidationReadiness: lowestReadiness?.title || "-",
      duplicateCandidate: duplicates[0]?.sourceTitle || "-",
      orphanHypothesis: orphans[0]?.title || "-",
      supersededHypothesis: superseded[0]?.title || "-",
      topContradiction: topContradiction?.title || "-",
      familyCount: families.length,
      relationCount: statistics.relationCount
    };
  }

  timeline(history, hypotheses) {
    const byId = new Map(hypotheses.map((h) => [h.id, h.title]));
    return (history || []).slice(0, 50).map((h) => ({
      date: h.createdAt,
      hypothesis: byId.get(h.hypothesisId) || h.hypothesisId,
      eventType: h.type,
      before: h.before,
      after: h.after,
      note: h.note
    }));
  }

  familyName(h, relations, hypotheses) {
    const related = relations.find((r) => r.sourceId === h.id || r.targetId === h.id);
    if (!related) return "Orphan";
    const rootId = related.sourceId === h.id ? related.sourceId : related.targetId;
    return hypotheses.find((x) => x.id === rootId)?.title || h.title;
  }

  warnings({ duplicates, orphanHypotheses, superseded }) {
    const rows = [];
    if (duplicates.length) rows.push(`${duplicates.length} possible duplicate hypotheses detected.`);
    if (orphanHypotheses.length) rows.push(`${orphanHypotheses.length} orphan hypotheses detected. Orphan is not an error.`);
    if (superseded.length) rows.push(`${superseded.length} superseded hypotheses detected. Status is not changed automatically.`);
    return rows;
  }

  scoreRow(h) {
    return {
      id: h.id,
      title: h.title,
      score: h.score2,
      confidencePercent: h.confidencePercent,
      weightedEvidence: h.weightedEvidenceScore,
      validationReadiness: h.validationReadiness,
      contradictions: h.contradictions.length,
      openQuestions: h.openQuestions.length,
      breakdown: h.scoreBreakdown
    };
  }

  researchItems() {
    if (Array.isArray(this.researchManager?.items)) return this.researchManager.items;
    if (typeof ResearchStorage !== "undefined") return ResearchStorage.loadItems();
    return [];
  }
}

function roundHl(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function clampHl(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function avgHl(values) {
  const rows = (values || []).map(Number).filter(Number.isFinite);
  return rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : 0;
}

function extractLargestNumberHl(text) {
  const nums = String(text || "").match(/-?\d+(\.\d+)?/g) || [];
  return nums.map(Number).filter(Number.isFinite).sort((a, b) => Math.abs(b) - Math.abs(a))[0] || 0;
}

function confidenceLabelHl(percent) {
  if (percent >= 70) return "High";
  if (percent >= 45) return "Medium";
  if (percent >= 20) return "Low";
  return "Insufficient";
}

function readinessLabelHl(value) {
  if (value >= 85) return "Ready";
  if (value >= 70) return "Almost Ready";
  if (value >= 45) return "Needs Evidence";
  if (value >= 20) return "Needs Definition";
  return "Blocked";
}

function normalizeTextHl(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function similarityHl(a, b) {
  const aa = new Set(normalizeTextHl(a).split(/\s+/).filter(Boolean));
  const bb = new Set(normalizeTextHl(b).split(/\s+/).filter(Boolean));
  if (!aa.size || !bb.size) return 0;
  const intersection = Array.from(aa).filter((x) => bb.has(x)).length;
  const union = new Set([...aa, ...bb]).size;
  return Math.round((intersection / union) * 100);
}
