// Hybrid OS v9 — V2.0 hybrid athlete operating system
const SUPABASE_URL = "https://nlsnycwlmoukxgojrkpe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sc255Y3dsbW91a3hnb2pya3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzQ5NjIsImV4cCI6MjA5NjUxMDk2Mn0.Q_5R8vel8YmExTY3ztk3toHBuW1xLKUjVFzKeBbIwE4";

const appConfigured = !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
const supabaseClient = appConfigured ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let currentUser = null;
let selectedDate = localDateISO(new Date());
let selectedPlan = "Workout A";
let currentWeekPlan = [];
let baselines = {};
let equipmentMode = "full";
let programState = { active_week: 1, advance_mode: "completed_lifts", lifts_required: 3, week_started_at: null };

const id = (x) => document.getElementById(x);
const els = {
  setupWarning:id("setupWarning"), authView:id("authView"), appView:id("appView"), bottomNav:id("bottomNav"), logoutBtn:id("logoutBtn"),
  authMessage:id("authMessage"), todayDateLabel:id("todayDateLabel"), todayTitle:id("todayTitle"), todayDetails:id("todayDetails"),
  todayStatus:id("todayStatus"), cycleRing:id("cycleRing"), cycleLabel:id("cycleLabel"), cycleType:id("cycleType"), weeklyPlan:id("weeklyPlan"),
  swapMessage:id("swapMessage"), changeHeading:id("changeHeading"), planHeading:id("planHeading"), equipmentLabel:id("equipmentLabel"), workoutBuilder:id("workoutBuilder"),
  workoutMessage:id("workoutMessage"), progressList:id("progressList"), autoLifts:id("autoLifts"), autoRuns:id("autoRuns"), checkinMessage:id("checkinMessage"),
  prefsMessage:id("prefsMessage"), historyList:id("historyList"), equipmentMode:id("equipmentMode"), programWeekSelect:id("programWeekSelect"), advanceMode:id("advanceMode"), liftsRequired:id("liftsRequired"), programMessage:id("programMessage"), programStatus:id("programStatus")
};

const baseTemplates = {
  "Workout A": [
    { name:"Back Squat", note:"Primary compound. 3x5, RPE 7–8. Never sacrifice progression.", sets:3, target:"3x5", defaultWeight:"", group:"main" },
    { name:"Clean and Press", note:"Standing press priority. Double progression. Stay at 85 until 5/5/5.", sets:3, target:"3x5", defaultWeight:85, group:"main" },
    { name:"Romanian Deadlift", note:"Controlled hinge. Hamstrings/glutes. Do not chase failure.", sets:3, target:"3x8", defaultWeight:"", group:"main" },
    { name:"Incline Dumbbell Press", note:"Upper chest priority. Shoulder blades down/back.", sets:3, target:"3x8–10", defaultWeight:"", group:"upper" },
    { name:"Lateral Raise", note:"Shoulders/glamour work. Clean reps, no swinging.", sets:3, target:"3x12–15", defaultWeight:"", group:"accessory" },
    { name:"Hammer Curl", note:"Biceps 1 of 2. Quality arm work is programmed, not optional.", sets:3, target:"3x10–12", defaultWeight:"", group:"accessory" },
    { name:"Incline Curl", note:"Biceps 2 of 2. Full stretch, controlled reps.", sets:3, target:"3x10–12", defaultWeight:"", group:"accessory" },
    { name:"Rope Pushdown", note:"Triceps 1 of 2. Controlled lockout.", sets:3, target:"3x10–12", defaultWeight:"", group:"accessory" },
    { name:"Overhead Triceps Extension", note:"Triceps 2 of 2. Long-head emphasis.", sets:3, target:"3x10–12", defaultWeight:"", group:"accessory" },
    { name:"Zone 2 Run", note:"Post-lift: non-negotiable. Conversational pace. Pace does not matter.", sets:1, target:"15–20 min", isRun:true, defaultWeight:20 }
  ],
  "Workout B": [
    { name:"Bench Press", note:"Primary compound. Face pulls + dead bugs first.", sets:3, target:"3x5", defaultWeight:"", group:"main" },
    { name:"Front Squat", note:"Secondary compound. Clean reps, upright torso.", sets:3, target:"3x5", defaultWeight:"", group:"main" },
    { name:"Pull-Ups", note:"Primary pull. Bodyweight or assisted. Track reps.", sets:3, target:"3 sets", defaultWeight:0, group:"main" },
    { name:"Dips", note:"Primary push. Add weight only when reps are owned.", sets:3, target:"3 sets", defaultWeight:0, group:"main" },
    { name:"Incline Dumbbell Press", note:"Upper chest stays a priority.", sets:2, target:"2x8–10", defaultWeight:"", group:"upper" },
    { name:"Lateral Raise", note:"Shoulders every upper workout.", sets:3, target:"3x12–15", defaultWeight:"", group:"accessory" },
    { name:"Rear Delt Fly", note:"Rear delts/scapular balance. Optional if time is crushed.", sets:2, target:"2x12–15", defaultWeight:"", group:"accessory" },
    { name:"EZ Curl", note:"Biceps 1 of 2. Quality arm work is programmed.", sets:3, target:"3x10–12", defaultWeight:"", group:"accessory" },
    { name:"Hammer Curl", note:"Biceps 2 of 2. Clean reps.", sets:3, target:"3x10–12", defaultWeight:"", group:"accessory" },
    { name:"Rope Pushdown", note:"Triceps 1 of 2. Controlled lockout.", sets:3, target:"3x10–12", defaultWeight:"", group:"accessory" },
    { name:"Skull Crusher", note:"Triceps 2 of 2. Use pain-free ROM.", sets:3, target:"3x10–12", defaultWeight:"", group:"accessory" },
    { name:"Zone 2 Run", note:"Post-lift: non-negotiable. Conversational pace.", sets:1, target:"15–20 min", isRun:true, defaultWeight:20 }
  ],
  "Run": [{ name:"Zone 2 Run", note:"RPE 4–5. Complete the session and stay in Zone 2. Pace does not matter.", sets:1, target:"20–30 min", isRun:true, defaultWeight:30 }],
  "Rest": [{ name:"Walk / Mobility", note:"Recovery, walking, family time. Optional mobility.", sets:1, target:"Optional", isRun:true, defaultWeight:0 }]
};

