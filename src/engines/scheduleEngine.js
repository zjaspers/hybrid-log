import { addDaysISO, localISO } from '../utils.js';
import { workoutMeta, recoveryKey } from './workoutEngine.js';

export function buildWeek(program, startISO){
  const template = program.week_template;
  return template.map((key,i)=>({ workout_date:addDaysISO(startISO,i), planned_workout:key, actual_workout:null, status:'planned', locked:false }));
}
export function rebuildWeek(program, startISO, existing=[]){
  const byDate = new Map(existing.map(day=>[day.workout_date, day]));
  return buildWeek(program, startISO).map(day=>{
    const prior = byDate.get(day.workout_date);
    return prior && (prior.locked || prior.status==='complete') ? prior : day;
  });
}
export function hasStaleUnlockedDays(program, existing=[]){
  const validKeys = new Set((program.workouts||[]).map(workout=>workout.key));
  return existing.some(day=>
    !day.locked && day.status!=='complete' && !validKeys.has(day.planned_workout)
  );
}
export function todayPlan(schedule){
  const today = localISO();
  return schedule.find(x=>x.workout_date===today) || null;
}
function categoryOf(program, key){ return workoutMeta(program, key)?.category || 'recovery'; }

export function rebalance(schedule, changedDate, changedPlan, program){
  const out = schedule.map(x=>({...x}));
  const idx = out.findIndex(x=>x.workout_date===changedDate);
  if(idx<0) return out;
  const cat = k => categoryOf(program, k);
  out[idx].planned_workout = changedPlan; out[idx].actual_workout = changedPlan;
  out[idx].status = cat(changedPlan)==='recovery' ? 'rest' : 'modified';

  // Quotas come from the program's own weekly template rather than a hardcoded count,
  // so this generalizes to any user-authored program shape.
  const template = program.week_template;
  const recKey = recoveryKey(program);

  const completed = out.filter((x,i)=>i!==idx && (x.locked || x.status==='complete'));
  const remainingIdx = out.map((x,i)=>i).filter(i=>i>idx && !out[i].locked);
  const sequence = [...template];
  const consume = key=>{
    let pos = sequence.indexOf(key);
    if(pos<0) pos = sequence.findIndex(candidate=>cat(candidate)===cat(key));
    if(pos>=0) sequence.splice(pos,1);
  };
  completed.forEach(x=>consume(x.actual_workout||x.planned_workout));
  consume(changedPlan);
  while(sequence.length<remainingIdx.length) sequence.push(recKey);
  remainingIdx.forEach((slot,i)=>{ out[slot].planned_workout = sequence[i] || recKey; out[slot].actual_workout=null; out[slot].status='planned'; });
  return out;
}
