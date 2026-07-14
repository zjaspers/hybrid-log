// Generic over whatever `program` is currently active for this user.
// A program shape (see src/data/defaultProgram.js and docs/PROGRAM_IMPORT.md):
// { name, week_template:[7 keys], workouts:[{key,display_name,category,substitutions,exercises:[...]}] }

export function programDisplay(program){
  const d = {};
  (program.workouts||[]).forEach(w => { d[w.key] = w.display_name; });
  return d;
}
export function programPlans(program){
  return (program.workouts||[]).map(w => w.key);
}
export function recoveryKey(program){
  return (program.workouts||[]).find(w => w.category === 'recovery')?.key
    || (program.workouts||[])[0]?.key;
}
export function workoutMeta(program, key){
  return (program.workouts||[]).find(w => w.key === key) || null;
}
function fallbackIncrement(reps){ return Number(reps) >= 10 ? 2.5 : 5; }

export function getWorkout(program, key, equipment='full_gym', mode='full'){
  const w = workoutMeta(program, key) || program.workouts[0];
  let arr = structuredClone(w.exercises).map(e => ({
    ...e,
    isRun: !!e.is_run,
    defaultWeight: e.default_weight ?? '',
    increment: e.increment ?? fallbackIncrement(e.reps)
  }));
  const subs = w.substitutions?.[equipment] || {};
  if(equipment !== 'full_gym'){
    arr = arr.map(x => ({...x, originalName: x.name, name: subs[x.name] || x.name}));
  }
  if(mode === 'minimum'){
    const nonRun = arr.filter(x => !x.isRun);
    const runs = arr.filter(x => x.isRun).map(x => ({...x, reps: 10, target: '10 min'}));
    arr = [...nonRun.slice(0, 3), ...runs];
  }
  return arr;
}
export function recommendedFromReadiness(readiness, defaultPlan, program){
  const mins = Number(readiness.available_minutes || 60);
  const feel = readiness.feel || 'good';
  if(feel === 'exhausted' || mins < 20) return recoveryKey(program) || defaultPlan;
  return defaultPlan;
}
