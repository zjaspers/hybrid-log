// Hybrid Log v3
// Paste your Supabase Project URL and anon public key here.
const SUPABASE_URL = "https://nlsnycwlmoukxgojrkpe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sc255Y3dsbW91a3hnb2pya3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzQ5NjIsImV4cCI6MjA5NjUxMDk2Mn0.Q_5R8vel8YmExTY3ztk3toHBuW1xLKUjVFzKeBbIwE4";

const appConfigured = !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
const supabaseClient = appConfigured ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let currentUser = null;
let selectedPlan = "Workout A";
let baselines = {};

const templates = {
  "Workout A": [
    { name: "Back Squat", note: "Primary compound. 3x5, RPE 7–8.", sets: 3, target: "3x5", defaultWeight: "" },
    { name: "Clean and Press", note: "Double progression. Stay at 85 until 5/5/5.", sets: 3, target: "3x5", defaultWeight: 85 },
    { name: "Romanian Deadlift", note: "Controlled hinge. Do not chase failure.", sets: 2, target: "2x8", defaultWeight: "" },
    { name: "Incline Dumbbell Press", note: "Upper chest. Shoulder blades down/back.", sets: 2, target: "2x10", defaultWeight: "" },
    { name: "Hammer Curl", note: "Arms. Clean reps.", sets: 2, target: "2x12", defaultWeight: "" },
    { name: "Core", note: "Dead bugs, plank, or carries.", sets: 2, target: "2 sets", defaultWeight: "" },
    { name: "Zone 2 Run", note: "Post-lift: conversational pace.", sets: 1, target: "10–15 min", isRun: true, defaultWeight: 15 }
  ],
  "Workout B": [
    { name: "Bench Press", note: "Primary compound. Face pulls + dead bugs first.", sets: 3, target: "3x5", defaultWeight: "" },
    { name: "Front Squat", note: "Secondary compound. Clean reps.", sets: 3, target: "3x5", defaultWeight: "" },
    { name: "Pull-Ups", note: "Bodyweight or assisted. Track reps.", sets: 3, target: "3 sets", defaultWeight: 0 },
    { name: "Dips", note: "Add weight only when reps are owned.", sets: 2, target: "2 sets", defaultWeight: 0 },
    { name: "Curl Variation", note: "Arms. Moderate volume.", sets: 2, target: "2x12", defaultWeight: "" },
    { name: "Triceps Variation", note: "Controlled reps. No junk volume.", sets: 2, target: "2x12", defaultWeight: "" },
    { name: "Zone 2 Run", note: "Post-lift: conversational pace.", sets: 1, target: "10–15 min", isRun: true, defaultWeight: 15 }
  ],
  "Run": [
    { name: "Zone 2 Run", note: "RPE 4–5. Track minutes, not speed.", sets: 1, target: "20–25 min", isRun: true, defaultWeight: 25 }
  ],
  "Rest": [
    { name: "Walk / Mobility", note: "Family walk, easy mobility, no required training.", sets: 1, target: "Optional", isRun: true, defaultWeight: 0 }
  ]
};

const weekPlan = [
  { day: "Mon", plan: "Workout A", detail: "Lift + 10–15 Zone 2" },
  { day: "Tue", plan: "Run", detail: "20–25 Zone 2" },
  { day: "Wed", plan: "Workout B", detail: "Lift + 10–15 Zone 2" },
  { day: "Thu", plan: "Run", detail: "20–25 Zone 2" },
  { day: "Fri", plan: "Workout A", detail: "Alternate A/B weekly + optional run" },
  { day: "Sat", plan: "Rest", detail: "Walk, family, mobility" },
  { day: "Sun", plan: "Rest", detail: "Check-in + recovery" },
];

