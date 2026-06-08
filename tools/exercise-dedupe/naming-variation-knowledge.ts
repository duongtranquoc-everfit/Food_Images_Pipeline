/**
 * Reference for Gemini: gym exercise title variants (abbreviations, morphology, word order).
 * Appended to system instruction — extend here when you find new systematic naming patterns.
 */

/** Dense glossary: token → meaning (English gym naming). Duplicates merged in comments where ambiguous. */
export const EQUIPMENT_AND_TAG_ABBREVS: Record<string, string> = {
  DB: "dumbbell(s)",
  DDS: "dual dumbbells / two dumbbells",
  BB: "barbell",
  KB: "kettlebell",
  MB: "medicine ball",
  SB: "stability ball / Swiss ball",
  TB: "trap bar / hex bar",
  EZ: "EZ bar / E-Z curl bar",
  EB: "EZ bar (same family as EZ)",
  SM: "Smith machine",
  CB: "cable",
  CBL: "cable",
  BW: "bodyweight",
  BWT: "bodyweight",
  BOSU: "BOSU ball",
  TRX: "TRX / suspension",
  RIP: "RIP trainer (TRX family)",
  VBAR: "V-bar attachment",
  DHANDLE: "D-handle",
  ROPE: "rope attachment",
  STR: "straight bar attachment",
  LAT: "lat (pulldown / pull context)",
  PD: "pulldown",
  OHP: "overhead press",
  OH: "overhead",
  BP: "bench press",
  IPP: "incline bench press (context)",
  FP: "floor press",
  DL: "deadlift",
  RDL: "Romanian deadlift",
  SLDL: "stiff-leg deadlift",
  GM: "good morning",
  SQ: "squat",
  FS: "front squat",
  HS: "hack squat",
  LG: "leg press",
  LP: "leg press",
  LE: "leg extension",
  LC: "leg curl",
  GHR: "glute-ham raise",
  HLR: "hanging leg raise",
  PU: "pull-up OR push-up (infer from context: bar/hanging vs floor)",
  CU: "curl",
  ROW: "row",
  FLY: "fly / flye",
  SKULL: "skull crusher / lying triceps extension",
  JM: "JM press",
  ARN: "Arnold press",
  CG: "close grip",
  WG: "wide grip",
  NG: "neutral grip",
  SG: "supinated grip / underhand",
  PSG: "pronated grip / overhand",
  SA: "single arm",
  SL: "single leg",
  ALT: "alternating",
  BILAT: "bilateral",
  ISO: "isometric",
  ECC: "eccentric",
  CON: "concentric",
  TUT: "time under tension (descriptor)",
  ROM: "range of motion (descriptor)",
  AMRAP: "as many reps as possible (descriptor)",
  EMOM: "every minute on minute (descriptor)",
  RIR: "reps in reserve (descriptor)",
  TEMPO: "tempo prescription (e.g. 3-0-1)",
  ME: "max effort (descriptor)",
  DE: "dynamic effort (descriptor)",
};

/**
 * Long appendix for the duplicate-name judge. Intentionally long: few-shot style patterns + abbrev map.
 */
