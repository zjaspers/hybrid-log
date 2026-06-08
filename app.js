// Hybrid Log v2
// Replace these with your Supabase Project URL and anon public key.
const SUPABASE_URL = "https://nlsnycwlmoukxgojrkpe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sc255Y3dsbW91a3hnb2pya3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzQ5NjIsImV4cCI6MjA5NjUxMDk2Mn0.Q_5R8vel8YmExTY3ztk3toHBuW1xLKUjVFzKeBbIwE4";

const appConfigured = !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
const supabaseClient = appConfigured ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let currentUser = null;
let selectedPlan = "Workout A";

const templates = {
  "Workout A": [
    { name: "Back Squat", note: "Primary compound. 3x5, RPE 7–8.", sets: 3, target: "3x5" },
    { name: "Clean and Press", note: "Double progression. Baseline 85 lb until 5/5/5.", sets: 3, target: "3x5" },
    { name: "Romanian Deadlift", note: "Controlled hinge. Do not chase failure.", sets: 2, target: "2x8" },
    { name: "Incline Dumbbell Press", note: "Upper chest. Shoulder blades down/back.", sets: 2, target: "2x10" },
    { name: "Hammer Curl", note: "Arms. Clean reps.", sets: 2, target: "2x12" },
    { name: "Core", note: "Dead bugs, plank, or carries.", sets: 2, target: "2 sets" },
    { name: "Zone 2 Run", note: "Optional/post-lift: conversational pace.", sets: 1, target: "10–15 min", isRun: true }
  ],
  "Workout B": [
    { name: "Bench Press", note: "Primary compound. Warm up with face pulls + dead bugs.", sets: 3, target: "3x5" },
    { name: "Front Squat", note: "Secondary compound. Clean reps.", sets: 3, target: "3x5" },
    { name: "Pull-Ups", note: "Bodyweight or assisted. Track reps.", sets: 3, target: "3 sets" },
    { name: "Dips", note: "Add weight only when reps are owned.", sets: 2, target: "2 sets" },
    { name: "Curl Variation", note: "Arms. Moderate volume.", sets: 2, target: "2x12" },
    { name: "Triceps Variation", note: "Controlled reps. No junk volume.", sets: 2, target: "2x12" },
    { name: "Zone 2 Run", note: "Optional/post-lift: conversational pace.", sets: 1, target: "10–15 min", isRun: true }
  ],
  "Run": [
    { name: "Zone 2 Run", note: "Conversational pace. RPE 4–5. Track minutes, not speed.", sets: 1, target: "20–25 min", isRun: true }
  ],
  "Rest": [
    { name: "Walk / Mobility", note: "Family walk, easy mobility, no required training.", sets: 1, target: "Optional", isRun: true }
  ]
};

const els = {
  setupWarning: document.getElementById("setupWarning"),
  authView: document.getElementById("authView"),
  appView: document.getElementById("appView"),
  logoutBtn: document.getElementById("logoutBtn"),
  authMessage: document.getElementById("authMessage"),
  workoutMessage: document.getElementById("workoutMessage"),
  checkinMessage: document.getElementById("checkinMessage"),
  todayTitle: document.getElementById("todayTitle"),
  todayDetails: document.getElementById("todayDetails"),
  cycleLabel: document.getElementById("cycleLabel"),
  cycleType: document.getElementById("cycleType"),
  cycleRing: document.getElementById("cycleRing"),
  runTarget: document.getElementById("runTarget"),
  weekStrip: document.getElementById("weekStrip"),
  workoutBuilder: document.getElementById("workoutBuilder"),
  planHeading: document.getElementById("planHeading"),
  progressList: document.getElementById("progressList"),
  historyList: document.getElementById("historyList"),
};

