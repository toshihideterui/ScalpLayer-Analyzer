class RecommendationEngine {
  constructor(researchManager, analysisEngine) {
    this.researchManager = researchManager;
    this.analysisEngine = analysisEngine;
  }

  recommendations(limit = 5) {
    const items = this.researchManager.items || [];
    const ranked = items
      .filter((item) => !["Completed", "Rejected", "Adopted"].includes(item.status))
      .map((item) => ({ item, score: this.priorityScore(item), reasons: this.reasons(item) }))
      .sort((a, b) => b.score - a.score || Date.parse(b.item.updatedAt || "") - Date.parse(a.item.updatedAt || ""));
    return ranked.slice(0, limit);
  }

  priorityScore(item) {
    let score = 0;
    score += priorityWeight(item.priority) * 16;
    score += scoreWeight(item.researchScore) * 12;
    score += confidenceWeight(item.confidence) * 8;
    score += Math.min(20, researchProgress(item) / 5);
    if (researchHealth(item) === "Review Required") score += 28;
    if (researchHealth(item) === "Warning") score += 16;
    if (researchHealth(item) === "Needs Data") score += 10;
    if (item.status === "Testing") score += 22;
    if (item.status === "Review") score += 30;
    if (!(item.evidence || []).length) score -= 8;
    if (item.decision && item.decision !== "Undecided") score -= 20;
    if (isStaleItem(item)) score += 14;
    return Math.max(0, Math.round(score));
  }

  reasons(item) {
    const reasons = [];
    if (!(item.evidence || []).length) reasons.push("Evidence is missing");
    if (!item.requiredData) reasons.push("Required data is missing");
    if (item.status === "Testing") reasons.push("Testing is in progress");
    if (item.status === "Review") reasons.push("Decision is required");
    if (researchHealth(item) === "Stale") reasons.push("Research is stale");
    if (scoreWeight(item.researchScore) >= 4) reasons.push("Research Score is high");
    if (["High", "Medium"].includes(item.confidence)) reasons.push(`Confidence is ${item.confidence}`);
    return reasons.length ? reasons : ["Good candidate for routine review"];
  }

  queue() {
    const all = this.recommendations(999);
    return {
      next: all.slice(0, 5),
      waiting: (this.researchManager.items || []).filter((x) => x.status === "On Hold"),
      protected: (this.researchManager.items || []).filter((x) => ["Completed", "Adopted"].includes(x.status))
    };
  }
}

function confidenceWeight(confidence) {
  return { High: 4, Medium: 3, Low: 2, Insufficient: 1 }[confidence] || 0;
}

function isStaleItem(item, days = 14) {
  const updated = Date.parse(item.updatedAt || item.createdAt || "");
  return Boolean(updated && (Date.now() - updated) / 86400000 >= days);
}
