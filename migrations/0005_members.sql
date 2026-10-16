create table if not exists app_members (
  id text primary key,
  project_id text not null,
  email text not null,
  password_hash text not null,
  token text not null,
  created_at timestamptz not null default now(),
  unique (project_id, email)
);

create index if not exists app_members_token_idx on app_members (token);

create table if not exists app_orders (
  id text primary key,
  project_id text not null,
  member_id text not null,
  title text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists app_orders_member_idx on app_orders (project_id, member_id, created_at desc);
