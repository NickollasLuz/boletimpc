-- Inventário TI compartilhado: execute este arquivo UMA VEZ no SQL Editor do Supabase.
-- Segurança: somente usuários autenticados podem ler ou alterar seções e computadores.
-- Nunca coloque a chave service_role no arquivo config.js do site.

create extension if not exists pgcrypto;

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.pcs (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete cascade,
  manufacturer text not null default '',
  model text not null default '',
  bmp text not null default '',
  serial text not null default '',
  cpu text not null default '',
  ram text not null default '',
  os text not null default '',
  "user" text not null default '',
  hostname text not null default '',
  ip text not null default '',
  mac text not null default '',
  disk text not null default '',
  monitor text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pc_changes (
  id uuid primary key default gen_random_uuid(),
  pc_id uuid,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  section_name text not null default '',
  pc_label text not null default '',
  details text not null default '',
  changed_by text not null default 'Usuário não identificado',
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

alter table public.sections enable row level security;
alter table public.pcs enable row level security;
alter table public.pc_changes enable row level security;

revoke all on public.sections, public.pcs, public.pc_changes from anon, public;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.sections to authenticated;
grant select, insert, update, delete on public.pcs to authenticated;
grant select on public.pc_changes to authenticated;

-- Políticas acessíveis apenas após login (Auth). Não são concedidas permissões ao papel anon.
drop policy if exists "Authenticated users manage sections" on public.sections;
create policy "Authenticated users manage sections" on public.sections
  for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users manage PCs" on public.pcs;
create policy "Authenticated users manage PCs" on public.pcs
  for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users read PC change history" on public.pc_changes;
create policy "Authenticated users read PC change history" on public.pc_changes
  for select to authenticated using (true);

-- Importa a base inicial fornecida, sem duplicar registros se o script for executado novamente.
insert into public.sections (name) values
  ('SERVIÇO SOCIAL GAP-BE'),
  ('VICE CHEFIA GAP-BE'),
  ('ACESSORIA DE PLANEJAMENTO E GOVERNANÇA'),
  ('DIVISÃO DE OBTENÇÃO DE CONTRATOS - DOC'),
  ('DRH2')
on conflict (name) do nothing;

do $seed$
begin
  if not exists (select 1 from public.pcs) then
    insert into public.pcs (section_id, manufacturer, model, bmp, serial, cpu, ram, os)
    select s.id, v.manufacturer, v.model, v.bmp, v.serial, v.cpu, v.ram, v.os
    from (values
('SERVIÇO SOCIAL GAP-BE', 'POSITIVO', 'MASTER', '1915831', '', 'I3 6100', '16 GB', 'WIN10 PRO'),
('SERVIÇO SOCIAL GAP-BE', 'DELL', '9020', '', '72646994378', 'I5 4590', '16 GB', 'WIN10 PRO'),
('SERVIÇO SOCIAL GAP-BE', 'DELL', 'OPTIPLEX 9020', '1689383', '', 'I5-4G', '8 GB', 'WIN10 PRO'),
('SERVIÇO SOCIAL GAP-BE', 'DELL', 'OPTIPLEX 3050', '1907600', '', 'I3-7G', '4 GB', 'WIN10 PRO'),
('SERVIÇO SOCIAL GAP-BE', 'VINIK', '', '', '', 'I3-4G', '8 GB', 'WIN10 PRO'),
('SERVIÇO SOCIAL GAP-BE', 'POSITIVO', 'MASTER', '1915831', '', 'I3 6100', '16 GB', 'WIN10 PRO'),
('SERVIÇO SOCIAL GAP-BE', 'DELL', '9020', '', '72646994378', 'I5 4590', '16 GB', 'WIN11 PRO'),
('VICE CHEFIA GAP-BE', 'DATEN', '', '2466540', '', 'RYZEN 3 PRO 5355GE 3.60 GHz', '8 GB', 'WIN11 PRO'),
('VICE CHEFIA GAP-BE', 'DELL', '7050', '2127639', '', 'I5-7G', '8 GB', 'WIN11 PRO'),
('VICE CHEFIA GAP-BE', 'DATEN', '', '2466540', '', 'RYZEN 3 PRO 5355GE 3.60 GHz', '8 GB', 'WIN11 PRO'),
('ACESSORIA DE PLANEJAMENTO E GOVERNANÇA', 'POSITIVO', '', '1915836', '', 'I3 6100', '8 GB', 'WINDOWS 10'),
('ACESSORIA DE PLANEJAMENTO E GOVERNANÇA', 'DELL', 'OPTIPLEX 9020', '1861024', '', 'I3 7100', '12 GB', 'WIN11'),
('ACESSORIA DE PLANEJAMENTO E GOVERNANÇA', 'DELL', 'OPTIPLEX 790', '1338621', '', 'I3 2120', '8 GB', 'WIN 10'),
('DIVISÃO DE OBTENÇÃO DE CONTRATOS - DOC', 'DELL', 'OPTIPLEX **', '', '', '', '8 GB', 'WIN10 PRO'),
('DIVISÃO DE OBTENÇÃO DE CONTRATOS - DOC', 'DATEN', '', '2471441', '', 'AMD RYZEN 3 PRO', '8 GB', 'WIN11 PRO'),
('DIVISÃO DE OBTENÇÃO DE CONTRATOS - DOC', 'DELL', 'OPTIPLEX 7010', '', '7105NZ1', 'I3-3G', '4 GB', 'WIN10 PRO'),
('DIVISÃO DE OBTENÇÃO DE CONTRATOS - DOC', 'DATEN', '', '2471426', '', 'AMD RYZEN 3 PRO', '8 GB', 'WIN11 PRO'),
('DIVISÃO DE OBTENÇÃO DE CONTRATOS - DOC', 'DATEN', '', '2471424', '', 'AMD RYZEN 3 PRO', '8 GB', 'WIN11 PRO'),
('DIVISÃO DE OBTENÇÃO DE CONTRATOS - DOC', 'DATEN', '', '2471442', '', 'AMD RYZEN 3 PRO', '8 GB', 'WIN11 PRO'),
('DIVISÃO DE OBTENÇÃO DE CONTRATOS - DOC', 'DATEN', '', '2471435', '', 'AMD RYZEN 3 PRO', '8 GB', 'WIN11 PRO'),
('DIVISÃO DE OBTENÇÃO DE CONTRATOS - DOC', 'DATEN', '', '2471440', '', 'AMD RYZEN 3 PRO', '8 GB', 'WIN11 PRO'),
('DIVISÃO DE OBTENÇÃO DE CONTRATOS - DOC', 'DATEN', '', '2471443', '', 'AMD RYZEN 3 PRO', '8 GB', 'WIN11 PRO'),
('DIVISÃO DE OBTENÇÃO DE CONTRATOS - DOC', 'DATEN', '', '2471434', '', 'AMD RYZEN 3 PRO', '8 GB', 'WIN11 PRO'),
('DIVISÃO DE OBTENÇÃO DE CONTRATOS - DOC', 'THINKCENTRE', '', '2127640', '', 'I3-9G', '4 GB', 'WIN10 PRO'),
('DRH2', 'DELL', 'OPTIPLEX 7010', '1797612', '', 'I3-3G', '8 GB', 'WIN10 PRO'),
('DRH2', 'DATEN', '', '2466541', '', 'AMD RYZEN 3 PRO', '8 GB', 'WIN11 PRO'),
('DRH2', 'DELL', 'OPTIPLEX 9020', '', 'JB57M22', 'I5-4G', '8 GB', 'WIN10 PRO'),
('DRH2', 'DELL', 'OPTIPLEX 3040', '', 'GZYPLG2', 'I3-6G', '8 GB', 'WIN10 PRO'),
('DRH2', 'DATEN', '', '2466500', '', 'AMD RYZEN 3 PRO', '8 GB', 'WIN11 PRO'),
('DRH2', 'DATEN', '', '2466501', '', 'AMD RYZEN 3 PRO', '8 GB', 'WIN11 PRO'),
('DRH2', 'HP', 'COMPAQ', '1330085', '', 'I5-3G', '8 GB', 'WIN10 PRO'),
('DRH2', 'DATEN', '', '2466543', '', 'AMD RYZEN 3 PRO', '8 GB', 'WIN11 PRO'),
('DRH2', 'DELL', 'OPTIPLEX 3040', '1791613', '', 'I3 3.70 GHz', '4 GB', 'WIN11 PRO')
    ) as v(section_name, manufacturer, model, bmp, serial, cpu, ram, os)
    join public.sections s on s.name = v.section_name;
  end if;
end;
$seed$;

create or replace function public.set_pc_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pcs_set_updated_at on public.pcs;
create trigger pcs_set_updated_at before update on public.pcs
for each row execute function public.set_pc_updated_at();

create or replace function public.log_pc_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_row jsonb;
  v_old jsonb;
  v_new jsonb;
  v_section_id uuid;
  v_pc_id uuid;
  v_section_name text;
  v_pc_label text;
  v_details text;
  v_fields text;
begin
  if tg_op = 'INSERT' then
    v_row := to_jsonb(new); v_old := null; v_new := v_row;
    v_pc_id := new.id; v_section_id := new.section_id;
    v_pc_label := concat_ws(' ', nullif(new.manufacturer, ''), nullif(new.model, ''));
    v_details := 'Novo computador cadastrado.';
  elsif tg_op = 'UPDATE' then
    v_row := to_jsonb(new); v_old := to_jsonb(old); v_new := v_row;
    v_pc_id := new.id; v_section_id := new.section_id;
    v_pc_label := concat_ws(' ', nullif(new.manufacturer, ''), nullif(new.model, ''));
    select string_agg(n.key, ', ' order by n.key) into v_fields
      from jsonb_each(v_new) as n(key, value)
      where n.key not in ('updated_at','created_at') and (v_old -> n.key) is distinct from n.value;
    v_details := case when coalesce(v_fields, '') = '' then 'Registro salvo.' else 'Campos alterados: ' || v_fields || '.' end;
  else
    v_row := to_jsonb(old); v_old := v_row; v_new := null;
    v_pc_id := old.id; v_section_id := old.section_id;
    v_pc_label := concat_ws(' ', nullif(old.manufacturer, ''), nullif(old.model, ''));
    v_details := 'Computador excluído do inventário.';
  end if;

  select name into v_section_name from public.sections where id = v_section_id;
  insert into public.pc_changes (pc_id, action, section_name, pc_label, details, changed_by, old_data, new_data)
  values (
    v_pc_id, tg_op, coalesce(v_section_name, 'Seção removida'),
    coalesce(nullif(v_pc_label, ''), 'Computador sem identificação'), v_details,
    coalesce(auth.jwt() ->> 'email', 'Usuário autenticado'), v_old, v_new
  );
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists pcs_audit_changes on public.pcs;
create trigger pcs_audit_changes after insert or update or delete on public.pcs
for each row execute function public.log_pc_change();

-- Ativa a entrega em tempo real para as tabelas utilizadas pelo site.
do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sections') then
      execute 'alter publication supabase_realtime add table public.sections';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pcs') then
      execute 'alter publication supabase_realtime add table public.pcs';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pc_changes') then
      execute 'alter publication supabase_realtime add table public.pc_changes';
    end if;
  end if;
end;
$realtime$;
