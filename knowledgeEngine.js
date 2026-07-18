class KnowledgeEngine {
  constructor(researchManager) {
    this.researchManager = researchManager;
  }

  entries() {
    return (this.researchManager.items || [])
      .filter((item) => ["Completed", "Rejected", "Adopted"].includes(item.status) || item.decision !== "Undecided")
      .map((item) => ({
        id: item.id,
        title: item.title,
        hypothesis: item.hypothesis,
        result: item.resultSummary,
        decision: item.decision,
        evidence: item.evidence || [],
        conclusion: item.resultSummary || nextAction(item),
        tags: item.tags || [],
        engine: item.engine,
        condition: item.condition,
        session: item.session,
        updatedAt: item.updatedAt
      }));
  }

  search(query = "") {
    const q = query.toLowerCase().trim();
    if (!q) return this.entries();
    return this.entries().filter((entry) => {
      const text = `${entry.title} ${entry.hypothesis} ${entry.result} ${entry.decision} ${entry.conclusion} ${(entry.tags || []).join(" ")} ${(entry.evidence || []).map((e) => e.note).join(" ")}`.toLowerCase();
      return text.includes(q);
    });
  }

  similarTo(item, limit = 5) {
    if (!item) return [];
    return (this.researchManager.items || [])
      .filter((other) => other.id !== item.id)
      .map((other) => ({ item: other, score: similarityScore(item, other) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  clusters() {
    const by = (key) => groupBy(this.researchManager.items || [], (item) => item[key] || "Unspecified");
    return {
      category: clusterRows(by("category")),
      engine: clusterRows(by("engine")),
      condition: clusterRows(by("condition")),
      session: clusterRows(by("session"))
    };
  }

  duplicates() {
    const groups = groupBy(this.researchManager.items || [], duplicateKey);
    return Object.values(groups).filter((list) => list.length > 1);
  }
}

function similarityScore(a, b) {
  let score = 0;
  if (a.title && b.title && tokenOverlap(a.title, b.title) > 0) score += tokenOverlap(a.title, b.title) * 20;
  if (a.engine && a.engine === b.engine) score += 25;
  if (a.condition && a.condition === b.condition) score += 20;
  if (a.session && a.session === b.session) score += 15;
  const tagsA = new Set(a.tags || []);
  (b.tags || []).forEach((tag) => { if (tagsA.has(tag)) score += 10; });
  if (a.category === b.category) score += 10;
  return Math.round(score);
}

function tokenOverlap(a, b) {
  const ta = new Set(String(a).toLowerCase().split(/\W+/).filter(Boolean));
  const tb = new Set(String(b).toLowerCase().split(/\W+/).filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let hit = 0;
  ta.forEach((x) => { if (tb.has(x)) hit++; });
  return hit / Math.max(ta.size, tb.size);
}

function groupBy(list, fn) {
  return list.reduce((acc, item) => {
    const key = fn(item);
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}

function clusterRows(groups) {
  return Object.entries(groups).map(([name, list]) => ({
    name,
    count: list.length,
    completed: list.filter((x) => ["Completed", "Adopted", "Rejected"].includes(x.status)).length,
    averageProgress: Math.round(list.reduce((sum, item) => sum + researchProgress(item), 0) / Math.max(1, list.length))
  })).sort((a, b) => b.count - a.count);
}
