import { Auth } from '../services/auth';
let overlay: HTMLElement | null = null;
let version = 0;
let lastFocus: HTMLElement | null = null;
const buttons: HTMLButtonElement[] = [];
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text = ''): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag); el.textContent = text; return el;
}
function close(): void { version++; overlay?.remove(); overlay = null; lastFocus?.focus(); }
function table(headers: string[], rows: string[][]): HTMLElement {
  const wrap = node('div'); wrap.style.overflowX = 'auto';
  const t = node('table'); t.style.cssText = 'width:100%;border-collapse:collapse;text-align:left;font-size:14px';
  const head = node('thead'); const hr = node('tr');
  for (const title of headers) { const th = node('th', title); th.scope = 'col'; th.style.cssText = 'padding:10px 8px;border-bottom:2px solid #13aa87'; hr.append(th); }
  head.append(hr); t.append(head); const body = node('tbody');
  for (const row of rows) { const tr = node('tr'); for (const cell of row) { const td = node('td', cell); td.style.cssText = 'padding:10px 8px;border-bottom:1px solid #d4e5e3'; tr.append(td); } body.append(tr); }
  if (!rows.length) { const tr = node('tr'); const td = node('td', 'Sin registros todavía.'); td.colSpan = headers.length; tr.append(td); body.append(tr); }
  t.append(body); wrap.append(t); return wrap;
}
async function load(content: HTMLElement, refresh: HTMLButtonElement): Promise<void> {
  const request = ++version;
  content.replaceChildren(node('p', 'Cargando estadísticas...')); content.setAttribute('aria-busy', 'true'); refresh.disabled = true;
  try {
    const data = await Auth.panelAdmin();
    if (request !== version || !Auth.isAdmin()) return;
    const stats = node('div'); stats.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;margin:16px 0';
    for (const [label, value] of [['Jugadores', data.total_jugadores]] as const) {
      const card = node('div'); card.style.cssText = 'flex:1;min-width:130px;background:#e0f7ed;border-radius:14px;padding:16px';
      card.append(node('div', label)); const strong = node('strong', Number(value).toLocaleString('es-DO')); strong.style.fontSize = '26px'; card.append(strong); stats.append(card);
    }
    content.replaceChildren(stats, node('h3', 'Top 10 por récord'), table(['Usuario', 'Récord (m)', 'Puntos', 'Nivel'], data.top_10.map(p => [p.username, String(p.record_m), String(p.puntos_totales), String(p.nivel)])), node('h3', 'Últimos 5 registros'), table(['Usuario', 'Fecha de registro'], data.ultimos_5.map(p => [p.username, new Date(p.created_at).toLocaleString('es-DO')])));
  } catch (error) {
    if (request !== version) return;
    const msg = node('p', error instanceof Error ? error.message : 'No se pudo cargar el panel.'); msg.setAttribute('role', 'alert'); content.replaceChildren(msg, node('p', 'Pulsa Actualizar para reintentar.'));
  } finally { if (request === version) { content.removeAttribute('aria-busy'); refresh.disabled = false; } }
}
function open(): void {
  if (!Auth.isAdmin()) return;
  close(); lastFocus = document.activeElement as HTMLElement | null;
  overlay = node('section'); overlay.id = 'admin-panel'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'admin-title');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(6,32,40,.92);display:grid;place-items:center;padding:16px;box-sizing:border-box;color:#143643;font-family:system-ui,sans-serif';
  const card = node('div'); card.style.cssText = 'width:min(760px,100%);max-height:90dvh;overflow:auto;background:#fffaf0;border-radius:24px;padding:24px;box-sizing:border-box;box-shadow:0 16px 64px #0008';
  const title = node('h2', 'Panel admin'); title.id = 'admin-title';
  const back = node('button', 'Cerrar panel'); back.type = 'button'; back.onclick = close;
  const refresh = node('button', 'Actualizar'); refresh.type = 'button'; refresh.style.marginLeft = '12px';
  const content = node('div'); content.setAttribute('aria-live', 'polite'); refresh.onclick = () => void load(content, refresh);
  card.append(title, node('p', 'Motoconcho Express 2 · Estadísticas de la nube'), back, refresh, content); overlay.append(card); document.body.append(overlay);
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === back && !refresh.disabled ? refresh : back).focus(); }
  });
  back.focus(); void load(content, refresh);
}
export function updateAdmin(): void {
  if (!buttons.length) {
    for (const selector of ['#start .card', '#over .card']) {
      const menu = document.querySelector(selector); if (!menu) continue;
      const button = node('button', 'Panel admin'); button.type = 'button'; button.className = 'secondary'; button.style.marginTop = '12px'; button.onclick = open; buttons.push(button); menu.append(button);
    }
  }
  for (const button of buttons) button.hidden = !Auth.isAdmin();
  if (!Auth.isAdmin()) close();
}
