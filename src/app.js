import { supabase } from './supabase.js';
import * as db from './services/db.js';
import { toast, withButtonState } from './components/toast.js';
import { localISO, startOfWeekISO, dayLabel, haptic } from './utils.js';
import { DISPLAY, PLANS, getWorkout, recommendedFromReadiness } from './engines/workoutEngine.js';
import { rebalance, todayPlan } from './engines/scheduleEngine.js';
import { progressionDecision } from './engines/progressionEngine.js';

const app = document.getElementById('app');
const state = { user:null, prefs:null, schedule:[], readiness:{}, baselines:{list:[],map:{}}, activePanel:'today', activePlan:null, workoutMode:'full', session:null };

window.addEventListener('error', e => { console.error(e); toast('App error: '+e.message,'error'); });

async function init(){
  const {data} = await supabase.auth.getSession();
  state.user = data.session?.user || null;
  if(state.user) await loadAll();
  render();
  const pending = localStorage.getItem('pendingAction');
  if(state.user && pending === 'startWorkout') { localStorage.removeItem('pendingAction'); setTimeout(()=>startToday(),250); }
}
async function loadAll(){
  state.prefs = await db.getPrefs(state.user.id);
  state.schedule = await db.getWeekSchedule(state.user.id);
  state.readiness = await db.getReadiness(state.user.id);
  state.baselines = await db.getBaselines(state.user.id);
  const today = todayPlan(state.schedule);
  state.activePlan = today?.actual_workout || today?.planned_workout || 'Workout A';
}
function header(){ return `<div class="topbar"><div class="brand"><h1>Hybrid OS</h1><p>${state.user ? 'Hybrid Athlete Operating System' : 'Sign in to continue'}</p></div>${state.user?'<button class="icon-btn" id="logoutBtn">Log out</button>':''}</div>`; }
function nav(){ const tabs=[['today','🏠','Today'],['workout','🏋️','Workout'],['progress','📈','Progress'],['program','📅','Program'],['profile','👤','Profile']]; return `<nav class="bottom-nav">${tabs.map(t=>`<button class="nav-item ${state.activePanel===t[0]?'active':''}" data-panel="${t[0]}"><span>${t[1]}</span>${t[2]}</button>`).join('')}</nav>`; }
function render(){ app.innerHTML = state.user ? `${header()}${screen()}${nav()}` : authScreen(); bind(); }
function authScreen(){ return `<div class="auth-card"><h1>Hybrid OS</h1><p class="muted">Log in to start today’s workout and save your training memory.</p><label>Email</label><input id="email" type="email" autocomplete="email"><label>Password</label><input id="password" type="password" autocomplete="current-password"><button class="btn" id="loginBtn">Log In</button><button class="btn secondary" id="signupBtn">Create Account</button><p class="small muted" id="authMsg"></p></div>`; }
function screen(){ if(state.activePanel==='workout') return workoutScreen(); if(state.activePanel==='progress') return progressScreen(); if(state.activePanel==='program') return programScreen(); if(state.activePanel==='profile') return profileScreen(); return todayScreen(); }
function todayScreen(){
  const item = todayPlan(state.schedule); const assigned = item?.actual_workout || item?.planned_workout || 'Workout A';
  const rec = recommendedFromReadiness(state.readiness, assigned);
  const countsPlaceholder = `<div class="metric"><span class="tiny muted">Week</span><b>${state.prefs.current_program_week || 1}</b></div><div class="metric"><span class="tiny muted">Focus</span><b>${rec==='Recovery'?'Recover':'Build'}</b></div><div class="metric"><span class="tiny muted">Mode</span><b>${state.prefs.equipment_mode?.replace('_',' ') || 'full'}</b></div>`;
  return `<section class="panel"><h2 class="screen-title">Today</h2><div class="hero"><p class="muted small">${dayLabel(localISO())}</p><h1 style="margin:4px 0 4px">${DISPLAY[rec] || rec}</h1><p class="muted">Recommended workout</p><div class="metric-grid" style="margin:16px 0">${countsPlaceholder}</div><ul class="workout-list">${getWorkout(rec,state.prefs.equipment_mode,state.workoutMode).slice(0,6).map(x=>`<li><span>${x.name}</span><span class="muted small">${x.target}</span></li>`).join('')}</ul><button class="btn blue" id="startTodayBtn">Start Today’s Workout</button><button class="btn secondary" id="minWorkoutBtn">I only have 20–30 min</button></div>
  <div class="card"><h3>Need to change?</h3><div class="override-row" style="margin-top:10px">${PLANS.map(p=>`<button class="pill ${assigned===p?'active':''}" data-override="${p}">${DISPLAY[p]}</button>`).join('')}</div></div>
  <div class="card"><h3>Readiness</h3><div class="pill-row" style="margin-top:10px">${['great','good','okay','exhausted'].map(v=>`<button class="pill ${state.readiness.feel===v?'active':''}" data-feel="${v}">${feelEmoji(v)} ${cap(v)}</button>`).join('')}</div><div class="grid-2"><div><label>Available min</label><input id="availableMinutes" type="number" value="${state.readiness.available_minutes||60}"></div><div><label>Sleep score</label><input id="sleepScore" type="number" value="${state.readiness.sleep_score||''}"></div></div><button class="btn secondary" id="saveReadinessBtn">Save Readiness</button></div>
  <div class="card"><h3>This week</h3><ul class="workout-list">${state.schedule.map(x=>`<li><span><span class="status-dot ${x.workout_date===localISO()?'today':''} ${x.status==='complete'?'complete':''}"></span> ${dayLabel(x.workout_date)}</span><span>${DISPLAY[x.actual_workout||x.planned_workout]}</span></li>`).join('')}</ul></div></section>`;
}
function workoutScreen(){
  if(!state.session) return `<section class="panel"><h2 class="screen-title">Workout</h2><div class="empty">No active workout yet.<button class="btn blue" id="startTodayBtn2">Start Today’s Workout</button></div></section>`;
  return `<section class="panel"><h2 class="screen-title">${DISPLAY[state.session.plan]}</h2><div class="card"><p class="muted small">${state.session.mode==='minimum'?'Minimum viable workout':'Full session'} · Autosaves visually, final save on finish.</p></div><div id="exerciseContainer">${state.session.exercises.map((ex,i)=>exerciseCard(ex,i)).join('')}</div><label>Notes</label><textarea id="sessionNotes" placeholder="How did it feel?">${state.session.notes||''}</textarea><button class="btn success" id="finishWorkoutBtn">Finish Workout</button></section>`;
}
function exerciseCard(ex,i){ return `<article class="exercise-card" data-ex="${i}"><div class="exercise-head"><div><div class="exercise-name">${ex.name}</div><div class="exercise-note">${ex.note}</div></div><span class="badge">${ex.target}</span></div><div class="set-header"><span>Set</span><span>${ex.isRun?'Target':'Weight'}</span><span>${ex.isRun?'Done':'Reps'}</span><span>RPE</span><span></span></div><div class="sets">${ex.sets.map((s,j)=>setRow(s,j,ex.isRun)).join('')}</div><button class="copy-set" data-copy="${i}">Copy set 1 to all</button><button class="add-set" data-add="${i}">+ Add set</button></article>`; }
function setRow(s,j,isRun){ return `<div class="set-row" data-set="${j}"><span class="set-num">${j+1}</span><input data-field="weight" inputmode="decimal" type="number" step="2.5" placeholder="${isRun?'target':'lb'}" value="${s.weight??''}"><input data-field="reps" inputmode="decimal" type="number" step="${isRun?'0.01':'1'}" placeholder="${isRun?'min':'reps'}" value="${s.reps??''}"><input data-field="rpe" inputmode="decimal" type="number" step="0.5" placeholder="RPE" value="${s.rpe??''}"><button class="remove-set" data-remove>×</button></div>`; }
function progressScreen(){ return `<section class="panel"><h2 class="screen-title">Progress</h2>${state.baselines.list.length?state.baselines.list.map(row=>`<div class="progress-card"><h3>${row.exercise_name}</h3><p>Next: <b>${row.next_weight ?? row.current_working_weight ?? 0} lb</b></p><p class="muted small">Last: ${row.last_result||'—'} · Misses: ${row.miss_count||0}</p><div class="badge">${row.next_decision||'Repeat until owned.'}</div></div>`).join(''):'<div class="empty">No progress yet. Finish a workout to create baselines.</div>'}</section>`; }
function programScreen(){ const week=state.prefs.current_program_week||1; return `<section class="panel"><h2 class="screen-title">Program</h2><div class="program-card"><h3>Hybrid Athlete OS V2.0</h3><p class="muted">Never miss Zone 2. Never skip direct arm work. Always progress compound lifts.</p><div class="program-grid">${Array.from({length:8}).map((_,i)=>`<div class="week-tile ${(i+1)===week?'active':''} ${[4,8].includes(i+1)?'deload':''}"><b>${i+1}</b><br><span class="tiny">${[4,8].includes(i+1)?'Deload':'Build'}</span></div>`).join('')}</div><button class="btn secondary" id="advanceWeekBtn">Advance Week Manually</button><button class="btn secondary" id="resetWeekBtn">Reset to Week 1</button></div></section>`; }
function profileScreen(){ return `<section class="panel"><h2 class="screen-title">Profile</h2><div class="card"><h3>Equipment</h3><div class="pill-row" style="margin-top:10px">${[['full_gym','Full Gym'],['hotel_gym','Hotel Gym'],['dumbbells','Dumbbells'],['bodyweight','Bodyweight']].map(([v,l])=>`<button class="pill ${state.prefs.equipment_mode===v?'active':''}" data-equipment="${v}">${l}</button>`).join('')}</div></div><div class="card"><h3>Training days</h3><p class="muted small">Default: Monday–Friday only. Saturday and Sunday stay Recovery unless manually overridden.</p></div><div class="card"><h3>App</h3><button class="btn secondary" id="logoutBtn2">Log out</button></div></section>`; }
function bind(){
  document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{ haptic(); state.activePanel=b.dataset.panel; render(); });
  document.getElementById('logoutBtn')?.addEventListener('click', doLogout); document.getElementById('logoutBtn2')?.addEventListener('click', doLogout);
  document.getElementById('loginBtn')?.addEventListener('click', e=>withButtonState(e.currentTarget,'Logging in...', async()=>{ await doLogin(); }));
  document.getElementById('signupBtn')?.addEventListener('click', e=>withButtonState(e.currentTarget,'Creating...', async()=>{ await doSignup(); }));
  document.getElementById('startTodayBtn')?.addEventListener('click', e=>withButtonState(e.currentTarget,'Preparing...', startToday));
  document.getElementById('startTodayBtn2')?.addEventListener('click', e=>withButtonState(e.currentTarget,'Preparing...', startToday));
  document.getElementById('minWorkoutBtn')?.addEventListener('click', e=>withButtonState(e.currentTarget,'Building short version...', async()=>{ state.workoutMode='minimum'; await startToday(); }));
  document.querySelectorAll('[data-override]').forEach(b=>b.onclick=()=>changeToday(b.dataset.override,b));
  document.querySelectorAll('[data-feel]').forEach(b=>b.onclick=()=>{ state.readiness.feel=b.dataset.feel; render(); });
  document.getElementById('saveReadinessBtn')?.addEventListener('click', e=>withButtonState(e.currentTarget,'Saving...', saveReadiness));
  document.querySelectorAll('[data-equipment]').forEach(b=>b.onclick=()=>saveEquipment(b.dataset.equipment));
  document.getElementById('advanceWeekBtn')?.addEventListener('click',()=>setProgramWeek((state.prefs.current_program_week||1)%8+1));
  document.getElementById('resetWeekBtn')?.addEventListener('click',()=>setProgramWeek(1));
  document.getElementById('finishWorkoutBtn')?.addEventListener('click', e=>withButtonState(e.currentTarget,'Saving workout...', finishWorkout));
  document.getElementById('exerciseContainer')?.addEventListener('input', updateSessionFromInput);
  document.getElementById('exerciseContainer')?.addEventListener('click', workoutClick);
}
async function doLogin(){ const email=document.getElementById('email').value.trim(), password=document.getElementById('password').value; const {data,error}=await db.signIn(email,password); if(error) throw error; state.user=data.user; await loadAll(); toast('Logged in','success'); render(); const pending=localStorage.getItem('pendingAction'); if(pending==='startWorkout'){ localStorage.removeItem('pendingAction'); await startToday(); }}
async function doSignup(){ const email=document.getElementById('email').value.trim(), password=document.getElementById('password').value; const {error}=await db.signUp(email,password); if(error) throw error; toast('Account created. Log in.','success'); }
async function doLogout(){ await db.signOut(); state.user=null; state.session=null; render(); }
async function startToday(){ if(!state.user){ localStorage.setItem('pendingAction','startWorkout'); render(); toast('Log in first. I’ll open the workout after.'); return; } const item=todayPlan(state.schedule); const plan=state.activePlan || item?.actual_workout || item?.planned_workout || 'Workout A'; state.session = createSession(plan,state.workoutMode); state.activePanel='workout'; toast('Workout ready','success'); render(); }
function createSession(plan,mode='full'){ const exercises=getWorkout(plan,state.prefs.equipment_mode,mode).map(ex=>({...ex,sets:Array.from({length:ex.sets}).map(()=>({weight:ex.defaultWeight||state.baselines.map[ex.name]?.next_weight||state.baselines.map[ex.name]?.current_working_weight||'',reps:ex.isRun?'':ex.reps,rpe:''}))})); return {plan, mode, started_at:new Date().toISOString(), program_week:state.prefs.current_program_week||1, exercises, notes:''}; }
async function changeToday(plan, btn=null){ async function work(){ const updated=rebalance(state.schedule,localISO(),plan); await db.replaceWeekSchedule(state.user.id,updated); state.schedule=await db.getWeekSchedule(state.user.id); state.activePlan=plan; toast('Week updated','success'); render(); } if(btn) return withButtonState(btn,'Updating...',work); return work(); }
async function saveReadiness(){ const values={feel:state.readiness.feel||'good',available_minutes:Number(document.getElementById('availableMinutes').value||60),sleep_score:Number(document.getElementById('sleepScore').value||0)||null}; await db.saveReadiness(state.user.id, values); state.readiness=await db.getReadiness(state.user.id); toast('Readiness saved','success'); render(); }
async function saveEquipment(mode){ await db.savePrefs(state.user.id,{equipment_mode:mode}); state.prefs=await db.getPrefs(state.user.id); toast('Equipment updated','success'); render(); }
async function setProgramWeek(w){ await db.savePrefs(state.user.id,{current_program_week:w}); state.prefs=await db.getPrefs(state.user.id); toast(`Program set to week ${w}`,'success'); render(); }
function updateSessionFromInput(e){ const card=e.target.closest('.exercise-card'); const row=e.target.closest('.set-row'); if(!card||!row||!state.session) return; const ex=Number(card.dataset.ex), set=Number(row.dataset.set), field=e.target.dataset.field; state.session.exercises[ex].sets[set][field]=e.target.value; e.target.style.background='#effaf1'; setTimeout(()=>e.target.style.background='',400); }
function workoutClick(e){ const add=e.target.closest('[data-add]'), copy=e.target.closest('[data-copy]'), rem=e.target.closest('[data-remove]'); if(add){ const i=Number(add.dataset.add); state.session.exercises[i].sets.push({weight:'',reps:'',rpe:''}); render(); state.activePanel='workout'; } if(copy){ const i=Number(copy.dataset.copy); const first={...state.session.exercises[i].sets[0]}; state.session.exercises[i].sets=state.session.exercises[i].sets.map(()=>({...first})); toast('Set 1 copied','success'); render(); state.activePanel='workout'; } if(rem){ const card=e.target.closest('.exercise-card'), row=e.target.closest('.set-row'); const i=Number(card.dataset.ex), j=Number(row.dataset.set); if(state.session.exercises[i].sets.length>1) state.session.exercises[i].sets.splice(j,1); render(); state.activePanel='workout'; }}
async function finishWorkout(){ state.session.notes=document.getElementById('sessionNotes')?.value||''; const log=await db.saveWorkoutSession(state.user.id,state.session); for(const ex of state.session.exercises.filter(x=>!x.isRun)){ const usable=ex.sets.filter(s=>Number(s.weight)>0 && Number(s.reps)>0); if(!usable.length) continue; const weight=Number(usable[usable.length-1].weight), reps=usable.map(s=>Number(s.reps)); const dec=progressionDecision(ex.name,weight,reps,[4,8].includes(state.prefs.current_program_week)); await db.updateBaseline(state.user.id,{exercise_name:ex.name,current_working_weight:weight,next_weight:dec.nextWeight,miss_count:dec.hit?0:((state.baselines.map[ex.name]?.miss_count||0)+1),last_result:`${weight} x ${reps.join('/')}`,next_decision:dec.decision}); }
  state.session=null; await loadAll(); state.activePanel='today'; toast('Workout saved. Progress updated.','success'); render(); showFinishModal(log.workout_type); }
function showFinishModal(plan){ const div=document.createElement('div'); div.className='modal-backdrop'; div.innerHTML=`<div class="modal"><div class="confetti">✅</div><h3>Workout Saved</h3><p class="muted">${DISPLAY[plan]} is complete. Your day is locked and progress was updated.</p><button class="btn" id="closeModal">Back to Today</button></div>`; document.body.appendChild(div); div.querySelector('#closeModal').onclick=()=>div.remove(); }
function feelEmoji(v){ return {great:'😁',good:'🙂',okay:'😐',exhausted:'😴'}[v]||'🙂'; } function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

init();
