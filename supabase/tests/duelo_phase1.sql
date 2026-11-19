begin;
create temporary table pruebas(nombre text,resultado text) on commit drop;
do $$ declare a uuid;b uuid;ta text:=encode(extensions.gen_random_bytes(32),'hex');tb text:=encode(extensions.gen_random_bytes(32),'hex');r jsonb;c text;fail boolean; begin
 select id into a from public.jugadores where username='boba_test'; select id into b from public.jugadores where username='jperaltar';
 if a is null or b is null then raise exception 'Faltan cuentas para pruebas reversibles';end if;
 delete from public.sesiones where user_id in(a,b);insert into public.sesiones(user_id,token_hash) values(a,encode(extensions.digest(ta,'sha256'),'hex')),(b,encode(extensions.digest(tb,'sha256'),'hex'));
 update public.progreso set puntos_totales=1000 where user_id in(a,b);
 begin perform public.duelo('invalido','crear',null,50);raise exception 'ACEPTADO';exception when others then if SQLERRM not like 'Sesión inválida%' then raise;end if;insert into pruebas values('token inválido',SQLERRM);end;
 begin perform public.duelo(ta,'crear',null,49);raise exception 'ACEPTADO';exception when others then if SQLERRM not like 'La apuesta mínima%' then raise;end if;insert into pruebas values('apuesta 49',SQLERRM);end;
 begin perform public.duelo(ta,'unir','NOEXISTE',50);raise exception 'ACEPTADO';exception when others then if SQLERRM<>'Sala inexistente.' then raise;end if;insert into pruebas values('sala inexistente',SQLERRM);end;
 begin perform public.duelo(ta,'crear',null,1001);raise exception 'ACEPTADO';exception when others then if SQLERRM not like 'Saldo insuficiente%' then raise;end if;insert into pruebas values('saldo insuficiente',SQLERRM);end;
 r:=public.duelo(ta,'crear',null,50);c:=r->>'codigo';insert into pruebas values('crear',r->>'estado');
 r:=public.duelo(tb,'unir',c,50);insert into pruebas values('escrow',(select string_agg(puntos_totales::text,',') from public.progreso where user_id in(a,b)));
 begin perform public.duelo(ta,'unir',c,50);raise exception 'ACEPTADO';exception when others then if SQLERRM<>'Sala llena o ya iniciada.' then raise;end if;insert into pruebas values('sala llena',SQLERRM);end;
 r:=public.duelo(ta,'listo',c);r:=public.duelo(tb,'listo',c);insert into pruebas values('inicio',r->>'estado');
 begin perform public.duelo(tb,'unir',c,50);raise exception 'ACEPTADO';exception when others then if SQLERRM<>'Sala llena o ya iniciada.' then raise;end if;insert into pruebas values('sala iniciada',SQLERRM);end;
 r:=public.duelo(ta,'cancelar',c);r:=public.duelo(ta,'cancelar',c);insert into pruebas values('premio una sola vez',(select string_agg(puntos_totales::text,',') from public.progreso where user_id in(a,b)));
 begin perform public.guardar_progreso(a,0,999999,1,ta);raise exception 'ACEPTADO';exception when others then if SQLERRM not like 'Cliente antiguo%' then raise;end if;insert into pruebas values('total cliente rechazado',SQLERRM);end;

 -- Round-trip cancellation and death rules, all modifications rolled back.
 if (select puntos_totales from public.progreso where user_id=a)<>950 or (select puntos_totales from public.progreso where user_id=b)<>1050 then raise exception 'Premio incorrecto o duplicado';end if;
 r:=public.duelo(ta,'crear',null,50);c:=r->>'codigo';r:=public.duelo(ta,'cancelar',c);if r->>'estado'<>'cancelado' then raise exception 'No cancela';end if;insert into pruebas values('cancelar espera','sin cobrar');
 r:=public.duelo(ta,'crear',null,50);c:=r->>'codigo';r:=public.duelo(tb,'unir',c,50);r:=public.duelo(ta,'listo',c);r:=public.duelo(tb,'listo',c);
 update public.duelos set inicio=clock_timestamp()-interval '5 seconds',actividad_a=clock_timestamp()-interval '5 seconds',actividad_b=clock_timestamp()-interval '5 seconds' where duelos.codigo=c;
 r:=public.duelo(ta,'morir',c,null,25);r:=public.duelo(tb,'morir',c,null,30);if r->>'ganador'<>b::text then raise exception 'No gana distancia mayor';end if;insert into pruebas values('choques simultáneos','gana distancia 30 vs 25');
 r:=public.duelo(ta,'crear',null,50);c:=r->>'codigo';r:=public.duelo(tb,'unir',c,50);r:=public.duelo(ta,'listo',c);r:=public.duelo(tb,'listo',c);
 update public.duelos set inicio=clock_timestamp()-interval '5 seconds',actividad_a=clock_timestamp()-interval '5 seconds',actividad_b=clock_timestamp()-interval '5 seconds' where duelos.codigo=c;
 r:=public.duelo(ta,'morir',c,null,25);r:=public.duelo(tb,'morir',c,null,25);if r->>'ganador' is not null or r->>'estado'<>'terminado' then raise exception 'No empata';end if;insert into pruebas values('empate exacto','devolución de ambas apuestas');
 r:=public.duelo(ta,'crear',null,50);c:=r->>'codigo';r:=public.duelo(tb,'unir',c,50);
 update public.duelos set actividad_b=clock_timestamp()-interval '11 seconds' where duelos.codigo=c;
 r:=public.duelo(ta,'reclamar',c);if r->>'ganador'<>a::text then raise exception 'Abandono incorrecto';end if;insert into pruebas values('desconexión 11 s','gana quien reclama');
 r:=public.viaje(ta,'iniciar');insert into pruebas values('viaje servidor',jsonb_array_length(r->'plan')::text||' objetos');
 begin perform public.viaje('invalido','iniciar');raise exception 'ACEPTADO';exception when others then if SQLERRM not like 'Sesión inválida%' then raise;end if;insert into pruebas values('viaje token inválido',SQLERRM);end;
 r:=public.viaje(ta,'descartar');
end $$;
select * from pruebas;
rollback;