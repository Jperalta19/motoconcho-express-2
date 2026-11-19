begin;
alter table public.progreso alter column puntos_totales type bigint;
create table public.duelos (
 id uuid primary key default gen_random_uuid(), codigo text unique not null default upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,8)), apuesta bigint not null check(apuesta>=50),
 estado text not null default 'espera' check(estado in ('espera','preparando','jugando','resolviendo','terminado','cancelado')),
 creador uuid not null references public.jugadores(id), invitado uuid references public.jugadores(id),
 distancia_a numeric not null default 0, distancia_b numeric not null default 0,
 vivo_a boolean not null default true,vivo_b boolean not null default true,
 actividad_a timestamptz not null default clock_timestamp(),actividad_b timestamptz,
 muerte_a timestamptz,muerte_b timestamptz, listo_a boolean not null default false,listo_b boolean not null default false,
 inicio timestamptz, cierre timestamptz, ganador uuid references public.jugadores(id), motivo text,
 creado timestamptz not null default clock_timestamp(), check(invitado is null or invitado<>creador)
);
create table public.duelo_movimientos(id bigint generated always as identity primary key,duelo uuid not null references public.duelos(id), jugador uuid not null references public.jugadores(id), concepto text not null, puntos bigint not null, creado timestamptz not null default clock_timestamp(),unique(duelo,jugador,concepto));
create table public.viajes_servidor(user_id uuid primary key references public.jugadores(id), inicio timestamptz not null, ultimo timestamptz not null, evento bigint not null default 0, puntos integer not null default 0, distancia numeric not null default 0, terminado boolean not null default false, plan jsonb not null default '[]'::jsonb, recogido integer not null default -1, run_id uuid not null default gen_random_uuid(), nivel_inicial integer not null default 1);
alter table public.duelos enable row level security;
alter table public.duelo_movimientos enable row level security;
alter table public.viajes_servidor enable row level security;
revoke all on public.duelos,public.duelo_movimientos,public.viajes_servidor from public,anon,authenticated;
create function public.duelo_usuario(token text) returns uuid language plpgsql security definer set search_path='' as $$ declare u uuid; begin select s.user_id into u from public.sesiones s where s.token_hash=encode(extensions.digest(token,'sha256'),'hex') and s.expires_at>now(); if u is null then raise exception 'Sesión inválida o vencida.'; end if; return u; end $$;
revoke all on function public.duelo_usuario(text) from public,anon,authenticated;
create function public.duelo_liquidar(sala uuid, vencedor uuid, razon text) returns void language plpgsql security definer set search_path='' as $$ declare d public.duelos; begin
 select * into d from public.duelos where id=sala for update;
 if d.estado not in ('preparando','jugando','resolviendo') then return; end if;
 if vencedor is not null and vencedor not in (d.creador,d.invitado) then raise exception 'Ganador inválido'; end if;
 if vencedor is null then
 update public.progreso set puntos_totales=puntos_totales+d.apuesta,updated_at=now() where user_id in(d.creador,d.invitado);
 insert into public.duelo_movimientos(duelo,jugador,concepto,puntos) values(d.id,d.creador,'devolucion',d.apuesta),(d.id,d.invitado,'devolucion',d.apuesta);
 else
 update public.progreso set puntos_totales=puntos_totales+2*d.apuesta,updated_at=now() where user_id=vencedor;
 insert into public.duelo_movimientos(duelo,jugador,concepto,puntos) values(d.id,vencedor,'premio',2*d.apuesta);
 end if;
 update public.duelos set estado='terminado',ganador=vencedor,motivo=razon,cierre=clock_timestamp() where id=d.id;
 end $$;