const cycleInfo = {
  1: { type: "Build", title: "Week 1 — Establish", text: "Use clean working weights. RPE 7–8. Leave 1–3 reps in reserve." },
  2: { type: "Build", title: "Week 2 — Add", text: "If Week 1 reps were owned, add weight. If not, repeat." },
  3: { type: "Build", title: "Week 3 — Push", text: "Hardest build week. Still no grinding or junk volume." },
  4: { type: "Deload", title: "Week 4 — Deload", text: "Reduce weight to ~80% and use 2 working sets. Leave better than you arrived." },
  5: { type: "Build", title: "Week 5 — Rebuild", text: "Start the second build wave. Resume slightly above earlier work if appropriate." },
  6: { type: "Build", title: "Week 6 — Add", text: "Progress only when reps are owned. Conditioning stays easy." },
  7: { type: "Build", title: "Week 7 — Peak", text: "Strongest build week. Do not chase failure." },
  8: { type: "Deload", title: "Week 8 — Deload", text: "Reduce weight and volume again. Then restart the next cycle." },
};

const els = {
  setupWarning: document.getElementById("setupWarning"), authView: document.getElementById("authView"), appView: document.getElementById("appView"), logoutBtn: document.getElementById("logoutBtn"), authMessage: document.getElementById("authMessage"), workoutMessage: document.getElementById("workoutMessage"), checkinMessage: document.getElementById("checkinMessage"), todayTitle: document.getElementById("todayTitle"), todayDetails: document.getElementById("todayDetails"), cycleLabel: document.getElementById("cycleLabel"), cycleType: document.getElementById("cycleType"), cycleRing: document.getElementById("cycleRing"), runTarget: document.getElementById("runTarget"), focusLabel: document.getElementById("focusLabel"), weekStrip: document.getElementById("weekStrip"), weeklyPlan: document.getElementById("weeklyPlan"), workoutBuilder: document.getElementById("workoutBuilder"), planHeading: document.getElementById("planHeading"), progressList: document.getElementById("progressList"), historyList: document.getElementById("historyList"), cycleGrid: document.getElementById("cycleGrid"), cycleDetails: document.getElementById("cycleDetails"), weekSummary: document.getElementById("weekSummary")
};

function todayISO() { return new Date().toISOString().split("T")[0]; }
function getCycleWeek() { const start = new Date("2026-06-08T00:00:00"); const now = new Date(); const days = Math.floor((now - start) / 86400000); return (Math.floor(days / 7) % 8) + 1; }
function isDeloadWeek() { return getCycleWeek() === 4 || getCycleWeek() === 8; }
function showMessage(el, msg, isError = false) { el.textContent = msg; el.style.color = isError ? "#ef4444" : "#111118"; }
function setLoggedIn(loggedIn) { els.authView.classList.toggle("hidden", loggedIn); els.appView.classList.toggle("hidden", !loggedIn); els.logoutBtn.classList.toggle("hidden", !loggedIn); }
function defaultPlanForToday() { const d = new Date().getDay(); if (d === 1) return "Workout A"; if (d === 2) return "Run"; if (d === 3) return "Workout B"; if (d === 4) return "Run"; if (d === 5) return getCycleWeek() % 2 === 1 ? "Workout A" : "Workout B"; return "Rest"; }
function detailsForPlan(p) { if (p === "Workout A") return "Squat/hinge + Clean & Press + short Zone 2."; if (p === "Workout B") return "Bench + Front Squat + Pull-Ups/Dips + arms."; if (p === "Run") return "20–25 minutes Zone 2. Conversational pace."; return "Recovery, walking, family time."; }
function runTargetForPlan(p) { if (p === "Workout A" || p === "Workout B") return "10–15"; if (p === "Run") return "20–25"; return "Walk"; }

function showPanel(panelId) { 
  document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden")); 
  const targetPanel = document.getElementById(panelId);
  targetPanel.classList.remove("hidden"); 
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.panel === panelId)); 
  window.scrollTo({ top: 0 }); 
}

