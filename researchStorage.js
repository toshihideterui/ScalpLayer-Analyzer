const RESEARCH_STORAGE_KEY = "scalplayerResearchItems";
const RESEARCH_SETTINGS_KEY = "scalplayerResearchSettings";
const RESEARCH_MANAGER_HISTORY_KEY = "scalplayerResearchManagerHistory";
const RESEARCH_SCHEMA_VERSION = "3.2.1";

class ResearchStorage {
  static lastError = "";

  static loadItems() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RESEARCH_STORAGE_KEY) || "[]");
      if (!Array.isArray(parsed)) {
        ResearchStorage.lastError = "Research item storage is not an array.";
        return [];
      }
      return parsed.map(migrateResearchItem);
    } catch (error) {
      ResearchStorage.lastError = `Research item JSON is broken: ${error.message}`;
      return [];
    }
  }

  static saveItems(items) {
    try {
      localStorage.setItem(RESEARCH_STORAGE_KEY, JSON.stringify(items.map(migrateResearchItem)));
      ResearchStorage.lastError = "";
      return { ok: true };
    } catch (error) {
      ResearchStorage.lastError = `Research item save failed: ${error.message}`;
      return { ok: false, error: ResearchStorage.lastError };
    }
  }

  static loadSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RESEARCH_SETTINGS_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      ResearchStorage.lastError = `Research settings JSON is broken: ${error.message}`;
      return {};
    }
  }

  static saveSettings(settings) {
    try {
      localStorage.setItem(RESEARCH_SETTINGS_KEY, JSON.stringify({ schemaVersion: RESEARCH_SCHEMA_VERSION, ...settings }));
      return { ok: true };
    } catch (error) {
      ResearchStorage.lastError = `Research settings save failed: ${error.message}`;
      return { ok: false, error: ResearchStorage.lastError };
    }
  }

  static loadHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RESEARCH_MANAGER_HISTORY_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      ResearchStorage.lastError = `Research manager history JSON is broken: ${error.message}`;
      return [];
    }
  }

  static saveHistory(history) {
    try {
      localStorage.setItem(RESEARCH_MANAGER_HISTORY_KEY, JSON.stringify((history || []).slice(-1000)));
      return { ok: true };
    } catch (error) {
      ResearchStorage.lastError = `Research manager history save failed: ${error.message}`;
      return { ok: false, error: ResearchStorage.lastError };
    }
  }

  static appendHistory(entry) {
    const history = ResearchStorage.loadHistory();
    history.push({ id: createResearchId("H"), at: new Date().toISOString(), ...entry });
    return ResearchStorage.saveHistory(history);
  }

  static exportBundle(items, settings = {}) {
    const normalized = (items || []).map(migrateResearchItem);
    return {
      version: RESEARCH_SCHEMA_VERSION,
      schemaVersion: RESEARCH_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      researchItems: normalized,
      settings: { schemaVersion: RESEARCH_SCHEMA_VERSION, ...settings },
      history: ResearchStorage.loadHistory(),
      analyzerSnapshots: typeof loadResearchHistory === "function" ? loadResearchHistory() : []
    };
  }

  static importBundle(raw, currentItems = []) {
    let bundle;
    try {
      bundle = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (error) {
      return { ok: false, error: `Broken JSON: ${error.message}` };
    }

    const validation = ResearchStorage.validateBundle(bundle);
    if (!validation.ok) return validation;

    const warnings = [...validation.warnings];
    const map = new Map((currentItems || []).map((item) => [item.id, migrateResearchItem(item)]));
    let duplicates = 0;

    bundle.researchItems.forEach((rawItem) => {
      const item = migrateResearchItem(rawItem);
      const existing = map.get(item.id);
      if (existing) {
        duplicates++;
        const existingTime = Date.parse(existing.updatedAt || existing.createdAt || "");
        const importTime = Date.parse(item.updatedAt || item.createdAt || "");
        if (importTime >= existingTime) {
          item.history = mergeByKey([...(existing.history || []), ...(item.history || [])], "id", "at");
          item.evidence = mergeByKey([...(existing.evidence || []), ...(item.evidence || [])], "id", "createdAt");
          item.decisionLog = mergeByKey([...(existing.decisionLog || []), ...(item.decisionLog || [])], "id", "date");
          map.set(item.id, item);
        }
      } else {
        map.set(item.id, item);
      }
    });

    const items = Array.from(map.values()).sort((a, b) => Date.parse(b.updatedAt || b.createdAt || "") - Date.parse(a.updatedAt || a.createdAt || ""));
    const saveResult = ResearchStorage.saveItems(items);
    if (!saveResult.ok) return saveResult;

    if (bundle.settings) ResearchStorage.saveSettings(bundle.settings);
    if (Array.isArray(bundle.history)) {
      ResearchStorage.saveHistory(mergeByKey([...ResearchStorage.loadHistory(), ...bundle.history], "id", "at"));
    }

    return {
      ok: true,
      items,
      warnings,
      version: bundle.version || bundle.schemaVersion || "unknown",
      duplicates
    };
  }

  static validateBundle(bundle) {
    const warnings = [];
    if (!bundle || typeof bundle !== "object") return { ok: false, error: "Import file is not a JSON object." };
    if (!Array.isArray(bundle.researchItems)) return { ok: false, error: "Invalid Research Manager JSON: researchItems is missing." };
    if (!bundle.version && !bundle.schemaVersion) warnings.push("Version is missing. Migration will be attempted.");

    const ids = new Set();
    bundle.researchItems.forEach((item, index) => {
      if (!item || typeof item !== "object") warnings.push(`Item ${index + 1} is not an object.`);
      if (item?.id && ids.has(item.id)) warnings.push(`Duplicate ID in import file: ${item.id}`);
      if (item?.id) ids.add(item.id);
      const known = new Set(RESEARCH_ITEM_FIELDS);
      Object.keys(item || {}).forEach((key) => {
        if (!known.has(key)) warnings.push(`Unknown field preserved: ${key}`);
      });
    });
    return { ok: true, warnings };
  }
}

