class KnowledgeGraphEngine {
  constructor({ analysisEngine, researchManager } = {}) {
    this.analysisEngine = analysisEngine;
    this.researchManager = researchManager;
    this.results = analysisEngine?.results || {};
    this.datasets = analysisEngine?.datasets || {};
  }

  snapshot() {
    if (this.analysisEngine && !this.analysisEngine._snapshotCache) this.analysisEngine._snapshotCache = {};
    const cache = this.analysisEngine?._snapshotCache || {};
    const researchItems = this.researchItems();
    const history = this.history();
    const lineage = this.results.hypothesisLineage;
    const key = `${this.analysisEngine?.analysisVersion || 0}:${researchItems.length}:${history.length}:${lineage?.hypothesisRelations?.length || 0}:${lineage?.enrichedHypotheses?.length || 0}`;
    if (cache.knowledgeGraph?.key === key) {
      if (typeof PerformanceUtil !== "undefined") PerformanceUtil.cacheHit("KnowledgeGraph");
      return cache.knowledgeGraph.snapshot;
    }
    if (typeof PerformanceUtil !== "undefined") PerformanceUtil.cacheMiss("KnowledgeGraph");

    const graph = this.buildGraph(researchItems);
    const statistics = graphStatisticsKg(graph.nodes, graph.edges);
    const largestCluster = largestClusterKg(graph.nodes, graph.edges);
    const topConnectedEngine = topConnectedKg(graph.nodes, graph.edges, "Engine");
    const topConnectedTopNg = topConnectedKg(graph.nodes, graph.edges, "TopNG");
    const researchHub = topConnectedKg(graph.nodes, graph.edges, "Research");
    const engineSimilarityGraph = this.engineSimilarityGraph();
    const opportunityFlow = this.opportunityFlow();
    const hiddenOpportunityGraph = this.hiddenOpportunityGraph();
    const engineClusterGraph = this.engineClusterGraph();
    const sessionFlow = this.sessionFlow();
    const dependencyGraph = this.dependencyGraph(researchItems);
    const bottleneckGraph = this.bottleneckGraph(graph.nodes, graph.edges);
    const insight = this.insight({ topConnectedEngine, topConnectedTopNg, researchHub, largestCluster, opportunityFlow });

    const snapshot = {
      version: "5.0",
      nodes: graph.nodes,
      edges: graph.edges,
      graphSummary: {
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        largestCluster: largestCluster.label,
        mostConnectedEngine: topConnectedEngine.label,
        mostConnectedTopNG: topConnectedTopNg.label,
        researchHub: researchHub.label,
        graphDensity: statistics.density,
        hypothesisNodeCount: graph.nodes.filter((x) => x.type === "Hypothesis").length,
        hypothesisRelationCount: graph.edges.filter((x) => (typeof HYPOTHESIS_RELATION_TYPES !== "undefined" ? HYPOTHESIS_RELATION_TYPES : []).includes(x.type)).length,
        hypothesisFamilyCount: this.results.hypothesisLineage?.hypothesisFamilies?.length || 0,
        orphanHypothesisCount: this.results.hypothesisLineage?.orphanHypotheses?.length || 0
      },
      largestCluster,
      researchHub,
      topConnectedEngine,
      topConnectedTopNg,
      graphStatistics: statistics,
      engineSimilarityGraph,
      opportunityFlow,
      hiddenOpportunityGraph,
      engineClusterGraph,
      sessionFlow,
      dependencyGraph,
      bottleneckGraph,
      insight
    };
    cache.knowledgeGraph = { key, snapshot };
    return snapshot;
  }

