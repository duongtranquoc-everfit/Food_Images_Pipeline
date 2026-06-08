# Exercise Deduplication — Team Workflow

## Overview

This pipeline deduplicates ~264K exercise rows into a clean, unique title set. It runs in **two phases**: automated dedup (passes 1–4), then team review + merge.

## File Flow

```
Input CSV (264K rows)
        │
        ▼
  npm run dedup:full          ← Automated passes 1-4
        │
        ├── output/cleaned.csv              (155K rows — passes 1+2 applied)
        ├── output/dedup-report.txt
        ├── output/review-symbol-variants.csv   ← TEAM REVIEWS THIS
        └── output/review-fuzzy-matches.csv     ← TEAM REVIEWS THIS
                    │
                    ▼
            Team fills in decisions
                    │
                    ▼
          npm run merge           ← Applies decisions
                    │
                    ├── output/final.csv            (final clean dataset)
                    └── output/merge-report.txt
                              │
                              ▼
                    npm run verify:final   ← Validates result
```

## Step-by-Step

### Phase 1: Generate Review Files (Already Done)

```bash
npm run dedup:full
```

This runs 4 passes:
1. **Exact dedup** — removes rows with identical titles (keeps best metadata)
2. **Case-insensitive dedup** — merges "Push Up" / "push up" / "PUSH UP"
3. **Symbol normalization** — detects groups like "Pull-Up" vs "Pull Up" vs "Pull(Up)"
4. **Fuzzy matching** — finds similar titles (threshold ≥ 0.85)

Passes 1+2 are applied automatically → `cleaned.csv`.
Passes 3+4 produce review files for team decisions.

### Phase 2: Team Review

Open the two review CSV files and fill in the **decision columns**.

#### `review-symbol-variants.csv`

| Column | Description |
|--------|-------------|
| `group_id` | Groups of variant titles |
| `variant_title` | Each spelling variant |
| `count` | How many times this variant appears |
| `suggested_canonical` | Auto-suggested best title |
| **`decision`** | Fill in: `merge` or `skip` |
| **`canonical_override`** | (Optional) override the suggested canonical title |

**How to review:**
- Each `group_id` groups titles that are the same after removing symbols (`-`, `–`, `|`, `•`, `(`, `)`)
- You only need to fill `decision` on **one row per group** — the tool reads the first non-empty decision
- Set `decision=merge` to unify all variants into the canonical title
- Set `decision=skip` to keep them as separate exercises
- Use `canonical_override` if you want a different canonical title than the suggestion

**Example:**

| group_id | variant_title | count | suggested_canonical | decision | canonical_override |
|----------|--------------|-------|--------------------|---------|--------------------|
| 42 | Pull-Up | 150 | Pull-Up | merge | |
| 42 | Pull Up | 80 | Pull-Up | | |
| 42 | Pull (Up) | 5 | Pull-Up | | |

→ All variants become "Pull-Up"

#### `review-fuzzy-matches.csv`

| Column | Description |
|--------|-------------|
| `title_a` | First title in the pair |
| `title_b` | Second title in the pair |
| `similarity_score` | How similar (0.85–1.00) |
| **`decision`** | Fill in: `merge` or `skip` |
| **`keep`** | Which title to keep: `a` or `b` |

**How to review:**
- Each row is a pair of similar titles
- Set `decision=merge` and `keep=a` to keep title_a (rename title_b → title_a)
- Set `decision=merge` and `keep=b` to keep title_b (rename title_a → title_b)
- If `keep` is empty, defaults to keeping `title_a`
- Set `decision=skip` if they are genuinely different exercises

**Example:**

| title_a | title_b | similarity_score | decision | keep |
|---------|---------|-----------------|----------|------|
| Dumbbell Curl | DB Curl | 0.87 | merge | a |
| Barbell Row | Barbell Rows | 0.92 | merge | a |
| Plank Hold | Plank Walk | 0.88 | skip | |

### Phase 3: Merge

Preview changes first:

```bash
npm run merge:dry
```

This shows what would be renamed without writing any files.

When ready, apply:

```bash
npm run merge
```

This produces:
- `output/final.csv` — the fully deduplicated dataset
- `output/merge-report.txt` — log of all renames applied

### Phase 4: Verify

```bash
npm run verify:final
```

Checks:
- All titles unique (exact + case-insensitive)
- Symbol merges applied (canonicals present, variants removed)
- Fuzzy merges applied (loser titles removed)
- All 15 columns preserved
- Known exercises still present
- Merge report consistent with final.csv

## NPM Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dedup` | Pass 1+2+3 only (skip fuzzy) | Quick run |
| `npm run dedup:full` | All 4 passes | Full pipeline + review files |
| `npm run verify` | Verify cleaned.csv | Check automated dedup output |
| `npm run merge:dry` | Preview merge | See renames without writing |
| `npm run merge` | Apply merge | Produce final.csv |
| `npm run verify:final` | Verify final.csv | Check merged output |

## Tips

- You can review in batches — fill in decisions for some groups, run `merge`, then continue reviewing
- The fuzzy file can be large (85K+ pairs). Sort by `similarity_score` descending and start from the top — high-score pairs are more likely true duplicates
- If unsure, set `decision=skip` — it's better to keep a false negative than merge different exercises
- After merge, run `verify:final` to catch any issues before using the data
