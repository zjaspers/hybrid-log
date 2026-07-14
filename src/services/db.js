import { supabase } from '../supabase.js';
import { localISO, startOfWeekISO } from '../utils.js';
import { buildWeek } from '../engines/scheduleEngine.js';
import { DEFAULT_PROGRAM } from '../data/defaultProgram.js';

export async function getUser(){ const {data} = await supabase.auth.getUser(); return data.user; }
export async function signIn(email,password){ return supabase.auth.signInWithPassword({email,password}); }
export async function signUp(email,password){ return supabase.auth.signUp({email,password}); }
export async function signOut(){ return supabase.auth.signOut(); }

export async function getPrefs(user_id){
  let {data,error}=await supabase.from('user_preferences').select('*').eq('user_id',user_id).maybeSingle();
  if(error) throw error;
  if(!data){ const res=await supabase.from('user_preferences').insert({user_id}).select().single(); if(res.error) throw res.error; data=res.data; }
  return data;
}
export async function savePrefs(user_id, patch){ const {error}=await supabase.from('user_preferences').upsert({user_id,...patch,updated_at:new Date().toISOString()},{onConflict:'user_id'}); if(error) throw error; }
export async function getWeekSchedule(user_id, program, week_start=startOfWeekISO()){
  const week = buildWeek(program, week_start);
  const {data,error}=await supabase.from('daily_schedule').select('*').eq('user_id',user_id).gte('workout_date',week[0].workout_date).lte('workout_date',week[6].workout_date).order('workout_date');
  if(error) throw error;
  const existing = data || [];
  const missing = week.filter(d=>!existing.some(x=>x.workout_date===d.workout_date)).map(d=>({user_id,week_start,...d}));
  if(missing.length){ const ins=await supabase.from('daily_schedule').insert(missing); if(ins.error) throw ins.error; return getWeekSchedule(user_id,program,week_start); }
  return existing;
}
export async function replaceWeekSchedule(user_id, schedule, week_start=startOfWeekISO()){
  const rows=schedule.map(r=>({user_id,week_start,workout_date:r.workout_date,planned_workout:r.planned_workout,actual_workout:r.actual_workout,status:r.status,locked:!!r.locked}));
  const {error}=await supabase.from('daily_schedule').upsert(rows,{onConflict:'user_id,workout_date'}); if(error) throw error;
}
export async function saveReadiness(user_id, values){
  const {error}=await supabase.from('readiness_logs').upsert({user_id,readiness_date:localISO(),...values},{onConflict:'user_id,readiness_date'}); if(error) throw error;
}
export async function getReadiness(user_id){ const {data,error}=await supabase.from('readiness_logs').select('*').eq('user_id',user_id).eq('readiness_date',localISO()).maybeSingle(); if(error) throw error; return data || {}; }
export async function saveWorkoutSession(user_id, session){
  const {data:log,error}=await supabase.from('workout_logs').insert({user_id,workout_date:localISO(),workout_type:session.plan,program_week:session.program_week,mode:session.mode,notes:session.notes||'',started_at:session.started_at,completed_at:new Date().toISOString(),completed:true}).select().single();
  if(error) throw error;
  const setRows=[]; const runRows=[];
  session.exercises.forEach(ex=>{
    if(ex.isRun){ const r=ex.sets[0]||{}; runRows.push({user_id,workout_log_id:log.id,run_date:localISO(),run_type:ex.name,minutes:Number(r.reps||0),distance:Number(r.distance||0),rpe:Number(r.rpe||0),notes:session.notes||''}); }
    else ex.sets.forEach((s,i)=>{ if(Number(s.weight||0)>0 || Number(s.reps||0)>0) setRows.push({workout_log_id:log.id,exercise_name:ex.name,set_number:i+1,weight:Number(s.weight||0),reps:Number(s.reps||0),rpe:Number(s.rpe||0),completed:true}); });
  });
  if(setRows.length){ const res=await supabase.from('exercise_sets').insert(setRows); if(res.error) throw res.error; }
  if(runRows.length){ const res=await supabase.from('run_logs').insert(runRows); if(res.error) throw res.error; }
  await supabase.from('daily_schedule').upsert({user_id,workout_date:localISO(),week_start:startOfWeekISO(),planned_workout:session.plan,actual_workout:session.plan,status:'complete',locked:true},{onConflict:'user_id,workout_date'});
  return log;
}
export async function updateBaseline(user_id,row){ const {error}=await supabase.from('lift_baselines').upsert({user_id,...row,updated_at:new Date().toISOString()},{onConflict:'user_id,exercise_name'}); if(error) throw error; }
export async function getBaselines(user_id){ const {data,error}=await supabase.from('lift_baselines').select('*').eq('user_id',user_id).order('updated_at',{ascending:false}); if(error) throw error; const map={}; (data||[]).forEach(x=>map[x.exercise_name]=x); return {list:data||[],map}; }
export async function getRecentWorkouts(user_id){ const {data,error}=await supabase.from('workout_logs').select('*').eq('user_id',user_id).order('completed_at',{ascending:false}).limit(10); if(error) throw error; return data||[]; }
// ---- Programs (user-authored training content) ----