  buildGraph(researchItems) {
    const nodes = new Map();
    const edges = [];
    const addNode = (id, type, label, weight = 1, meta = {}) => {
      const key = kgId(type, id);
      const existing = nodes.get(key);
      if (existing) {
        existing.weight += Number(weight || 0);
        existing.meta = { ...existing.meta, ...meta };
        return existing;
      }
      const node = { id: key, type, label: String(label || id || type), weight: Number(weight || 1), meta };
      nodes.set(key, node);
      return node;
    };
    const addEdge = (source, target, type, weight = 1, label = type) => {
      if (!source || !target || source.id === target.id) return;
      const existing = edges.find((x) => x.source === source.id && x.target === target.id && x.type === type);
      if (existing) {
        existing.weight += Number(weight || 1);
        return;
      }
      edges.push({ source: source.id, target: target.id, type, weight: Number(weight || 1), label });
    };

    const conditions = ["RSI", "ATR", "BB", "Spread", "Volume", "Time", "RecentDrop", "RecentRise", "LowUpdate", "HighUpdate", "BullStreak", "BearStreak"];
    const conditionNodes = Object.fromEntries(conditions.map((name) => [name, addNode(name, "Condition", name, 1)]));
    const sessions = ["Tokyo", "London", "NewYork", "NY", "Other"];
    const sessionNodes = Object.fromEntries(sessions.map((name) => [name, addNode(name, "Session", name, 1)]));

    const dnaProfiles = this.results.engineDna?.profiles || [];
    const engineRows = dnaProfiles.length ? dnaProfiles : (this.results.engineActivity || []).map((x) => ({
      engine: x.engine,
      researchScore: x.researchScore,
      confidence: x.confidence,
      tradeCount: x.entries || 0,
      nearMissCount: 0,
      signalCount: 0,
      session: "Unknown",
      winRate: 0,
      profitFactor: 0,
      expectancy: 0,
      topNg: x.topNg || []
    }));

    engineRows.forEach((engine) => {
      const engineNode = addNode(engine.engine, "Engine", engine.engine, 10 + Number(engine.tradeCount || 0) + Number(engine.nearMissCount || 0), {
        researchScore: engine.researchScore,
        confidence: engine.confidence,
        tradeCount: engine.tradeCount || 0,
        nearMissCount: engine.nearMissCount || 0,
        signalCount: engine.signalCount || 0,
        session: engine.session,
        winRate: engine.winRate,
        profitFactor: engine.profitFactor,
        expectancy: engine.expectancy
      });
      const session = normalizeSessionKg(engine.session);
      if (sessionNodes[session]) addEdge(engineNode, sessionNodes[session], "EngineSession", engine.tradeCount || 1, "uses session");
      (engine.topNg || []).slice(0, 5).forEach((ng) => {
        const topNgNode = addNode(ng.name, "TopNG", ng.name, ng.count || 1, { count: ng.count || 0 });
        addEdge(engineNode, topNgNode, "EngineTopNG", ng.count || 1, "blocked by");
        const conditionName = conditionFromNgKg(ng.name);
        if (conditionNodes[conditionName]) addEdge(topNgNode, conditionNodes[conditionName], "TopNGCondition", ng.count || 1, "belongs to");
      });
    });

    (this.results.session || []).forEach((session) => {
      const node = addNode(normalizeSessionKg(session.session), "Session", session.session || "Other", session.trades + session.nearMiss + 1, session);
      addEdge(node, addNode("Trade", "Flow", "Trade", this.results.dashboard?.totalTrades || 1), "SessionTrade", session.trades || 1, "trade");
      addEdge(node, addNode("NearMiss", "Flow", "NearMiss", this.results.nearMiss?.total || 1), "SessionNearMiss", session.nearMiss || 1, "nearmiss");
    });

    researchItems.forEach((item, index) => {
      const label = item.title || `Research ${index + 1}`;
      const researchNode = addNode(item.id || label, "Research", label, 4 + scoreWeightKg(item.researchScore), {
        status: item.status,
        category: item.category,
        engine: item.engine,
        priority: item.priority,
        researchScore: item.researchScore
      });
      if (item.engine) {
        const engineNode = addNode(item.engine, "Engine", displayKg(item.engine), 1);
        addEdge(engineNode, researchNode, "EngineResearch", 1, "research item");
      }
      (item.tags || []).forEach((tag) => {
        const conditionName = conditionFromNgKg(tag);
        if (conditionNodes[conditionName]) addEdge(conditionNodes[conditionName], researchNode, "ConditionResearch", 1, "researches");
      });
      const text = `${item.title || ""} ${item.condition || ""} ${(item.tags || []).join(" ")}`;
      conditions.forEach((condition) => {
        if (new RegExp(condition, "i").test(text)) addEdge(conditionNodes[condition], researchNode, "ConditionResearch", 1, "mentions");
      });
    });

    const lineage = this.results.hypothesisLineage;
    (lineage?.enrichedHypotheses || []).forEach((hypothesis) => {
      const hypothesisNode = addNode(hypothesis.id, "Hypothesis", hypothesis.title, 5 + Number(hypothesis.score2 || 0) / 10, {
        status: hypothesis.status,
        score2: hypothesis.score2,
        confidencePercent: hypothesis.confidencePercent,
        validationReadiness: hypothesis.validationReadiness,
        family: hypothesis.family,
        source: hypothesis.source
      });
      if (hypothesis.engine) {
        const engineNode = addNode(hypothesis.engine, "Engine", displayKg(hypothesis.engine), 1);
        addEdge(engineNode, hypothesisNode, "EngineHypothesis", 1, "hypothesis");
      }
      if (hypothesis.condition) {
        const conditionName = conditionFromNgKg(hypothesis.condition);
        if (conditionNodes[conditionName]) addEdge(conditionNodes[conditionName], hypothesisNode, "ConditionHypothesis", 1, "hypothesis");
      }
      if (hypothesis.session) {
        const sessionName = normalizeSessionKg(hypothesis.session);
        if (sessionNodes[sessionName]) addEdge(sessionNodes[sessionName], hypothesisNode, "SessionHypothesis", 1, "hypothesis");
      }
    });
    (lineage?.hypothesisRelations || []).forEach((relation) => {
      const source = nodes.get(kgId("Hypothesis", relation.sourceId));
      const target = nodes.get(kgId("Hypothesis", relation.targetId));
      addEdge(source, target, relation.relationType, 1, relation.relationType);
    });

    const flowSignal = addNode("Signal", "Flow", "Signal", this.results.signal?.total || 1);
    const flowNear = addNode("NearMiss", "Flow", "NearMiss", this.results.nearMiss?.total || 1);
    const flowTrade = addNode("Trade", "Flow", "Trade", this.results.dashboard?.totalTrades || 1);
    const flowWin = addNode("Win", "Flow", "Win", this.results.dashboard?.wins || 1);
    addEdge(flowSignal, flowNear, "OpportunityFlow", this.results.nearMiss?.total || 1, "signal to nearmiss");
    addEdge(flowNear, flowTrade, "OpportunityFlow", this.results.dashboard?.totalTrades || 1, "nearmiss to trade");
    addEdge(flowTrade, flowWin, "OpportunityFlow", this.results.dashboard?.wins || 1, "trade to win");

    return { nodes: Array.from(nodes.values()), edges };
  }