function todayISO() { return new Date().toISOString().split("T")[0]; }
function getCycleWeek() {
  const startDate = new Date("2026-06-08T00:00:00");
  const today = new Date();
  const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  return (Math.floor(diffDays / 7) % 8) + 1;
}
function isDeloadWeek() { return getCycleWeek() === 4 || getCycleWeek() === 8; }
function showMessage(el, message, isError = false) { el.textContent = message; el.style.color = isError ? "#ef4444" : "#5b7cfa"; }
function setLoggedIn(loggedIn) {
  els.authView.classList.toggle("hidden", loggedIn);
  els.appView.classList.toggle("hidden", !loggedIn);
  els.logoutBtn.classList.toggle("hidden", !loggedIn);
}
function defaultPlanForToday() {
  const day = new Date().getDay();
  if (day === 1) return "Workout A";
  if (day === 2) return "Run";
  if (day === 3) return "Workout B";
  if (day === 4) return "Run";
  if (day === 5) return getCycleWeek() % 2 === 1 ? "Workout A" : "Workout B";
  return "Rest";
}
function detailsForPlan(plan) {
  if (plan === "Workout A") return "Squat/hinge + Clean & Press + short Zone 2.";
  if (plan === "Workout B") return "Bench + Front Squat + Pull-Ups/Dips + arms.";
  if (plan === "Run") return "20–25 minutes Zone 2. Conversational pace.";
  return "Recovery, walking, family time.";
}
function runTargetForPlan(plan) {
  if (plan === "Workout A" || plan === "Workout B") return "10–15";
  if (plan === "Run") return "20–25";
  return "Walk";
}
function renderWeekStrip() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  els.weekStrip.innerHTML = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const isToday = d.toDateString() === now.toDateString();
    return `<div class="day-pill ${isToday ? "today" : ""}"><span class="dow">${labels[i]}</span><span class="num">${d.getDate()}</span></div>`;
  }).join("");
}
function renderTop() {
  els.todayTitle.textContent = selectedPlan;
  els.todayDetails.textContent = detailsForPlan(selectedPlan);
  els.cycleLabel.textContent = `Week ${getCycleWeek()}`;
  els.cycleType.textContent = isDeloadWeek() ? "Deload" : "Build";
  els.cycleRing.setAttribute("data-label", getCycleWeek());
  els.runTarget.textContent = runTargetForPlan(selectedPlan);
  els.planHeading.textContent = selectedPlan;
}
function setSelectedPlan(plan) {
  selectedPlan = plan;
  document.querySelectorAll(".plan-pill").forEach(btn => btn.classList.toggle("active", btn.dataset.plan === plan));
  renderTop();
  renderWorkoutBuilder();
}
function setRowHtml(exerciseIndex, setIndex, isRun = false) {
  if (isRun) {
    return `<div class="set-row" data-set-index="${setIndex}">
      <span class="set-num">${setIndex + 1}</span>
      <input class="set-weight" type="number" inputmode="decimal" placeholder="Target" />
      <input class="set-reps" type="number" inputmode="numeric" placeholder="Min" />
      <input class="set-rpe" type="number" inputmode="decimal" step="0.5" placeholder="RPE" />
      <button class="remove-set" type="button" aria-label="Remove set">×</button>
    </div>`;
  }
  return `<div class="set-row" data-set-index="${setIndex}">
    <span class="set-num">${setIndex + 1}</span>
    <input class="set-weight" type="number" inputmode="decimal" step="2.5" placeholder="lb" />
    <input class="set-reps" type="number" inputmode="numeric" placeholder="reps" />
    <input class="set-rpe" type="number" inputmode="decimal" step="0.5" placeholder="RPE" />
    <button class="remove-set" type="button" aria-label="Remove set">×</button>
  </div>`;
}
function renderWorkoutBuilder() {
  const plan = templates[selectedPlan] || templates["Workout A"];
  els.workoutBuilder.innerHTML = plan.map((ex, i) => `
    <article class="exercise-card" data-exercise-index="${i}" data-exercise-name="${ex.name}" data-is-run="${ex.isRun ? "true" : "false"}">
      <div class="exercise-head">
        <div>
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-note">${ex.note}</div>
        </div>
        <span class="badge">${ex.target}</span>
      </div>
      <div class="sets-container">
        ${Array.from({ length: ex.sets }).map((_, setIndex) => setRowHtml(i, setIndex, ex.isRun)).join("")}
      </div>
      <button class="add-set" type="button">+ Add set</button>
    </article>
  `).join("");
}
function progressionDecision(exerciseName, weight, repsArray) {
  const lower = exerciseName.toLowerCase();
  const targetReps = 5;
  const hitAll = repsArray.length >= 3 && repsArray.every((r) => r >= targetReps);
  const lowerBody = lower.includes("squat") || lower.includes("deadlift");
  const cleanPress = lower.includes("clean") && lower.includes("press");
  if (isDeloadWeek()) return { nextWeight: Math.round(weight * 0.8), decision: "Deload: reduce to about 80% and use 2 working sets.", hitAll };
  if (cleanPress) {
    return hitAll
      ? { nextWeight: weight + 5, decision: "Clean & Press owned. Add 5 lb next exposure.", hitAll }
      : { nextWeight: weight, decision: "Clean & Press double progression: repeat this weight.", hitAll };
  }
  if (hitAll) return { nextWeight: weight + (lowerBody ? 5 : 5), decision: `All reps hit. Add ${lowerBody ? "5" : "2.5–5"} lb next exposure.`, hitAll };
  return { nextWeight: weight, decision: "Repeat weight until target reps are owned.", hitAll };
}
async function signUp() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  if (!email || !password) return showMessage(els.authMessage, "Enter email and password.", true);
  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) showMessage(els.authMessage, error.message, true);
  else showMessage(els.authMessage, "Account created. Log in.");
}
async function signIn() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  if (!email || !password) return showMessage(els.authMessage, "Enter email and password.", true);
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return showMessage(els.authMessage, error.message, true);
  currentUser = data.user;
  setLoggedIn(true);
  bootApp();
}
async function signOut() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  setLoggedIn(false);
}
function collectExerciseRows() {
  const exercises = [];
  document.querySelectorAll(".exercise-card").forEach(card => {
    const name = card.dataset.exerciseName;
    const isRun = card.dataset.isRun === "true";
    const rows = [];
    card.querySelectorAll(".set-row").forEach((row, index) => {
      const weight = Number(row.querySelector(".set-weight").value || 0);
      const reps = Number(row.querySelector(".set-reps").value || 0);
      const rpe = Number(row.querySelector(".set-rpe").value || 0);
      if (weight > 0 || reps > 0 || rpe > 0) rows.push({ set_number: index + 1, weight, reps, rpe });
    });
    if (rows.length) exercises.push({ name, isRun, rows });
  });
  return exercises;
}
async function saveWorkout() {
  if (!currentUser) return;
  const exercises = collectExerciseRows();
  const notes = document.getElementById("workoutNotes").value;
  if (!exercises.length && !notes.trim()) return showMessage(els.workoutMessage, "Enter at least one set, run minutes, or notes.", true);
  const { data: workout, error: workoutError } = await supabaseClient.from("workout_logs").insert({
    user_id: currentUser.id,
    date: todayISO(),
    workout_type: selectedPlan,
    cycle_week: getCycleWeek(),
    is_deload: isDeloadWeek(),
    notes,
  }).select().single();
  if (workoutError) return showMessage(els.workoutMessage, workoutError.message, true);

  const setRows = [];
  const runRows = [];
  exercises.forEach(ex => {
    if (ex.isRun) {
      const first = ex.rows[0];
      runRows.push({
        user_id: currentUser.id,
        date: todayISO(),
        run_type: ex.name,
        target_minutes: first.weight || 0,
        completed_minutes: first.reps || 0,
        rpe: first.rpe || 0,
        notes: `${selectedPlan} · ${notes || ""}`
      });
    } else {
      ex.rows.forEach(row => setRows.push({
        workout_log_id: workout.id,
        exercise_name: ex.name,
        weight: row.weight,
        reps: row.reps,
        set_number: row.set_number,
        rpe: row.rpe,
        completed: true,
      }));
    }
  });
  if (setRows.length) {
    const { error } = await supabaseClient.from("exercise_sets").insert(setRows);
    if (error) return showMessage(els.workoutMessage, error.message, true);
  }
  if (runRows.length) {
    const { error } = await supabaseClient.from("run_logs").insert(runRows);
    if (error) return showMessage(els.workoutMessage, error.message, true);
  }

  for (const ex of exercises.filter(e => !e.isRun)) {
    const usableRows = ex.rows.filter(r => r.weight > 0 && r.reps > 0);
    if (!usableRows.length) continue;
    const weights = usableRows.map(r => r.weight);
    const weight = weights[weights.length - 1];
    const repsArray = usableRows.map(r => r.reps);
    const { nextWeight, decision, hitAll } = progressionDecision(ex.name, weight, repsArray);
    const existing = await supabaseClient.from("lift_baselines").select("miss_count").eq("user_id", currentUser.id).eq("exercise_name", ex.name).maybeSingle();
    let missCount = hitAll ? 0 : ((existing.data?.miss_count || 0) + 1);
    let finalNextWeight = nextWeight;
    let finalDecision = decision;
    if (!hitAll && missCount >= 2 && !isDeloadWeek()) {
      finalNextWeight = Math.round(weight * 0.9);
      finalDecision = "Missed twice: reduce load by about 10% and rebuild.";
      missCount = 0;
    }
    await supabaseClient.from("lift_baselines").upsert({
      user_id: currentUser.id,
      exercise_name: ex.name,
      current_working_weight: finalNextWeight,
      target_sets: 3,
      target_reps: 5,
      last_result: `${weight} x ${repsArray.join(",")}`,
      miss_count: missCount,
      next_decision: finalDecision,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,exercise_name" });
  }
  showMessage(els.workoutMessage, "Saved. Your workout memory updated.");
  await loadProgress();
  await loadHistory();
}
async function saveCheckin() {
  if (!currentUser) return;
  const { error } = await supabaseClient.from("weekly_checkins").insert({
    user_id: currentUser.id,
    week_start: todayISO(),
    body_weight: Number(document.getElementById("bodyWeight").value || 0),
    waist: Number(document.getElementById("waist").value || 0),
    lifts_completed: Number(document.getElementById("liftsCompleted").value || 0),
    runs_completed: Number(document.getElementById("runsCompleted").value || 0),
    protein_rating: document.getElementById("proteinRating").value,
    recovery_rating: document.getElementById("recoveryRating").value,
    notes: document.getElementById("checkinNotes").value,
  });
  if (error) return showMessage(els.checkinMessage, error.message, true);
  showMessage(els.checkinMessage, "Check-in saved.");
}
async function loadProgress() {
  const { data, error } = await supabaseClient.from("lift_baselines").select("*").eq("user_id", currentUser.id).order("updated_at", { ascending: false });
  if (error) { els.progressList.innerHTML = `<p class="muted">${error.message}</p>`; return; }
  if (!data.length) { els.progressList.innerHTML = `<p class="muted">No lift baselines yet. Log Clean and Press 85 with reps like 5,5,4 to start.</p>`; return; }
  els.progressList.innerHTML = data.map(row => `
    <article class="progress-item">
      <strong>${row.exercise_name}</strong>
      <div>Next: ${row.current_working_weight || 0} lb</div>
      <div class="muted small">Last: ${row.last_result || "—"} · Misses: ${row.miss_count || 0}</div>
      <div class="progress-decision">${row.next_decision || "Repeat until owned."}</div>
    </article>
  `).join("");
}
async function loadHistory() {
  const [workouts, runs] = await Promise.all([
    supabaseClient.from("workout_logs").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(8),
    supabaseClient.from("run_logs").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(5)
  ]);
  if (workouts.error || runs.error) { els.historyList.innerHTML = `<p class="muted">${workouts.error?.message || runs.error?.message}</p>`; return; }
  const workoutHtml = workouts.data.map(row => `
    <article class="history-item"><strong>${row.date} · ${row.workout_type}</strong><span class="muted small">Week ${row.cycle_week} ${row.is_deload ? "· Deload" : "· Build"}</span><p class="muted">${row.notes || ""}</p></article>
  `).join("");
  const runHtml = runs.data.map(row => `
    <article class="history-item"><strong>${row.date} · ${row.run_type}</strong><span class="muted small">${row.completed_minutes || 0}/${row.target_minutes || 0} min · RPE ${row.rpe || "—"}</span><p class="muted">${row.notes || ""}</p></article>
  `).join("");
  els.historyList.innerHTML = workoutHtml + runHtml || `<p class="muted">No history yet.</p>`;
}
function setupEvents() {
  document.getElementById("signupBtn").addEventListener("click", signUp);
  document.getElementById("loginBtn").addEventListener("click", signIn);
  document.getElementById("logoutBtn").addEventListener("click", signOut);
  document.getElementById("saveWorkoutBtn").addEventListener("click", saveWorkout);
  document.getElementById("saveCheckinBtn").addEventListener("click", saveCheckin);
  document.querySelectorAll(".plan-pill").forEach(btn => btn.addEventListener("click", () => setSelectedPlan(btn.dataset.plan)));
  document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.panel).classList.remove("hidden");
  }));
  els.workoutBuilder.addEventListener("click", e => {
    if (e.target.classList.contains("add-set")) {
      const card = e.target.closest(".exercise-card");
      const container = card.querySelector(".sets-container");
      const isRun = card.dataset.isRun === "true";
      container.insertAdjacentHTML("beforeend", setRowHtml(card.dataset.exerciseIndex, container.children.length, isRun));
    }
    if (e.target.classList.contains("remove-set")) {
      const row = e.target.closest(".set-row");
      const container = row.parentElement;
      if (container.children.length > 1) row.remove();
      [...container.children].forEach((child, index) => child.querySelector(".set-num").textContent = index + 1);
    }
  });
}
function bootApp() {
  selectedPlan = defaultPlanForToday();
  renderWeekStrip();
  setSelectedPlan(selectedPlan);
  loadProgress();
  loadHistory();
}
async function init() {
  setupEvents();
  if (!appConfigured) { els.setupWarning.classList.remove("hidden"); return; }
  const { data } = await supabaseClient.auth.getUser();
  if (data.user) { currentUser = data.user; setLoggedIn(true); bootApp(); }
  else { setLoggedIn(false); renderWeekStrip(); setSelectedPlan(defaultPlanForToday()); }
}
init();
