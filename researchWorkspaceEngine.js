const WORKSPACE_STORAGE_KEY = "scalplayerResearchWorkspace";

class ResearchWorkspaceStore {
  static load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEY) || "{}");
      return {
        bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
        pins: Array.isArray(parsed.pins) ? parsed.pins : [],
        memo: typeof parsed.memo === "string" ? parsed.memo : "",
        recentActivity: Array.isArray(parsed.recentActivity) ? parsed.recentActivity : []
      };
    } catch {
      return { bookmarks: [], pins: [], memo: "", recentActivity: [] };
    }
  }

  static save(data) {
    const current = ResearchWorkspaceStore.load();
    const next = { ...current, ...data };
    next.recentActivity = (next.recentActivity || []).slice(0, 100);
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  static saveMemo(memo) {
    return ResearchWorkspaceStore.save({ memo: memo || "" });
  }

  static addActivity(type, title, detail = "") {
    const current = ResearchWorkspaceStore.load();
    const item = { id: `A-${Date.now()}-${Math.random().toString(16).slice(2)}`, at: new Date().toISOString(), type, title, detail };
    return ResearchWorkspaceStore.save({ recentActivity: [item, ...current.recentActivity].slice(0, 100) });
  }

  static toggleBookmark(item) {
    const current = ResearchWorkspaceStore.load();
    const id = item.id || `${item.type}:${item.label}`;
    const exists = current.bookmarks.some((x) => x.id === id);
    const bookmarks = exists ? current.bookmarks.filter((x) => x.id !== id) : [{ ...item, id, createdAt: new Date().toISOString() }, ...current.bookmarks].slice(0, 60);
    ResearchWorkspaceStore.save({ bookmarks });
    ResearchWorkspaceStore.addActivity(exists ? "Bookmark Removed" : "Bookmark Added", item.label || id, item.type || "Workspace");
  }

  static togglePin(item) {
    const current = ResearchWorkspaceStore.load();
    const id = item.id || `${item.type}:${item.label}`;
    const exists = current.pins.some((x) => x.id === id);
    const pins = exists ? current.pins.filter((x) => x.id !== id) : [{ ...item, id, createdAt: new Date().toISOString() }, ...current.pins].slice(0, 40);
    ResearchWorkspaceStore.save({ pins });
    ResearchWorkspaceStore.addActivity(exists ? "Pin Removed" : "Pin Added", item.label || id, item.type || "Workspace");
  }
}

class ResearchWorkspaceEngine {
  constructor({ analysisEngine, researchManager } = {}) {
    this.analysisEngine = analysisEngine;
    this.researchManager = researchManager;
    this.results = analysisEngine?.results || {};
  }

  snapshot() {
    const store = ResearchWorkspaceStore.load();
    const queue = this.researchQueue();
    const focus = this.todaysFocus(queue);
    const workspace = {
      version: "5.1",
      focus,
      queue,
      bookmarks: this.enrichBookmarks(store.bookmarks),
      pins: store.pins,
      recentActivity: store.recentActivity.slice(0, 20),
      summary: this.workspaceSummary(focus, queue, store),
      memoLength: store.memo.length
    };
    return workspace;
  }

