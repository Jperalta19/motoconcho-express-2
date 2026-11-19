import { rpc } from './db';
interface Session { user_id: string; username: string; token: string }
interface Profile { username: string; record_m: number; puntos_totales: number; nivel: number; is_admin: boolean }
export interface AdminPanel { total_jugadores: number; record_global: number; puntos_acumulados: number; top_10: { username: string; record_m: number; puntos_totales: number; nivel: number }[]; ultimos_5: { username: string; created_at: string }[] }
let admin = false;
const SESSION_KEY = 'motoconcho2-cloud-session';
let active: Session | null = (() => { try { const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); return s?.user_id && s?.username && s?.token ? s as Session : null; } catch { return null; } })();
function session(): Session { if (!active) throw new Error('Debes iniciar sesión.'); return active; }
function key(name: string, type: string): string { return 'motoconcho2-user-' + encodeURIComponent(name) + '-' + type; }
function cache(s: Session, p: Profile): void {
  if (active?.token !== s.token) return;
  admin = p.is_admin === true;
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

let duelMode = false;
let runId: string | null = null;
let sequence = 0;
let events: Promise<void> = Promise.resolve();
const queue: Array<()=>Promise<void>>=[];
function flush(): Promise<void> { const run=async()=>{while(queue.length){await queue[0]();queue.shift();}};events=events.catch(()=>undefined).then(run);return events; }
function event(action:string,distance:number,ticket?:number):Promise<void>{
 const s=session();const n=++sequence;const id=runId;
 queue.push(async()=>{const p=await rpc<Profile>('viaje',{token:s.token,accion:action,secuencia:n,evento:ticket==null?null:String(ticket),distancia:distance,viaje_id:id});cache(s,p);});return flush();
}
export const Auth = {
 setDuel(active: boolean): void {duelMode=active;},
 inDuel(): boolean {return duelMode;},
 async request<T>(fn: string,args: Record<string,unknown>): Promise<T> {return rpc<T>(fn,{...args,token:session().token});},
 async beginRide(): Promise<number[]> {
  await flush();
  const s=session(); const data=await rpc<{perfil:Profile;plan:number[];viaje_id:string}>('viaje',{token:s.token,accion:'iniciar'});
  cache(s,data.perfil);runId=data.viaje_id;sequence=0;events=Promise.resolve();return data.plan;
 },
 collect(ticket: number,distance: number): void {void event('recoger',distance,ticket).catch(()=>undefined);},

  getCurrentUser(): string | null { return active?.username || null; },
  isAdmin(): boolean { return !!active && admin; },
  async panelAdmin(): Promise<AdminPanel> { const s = session(); return rpc<AdminPanel>('panel_admin', { token: s.token }); },
  register(username: string, password: string): Promise<string> { return authenticate('registrar', username, password); },
  login(username: string, password: string): Promise<string> { return authenticate('iniciar_sesion', username, password); },
  logout(): void { queue.length=0;runId=null;sequence=0;duelMode=false; active = null; admin = false; try { localStorage.removeItem(SESSION_KEY); } catch { /* memoria */ } },
  scoreKey(type: 'total' | 'record' | 'level'): string { return key(session().username, type); },
  async loadProfile(): Promise<void> { const s = session(); const p = await rpc<Profile>('mi_perfil', { user_id: s.user_id, token: s.token }); cache(s, p); },
  async saveProgress(_record: number,_total: number,_level: number): Promise<void> {
   if(duelMode)return;
   await flush();
   await event('terminar',_record);
  }
};