const substitutions = {
  hotel: {"Back Squat":"Goblet Squat","Clean and Press":"DB Clean + Push Press","Romanian Deadlift":"DB Romanian Deadlift","Bench Press":"DB Bench Press","Front Squat":"Goblet Front Squat","Pull-Ups":"Lat Pulldown / Cable Row","Dips":"DB Floor Press","Lateral Raise":"DB Lateral Raise","Rear Delt Fly":"DB Rear Delt Fly","Rope Pushdown":"Cable Pushdown","Overhead Triceps Extension":"DB Overhead Triceps Extension","Skull Crusher":"DB Skull Crusher"},
  dumbbells: {"Back Squat":"DB Goblet Squat","Clean and Press":"DB Clean + Press","Romanian Deadlift":"DB Romanian Deadlift","Bench Press":"DB Floor Press","Front Squat":"DB Front Squat","Pull-Ups":"1-Arm DB Row","Dips":"Close-Grip Push-Up","Lateral Raise":"DB Lateral Raise","Rear Delt Fly":"DB Rear Delt Fly","Rope Pushdown":"DB Triceps Kickback","Overhead Triceps Extension":"DB Overhead Triceps Extension","Skull Crusher":"DB Skull Crusher"},
  bodyweight: {"Back Squat":"Bulgarian Split Squat","Clean and Press":"Pike Push-Up","Romanian Deadlift":"Single-Leg Hip Hinge","Bench Press":"Push-Up","Front Squat":"Tempo Split Squat","Pull-Ups":"Towel Row / Doorframe Row","Dips":"Bench Dip","Lateral Raise":"Prone Y Raise","Rear Delt Fly":"Prone T Raise","Rope Pushdown":"Close-Grip Push-Up","Overhead Triceps Extension":"Bodyweight Triceps Extension","Skull Crusher":"Bodyweight Triceps Extension"}
};

const defaultWeek = [
  { dow:1, day:"Mon", plan:"Workout A", detail:"Lift + 15–20 Zone 2" },
  { dow:2, day:"Tue", plan:"Run", detail:"20–30 Zone 2" },
  { dow:3, day:"Wed", plan:"Workout B", detail:"Lift + 15–20 Zone 2" },
  { dow:4, day:"Thu", plan:"Run", detail:"20–30 Zone 2" },
  { dow:5, day:"Fri", plan:"Workout A", detail:"Alternate A/B + 15–20 Zone 2" },
  { dow:6, day:"Sat", plan:"Rest", detail:"Walk, family, mobility" },
  { dow:0, day:"Sun", plan:"Rest", detail:"Check-in + recovery" },
];

const cycleInfo = {
  1:{type:"Build",title:"Week 1 — Establish",text:"Use clean working weights. RPE 7–8."},2:{type:"Build",title:"Week 2 — Add",text:"Add only when reps are owned."},3:{type:"Build",title:"Week 3 — Push",text:"Hardest build week. No grinding."},4:{type:"Deload",title:"Week 4 — Deload",text:"~80% load and 2 working sets."},5:{type:"Build",title:"Week 5 — Rebuild",text:"Second build wave."},6:{type:"Build",title:"Week 6 — Add",text:"Progress only when reps are owned."},7:{type:"Build",title:"Week 7 — Peak",text:"Strongest build week."},8:{type:"Deload",title:"Week 8 — Deload",text:"Reduce weight and volume."}
};

