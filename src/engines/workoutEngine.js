export const DISPLAY = { 'Workout A':'Lower Strength', 'Workout B':'Upper Strength', 'Zone 2':'Zone 2', 'Recovery':'Recovery' };
export const PLANS = ['Workout A','Workout B','Zone 2','Recovery'];

const base = {
  'Workout A': [
    ex('Back Squat','Primary compound. RPE 7–8.','3x5',3,5),
    ex('Clean and Press','Double progression. Own 5/5/5 before adding.','3x5',3,5,85),
    ex('Romanian Deadlift','Controlled hinge. No grinding.','2x8',2,8),
    ex('Incline DB Press','Upper chest emphasis.','2x10',2,10),
    ex('Hammer Curl','Biceps quality sets.','3x10–12',3,12),
    ex('Incline Curl','Biceps stretch position.','3x10–12',3,12),
    ex('Rope Pushdown','Triceps. Controlled reps.','3x10–12',3,12),
    ex('Overhead Extension','Long head triceps.','3x10–12',3,12),
    ex('Lateral Raise','Shoulder cap.','3x12–15',3,15),
    run('Zone 2 Run','Conversational. Do not chase pace.','15–20 min',20)
  ],
  'Workout B': [
    ex('Bench Press','Primary compound. Face pulls + dead bugs first.','3x5',3,5),
    ex('Front Squat','Secondary compound. Clean reps.','3x5',3,5),
    ex('Pull-Ups','Stop 1–2 reps before failure.','3 sets',3,6,0),
    ex('Dips','Controlled reps. Add weight only when owned.','2–3 sets',3,8,0),
    ex('Incline DB Press','Upper chest priority.','2x10',2,10),
    ex('Hammer Curl','Biceps quality sets.','3x10–12',3,12),
    ex('EZ Curl','Biceps second movement.','3x10–12',3,12),
    ex('Skull Crusher','Triceps. Controlled.','3x10–12',3,12),
    ex('Overhead Extension','Long head triceps.','3x10–12',3,12),
    ex('Lateral Raise','Shoulder cap.','3x12–15',3,15),
    run('Zone 2 Run','Conversational.','15–20 min',20)
  ],
  'Zone 2': [run('Zone 2 Run','RPE 4–5. Track minutes and distance.','20–30 min',25)],
  'Recovery': [run('Walk / Mobility','Family walk or easy mobility. Optional.','Optional',0)]
};
function ex(name,note,target,sets,reps,weight=''){ return {name,note,target,sets,reps,defaultWeight:weight,isRun:false}; }
function run(name,note,target,minutes){ return {name,note,target,sets:1,reps:minutes,defaultWeight:minutes,isRun:true}; }
const subs = {
  hotel_gym: {'Back Squat':'Goblet Squat','Clean and Press':'DB Push Press','Romanian Deadlift':'DB Romanian Deadlift','Bench Press':'DB Bench Press','Front Squat':'Goblet Squat','Pull-Ups':'Lat Pulldown','Dips':'Bench Dips','Rope Pushdown':'Cable Pushdown','Skull Crusher':'DB Skull Crusher'},
  dumbbells: {'Back Squat':'DB Goblet Squat','Clean and Press':'DB Clean and Press','Romanian Deadlift':'DB Romanian Deadlift','Bench Press':'DB Floor Press','Front Squat':'DB Front Squat','Pull-Ups':'1-Arm DB Row','Dips':'Close-Grip Push-Up','Rope Pushdown':'DB Tate Press','Skull Crusher':'DB Skull Crusher'},
  bodyweight: {'Back Squat':'Bulgarian Split Squat','Clean and Press':'Pike Push-Up','Romanian Deadlift':'Single-Leg Hip Hinge','Bench Press':'Push-Up','Front Squat':'Split Squat','Pull-Ups':'Inverted Row / Door Row','Dips':'Bench Dips','Incline DB Press':'Feet-Elevated Push-Up','Hammer Curl':'Towel Curl Isometric','EZ Curl':'Towel Curl Isometric','Rope Pushdown':'Close-Grip Push-Up','Skull Crusher':'Bodyweight Triceps Extension','Overhead Extension':'Bodyweight Triceps Extension','Lateral Raise':'Prone Y-T-W'}
};
export function getWorkout(plan, equipment='full_gym', mode='full'){
  let arr = structuredClone(base[plan] || base['Workout A']);
  if(equipment !== 'full_gym') arr = arr.map(x => ({...x, originalName:x.name, name: (subs[equipment]?.[x.name] || x.name)}));
  if(mode === 'minimum') {
    const keep = plan === 'Workout A' ? ['Back Squat','Clean and Press','Romanian Deadlift','Zone 2 Run'] : plan === 'Workout B' ? ['Bench Press','Front Squat','Pull-Ups','Zone 2 Run'] : ['Zone 2 Run','Walk / Mobility'];
    arr = arr.filter(x => keep.includes(x.originalName || x.name));
    arr = arr.map(x => x.isRun ? {...x,reps:10,target:'10 min'} : x);
  }
  return arr;
}
export function defaultWeekPlan(){ return ['Workout A','Zone 2','Workout B','Zone 2','Workout A','Recovery','Recovery']; }
export function recommendedFromReadiness(readiness, defaultPlan){
  const mins = Number(readiness.available_minutes||60); const feel = readiness.feel || 'good';
  if(feel === 'exhausted' || mins < 20) return 'Recovery';
  if(mins < 35 && defaultPlan.includes('Workout')) return defaultPlan;
  return defaultPlan;
}
