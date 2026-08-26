-- Estado compartilhado do módulo Projeto 2º Semestre.
create table if not exists public.configuracoes_projeto (
  chave text primary key,
  valor text not null default '',
  atualizado_em timestamp with time zone not null default now()
);

alter table public.configuracoes_projeto enable row level security;

drop policy if exists "Consultar configurações do projeto" on public.configuracoes_projeto;
create policy "Consultar configurações do projeto"
  on public.configuracoes_projeto for select to anon, authenticated using (true);

drop policy if exists "Criar configurações do projeto" on public.configuracoes_projeto;
create policy "Criar configurações do projeto"
  on public.configuracoes_projeto for insert to anon, authenticated with check (true);

drop policy if exists "Atualizar configurações do projeto" on public.configuracoes_projeto;
create policy "Atualizar configurações do projeto"
  on public.configuracoes_projeto for update to anon, authenticated using (true) with check (true);

grant select, insert, update on public.configuracoes_projeto to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'configuracoes_projeto'
  ) then
    alter publication supabase_realtime add table public.configuracoes_projeto;
  end if;
end $$;