function normalizeProgramRow(program, workoutRows){
  return {
    id: program.id, name: program.name, week_template: program.week_template, source: program.source,
    workouts: (workoutRows||[]).map(w=>({
      key:w.key, display_name:w.display_name, category:w.category, substitutions:w.substitutions||{},
      exercises:(w.program_exercises||[]).slice().sort((a,b)=>a.sort_order-b.sort_order).map(e=>({
        name:e.name, note:e.note||'', target:e.target||'', sets:e.sets, reps:e.reps,
        default_weight:e.default_weight, increment:e.increment, is_run:e.is_run
      }))
    }))
  };
}
export async function getActiveProgram(user_id){
  const {data:program,error}=await supabase.from('programs').select('*').eq('user_id',user_id).eq('is_active',true).maybeSingle();
  if(error) throw error;
  if(!program) return null;
  const {data:workouts,error:e2}=await supabase.from('program_workouts').select('*, program_exercises(*)').eq('program_id',program.id).order('sort_order');
  if(e2) throw e2;
  return normalizeProgramRow(program, workouts);
}
export async function ensureActiveProgram(user_id){
  const existing = await getActiveProgram(user_id);
  if(existing) return existing;
  return importProgram(user_id, DEFAULT_PROGRAM, 'default');
}
export async function importProgram(user_id, programJson, source='import'){
  await supabase.from('programs').update({is_active:false}).eq('user_id',user_id).eq('is_active',true);
  const {data:program,error}=await supabase.from('programs').insert({
    user_id, name: programJson.program_name || 'My Program',
    week_template: programJson.week_template, is_active:true, source
  }).select().single();
  if(error) throw error;
  await writeWorkouts(program.id, programJson.workouts||[]);
  return getActiveProgram(user_id);
}
export async function replaceProgramContent(program_id, workouts, week_template, name){
  const patch = {updated_at:new Date().toISOString()};
  if(week_template) patch.week_template = week_template;
  if(name) patch.name = name;
  const {error:pe}=await supabase.from('programs').update(patch).eq('id',program_id); if(pe) throw pe;
  await supabase.from('program_workouts').delete().eq('program_id',program_id);
  await writeWorkouts(program_id, workouts);
}
async function writeWorkouts(program_id, workouts){
  for(let i=0;i<workouts.length;i++){
    const w = workouts[i];
    const {data:wRow,error:we}=await supabase.from('program_workouts').insert({
      program_id, key:w.key, display_name:w.display_name, category:w.category||'lift',
      sort_order:i, substitutions:w.substitutions||{}
    }).select().single();
    if(we) throw we;
    const exRows=(w.exercises||[]).map((e,j)=>({
      program_workout_id:wRow.id, name:e.name, note:e.note||'', target:e.target||'',
      sets:e.sets||3, reps:e.reps??10, default_weight:e.default_weight??null,
      increment:e.increment??null, is_run:!!e.is_run, sort_order:j
    }));
    if(exRows.length){ const {error:ie}=await supabase.from('program_exercises').insert(exRows); if(ie) throw ie; }
  }
}

export async function getWeekCounts(user_id, week_start=startOfWeekISO()){
  const end = new Date(`${week_start}T12:00:00`); end.setDate(end.getDate()+6); const endISO = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
  const {data,error}=await supabase.from('workout_logs').select('workout_type').eq('user_id',user_id).gte('workout_date',week_start).lte('workout_date',endISO).eq('completed',true); if(error) throw error;
  const lifts=(data||[]).filter(x=>['Workout A','Workout B'].includes(x.workout_type)).length;
  const runs=(data||[]).filter(x=>x.workout_type==='Zone 2' || ['Workout A','Workout B'].includes(x.workout_type)).length;
  return {lifts,runs};
}
