// Hybrid Log
// 1) Create your Supabase project.
// 2) Run supabase.sql in Supabase SQL Editor.
// 3) Replace these two values with your Project URL and anon public key.
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_PUBLIC_KEY_HERE";

const appConfigured = !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
const supabaseClient = appConfigured ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let currentUser = null;

const els = {
  setupWarning: document.getElementById("setupWarning"),
  authView: document.getElementById("authView"),
  appView: document.getElementById("appView"),
  logoutBtn: document.getElementById("logoutBtn"),
  authMessage: document.getElementById("authMessage"),
  workoutMessage: document.getElementById("workoutMessage"),
  runMessage: document.getElementById("runMessage"),
  checkinMessage: document.getElementById("checkinMessage"),
  todayTitle: document.getElementById("todayTitle"),
  todayDetails: document.getElementById("todayDetails"),
  cycleLabel: document.getElementById("cycleLabel"),
  historyList: document.getElementById("historyList"),
  progressList: document.getElementById("progressList"),
};

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function getCycleWeek() {
  const startDate = new Date("2026-06-08T00:00:00");
  const today = new Date();
  const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  return (Math.floor(diffDays / 7) % 8) + 1;
}

function isDeloadWeek() {
  return getCycleWeek() === 4 || getCycleWeek() === 8;
}

function getTodayPlan() {
  const day = new Date().getDay();
  const week = getCycleWeek();
  const fridayWorkout = week % 2 === 1 ? "Workout A" : "Workout B";

  const plans = {
    0: ["Rest / Walk", "Family time, walking, no required training."],
    1: ["Workout A + Zone 2", "Back Squat or Deadlift, Clean and Press or Press, accessories, 10–15 min Zone 2."],
    2: ["Zone 2", "20–25 minutes, conversational pace, RPE 4–5."],
    3: ["Workout B + Zone 2", "Bench Press, Front Squat, Pull-Ups, Dips, arms, 10–15 min Zone 2."],
    4: ["Zone 2", "20–25 minutes, conversational pace. Do not chase speed."],
    5: [`${fridayWorkout} + Optional Zone 2`, "Alternate Friday A/B. Add 10–15 minutes Zone 2 only if energy is good."],
    6: ["Rest / Walk", "Family time, walking, yard work, recovery."],
  };
  return plans[day];
}

function showMessage(el, message, isError = false) {
  el.textContent = message;
  el.style.color = isError ? "#fca5a5" : "#60a5fa";
}

function setLoggedIn(loggedIn) {
  els.authView.classList.toggle("hidden", loggedIn);
  els.appView.classList.toggle("hidden", !loggedIn);
  els.logoutBtn.classList.toggle("hidden", !loggedIn);
}

async function init() {
  if (!appConfigured) {
    els.setupWarning.classList.remove("hidden");
    els.todayTitle.textContent = "Setup Needed";
    return;
  }

  const { data } = await supabaseClient.auth.getUser();
  if (data.user) {
    currentUser = data.user;
    setLoggedIn(true);
    renderToday();
    await loadHistory();
    await loadProgress();
  } else {
    setLoggedIn(false);
  }
}

function renderToday() {
  const [title, details] = getTodayPlan();
  els.todayTitle.textContent = title;
  els.todayDetails.textContent = details;
  els.cycleLabel.textContent = `Week ${getCycleWeek()} · ${isDeloadWeek() ? "Deload" : "Build"}`;
}

async function signUp() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  if (!email || !password) return showMessage(els.authMessage, "Enter email and password.", true);

  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) showMessage(els.authMessage, error.message, true);
  else showMessage(els.authMessage, "Account created. Check email if confirmation is enabled, then log in.");
}

async function signIn() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  if (!email || !password) return showMessage(els.authMessage, "Enter email and password.", true);

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return showMessage(els.authMessage, error.message, true);

  currentUser = data.user;
  setLoggedIn(true);
  renderToday();
  await loadHistory();
  await loadProgress();
}

async function signOut() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  setLoggedIn(false);
}

function progressionDecision(exerciseName, weight, repsArray) {
  const lower = exerciseName.toLowerCase();
  const targetReps = 5;
  const hitAll = repsArray.length >= 3 && repsArray.every((r) => r >= targetReps);
  let nextWeight = weight;
  let decision = "Repeat weight until target reps are owned.";

  const lowerBody = lower.includes("squat") || lower.includes("deadlift");
  const cleanPress = lower.includes("clean") && lower.includes("press");

  if (isDeloadWeek()) {
    nextWeight = Math.round(weight * 0.8);
    decision = "Deload: reduce to about 80% and use 2 working sets.";
    return { nextWeight, decision, hitAll };
  }

  if (cleanPress) {
    if (hitAll) {
      nextWeight = weight + 5;
      decision = "Clean & Press owned. Add 5 lb next exposure.";
    } else {
      nextWeight = weight;
      decision = "Clean & Press double progression: repeat this weight.";
    }
    return { nextWeight, decision, hitAll };
  }

  if (hitAll) {
    nextWeight = weight + (lowerBody ? 5 : 5);
    decision = `All reps hit. Add ${lowerBody ? "5" : "2.5–5"} lb next exposure.`;
  }

  return { nextWeight, decision, hitAll };
}

