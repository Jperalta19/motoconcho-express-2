import { rpc } from '../services/db';

type Entry = { username: string; record_m: number };
const style = document.createElement('style');
style.textContent = `
.howto-dialog{border:0;border-radius:24px;background:#fff7df;color:#143643;padding:24px;width:min(620px,calc(100vw - 32px));max-height:88dvh;box-sizing:border-box;overflow:auto;font-family:ui-rounded,'Trebuchet MS',system-ui,sans-serif;line-height:1.5;box-shadow:0 20px 80px #0008}
.howto-dialog::backdrop{background:#092a37e8}.howto-dialog h2{font-size:2rem;margin:0 0 12px}.howto-dialog h3{margin:22px 0 8px}.howto-dialog button{font:inherit;font-weight:bold;border:0;border-radius:12px;background:#f1cf77;color:#143643;padding:10px 16px;cursor:pointer}.howto-dialog button:focus-visible{outline:3px solid #087d77;outline-offset:3px}.howto-dialog ul{padding-left:22px}.howto-dialog table{border-collapse:collapse;width:100%;text-align:left}.howto-dialog td,.howto-dialog th{padding:10px 4px;border-bottom:1px solid #14364333}.howto-dialog td:last-child,.howto-dialog th:last-child{text-align:right}.howto-dialog .howto-tools{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.howto-dialog [role=alert]{color:#9b2424}.howto-link{margin-top:12px!important;font-size:1rem!important;padding:10px 18px!important}
`;
document.head.append(style);
const dialog = document.createElement('dialog');
dialog.className = 'howto-dialog';
dialog.setAttribute('aria-labelledby', 'howto-title');
dialog.innerHTML = `<div class="howto-tools"><h2 id="howto-title">Cómo jugar</h2><button type="button" data-close>Cerrar</button></div>
<h3>Un viaje por tres carriles</h3><p>Recorre la mayor distancia posible. Esquiva hoyos, agentes de tránsito, patrullas, camionetas y tanques de guerra.</p>
<h3>Controles</h3><p>Toca izquierda o derecha para cambiar de carril, o usa las flechas ← → del teclado. El sonido es opcional: actívalo o siléncialo con ♪.</p>
<h3>Power-ups</h3><ul><li>🪙 Moneda: +10 puntos.</li><li>⛽ Gasolina: +15 puntos.</li><li>🪖 Casco: escudo.</li><li>⚡ Nitro: invulnerable.</li><li>🧲 Imán: atrae monedas.</li></ul>
<h3>Top 5 global por distancia</h3><p>Los mejores récords en metros, entre todos los jugadores.</p><p data-status role="status" aria-live="polite"></p><div data-ranking></div><button type="button" data-refresh>Actualizar clasificación</button>`;
document.body.append(dialog);
const status = dialog.querySelector<HTMLElement>('[data-status]')!;
const ranking = dialog.querySelector<HTMLElement>('[data-ranking]')!;
const refresh = dialog.querySelector<HTMLButtonElement>('[data-refresh]')!;
async function loadTop(): Promise<void> {
  refresh.disabled = true;
  status.setAttribute('role', 'status');
  status.textContent = 'Cargando clasificación…';
  ranking.replaceChildren();
  try {
    const rows = await rpc<Entry[]>('top5_global', {});
    if (!rows.length) { status.textContent = 'Todavía no hay récords. ¡Estrena la clasificación!'; return; }
    const table = document.createElement('table');
    table.innerHTML = '<caption>Clasificación mundial por récord</caption><thead><tr><th scope="col">Jugador</th><th scope="col">Distancia</th></tr></thead>';
    const body = document.createElement('tbody');
    rows.forEach((entry, index) => {
      const row = document.createElement('tr');
      const name = document.createElement('td');
      const distance = document.createElement('td');
      name.textContent = (index + 1) + '. ' + entry.username;
      distance.textContent = entry.record_m + ' m';
      row.append(name, distance); body.append(row);
    });
    table.append(body); ranking.append(table);
    status.textContent = 'Récords globales actualizados.';
  } catch (error) {
    status.setAttribute('role', 'alert');
    status.textContent = error instanceof Error ? error.message : 'No se pudo cargar la clasificación. Inténtalo otra vez.';
  } finally { refresh.disabled = false; }
}
dialog.querySelector('[data-close]')!.addEventListener('click', () => dialog.close());
refresh.addEventListener('click', () => { void loadTop(); });
document.querySelectorAll<HTMLButtonElement>('[data-how-to]').forEach(button => {
  button.addEventListener('click', () => { dialog.showModal(); void loadTop(); });
});
