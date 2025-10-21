# Tables
The database is a supabase database with the following tables:

## Cosmetics Table:

The cosmetics table lists cosmetic items for which special finishes can be obtained. These finishes are subject to tracking within our app.

```sql
create table public.cosmetics (
  id uuid not null default gen_random_uuid (),
  name text not null,
  type text not null,
  source text not null,
  exclusive_to_year smallint null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null default now(),
  constraint cosmetics_pkey primary key (id),
  constraint cosmetics_name_key unique (name),
  constraint cosmetics_exclusive_year_chk check (
    (
      (exclusive_to_year is null)
      or (
        (exclusive_to_year >= 2000)
        and (exclusive_to_year <= 2100)
      )
    )
  )
) TABLESPACE pg_default;

create trigger trg_cosmetics_updated_at BEFORE
update on cosmetics for EACH row
execute FUNCTION set_updated_at ();
```
**Example Row:** {"idx":0,"id":"01a36493-6485-4e50-985e-0509c36ac793","name":"Sussy Helmet","type":"non-event cosmetic","source":"Space Crate","exclusive_to_year":null,"created_at":"2025-10-14 14:47:38.016336+00","updated_at":"2025-10-14 14:47:38.016336+00"}

## Items Table:

The items table stores individual instances of cosmetics and their given finishes, who owns them, who minted them etc.

```sql
create table public.cosmetics (
  id uuid not null default gen_random_uuid (),
  name text not null,
  type text not null,
  source text not null,
  exclusive_to_year smallint null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null default now(),
  constraint cosmetics_pkey primary key (id),
  constraint cosmetics_name_key unique (name),
  constraint cosmetics_exclusive_year_chk check (
    (
      (exclusive_to_year is null)
      or (
        (exclusive_to_year >= 2000)
        and (exclusive_to_year <= 2100)
      )
    )
  )
) TABLESPACE pg_default;

create trigger trg_cosmetics_updated_at BEFORE
update on cosmetics for EACH row
execute FUNCTION set_updated_at ();
```
**Example Row:** {"idx":0,"id":"00436dd9-b387-45c9-a758-8a8c8b7d5b98","cosmetic":"963c1665-4f5d-47a2-8043-8164d96d3796","finish_type":"Iridescent","current_owner":"04f121dc-0070-423c-94c5-479db0fd40e7","minted_by":"04f121dc-0070-423c-94c5-479db0fd40e7","created_at":"2025-10-14 18:03:01.620713+00","updated_at":"2025-10-14 18:03:01.620713+00","minted_at":"2025-10-14 18:03:01.620713+00"}

## Ownership Events Table

The ownership events table is a collection of historical event entires. It stores the unboxing events, transfers between players, and more.

```sql
create table public.ownership_events (
  id uuid not null default gen_random_uuid (),
  item_id uuid not null,
  action public.ownership_action not null,
  from_player uuid null,
  to_player uuid null,
  occurred_at timestamp with time zone not null default now(),
  constraint ownership_events_pkey primary key (id),
  constraint ownership_events_from_player_fkey foreign KEY (from_player) references players (id),
  constraint ownership_events_item_id_fkey foreign KEY (item_id) references items (id) on update CASCADE on delete CASCADE,
  constraint ownership_events_to_player_fkey foreign KEY (to_player) references players (id)
) TABLESPACE pg_default;

create index IF not exists ownership_events_item_time_idx on public.ownership_events using btree (item_id, occurred_at desc) TABLESPACE pg_default;

create index IF not exists ownership_events_to_player_time_idx on public.ownership_events using btree (to_player, occurred_at desc) TABLESPACE pg_default;

create index IF not exists ownership_events_from_player_time_idx on public.ownership_events using btree (from_player, occurred_at desc) TABLESPACE pg_default;

create index IF not exists ownership_events_item_action_time_idx on public.ownership_events using btree (item_id, action, occurred_at desc) TABLESPACE pg_default;

create unique INDEX IF not exists ux_one_creation_event_per_item on public.ownership_events using btree (item_id) TABLESPACE pg_default
where
  (
    action = any (
      array[
        'grant'::ownership_action,
        'unbox'::ownership_action
      ]
    )
  );

create trigger trg_apply_ownership_event
after INSERT on ownership_events for EACH row
execute FUNCTION apply_ownership_event ();

create trigger trg_noop_transfer BEFORE INSERT on ownership_events for EACH row
execute FUNCTION prevent_noop_transfer ();

create trigger trg_validate_transfer BEFORE INSERT on ownership_events for EACH row
execute FUNCTION validate_transfer_against_items ();
```
**Example Row**: {"idx":0,"id":"00032754-85bb-48ad-a865-90714ccde9eb","item_id":"160d1723-adf2-4a2f-82c5-8c14168e3adc","action":"transfer","from_player":null,"to_player":"583b6ebd-9850-42b3-bd43-25f9e5914b5a","occurred_at":"2025-10-14 18:03:01.620714+00"}

