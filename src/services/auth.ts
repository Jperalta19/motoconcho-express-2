import { rpc } from './db';
interface Session { user_id: string; username: string; token: string }
interface Profile { username: string; record_m: number; puntos_totales: number; nivel: number }
const SESSION_KEY = 'motoconcho2-cloud-session';
let active: Session | null = (() => { try { const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); return s?.user_id && s?.username && s?.token ? s as Session : null; } catch { return null; } })();
function session(): Session { if (!active) throw new Error('Debes iniciar sesión.'); return active; }
function key(name: string, type: string): string { return 'motoconcho2-user-' + encodeURIComponent(name) + '-' + type; }
function cache(s: Session, p: Profile): void {
  if (active?.token !== s.token) return;
  for (const [type, value] of [['record', p.record_m], ['total', p.puntos_totales], ['level', p.nivel]] as const) {
    try { localStorage.setItem(key(s.username, type), String(value)); } catch { /* La nube sigue siendo la fuente principal. */ }
  }
}
async function authenticate(fn: string, username: string, clave: string): Promise<string> {
  const name = username.trim().toLowerCase();
  if (!/^[a-z0-9_.-]{1,32}$/.test(name)) throw new Error('Usa de 1 a 32 letras sin acentos, números, punto, guion o guion bajo.');
  if (clave.length < 6) throw new Error('La clave debe tener al menos 6 caracteres.');
  const s = await rpc<Session>(fn, { username: name, clave });
  const p = await rpc<Profile>('mi_perfil', { user_id: s.user_id, token: s.token });
  active = s;
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* Sesión en memoria si el navegador bloquea almacenamiento. */ }
  cache(s, p);
  return s.username;
}
let saves: Promise<unknown> = Promise.resolve();
export const Auth = {
  getCurrentUser(): string | null { return active?.username || null; },
  register(username: string, password: string): Promise<string> { return authenticate('registrar', username, password); },
  login(username: string, password: string): Promise<string> { return authenticate('iniciar_sesion', username, password); },
  logout(): void { active = null; try { localStorage.removeItem(SESSION_KEY); } catch { /* memoria */ } },
  scoreKey(type: 'total' | 'record' | 'level'): string { return key(session().username, type); },
  async loadProfile(): Promise<void> { const s = session(); const p = await rpc<Profile>('mi_perfil', { user_id: s.user_id, token: s.token }); cache(s, p); },
  saveProgress(record: number, total: number, level: number): Promise<void> {
    const s = session();
    const run = async (): Promise<void> => {
      const p = await rpc<Profile>('guardar_progreso', { user_id: s.user_id, token: s.token, record_m: Math.floor(record), puntos_totales: Math.floor(total), nivel: Math.max(1, Math.floor(level)) });
      cache(s, p);
    };
    const result = saves.catch(() => undefined).then(run);
    saves = result;
    return result;
  }
};