async function saveWorkout() {
  if (!currentUser) return;

  const workoutType = document.getElementById("workoutType").value;
  const exerciseName = document.getElementById("exerciseName").value;
  const weight = Number(document.getElementById("weight").value || 0);
  const repsText = document.getElementById("reps").value;
  const rpe = Number(document.getElementById("rpe").value || 0);
  const notes = document.getElementById("workoutNotes").value;
  const repsArray = repsText.split(",").map((x) => Number(x.trim())).filter((x) => Number.isFinite(x) && x > 0);

  if (!exerciseName || !repsArray.length) return showMessage(els.workoutMessage, "Add an exercise and reps like 5,5,4.", true);

  const { data: workout, error: workoutError } = await supabaseClient
    .from("workout_logs")
    .insert({
      user_id: currentUser.id,
      date: todayISO(),
      workout_type: workoutType,
      cycle_week: getCycleWeek(),
      is_deload: isDeloadWeek(),
      notes,
    })
    .select()
    .single();

  if (workoutError) return showMessage(els.workoutMessage, workoutError.message, true);

  const setRows = repsArray.map((rep, index) => ({
    workout_log_id: workout.id,
    exercise_name: exerciseName,
    weight,
    reps: rep,
    set_number: index + 1,
    rpe,
    completed: true,
  }));

  const { error: setsError } = await supabaseClient.from("exercise_sets").insert(setRows);
  if (setsError) return showMessage(els.workoutMessage, setsError.message, true);

  const { nextWeight, decision, hitAll } = progressionDecision(exerciseName, weight, repsArray);

  const existing = await supabaseClient
    .from("lift_baselines")
    .select("miss_count")
    .eq("user_id", currentUser.id)
    .eq("exercise_name", exerciseName)
    .maybeSingle();

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
    exercise_name: exerciseName,
    current_working_weight: finalNextWeight,
    target_sets: 3,
    target_reps: 5,
    last_result: `${weight} x ${repsArray.join(",")}`,
    miss_count: missCount,
    next_decision: finalDecision,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,exercise_name" });

  showMessage(els.workoutMessage, `Saved. Next: ${finalDecision}`);
  await loadHistory();
  await loadProgress();
}

async function saveRun() {
  if (!currentUser) return;
  const { error } = await supabaseClient.from("run_logs").insert({
    user_id: currentUser.id,
    date: todayISO(),
    run_type: document.getElementById("runType").value,
    target_minutes: Number(document.getElementById("targetMinutes").value || 0),
    completed_minutes: Number(document.getElementById("completedMinutes").value || 0),
    rpe: Number(document.getElementById("runRpe").value || 0),
    notes: document.getElementById("runNotes").value,
  });
  if (error) return showMessage(els.runMessage, error.message, true);
  showMessage(els.runMessage, "Run saved. Consistency > pace.");
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
  const { data, error } = await supabaseClient
    .from("lift_baselines")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("updated_at", { ascending: false });

  if (error) {
    els.progressList.innerHTML = `<p class="muted">${error.message}</p>`;
    return;
  }

  if (!data.length) {
    els.progressList.innerHTML = `<p class="muted">No lift baselines yet. Log Clean and Press 85 with reps like 5,5,4 to start.</p>`;
    return;
  }

  els.progressList.innerHTML = data.map((row) => `
    <div class="item">
      <strong>${row.exercise_name}</strong><br />
      Current/next working weight: ${row.current_working_weight || 0} lb<br />
      Last result: ${row.last_result || "—"}<br />
      Miss count: ${row.miss_count || 0}<br />
      <span class="decision">${row.next_decision || "Repeat until owned."}</span>
    </div>
  `).join("");
}

async function loadHistory() {
  const workoutReq = supabaseClient
    .from("workout_logs")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const runReq = supabaseClient
    .from("run_logs")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const [workouts, runs] = await Promise.all([workoutReq, runReq]);

  if (workouts.error || runs.error) {
    els.historyList.innerHTML = `<p class="muted">${workouts.error?.message || runs.error?.message}</p>`;
    return;
  }

  const workoutHtml = workouts.data.map((row) => `
    <div class="item">
      <strong>${row.date} · ${row.workout_type}</strong><br />
      Week ${row.cycle_week} ${row.is_deload ? "· Deload" : "· Build"}<br />
      <span class="muted">${row.notes || ""}</span>
    </div>
  `).join("");

  const runHtml = runs.data.map((row) => `
    <div class="item">
      <strong>${row.date} · ${row.run_type}</strong><br />
      ${row.completed_minutes || 0}/${row.target_minutes || 0} minutes · RPE ${row.rpe || "—"}<br />
      <span class="muted">${row.notes || ""}</span>
    </div>
  `).join("");

  els.historyList.innerHTML = (workoutHtml + runHtml) || `<p class="muted">No history yet.</p>`;
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.remove("hidden");
    });
  });
}

document.getElementById("signupBtn").addEventListener("click", signUp);
document.getElementById("loginBtn").addEventListener("click", signIn);
document.getElementById("logoutBtn").addEventListener("click", signOut);
document.getElementById("saveWorkoutBtn").addEventListener("click", saveWorkout);
document.getElementById("saveRunBtn").addEventListener("click", saveRun);
document.getElementById("saveCheckinBtn").addEventListener("click", saveCheckin);

setupTabs();
init();
