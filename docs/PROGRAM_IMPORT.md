# Importing a Program

Anyone with their own login can build a program by hand (Program tab → **Edit My Program**), or import one written elsewhere (Program tab → **Import Program**) by pasting JSON in this shape:

```json
{
  "program_name": "Sarah's Program",
  "week_template": ["upper", "cardio", "lower", "cardio", "upper", "rest", "rest"],
  "workouts": [
    {
      "key": "upper",
      "display_name": "Upper Body",
      "category": "lift",
      "substitutions": {
        "hotel_gym": { "Bench Press": "DB Bench Press" },
        "dumbbells": { "Bench Press": "DB Floor Press" },
        "bodyweight": { "Bench Press": "Push-Up" }
      },
      "exercises": [
        {
          "name": "Bench Press",
          "note": "RPE 7-8, controlled tempo",
          "target": "3x8",
          "sets": 3,
          "reps": 8,
          "increment": 5,
          "is_run": false
        }
      ]
    },
    {
      "key": "cardio",
      "display_name": "Cardio",
      "category": "run",
      "exercises": [
        { "name": "Easy Run", "note": "Conversational pace", "target": "25 min", "sets": 1, "reps": 25, "is_run": true }
      ]
    },
    {
      "key": "rest",
      "display_name": "Rest Day",
      "category": "recovery",
      "exercises": [
        { "name": "Optional walk / mobility", "target": "Optional", "sets": 1, "reps": 0, "is_run": true }
      ]
    }
  ]
}
```

### Field notes

- **`week_template`**: exactly 7 entries, Monday first. Each entry must be a `key` that appears in `workouts`.
- **`workouts[].key`**: a short lowercase id, unique within the program. Used internally — never shown to the user.
- **`workouts[].category`**: `lift`, `run`, or `recovery`. This drives weekly rebalancing (how many lift days vs. run days get restored after a missed session), so it needs to be accurate.
- **`workouts[].substitutions`**: optional. Per equipment mode (`hotel_gym`, `dumbbells`, `bodyweight`), a map of original exercise name → substitute name. Leave off entirely if not needed — the app just uses the original name.
- **`exercises[].reps`**: the *target* — rep count for lifts, minutes for anything with `is_run: true`.
- **`exercises[].increment`**: how much weight to add on a hit (in lb). If omitted, the app assumes 2.5 for rep targets ≥10 and 5 otherwise.
- **`exercises[].is_run`**: true for anything tracked by time/minutes rather than weight/reps (cardio, mobility, walks).

Progression works the same for every exercise, no matter where the program came from: hit every set at the rep target → add `increment` next time; miss once → repeat the same weight; miss twice in a row → drop 10% to rebuild.

---

## Turning a ChatGPT program or a screenshot into this format

The easiest path is outside the app: paste the program (or the screenshot itself) to Claude with a prompt like the one below, then paste the JSON it returns into **Program → Import Program**.

> I have a training program I want to load into an app called Hybrid OS. Convert it into this exact JSON schema — [paste the schema block above, or attach this PROGRAM_IMPORT.md file] — and give me back only the JSON, nothing else. Here's the program: [paste text, or attach the screenshot]. If a week's schedule isn't specified, ask me how many days a week and which days before guessing.

A few things worth telling Claude explicitly if the source program doesn't spell them out: how many days a week, what equipment is available (affects whether `substitutions` are worth writing), and roughly what "success" looks like for accessory movements (affects `increment`). If a screenshot is a photo of a whiteboard or handwritten notes rather than a clean app export, expect to double check the exercise names and numbers it extracted before importing.
