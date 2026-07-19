class DataQualityEngine {
  constructor(analysisEngine) {
    this.engine = analysisEngine;
    this.files = Array.from(analysisEngine.files?.values?.() || []);
    this.results = analysisEngine.results || {};
  }

  snapshot() {
    const cache = this.engine._snapshotCache ||= {};
    if (cache.dataQuality?.version === this.engine.analysisVersion) {
      if (typeof PerformanceUtil !== "undefined") PerformanceUtil.cacheHit("DataQuality");
      return cache.dataQuality.snapshot;
    }
    if (typeof PerformanceUtil !== "undefined") {
      PerformanceUtil.cacheMiss("DataQuality");
      PerformanceUtil.startTimer("DataQuality");
    }
    const coverage = this.coverage();
    const missing = this.missingAnalysis();
    const duplicates = this.duplicateAnalysis();
    const sessionBalance = this.sessionBalance();
    const engineBalance = this.engineBalance();
    const timeCoverage = this.timeCoverage();
    const freshness = this.freshness();
    const confidence = this.confidenceScore({ coverage, sessionBalance, engineBalance, timeCoverage, freshness, missing, duplicates });
    const score = this.qualityScore(coverage, missing, duplicates, sessionBalance, engineBalance, timeCoverage, freshness);
    const warnings = this.warnings({ coverage, missing, duplicates, sessionBalance, engineBalance, timeCoverage, freshness });
    const recommendations = this.recommendations({ coverage, missing, sessionBalance, engineBalance, freshness });
    const snapshot = {
      schemaVersion: "4.1",
      qualityScore: score,
      qualityStars: starsFromScore(score),
      confidence: confidence.overall,
      confidenceScore: confidence,
      dataQuality: qualityLabel(score),
      coverage,
      missing,
      duplicates,
      sessionBalance,
      engineBalance,
      timeCoverage,
      freshness,
      warnings,
      recommendations,
      health: this.csvHealth(coverage, missing),
      reliability: this.reliability(score, confidence, warnings)
    };
    cache.dataQuality = { version: this.engine.analysisVersion, snapshot };
    if (typeof PerformanceUtil !== "undefined") PerformanceUtil.stopTimer("DataQuality");
    return snapshot;
  }

  coverage() {
    const expected = [
      ["TradeHistory", "tradeHistory", 25],
      ["NearMiss", "nearMiss", 20],
      ["Signal Log", "signalLog", 20],
      ["Engine Activity", "engineActivityV2", 15],
      ["Session Research", "sessionResearch", 10],
      ["CSV Structure", "structure", 10]
    ];
    return expected.map(([label, key, points]) => {
      const file = key === "engineActivityV2" ? this.file("engineActivityV2") || this.file("engineActivity") : this.file(key);
      const rows = key === "structure" ? this.files.reduce((sum, f) => sum + (f.headers?.length || 0), 0) : file?.rows?.length || 0;
      const coverage = coverageLabel(rows, key);
      const healthy = key === "structure" ? this.files.length > 0 && this.files.every((f) => f.headers?.length) : rows > 0;
      const earned = healthy ? points : key === "structure" && this.files.length ? Math.round(points * 0.5) : 0;
      return { label, key, points, earned, rows, coverage, status: healthy ? "Healthy" : "Insufficient", fileName: file?.name || "" };
    });
  }

  missingAnalysis() {
    return this.files.map((file) => {
      const rows = file.rows || [];
      const headers = file.headers || [];
      const missingValues = headers.reduce((sum, h) => sum + rows.filter((r) => emptyValue(r[h])).length, 0);
      return {
        csv: file.name,
        type: file.type?.label || "Unknown",
        missingColumns: file.validation?.missingColumns || [],
        missingValues,
        missingSession: rows.filter((r) => emptyValue(r.Session)).length,
        missingEngine: rows.filter((r) => emptyValue(r.Engine)).length,
        missingDate: rows.filter((r) => emptyValue(r.Date) && emptyValue(r.DateTime)).length,
        missingTime: rows.filter((r) => emptyValue(r.Time) && emptyValue(r.DateTime)).length,
        missingPrice: rows.filter((r) => emptyValue(r.Entry) && emptyValue(r.Price)).length,
        missingPips: rows.filter((r) => emptyValue(r.Pips)).length
      };
    });
  }

  duplicateAnalysis() {
    return this.files.map((file) => {
      const rows = file.rows || [];
      return {
        csv: file.name,
        duplicateRows: duplicateCount(rows, (r) => JSON.stringify(r)),
        duplicateIds: duplicateCount(rows, (r) => r.ID || r.id || ""),
        duplicateTrade: duplicateCount(rows, (r) => `${r.Date || ""}|${r.Time || ""}|${r.Engine || ""}|${r.Entry || ""}|${r.Exit || ""}`),
        duplicateTimestamp: duplicateCount(rows, (r) => r.DateTime || `${r.Date || ""} ${r.Time || ""}`),
        duplicateSignal: duplicateCount(rows, (r) => `${r.DateTime || r.Time || ""}|${r.Engine || ""}|${r.Direction || ""}|${r.FullSignal || ""}`)
      };
    });
  }

  sessionBalance() {
    const rows = [
      ...(this.results.trades || []).map((x) => x.session || "Other"),
      ...(this.engine.datasets?.nearMiss || []).map((x) => x.Session || "Other")
    ];
    return balanceRows(["Tokyo", "London", "NY", "Other"], rows);
  }

  engineBalance() {
    const names = new Set();
    (this.results.tradeByEngine || []).forEach((x) => names.add(x.name));
    (this.results.engineActivity || []).forEach((x) => names.add(x.engine));
    (this.results.signal?.table || []).forEach((x) => names.add(x.engine));
    const near = this.engine.datasets?.nearMiss || [];
    near.forEach((x) => names.add(x.Engine || "Unknown"));
    return Array.from(names).filter(Boolean).map((name) => ({
      engine: name,
      trades: this.results.trades?.filter((x) => x.engine === name).length || 0,
      signals: this.results.signal?.table?.find((x) => x.engine === name)?.signals || 0,
      nearMiss: near.filter((x) => (x.Engine || "Unknown") === name).length,
      status: ((this.results.trades?.filter((x) => x.engine === name).length || 0) + near.filter((x) => (x.Engine || "Unknown") === name).length) >= 20 ? "Healthy" : "Data Insufficient"
    })).sort((a, b) => (b.trades + b.signals + b.nearMiss) - (a.trades + a.signals + a.nearMiss));
  }

  timeCoverage() {
    const dates = (this.results.trades || []).map((t) => t.datetime).filter(Boolean).sort((a, b) => a - b);
    const start = dates[0] || null;
    const end = dates[dates.length - 1] || null;
    const uniqueDays = new Set(dates.map((d) => d.toISOString().slice(0, 10)));
    const totalDays = start && end ? Math.max(1, Math.round((end - start) / 86400000) + 1) : 0;
    return {
      startDate: start ? start.toISOString().slice(0, 10) : "",
      endDate: end ? end.toISOString().slice(0, 10) : "",
      totalDays,
      observedDays: uniqueDays.size,
      missingDays: Math.max(0, totalDays - uniqueDays.size),
      continuousDays: uniqueDays.size,
      status: totalDays && uniqueDays.size / totalDays >= 0.7 ? "Healthy" : totalDays ? "Sparse" : "No Trade Dates"
    };
  }

  freshness() {
    const dates = this.files.map((f) => f.updated).filter(Boolean).sort((a, b) => a - b);
    const newest = dates[dates.length - 1] || null;
    const oldest = dates[0] || null;
    const ageDays = newest ? Math.round((Date.now() - newest.getTime()) / 86400000) : null;
    return {
      newestCsv: newest ? newest.toLocaleString() : "-",
      oldestCsv: oldest ? oldest.toLocaleString() : "-",
      csvAgeDays: ageDays,
      status: ageDays === null ? "Unknown" : ageDays <= 3 ? "Fresh" : ageDays <= 14 ? "Acceptable" : "Old"
    };
  }

  qualityScore(coverage, missing, duplicates, sessionBalance, engineBalance, timeCoverage, freshness) {
    let score = coverage.reduce((sum, x) => sum + x.earned, 0);
    const missingPenalty = Math.min(15, missing.reduce((sum, x) => sum + x.missingColumns.length * 3, 0));
    const duplicatePenalty = Math.min(10, duplicates.reduce((sum, x) => sum + x.duplicateRows + x.duplicateTrade, 0));
    const sessionPenalty = sessionBalance.filter((x) => x.status !== "Healthy").length >= 2 ? 5 : 0;
    const enginePenalty = engineBalance.filter((x) => x.status === "Data Insufficient").length >= 3 ? 5 : 0;
    const timePenalty = timeCoverage.status === "Sparse" ? 5 : timeCoverage.status === "No Trade Dates" ? 10 : 0;
    const freshPenalty = freshness.status === "Old" ? 5 : 0;
    return Math.max(0, Math.min(100, Math.round(score - missingPenalty - duplicatePenalty - sessionPenalty - enginePenalty - timePenalty - freshPenalty)));
  }

  confidenceScore(parts) {
    const dataVolume = dimensionScore(parts.coverage.reduce((sum, x) => sum + x.rows, 0), [10, 100, 500]);
    const coverage = dimensionScore(parts.coverage.reduce((sum, x) => sum + x.earned, 0), [35, 60, 85]);
    const balance = dimensionScore(100 - parts.sessionBalance.filter((x) => x.status !== "Healthy").length * 18, [40, 65, 85]);
    const continuity = dimensionScore(parts.timeCoverage.observedDays, [3, 10, 30]);
    const consistency = dimensionScore(100 - parts.missing.reduce((sum, x) => sum + x.missingColumns.length, 0) * 12, [40, 65, 85]);
    const freshness = dimensionScore(parts.freshness.status === "Fresh" ? 100 : parts.freshness.status === "Acceptable" ? 75 : parts.freshness.status === "Old" ? 40 : 20, [40, 65, 85]);
    const values = { dataVolume, coverage, balance, continuity, consistency, freshness };
    const average = Object.values(values).reduce((sum, x) => sum + x.score, 0) / 6;
    return { ...values, overall: average >= 80 ? "High" : average >= 55 ? "Medium" : "Low", average: Math.round(average) };
  }

  warnings(parts) {
    const warnings = [];
    parts.coverage.filter((x) => x.status !== "Healthy").forEach((x) => warnings.push(`${x.label} data is insufficient.`));
    parts.missing.forEach((x) => {
      if (x.missingColumns.length) warnings.push(`${x.csv}: missing columns ${x.missingColumns.join(", ")}`);
      if (x.missingEngine) warnings.push(`${x.csv}: missing Engine values ${x.missingEngine}`);
      if (x.missingSession) warnings.push(`${x.csv}: missing Session values ${x.missingSession}`);
    });
    parts.duplicates.forEach((x) => {
      if (x.duplicateRows) warnings.push(`${x.csv}: duplicate rows ${x.duplicateRows}`);
      if (x.duplicateTimestamp) warnings.push(`${x.csv}: duplicate timestamps ${x.duplicateTimestamp}`);
    });
    parts.sessionBalance.filter((x) => x.status !== "Healthy").forEach((x) => warnings.push(`${x.name} session data is low.`));
    if (parts.freshness.status === "Old") warnings.push("CSV files are old. Load newer EA exports.");
    return warnings;
  }

  recommendations(parts) {
    const recs = [];
    parts.coverage.filter((x) => x.status !== "Healthy").forEach((x) => recs.push(`Collect more ${x.label} data.`));
    parts.sessionBalance.filter((x) => x.status !== "Healthy").forEach((x) => recs.push(`Collect more ${x.name} session records.`));
    parts.engineBalance.filter((x) => x.status === "Data Insufficient").slice(0, 5).forEach((x) => recs.push(`Collect more records for ${x.engine}.`));
    if (parts.freshness.status === "Old") recs.push("Load latest CSV exports before making Research decisions.");
    return recs.length ? recs : ["Data quality is sufficient for routine Research review."];
  }

  csvHealth(coverage, missing) {
    return coverage.map((x) => {
      const miss = missing.find((m) => m.type === x.label || m.csv.includes(x.key)) || {};
      const penalty = (miss.missingColumns?.length || 0) + (miss.missingEngine ? 1 : 0);
      const score = Math.max(1, Math.min(5, x.status === "Healthy" ? 5 - penalty : 2));
      return { csv: x.label, stars: "★".repeat(score) + "☆".repeat(5 - score), status: x.status, rows: x.rows };
    });
  }

  reliability(score, confidence, warnings) {
    const pct = Math.max(0, Math.min(100, Math.round(score * 0.65 + confidence.average * 0.35 - Math.min(15, warnings.length))));
    const reasons = [];
    if (score >= 80) reasons.push("CSV coverage is strong.");
    if (confidence.overall === "High") reasons.push("Overall confidence is high.");
    if (!warnings.length) reasons.push("No major data warnings.");
    if (warnings.length) reasons.push(`${warnings.length} data warnings should be reviewed.`);
    return { percent: pct, reasons };
  }

  file(key) {
    return this.engine.files?.get?.(key) || null;
  }
}