function localDateISO(d){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,"0"); const day=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
function parseLocalDate(iso){ const [y,m,d]=iso.split("-").map(Number); return new Date(y,m-1,d); }
function addDaysISO(iso,days){ const d=parseLocalDate(iso); d.setDate(d.getDate()+days); return localDateISO(d); }
function todayISO(){ return localDateISO(new Date()); }
function weekStartISO(ref = new Date()){ const d = new Date(ref); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day; d.setDate(d.getDate()+diff); return localDateISO(d); }
function getCycleWeek(){ return Number(programState?.active_week || 1); }
function isDeloadWeek(){ return [4,8].includes(getCycleWeek()); }
function nextCycleWeek(w){ return w >= 8 ? 1 : w + 1; }
function isLift(p){ return p === "Workout A" || p === "Workout B"; }
function showMessage(el,msg,isError=false){ el.textContent=msg; el.style.color=isError?"#ff3b30":"#1c1c1e"; }
function setLoggedIn(loggedIn){ els.authView.classList.toggle("hidden", loggedIn); els.appView.classList.toggle("hidden", !loggedIn); els.logoutBtn.classList.toggle("hidden", !loggedIn); els.bottomNav.classList.toggle("hidden", !loggedIn); }
function displayDate(iso){ return parseLocalDate(iso).toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"}); }
function detailFor(plan){ if(plan==="Workout A")return "Compound-first lower/press + arms/shoulders + 15–20 Zone 2."; if(plan==="Workout B")return "Bench/front squat/pull-ups/dips + arms/shoulders + 15–20 Zone 2."; if(plan==="Run")return "20–30 minutes Zone 2. Complete it; pace does not matter."; return "Recovery, walking, family time."; }
function statusLabel(row){ if(row.is_locked || row.status==="complete") return "Complete"; if(row.status==="rest") return "Rest"; if(row.status==="modified") return "Modified"; if(row.status==="skipped") return "Skipped"; return "Planned"; }
function getActivePlan(row){ return row.actual_workout || row.planned_workout; }

function getTemplates(){
  if(equipmentMode === "full") return baseTemplates;
  const map = substitutions[equipmentMode] || {};
  const cloned = JSON.parse(JSON.stringify(baseTemplates));
  Object.keys(cloned).forEach(k => cloned[k].forEach(ex => { if(map[ex.name]){ ex.originalName = ex.name; ex.name = map[ex.name]; ex.note = `${ex.note} · Travel substitute for ${ex.originalName}.`; }}));
  return cloned;
}

async function ensureWeekPlan(){
  const start = weekStartISO();
  const existing = await supabaseClient.from("daily_schedule").select("*").eq("user_id", currentUser.id).eq("week_start", start).order("workout_date");
  if(existing.error) throw existing.error;
  if(existing.data && existing.data.length >= 7){ currentWeekPlan = existing.data; return; }
  const rows = defaultWeek.map((x,i)=>({ user_id:currentUser.id, week_start:start, workout_date:addDaysISO(start,i), planned_workout:x.plan, actual_workout:null, status:"planned", is_locked:false, is_manual_override:false }));
  await supabaseClient.from("daily_schedule").upsert(rows,{onConflict:"user_id,workout_date"});
  const fresh = await supabaseClient.from("daily_schedule").select("*").eq("user_id", currentUser.id).eq("week_start", start).order("workout_date");
  currentWeekPlan = fresh.data || [];
}
async function loadWeekPlan(){ await ensureWeekPlan(); }

async function changeDayPlan(dateISO, newPlan, rebalance=true){
  const row = currentWeekPlan.find(x=>x.workout_date===dateISO);
  if(!row) return;
  if(row.is_locked || row.status === "complete") return showMessage(els.swapMessage,"That day is locked because it was completed.",true);
  const newStatus = newPlan === "Rest" ? "rest" : "modified";
  await supabaseClient.from("daily_schedule").upsert({
    user_id:currentUser.id, week_start:weekStartISO(), workout_date:dateISO,
    planned_workout:newPlan, actual_workout:newPlan, status:newStatus, is_locked:false, is_manual_override:true
  },{onConflict:"user_id,workout_date"});
  if(rebalance) await rebalanceWeekAfter(dateISO);
  await loadWeekPlan();
  selectedDate = dateISO;
  selectedPlan = newPlan;
  renderAll();
  showMessage(els.swapMessage, `${displayDate(dateISO)} changed to ${newPlan}. Week rebalanced.`);
}
async function changeSelectedDay(plan){ await changeDayPlan(selectedDate, plan, true); }

async function rebalanceWeekAfter(changedDate){
  await loadWeekPlan();
  const start = weekStartISO();
  const today = todayISO();
  const firstRebalanceDate = addDaysISO(changedDate, 1);
  const futureRows = currentWeekPlan.filter(r => r.workout_date >= firstRebalanceDate && !r.is_locked && r.status !== "complete");
  const fixedRows = currentWeekPlan.filter(r => !futureRows.some(f=>f.workout_date===r.workout_date));

  const completedOrFixedPlans = fixedRows.map(r => getActivePlan(r));
  const liftSeq = ["Workout A","Workout B","Workout A"];
  const usedLifts = completedOrFixedPlans.filter(isLift);
  let remainingLifts = liftSeq.filter((_,idx)=>idx >= usedLifts.length);
  let remainingRuns = Math.max(0, 2 - completedOrFixedPlans.filter(p=>p==="Run").length);

  const updates = [];
  for(const row of futureRows){
    const d = parseLocalDate(row.workout_date);
    const dow = d.getDay();
    let plan = "Rest";
    if(dow >= 1 && dow <= 5){
      if(remainingLifts.length && (dow === 1 || dow === 2 || dow === 3 || (remainingRuns === 0))) plan = remainingLifts.shift();
      else if(remainingRuns > 0){ plan = "Run"; remainingRuns--; }
      else if(remainingLifts.length) plan = remainingLifts.shift();
    }
    updates.push({ id:row.id, planned_workout:plan, actual_workout:null, status:"planned", is_manual_override:false });
  }
  for(const u of updates){ await supabaseClient.from("daily_schedule").update(u).eq("id",u.id); }
}

async function resetUnlockedWeek(){
  const start=weekStartISO();
  await loadWeekPlan();
  const rows = currentWeekPlan.map((row,i)=>{
    const def = defaultWeek[i];
    if(row.is_locked || row.status === "complete") return null;
    return {id:row.id, planned_workout:def.plan, actual_workout:null, status:"planned", is_manual_override:false};
  }).filter(Boolean);
  for(const r of rows){ await supabaseClient.from("daily_schedule").update(r).eq("id",r.id); }
  await loadWeekPlan();
  const todayRow=currentWeekPlan.find(x=>x.workout_date===todayISO()) || currentWeekPlan[0];
  selectedDate=todayRow.workout_date; selectedPlan=getActivePlan(todayRow);
  renderAll();
  showMessage(els.swapMessage,"Unlocked days reset to the default week.");
}

function renderToday(){
  const row=currentWeekPlan.find(x=>x.workout_date===selectedDate) || currentWeekPlan.find(x=>x.workout_date===todayISO()) || currentWeekPlan[0];
  if(!row) return;
  selectedPlan = getActivePlan(row);
  const wk=getCycleWeek();
  els.todayDateLabel.textContent = row.workout_date===todayISO() ? `Today · ${displayDate(row.workout_date)}` : displayDate(row.workout_date);
  els.todayTitle.textContent = selectedPlan;
  els.todayDetails.textContent = detailFor(selectedPlan);
  els.todayStatus.textContent = statusLabel(row);
  els.changeHeading.textContent = `Change ${row.workout_date===todayISO()?"today":displayDate(row.workout_date)}`;
  els.cycleRing.textContent=wk; els.cycleLabel.textContent=`Week ${wk}`; els.cycleType.textContent=cycleInfo[wk].type;
  document.querySelectorAll(".swap-pill").forEach(b=>b.classList.toggle("active", b.dataset.plan===selectedPlan));
}
function renderWeeklyPlan(){
  els.weeklyPlan.innerHTML = currentWeekPlan.map(row=>{
    const d=parseLocalDate(row.workout_date);
    const day=d.toLocaleDateString(undefined,{weekday:"short"});
    const plan=getActivePlan(row);
    const selected=row.workout_date===selectedDate;
    const today=row.workout_date===todayISO();
    const locked=row.is_locked||row.status==="complete";
    const tag=statusLabel(row);
    const cls = tag.toLowerCase();
    return `<article class="day-card ${selected?"selected":""} ${locked?"locked":""}" data-date="${row.workout_date}">
      <div><strong>${day} · ${plan}</strong><span>${today?"Today · ":""}${detailFor(plan)}</span></div>
      <div class="day-tag ${cls}">${locked?"✓ ":""}${tag}</div>
    </article>`;
  }).join("");
}
function renderAll(){ renderToday(); renderWeeklyPlan(); renderWorkoutBuilder(); renderProgressShell(); renderCheckinCounts(); }
function showPanel(panelId){ document.querySelectorAll(".panel").forEach(p=>p.classList.add("hidden")); id(panelId).classList.remove("hidden"); document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active", b.dataset.panel===panelId)); window.scrollTo({top:0}); }

function getBaselineWeight(name,fallback){ const row=baselines[name]; if(row && row.current_working_weight!==null && row.current_working_weight!==undefined) return row.current_working_weight; return fallback; }
function targetRepsFromText(target){ if(!target) return 5; if(target.includes("15")) return 15; if(target.includes("12")) return 12; if(target.includes("10")) return 10; if(target.includes("8")) return 8; return 5; }
function rowHtml(setIndex,ex){ const isRun=!!ex.isRun; const baseline=getBaselineWeight(ex.name,ex.defaultWeight); const repsDefault=isRun?"":targetRepsFromText(ex.target); const w=baseline===0?"0":(baseline||""); return `<div class="set-row" data-set-index="${setIndex}"><span class="set-num">${setIndex+1}</span><input class="set-weight" type="number" inputmode="decimal" step="2.5" placeholder="${isRun?"target":"lb"}" value="${w}" /><input class="set-reps" type="number" inputmode="numeric" placeholder="${isRun?"min":"reps"}" value="${isRun?"":repsDefault}" /><input class="set-rpe" type="number" inputmode="decimal" step="0.5" placeholder="RPE" /><button class="remove-set" type="button">×</button></div>`; }
function renderWorkoutBuilder(){ const templates=getTemplates(); const plan=templates[selectedPlan]||templates["Workout A"]; els.planHeading.textContent=`${displayDate(selectedDate)} · ${selectedPlan}`; els.equipmentLabel.textContent=equipmentMode==="full"?"Full gym":`Travel mode: ${equipmentMode}`; els.workoutBuilder.innerHTML=plan.map((ex,i)=>`<article class="exercise-card" data-exercise-index="${i}" data-exercise-name="${ex.name}" data-is-run="${ex.isRun?"true":"false"}" data-target="${ex.target}" data-group="${ex.group||""}"><div class="exercise-head"><div class="exercise-name">${ex.name}</div><div class="exercise-note">${ex.note}</div><div><span class="badge">${ex.target}</span></div></div><div class="set-header"><span>Set</span><span>${ex.isRun?"Target":"Weight"}</span><span>${ex.isRun?"Done":"Reps"}</span><span>RPE</span><span></span></div><div class="sets-container">${Array.from({length:ex.sets}).map((_,idx)=>rowHtml(idx,ex)).join("")}</div><button class="copy-first-set" type="button">Copy set 1 to all</button><button class="add-set" type="button">+ Add set</button></article>`).join(""); bindRowHighlightListeners(); }
function bindRowHighlightListeners(){ document.querySelectorAll(".set-row").forEach(row=>{ const evalRow=()=>{ const w=row.querySelector(".set-weight").value; const r=row.querySelector(".set-reps").value; row.classList.toggle("filled",!!w||!!r); }; evalRow(); row.querySelectorAll("input").forEach(input=>input.addEventListener("input",evalRow)); }); }
function collectExerciseRows(){ const exercises=[]; document.querySelectorAll(".exercise-card").forEach(card=>{ const name=card.dataset.exerciseName; const isRun=card.dataset.isRun==="true"; const target=card.dataset.target || ""; const group=card.dataset.group || ""; const rows=[]; card.querySelectorAll(".set-row").forEach((row,idx)=>{ const weight=Number(row.querySelector(".set-weight").value||0); const reps=Number(row.querySelector(".set-reps").value||0); const rpe=Number(row.querySelector(".set-rpe").value||0); if(weight>0||reps>0||rpe>0) rows.push({set_number:idx+1,weight,reps,rpe}); }); if(rows.length) exercises.push({name,isRun,target,group,rows}); }); return exercises; }

function progressionDecision(exerciseName, weight, repsArray, targetText="", group="") {
  const lower = exerciseName.toLowerCase();
  const targetReps = targetRepsFromText(targetText);
  const hitAll = repsArray.length >= 2 && repsArray.every(r => r >= targetReps);
  const lowerBody = lower.includes("squat") || lower.includes("deadlift");
  const cleanPress = lower.includes("clean") && lower.includes("press");
  const isMain = group === "main" || ["back squat","clean and press","bench press","front squat","pull-ups","dips","romanian deadlift"].some(n => lower.includes(n));

  if (isDeloadWeek() && isMain) return { nextWeight: Math.round(weight * 0.8), decision: "Deload main lift: use ~80% and 2 working sets.", hitAll, isMain };
  if (cleanPress) return hitAll ? { nextWeight: weight + 5, decision: "Clean & Press owned. Add 5 lb next exposure.", hitAll, isMain } : { nextWeight: weight, decision: "Clean & Press double progression: repeat this weight until all reps are owned.", hitAll, isMain };
  if (isMain && hitAll) return { nextWeight: weight + (lowerBody ? 5 : 5), decision: `Main lift owned. Add ${lowerBody ? "5" : "2.5–5"} lb next exposure.`, hitAll, isMain };
  if (isMain) return { nextWeight: weight, decision: "Main lift: repeat weight until target reps are owned.", hitAll, isMain };
  if (hitAll) return { nextWeight: weight, decision: "Accessory owned. Keep quality high; add a small amount next time only if form stays clean.", hitAll, isMain };
  return { nextWeight: weight, decision: "Accessory: repeat this load and own the reps. Do not force progression.", hitAll, isMain };
}
async function saveWorkout(){
  const scheduleRow = currentWeekPlan.find(x=>x.workout_date===selectedDate);
  if(scheduleRow?.is_locked || scheduleRow?.status==="complete") return showMessage(els.workoutMessage,"This day is already complete and locked.",true);
  const exercises=collectExerciseRows(); const notes=id("workoutNotes").value;
  if(!exercises.length && !notes.trim()) return showMessage(els.workoutMessage,"Enter at least one set or notes.",true);
  const {data:workout,error:workoutError}=await supabaseClient.from("workout_logs").insert({user_id:currentUser.id,date:selectedDate,workout_type:selectedPlan,cycle_week:getCycleWeek(),is_deload:isDeloadWeek(),notes}).select().single();
  if(workoutError) return showMessage(els.workoutMessage,workoutError.message,true);
  const setRows=[],runRows=[];
  exercises.forEach(ex=>{ if(ex.isRun){ const first=ex.rows[0]; runRows.push({user_id:currentUser.id,date:selectedDate,run_type:ex.name,target_minutes:first.weight||0,completed_minutes:first.reps||0,rpe:first.rpe||0,notes:`${selectedPlan} · ${notes||""}`}); } else { ex.rows.forEach(row=>setRows.push({workout_log_id:workout.id,exercise_name:ex.name,weight:row.weight,reps:row.reps,set_number:row.set_number,rpe:row.rpe,completed:true})); }});
  if(setRows.length){ const {error}=await supabaseClient.from("exercise_sets").insert(setRows); if(error) return showMessage(els.workoutMessage,error.message,true); }
  if(runRows.length){ const {error}=await supabaseClient.from("run_logs").insert(runRows); if(error) return showMessage(els.workoutMessage,error.message,true); }
  for(const ex of exercises.filter(e=>!e.isRun)){ const usable=ex.rows.filter(r=>r.reps>0); if(!usable.length) continue; const weight=usable[usable.length-1].weight; const repsArray=usable.map(r=>r.reps); const {nextWeight,decision,hitAll,isMain}=progressionDecision(ex.name,weight,repsArray,ex.target,ex.group); const existing=baselines[ex.name]; let missCount=hitAll?0:((existing?.miss_count||0)+1); let finalNextWeight=nextWeight, finalDecision=decision; if(isMain && !hitAll && missCount>=2 && !isDeloadWeek()){ finalNextWeight=Math.round(weight*.9); finalDecision="Missed twice: reduce load about 10% and rebuild."; missCount=0; } await supabaseClient.from("lift_baselines").upsert({user_id:currentUser.id,exercise_name:ex.name,current_working_weight:finalNextWeight,target_sets:3,target_reps:5,last_result:`${weight} x ${repsArray.join(",")}`,miss_count:missCount,next_decision:finalDecision,updated_at:new Date().toISOString()},{onConflict:"user_id,exercise_name"}); }
  await supabaseClient.from("daily_schedule").update({actual_workout:selectedPlan,status:"complete",is_locked:true}).eq("user_id",currentUser.id).eq("workout_date",selectedDate);
  const advanced = await maybeAdvanceProgramWeek(selectedPlan);
  showMessage(els.workoutMessage, advanced ? "Saved. Day locked. You logged enough lifts, so the program advanced to the next week." : "Saved. Day marked complete and locked.");
  await loadWeekPlan(); await loadProgress(); await loadHistory(); await renderCheckinCounts(); renderAll(); renderProgramControls(); renderV2Spec();
}

async function loadProgress(){ const {data,error}=await supabaseClient.from("lift_baselines").select("*").eq("user_id",currentUser.id).order("updated_at",{ascending:false}); if(error){ els.progressList.innerHTML=`<p class="muted">${error.message}</p>`; return; } baselines={}; (data||[]).forEach(row=>baselines[row.exercise_name]=row); renderProgressShell(); }
function renderProgressShell(){ const data=Object.values(baselines); els.progressList.innerHTML=data.length?data.map(row=>`<article class="progress-item"><strong>${row.exercise_name}</strong><div>Next target: ${row.current_working_weight??0} lb</div><div class="muted small">Last: ${row.last_result||"—"} · Misses: ${row.miss_count||0}</div><div class="progress-decision">${row.next_decision||"Repeat until owned."}</div></article>`).join(""):`<p class="muted">No lift baselines yet. Log a workout to start.</p>`; }
async function loadHistory(){ const [workouts,runs]=await Promise.all([supabaseClient.from("workout_logs").select("*").eq("user_id",currentUser.id).order("created_at",{ascending:false}).limit(10),supabaseClient.from("run_logs").select("*").eq("user_id",currentUser.id).order("created_at",{ascending:false}).limit(5)]); const workoutHtml=(workouts.data||[]).map(row=>`<article class="history-item"><strong>${row.date} · ${row.workout_type}</strong><span class="muted small">Week ${row.cycle_week} ${row.is_deload?"· Deload":"· Build"}</span><p class="muted small">${row.notes||""}</p></article>`).join(""); const runHtml=(runs.data||[]).map(row=>`<article class="history-item"><strong>${row.date} · ${row.run_type}</strong><span class="muted small">${row.completed_minutes||0}/${row.target_minutes||0} min · RPE ${row.rpe||"—"}</span></article>`).join(""); els.historyList.innerHTML=workoutHtml+runHtml||`<p class="muted">No history yet.</p>`; }
async function renderCheckinCounts(){ if(!currentUser) return; const start=weekStartISO(); const end=addDaysISO(start,7); const [sched,runs]=await Promise.all([supabaseClient.from("daily_schedule").select("*").eq("user_id",currentUser.id).eq("week_start",start),supabaseClient.from("run_logs").select("*").eq("user_id",currentUser.id).gte("date",start).lt("date",end)]); const completePlans=(sched.data||[]).filter(x=>x.status==="complete").map(x=>x.actual_workout||x.planned_workout); const lifts=completePlans.filter(isLift).length; const runFromSchedule=completePlans.filter(x=>x==="Run").length; const runFromLogs=(runs.data||[]).filter(x=>(x.completed_minutes||0)>0).length; const totalRuns=Math.max(runFromSchedule,runFromLogs); els.autoLifts.textContent=`${lifts}/3`; els.autoRuns.textContent=`${totalRuns}/4`; return {lifts,runs:totalRuns}; }

async function loadProgramState(){
  const {data,error}=await supabaseClient.from("program_state").select("*").eq("user_id",currentUser.id).maybeSingle();
  if(error){ console.warn(error.message); }
  if(data){
    programState = data;
  } else {
    const fresh = {user_id:currentUser.id, active_week:1, advance_mode:"completed_lifts", lifts_required:3, week_started_at:new Date().toISOString(), updated_at:new Date().toISOString()};
    const res = await supabaseClient.from("program_state").upsert(fresh,{onConflict:"user_id"}).select().single();
    programState = res.data || fresh;
  }
  renderProgramControls();
}
function renderProgramControls(){
  if(!els.programStatus) return;
  const mode = programState.advance_mode || "completed_lifts";
  const required = Number(programState.lifts_required || 3);
  const started = programState.week_started_at ? new Date(programState.week_started_at).toLocaleDateString() : "today";
  els.programStatus.textContent = `Current program week: ${getCycleWeek()} · ${cycleInfo[getCycleWeek()].type} · advances after ${required} completed lifts · started ${started}`;
  if(els.programWeekSelect) els.programWeekSelect.value = String(getCycleWeek());
  if(els.advanceMode) els.advanceMode.value = mode;
  if(els.liftsRequired) els.liftsRequired.value = required;
}
function renderV2Spec(){
  const missionEl = id("v2Mission");
  if(!missionEl) return;
  missionEl.innerHTML = `<article class="info-card"><h3>${v2Mission.title}</h3><p class="muted small">${v2Mission.mission}</p><div class="progress-decision">Non-negotiables: ${v2Mission.nonNegotiables.join(" · ")}</div></article>`;
}
async function saveProgramSettings(){
  const activeWeek = Number(els.programWeekSelect.value || getCycleWeek());
  const payload = { user_id:currentUser.id, active_week:activeWeek, advance_mode:els.advanceMode.value, lifts_required:Number(els.liftsRequired.value||3), week_started_at:new Date().toISOString(), updated_at:new Date().toISOString() };
  const {data,error}=await supabaseClient.from("program_state").upsert(payload,{onConflict:"user_id"}).select().single();
  if(error) return showMessage(els.programMessage,error.message,true);
  programState = data || payload;
  renderAll(); renderProgramControls(); renderV2Spec();
  showMessage(els.programMessage,`Program reset to Week ${getCycleWeek()}. Future workouts will use this period.`);
}
async function advanceProgramWeek(){
  const payload = { user_id:currentUser.id, active_week:nextCycleWeek(getCycleWeek()), week_started_at:new Date().toISOString(), updated_at:new Date().toISOString() };
  const {data,error}=await supabaseClient.from("program_state").upsert({...programState,...payload},{onConflict:"user_id"}).select().single();
  if(error) return showMessage(els.programMessage,error.message,true);
  programState = data || {...programState,...payload};
  renderAll(); renderProgramControls(); renderV2Spec();
  showMessage(els.programMessage,`Advanced to Week ${getCycleWeek()}.`);
}
async function maybeAdvanceProgramWeek(savedWorkoutType){
  if(!isLift(savedWorkoutType)) return false;
  if((programState.advance_mode || "completed_lifts") !== "completed_lifts") return false;
  const required = Number(programState.lifts_required || 3);
  const started = programState.week_started_at || new Date(0).toISOString();
  const wk = getCycleWeek();
  const {data,error}=await supabaseClient.from("workout_logs")
    .select("id,workout_type,created_at")
    .eq("user_id",currentUser.id)
    .eq("cycle_week",wk)
    .in("workout_type",["Workout A","Workout B"])
    .gte("created_at",started);
  if(error){ console.warn(error.message); return false; }
  if((data||[]).length >= required){
    const oldWeek = wk;
    const payload = { user_id:currentUser.id, active_week:nextCycleWeek(oldWeek), week_started_at:new Date().toISOString(), updated_at:new Date().toISOString() };
    const res=await supabaseClient.from("program_state").upsert({...programState,...payload},{onConflict:"user_id"}).select().single();
    programState = res.data || {...programState,...payload};
    return true;
  }
  return false;
}

async function saveCheckin(){ const counts=await renderCheckinCounts(); const {error}=await supabaseClient.from("weekly_checkins").insert({user_id:currentUser.id,week_start:weekStartISO(),body_weight:Number(id("bodyWeight").value||0),waist:Number(id("waist").value||0),lifts_completed:counts?.lifts||0,runs_completed:counts?.runs||0,protein_rating:id("proteinRating").value,recovery_rating:id("recoveryRating").value,notes:id("checkinNotes").value, arm_measurement:Number(id("armMeasurement")?.value||0), zone2_pace:id("zone2Pace")?.value||null, front_photo_note:id("frontPhotoNote")?.value||null, side_photo_note:id("sidePhotoNote")?.value||null}); if(error) return showMessage(els.checkinMessage,error.message,true); showMessage(els.checkinMessage,"Check-in saved."); }
async function loadPrefs(){ const {data}=await supabaseClient.from("user_preferences").select("*").eq("user_id",currentUser.id).maybeSingle(); equipmentMode=data?.equipment_mode||"full"; els.equipmentMode.value=equipmentMode; }
async function savePrefs(){ equipmentMode=els.equipmentMode.value; await supabaseClient.from("user_preferences").upsert({user_id:currentUser.id,equipment_mode:equipmentMode,updated_at:new Date().toISOString()},{onConflict:"user_id"}); showMessage(els.prefsMessage,"Equipment saved."); renderAll(); }
async function signUp(){ const email=id("email").value.trim(); const password=id("password").value; if(!email||!password) return showMessage(els.authMessage,"Enter email and password.",true); const {error}=await supabaseClient.auth.signUp({email,password}); showMessage(els.authMessage,error?error.message:"Account created. Log in.",!!error); }
async function signIn(){ const email=id("email").value.trim(); const password=id("password").value; if(!email||!password) return showMessage(els.authMessage,"Enter email and password.",true); const {data,error}=await supabaseClient.auth.signInWithPassword({email,password}); if(error) return showMessage(els.authMessage,error.message,true); currentUser=data.user; setLoggedIn(true); await bootApp(); }
async function signOut(){ await supabaseClient.auth.signOut(); currentUser=null; setLoggedIn(false); }
function setupEvents(){
  id("signupBtn").addEventListener("click",signUp); id("loginBtn").addEventListener("click",signIn); id("logoutBtn").addEventListener("click",signOut); id("startWorkoutBtn").addEventListener("click",()=>showPanel("workoutPanel")); id("saveWorkoutBtn").addEventListener("click",saveWorkout); id("saveCheckinBtn").addEventListener("click",saveCheckin); id("savePrefsBtn").addEventListener("click",savePrefs); id("saveProgramBtn").addEventListener("click",saveProgramSettings); id("advanceProgramBtn").addEventListener("click",advanceProgramWeek); id("resetWeekBtn").addEventListener("click",resetUnlockedWeek);
  document.querySelectorAll(".swap-pill").forEach(btn=>btn.addEventListener("click",()=>changeSelectedDay(btn.dataset.plan)));
  document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>showPanel(btn.dataset.panel)));
  els.weeklyPlan.addEventListener("click",e=>{ const card=e.target.closest(".day-card"); if(!card) return; selectedDate=card.dataset.date; const row=currentWeekPlan.find(x=>x.workout_date===selectedDate); selectedPlan=getActivePlan(row); renderAll(); showPanel("todayPanel"); });
  els.workoutBuilder.addEventListener("click",e=>{ if(e.target.classList.contains("add-set")){ const card=e.target.closest(".exercise-card"); const templates=getTemplates(); const ex=Object.values(templates).flat().find(x=>x.name===card.dataset.exerciseName)||{name:card.dataset.exerciseName,isRun:card.dataset.isRun==="true",defaultWeight:""}; const container=card.querySelector(".sets-container"); container.insertAdjacentHTML("beforeend",rowHtml(container.children.length,ex)); bindRowHighlightListeners(); } if(e.target.classList.contains("copy-first-set")){ const card=e.target.closest(".exercise-card"); const rows=[...card.querySelectorAll(".set-row")]; if(rows.length){ const first=rows[0]; const vals=[first.querySelector(".set-weight").value, first.querySelector(".set-reps").value, first.querySelector(".set-rpe").value]; rows.slice(1).forEach(row=>{ row.querySelector(".set-weight").value=vals[0]; row.querySelector(".set-reps").value=vals[1]; row.querySelector(".set-rpe").value=vals[2]; row.classList.toggle("filled",!!vals[0]||!!vals[1]); }); }} if(e.target.classList.contains("remove-set")){ const row=e.target.closest(".set-row"); const container=row.parentElement; if(container.children.length>1) row.remove(); [...container.children].forEach((child,index)=>child.querySelector(".set-num").textContent=index+1); } });
}
async function bootApp(){ await loadProgramState(); renderV2Spec(); await loadPrefs(); await loadWeekPlan(); await loadProgress(); const todayRow=currentWeekPlan.find(x=>x.workout_date===todayISO()) || currentWeekPlan[0]; selectedDate=todayRow.workout_date; selectedPlan=getActivePlan(todayRow); renderAll(); await loadHistory(); showPanel("todayPanel"); }
async function init(){ setupEvents(); if(!appConfigured){ els.setupWarning.classList.remove("hidden"); return; } const {data}=await supabaseClient.auth.getUser(); if(data.user){ currentUser=data.user; setLoggedIn(true); await bootApp(); } else { setLoggedIn(false); } }
init();
