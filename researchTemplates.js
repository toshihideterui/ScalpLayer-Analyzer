const RESEARCH_CATEGORIES = [
  "Engine Research",
  "Condition Research",
  "Session Research",
  "NearMiss Research",
  "Single Bottleneck Research",
  "Holding Research",
  "Spread Research",
  "Data Quality Research",
  "Combination Research",
  "Other"
];

const RESEARCH_STATUSES = [
  "Backlog",
  "Hypothesis",
  "Ready",
  "Collecting Data",
  "Testing",
  "Review",
  "Completed",
  "On Hold",
  "Rejected",
  "Adopted",
  "Revalidation"
];

const RESEARCH_DECISIONS = [
  "Undecided",
  "Adopt",
  "Reject",
  "Hold",
  "Need More Data",
  "Revalidate"
];

const RESEARCH_PRIORITIES = ["Critical", "High", "Medium", "Low"];

const RESEARCH_TEMPLATES = {
  "Engine Bottleneck": {
    title: "Engine Bottleneck Research",
    category: "Engine Research",
    hypothesis: "The target Engine has enough TimeOK records but FullSignal remains low. A specific TopNG condition may be the bottleneck.",
    requiredData: "EngineActivity_v2.csv, NearMissHistory.csv, SessionResearch.csv",
    validationPlan: "Compare NearMiss per 1,000 Checks, FullSignal Rate, and Entry Conversion Rate for the target Engine over at least 14 days.",
    successCriteria: "Bottleneck is reproducible across multiple days and sessions.",
    failureCriteria: "The result is explained only by reduced CheckCount or insufficient data.",
    tags: ["engine", "bottleneck"]
  },
  "Single Condition Bottleneck": {
    title: "Single Condition Bottleneck Research",
    category: "Single Bottleneck Research",
    hypothesis: "A single NG condition frequently prevents entry in NearMiss records.",
    requiredData: "NearMissHistory.csv with NGReasons and NGCount",
    validationPlan: "Track single NG ratio by Engine and Session. Compare with winning and losing trades if available.",
    successCriteria: "Single NG appears repeatedly with enough samples and clear session concentration.",
    failureCriteria: "Single NG disappears after more data collection or is not reproducible.",
    tags: ["single-ng", "nearmiss"]
  },
  "Session Difference": {
    title: "Session Difference Research",
    category: "Session Research",
    hypothesis: "A session has a different bottleneck profile from other sessions.",
    requiredData: "SessionResearch.csv, NearMissHistory.csv, TradeHistory.csv",
    validationPlan: "Compare TopNG, NearMiss, WinRate, and average pips by Tokyo, London, NY, and Other.",
    successCriteria: "Session difference remains after normalizing by Checks and TimeOK.",
    failureCriteria: "Difference is caused only by lower data volume.",
    tags: ["session"]
  },
  "NearMiss Combination": {
    title: "NearMiss Combination Research",
    category: "Combination Research",
    hypothesis: "A repeated combination of NG conditions explains most NearMiss records.",
    requiredData: "NearMissHistory.csv",
    validationPlan: "Rank NG combination patterns and compare by Engine and Session.",
    successCriteria: "A combination pattern appears with stable frequency across multiple days.",
    failureCriteria: "Combination pattern is sparse or random.",
    tags: ["combo", "nearmiss"]
  },
  "Holding Time": {
    title: "Holding Time Research",
    category: "Holding Research",
    hypothesis: "Holding time distribution differs between winning and losing trades.",
    requiredData: "TradeHistory.csv with HoldingMinutes",
    validationPlan: "Compare win rate and average pips by holding bucket.",
    successCriteria: "Specific holding bucket shows stable edge or risk.",
    failureCriteria: "Sample count is insufficient.",
    tags: ["holding"]
  },
  "Spread Environment": {
    title: "Spread Environment Research",
    category: "Spread Research",
    hypothesis: "Spread environment affects win rate or NearMiss frequency.",
    requiredData: "TradeHistory.csv, NearMissHistory.csv with Spread",
    validationPlan: "Compare trades and NearMiss by spread bucket.",
    successCriteria: "Spread bucket effect remains across sessions.",
    failureCriteria: "No stable relationship or insufficient spread data.",
    tags: ["spread"]
  },
  "Data Quality": {
    title: "Data Quality Research",
    category: "Data Quality Research",
    hypothesis: "Missing or invalid CSV columns may reduce analysis reliability.",
    requiredData: "CSV Manager validation warnings",
    validationPlan: "Fix missing columns and compare Analyzer output before and after.",
    successCriteria: "Validation warnings are resolved.",
    failureCriteria: "Warnings are not related to current Research target.",
    tags: ["data-quality"]
  },
  "Blank": {
    title: "",
    category: "Other",
    hypothesis: "",
    requiredData: "",
    validationPlan: "",
    successCriteria: "",
    failureCriteria: "",
    tags: []
  }
};
