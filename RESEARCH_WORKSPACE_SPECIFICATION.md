# Research Workspace Specification v5.1

## Purpose

Research Workspace turns ScalpLayer Research Lab into a place to continue research work every day.

It collects:

- Today's Focus
- Research Queue
- Workspace Memo
- Bookmarks
- Pins
- Recent Activity

This is a research-only feature. It does not change EA files, CSV files, or trading conditions.

---

## Storage

Workspace data is stored in browser `localStorage`.

Storage key:

```text
scalplayerResearchWorkspace
```

Stored items:

- `bookmarks`
- `pins`
- `memo`
- `recentActivity`

Workspace Memo is not included in Analyzer Snapshot.

---

## Today's Focus

Today's Focus Top3 is generated from existing research sources:

- AI Research Brain
- Research Manager
- Knowledge Graph
- Engine DNA
- Cross CSV
- Research Timeline

The goal is to show what should be reviewed first today.

---

## Research Queue

Research Queue is sorted by:

1. Priority
2. Research Score
3. Confidence

Displayed fields:

- Priority
- Research Score
- Confidence
- Reason
- Expected Impact

The queue is a research list only. It does not modify trading rules.

---

## Bookmark

Bookmark stores items for later review.

Bookmarks are Workspace-only and do not create Research Manager items.

Supported item types:

- Research Candidate
- Engine
- Condition
- Research
- Knowledge Graph Node
- Workspace item

---

## Pin

Pin fixes important items in the Workspace view.

Supported item types:

- Engine
- Condition
- Research
- Knowledge Graph Node
- Workspace item

---

## Recent Activity

Recent Activity stores the latest actions.

Tracked actions:

- CSV Load
- Research Added
- Decision
- Evidence
- Import
- Export
- Snapshot
- Bookmark Added / Removed
- Pin Added / Removed
- Memo Saved

Only the latest 100 records are stored. The UI displays the latest 20.

---

## Dashboard

Dashboard shows Workspace Summary:

- Today's Focus
- Queue Count
- Bookmark Count
- Pin Count
- Recent Activity Count

---

## AI Research Brain

AI Research Brain receives Workspace Summary:

```text
Today's Focus:
Core Rule E

Reason:
Highest Research Score

Next:
Collect more NearMiss
```

---

## Markdown Output

`ResearchReport.md` includes:

- Workspace Summary
- Today's Focus
- Bookmark
- Pinned
- Recent Activity

---

## Analyzer Snapshot JSON

Analyzer Snapshot includes:

- `workspace`
- `workspaceSummary`
- `bookmark`
- `pin`
- `recentActivity`

It does not include Workspace Memo.

---

## Safety Boundary

Research Workspace never:

- edits EA files
- edits CSV files
- rewrites CSV
- changes trading conditions
- performs auto optimization
- calls AI APIs
- generates fake data
- guarantees profit
