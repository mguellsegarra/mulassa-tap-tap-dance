-- Run as postgres in the SQL editor. All fixtures are rolled back, never real players.
begin;
insert into auth.users(id, is_anonymous) values
 ('fca4d0d0-0000-4000-8000-000000000001', true),
 ('fca4d0d0-0000-4000-8000-000000000002', true);
set local role anon;
do $$ begin
  perform * from public.get_leaderboard_all('mulassa-v1');
  begin
    perform * from leaderboard_private.entries;
    raise exception 'FAIL: anon can access private entries';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.submit_result('mulassa-v1',0,120,20,10,54321,50,'Prova Ànec');
    raise exception 'FAIL: anon can submit';
  exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','fca4d0d0-0000-4000-8000-000000000001',true);
do $$ begin
  if not (select improved from public.submit_result('mulassa-v1',0,120,20,10,54321,50,'Prova Ànec')) then raise exception 'FAIL: first submission'; end if;
  begin
    perform * from public.submit_result('mulassa-v1',0,120,20,10,54321,50,'Prova Ànec');
    raise exception 'FAIL: cooldown';
  exception when raise_exception then
    if sqlerrm <> 'leaderboard_rate_limit' then raise; end if;
  end;
  begin
    perform * from public.submit_result('mulassa-v1',0,120,20,9,54321,50,'Prova Ànec');
    raise exception 'FAIL: invalid total accepted';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
update leaderboard_private.profiles set last_write_at=now()-interval '11 seconds' where user_id='fca4d0d0-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin
  if (select improved from public.submit_result('mulassa-v1',0,119,21,10,999999,50,'Prova Ànec')) then raise exception 'FAIL: points beat quality'; end if;
end $$;
select set_config('request.jwt.claim.sub','fca4d0d0-0000-4000-8000-000000000002',true);
select * from public.submit_result('mulassa-v1',0,121,19,10,1,50,'Prova Portador');
do $$ begin
  if (select alias from public.get_leaderboard_all('mulassa-v1') where is_self) <> 'Prova Portador' then raise exception 'FAIL: self marker'; end if;
  begin
    delete from leaderboard_private.entries;
    raise exception 'FAIL: private delete allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
delete from auth.users where id='fca4d0d0-0000-4000-8000-000000000002';
do $$ begin
  if exists(select 1 from leaderboard_private.entries where user_id='fca4d0d0-0000-4000-8000-000000000002') then raise exception 'FAIL: missing cascade'; end if;
end $$;
select 'PASS: public read, private tables, own submission, exact ranking, cooldown, validation and cascade' as validation;
rollback;
