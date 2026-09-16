create table public.customers_table (
                                        id           uuid references auth.users on delete cascade primary key,
                                        username     text not null unique,
                                        email        text not null unique,
                                        database_id  text not null unique,
                                        status       text not null default 'active',
                                        created_at   timestamptz not null default now(),
                                        last_login   timestamptz
);

create table public.customers_table_database (
                                                 database_id   text primary key references public.customers_table(database_id) on delete cascade,
                                                 owner_uid     uuid references public.customers_table(id) on delete cascade not null,
                                                 file_path     text,
                                                 file_size     bigint not null default 0,
                                                 file_hash     text,
                                                 format        text not null default 'sqlite.gz',
                                                 version       int not null default 0,
                                                 last_update   timestamptz not null default now(),
                                                 created_at    timestamptz not null default now()
);

create table public.admin_table (
                                    id           uuid references auth.users on delete cascade primary key,
                                    username     text not null unique,
                                    email        text not null unique,
                                    created_at   timestamptz not null default now(),
                                    last_login   timestamptz
);

create index on public.customers_table (email);
create index on public.customers_table (database_id);
create index on public.customers_table_database (owner_uid);
create index on public.admin_table (email);

alter table public.customers_table          enable row level security;
alter table public.customers_table_database enable row level security;
alter table public.admin_table              enable row level security;

create or replace function public.is_admin()
returns boolean as $$
select exists (select 1 from public.admin_table where id = auth.uid());
$$ language sql security definer stable;

create policy "customer reads own row"
  on public.customers_table for select
                                              to authenticated
                                              using (auth.uid() = id or public.is_admin());

create policy "customer updates own row"
  on public.customers_table for update
                                           to authenticated
                                           using (auth.uid() = id or public.is_admin());

create policy "owner reads own database row"
  on public.customers_table_database for select
                                                    to authenticated
                                                    using (auth.uid() = owner_uid or public.is_admin());

create policy "owner updates own database row"
  on public.customers_table_database for update
                                                    to authenticated
                                                    using (auth.uid() = owner_uid or public.is_admin());

create policy "admins read admin table"
  on public.admin_table for select
                                       to authenticated
                                       using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
    on conflict (id) do nothing;

create or replace function public.handle_new_customer()
returns trigger as $$
declare
new_db_id text := 'db_' || encode(gen_random_bytes(6), 'hex');
begin
insert into public.customers_table (id, username, email, database_id)
values (
           new.id,
           coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
           new.email,
           new_db_id
       );

insert into public.customers_table_database (database_id, owner_uid)
values (new_db_id, new.id);

return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_customer();