export const NAMING_VARIATION_SYSTEM_APPEND = `
## A. Same exercise (same_exercise = true) when ONLY these kinds of differences appear

### Morphology & grammar
- Plural/singular on the exercise noun: Burpee/Burpees, Lunge/Lunges, Squat/Squats, Rep/Reps (when it names the movement, not "5 reps").
- Gerund vs imperative: "Kneeling" vs "Kneel"; "Standing" vs "Stand" (same movement).
- Participle swap (coaching synonyms): "Half Kneeling" vs "Half Knelt" (same half-kneeling line).
- Articles & filler words: "The Bench Press" vs "Bench Press"; "A Push-Up" vs "Push Up".

### Spelling, punctuation, casing
- Hyphen vs space vs one word: push-up / push up / pushup; chin-up / chin up.
- T-Bar / T bar / T-bar row naming variants.
- ALL CAPS vs Title Case vs lowercase only; extra spaces; decorative stars/emoji at end.

### Equipment: abbreviation ↔ full word (align if the rest of the movement matches)
Treat as equivalent when clearly the same tool:
- DB ↔ Dumbbell ↔ DBs; BB ↔ Barbell; KB ↔ Kettlebell; MB ↔ Med ball ↔ Medicine ball.
- EZ ↔ E-Z ↔ EZ bar ↔ Curl bar (same bar family); TB ↔ Trap bar ↔ Hex bar.
- BW ↔ Bodyweight; SM ↔ Smith machine; CB/Cable ↔ Cable (machine).
- TRX ↔ Suspension (same TRX-style); V-bar ↔ V bar attachment.

### Word order (very common in libraries)
- "DB Sumo Squat" vs "Sumo Squat with Dumbbell" vs "Dumbbell Sumo Squat" vs "Sumo Squat — DB".
- "BB Row" vs "Barbell Row" vs "Bent Over Barbell Row" ONLY if both describe the same row variant (if stance differs, may be false).

### Redundant words
- "Lat Pulldown" vs "Lat Pull Down"; "Tricep" vs "Triceps"; "Bicep" vs "Biceps" in titles.
- "Exercise" / "Movement" suffix: "Squat Exercise" vs "Squat" (same squat).

## B. Different exercises (same_exercise = false)

- Different equipment: DB Row vs BB Row; Cable Fly vs DB Fly; KB Swing vs DB Swing (different implement).
- Different pattern: Pull-up vs Lat pulldown; Back squat vs Front squat; Flat bench vs Incline bench when angle is explicit.
- Unilateral vs bilateral when titles encode it: "Single Arm Row" vs "Barbell Row" (two-arm).
- Grip/stance that changes the lift family when explicit: Sumo deadlift vs Conventional deadlift; Close grip bench vs Wide grip bench (often tracked as different exercises).

## C. Abbreviation reference (reasoning aid — not exhaustive)

Strength & lifts: DB, BB, KB, EZ, TB, BW, SM, MB, SB, BOSU, TRX.
Grips: CG close, WG wide, NG neutral, SG supinated/underhand, PSG pronated/overhand, CG vs WG bench variants often differ — check titles.
Limbs: SA single arm, SL single leg, ALT alternating, BILAT bilateral.
Classic lift shorthands: BP bench press, OHP overhead press, OH overhead, DL deadlift, RDL Romanian, SLDL stiff-leg, GM good morning, SQ squat, FS front squat, HS hack squat, LP/LG leg press, LE leg extension, LC leg curl, GHR glute-ham, HLR hanging leg raise, PD pulldown, ROW row, FLY fly/flye, SKULL skull crusher, ARN Arnold, JM JM press.
Context-heavy: PU may mean pull-up OR push-up — use other words in the title (bar, floor, hanging).

## D. Example pairs → same exercise (true)
- DB Burpee | DB Burpees
- DB Burpee | Dumbbell Burpee
- db burpee | Dumbbell Burpees
- DB sumo squat | Sumo Squat with Dumbbell
- Dumbbell Sumo Squat | Sumo squat DB
- BB bench | Barbell Bench Press
- KB swing | Kettlebell Swing
- KB goblet squat | Goblet Squat Kettlebell
- RDL | Romanian Deadlift
- BB RDL | Barbell Romanian Deadlift
- Lat PD | Lat Pulldown | Lat pull down
- Pull Up | Pull-up | Pullup (bodyweight vertical pull — not cable pulldown)
- Push-up | Push up | Press-up
- Chin-up | Chin up | Underhand pull-up (same chin-up family)
- Hip thrust | Barbell hip thrust — ONLY if both imply loaded barbell hip thrust; bodyweight hip thrust vs BB hip thrust → false
- Half kneeling single arm lat pulldown | Half knelt single arm lat pulldown
- Cable crossover | Cable Cross-over | Cable cross over
- TRX row | Suspension row (same TRX-style row if no conflicting detail)

## E. Example pairs → different exercise (false)
- DB Row | BB Row
- Lat Pulldown | Pull-Up
- Incline DB Press | Flat DB Press
- Romanian Deadlift | Conventional Deadlift
- Front Squat | Back Squat
- Leg Press | Hack Squat (different machines/patterns)

## F. Confidence guidance
- If only abbreviation vs full word + word-order swap with same movement words → high confidence true.
- If equipment or major pattern differs → false, even if names look similar.
- Borderline library distinctions (RDL vs SLDL): if unsure, same_exercise = false with lower confidence and short reason.
`.trim();