const RESEARCH_ITEM_FIELDS = [
  "schemaVersion", "id", "title", "category", "status", "priority", "researchScore", "confidence", "engine", "condition", "session",
  "hypothesis", "reason", "requiredData", "validationPlan", "successCriteria", "failureCriteria", "datasetStart", "datasetEnd",
  "createdAt", "updatedAt", "startedAt", "completedAt", "decision", "resultSummary", "evidence", "decisionLog", "nextAction",
  "tags", "sourceAnalyzerSnapshot", "history", "beforeSnapshot", "afterSnapshot"
];

function migrateResearchItem(item = {}) {
  const now = new Date().toISOString();
  return {
    schemaVersion: RESEARCH_SCHEMA_VERSION,
    id: item.id || createResearchId(),
    title: item.title || "Untitled Research",
    category: item.category || "Other",
    status: item.status || "Backlog",
    priority: item.priority || "Medium",
    researchScore: item.researchScore || "★★★☆☆",
    confidence: item.confidence || "Low",
    engine: item.engine || "",
    condition: item.condition || "",
    session: item.session || "",
    hypothesis: item.hypothesis || "",
    reason: item.reason || "",
    requiredData: item.requiredData || "",
    validationPlan: item.validationPlan || "",
    successCriteria: item.successCriteria || "",
    failureCriteria: item.failureCriteria || "",
    datasetStart: item.datasetStart || "",
    datasetEnd: item.datasetEnd || "",
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.createdAt || now,
    startedAt: item.startedAt || "",
    completedAt: item.completedAt || "",
    decision: item.decision || "Undecided",
    resultSummary: item.resultSummary || "",
    evidence: normalizeEvidence(item.evidence),
    decisionLog: normalizeDecisionLog(item.decisionLog),
    nextAction: item.nextAction || "",
    tags: normalizeTags(item.tags),
    sourceAnalyzerSnapshot: item.sourceAnalyzerSnapshot || null,
    beforeSnapshot: item.beforeSnapshot || item.sourceAnalyzerSnapshot || null,
    afterSnapshot: item.afterSnapshot || null,
    history: normalizeHistory(item.history)
  };
}

function normalizeEvidence(evidence = []) {
  return (Array.isArray(evidence) ? evidence : []).map((entry) => ({
    id: entry.id || createResearchId("E"),
    date: entry.date || (entry.createdAt || new Date().toISOString()).slice(0, 10),
    type: entry.type || "Memo",
    title: entry.title || entry.type || "Evidence",
    value: entry.value || "",
    note: entry.note || (typeof entry === "string" ? entry : ""),
    source: entry.source || "Manual",
    snapshotId: entry.snapshotId || "",
    createdAt: entry.createdAt || entry.date || new Date().toISOString()
  }));
}

function normalizeDecisionLog(log = []) {
  return (Array.isArray(log) ? log : []).map((entry) => ({
    id: entry.id || createResearchId("D"),
    date: entry.date || entry.at || new Date().toISOString(),
    decision: entry.decision || "Undecided",
    reason: entry.reason || "",
    userNote: entry.userNote || entry.note || "",
    snapshot: entry.snapshot || null
  }));
}

function normalizeHistory(history = []) {
  return (Array.isArray(history) ? history : []).map((entry) => ({
    id: entry.id || createResearchId("H"),
    at: entry.at || entry.date || new Date().toISOString(),
    type: entry.type || "Updated",
    note: entry.note || "",
    patch: entry.patch || null
  }));
}

function normalizeTags(tags = []) {
  if (Array.isArray(tags)) return tags.map((x) => String(x).trim()).filter(Boolean);
  return String(tags).split(",").map((x) => x.trim()).filter(Boolean);
}

function mergeByKey(list, key = "id", fallbackKey = "at") {
  const map = new Map();
  (list || []).forEach((entry) => {
    const id = entry?.[key] || `${entry?.[fallbackKey] || ""}-${JSON.stringify(entry)}`;
    map.set(id, entry);
  });
  return Array.from(map.values());
}

function createResearchId(prefix = "R") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