function renderWeekStrip() {
  const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - now.getDay()); const labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  els.weekStrip.innerHTML = Array.from({ length: 7 }).map((_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); const today = d.toDateString() === now.toDateString(); return `<div class="day-pill ${today ? "today" : ""}"><span class="dow">${labels[i]}</span><span class="num">${d.getDate()}</span></div>`; }).join("");
}
function renderTop() { const wk = getCycleWeek(); els.todayTitle.textContent = selectedPlan; els.todayDetails.textContent = detailsForPlan(selectedPlan); els.cycleLabel.textContent = `Week ${wk}`; els.cycleType.textContent = cycleInfo[wk].type; els.cycleRing.textContent = wk; els.runTarget.textContent = runTargetForPlan(selectedPlan); els.focusLabel.textContent = isDeloadWeek() ? "Recover" : "Build"; els.planHeading.textContent = selectedPlan; els.weekSummary.textContent = `${cycleInfo[wk].title}: ${cycleInfo[wk].text}`; }
function renderWeeklyPlan() {
  const todayIndex = new Date().getDay();
  els.weeklyPlan.innerHTML = weekPlan.map((item, idx) => {
    const isToday = idx === todayIndex;
    return `<article class="day-card ${isToday ? "active" : ""}" data-plan="${item.plan}"><div><strong>${item.day} · ${item.plan}</strong><span>${item.detail}</span></div><div class="day-tag">${isToday ? "Today" : "Open"}</div></article>`;
  }).join("");
}
function renderCycleGrid(activeWeek = getCycleWeek()) {
  els.cycleGrid.innerHTML = Object.keys(cycleInfo).map(k => { const wk = Number(k); const info = cycleInfo[wk]; return `<button class="cycle-week ${wk === activeWeek ? "active" : ""} ${info.type === "Deload" ? "deload" : ""}" data-week="${wk}"><strong>${wk}</strong><span>${info.type}</span></button>`; }).join("");
  renderCycleDetails(activeWeek);
}
function renderCycleDetails(wk) { const info = cycleInfo[wk]; els.cycleDetails.innerHTML = `<h3>${info.title}</h3><p class="muted small" style="margin-top: 4px;">${info.text}</p><p class="small progress-decision" style="margin-top: 10px;">Rule: hit all target reps → increase. Miss once → repeat. Miss twice → reduce 10% and rebuild.</p>`; }
function setSelectedPlan(plan) { selectedPlan = plan; document.querySelectorAll(".plan-pill").forEach(btn => btn.classList.toggle("active", btn.dataset.plan === plan)); renderTop(); renderWorkoutBuilder(); }
function getBaselineWeight(name, fallback) { const row = baselines[name]; if (row && row.current_working_weight !== null && row.current_working_weight !== undefined) return row.current_working_weight; return fallback; }

function rowHtml(setIndex, ex) {
  const isRun = !!ex.isRun; const baseline = getBaselineWeight(ex.name, ex.defaultWeight); const repsDefault = isRun ? "" : (ex.target.includes("8") ? 8 : ex.target.includes("10") ? 10 : ex.target.includes("12") ? 12 : 5);
  const w = baseline === 0 ? "0" : (baseline || "");
  return `<div class="set-row" data-set-index="${setIndex}"><span class="set-num">${setIndex + 1}</span><input class="set-weight" type="number" inputmode="decimal" step="2.5" placeholder="${isRun ? "target" : "lb"}" value="${w}" /><input class="set-reps" type="number" inputmode="numeric" placeholder="${isRun ? "min" : "reps"}" value="${isRun ? "" : repsDefault}" /><input class="set-rpe" type="number" inputmode="decimal" step="0.5" placeholder="RPE" /><button class="remove-set" type="button">×</button></div>`;
}