revoke all on function public.duelo_liquidar(uuid,uuid,text) from public,anon,authenticated;
create function public.duelo(token text, accion text, codigo text default null, apuesta bigint default null, distancia numeric default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; d public.duelos; a boolean; t timestamptz:=clock_timestamp(); otra uuid; saldo bigint; delta numeric; limite numeric; primera timestamptz; resultado jsonb;
begin
 if accion is null then raise exception 'Operación inválida.';end if;
 u:=public.duelo_usuario(token);
 perform pg_advisory_xact_lock(193881,1);
 if accion='crear' then
 if apuesta is null or apuesta<50 then raise exception 'La apuesta mínima es 50 puntos.'; end if;
 if exists(select 1 from public.duelos where (creador=u or invitado=u) and estado in('espera','preparando','jugando','resolviendo')) then raise exception 'Ya tienes una sala activa. Recupérala o cancélala.'; end if;
 if exists(select 1 from public.viajes_servidor where user_id=u and not terminado) then raise exception 'Termina el viaje solitario antes de duelar.'; end if;
 select puntos_totales into saldo from public.progreso where user_id=u for update;
 if saldo<apuesta then raise exception 'Saldo insuficiente. Juega solitario para juntar puntos; necesitas al menos 50.'; end if;
 insert into public.duelos(creador,apuesta) values(u,apuesta) returning * into d;
 elsif accion='actual' then
 select * into d from public.duelos where (creador=u or invitado=u) and estado in('espera','preparando','jugando','resolviendo') order by creado desc limit 1 for update;
 if d.id is null then return null; end if;
 else
 select * into d from public.duelos where duelos.codigo=upper(trim(duelo.codigo)) for update;
 if d.id is null then raise exception 'Sala inexistente.'; end if;
 end if;
 a:=d.creador=u; otra:=case when a then d.invitado else d.creador end;
 if accion in('ver','unir') and d.estado='espera' and not a then
 if accion='unir' then
 if apuesta is distinct from d.apuesta then raise exception 'Debes aceptar la apuesta exacta de la sala.'; end if;
 if exists(select 1 from public.duelos where (creador=u or invitado=u) and estado in('espera','preparando','jugando','resolviendo')) or exists(select 1 from public.viajes_servidor where user_id=u and not terminado) then raise exception 'Ya tienes una partida activa.'; end if;
 perform 1 from public.progreso where user_id in(u,d.creador) order by user_id for update;
 if (select count(*) from public.progreso where user_id in(u,d.creador) and puntos_totales>=d.apuesta)<>2 then raise exception 'Saldo insuficiente para la apuesta. Juega solitario para juntar puntos.'; end if;
 update public.progreso set puntos_totales=puntos_totales-d.apuesta,updated_at=now() where user_id in(u,d.creador);
 insert into public.duelo_movimientos(duelo,jugador,concepto,puntos) values(d.id,u,'escrow',-d.apuesta),(d.id,d.creador,'escrow',-d.apuesta);
 update public.duelos set invitado=u,estado='preparando',actividad_a=t,actividad_b=t where id=d.id returning * into d;
 else
 return jsonb_build_object('codigo',d.codigo,'apuesta',d.apuesta,'estado',d.estado,'nombre_a',(select username from public.jugadores where id=d.creador));
 end if;
 elsif not coalesce(u=d.creador or u=d.invitado,false) then raise exception 'Sala llena, iniciada o acceso no autorizado.';
 elsif accion='unir' then raise exception 'Sala llena o ya iniciada.';
 end if;
 a:=d.creador=u; otra:=case when a then d.invitado else d.creador end;
 if accion='latido' and d.estado='preparando' then
 update public.duelos set actividad_a=case when a then t else actividad_a end,actividad_b=case when not a then t else actividad_b end where id=d.id;
 end if;
 if accion='cancelar' then
 if d.estado='resolviendo' then null;
 elsif d.estado='espera' then update public.duelos set estado='cancelado',cierre=t,motivo='Cancelada sin apuesta' where id=d.id;
 elsif d.estado in('preparando','jugando','resolviendo') then perform public.duelo_liquidar(d.id,otra,'Abandono'); end if;
 elsif accion='listo' and d.estado='preparando' then
 update public.duelos set listo_a=listo_a or a,listo_b=listo_b or not a,actividad_a=case when a then t else actividad_a end,actividad_b=case when not a then t else actividad_b end where id=d.id returning * into d;
 if d.listo_a and d.listo_b then update public.duelos set estado='jugando',inicio=t+interval '3 seconds',actividad_a=t+interval '3 seconds',actividad_b=t+interval '3 seconds' where id=d.id; end if;
 elsif accion in('latido','morir') and d.estado in('jugando','resolviendo') then
 if t<d.inicio then
 if accion='morir' then raise exception 'El duelo no ha comenzado.'; end if;
 else
 if distancia is null or distancia::text in('NaN','Infinity','-Infinity') or distancia<0 then raise exception 'Distancia inválida.'; end if;
 delta:=distancia-case when a then d.distancia_a else d.distancia_b end;
 -- Envelope físico conservador: velocidad base y crecimiento máximo de un objeto cada 0.34 s, nitro incluido.
 limite:=1.55*(22+2.5*floor((extract(epoch from(t-d.inicio))/0.34*15)/100));
 if delta<0 or delta>limite*greatest(0,extract(epoch from(t-case when a then d.actividad_a else d.actividad_b end)))+15 then raise exception 'Distancia fuera del límite físico.'; end if;
 if (a and d.vivo_a) or (not a and d.vivo_b) then
 update public.duelos set distancia_a=case when a then distancia else distancia_a end,distancia_b=case when not a then distancia else distancia_b end,
 actividad_a=case when a then t else actividad_a end,actividad_b=case when not a then t else actividad_b end,
 vivo_a=case when a and accion='morir' then false else vivo_a end,vivo_b=case when not a and accion='morir' then false else vivo_b end,
 muerte_a=case when a and accion='morir' then t else muerte_a end,muerte_b=case when not a and accion='morir' then t else muerte_b end,
 estado=case when accion='morir' then 'resolviendo' else estado end where id=d.id;
 end if; end if;
 elsif accion not in('crear','actual','ver','unir','listo','reclamar','latido','morir','cancelar') then raise exception 'Operación inválida.';
 end if;
 select * into d from public.duelos where id=d.id;
 if d.estado='resolviendo' then
 primera:=least(d.muerte_a,d.muerte_b);
 if not d.vivo_a and not d.vivo_b and abs(extract(epoch from(d.muerte_a-d.muerte_b)))<=2 then
 perform public.duelo_liquidar(d.id,case when d.distancia_a>d.distancia_b then d.creador when d.distancia_b>d.distancia_a then d.invitado else null end,'Choques simultáneos');
 elsif t>=primera+interval '2 seconds' then perform public.duelo_liquidar(d.id,case when d.muerte_a is null then d.creador when d.muerte_b is null then d.invitado when d.muerte_a<d.muerte_b then d.invitado else d.creador end,'Primer choque'); end if;
 elsif accion='reclamar' and d.estado in('preparando','jugando') then
 if t-(case when a then d.actividad_b else d.actividad_a end)<interval '10 seconds' then raise exception 'El rival aún no lleva 10 segundos sin señal.'; end if;
 perform public.duelo_liquidar(d.id,u,'Desconexión del rival');
 end if;
 select to_jsonb(x) into resultado from public.duelos x where x.id=d.id;
 return resultado || jsonb_build_object('yo',u,'nombre_a',(select username from public.jugadores where id=d.creador),'nombre_b',(select username from public.jugadores where id=d.invitado),'saldo',(select puntos_totales from public.progreso where user_id=u),'ahora',clock_timestamp());
end $$;
revoke all on function public.duelo(text,text,text,bigint,numeric) from public;
grant execute on function public.duelo(text,text,text,bigint,numeric) to anon,authenticated;
-- El endpoint antiguo ya no puede escribir saldos desde totales del navegador.
create or replace function public.guardar_progreso(user_id uuid,record_m integer,puntos_totales integer,nivel integer,token text) returns jsonb language plpgsql security definer set search_path='' as $$ begin perform public.mi_perfil(user_id,token); raise exception 'Cliente antiguo: recarga el juego para guardar mediante viajes validados.'; end $$;
create function public.viaje(token text,accion text,secuencia bigint default 0,evento text default null,distancia numeric default 0, viaje_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; v public.viajes_servidor; t timestamptz:=clock_timestamp(); dt numeric; valor integer; p public.progreso; idx integer; ficha bigint; mapa jsonb;
begin
 u:=public.duelo_usuario(token); perform pg_advisory_xact_lock(193881,1);
 if accion='descartar' then update public.viajes_servidor set terminado=true where user_id=u;return public.mi_perfil(u,token);end if;
 if accion='iniciar' then
 if exists(select 1 from public.duelos where (creador=u or invitado=u) and estado in('espera','preparando','jugando','resolviendo')) then raise exception 'Termina o cancela el duelo primero.'; end if;
 select * into p from public.progreso where user_id=u for update;
 select jsonb_agg(floor(random()*2147483647)::bigint) into mapa from generate_series(1,15001);
 insert into public.viajes_servidor(user_id,inicio,ultimo,plan,nivel_inicial) values(u,t,t,mapa,p.nivel) on conflict(user_id) do update set inicio=t,ultimo=t,evento=0,puntos=0,distancia=0,terminado=false,plan=mapa,recogido=-1,run_id=gen_random_uuid(),nivel_inicial=p.nivel;
 return jsonb_build_object('perfil',public.mi_perfil(u,token),'plan',mapa,'viaje_id',(select run_id from public.viajes_servidor where user_id=u));
 end if;
 select * into v from public.viajes_servidor where user_id=u for update;
 if viaje_id is distinct from v.run_id then raise exception 'Viaje no vigente.'; end if;
 if v.user_id is null then raise exception 'Inicia un viaje primero.'; end if;
 if v.terminado then return public.mi_perfil(u,token); end if;
 if secuencia<=v.evento then return public.mi_perfil(u,token); end if;
 if secuencia<>v.evento+1 then raise exception 'Secuencia de eventos inválida.'; end if;
 dt:=extract(epoch from(t-v.inicio));
 if dt>7200 then raise exception 'Viaje vencido.'; end if;
 select * into p from public.progreso where user_id=u for update;
 if distancia is null or distancia::text in('NaN','Infinity','-Infinity') or distancia<v.distancia or distancia>1.55*(22+2.5*(p.nivel+floor(dt/0.34*15/100)))*dt+15 then raise exception 'Distancia inválida.'; end if;
 valor:=0;
 if accion='recoger' then
 idx:=evento::integer;
 if idx<0 or idx<=v.recogido or idx>=jsonb_array_length(v.plan) or idx>floor(dt/0.48)+1 then raise exception 'Objeto inexistente, prematuro o ya consumido.'; end if;
 ficha:=(v.plan->>idx)::bigint%10000;
 valor:=case when ficha>=4400 and ficha<6800 then 10 when ficha>=6800 and ficha<8200 then 15 else 0 end;
 end if;
 if accion='recoger' then
 if valor=0 or v.puntos+valor>15*(1+floor(dt/0.34)) then raise exception 'Recogida inválida.'; end if;
 update public.progreso set puntos_totales=puntos_totales+valor,updated_at=now() where user_id=u;
 elsif accion<>'terminar' then raise exception 'Evento inválido.'; end if;
 update public.viajes_servidor set evento=secuencia,puntos=puntos+valor,distancia=viaje.distancia,ultimo=t,recogido=case when accion='recoger' then idx else recogido end,terminado=accion='terminar' where user_id=u;
 update public.progreso set record_m=greatest(record_m,floor(viaje.distancia)::integer),nivel=greatest(1,v.nivel_inicial+floor((v.puntos+valor)/100)::integer),updated_at=now() where user_id=u;
 return public.mi_perfil(u,token);
end $$;
revoke all on function public.viaje(text,text,bigint,text,numeric,uuid) from public;
grant execute on function public.viaje(text,text,bigint,text,numeric,uuid) to anon,authenticated;
commit;