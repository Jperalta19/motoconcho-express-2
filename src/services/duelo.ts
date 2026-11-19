import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './db';
import { Auth } from './auth';
import type { RideScene } from '../scenes/RideScene';
interface Room {id:string;codigo:string;apuesta:number;estado:string;creador:string;invitado:string|null;yo:string;nombre_a:string;nombre_b:string|null;distancia_a:number;distancia_b:number;vivo_a:boolean;vivo_b:boolean;ganador:string|null;motivo:string|null;inicio:string|null;ahora:string;saldo:number;actividad_a:string;actividad_b:string;}
export function initDuelo(getScene:()=>RideScene|null):void {
 const start=document.getElementById('start')!;
 const button=document.createElement('button');button.className='action secondary';button.textContent='Duelo · 2 jugadores';start.querySelector('.card')!.append(button);
 const panel=document.createElement('section');panel.className='overlay';panel.id='duelo';panel.hidden=true;panel.setAttribute('aria-label','Modo Duelo');
 panel.innerHTML='<div class="card" style="max-height:90%;overflow:auto"><div class="eyebrow">DOS PISTAS · UN GANADOR</div><h2>Duelo</h2><p id="duelo-info" role="status"></p><div id="duelo-options"><label for="duelo-bet">Apuesta en puntos (mínimo 50)</label><input id="duelo-bet" type="number" min="50" step="1" value="50"><button id="duelo-create" class="action">Crear sala</button><label for="duelo-code">Código de sala</label><input id="duelo-code" maxlength="8" autocapitalize="characters" autocomplete="off"><button id="duelo-preview" class="action secondary">Buscar sala</button></div><button id="duelo-accept" class="action" hidden>Aceptar apuesta y unirme</button><button id="duelo-ready" class="action" hidden>¡Estoy listo!</button><button id="duelo-claim" class="action secondary" hidden>Reclamar victoria por abandono</button><button id="duelo-leave" class="action secondary">Volver</button><p class="mini">El primero que choca pierde. Choques dentro de 2 s: gana la mayor distancia; igualdad exacta devuelve las apuestas. Tras 10 s sin señal del rival puedes reclamar el pozo. Salir de un duelo iniciado entrega el pozo al rival.</p><p id="duelo-error" role="alert"></p></div>';
 document.querySelector('.shell')!.append(panel);
 const manage=document.createElement('button');manage.textContent='Sala Duelo';manage.hidden=true;manage.style.cssText='position:absolute;top:230px;right:12px;z-index:12;font-size:12px';manage.onclick=()=>{panel.hidden=false;};document.querySelector('.shell')!.append(manage);
 const live=document.createElement('div');live.id='duelo-live';live.hidden=true;live.style.cssText='position:absolute;top:175px;left:5%;width:90%;z-index:8;background:#103b49;color:#fff1c6;padding:8px;border-radius:12px;font-size:13px;pointer-events:none';document.querySelector('.shell')!.append(live);
 const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
 const info=el('duelo-info'),error=el('duelo-error'),options=el('duelo-options');
 let room:Room|null=null,preview:Room|null=null,busy=false,started=false,recovered=false,dead=false,stopped=false,clockOffset=0,lastSignal=0;
 let channel:RealtimeChannel|null=null,topic='';
 const realtime=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 function controls(disabled:boolean):void {['play','again','logout'].forEach(id=>{const b=el<HTMLButtonElement>(id);if(b)b.disabled=disabled;});}
 async function call(action:string,extra:Record<string,unknown>={}):Promise<Room|null>{return Auth.request<Room|null>('duelo',{accion:action,codigo:room?.codigo,...extra});}
 async function safe(fn:()=>Promise<void>):Promise<void>{if(busy)return;busy=true;error.textContent='';try{await fn();}catch(e){error.textContent=e instanceof Error?e.message:'No se pudo conectar.';}finally{busy=false;}}
 function isA(r:Room):boolean{return r.creador===r.yo;}
 function freeze():void {const s=getScene();if(s)s.alive=false;stopped=true;}
 async function connect(r:Room):Promise<void>{
 if(topic===r.id)return;if(channel)await realtime.removeChannel(channel);topic=r.id;
 channel=realtime.channel('duelo:'+r.id,{config:{broadcast:{self:false},presence:{key:r.yo}}});
 channel.on('broadcast',{event:'actualiza'},()=>{lastSignal=0;});
 channel.on('presence',{event:'sync'},()=>{live.dataset.presencia=String(Object.keys(channel!.presenceState()).length);});
 channel.subscribe(status=>{if(status==='SUBSCRIBED')void channel?.track({nombre:Auth.getCurrentUser()});});
 }
 function draw(r:Room):void {
 room=r;clockOffset=Date.parse(r.ahora)-Date.now();const a=isA(r);const mine=Number(a?r.distancia_a:r.distancia_b),other=Number(a?r.distancia_b:r.distancia_a),opponent=(a?r.nombre_b:r.nombre_a)||'Esperando rival';
 const active=['espera','preparando','jugando','resolviendo'].includes(r.estado);controls(active);manage.hidden=!active;
 options.hidden=!!r.id;el('duelo-accept').hidden=true;el('duelo-ready').hidden=r.estado!=='preparando';
 const rivalLast=Date.parse(a?r.actividad_b:r.actividad_a);const canClaim=['preparando','jugando'].includes(r.estado)&&Date.now()+clockOffset-rivalLast>=10000;
 if(canClaim){panel.hidden=false;info.textContent='El rival lleva al menos 10 segundos sin señal. Puedes reclamar la victoria.';}
 el('duelo-claim').hidden=!canClaim;
 el('duelo-leave').textContent=active?(r.estado==='espera'?'Cancelar sala':'Abandonar (pierdes la apuesta)'):'Volver al menú';
 if(r.estado==='espera'){info.textContent='Sala '+r.codigo+' · Duelo a '+r.apuesta+' puntos. Comparte el código. Los puntos se congelan cuando el rival acepta.';}
 if(r.estado==='preparando'){info.textContent='Duelo a '+r.apuesta+' puntos contra '+opponent+'. Pozo: '+(2*r.apuesta)+' puntos. Ambos deben pulsar ¡Estoy listo!';}
 if(r.estado==='jugando'){
 const delay=Math.max(0,Date.parse(r.inicio!)-(Date.now()+clockOffset));
 if(!started&&!recovered&&delay<1){started=true;Auth.setDuel(true);void getScene()?.startRide();panel.hidden=true;live.hidden=false;}
 if(!started){info.textContent=recovered?'Duelo recuperado. No se reinicia la pista: abandona o reclama si el rival está desconectado.':'¡Arrancamos en '+Math.ceil(delay/1000)+'!';}
 }
 if(r.estado==='resolviendo'){freeze();live.hidden=false;live.textContent='¡Choque! Verificando ventana de 2 segundos…';}
 else if(['jugando','preparando'].includes(r.estado)){
 live.textContent='Tú: '+Math.floor(getScene()?.distance||mine)+' m · '+opponent+': '+Math.floor(other)+' m · '+((a?r.vivo_b:r.vivo_a)?'Vivo':'Muerto')+' · Pozo '+2*r.apuesta;
 }
 if(!active){freeze();live.hidden=true;panel.hidden=false;el('duelo-ready').hidden=true;el('duelo-claim').hidden=true;
 const verdict=r.estado==='cancelado'?'Sala cancelada sin cobrar apuestas':r.ganador===null?'Empate: apuesta devuelta':r.ganador===r.yo?'¡Ganaste el pozo!':'Ganó '+opponent;
 info.textContent=verdict+' · Tú: '+mine.toFixed(2)+' m · '+opponent+': '+other.toFixed(2)+' m · Pozo: '+2*r.apuesta+' puntos · Saldo: '+r.saldo+' · '+(r.motivo||'');
 Auth.setDuel(false);void Auth.loadProfile().catch(()=>undefined);
 }
 }
 async function accept(r:Room|null):Promise<void>{if(!r)return;draw(r);await connect(r);}
 button.onclick=()=>void safe(async()=>{
 if(getScene()?.alive)throw new Error('Termina el viaje primero.');await Auth.request('viaje',{accion:'descartar'});await Auth.loadProfile();panel.hidden=false;start.hidden=true;el('over').hidden=true;room=null;preview=null;started=false;dead=false;stopped=false;recovered=false;options.hidden=false;live.hidden=true;el<HTMLButtonElement>('duelo-ready').disabled=false;el('duelo-accept').hidden=true;el('duelo-ready').hidden=true;el('duelo-claim').hidden=true;
 const current=await call('actual');if(current){recovered=['jugando','resolviendo'].includes(current.estado);await accept(current);return;}
 const balance=Number(localStorage.getItem(Auth.scoreKey('total')));info.textContent=balance<50?'Necesitas al menos 50 puntos. Juega solitario para juntar puntos.':'Saldo: '+balance+' puntos. Crea una sala o busca un código.';
 el<HTMLButtonElement>('duelo-create').disabled=balance<50;el<HTMLButtonElement>('duelo-preview').disabled=balance<50;
 });
 el('duelo-create').onclick=()=>void safe(async()=>{const bet=Number(el<HTMLInputElement>('duelo-bet').value);if(!Number.isSafeInteger(bet)||bet<50)throw new Error('La apuesta mínima es 50 puntos enteros.');await accept(await call('crear',{apuesta:bet}));});
 el('duelo-preview').onclick=()=>void safe(async()=>{preview=await call('ver',{codigo:el<HTMLInputElement>('duelo-code').value.trim().toUpperCase()});if(!preview)return;info.textContent='Duelo a '+preview.apuesta+' puntos contra '+preview.nombre_a+'. Aceptar congela tu apuesta y la del creador.';el('duelo-accept').hidden=false;});
 el('duelo-accept').onclick=()=>void safe(async()=>{if(!preview)return;await accept(await call('unir',{codigo:preview.codigo,apuesta:preview.apuesta}));preview=null;});
 el('duelo-ready').onclick=()=>void safe(async()=>{await accept(await call('listo'));el<HTMLButtonElement>('duelo-ready').disabled=true;});
 el('duelo-claim').onclick=()=>void safe(async()=>{await accept(await call('reclamar'));});
 el('duelo-leave').onclick=()=>void safe(async()=>{
 if(room&&['espera','preparando','jugando','resolviendo'].includes(room.estado)){await accept(await call('cancelar'));return;}
 freeze();Auth.setDuel(false);room=null;preview=null;panel.hidden=true;live.hidden=true;start.hidden=false;controls(false);el<HTMLButtonElement>('duelo-ready').disabled=false;
 if(channel)await realtime.removeChannel(channel);channel=null;topic='';await Auth.loadProfile();getScene()?.loadScores();
 });
 window.addEventListener('duelo-muerte',()=>{dead=true;lastSignal=0;});
 window.setInterval(()=>{
 if(!room||busy||!['espera','preparando','jugando','resolviendo'].includes(room.estado))return;
 const now=Date.now();if(now-lastSignal<500)return;lastSignal=now;
 void safe(async()=>{
 const action=dead?'morir':recovered?'ver':room!.estado==='espera'?'ver':'latido';
 const r=await call(action,{distancia:getScene()?.distance||0});if(r){draw(r);if(dead&&r.estado!=='jugando')dead=false;}
 if(channel)void channel.send({type:'broadcast',event:'actualiza',payload:{}});
 });
 },250);
 window.addEventListener('beforeunload',()=>{if(room&&started&&!stopped)freeze();});
}
