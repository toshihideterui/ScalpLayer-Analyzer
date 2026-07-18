const HYPOTHESIS_STORAGE_KEY = "scalplayerResearchHypothesis";
const HYPOTHESIS_STATUSES = ["Draft", "Collecting Evidence", "Testing", "Verified", "Rejected", "Archived"];

class ResearchHypothesisStore {
  static load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(HYPOTHESIS_STORAGE_KEY) || "{}");
      return {
        statuses: parsed.statuses && typeof parsed.statuses === "object" ? parsed.statuses : {},
        notes: parsed.notes && typeof parsed.notes === "object" ? parsed.notes : {},
        archived: Array.isArray(parsed.archived) ? parsed.archived : []
      };
    } catch {
      return { statuses: {}, notes: {}, archived: [] };
    }
  }

  static save(data) {
    const current = ResearchHypothesisStore.load();
    const next = { ...current, ...data };
    localStorage.setItem(HYPOTHESIS_STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  static setStatus(id, status) {
    const current = ResearchHypothesisStore.load();
    const before = current.statuses[id] || "Draft";
    current.statuses[id] = HYPOTHESIS_STATUSES.includes(status) ? status : "Draft";
    ResearchHypothesisStore.save(current);
    if (typeof HypothesisHistoryStore !== "undefined" && before !== current.statuses[id]) HypothesisHistoryStore.add(id, "Status Change", before, current.statuses[id], "");
    if (typeof ResearchWorkspaceStore !== "undefined") ResearchWorkspaceStore.addActivity("Hypothesis", id, `Status: ${current.statuses[id]}`);
  }

  static setNote(id, note) {
    const current = ResearchHypothesisStore.load();
    const before = current.notes[id] || "";
    current.notes[id] = note || "";
    ResearchHypothesisStore.save(current);
    if (typeof HypothesisHistoryStore !== "undefined" && before !== current.notes[id]) HypothesisHistoryStore.add(id, "Note Updated", before, current.notes[id], "");
    if (typeof ResearchWorkspaceStore !== "undefined") ResearchWorkspaceStore.addActivity("Hypothesis", id, "Note saved");
  }
}

class ResearchHypothesisEngine {
  constructor({ analysisEngine, researchManager } = {}) {
    this.analysisEngine = analysisEngine;
    this.researchManager = researchManager;
    this.results = analysisEngine?.results || {};
  }

  snapshot() {
    const store = ResearchHypothesisStore.load();
    const hypotheses = this.buildHypotheses(store);
    const evidenceSummary = this.evidenceSummary(hypotheses);
    const contradictions = hypotheses.flatMap((x) => x.contradictions.map((c) => ({ hypothesis: x.title, ...c })));
    const openQuestions = this.openQuestions(hypotheses);
    return {
      version: "5.2",
      statuses: HYPOTHESIS_STATUSES,
      hypotheses,
      hypothesisSummary: this.summary(hypotheses),
      evidenceSummary,
      contradictions,
      openQuestions,
      researchFlow: ["Hypothesis", "Evidence", "Validation", "Decision", "Archive"]
    };
  }

  buildHypotheses(store) {
    const items = this.researchItems();
    const generated = this.generatedHypotheses();
    return [...items.map((item) => this.fromResearchItem(item, store)), ...generated].map((h) => {
      h.evidence = this.collectEvidence(h);
      h.contradictions = this.findContradictions(h);
      h.openQuestions = this.findOpenQuestions(h);
      h.confidence = this.confidence(h);
      h.score = this.score(h);
      return h;
    }).sort((a, b) => b.score - a.score || confidenceRankRh(b.confidence) - confidenceRankRh(a.confidence));
  }

  fromResearchItem(item, store) {
    const id = item.id || item.title;
    return {
      id,
      source: "Research Manager",
      title: item.title || "Untitled Hypothesis",
      hypothesis: item.hypothesis || item.reason || item.title || "-",
      reason: item.reason || item.validationPlan || item.requiredData || "-",
      status: store.statuses[id] || statusFromResearchRh(item.status),
      note: store.notes[id] || "",
      engine: item.engine || "",
      condition: item.condition || "",
      session: item.session || "",
      tags: item.tags || [],
      originalStatus: item.status || "-"
    };
  }

  generatedHypotheses() {
    const rows = [];
    const topNg = this.results.nearMiss?.ngReasons?.[0];
    if (topNg) rows.push({
      id: `AUTO-TOPNG-${topNg.name}`,
      source: "NearMiss",
      title: `${topNg.name} Bottleneck Hypothesis`,
      hypothesis: `${topNg.name} may be the main bottleneck before FullSignal.`,
      reason: `TopNG count is ${topNg.count}. Treat as Research candidate, not condition change.`,
      status: "Draft",
      note: "",
      engine: "",
      condition: topNg.name,
      session: "",
      tags: [topNg.name]
    });
    const dna = this.results.engineDna?.topEngine;
    if (dna) rows.push({
      id: `AUTO-DNA-${dna.engine}`,
      source: "Engine DNA",
      title: `${dna.engine} Stability Hypothesis`,
      hypothesis: `${dna.engine} may be the most stable Engine DNA target.`,
      reason: `Personality=${dna.personality || "-"}, Stability=${dna.stability || "-"}, Confidence=${dna.confidence || "-"}.`,
      status: "Draft",
      note: "",
      engine: dna.engine,
      condition: "",
      session: dna.session || "",
      tags: ["Engine DNA", dna.engine]
    });
    const kg = this.results.knowledgeGraph?.topConnectedEngine;
    if (kg?.label && kg.label !== "-") rows.push({
      id: `AUTO-KG-${kg.label}`,
      source: "Knowledge Graph",
      title: `${kg.label} Research Hub Hypothesis`,
      hypothesis: `${kg.label} may be the central research hub in current data.`,
      reason: `Knowledge Graph degree is ${kg.degree}.`,
      status: "Draft",
      note: "",
      engine: kg.label,
      condition: "",
      session: "",
      tags: ["Knowledge Graph", kg.label]
    });
    return rows;
  }

  collectEvidence(h) {
    const evidence = [];
    const normalizedEngine = normalizeRh(h.engine || h.title);
    const conditionText = `${h.condition} ${(h.tags || []).join(" ")} ${h.title}`;
    const add = (source, title, value, polarity = "Support", detail = "") => evidence.push({ source, title, value, polarity, detail });

    const researchItem = this.researchItems().find((x) => x.id === h.id);
    if (researchItem) {
      add("Research Manager", "Research item exists", researchItem.status || "-", "Support", researchItem.priority || "");
      (researchItem.evidence || []).slice(0, 5).forEach((e) => add("Research Manager", e.title || e.type || "Manual Evidence", e.value || e.note || "-", "Support", e.source || ""));
      if (researchItem.decision && researchItem.decision !== "Undecided") add("Research Manager", "Decision", researchItem.decision, decisionPolarityRh(researchItem.decision), researchItem.resultSummary || "");
    }

    const nearEngine = (this.results.nearMiss?.byEngine || []).find((x) => normalizeRh(x.name) === normalizedEngine);
    if (nearEngine) add("NearMiss", "Engine NearMiss", nearEngine.count, nearEngine.count > 0 ? "Support" : "Neutral", "NearMiss by Engine");
    const topNg = (this.results.nearMiss?.ngReasons || []).find((x) => new RegExp(escapeRegExpRh(x.name), "i").test(conditionText));
    if (topNg) add("NearMiss", "TopNG evidence", `${topNg.name}: ${topNg.count}`, topNg.count > 0 ? "Support" : "Neutral", "Condition bottleneck");

    const trade = (this.results.tradeByEngine || []).find((x) => normalizeRh(x.name) === normalizedEngine);
    if (trade) {
      add("Trade", "Trade Count", trade.trades || 0, trade.trades > 0 ? "Support" : "Neutral", `WinRate=${roundRh(trade.winRate)} PF=${roundRh(trade.profitFactor)}`);
      if (Number(trade.profitFactor || 0) < 1 && trade.trades >= 5) add("Trade", "Low PF contradiction", roundRh(trade.profitFactor), "Contradiction", "PF below 1.0");
    }

    const dna = (this.results.engineDna?.profiles || []).find((x) => normalizeRh(x.engine) === normalizedEngine);
    if (dna) {
      add("Engine DNA", "Engine Stability", dna.stability || "-", scoreFromStarsRh(dna.stability) >= 3 ? "Support" : "Contradiction", dna.personality || "");
      add("Engine DNA", "Engine Confidence", dna.confidence || "-", ["High", "Medium"].includes(dna.confidence) ? "Support" : "Neutral", `Score=${dna.dnaScore || 0}`);
    }

    const kg = this.results.knowledgeGraph;
    if (kg?.topConnectedEngine && normalizeRh(kg.topConnectedEngine.label) === normalizedEngine) add("Knowledge Graph", "Top Connected Engine", kg.topConnectedEngine.degree, "Support", "Research hub");
    if ((kg?.topConnectedTopNg?.label || "") && new RegExp(escapeRegExpRh(kg.topConnectedTopNg.label), "i").test(conditionText)) add("Knowledge Graph", "TopNG Hub", kg.topConnectedTopNg.degree, "Support", "Graph bottleneck");

    const cross = (this.results.crossCsv?.recommendations || []).find((x) => new RegExp(escapeRegExpRh(x.target || x.title), "i").test(`${h.title} ${h.engine} ${h.condition}`));
    if (cross) add("Cross CSV", "Cross CSV recommendation", cross.stars || "-", scoreFromStarsRh(cross.stars) >= 3 ? "Support" : "Neutral", cross.reason || "");

    const trend = this.results.trend?.forecast?.[0];
    if (trend) add("Timeline", "Trend Forecast", trend.status || "-", /Improve|Stable|Ready/i.test(trend.status || "") ? "Support" : "Neutral", trend.label || "");

    const quality = this.results.dataQuality;
    if (quality) add("Data Quality", "Quality Score", `${quality.qualityScore}/100`, quality.qualityScore >= 60 ? "Support" : "Contradiction", quality.confidence || "");

    return evidence;
  }

  findContradictions(h) {
    return (h.evidence || []).filter((x) => x.polarity === "Contradiction").map((x) => ({
      source: x.source,
      title: x.title,
      value: x.value,
      reason: x.detail || "Evidence conflicts with hypothesis."
    }));
  }

  findOpenQuestions(h) {
    const questions = [];
    if (!(this.results.nearMiss?.total > 0)) questions.push("NearMiss不足");
    if (!(this.results.session || []).length) questions.push("Session不足");
    if (!(this.results.engineActivity || []).length) questions.push("EngineActivity不足");
    if (!(this.results.trades || []).length) questions.push("TradeHistory不足");
    if (!this.results.crossCsv) questions.push("Cross CSV不足");
    if (!this.results.engineDna?.profiles?.length) questions.push("Engine DNA不足");
    if (!this.results.knowledgeGraph?.nodes?.length) questions.push("Knowledge Graph不足");
    if ((h.evidence || []).length < 3) questions.push("Evidence不足");
    return [...new Set(questions)];
  }

  confidence(h) {
    const evidence = h.evidence || [];
    const support = evidence.filter((x) => x.polarity === "Support").length;
    const contradiction = evidence.filter((x) => x.polarity === "Contradiction").length;
    const quality = Number(this.results.dataQuality?.qualityScore || 0);
    const cross = this.results.crossCsv?.correlationScore || 0;
    const stable = evidence.some((x) => x.source === "Engine DNA" && x.polarity === "Support");
    let score = support * 12 - contradiction * 18 + Math.min(20, quality / 5) + Math.min(14, cross / 8) + (stable ? 10 : 0);
    if (evidence.length >= 8) score += 10;
    if ((h.openQuestions || []).length >= 4) score -= 12;
    if (score >= 70) return "High";
    if (score >= 45) return "Medium";
    if (score >= 20) return "Low";
    return "Insufficient";
  }

  score(h) {
    const evidence = h.evidence || [];
    const support = evidence.filter((x) => x.polarity === "Support").length;
    const contradiction = evidence.filter((x) => x.polarity === "Contradiction").length;
    const neutral = evidence.filter((x) => x.polarity === "Neutral").length;
    const quality = Number(this.results.dataQuality?.qualityScore || 0);
    const base = support * 12 + neutral * 4 - contradiction * 18 + quality * 0.2 + confidenceRankRh(h.confidence) * 8 - (h.openQuestions || []).length * 3;
    return Math.max(0, Math.min(100, Math.round(base)));
  }

  evidenceSummary(hypotheses) {
    const evidence = hypotheses.flatMap((h) => h.evidence || []);
    return {
      total: evidence.length,
      support: evidence.filter((x) => x.polarity === "Support").length,
      contradiction: evidence.filter((x) => x.polarity === "Contradiction").length,
      neutral: evidence.filter((x) => x.polarity === "Neutral").length,
      bySource: groupCountRh(evidence, (x) => x.source)
    };
  }

  openQuestions(hypotheses) {
    return groupCountRh(hypotheses.flatMap((h) => h.openQuestions || []), (x) => x).map((x) => ({ question: x.name, count: x.count }));
  }

  summary(hypotheses) {
    const byStatus = groupCountRh(hypotheses, (x) => x.status);
    const verified = hypotheses.filter((x) => x.status === "Verified").length;
    const rejected = hypotheses.filter((x) => x.status === "Rejected").length;
    const top = hypotheses[0];
    return {
      total: hypotheses.length,
      verified,
      rejected,
      topTitle: top?.title || "-",
      topScore: top?.score || 0,
      topConfidence: top?.confidence || "Insufficient",
      byStatus
    };
  }

  researchItems() {
    if (Array.isArray(this.researchManager?.items)) return this.researchManager.items;
    if (typeof ResearchStorage !== "undefined") return ResearchStorage.loadItems();
    return [];
  }
}

function statusFromResearchRh(status) {
  if (["Testing", "Review", "Revalidation"].includes(status)) return "Testing";
  if (["Collecting Data", "Ready"].includes(status)) return "Collecting Evidence";
  if (["Completed"].includes(status)) return "Verified";
  if (["On Hold"].includes(status)) return "Archived";
  return "Draft";
}

function confidenceRankRh(value) {
  return { High: 4, Medium: 3, Low: 2, Insufficient: 1 }[value] || 1;
}

function decisionPolarityRh(decision) {
  if (/Adopt|Verified|Pass/i.test(decision)) return "Support";
  if (/Reject|Fail/i.test(decision)) return "Contradiction";
  return "Neutral";
}

function groupCountRh(items, fn) {
  const counts = {};
  (items || []).forEach((item) => {
    const name = fn(item) || "Unknown";
    counts[name] = (counts[name] || 0) + 1;
  });
  return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

function normalizeRh(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
}

function escapeRegExpRh(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreFromStarsRh(stars) {
  return String(stars || "").split("★").length - 1;
}

function roundRh(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
