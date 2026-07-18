class ResearchManager {
  constructor() {
    this.items = ResearchStorage.loadItems().map(migrateResearchItem);
    this.settings = ResearchStorage.loadSettings();
    this.selectedId = this.items[0]?.id || "";
  }

  save() {
    ResearchStorage.saveItems(this.items);
  }

  createFromSuggestion(suggestion, snapshot) {
    const category = inferCategory(suggestion.title);
    const item = this.create({
      title: suggestion.title,
      category,
      status: "Backlog",
      priority: inferPriority(suggestion.score, "Medium"),
      researchScore: suggestion.stars,
      confidence: inferSuggestionConfidence(suggestion.score),
      engine: extractEngine(suggestion.target),
      condition: extractCondition(suggestion.title, suggestion.target),
      session: extractSession(suggestion.target),
      hypothesis: `${suggestion.reason}\n\nThis is a Research hypothesis, not a trading-condition change instruction.`,
      reason: suggestion.reason,
      requiredData: suggestRequiredData(category),
      validationPlan: suggestValidationPlan(category),
      successCriteria: "The pattern remains stable after normalized comparison and enough samples.",
      failureCriteria: "The pattern is explained by low data volume, date concentration, or unreliable CSV coverage.",
      sourceAnalyzerSnapshot: snapshot
    });
    return item;
  }

  create(data) {
    const now = new Date().toISOString();
    const item = migrateResearchItem({
      id: createResearchId(),
      title: data.title || "Untitled Research",
      category: data.category || "Other",
      status: data.status || "Backlog",
      priority: data.priority || "Medium",
      researchScore: data.researchScore || "★★★☆☆",
      confidence: data.confidence || "Low",
      engine: data.engine || "",
      condition: data.condition || "",
      session: data.session || "",
      hypothesis: data.hypothesis || "",
      reason: data.reason || "",
      requiredData: data.requiredData || "",
      validationPlan: data.validationPlan || "",
      successCriteria: data.successCriteria || "",
      failureCriteria: data.failureCriteria || "",
      datasetStart: data.datasetStart || "",
      datasetEnd: data.datasetEnd || "",
      createdAt: now,
      updatedAt: now,
      startedAt: "",
      completedAt: "",
      decision: data.decision || "Undecided",
      resultSummary: "",
      evidence: data.evidence || [],
      nextAction: data.nextAction || "",
      tags: data.tags || [],
      sourceAnalyzerSnapshot: data.sourceAnalyzerSnapshot || null,
      history: [{ at: now, type: "Created", note: "Research item created." }]
    });
    this.items.unshift(item);
    this.selectedId = item.id;
    this.save();
    ResearchStorage.appendHistory({ type: "Created", researchId: item.id, title: item.title });
    return item;
  }

  update(id, patch) {
    const item = this.items.find((x) => x.id === id);
    if (!item) return null;
    const before = { ...item };
    Object.assign(item, patch, { updatedAt: new Date().toISOString() });
    item.history ||= [];
    item.history.push({ at: item.updatedAt, type: "Updated", patch });
    if (before.status !== item.status && item.status === "Testing" && !item.startedAt) item.startedAt = item.updatedAt;
    if (["Completed", "Rejected", "Adopted"].includes(item.status) && !item.completedAt) item.completedAt = item.updatedAt;
    this.save();
    ResearchStorage.appendHistory({ type: "Updated", researchId: item.id, title: item.title, patch });
    return item;
  }

  remove(id) {
    this.items = this.items.filter((x) => x.id !== id);
    if (this.selectedId === id) this.selectedId = this.items[0]?.id || "";
    this.save();
  }

  addEvidence(id, evidence) {
    const item = this.items.find((x) => x.id === id);
    if (!item) return null;
    item.evidence ||= [];
    item.evidence.push({ date: new Date().toISOString().slice(0, 10), type: "Memo", ...evidence });
    item.updatedAt = new Date().toISOString();
    item.history ||= [];
    item.history.push({ at: item.updatedAt, type: "Evidence", evidence });
    this.save();
    return item;
  }

  setDecision(id, decision, reason = "") {
    const item = this.update(id, { decision, resultSummary: reason || this.get(id)?.resultSummary || "" });
    if (item) {
      item.decisionLog ||= [];
      item.decisionLog.push({ date: new Date().toISOString(), decision, reason, snapshotId: item.sourceAnalyzerSnapshot?.datetime || "" });
      this.save();
    }
    return item;
  }

  get(id) {
    return this.items.find((x) => x.id === id) || null;
  }

  filtered(filters = {}) {
    const q = (filters.search || "").toLowerCase();
    return this.items.filter((item) => {
      if (filters.status && filters.status !== "All" && item.status !== filters.status) return false;
      if (filters.category && filters.category !== "All" && item.category !== filters.category) return false;
      if (filters.decision && filters.decision !== "All" && item.decision !== filters.decision) return false;
      if (q && !`${item.title} ${item.engine} ${item.condition} ${item.session} ${item.hypothesis}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  portfolio() {
    const total = this.items.length;
    const count = (fn) => this.items.filter(fn).length;
    return {
      total,
      active: count((x) => !["Completed", "Rejected", "Adopted"].includes(x.status)),
      collecting: count((x) => x.status === "Collecting Data"),
      testing: count((x) => x.status === "Testing"),
      completed: count((x) => x.status === "Completed"),
      adopted: count((x) => x.status === "Adopted" || x.decision === "Adopt"),
      rejected: count((x) => x.status === "Rejected" || x.decision === "Reject"),
      onHold: count((x) => x.status === "On Hold"),
      stale: this.stale().length,
      critical: count((x) => x.priority === "Critical"),
      high: count((x) => x.priority === "High")
    };
  }

  stale(days = 14) {
    const now = Date.now();
    return this.items.filter((item) => {
      if (["Completed", "Rejected", "Adopted"].includes(item.status)) return false;
      const updated = Date.parse(item.updatedAt || item.createdAt || "");
      if (!updated) return false;
      return (now - updated) / 86400000 >= days;
    });
  }

  recommended() {
    return this.items
      .filter((x) => !["Completed", "Rejected", "Adopted"].includes(x.status))
      .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || scoreWeight(b.researchScore) - scoreWeight(a.researchScore))[0] || null;
  }
}

function researchProgress(item) {
  const checks = [
    Boolean(item.hypothesis),
    Boolean(item.validationPlan),
    Boolean(item.requiredData),
    ["Collecting Data", "Testing", "Review", "Completed", "Adopted", "Rejected"].includes(item.status),
    Boolean(item.evidence?.length),
    item.decision && item.decision !== "Undecided"
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

function researchHealth(item) {
  if (["Completed", "Adopted", "Rejected"].includes(item.status)) return "Completed";
  if (!item.requiredData) return "Needs Data";
  if (item.status === "Testing" && !item.validationPlan) return "Blocked";
  const updated = Date.parse(item.updatedAt || item.createdAt || "");
  if (updated && (Date.now() - updated) / 86400000 >= 14) return "Stale";
  return "Healthy";
}

function nextAction(item) {
  if (!item.hypothesis) return "Enter hypothesis.";
  if (!item.validationPlan) return "Create validation plan.";
  if (!item.requiredData) return "Define required data.";
  if (item.status === "Backlog") return "Move to Hypothesis or Ready.";
  if (item.status === "Hypothesis") return "Prepare validation plan.";
  if (item.status === "Ready") return "Start collecting required CSV data.";
  if (item.status === "Collecting Data") return "Continue data collection until minimum samples are reached.";
  if (item.status === "Testing") return "Add evidence and observed metrics.";
  if (item.status === "Review") return "Record decision.";
  if (item.status === "Completed") return "Check whether revalidation is needed.";
  return "Review current status.";
}

function inferCategory(title = "") {
  const t = title.toLowerCase();
  if (t.includes("single")) return "Single Bottleneck Research";
  if (t.includes("session")) return "Session Research";
  if (t.includes("nearmiss")) return "NearMiss Research";
  if (t.includes("spread")) return "Spread Research";
  if (t.includes("holding")) return "Holding Research";
  if (t.includes("condition") || t.includes("rsi") || t.includes("atr") || t.includes("bb")) return "Condition Research";
  if (t.includes("engine")) return "Engine Research";
  return "Other";
}

function inferPriority(score = 3, confidence = "Low") {
  if (score >= 5 && ["High", "Medium"].includes(confidence)) return "Critical";
  if (score >= 5) return "High";
  if (score >= 4) return "High";
  if (score >= 3) return "Medium";
  return "Low";
}

function inferSuggestionConfidence(score) {
  if (score >= 5) return "Medium";
  if (score >= 4) return "Low";
  return "Insufficient";
}

function extractEngine(target = "") {
  const known = ["Core Rule E", "Candidate G", "Morning Prime", "Day Rule A", "Evening Rule C", "Honmei17"];
  return known.find((name) => target.includes(name)) || "";
}

function extractCondition(title = "", target = "") {
  const text = `${title} ${target}`;
  const known = ["RSI", "ATR", "BB", "Volume", "Spread", "Time", "RecentDrop", "RecentRise", "LowUpdate", "HighUpdate", "BearStreak", "BullStreak"];
  return known.find((name) => text.includes(name)) || "";
}

function extractSession(target = "") {
  const known = ["Tokyo", "London", "NY", "Other"];
  return known.find((name) => target.includes(name)) || "";
}

function suggestRequiredData(category) {
  if (category.includes("NearMiss") || category.includes("Single")) return "NearMissHistory.csv, EngineActivity_v2.csv, SessionResearch.csv";
  if (category.includes("Session")) return "SessionResearch.csv, NearMissHistory.csv, TradeHistory.csv";
  if (category.includes("Holding")) return "TradeHistory.csv with HoldingMinutes";
  if (category.includes("Spread")) return "TradeHistory.csv and NearMissHistory.csv with Spread";
  return "TradeHistory.csv, EngineActivity_v2.csv, NearMissHistory.csv";
}

function suggestValidationPlan(category) {
  if (category.includes("Single")) return "Validate single NG ratio by Engine and Session. Use normalized counts and at least 100 NearMiss records if possible.";
  if (category.includes("Session")) return "Compare session results using NearMiss per 1,000 Checks, FullSignal Rate, and Entry Conversion Rate.";
  return "Compare current and next snapshots using normalized metrics. Do not judge only by raw count changes.";
}

function priorityWeight(priority) {
  return { Critical: 4, High: 3, Medium: 2, Low: 1 }[priority] || 0;
}

function scoreWeight(starsText = "") {
  return String(starsText).split("★").length - 1;
}

const researchManager = new ResearchManager();