function renderWorkoutBuilder() {
  const plan = templates[selectedPlan] || templates["Workout A"];
  els.workoutBuilder.innerHTML = plan.map((ex, i) => `
    <article class="exercise-card" data-exercise-index="${i}" data-exercise-name="${ex.name}" data-is-run="${ex.isRun ? "true" : "false"}">
      <div class="exercise-head">
        <div class="exercise-name">${ex.name}</div>
        <div class="exercise-note">${ex.note}</div>
        <div><span class="badge">${ex.target}</span></div>
      </div>
      <div class="set-header">
        <span>Set</span>
        <span>${ex.isRun ? "Target" : "Weight"}</span>
        <span>${ex.isRun ? "Done" : "Reps"}</span>
        <span>RPE</span>
        <span></span>
      </div>
      <div class="sets-container">${Array.from({ length: ex.sets }).map((_, idx) => rowHtml(idx, ex)).join("")}</div>
      <button class="add-set" type="button">+ Add set</button>
    </article>
  `).join("");
  bindRowHighlightListeners();
}

// Interactive State Engine: Highlights row background cleanly when values are parsed
function bindRowHighlightListeners() {
  const evaluateRow = (row) => {
    const weightInput = row.querySelector(".set-weight");
    const repsInput = row.querySelector(".set-reps");
    if ((weightInput && weightInput.value) || (repsInput && repsInput.value)) {
      row.classList.add("filled");
    } else {
      row.classList.remove("filled");
    }
  };

  document.querySelectorAll(".set-row").forEach(row => {
    evaluateRow(row);
    row.querySelectorAll("input").forEach(input => {
      input.addEventListener("input", () => evaluateRow(row));
    });
  });
}

