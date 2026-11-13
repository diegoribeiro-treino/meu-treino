-- Meu Treino: tabela de dados por usuário, com Row Level Security.
-- Cole no Supabase: SQL Editor -> New query -> Run.

create table if not exists public.dados_app (
  user_id uuid primary key references auth.users (id) on delete cascade,
  conteudo jsonb not null,
  atualizado_em timestamptz not null default now()
);

alter table public.dados_app enable row level security;

-- Cada usuário só lê e grava a própria linha
create policy "dados_app: ler os próprios" on public.dados_app
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "dados_app: inserir os próprios" on public.dados_app
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dados_app: atualizar os próprios" on public.dados_app
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dados_app: apagar os próprios" on public.dados_app
  for delete to authenticated using ((select auth.uid()) = user_id);
