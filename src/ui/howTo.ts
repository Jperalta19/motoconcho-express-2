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
<h3>Cómo cambian los obstáculos</h3><p>La dificultad sube por puntos, no por metros. Retomas tu nivel guardado y subes un nivel por cada 100 puntos que recoges durante el viaje: monedas (+10) y gasolina (+15).</p><ul><li><strong>Nivel 1:</strong> solo hoyos entre los obstáculos.</li><li><strong>Nivel 2:</strong> se suman agentes de tránsito; predominan sobre los hoyos.</li><li><strong>Nivel 3:</strong> llegan las patrullas; siguen apareciendo agentes y hoyos.</li><li><strong>Nivel 4:</strong> se suman camionetas, junto con patrullas, agentes y hoyos.</li><li><strong>Nivel 5:</strong> llegan los tanques de guerra y se mantienen los tipos anteriores.</li><li><strong>Nivel 6 en adelante:</strong> los cinco tipos tienen la misma probabilidad entre los obstáculos.</li></ul><p><strong>Más velocidad:</strong> la base es 220 píxeles por segundo en nivel 1 y aumenta 25 por cada nivel, sin tope programado. El nitro multiplica temporalmente esa velocidad por 1,55 durante 4 segundos; no cambia el intervalo de aparición.</p><p><strong>Más frecuencia:</strong> el primer objeto sale aproximadamente a los 0,7 segundos. Después aparece un objeto cada 1,15 segundos en nivel 1; el intervalo baja 0,055 segundos por nivel hasta un mínimo de 0,48 segundos desde el nivel 14.</p><p>Cada aparición elige un carril al azar: hay un 44 % de probabilidad de obstáculo y un 56 % de premio o power-up. No todos los objetos son peligros ni hay un orden fijo de aparición; los tipos disponibles dependen del nivel.</p>`;
document.body.append(dialog);
dialog.querySelector('[data-close]')!.addEventListener('click', () => dialog.close());
document.querySelectorAll<HTMLButtonElement>('[data-how-to]').forEach(button => {
  button.addEventListener('click', () => { dialog.showModal(); });
});

// Clasificación compacta del menú: pública e independiente de la sesión.
const menuStyle = document.createElement('style');
menuStyle.textContent = `
.menu-top5{margin:8px 0 12px;padding:7px 10px;border-radius:10px;background:#f4e7b8;color:#143643;text-align:left;font-size:12px;line-height:1.25}
.menu-top5 h3{font-size:13px;text-align:center;margin:0 0 4px}.menu-top5 ol{margin:0;padding:0;list-style:none}.menu-top5 li{display:flex;justify-content:space-between;gap:8px;padding:2px 0}.menu-top5 li span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.menu-top5 li span:last-child{flex-shrink:0;font-weight:900}.card .menu-top5 p{font-size:11px;line-height:1.25;margin:2px 0;font-weight:650}.menu-top5 [role=alert]{color:#8f251a}
@media(max-height:650px){#start .card{padding:12px 16px}#start .eyebrow{margin-bottom:6px}#start .card h2{font-size:29px;margin:4px 0 8px}#start .card>p{margin:6px 0;font-size:12px}#start .action{padding:10px 6px;font-size:16px}#start .howto-link{margin-top:8px!important;padding:7px!important}.menu-top5{margin:5px 0 8px;padding:5px 8px;font-size:11px}.menu-top5 li{padding:1px 0}}
`;
document.head.append(menuStyle);
const menuRankings: HTMLElement[] = [];
for (const selector of ['#start .card > p', '#auth .card > p']) {
  const subtitle = document.querySelector(selector);
  if (!subtitle) continue;
  const box = document.createElement('section');
  box.className = 'menu-top5';
  box.setAttribute('aria-label', 'Top 5 global por récord');
  box.innerHTML = '<h3>Top 5 global</h3><p role="status" aria-live="polite">Cargando récords…</p>';
  subtitle.after(box);
  menuRankings.push(box);
}
async function loadMenuTop(): Promise<void> {
  try {
    const entries = await rpc<Entry[]>('top5_global', {});
    for (const box of menuRankings) {
      box.querySelector('p')?.remove();
      if (!entries.length) {
        const empty = document.createElement('p'); empty.textContent = '¡Estrena la clasificación!'; box.append(empty); continue;
      }
      const list = document.createElement('ol');
      entries.slice(0, 5).forEach((entry, index) => {
        const row = document.createElement('li');
        const name = document.createElement('span');
        const distance = document.createElement('span');
        name.textContent = (index + 1) + '. ' + entry.username;
        distance.textContent = entry.record_m + ' m';
        row.append(name, distance); list.append(row);
      });
      box.append(list);
    }
  } catch {
    for (const box of menuRankings) {
      const message = box.querySelector('p')!;
      message.setAttribute('role', 'alert');
      message.textContent = 'No se pudo cargar el Top 5. Puedes seguir jugando.';
    }
  }
}
void loadMenuTop();