function progressionDecision(exerciseName, weight, repsArray) {
  const lower = exerciseName.toLowerCase(); const targetReps = 5; const hitAll = repsArray.length >= 3 && repsArray.every(r => r >= targetReps); const lowerBody = lower.includes("squat") || lower.includes("deadlift"); const cleanPress = lower.includes("clean") && lower.includes("press");
  if (isDeloadWeek()) return { nextWeight: Math.round(weight * 0.8), decision: "Deload: use ~80% and 2 working sets.", hitAll };
  if (cleanPress) return hitAll ? { nextWeight: weight + 5, decision: "Clean & Press owned. Add 5 lb next exposure.", hitAll } : { nextWeight: weight, decision: "Clean & Press double progression: repeat this weight.", hitAll };
  if (hitAll) return { nextWeight: weight + (lowerBody ? 5 : 5), decision: `All reps hit. Add ${lowerBody ? "5" : "2.5–5"} lb next exposure.`, hitAll };
  return { nextWeight: weight, decision: "Repeat weight until target reps are owned.", hitAll };
}
async function signUp() { const email = document.getElementById("email").value.trim(); const password = document.getElementById("password").value; if (!email || !password) return showMessage(els.authMessage, "Enter email and password.", true); const { error } = await supabaseClient.auth.signUp({ email, password }); if (error) showMessage(els.authMessage, error.message, true); else showMessage(els.authMessage, "Account created. Log in."); }
async function signIn() { const email = document.getElementById("email").value.trim(); const password = document.getElementById("password").value; if (!email || !password) return showMessage(els.authMessage, "Enter email and password.", true); const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password }); if (error) return showMessage(els.authMessage, error.message, true); currentUser = data.user; setLoggedIn(true); await bootApp(); }
async function signOut() { await supabaseClient.auth.signOut(); currentUser = null; setLoggedIn(false); }
function collectExerciseRows() { const exercises = []; document.querySelectorAll(".exercise-card").forEach(card => { const name = card.dataset.exerciseName; const isRun = card.dataset.isRun === "true"; const rows = []; card.querySelectorAll(".set-row").forEach((row, idx) => { const weight = Number(row.querySelector(".set-weight").value || 0); const reps = Number(row.querySelector(".set-reps").value || 0); const rpe = Number(row.querySelector(".set-rpe").value || 0); if (weight > 0 || reps > 0 || rpe > 0) rows.push({ set_number: idx + 1, weight, reps, rpe }); }); if (rows.length) exercises.push({ name, isRun, rows }); }); return exercises; }
async function saveWorkout() {
  if (!currentUser) return; const exercises = collectExerciseRows(); const notes = document.getElementById("workoutNotes").value; if (!exercises.length && !notes.trim()) return showMessage(els.workoutMessage, "Enter at least one set or notes.", true);
  const { data: workout, error: workoutError } = await supabaseClient.from("workout_logs").insert({ user_id: currentUser.id, date: todayISO(), workout_type: selectedPlan, cycle_week: getCycleWeek(), is_deload: isDeloadWeek(), notes }).select().single(); if (workoutError) return showMessage(els.workoutMessage, workoutError.message, true);
  const setRows = []; const runRows = [];
  exercises.forEach(ex => { if (ex.isRun) { const first = ex.rows[0]; runRows.push({ user_id: currentUser.id, date: todayISO(), run_type: ex.name, target_minutes: first.weight || 0, completed_minutes: first.reps || 0, rpe: first.rpe || 0, notes: `${selectedPlan} · ${notes || ""}` }); } else { ex.rows.forEach(row => setRows.push({ workout_log_id: workout.id, exercise_name: ex.name, weight: row.weight, reps: row.reps, set_number: row.set_number, rpe: row.rpe, completed: true })); }});
  if (setRows.length) { const { error } = await supabaseClient.from("exercise_sets").insert(setRows); if (error) return showMessage(els.workoutMessage, error.message, true); }
  if (runRows.length) { const { error } = await supabaseClient.from("run_logs").insert(runRows); if (error) return showMessage(els.workoutMessage, error.message, true); }
  for (const ex of exercises.filter(e => !e.isRun)) { const usable = ex.rows.filter(r => r.weight >= 0 && r.reps > 0); if (!usable.length) continue; const weight = usable[usable.length - 1].weight; const repsArray = usable.map(r => r.reps); const { nextWeight, decision, hitAll } = progressionDecision(ex.name, weight, repsArray); const existing = baselines[ex.name]; let missCount = hitAll ? 0 : ((existing?.miss_count || 0) + 1); let finalNextWeight = nextWeight; let finalDecision = decision; if (!hitAll && missCount >= 2 && !isDeloadWeek()) { finalNextWeight = Math.round(weight * 0.9); finalDecision = "Missed twice: reduce load by about 10% and rebuild."; missCount = 0; } await supabaseClient.from("lift_baselines").upsert({ user_id: currentUser.id, exercise_name: ex.name, current_working_weight: finalNextWeight, target_sets: 3, target_reps: 5, last_result: `${weight} x ${repsArray.join(",")}`, miss_count: missCount, next_decision: finalDecision, updated_at: new Date().toISOString() }, { onConflict: "user_id,exercise_name" }); }
  showMessage(els.workoutMessage, "Saved. Your workout memory updated."); await loadProgress(); await loadHistory(); renderWorkoutBuilder();
}
async function saveCheckin() { if (!currentUser) return; const { error } = await supabaseClient.from("weekly_checkins").insert({ user_id: currentUser.id, week_start: todayISO(), body_weight: Number(document.getElementById("bodyWeight").value || 0), waist: Number(document.getElementById("waist").value || 0), lifts_completed: Number(document.getElementById("liftsCompleted").value || 0), runs_completed: Number(document.getElementById("runsCompleted").value || 0), protein_rating: document.getElementById("proteinRating").value, recovery_rating: document.getElementById("recoveryRating").value, notes: document.getElementById("checkinNotes").value }); if (error) return showMessage(els.checkinMessage, error.message, true); showMessage(els.checkinMessage, "Check-in saved."); }
async function loadProgress() { const { data, error } = await supabaseClient.from("lift_baselines").select("*").eq("user_id", currentUser.id).order("updated_at", { ascending: false }); if (error) { els.progressList.innerHTML = `<p class="muted">${error.message}</p>`; return; } baselines = {}; (data || []).forEach(row => baselines[row.exercise_name] = row); if (!data || !data.length) { els.progressList.innerHTML = `<p class="muted">No lift baselines yet. Log Clean and Press 85 with reps like 5,5,4 to start.</p>`; return; } els.progressList.innerHTML = data.map(row => `<article class="progress-item"><strong>${row.exercise_name}</strong><div>Next target: ${row.current_working_weight ?? 0} lb</div><div class="muted small" style="margin-top: 2px;">Last: ${row.last_result || "—"} · Misses: ${row.miss_count || 0}</div><div class="progress-decision">${row.next_decision || "Repeat until owned."}</div></article>`).join(""); }
async function loadHistory() { const [workouts, runs] = await Promise.all([supabaseClient.from("workout_logs").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(10), supabaseClient.from("run_logs").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(5)]); if (workouts.error || runs.error) { els.historyList.innerHTML = `<p class="muted">${workouts.error?.message || runs.error?.message}</p>`; return; } const workoutHtml = (workouts.data || []).map(row => `<article class="history-item"><strong>${row.date} · ${row.workout_type}</strong><span class="muted small" style="display: block; margin-top: 2px;">Week ${row.cycle_week} ${row.is_deload ? "· Deload" : "· Build"}</span><p class="muted small" style="margin-top: 6px;">${row.notes || ""}</p></article>`).join(""); const runHtml = (runs.data || []).map(row => `<article class="history-item"><strong>${row.date} · ${row.run_type}</strong><span class="muted small" style="display: block; margin-top: 2px;">${row.completed_minutes || 0}/${row.target_minutes || 0} min · RPE ${row.rpe || "—"}</span><p class="muted small" style="margin-top: 6px;">${row.notes || ""}</p></article>`).join(""); els.historyList.innerHTML = workoutHtml + runHtml || `<p class="muted">No history yet.</p>`; }
function setupEvents() {
  document.getElementById("signupBtn").addEventListener("click", signUp); document.getElementById("loginBtn").addEventListener("click", signIn); document.getElementById("logoutBtn").addEventListener("click", signOut); document.getElementById("saveWorkoutBtn").addEventListener("click", saveWorkout); document.getElementById("saveCheckinBtn").addEventListener("click", saveCheckin); document.getElementById("openCycleBtn").addEventListener("click", () => showPanel("cyclePanel"));
  document.querySelectorAll(".plan-pill").forEach(btn => btn.addEventListener("click", () => setSelectedPlan(btn.dataset.plan)));
  document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => showPanel(btn.dataset.panel)));
  els.weeklyPlan.addEventListener("click", e => { const card = e.target.closest(".day-card"); if (!card) return; setSelectedPlan(card.dataset.plan); showPanel("todayPanel"); });
  els.cycleGrid.addEventListener("click", e => { const btn = e.target.closest(".cycle-week"); if (!btn) return; renderCycleGrid(Number(btn.dataset.week)); });
  els.workoutBuilder.addEventListener("click", e => { if (e.target.classList.contains("add-set")) { const card = e.target.closest(".exercise-card"); const container = card.querySelector(".sets-container"); const ex = templates[selectedPlan].find(x => x.name === card.dataset.exerciseName) || { name: card.dataset.exerciseName, isRun: card.dataset.isRun === "true", defaultWeight: "" }; container.insertAdjacentHTML("beforeend", rowHtml(container.children.length, ex)); bindRowHighlightListeners(); } if (e.target.classList.contains("remove-set")) { const row = e.target.closest(".set-row"); const container = row.parentElement; if (container.children.length > 1) { row.remove(); } [...container.children].forEach((child, index) => child.querySelector(".set-num").textContent = index + 1); } });
}
async function bootApp() { selectedPlan = defaultPlanForToday(); renderWeekStrip(); renderWeeklyPlan(); renderCycleGrid(); await loadProgress(); setSelectedPlan(selectedPlan); await loadHistory(); }
async function init() { setupEvents(); renderWeekStrip(); renderWeeklyPlan(); renderCycleGrid(); if (!appConfigured) { els.setupWarning.classList.remove("hidden"); return; } const { data } = await supabaseClient.auth.getUser(); if (data.user) { currentUser = data.user; setLoggedIn(true); await bootApp(); } else { setLoggedIn(false); setSelectedPlan(defaultPlanForToday()); } }
init();