  researchQueue() {
    const rows = [];
    (this.results.intelligence || []).slice(0, 12).forEach((x, index) => rows.push({
      id: `INT-${index}-${x.title}`,
      type: "Research Candidate",
      title: x.title,
      priority: scorePriorityRw(x.score),
      researchScore: x.stars || starsRw(x.score),
      confidence: x.confidence || "Medium",
      reason: x.reason || x.target || "-",
      expectedImpact: impactRw(x),
      source: "Research Intelligence",
      engine: x.engine || x.target || ""
    }));
    (this.results.crossCsv?.recommendations || []).slice(0, 8).forEach((x, index) => rows.push({
      id: `CROSS-${index}-${x.title}`,
      type: "Cross CSV",
      title: x.title,
      priority: x.stars?.includes("★★★★★") ? "Critical" : "High",
      researchScore: x.stars || "★★★★☆",
      confidence: "Cross CSV",
      reason: x.reason,
      expectedImpact: "Cross-file relationship can reveal reproducible Research direction.",
      source: "Cross CSV",
      engine: x.target || ""
    }));
    const dna = this.results.engineDna;
    (dna?.hiddenOpportunity || []).slice(0, 6).forEach((x, index) => rows.push({
      id: `DNA-HIDDEN-${index}-${x.engine}`,
      type: "Hidden Opportunity",
      title: `${x.engine} Hidden Opportunity`,
      priority: x.priority || "Medium",
      researchScore: "★★★★☆",
      confidence: "Needs More Data",
      reason: x.reason,
      expectedImpact: "May identify an Engine with high NearMiss or Signal activity.",
      source: "Engine DNA",
      engine: x.engine
    }));
    if (dna?.topEngine) rows.push({
      id: `DNA-TOP-${dna.topEngine.engine}`,
      type: "Engine DNA",
      title: `${dna.topEngine.engine} DNA Review`,
      priority: "High",
      researchScore: dna.topEngine.researchScore || starsRw(dna.topEngine.dnaScore / 20),
      confidence: dna.topEngine.confidence || "Medium",
      reason: dna.summary || "Top Engine DNA requires periodic review.",
      expectedImpact: "Clarifies Engine personality, strength, weakness, and stability.",
      source: "Engine DNA",
      engine: dna.topEngine.engine
    });
    const kg = this.results.knowledgeGraph;
    if (kg?.topConnectedEngine?.label && kg.topConnectedEngine.label !== "-") rows.push({
      id: `KG-ENGINE-${kg.topConnectedEngine.label}`,
      type: "Knowledge Graph",
      title: `${kg.topConnectedEngine.label} Graph Hub Review`,
      priority: "High",
      researchScore: "★★★★☆",
      confidence: "Graph Based",
      reason: `${kg.topConnectedEngine.label} is the most connected Engine.`,
      expectedImpact: "Shows relation between Engine, TopNG, Session, and Research items.",
      source: "Knowledge Graph",
      engine: kg.topConnectedEngine.label
    });
    if (kg?.topConnectedTopNg?.label && kg.topConnectedTopNg.label !== "-") rows.push({
      id: `KG-TOPNG-${kg.topConnectedTopNg.label}`,
      type: "Knowledge Graph",
      title: `${kg.topConnectedTopNg.label} Bottleneck Research`,
      priority: "High",
      researchScore: "★★★★☆",
      confidence: "Graph Based",
      reason: `${kg.topConnectedTopNg.label} is the strongest TopNG hub.`,
      expectedImpact: "Helps decide which condition to research next without changing rules directly.",
      source: "Knowledge Graph",
      engine: ""
    });
    const lineage = this.results.hypothesisLineage;
    (lineage?.enrichedHypotheses || []).slice(0, 8).forEach((x, index) => {
      const readinessGap = Number(x.score2 || 0) - Number(x.validationReadiness || 0);
      rows.push({
        id: `LINEAGE-${index}-${x.id}`,
        type: "Hypothesis Lineage",
        title: `${x.title} Validation Review`,
        priority: x.score2 >= 70 && readinessGap > 20 ? "High" : "Medium",
        researchScore: starsRw(Number(x.score2 || 0) / 20),
        confidence: `${x.confidence2} / ${x.confidencePercent}%`,
        reason: `Score2=${x.score2}, Readiness=${x.validationReadiness}%, WeightedEvidence=${x.weightedEvidenceScore}. Research candidate only.`,
        expectedImpact: "Clarifies whether this hypothesis is ready for validation without changing trading conditions.",
        source: "Hypothesis Lineage",
        engine: x.engine || ""
      });
    });
    (this.results.trend?.recommendations || []).slice(0, 5).forEach((x, index) => rows.push({
      id: `TREND-${index}-${x.title}`,
      type: "Timeline",
      title: x.title,
      priority: x.priority || "Medium",
      researchScore: "★★★☆☆",
      confidence: "Timeline",
      reason: x.reason,
      expectedImpact: "Improves long-term Research continuity.",
      source: "Research Timeline",
      engine: ""
    }));
    return dedupeQueueRw(rows).sort((a, b) => priorityRankRw(b.priority) - priorityRankRw(a.priority) || scoreRankRw(b.researchScore) - scoreRankRw(a.researchScore)).slice(0, 40);
  }

  todaysFocus(queue) {
    const items = queue.slice(0, 3);
    if (items.length) return items;
    const rec = this.researchManager?.recommended?.();
    if (rec) return [{
      id: rec.id,
      type: "Research Manager",
      title: rec.title,
      priority: rec.priority,
      researchScore: rec.researchScore,
      confidence: rec.confidence,
      reason: "Highest priority item in Research Manager.",
      expectedImpact: "Continue current Research workflow.",
      source: "Research Manager",
      engine: rec.engine || ""
    }];
    return [];
  }

  enrichBookmarks(bookmarks) {
    const managerMap = new Map((this.researchManager?.items || []).map((x) => [x.id, x]));
    return (bookmarks || []).map((bookmark) => ({
      ...bookmark,
      status: managerMap.get(bookmark.targetId || bookmark.id)?.status || bookmark.status || "-",
      priority: managerMap.get(bookmark.targetId || bookmark.id)?.priority || bookmark.priority || "-"
    }));
  }

  workspaceSummary(focus, queue, store) {
    const top = focus[0];
    return {
      title: top?.title || "No active focus",
      reason: top?.reason || "Load CSV files or create Research items to activate Workspace.",
      next: top ? `Next: ${top.expectedImpact}` : "Next: load CSV and review Dashboard.",
      queueCount: queue.length,
      bookmarkCount: store.bookmarks.length,
      pinCount: store.pins.length,
      recentActivityCount: store.recentActivity.length
    };
  }
}

function dedupeQueueRw(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.type}:${row.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function priorityRankRw(priority) {
  return { Critical: 5, High: 4, Medium: 3, Low: 2, Backlog: 1 }[priority] || 2;
}

function scoreRankRw(score) {
  return String(score || "").split("★").length - 1 || Number(score || 0) || 0;
}

function scorePriorityRw(score) {
  const n = Number(score || 0);
  if (n >= 85) return "Critical";
  if (n >= 70) return "High";
  if (n >= 45) return "Medium";
  return "Low";
}

function starsRw(score) {
  const n = Math.max(1, Math.min(5, Math.round(Number(score || 0))));
  return "★★★★★☆☆☆☆☆".slice(5 - n, 10 - n);
}

function impactRw(item) {
  const text = `${item.title || ""} ${item.reason || ""} ${item.target || ""}`;
  if (/NearMiss|TopNG|NG/i.test(text)) return "May reveal the main bottleneck before changing conditions.";
  if (/Session|Tokyo|London|NY/i.test(text)) return "May clarify the best Research time window.";
  if (/Engine/i.test(text)) return "May improve Engine-level Research priority.";
  return "May improve the next Research direction.";
}
