const RESEARCH_STORAGE_KEY = "scalplayerResearchItems";
const RESEARCH_SETTINGS_KEY = "scalplayerResearchSettings";
const RESEARCH_MANAGER_HISTORY_KEY = "scalplayerResearchManagerHistory";
const RESEARCH_SCHEMA_VERSION = "3.2";

class ResearchStorage {
  static loadItems() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RESEARCH_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static saveItems(items) {
    localStorage.setItem(RESEARCH_STORAGE_KEY, JSON.stringify(items));
  }

  static loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(RESEARCH_SETTINGS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  static saveSettings(settings) {
    localStorage.setItem(RESEARCH_SETTINGS_KEY, JSON.stringify({ schemaVersion: RESEARCH_SCHEMA_VERSION, ...settings }));
  }

  static loadHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RESEARCH_MANAGER_HISTORY_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static appendHistory(entry) {
    const history = ResearchStorage.loadHistory();
    history.push({ at: new Date().toISOString(), ...entry });
    localStorage.setItem(RESEARCH_MANAGER_HISTORY_KEY, JSON.stringify(history.slice(-500)));
  }

  static exportBundle(items, settings = {}) {
    return {
      version: RESEARCH_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      researchItems: items,
      settings,
      history: ResearchStorage.loadHistory(),
      analyzerSnapshots: loadResearchHistory()
    };
  }

  static importBundle(bundle, currentItems) {
    if (!bundle || !Array.isArray(bundle.researchItems)) {
      throw new Error("Invalid Research Manager JSON.");
    }
    const map = new Map(currentItems.map((item) => [item.id, item]));
    bundle.researchItems.forEach((item) => {
      if (!item.id) item.id = createResearchId();
      map.set(item.id, migrateResearchItem(item));
    });
    const merged = Array.from(map.values());
    ResearchStorage.saveItems(merged);
    if (bundle.settings) ResearchStorage.saveSettings(bundle.settings);
    if (Array.isArray(bundle.history)) {
      const history = [...ResearchStorage.loadHistory(), ...bundle.history].slice(-500);
      localStorage.setItem(RESEARCH_MANAGER_HISTORY_KEY, JSON.stringify(history));
    }
    return merged;
  }
}

function migrateResearchItem(item) {
  return {
    schemaVersion: RESEARCH_SCHEMA_VERSION,
    decision: "Undecided",
    evidence: [],
    history: [],
    tags: [],
    ...item
  };
}

function createResearchId() {
  return `R-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
