import { addDaysISO, localISO, isWeekend } from '../utils.js';
import { workoutMeta, recoveryKey } from './workoutEngine.js';

export function buildWeek(program, startISO){
  const template = program.week_template;
  return template.map((key,i)=>({ workout_date:addDaysISO(startISO,i), planned_workout:key, actual_workout:null, status:'planned', locked:false }));
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
  const totalLifts = template.filter(k=>cat(k)==='lift').length;
  const totalRuns = template.filter(k=>cat(k)==='run').length;
  const liftKeys = [...new Set(program.workouts.filter(w=>w.category==='lift').map(w=>w.key))];
  const runKey = program.workouts.find(w=>w.category==='run')?.key;
  const recKey = recoveryKey(program);

  const completed = out.filter(x=>x.locked || x.status==='complete');
  const remainingIdx = out.map((x,i)=>i).filter(i=>i>idx && !out[i].locked && !isWeekend(out[i].workout_date));
  const completedLifts = completed.filter(x=>liftKeys.includes(x.actual_workout||x.planned_workout)).length + (cat(changedPlan)==='lift'?1:0);
  const completedRuns = completed.filter(x=>(x.actual_workout||x.planned_workout)===runKey).length + (changedPlan===runKey?1:0);
  let needLifts = Math.max(0, totalLifts-completedLifts), needRuns = Math.max(0, totalRuns-completedRuns);

  const sequence=[];
  let liftPos = 0;
  for(let n=0; n<remainingIdx.length; n++){
    if(needLifts>0 && (n===0 || sequence[sequence.length-1]===runKey || needRuns===0) && liftKeys.length){
      sequence.push(liftKeys[liftPos % liftKeys.length]); liftPos++; needLifts--;
    } else if(needRuns>0 && runKey){
      sequence.push(runKey); needRuns--;
    } else {
      sequence.push(recKey);
    }
  }
  remainingIdx.forEach((slot,i)=>{ out[slot].planned_workout = sequence[i] || recKey; out[slot].actual_workout=null; out[slot].status='planned'; });
  out.forEach(x=>{ if(isWeekend(x.workout_date) && !x.locked){ x.planned_workout = recKey; if(x.status==='planned') x.actual_workout=null; }});
  return out;
}
