export function localISO(d = new Date()) {
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
export function startOfWeekISO(d = new Date()) {
  const x = new Date(d); const day = x.getDay(); const diff = day === 0 ? -6 : 1 - day; x.setDate(x.getDate()+diff); return localISO(x);
}
export function addDaysISO(iso, days){ const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate()+days); return localISO(d); }
export function weekdayIndex(iso){ const d = new Date(`${iso}T12:00:00`); return d.getDay(); }
export function dayLabel(iso){ return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}); }
export function isWeekend(iso){ const d = weekdayIndex(iso); return d===0 || d===6; }
export function haptic(){ if(navigator.vibrate) navigator.vibrate(8); }