  engineSimilarityGraph() {
    const dna = this.results.engineDna || {};
    const nodes = (dna.profiles || []).map((x) => ({ id: kgId("Engine", x.engine), label: x.engine, type: "Engine", weight: x.dnaScore || 1 }));
    const edges = (dna.similarity || []).filter((x) => x.similarity >= 50).map((x) => ({
      source: kgId("Engine", x.engineA),
      target: kgId("Engine", x.engineB),
      type: "Similarity",
      weight: x.similarity,
      label: `${x.similarity}%`
    }));
    return { nodes, edges };
  }

  opportunityFlow() {
    const signal = Number(this.results.signal?.total || 0);
    const near = Number(this.results.nearMiss?.total || 0);
    const trades = Number(this.results.dashboard?.totalTrades || 0);
    const wins = Number(this.results.dashboard?.wins || 0);
    const topNg = this.results.nearMiss?.ngReasons?.[0]?.name || this.results.engineDna?.topEngine?.topNg?.[0]?.name || "-";
    return [
      { from: "Signal", to: "NearMiss", value: near || signal, label: "Signal -> NearMiss" },
      { from: "NearMiss", to: "Trade", value: trades, label: "NearMiss -> Trade" },
      { from: "Trade", to: "Win", value: wins, label: "Trade -> Win" },
      { from: "NearMiss", to: "TopNG", value: near, label: `NearMiss -> ${topNg}` },
      { from: "TopNG", to: "Research", value: this.researchItems().length, label: "TopNG -> Research" }
    ];
  }

