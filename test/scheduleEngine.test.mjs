import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeek, rebuildWeek, hasStaleUnlockedDays, rebalance } from '../src/engines/scheduleEngine.js';

const program = {
  week_template: ['upper_a','lower_a','zone2_medium','upper_b','lower_b','zone2_optional','rest'],
  workouts: [
    {key:'upper_a',category:'lift'}, {key:'lower_a',category:'lift'},
    {key:'zone2_medium',category:'run'}, {key:'upper_b',category:'lift'},
    {key:'lower_b',category:'lift'}, {key:'zone2_optional',category:'run'},
    {key:'rest',category:'recovery'}
  ]
};

test('rebuildWeek replaces stale unlocked rows with the imported template', ()=>{
  const stale = buildWeek({...program, week_template:['upper_a','zone2_medium','lower_a','zone2_medium','upper_a','rest','rest']}, '2026-08-03');
  const rebuilt = rebuildWeek(program, '2026-08-03', stale);
  assert.deepEqual(rebuilt.map(x=>x.planned_workout), program.week_template);
});

test('rebuildWeek preserves completed rows', ()=>{
  const stale = buildWeek(program, '2026-08-03');
  stale[0] = {...stale[0], planned_workout:'legacy_lift', actual_workout:'legacy_lift', status:'complete', locked:true};
  const rebuilt = rebuildWeek(program, '2026-08-03', stale);
  assert.equal(rebuilt[0].planned_workout, 'legacy_lift');
  assert.deepEqual(rebuilt.slice(1).map(x=>x.planned_workout), program.week_template.slice(1));
});

test('stale imported-program rows are detected without replacing completed work', ()=>{
  const stale = buildWeek(program, '2026-08-03');
  stale[0] = {...stale[0], planned_workout:'legacy_lift', actual_workout:'legacy_lift', status:'complete', locked:true};
  stale[1] = {...stale[1], planned_workout:'legacy_run'};
  assert.equal(hasStaleUnlockedDays(program, stale), true);
  stale[1] = {...stale[1], planned_workout:'lower_a'};
  assert.equal(hasStaleUnlockedDays(program, stale), false);
});

test('rebalance retains four lift days and both run variants, including Saturday', ()=>{
  const schedule = buildWeek(program, '2026-08-03');
  const updated = rebalance(schedule, '2026-08-03', 'zone2_medium', program);
  const remaining = updated.slice(1).map(x=>x.planned_workout);
  assert.equal(remaining.filter(k=>program.workouts.find(w=>w.key===k)?.category==='lift').length, 4);
  assert.ok(remaining.includes('zone2_optional'));
  assert.equal(updated[5].planned_workout, 'zone2_optional');
});
