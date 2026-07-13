export function progressionDecision(name, weight, repsArray, isDeload=false){
  const lower = name.toLowerCase();
  const target = lower.includes('curl') || lower.includes('raise') || lower.includes('pushdown') || lower.includes('extension') || lower.includes('skull') ? 12 : 5;
  const hit = repsArray.length>=2 && repsArray.every(r=>Number(r)>=target);
  const lowerBody = lower.includes('squat') || lower.includes('deadlift') || lower.includes('rdl');
  const clean = lower.includes('clean') && lower.includes('press');
  const accessory = target===12;
  if(isDeload) return {nextWeight: Math.round(Number(weight)*0.8), decision:'Deload: use ~80% and fewer sets.', hit};
  if(accessory){ return hit ? {nextWeight:Number(weight)+5, decision:'Accessory owned. Add small load or reps next time.', hit} : {nextWeight:Number(weight), decision:'Repeat accessory load until quality sets are owned.', hit}; }
  if(clean){ return hit ? {nextWeight:Number(weight)+5, decision:'Clean & Press owned. Add 5 lb.', hit} : {nextWeight:Number(weight), decision:'Repeat until 5/5/5 is owned.', hit}; }
  return hit ? {nextWeight:Number(weight)+(lowerBody?5:5), decision:`All reps hit. Add ${lowerBody?'5':'2.5–5'} lb.`, hit} : {nextWeight:Number(weight), decision:'Repeat weight until target reps are owned.', hit};
}
