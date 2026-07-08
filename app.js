// Hybrid Log v10 — reliable daily workout loop
const SUPABASE_URL = "https://nlsnycwlmoukxgojrkpe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sc255Y3dsbW91a3hnb2pya3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzQ5NjIsImV4cCI6MjA5NjUxMDk2Mn0.Q_5R8vel8YmExTY3ztk3toHBuW1xLKUjVFzKeBbIwE4";

const appConfigured = SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
const supabaseClient = appConfigured ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let currentUser = null;
let currentWorkout = "Workout A";
let equipmentMode = "full";
let programSettings = { current_week: 1, advance_after_lifts: "3", lift_count_this_program_week: 0 };
let baselines = {};
let pendingAction = localStorage.getItem("pendingAction") || null;
let weekSchedule = [];

const $ = (id) => document.getElementById(id);
const els = {
  toast: $("toast"), setupWarning: $("setupWarning"), authView: $("authView"), appView: $("appView"), bottomNav: $("bottomNav"),
  logoutBtn: $("logoutBtn"), authMessage: $("authMessage"), dateLine: $("dateLine"), todayWorkoutName: $("todayWorkoutName"), todayWorkoutDetails: $("todayWorkoutDetails"),
  cycleRing: $("cycleRing"), recommendationTitle: $("recommendationTitle"), recommendationReason: $("recommendationReason"), weeklyPlanList: $("weeklyPlanList"),
  sessionTitle: $("sessionTitle"), sessionSubtitle: $("sessionSubtitle"), sessionExercises: $("sessionExercises"), sessionMessage: $("sessionMessage"),
  progressList: $("progressList"), liftsAuto: $("liftsAuto"), runsAuto: $("runsAuto"), checkinMessage: $("checkinMessage"), equipmentMode: $("equipmentMode"),
  programWeek: $("programWeek"), advanceAfterLifts: $("advanceAfterLifts")
};