  hiddenOpportunityGraph() {
    const hidden = this.results.engineDna?.hiddenOpportunity || [];
    return hidden.map((x) => ({
      engine: x.engine,
      nearMiss: x.nearMiss,
      signals: x.signals,
      trades: x.trades,
      priority: x.priority,
      reason: x.reason
    }));
  }

  engineClusterGraph() {
    return (this.results.engineDna?.clusters || []).map((cluster) => ({
      cluster: cluster.cluster,
      count: cluster.count,
      engines: cluster.engines,
      averageDnaScore: cluster.averageDnaScore,
      averageStability: cluster.averageStability
    }));
  }

  sessionFlow() {
    return (this.results.session || []).map((x) => ({
      session: x.session,
      trades: x.trades || 0,
      nearMiss: x.nearMiss || 0,
      winRate: x.winRate || 0,
      researchScore: x.score || x.researchScore || "-"
    }));
  }

  dependencyGraph(researchItems) {
    const nodes = researchItems.map((item) => ({ id: item.id, label: item.title, engine: item.engine, category: item.category, status: item.status }));
    const edges = [];
    for (let i = 0; i < researchItems.length; i++) {
      for (let j = i + 1; j < researchItems.length; j++) {
        const a = researchItems[i];
        const b = researchItems[j];
        const shared = sharedResearchKg(a, b);
        if (shared.length) edges.push({ source: a.id, target: b.id, type: "ResearchDependency", weight: shared.length, label: shared.join(" / ") });
      }
    }
    return { nodes, edges };
  }

  bottleneckGraph(nodes, edges) {
    return edges.filter((x) => ["EngineTopNG", "TopNGCondition", "ConditionResearch"].includes(x.type)).slice(0, 60);
  }

  insight({ topConnectedEngine, topConnectedTopNg, researchHub, largestCluster, opportunityFlow }) {
    const lines = [];
    if (topConnectedEngine.label !== "-") lines.push(`${topConnectedEngine.label} is the most connected Engine in the research graph.`);
    if (topConnectedTopNg.label !== "-") lines.push(`${topConnectedTopNg.label} is the strongest TopNG bottleneck hub.`);
    if (researchHub.label !== "-") lines.push(`${researchHub.label} is the current Research hub.`);
    if (largestCluster.label !== "-") lines.push(`Largest cluster is ${largestCluster.label} with ${largestCluster.count} nodes.`);
    const flow = opportunityFlow.find((x) => x.to === "TopNG");
    if (flow?.value) lines.push(`NearMiss to TopNG flow is active. Treat this as Research target, not automatic condition change.`);
    if (!lines.length) lines.push("Knowledge Graph needs more CSV and Research Manager data.");
    return lines;
  }

  researchItems() {
    if (Array.isArray(this.researchManager?.items)) return this.researchManager.items;
    if (typeof ResearchStorage !== "undefined") return ResearchStorage.loadItems();
    return [];
  }

  history() {
    return typeof loadResearchHistory === "function" ? loadResearchHistory() : [];
  }
}

function kgId(type, value) {
  return `${type}:${String(value || "Unknown").trim().toLowerCase().replace(/\s+/g, "_")}`;
}

function normalizeSessionKg(value) {
  const raw = String(value || "Other").toLowerCase();
  if (raw.includes("tokyo")) return "Tokyo";
  if (raw.includes("london")) return "London";
  if (raw.includes("ny") || raw.includes("newyork") || raw.includes("new york")) return "NewYork";
  return "Other";
}

