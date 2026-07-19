const PerformanceUtil = {
  marks: {},
  last: {},
  cache: { hit: 0, miss: 0, lastStatus: "MISS" },

  startTimer(name) {
    this.marks[name] = performance.now();
  },

  stopTimer(name) {
    const start = this.marks[name] ?? performance.now();
    const elapsed = Math.max(0, performance.now() - start);
    this.last[name] = Math.round(elapsed * 100) / 100;
    delete this.marks[name];
    return this.last[name];
  },

  cacheHit(name = "Cache") {
    this.cache.hit++;
    this.cache.lastStatus = "HIT";
    this.last[`${name} Cache`] = "HIT";
  },

  cacheMiss(name = "Cache") {
    this.cache.miss++;
    this.cache.lastStatus = "MISS";
    this.last[`${name} Cache`] = "MISS";
  },

  cacheHitRate() {
    const total = this.cache.hit + this.cache.miss;
    return total ? Math.round((this.cache.hit / total) * 10000) / 100 : 0;
  },

  memoryUsage() {
    const memory = performance.memory;
    if (!memory) return "N/A";
    return `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`;
  },

  analysisStatistics(engine) {
    return {
      analysisTime: this.last.Analysis || 0,
      crossTime: this.last.CrossCsv || 0,
      brainTime: this.last.Brain || 0,
      qualityTime: this.last.DataQuality || 0,
      memory: this.memoryUsage(),
      analysisVersion: engine?.analysisVersion || 0,
      cacheStatus: this.cache.lastStatus,
      cacheHitRate: this.cacheHitRate(),
      crossCache: this.last["CrossCsv Cache"] || "MISS",
      brainCache: this.last["Brain Cache"] || "MISS",
      qualityCache: this.last["DataQuality Cache"] || "MISS"
    };
  }
};
