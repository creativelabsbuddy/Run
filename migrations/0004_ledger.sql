create table if not exists ledger (
  user_id text primary key,
  credits double precision not null default 15,
  paid integer not null default 0,
  balance integer not null default 0,
  earnings integer not null default 0
);

create table if not exists purchases (
  buyer_id text not null,
  listing_id text not null,
  seller_id text not null,
  amount integer not null,
  created_at text not null,
  primary key (buyer_id, listing_id)
);

create table if not exists gates (
  id text primary key,
  owner_id text not null,
  price text not null default 'free',
  amount integer not null default 0,
  source text not null default 'hosted',
  url text not null default ''
);
