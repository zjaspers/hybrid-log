// The exact content that used to be hardcoded in workoutEngine.js, expressed in the
// importable program schema. New users (or anyone who hasn't built/imported a program yet)
// get this automatically so nothing changes for existing use.
export const DEFAULT_PROGRAM = {
  program_name: 'Hybrid Athlete OS',
  week_template: ['workout_a','zone2','workout_b','zone2','workout_a','recovery','recovery'],
  workouts: [
    {
      key: 'workout_a', display_name: 'Lower Strength', category: 'lift',
      substitutions: {
        hotel_gym: {'Back Squat':'Goblet Squat','Clean and Press':'DB Push Press','Romanian Deadlift':'DB Romanian Deadlift'},
        dumbbells: {'Back Squat':'DB Goblet Squat','Clean and Press':'DB Clean and Press','Romanian Deadlift':'DB Romanian Deadlift'},
        bodyweight: {'Back Squat':'Bulgarian Split Squat','Clean and Press':'Pike Push-Up','Romanian Deadlift':'Single-Leg Hip Hinge','Incline DB Press':'Feet-Elevated Push-Up','Hammer Curl':'Towel Curl Isometric','Incline Curl':'Towel Curl Isometric','Rope Pushdown':'Close-Grip Push-Up','Overhead Extension':'Bodyweight Triceps Extension','Lateral Raise':'Prone Y-T-W'}
      },
      exercises: [
        {name:'Back Squat', note:'Primary compound. RPE 7-8.', target:'3x5', sets:3, reps:5, increment:5},
        {name:'Clean and Press', note:'Double progression. Own 5/5/5 before adding.', target:'3x5', sets:3, reps:5, default_weight:85, increment:5},
        {name:'Romanian Deadlift', note:'Controlled hinge. No grinding.', target:'2x8', sets:2, reps:8, increment:5},
        {name:'Incline DB Press', note:'Upper chest emphasis.', target:'2x10', sets:2, reps:10, increment:2.5},
        {name:'Hammer Curl', note:'Biceps quality sets.', target:'3x10-12', sets:3, reps:12, increment:2.5},
        {name:'Incline Curl', note:'Biceps stretch position.', target:'3x10-12', sets:3, reps:12, increment:2.5},
        {name:'Rope Pushdown', note:'Triceps. Controlled reps.', target:'3x10-12', sets:3, reps:12, increment:2.5},
        {name:'Overhead Extension', note:'Long head triceps.', target:'3x10-12', sets:3, reps:12, increment:2.5},
        {name:'Lateral Raise', note:'Shoulder cap.', target:'3x12-15', sets:3, reps:15, increment:2.5},
        {name:'Zone 2 Run', note:'Conversational. Do not chase pace.', target:'15-20 min', sets:1, reps:20, default_weight:20, is_run:true}
      ]
    },
    {
      key: 'workout_b', display_name: 'Upper Strength', category: 'lift',
      substitutions: {
        hotel_gym: {'Bench Press':'DB Bench Press','Front Squat':'Goblet Squat','Pull-Ups':'Lat Pulldown','Dips':'Bench Dips','Rope Pushdown':'Cable Pushdown','Skull Crusher':'DB Skull Crusher'},
        dumbbells: {'Bench Press':'DB Floor Press','Front Squat':'DB Front Squat','Pull-Ups':'1-Arm DB Row','Dips':'Close-Grip Push-Up','Rope Pushdown':'DB Tate Press','Skull Crusher':'DB Skull Crusher'},
        bodyweight: {'Bench Press':'Push-Up','Front Squat':'Split Squat','Pull-Ups':'Inverted Row / Door Row','Dips':'Bench Dips','Incline DB Press':'Feet-Elevated Push-Up','Hammer Curl':'Towel Curl Isometric','EZ Curl':'Towel Curl Isometric','Rope Pushdown':'Close-Grip Push-Up','Skull Crusher':'Bodyweight Triceps Extension','Overhead Extension':'Bodyweight Triceps Extension','Lateral Raise':'Prone Y-T-W'}
      },
      exercises: [
        {name:'Bench Press', note:'Primary compound. Face pulls + dead bugs first.', target:'3x5', sets:3, reps:5, increment:5},
        {name:'Front Squat', note:'Secondary compound. Clean reps.', target:'3x5', sets:3, reps:5, increment:5},
        {name:'Pull-Ups', note:'Stop 1-2 reps before failure.', target:'3 sets', sets:3, reps:6, default_weight:0, increment:5},
        {name:'Dips', note:'Controlled reps. Add weight only when owned.', target:'2-3 sets', sets:3, reps:8, default_weight:0, increment:5},
        {name:'Incline DB Press', note:'Upper chest priority.', target:'2x10', sets:2, reps:10, increment:2.5},
        {name:'Hammer Curl', note:'Biceps quality sets.', target:'3x10-12', sets:3, reps:12, increment:2.5},
        {name:'EZ Curl', note:'Biceps second movement.', target:'3x10-12', sets:3, reps:12, increment:2.5},
        {name:'Skull Crusher', note:'Triceps. Controlled.', target:'3x10-12', sets:3, reps:12, increment:2.5},
        {name:'Overhead Extension', note:'Long head triceps.', target:'3x10-12', sets:3, reps:12, increment:2.5},
        {name:'Lateral Raise', note:'Shoulder cap.', target:'3x12-15', sets:3, reps:15, increment:2.5},
        {name:'Zone 2 Run', note:'Conversational.', target:'15-20 min', sets:1, reps:20, default_weight:20, is_run:true}
      ]
    },
    {
      key: 'zone2', display_name: 'Zone 2', category: 'run',
      exercises: [
        {name:'Zone 2 Run', note:'RPE 4-5. Track minutes and distance.', target:'20-30 min', sets:1, reps:25, default_weight:25, is_run:true}
      ]
    },
    {
      key: 'recovery', display_name: 'Recovery', category: 'recovery',
      exercises: [
        {name:'Walk / Mobility', note:'Family walk or easy mobility. Optional.', target:'Optional', sets:1, reps:0, default_weight:0, is_run:true}
      ]
    }
  ]
};