function coverageLabel(rows, key) {
  if (key === "structure") return rows ? "Good" : "Poor";
  if (rows >= 500) return "Excellent";
  if (rows >= 100) return "Good";
  if (rows >= 10) return "Fair";
  return "Poor";
}

function qualityLabel(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Poor";
}

function starsFromScore(score) {
  const n = Math.max(1, Math.min(5, Math.round(score / 20)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function emptyValue(v) {
  return v === undefined || v === null || String(v).trim() === "";
}

function duplicateCount(rows, keyFn) {
  const seen = new Set();
  let duplicates = 0;
  rows.forEach((row) => {
    const key = keyFn(row);
    if (!key || /^\|+$/.test(key)) return;
    if (seen.has(key)) duplicates++;
    seen.add(key);
  });
  return duplicates;
}

function balanceRows(names, values) {
  const total = values.length;
  return names.map((name) => {
    const count = values.filter((v) => String(v || "Other") === name).length;
    const share = total ? count / total * 100 : 0;
    return { name, count, share, status: count >= 20 || share >= 10 ? "Healthy" : "Low" };
  });
}

function dimensionScore(value, thresholds) {
  const score = value >= thresholds[2] ? 100 : value >= thresholds[1] ? 75 : value >= thresholds[0] ? 45 : 20;
  return { score, stars: starsFromScore(score), label: score >= 80 ? "High" : score >= 55 ? "Medium" : "Low" };
}
