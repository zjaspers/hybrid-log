import { addDaysISO, startOfWeekISO, localISO, isWeekend } from '../utils.js';
import { defaultWeekPlan } from './workoutEngine.js';

export function buildWeek(startISO = startOfWeekISO()){
  const base = defaultWeekPlan();
  return base.map((plan,i)=>({ workout_date:addDaysISO(startISO,i), planned_workout:plan, actual_workout:null, status:'planned', locked:false }));
}
export function todayPlan(schedule){
  const today = localISO();
  return schedule.find(x=>x.workout_date===today) || null;
}
export function rebalance(schedule, changedDate, changedPlan){
  const out = schedule.map(x=>({...x}));
  const idx = out.findIndex(x=>x.workout_date===changedDate);
  if(idx<0) return out;
  out[idx].planned_workout = changedPlan; out[idx].actual_workout = changedPlan; out[idx].status = changedPlan==='Recovery'?'rest':'modified';
  const completed = out.filter(x=>x.locked || x.status==='complete');
  const remainingIdx = out.map((x,i)=>i).filter(i=>i>idx && !out[i].locked && !isWeekend(out[i].workout_date));
  const completedLifts = completed.filter(x=>['Workout A','Workout B'].includes(x.actual_workout||x.planned_workout)).length + (['Workout A','Workout B'].includes(changedPlan)?1:0);
  const completedRuns = completed.filter(x=>(x.actual_workout||x.planned_workout)==='Zone 2').length + (changedPlan==='Zone 2'?1:0);
  let needLifts = Math.max(0,3-completedLifts), needRuns=Math.max(0,4-completedRuns);
  const sequence=[];
  let nextLift = completedLifts % 2 === 0 ? 'Workout A' : 'Workout B';
  for(let n=0;n<remainingIdx.length;n++){
    if(needLifts>0 && (n===0 || sequence[sequence.length-1]==='Zone 2' || needRuns===0)) { sequence.push(nextLift); nextLift = nextLift==='Workout A'?'Workout B':'Workout A'; needLifts--; }
    else if(needRuns>0) { sequence.push('Zone 2'); needRuns--; }
    else sequence.push('Recovery');
  }
  remainingIdx.forEach((slot,i)=>{ out[slot].planned_workout = sequence[i] || 'Recovery'; out[slot].actual_workout = null; out[slot].status='planned'; });
  out.forEach(x=>{ if(isWeekend(x.workout_date) && !x.locked) { x.planned_workout='Recovery'; if(x.status==='planned') x.actual_workout=null; }});
  return out;
}