const baseTemplates = {
  "Workout A": [
    { name: "Back Squat", note: "Primary compound. RPE 7–8.", sets: 3, reps: 5, target: "3x5", type: "lift", defaultWeight: "" },
    { name: "Clean and Press", note: "Double progression. Stay until 5/5/5.", sets: 3, reps: 5, target: "3x5", type: "lift", defaultWeight: 85 },
    { name: "Romanian Deadlift", note: "Controlled hinge. No failure.", sets: 2, reps: 8, target: "2x8", type: "lift", defaultWeight: "" },
    { name: "Incline Dumbbell Press", note: "Upper chest priority.", sets: 2, reps: 10, target: "2x10", type: "lift", defaultWeight: "" },
    { name: "Hammer Curl", note: "Direct biceps. Quality reps.", sets: 3, reps: 12, target: "3x10–12", type: "accessory", defaultWeight: "" },
    { name: "Incline Curl", note: "Second biceps exercise.", sets: 3, reps: 12, target: "3x10–12", type: "accessory", defaultWeight: "" },
    { name: "Rope Pushdown", note: "Direct triceps.", sets: 3, reps: 12, target: "3x10–12", type: "accessory", defaultWeight: "" },
    { name: "Overhead Triceps Extension", note: "Long head triceps.", sets: 3, reps: 12, target: "3x10–12", type: "accessory", defaultWeight: "" },
    { name: "Lateral Raise", note: "Shoulder cap. Clean reps.", sets: 3, reps: 15, target: "3x12–15", type: "accessory", defaultWeight: "" },
    { name: "Zone 2 Run", note: "Conversational pace.", sets: 1, reps: 20, target: "15–20 min", type: "run", defaultWeight: 20 }
  ],
  "Workout B": [
    { name: "Bench Press", note: "Primary compound. Face pulls/dead bugs first.", sets: 3, reps: 5, target: "3x5", type: "lift", defaultWeight: "" },
    { name: "Front Squat", note: "Secondary compound.", sets: 3, reps: 5, target: "3x5", type: "lift", defaultWeight: "" },
    { name: "Pull-Ups", note: "Stop 1–2 reps before failure.", sets: 3, reps: 6, target: "3 sets", type: "lift", defaultWeight: 0 },
    { name: "Dips", note: "Controlled reps.", sets: 3, reps: 8, target: "2–3 sets", type: "lift", defaultWeight: 0 },
    { name: "Incline Dumbbell Press", note: "Upper chest priority.", sets: 2, reps: 10, target: "2x10", type: "lift", defaultWeight: "" },
    { name: "Hammer Curl", note: "Direct biceps.", sets: 3, reps: 12, target: "3x10–12", type: "accessory", defaultWeight: "" },
    { name: "EZ Curl", note: "Second biceps exercise.", sets: 3, reps: 12, target: "3x10–12", type: "accessory", defaultWeight: "" },
    { name: "Skull Crusher", note: "Direct triceps.", sets: 3, reps: 12, target: "3x10–12", type: "accessory", defaultWeight: "" },
    { name: "Overhead Triceps Extension", note: "Long head triceps.", sets: 3, reps: 12, target: "3x10–12", type: "accessory", defaultWeight: "" },
    { name: "Lateral Raise", note: "Every upper workout.", sets: 3, reps: 15, target: "3x12–15", type: "accessory", defaultWeight: "" },
    { name: "Rear Delt Fly", note: "Optional rear delt/posture work.", sets: 2, reps: 15, target: "2x15", type: "accessory", defaultWeight: "" },
    { name: "Zone 2 Run", note: "Conversational pace.", sets: 1, reps: 20, target: "15–20 min", type: "run", defaultWeight: 20 }
  ],
  "Zone 2": [
    { name: "Zone 2 Run", note: "RPE 4–5. Track minutes, not pace.", sets: 1, reps: 30, target: "20–30 min", type: "run", defaultWeight: 30 }
  ],
  "Recovery": [
    { name: "Walk / Mobility", note: "Family walk, easy movement, no required intensity.", sets: 1, reps: 20, target: "Optional", type: "run", defaultWeight: 20 }
  ],
  "Minimum Viable": [
    { name: "Primary Compound", note: "One big lift or closest travel substitute.", sets: 3, reps: 5, target: "3x5", type: "lift", defaultWeight: "" },
    { name: "Push/Pull Superset", note: "Dumbbell press + row or push-ups + pull-ups.", sets: 3, reps: 10, target: "3x10", type: "accessory", defaultWeight: "" },
    { name: "Arm Finisher", note: "One biceps + one triceps movement.", sets: 4, reps: 12, target: "4 sets", type: "accessory", defaultWeight: "" },
    { name: "Zone 2 Run", note: "If time allows.", sets: 1, reps: 10, target: "10 min", type: "run", defaultWeight: 10 }
  ]
};

const substitutions = {
  hotel: { "Back Squat": "Goblet Squat", "Front Squat": "DB Front Squat", "Bench Press": "DB Bench Press", "Clean and Press": "DB Clean and Press", "Romanian Deadlift": "DB Romanian Deadlift", "Pull-Ups": "Lat Pulldown / Assisted Pull-Up", "Dips": "Bench Dips" },
  dumbbells: { "Back Squat": "Goblet Squat", "Front Squat": "Goblet Squat", "Bench Press": "DB Floor Press", "Clean and Press": "DB Clean and Press", "Romanian Deadlift": "DB Romanian Deadlift", "Pull-Ups": "One-Arm DB Row", "Dips": "Close-Grip Push-Up" },
  bodyweight: { "Back Squat": "Bulgarian Split Squat", "Front Squat": "Split Squat", "Bench Press": "Push-Up", "Clean and Press": "Pike Push-Up", "Romanian Deadlift": "Single-Leg Hip Hinge", "Pull-Ups": "Doorway Row / Towel Row", "Dips": "Bench Dip" }
};