*The action field follows an enum called ownership action which is one of the following values: (grant, transfer, unbox, revoke)*

## Players Table: 

The players table stores information about the individual players that can own these cometics and their finishes. 

```sql
create table public.players (
  id uuid not null default gen_random_uuid (),
  minecraft_uuid uuid not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  is_banned boolean null default false,
  display_name text null,
  avatar_storage_path text null,
  avatar_synced_at timestamp with time zone null,
  profile_synced_at timestamp with time zone null,
  constraint players_pkey primary key (id),
  constraint players_minecraft_uuid_key unique (minecraft_uuid)
) TABLESPACE pg_default;

create trigger trg_players_updated_at BEFORE
update on players for EACH row
execute FUNCTION set_updated_at ();
```
**Example Row:** {"idx":8,"id":"0191f7ac-3345-419d-81f3-e14c9f433fdf","minecraft_uuid":"e0f2c67b-573b-4991-96f8-b946434c6de0","created_at":"2025-10-14 15:06:06.41566+00","updated_at":"2025-10-21 19:04:03.444642+00","is_banned":false,"display_name":"faecozy","avatar_storage_path":"e0f2c67b573b499196f8b946434c6de0-32.png","avatar_synced_at":"2025-10-21 19:04:03.343+00","profile_synced_at":"2025-10-21 17:41:57.439+00"}

*avatar images are stored in a supabase bucket named *minecraft-avatars*

# Postgres Functions

