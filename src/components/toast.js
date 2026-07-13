export function toast(message, type='default'){
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className='toast'; el.textContent = message;
  if(type==='success') el.style.background = '#1f8f47';
  if(type==='error') el.style.background = '#c9342f';
  root.appendChild(el); requestAnimationFrame(()=>el.classList.add('show'));
  setTimeout(()=>{el.classList.remove('show'); setTimeout(()=>el.remove(),220)}, 2300);
}
export async function withButtonState(btn, label, fn){
  const original = btn.innerHTML; btn.classList.add('loading'); btn.disabled=true; btn.innerHTML=`<span class="spinner"></span>${label}`;
  try { const result = await fn(); btn.classList.remove('loading'); btn.classList.add('done'); btn.innerHTML='✓ Done'; setTimeout(()=>{btn.classList.remove('done'); btn.innerHTML=original; btn.disabled=false},650); return result; }
  catch(e){ btn.classList.remove('loading'); btn.disabled=false; btn.innerHTML=original; toast(e.message || 'Something failed', 'error'); throw e; }
}