function conditionFromNgKg(value) {
  const raw = String(value || "");
  if (/RSI/i.test(raw)) return "RSI";
  if (/ATR/i.test(raw)) return "ATR";
  if (/BB|Bollinger/i.test(raw)) return "BB";
  if (/Spread/i.test(raw)) return "Spread";
  if (/Vol|Volume/i.test(raw)) return "Volume";
  if (/Time|Session/i.test(raw)) return "Time";
  if (/RecentDrop|Drop/i.test(raw)) return "RecentDrop";
  if (/RecentRise|Rise/i.test(raw)) return "RecentRise";
  if (/LowUpdate/i.test(raw)) return "LowUpdate";
  if (/HighUpdate/i.test(raw)) return "HighUpdate";
  if (/Bull/i.test(raw)) return "BullStreak";
  if (/Bear/i.test(raw)) return "BearStreak";
  return "Time";
}

function graphStatisticsKg(nodes, edges) {
  const typeCount = (type) => nodes.filter((x) => x.type === type).length;
  const n = nodes.length;
  const maxEdges = n > 1 ? n * (n - 1) : 1;
  return {
    nodeCount: n,
    edgeCount: edges.length,
    engineCount: typeCount("Engine"),
    researchCount: typeCount("Research"),
    conditionCount: typeCount("Condition"),
    sessionCount: typeCount("Session"),
    topNgCount: typeCount("TopNG"),
    connectedComponents: connectedComponentsKg(nodes, edges).length,
    density: Math.round((edges.length / maxEdges) * 10000) / 100
  };
}

function connectedComponentsKg(nodes, edges) {
  const neighbors = new Map(nodes.map((x) => [x.id, new Set()]));
  edges.forEach((e) => {
    neighbors.get(e.source)?.add(e.target);
    neighbors.get(e.target)?.add(e.source);
  });
  const seen = new Set();
  const groups = [];
  nodes.forEach((node) => {
    if (seen.has(node.id)) return;
    const stack = [node.id];
    const group = [];
    seen.add(node.id);
    while (stack.length) {
      const id = stack.pop();
      group.push(id);
      (neighbors.get(id) || []).forEach((next) => {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      });
    }
    groups.push(group);
  });
  return groups;
}

function largestClusterKg(nodes, edges) {
  const nodeMap = new Map(nodes.map((x) => [x.id, x]));
  const groups = connectedComponentsKg(nodes, edges).sort((a, b) => b.length - a.length);
  const group = groups[0] || [];
  const label = group.slice(0, 3).map((id) => nodeMap.get(id)?.label).filter(Boolean).join(" / ") || "-";
  return { label, count: group.length, nodes: group };
}

function topConnectedKg(nodes, edges, type) {
  const degree = {};
  edges.forEach((e) => {
    degree[e.source] = (degree[e.source] || 0) + 1;
    degree[e.target] = (degree[e.target] || 0) + 1;
  });
  const top = nodes.filter((x) => x.type === type).sort((a, b) => (degree[b.id] || 0) - (degree[a.id] || 0))[0];
  return top ? { label: top.label, degree: degree[top.id] || 0, id: top.id } : { label: "-", degree: 0, id: "" };
}

function scoreWeightKg(score) {
  return String(score || "").split("★").length - 1 || Number(score || 0) || 1;
}

function displayKg(value) {
  return String(value || "Unknown").replace(/_/g, " ");
}

function sharedResearchKg(a, b) {
  const shared = [];
  if (a.engine && b.engine && a.engine === b.engine) shared.push("Engine");
  if (a.category && b.category && a.category === b.category) shared.push("Category");
  const tagsA = new Set(a.tags || []);
  (b.tags || []).forEach((tag) => { if (tagsA.has(tag)) shared.push(`Tag:${tag}`); });
  return shared.slice(0, 4);
}
