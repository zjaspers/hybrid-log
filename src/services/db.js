import { supabase } from '../supabase.js';
import { localISO, startOfWeekISO } from '../utils.js';
import { buildWeek } from '../engines/scheduleEngine.js';

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
export async function getWeekSchedule(user_id, week_start=startOfWeekISO()){
  const week = buildWeek(week_start);
  const {data,error}=await supabase.from('daily_schedule').select('*').eq('user_id',user_id).gte('workout_date',week[0].workout_date).lte('workout_date',week[6].workout_date).order('workout_date');
  if(error) throw error;
  const existing = data || [];
  const missing = week.filter(d=>!existing.some(x=>x.workout_date===d.workout_date)).map(d=>({user_id,week_start,...d}));
  if(missing.length){ const ins=await supabase.from('daily_schedule').insert(missing); if(ins.error) throw ins.error; return getWeekSchedule(user_id,week_start); }
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
export async function getWeekCounts(user_id, week_start=startOfWeekISO()){
  const end = new Date(`${week_start}T12:00:00`); end.setDate(end.getDate()+6); const endISO = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
  const {data,error}=await supabase.from('workout_logs').select('workout_type').eq('user_id',user_id).gte('workout_date',week_start).lte('workout_date',endISO).eq('completed',true); if(error) throw error;
  const lifts=(data||[]).filter(x=>['Workout A','Workout B'].includes(x.workout_type)).length;
  const runs=(data||[]).filter(x=>x.workout_type==='Zone 2' || ['Workout A','Workout B'].includes(x.workout_type)).length;
  return {lifts,runs};
}
