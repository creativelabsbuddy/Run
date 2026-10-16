create table if not exists projects (
  id text primary key,
  user_id text not null,
  title text not null,
  prompt text not null,
  html text not null default '',
  messages text not null default '[]',
  preview text,
  versions text not null default '[]',
  build text not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on projects (user_id, updated_at desc);
