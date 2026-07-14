// Generalized so it works for any exercise from any program — not just the ones whose
// names it recognizes. Reads the target rep count and increment straight off the
// program's own exercise data instead of guessing from the exercise name.
//
// Also implements the rule the spec always stated but never actually ran:
// two consecutive misses on the same lift -> drop the working weight 10%.

function round5(n){ return Math.round(n/2.5)*2.5; }

export function progressionDecision({ weight, repsArray, targetReps=8, increment=5, isDeload=false, priorMissCount=0 }){
  const hit = repsArray.length>0 && repsArray.every(r=>Number(r)>=targetReps);

  if(isDeload){
    return { nextWeight: round5(Number(weight)*0.8), decision:'Deload week: ~80% load, fewer sets.', hit, missCount:0 };
  }
  if(hit){
    return { nextWeight: Number(weight)+increment, decision:`All sets hit ${targetReps}+. Add ${increment} lb next time.`, hit, missCount:0 };
  }
  const newMissCount = priorMissCount+1;
  if(newMissCount>=2){
    return { nextWeight: round5(Number(weight)*0.9), decision:'Missed twice in a row — reduced 10% to rebuild.', hit, missCount:0 };
  }
  return { nextWeight:Number(weight), decision:'Repeat this weight until target reps are owned.', hit, missCount:newMissCount };
}