function localISO(d = new Date()) { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,"0"); const day=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
function addDays(date, days) { const d = new Date(date + "T12:00:00"); d.setDate(d.getDate() + days); return localISO(d); }
function startOfWeekISO(date = new Date()) { const d = new Date(date); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day; d.setDate(d.getDate() + diff); return localISO(d); }
function prettyDate(iso) { return new Date(iso + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }); }
function defaultWeeklyPlan() { const start = startOfWeekISO(); return ["Workout A","Zone 2","Workout B","Zone 2", programSettings.current_week % 2 === 1 ? "Workout A" : "Workout B", "Recovery", "Recovery"].map((plan,i)=>({ date:addDays(start,i), plan, status:"planned", locked:false })); }
function planDetails(plan) { if (plan === "Workout A") return "Squat/Clean & Press + arms + 15–20 Zone 2"; if (plan === "Workout B") return "Bench/Front Squat/Pull-ups/Dips + arms + Zone 2"; if (plan === "Zone 2") return "20–30 min conversational pace"; if (plan === "Minimum Viable") return "Rushed/travel workout"; return "Walking, mobility, family"; }
function toast(msg, isError=false) { els.toast.textContent = msg; els.toast.style.background = isError ? "#ff3b30" : "#1c1c1e"; els.toast.classList.remove("hidden"); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(()=>els.toast.classList.add("hidden"), 2800); }
function showMessage(el, msg, isError=false) { if (!el) return; el.textContent = msg; el.style.color = isError ? "#ff3b30" : "#1c1c1e"; }
function setLoggedIn(isIn) { els.authView.classList.toggle("hidden", isIn); els.appView.classList.toggle("hidden", !isIn); els.bottomNav.classList.toggle("hidden", !isIn); els.logoutBtn.classList.toggle("hidden", !isIn); }
function showPanel(panelId) { document.querySelectorAll(".panel").forEach(p=>p.classList.add("hidden")); $(panelId).classList.remove("hidden"); document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active", b.dataset.panel===panelId)); window.scrollTo({top:0, behavior:"instant"}); }

function recommendationFromReadiness() {
  const soreness = $("soreness").value;
  const time = Number($("availableTime").value || 60);
  const stress = Number($("stress").value || 0);
  const battery = Number($("bodyBattery").value || 100);
  const assigned = getAssignedToday();
  if (time <= 20) return { plan: "Minimum Viable", reason: "Available time is short. Keep the streak alive." };
  if (soreness === "High" || stress >= 70 || battery < 35) return { plan: "Zone 2", reason: "Recovery is limited. Build aerobic base without digging a hole." };
  return { plan: assigned || "Workout A", reason: "Default plan fits today’s readiness." };
}
function getAssignedToday() { const today = localISO(); return (weekSchedule.find(d=>d.date===today)?.plan) || defaultWeeklyPlan().find(d=>d.date===today)?.plan || "Workout A"; }
function updateTodayUI() { const rec = recommendationFromReadiness(); const assigned = getAssignedToday() || rec.plan; els.dateLine.textContent = prettyDate(localISO()); els.todayWorkoutName.textContent = assigned; els.todayWorkoutDetails.textContent = planDetails(assigned); els.recommendationTitle.textContent = rec.plan; els.recommendationReason.textContent = rec.reason; els.cycleRing.textContent = programSettings.current_week || 1; document.querySelectorAll(".plan-btn").forEach(b=>b.classList.toggle("active", b.dataset.plan===assigned)); }

async function ensureWeekSchedule() {
  const start = startOfWeekISO();
  let { data, error } = await supabaseClient.from("daily_schedule").select("*").eq("user_id", currentUser.id).gte("workout_date", start).lte("workout_date", addDays(start, 6)).order("workout_date");
  if (error || !data || data.length === 0) {
    const rows = defaultWeeklyPlan().map(d=>({ user_id: currentUser.id, workout_date: d.date, planned_workout: d.plan, actual_workout: null, status: "planned", is_locked: false }));
    await supabaseClient.from("daily_schedule").upsert(rows, { onConflict: "user_id,workout_date" });
    ({ data } = await supabaseClient.from("daily_schedule").select("*").eq("user_id", currentUser.id).gte("workout_date", start).lte("workout_date", addDays(start, 6)).order("workout_date"));
  }
  weekSchedule = (data || []).map(r=>({ date: r.workout_date, plan: r.actual_workout || r.planned_workout, status: r.status, locked: r.is_locked }));
}

async function setDayPlan(date, plan, rebalance = true) {
  const day = weekSchedule.find(d=>d.date===date);
  if (day?.locked) return toast("That day is locked because a workout was saved.", true);
  await supabaseClient.from("daily_schedule").upsert({ user_id: currentUser.id, workout_date: date, planned_workout: plan, actual_workout: plan, status: plan === "Recovery" ? "rest" : "planned", is_locked: false }, { onConflict: "user_id,workout_date" });
  await ensureWeekSchedule();
  if (rebalance) await rebalanceRemaining(date);
  await refreshAll();
  toast(`${prettyDate(date)} set to ${plan}`);
}

async function rebalanceRemaining(anchorDate = localISO()) {
  // Preserve completed/locked days; rebalance unlocked days from anchor forward to target 3 lift slots and 4 run exposures.
  await ensureWeekSchedule();
  const liftsDone = weekSchedule.filter(d=>d.locked && ["Workout A","Workout B","Minimum Viable"].includes(d.plan)).length;
  const runsDone = weekSchedule.filter(d=>d.locked && ["Workout A","Workout B","Zone 2","Minimum Viable"].includes(d.plan)).length;
  let remainingLiftNeed = Math.max(0, 3 - liftsDone);
  let remainingRunNeed = Math.max(0, 4 - runsDone);
  const rows = [];
  let nextLift = "Workout A";
  for (const d of weekSchedule) {
    if (d.locked || d.date < anchorDate) continue;
    let plan = d.plan;
    if (d.date === anchorDate && d.plan !== "Recovery") { plan = d.plan; }
    else if (remainingLiftNeed > 0) { plan = nextLift; nextLift = nextLift === "Workout A" ? "Workout B" : "Workout A"; }
    else if (remainingRunNeed > 0) { plan = "Zone 2"; }
    else { plan = "Recovery"; }
    if (["Workout A","Workout B","Minimum Viable"].includes(plan)) remainingLiftNeed--;
    if (["Workout A","Workout B","Zone 2","Minimum Viable"].includes(plan)) remainingRunNeed--;
    rows.push({ user_id: currentUser.id, workout_date: d.date, planned_workout: plan, actual_workout: plan, status: plan === "Recovery" ? "rest" : "planned", is_locked: false });
  }
  if (rows.length) await supabaseClient.from("daily_schedule").upsert(rows, { onConflict: "user_id,workout_date" });
  await ensureWeekSchedule();
}

function renderWeeklyPlan() {
  const today = localISO();
  els.weeklyPlanList.innerHTML = weekSchedule.map(d=>{
    const cls = `${d.date===today ? "today" : ""} ${d.locked ? "complete" : ""} ${d.plan==="Recovery" ? "rest" : ""}`;
    return `<article class="day-card ${cls}"><div><strong>${prettyDate(d.date)} · ${d.plan}</strong><span>${d.locked ? "Complete" : d.status || "planned"} · ${planDetails(d.plan)}</span></div><div class="day-actions">${!d.locked ? `<button data-change-day="${d.date}" data-plan="Workout A">A</button><button data-change-day="${d.date}" data-plan="Workout B">B</button><button data-change-day="${d.date}" data-plan="Zone 2">Z2</button><button data-change-day="${d.date}" data-plan="Recovery">Rest</button>` : "✓"}</div></article>`;
  }).join("");
}
function applyEquipment(ex) { const map = substitutions[equipmentMode] || {}; const subName = map[ex.name]; return subName ? { ...ex, name: subName, note: `${ex.name} substitute · ${ex.note}` } : ex; }
function templateFor(plan) { return (baseTemplates[plan] || baseTemplates["Workout A"]).map(applyEquipment); }
function baselineWeight(name, fallback) { const exact = baselines[name]; if (exact && exact.current_working_weight !== null && exact.current_working_weight !== undefined) return exact.current_working_weight; return fallback ?? ""; }
function startWorkout(plan = null) { if (!currentUser) { localStorage.setItem("pendingAction", JSON.stringify({ type:"startWorkout", plan: plan || getAssignedToday() })); setLoggedIn(false); toast("Log in first. I’ll open the workout after login."); return; } currentWorkout = plan || getAssignedToday() || recommendationFromReadiness().plan; renderSession(currentWorkout); showPanel("sessionPanel"); }
function renderSession(plan) { currentWorkout = plan; els.sessionTitle.textContent = plan; els.sessionSubtitle.textContent = planDetails(plan); document.querySelectorAll(".session-plan-btn").forEach(b=>b.classList.toggle("active", b.dataset.plan===plan)); const exercises = templateFor(plan); els.sessionExercises.innerHTML = exercises.map((ex,i)=>exerciseCard(ex,i)).join(""); bindSetInputs(); }
function exerciseCard(ex, idx) { const rows = Array.from({length: ex.sets}).map((_,i)=>setRow(ex,i)).join(""); return `<article class="exercise-card" data-exercise-name="${ex.name}" data-exercise-type="${ex.type}"><div class="exercise-head"><div><div class="exercise-name">${ex.name}</div><div class="exercise-note">${ex.note}</div></div><span class="badge">${ex.target}</span></div><div class="set-header"><span>Set</span><span>${ex.type==="run" ? "Target" : "Weight"}</span><span>${ex.type==="run" ? "Done" : "Reps"}</span><span>RPE</span><span></span></div><div class="sets-container">${rows}</div><div class="exercise-actions"><button class="copy-first-set" type="button">Copy set 1</button><button class="add-set" type="button">+ Add set</button></div></article>`; }
function setRow(ex, i) { const w = ex.type === "run" ? ex.defaultWeight : baselineWeight(ex.name, ex.defaultWeight); const reps = ex.type === "run" ? "" : ex.reps; return `<div class="set-row"><span class="set-num">${i+1}</span><input class="set-weight" type="number" inputmode="decimal" step="2.5" placeholder="${ex.type==="run" ? "min" : "lb"}" value="${w || w===0 ? w : ""}" /><input class="set-reps" type="number" inputmode="decimal" step="0.01" placeholder="${ex.type==="run" ? "done" : "reps"}" value="${reps || ""}" /><input class="set-rpe" type="number" inputmode="decimal" step="0.5" placeholder="RPE" /><button class="remove-set" type="button">×</button></div>`; }
function bindSetInputs() { document.querySelectorAll(".set-row").forEach(row=>{ const evalRow=()=>{ const vals=[...row.querySelectorAll("input")].map(i=>i.value).join(""); row.classList.toggle("filled", !!vals); }; evalRow(); row.querySelectorAll("input").forEach(i=>i.addEventListener("input", evalRow)); }); }
function collectSession() { const out=[]; document.querySelectorAll(".exercise-card").forEach(card=>{ const rows=[]; card.querySelectorAll(".set-row").forEach((row,i)=>{ const weight=Number(row.querySelector(".set-weight").value || 0); const reps=Number(row.querySelector(".set-reps").value || 0); const rpe=Number(row.querySelector(".set-rpe").value || 0); if (weight || reps || rpe) rows.push({ set_number:i+1, weight, reps, rpe }); }); if (rows.length) out.push({ name: card.dataset.exerciseName, type: card.dataset.exerciseType, rows }); }); return out; }
function progressionDecision(name, weight, repsArray, type) { if (type === "accessory") return { nextWeight: weight, decision: "Accessory: repeat or add reps before adding load.", miss: 0 }; const hitAll = repsArray.length >= 3 && repsArray.every(r=>r >= 5); const lower = name.toLowerCase(); if (programSettings.current_week === 4 || programSettings.current_week === 8) return { nextWeight: Math.round(weight*0.8), decision: "Deload: use ~80% and 2 working sets.", miss: 0 }; if (lower.includes("clean") && lower.includes("press")) return hitAll ? { nextWeight: weight+5, decision: "Clean & Press owned. Add 5 lb.", miss: 0 } : { nextWeight: weight, decision: "Repeat until 5/5/5.", miss: 1 }; if (hitAll) return { nextWeight: weight + 5, decision: "All reps hit. Add 5 lb next exposure.", miss: 0 }; return { nextWeight: weight, decision: "Repeat weight until target reps are owned.", miss: 1 }; }
async function finishWorkout() {
  if (!currentUser) return startWorkout(currentWorkout);
  const rows = collectSession(); const notes = $("sessionNotes").value || ""; const distance = Number($("runDistance").value || 0);
  if (!rows.length && !notes.trim()) return showMessage(els.sessionMessage, "Track at least one set or add notes before saving.", true);
  const { data: workout, error } = await supabaseClient.from("workout_logs").insert({ user_id: currentUser.id, date: localISO(), workout_type: currentWorkout, cycle_week: programSettings.current_week, is_deload: [4,8].includes(Number(programSettings.current_week)), notes }).select().single();
  if (error) return showMessage(els.sessionMessage, error.message, true);
  const setRows=[]; const runRows=[];
  rows.forEach(ex=>{ if (ex.type === "run") { const r=ex.rows[0]; runRows.push({ user_id: currentUser.id, date: localISO(), run_type: ex.name, target_minutes: r.weight || 0, completed_minutes: r.reps || 0, rpe: r.rpe || 0, notes: distance ? `Distance: ${distance} mi · ${notes}` : notes }); } else { ex.rows.forEach(r=>setRows.push({ workout_log_id: workout.id, exercise_name: ex.name, weight: r.weight, reps: Math.round(r.reps), set_number: r.set_number, rpe: r.rpe, completed: true })); }});
  if (setRows.length) { const { error:e } = await supabaseClient.from("exercise_sets").insert(setRows); if (e) return showMessage(els.sessionMessage, e.message, true); }
  if (runRows.length) { const { error:e } = await supabaseClient.from("run_logs").insert(runRows); if (e) return showMessage(els.sessionMessage, e.message, true); }
  for (const ex of rows.filter(x=>x.type !== "run")) { const usable = ex.rows.filter(r=>r.reps > 0); const last = usable[usable.length-1]; if (!last) continue; const decision = progressionDecision(ex.name, last.weight, usable.map(r=>r.reps), ex.type); const existing = baselines[ex.name] || {}; let missCount = decision.miss ? (existing.miss_count || 0) + 1 : 0; let nextWeight = decision.nextWeight; let nextDecision = decision.decision; if (missCount >= 2 && ex.type === "lift") { nextWeight = Math.round(last.weight * 0.9); nextDecision = "Missed twice: reduce load about 10% and rebuild."; missCount = 0; } await supabaseClient.from("lift_baselines").upsert({ user_id: currentUser.id, exercise_name: ex.name, current_working_weight: nextWeight, target_sets: 3, target_reps: 5, last_result: `${last.weight} x ${usable.map(r=>r.reps).join(",")}`, miss_count: missCount, next_decision: nextDecision, updated_at: new Date().toISOString() }, { onConflict: "user_id,exercise_name" }); }
  await supabaseClient.from("daily_schedule").upsert({ user_id: currentUser.id, workout_date: localISO(), planned_workout: currentWorkout, actual_workout: currentWorkout, status: "complete", is_locked: true }, { onConflict: "user_id,workout_date" });
  await maybeAdvanceProgramWeek();
  toast("Workout saved."); showMessage(els.sessionMessage, "Saved. Progress and week schedule updated."); await refreshAll(); showPanel("todayPanel");
}
async function maybeAdvanceProgramWeek() { if (!["Workout A","Workout B","Minimum Viable"].includes(currentWorkout)) return; if (programSettings.advance_after_lifts === "manual") return; const needed = Number(programSettings.advance_after_lifts || 3); const count = Number(programSettings.lift_count_this_program_week || 0) + 1; let week = Number(programSettings.current_week || 1); let newCount = count; if (count >= needed) { week = week >= 8 ? 1 : week + 1; newCount = 0; } await saveProgramSettings(week, programSettings.advance_after_lifts, newCount, false); }
async function loadProgress() { const { data, error } = await supabaseClient.from("lift_baselines").select("*").eq("user_id", currentUser.id).order("updated_at", { ascending:false }); if (error) { els.progressList.innerHTML = `<p class="muted">${error.message}</p>`; return; } baselines={}; (data||[]).forEach(r=>baselines[r.exercise_name]=r); els.progressList.innerHTML = (data&&data.length) ? data.map(r=>`<article class="progress-item"><strong>${r.exercise_name}</strong><div>Next target: ${r.current_working_weight ?? 0} lb</div><div class="muted small">Last: ${r.last_result || "—"} · Misses: ${r.miss_count || 0}</div><div class="progress-decision">${r.next_decision || "Repeat until owned."}</div></article>`).join("") : `<p class="muted">No baselines yet. Finish a workout to start tracking.</p>`; }
async function loadCheckinCounts() { const start=startOfWeekISO(); const end=addDays(start,6); const { data:w } = await supabaseClient.from("workout_logs").select("workout_type").eq("user_id", currentUser.id).gte("date", start).lte("date", end); const { data:r } = await supabaseClient.from("run_logs").select("id").eq("user_id", currentUser.id).gte("date", start).lte("date", end); const lifts=(w||[]).filter(x=>["Workout A","Workout B","Minimum Viable"].includes(x.workout_type)).length; const runs=(r||[]).length + (w||[]).filter(x=>["Workout A","Workout B"].includes(x.workout_type)).length; els.liftsAuto.textContent = `${lifts}/3`; els.runsAuto.textContent = `${runs}/4`; }
async function saveCheckin() { const { error } = await supabaseClient.from("weekly_checkins").insert({ user_id: currentUser.id, week_start: startOfWeekISO(), body_weight: Number($("bodyWeight").value || 0), waist: Number($("waist").value || 0), arm_measurement: Number($("armMeasurement").value || 0), zone2_pace: $("zone2Pace").value || null, lifts_completed: Number((els.liftsAuto.textContent||"0").split("/")[0]), runs_completed: Number((els.runsAuto.textContent||"0").split("/")[0]), protein_rating: $("proteinRating").value, recovery_rating: $("recoveryRating").value, notes: $("checkinNotes").value }); if (error) showMessage(els.checkinMessage, error.message, true); else showMessage(els.checkinMessage, "Check-in saved."); }
async function loadPreferences() { const { data } = await supabaseClient.from("user_preferences").select("*").eq("user_id", currentUser.id).maybeSingle(); if (data) { equipmentMode = data.equipment_mode || "full"; programSettings.current_week = data.current_week || 1; programSettings.advance_after_lifts = data.advance_after_lifts || "3"; programSettings.lift_count_this_program_week = data.lift_count_this_program_week || 0; } els.equipmentMode.value=equipmentMode; els.programWeek.value=String(programSettings.current_week); els.advanceAfterLifts.value=String(programSettings.advance_after_lifts); }
async function saveEquipment() { equipmentMode = els.equipmentMode.value; await supabaseClient.from("user_preferences").upsert({ user_id: currentUser.id, equipment_mode: equipmentMode, current_week: programSettings.current_week, advance_after_lifts: programSettings.advance_after_lifts, lift_count_this_program_week: programSettings.lift_count_this_program_week, updated_at: new Date().toISOString() }, { onConflict: "user_id" }); toast("Equipment saved."); renderSession(currentWorkout); }
async function saveProgramSettings(week=null, advance=null, liftCount=null, show=true) { programSettings.current_week = Number(week || els.programWeek.value || 1); programSettings.advance_after_lifts = advance || els.advanceAfterLifts.value || "3"; programSettings.lift_count_this_program_week = liftCount ?? programSettings.lift_count_this_program_week ?? 0; await supabaseClient.from("user_preferences").upsert({ user_id: currentUser.id, equipment_mode: equipmentMode, current_week: programSettings.current_week, advance_after_lifts: programSettings.advance_after_lifts, lift_count_this_program_week: programSettings.lift_count_this_program_week, updated_at: new Date().toISOString() }, { onConflict: "user_id" }); if (show) toast("Program settings saved."); }
async function signUp() { const email=$("email").value.trim(); const password=$("password").value; if (!email || !password) return showMessage(els.authMessage,"Enter email and password.",true); const { error } = await supabaseClient.auth.signUp({ email, password }); if (error) showMessage(els.authMessage,error.message,true); else showMessage(els.authMessage,"Account created. Log in."); }
async function signIn() { const email=$("email").value.trim(); const password=$("password").value; if (!email || !password) return showMessage(els.authMessage,"Enter email and password.",true); const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password }); if (error) return showMessage(els.authMessage,error.message,true); currentUser=data.user; setLoggedIn(true); await bootApp(); const pending = localStorage.getItem("pendingAction"); if (pending) { localStorage.removeItem("pendingAction"); try { const action=JSON.parse(pending); if (action.type==="startWorkout") startWorkout(action.plan); } catch { startWorkout(); } } }
async function signOut() { await supabaseClient.auth.signOut(); currentUser=null; setLoggedIn(false); }
async function refreshAll() { await ensureWeekSchedule(); renderWeeklyPlan(); updateTodayUI(); await loadProgress(); await loadCheckinCounts(); }
async function bootApp() { await loadPreferences(); await refreshAll(); renderSession(getAssignedToday()); }
function wireEvents() {
  $("signupBtn").addEventListener("click", signUp); $("loginBtn").addEventListener("click", signIn); $("logoutBtn").addEventListener("click", signOut); $("startTodayBtn").addEventListener("click", ()=>startWorkout(getAssignedToday() || recommendationFromReadiness().plan)); $("updateRecommendationBtn").addEventListener("click", updateTodayUI); $("rebalanceWeekBtn").addEventListener("click", async()=>{ await rebalanceRemaining(localISO()); await refreshAll(); toast("Week rebalanced."); });
  document.querySelectorAll(".plan-btn").forEach(b=>b.addEventListener("click", async()=>{ await setDayPlan(localISO(), b.dataset.plan, true); }));
  document.querySelectorAll(".session-plan-btn").forEach(b=>b.addEventListener("click", ()=>renderSession(b.dataset.plan)));
  document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click", ()=>showPanel(b.dataset.panel)));
  $("finishWorkoutBtn").addEventListener("click", finishWorkout); $("saveCheckinBtn").addEventListener("click", saveCheckin); $("saveEquipmentBtn").addEventListener("click", saveEquipment); $("saveProgramBtn").addEventListener("click", ()=>saveProgramSettings());
  els.weeklyPlanList.addEventListener("click", async(e)=>{ const btn=e.target.closest("button[data-change-day]"); if (!btn) return; await setDayPlan(btn.dataset.changeDay, btn.dataset.plan, true); });
  els.sessionExercises.addEventListener("click", e=>{ const card=e.target.closest(".exercise-card"); if (!card) return; if (e.target.classList.contains("add-set")) { const name=card.dataset.exerciseName; const type=card.dataset.exerciseType; const container=card.querySelector(".sets-container"); const ex={ name, type, reps:type==="run"?"":10, defaultWeight:"" }; container.insertAdjacentHTML("beforeend", setRow(ex, container.children.length)); [...container.children].forEach((r,i)=>r.querySelector(".set-num").textContent=i+1); bindSetInputs(); }
    if (e.target.classList.contains("remove-set")) { const row=e.target.closest(".set-row"); const container=row.parentElement; if (container.children.length>1) row.remove(); [...container.children].forEach((r,i)=>r.querySelector(".set-num").textContent=i+1); }
    if (e.target.classList.contains("copy-first-set")) { const rows=[...card.querySelectorAll(".set-row")]; if (!rows.length) return; const first=rows[0]; const vals=[...first.querySelectorAll("input")].map(i=>i.value); rows.slice(1).forEach(r=>[...r.querySelectorAll("input")].forEach((inp,i)=>inp.value=vals[i])); bindSetInputs(); toast("Set 1 copied."); }
  });
}
async function init() { wireEvents(); els.dateLine.textContent=prettyDate(localISO()); if (!appConfigured) { els.setupWarning.classList.remove("hidden"); setLoggedIn(false); return; } const { data } = await supabaseClient.auth.getUser(); if (data.user) { currentUser=data.user; setLoggedIn(true); await bootApp(); if (pendingAction) { localStorage.removeItem("pendingAction"); pendingAction=null; startWorkout(); } } else { setLoggedIn(false); updateTodayUI(); } }
window.addEventListener("error", (e)=>{ console.error(e.error || e.message); toast("Something broke. Check console for details.", true); });
init();
