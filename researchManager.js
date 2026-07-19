class ResearchManager {
  constructor() {
    this.items = ResearchStorage.loadItems();
    this.settings = ResearchStorage.loadSettings();
    this.selectedId = this.items[0]?.id || "";
    this.lastMessage = ResearchStorage.lastError || "";
  }

  save() {
    const result = ResearchStorage.saveItems(this.items);
    this.lastMessage = result.ok ? "" : result.error;
    return result;
  }

  createFromSuggestion(suggestion, snapshot, options = {}) {
    const draft = this.suggestionToDraft(suggestion, snapshot);
    const duplicate = this.findDuplicate(draft);
    if (duplicate && !options.force) {
      return { ok: false, duplicate, draft, warning: "Duplicate Research candidate detected." };
    }
    return { ok: true, item: this.create(draft) };
  }

  suggestionToDraft(suggestion, snapshot) {
    const category = inferCategory(suggestion.title);
    const confidence = inferSuggestionConfidence(suggestion.score);
    return {
      title: suggestion.title,
      category,
      status: "Backlog",
      priority: inferPriority(suggestion.score, confidence),
      researchScore: suggestion.stars,
      confidence,
      engine: extractEngine(suggestion.target),
      condition: extractCondition(suggestion.title, suggestion.target),
      session: extractSession(suggestion.target),
      hypothesis: `${suggestion.reason}\n\nThis is a Research hypothesis, not a trading-condition change instruction.`,
      reason: suggestion.reason,
      requiredData: suggestRequiredData(category),
      validationPlan: suggestValidationPlan(category),
      successCriteria: "The pattern remains stable after normalized comparison and enough samples.",
      failureCriteria: "The pattern is explained by low data volume, date concentration, or unreliable CSV coverage.",
      tags: [category, extractEngine(suggestion.target), extractCondition(suggestion.title, suggestion.target), extractSession(suggestion.target)].filter(Boolean),
      sourceAnalyzerSnapshot: snapshot,
      beforeSnapshot: snapshot
    };
  }

  create(data) {
    const now = new Date().toISOString();
    const item = migrateResearchItem({
      ...data,
      id: data.id || createResearchId(),
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
      history: [
        ...(data.history || []),
        { id: createResearchId("H"), at: now, type: "Created", note: "Research item created." }
      ]
    });
    this.items.unshift(item);
    this.selectedId = item.id;
    this.save();
    ResearchStorage.appendHistory({ type: "Created", researchId: item.id, title: item.title });
    return item;
  }

  update(id, patch, note = "") {
    const item = this.get(id);
    if (!item) return null;
    const before = { ...item };
    const now = new Date().toISOString();
    Object.assign(item, patch, { updatedAt: now });

    if (before.status !== item.status && item.status === "Testing" && !item.startedAt) item.startedAt = now;
    if (["Completed", "Rejected", "Adopted"].includes(item.status) && !item.completedAt) item.completedAt = now;

    item.history ||= [];
    diffPatch(before, item).forEach((change) => {
      item.history.push({ id: createResearchId("H"), at: now, type: change.type, note: note || change.note, patch: change.patch });
    });
    if (!diffPatch(before, item).length) {
      item.history.push({ id: createResearchId("H"), at: now, type: "Updated", note: note || "Research item updated.", patch });
    }

    this.save();
    ResearchStorage.appendHistory({ type: "Updated", researchId: item.id, title: item.title, patch });
    return item;
  }

  remove(id) {
    const item = this.get(id);
    this.items = this.items.filter((x) => x.id !== id);
    if (this.selectedId === id) this.selectedId = this.items[0]?.id || "";
    this.save();
    if (item) ResearchStorage.appendHistory({ type: "Removed", researchId: id, title: item.title });
  }

  addEvidence(id, evidence) {
    const item = this.get(id);
    if (!item) return null;
    const now = new Date().toISOString();
    const normalized = normalizeEvidence([{ ...evidence, createdAt: now }])[0];
    item.evidence ||= [];
    item.evidence.push(normalized);
    item.updatedAt = now;
    item.history ||= [];
    item.history.push({ id: createResearchId("H"), at: now, type: "Evidence Added", note: normalized.note || normalized.title, patch: { evidenceId: normalized.id } });
    this.save();
    ResearchStorage.appendHistory({ type: "Evidence Added", researchId: item.id, title: item.title, evidenceId: normalized.id });
    return item;
  }

  setDecision(id, decision, reason = "", userNote = "", snapshot = null) {
    const item = this.get(id);
    if (!item) return null;
    const now = new Date().toISOString();
    item.decision = decision;
    if (reason) item.resultSummary = reason;
    item.updatedAt = now;
    item.decisionLog ||= [];
    item.decisionLog.push({
      id: createResearchId("D"),
      date: now,
      decision,
      reason,
      userNote,
      snapshot: snapshot || analyzerSnapshotSafe(item)
    });
    item.history ||= [];
    item.history.push({ id: createResearchId("H"), at: now, type: "Decision Changed", note: `${decision}: ${reason || userNote || "-"}` });
    this.save();
    ResearchStorage.appendHistory({ type: "Decision Changed", researchId: item.id, title: item.title, decision });
    return item;
  }

  findDuplicate(draft) {
    const key = duplicateKey(draft);
    return this.items.find((item) => duplicateKey(item) === key) || null;
  }

  importBundle(raw) {
    const result = ResearchStorage.importBundle(raw, this.items);
    if (result.ok) {
      this.items = result.items;
      this.selectedId = this.items[0]?.id || "";
      this.lastMessage = result.warnings?.length ? result.warnings.join(" / ") : `Imported. Duplicates merged: ${result.duplicates}`;
    } else {
      this.lastMessage = result.error;
    }
    return result;
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
      if (filters.priority && filters.priority !== "All" && item.priority !== filters.priority) return false;
      if (filters.confidence && filters.confidence !== "All" && item.confidence !== filters.confidence) return false;
      if (filters.health && filters.health !== "All" && researchHealth(item) !== filters.health) return false;
      const text = `${item.title} ${item.engine} ${item.condition} ${item.session} ${item.hypothesis} ${item.reason} ${(item.evidence || []).map((e) => e.note).join(" ")} ${(item.tags || []).join(" ")}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      return true;
    });
  }

  portfolio() {
    const total = this.items.length;
    const count = (fn) => this.items.filter(fn).length;
    const avg = (fn) => total ? this.items.reduce((sum, item) => sum + fn(item), 0) / total : 0;
    return {
      total,
      active: count((x) => !["Completed", "Rejected", "Adopted"].includes(x.status)),
      collecting: count((x) => x.status === "Collecting Data"),
      testing: count((x) => x.status === "Testing"),
      completed: count((x) => x.status === "Completed"),
      adopted: count((x) => x.status === "Adopted" || x.decision === "Adopt"),
      rejected: count((x) => x.status === "Rejected" || x.decision === "Reject"),
      onHold: count((x) => x.status === "On Hold" || x.decision === "Hold"),
      stale: this.stale().length,
      critical: count((x) => x.priority === "Critical"),
      high: count((x) => x.priority === "High"),
      averageScore: avg((x) => scoreWeight(x.researchScore)).toFixed(1),
      averageProgress: Math.round(avg(researchProgress)),
      averageConfidence: confidenceAverage(this.items).toFixed(1),
      warning: count((x) => researchHealth(x) === "Warning"),
      reviewRequired: count((x) => researchHealth(x) === "Review Required")
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
      .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || scoreWeight(b.researchScore) - scoreWeight(a.researchScore) || researchProgress(a) - researchProgress(b))[0] || null;
  }
}

function researchProgress(item) {
  const checks = [
    Boolean(item.hypothesis),
    Boolean(item.reason),
    Boolean(item.requiredData),
    Boolean(item.validationPlan),
    Boolean(item.successCriteria),
    Boolean(item.failureCriteria),
    Boolean(item.evidence?.length),
    Boolean(item.resultSummary),
    item.decision && item.decision !== "Undecided"
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

function researchHealth(item) {
  if (["Completed", "Adopted", "Rejected"].includes(item.status)) return "Completed";
  if (!item.requiredData || !item.validationPlan) return "Needs Data";
  if (item.status === "Testing" && !item.evidence?.length) return "Blocked";
  if (item.status === "Review" && item.decision === "Undecided") return "Review Required";
  if (researchProgress(item) < 35 && ["Ready", "Collecting Data", "Testing"].includes(item.status)) return "Warning";
  const updated = Date.parse(item.updatedAt || item.createdAt || "");
  if (updated && (Date.now() - updated) / 86400000 >= 14) return "Stale";
  return "Healthy";
}

function nextAction(item) {
  if (!item.hypothesis) return "Enter hypothesis.";
  if (!item.requiredData) return "Define required data.";
  if (!item.validationPlan) return "Create validation plan.";
  if (!item.successCriteria || !item.failureCriteria) return "Define success and failure criteria.";
  if (item.status === "Backlog") return "Move to Hypothesis or Ready.";
  if (item.status === "Hypothesis") return "Prepare validation plan.";
  if (item.status === "Ready") return "Start collecting required CSV data.";
  if (item.status === "Collecting Data") return "Continue data collection until minimum samples are reached.";
  if (item.status === "Testing" && !item.evidence?.length) return "Add evidence and observed metrics.";
  if (item.status === "Testing") return "Move to Review after validation.";
  if (item.status === "Review") return "Record decision.";
  if (item.status === "Completed") return "Check whether revalidation is needed.";
  if (item.status === "Revalidation") return "Compare before and after snapshots.";
  if (item.status === "On Hold") return "Define what data is needed to resume.";
  return "Review current status.";
}

function duplicateKey(item) {
  return [item.title, item.engine, item.condition, item.session, item.category].map((x) => String(x || "").trim().toLowerCase()).join("|");
}

function diffPatch(before, after) {
  const changes = [];
  const tracked = {
    status: "Status Changed",
    priority: "Priority Changed",
    decision: "Decision Changed"
  };
  Object.entries(tracked).forEach(([key, type]) => {
    if (before[key] !== after[key]) changes.push({ type, note: `${key}: ${before[key] || "-"} -> ${after[key] || "-"}`, patch: { [key]: after[key] } });
  });
  const otherChanged = ["title", "category", "engine", "condition", "session", "hypothesis", "reason", "requiredData", "validationPlan", "successCriteria", "failureCriteria", "resultSummary", "nextAction", "tags"].some((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  if (otherChanged) changes.push({ type: "Updated", note: "Research fields updated.", patch: null });
  return changes;
}

function analyzerSnapshotSafe(item) {
  return item.afterSnapshot || item.sourceAnalyzerSnapshot || null;
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

function confidenceAverage(items) {
  const weight = { High: 4, Medium: 3, Low: 2, Insufficient: 1 };
  return items.length ? items.reduce((sum, item) => sum + (weight[item.confidence] || 0), 0) / items.length : 0;
}

const researchManager = new ResearchManager();