- **apply_ownership_event**:
```sql
BEGIN
  IF NEW.action IN ('unbox'::public.ownership_action,
                    'grant'::public.ownership_action,
                    'transfer'::public.ownership_action) THEN
    UPDATE public.items
       SET current_owner = NEW.to_player,
           updated_at = GREATEST(COALESCE(NEW.occurred_at, now()), updated_at)
     WHERE id = NEW.item_id;

  ELSIF NEW.action = 'revoke'::public.ownership_action THEN
    UPDATE public.items
       SET current_owner = NULL,
           updated_at = GREATEST(COALESCE(NEW.occurred_at, now()), updated_at)
     WHERE id = NEW.item_id;
  END IF;
```
- **fetch_item_ownership_snapshots**: 
```sql
with ranked as (
    select
      e.*,
      row_number() over (
        partition by e.item_id
        order by e.occurred_at desc, e.id desc
      ) as latest_rank,
      row_number() over (
        partition by e.item_id
        order by case when e.action = 'unbox' then 0 else 1 end,
                 e.occurred_at asc, e.id asc
      ) as first_unbox_rank
    from ownership_events e
  ),
  latest as (
    select * from ranked where latest_rank = 1
  ),
  first_unbox as (
    select * from ranked where action = 'unbox' and first_unbox_rank = 1
  )
  select
    i.id as item_id,
    i.finish_type,
    c.name as cosmetic_name,
    l.id as latest_event_id,
    l.action as latest_action,
    l.to_player as latest_to_player_id,
    latest_player.minecraft_uuid as latest_to_player_uuid,
    l.occurred_at as latest_occurred_at,
    fu.id as first_unbox_event_id,
    fu.to_player as first_unbox_to_player_id,
    first_unbox_player.minecraft_uuid as first_unbox_to_player_uuid,
    fu.occurred_at as first_unbox_occurred_at
  from items i
  left join cosmetics c on c.id = i.cosmetic
  left join latest l on l.item_id = i.id
  left join players latest_player on latest_player.id = l.to_player
  left join first_unbox fu on fu.item_id = i.id
  left join players first_unbox_player on first_unbox_player.id = fu.to_player;
```
- **fetch_player_profile_data**: 
```sql
declare
  result json;
begin
  select json_build_object(
    'player', row_to_json(p.*),
    'stats', json_build_object(
      'items_owned', (select count(*) from items where current_owner = p.id),
      'items_unboxed', (select count(*) from items where minted_by = p.id),
      'finish_distribution', (
        select json_object_agg(finish_type, count)
        from (
          select finish_type, count(*) as count
          from items
          where current_owner = p.id
          group by finish_type
        ) finish_counts
      )
    ),
    'owned_items', (
      select coalesce(json_agg(row_to_json(items_with_cosmetics.*)), '[]'::json)
      from (
        select i.id, i.finish_type, i.minted_at,
               c.name as cosmetic_name, c.type as cosmetic_type
        from items i
        left join cosmetics c on i.cosmetic = c.id
        where i.current_owner = p.id
        order by i.minted_at desc
      ) items_with_cosmetics
    )
  ) into result
  from players p
  where p.minecraft_uuid = player_uuid_param;
  
  return result;
end;
```
- **mint_item:**
```sql
declare v_id uuid := coalesce(p_item, gen_random_uuid());
begin
  insert into public.items(id, cosmetic, finish_type, minted_by, minted_at, current_owner, created_at, updated_at)
  values (v_id, p_cosmetic, p_finish, p_minted_by, p_at, p_minted_by, p_at, p_at);

  insert into public.ownership_events(item_id, action, from_player, to_player, occurred_at)
  values (v_id, case when p_minted_by is not null then 'unbox' else 'grant' end, null, p_minted_by, p_at);

  return v_id;
end
```
- **prevent_noop_transfer:**
```sql
BEGIN
  IF NEW.action = 'transfer'::public.ownership_action
     AND NEW.from_player = NEW.to_player THEN
    RAISE EXCEPTION 'No-op transfer not allowed';
  END IF;
  RETURN NEW;
END;
```

- **set_updated_at**:
```sql
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
```
- **transfer_item:**
```sql
declare banned_from boolean; banned_to boolean;
begin
  select "is_banned" into banned_from from public.players where id = p_from;
  select "is_banned" into banned_to   from public.players where id = p_to;

  if banned_from then raise exception 'Transfer invalid: from_player is banned'; end if;
  if banned_to   then raise exception 'Transfer invalid: to_player is banned'; end if;

  insert into public.ownership_events(item_id, action, from_player, to_player, occurred_at)
  values (p_item, 'transfer', p_from, p_to, p_at);
end
```
- **validate_transfer_against_items**:
```sql
DECLARE
  curr uuid;
BEGIN
  IF NEW.action = 'transfer'::public.ownership_action THEN
    SELECT current_owner
      INTO curr
      FROM public.items
     WHERE id = NEW.item_id
     FOR UPDATE;

    IF curr IS DISTINCT FROM NEW.from_player THEN
      RAISE EXCEPTION 'Transfer invalid: current owner is %, got %', curr, NEW.from_player;
    END IF;
  END IF;

  RETURN NEW;
END;
```


