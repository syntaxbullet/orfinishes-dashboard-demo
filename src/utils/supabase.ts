import {
  createClient,
  type PostgrestError,
  type PostgrestSingleResponse,
} from "@supabase/supabase-js";



const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const supabase = createClient(supabaseUrl!, supabaseKey!);

const raise = (error: PostgrestError): never => {
  const details = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" - ");
  throw new Error(details || "Unexpected Supabase error");
};

const unwrap = <T>(response: PostgrestSingleResponse<T>) => {
  if (response.error) {
    raise(response.error);
  }

  if (!response.data) {
    throw new Error("Supabase returned an empty response.");
  }

  return response.data;
};

export type CosmeticRecord = {
  id: string;
  name: string;
  type: string;
  source: string;
  exclusive_to_year: number | null;
  created_at: string;
  updated_at: string | null;
};

export type ItemRecord = {
  id: string;
  cosmetic: string;
  finish_type: string;
  current_owner: string | null;
  minted_by: string | null;
  created_at: string;
  updated_at: string | null;
  minted_at: string | null;
};

export type OwnershipAction = "grant" | "transfer" | "unbox" | "revoke";

export type OwnershipEventRecord = {
  id: string;
  item_id: string;
  action: OwnershipAction;
  from_player: string | null;
  to_player: string | null;
  occurred_at: string;
};

export type OwnershipEventInsert = {
  item_id: string;
  action: OwnershipAction;
  to_player: string | null;
  from_player?: string | null;
  occurred_at?: string;
};

export type PlayerRecord = {
  id: string;
  minecraft_uuid: string;
  created_at: string;
  updated_at: string;
  is_banned: boolean | null;
  display_name: string | null;
  avatar_storage_path: string | null;
  avatar_synced_at: string | null;
  profile_synced_at: string | null;
};

export type ItemOwnershipSnapshot = {
  item_id: string;
  finish_type: string;
  cosmetic_name: string;
  latest_event_id: string;
  latest_action: OwnershipAction;
  latest_to_player_id: string | null;
  latest_to_player_uuid: string | null;
  latest_occurred_at: string | null;
  first_unbox_event_id: string | null;
  first_unbox_to_player_id: string | null;
  first_unbox_to_player_uuid: string | null;
  first_unbox_occurred_at: string | null;
};

type QueryOptions = {
  limit?: number;
};

export async function fetchCosmetics(
  options: QueryOptions & {
    search?: string;
    exclusiveToYear?: number | null;
  } = {},
): Promise<CosmeticRecord[]> {
  let query = supabase
    .from("cosmetics")
    .select("*")
    .order("name", { ascending: true });

  if (options.search) {
    query = query.ilike("name", `%${options.search}%`);
  }

  if (options.exclusiveToYear === null) {
    query = query.is("exclusive_to_year", null);
  } else if (typeof options.exclusiveToYear === "number") {
    query = query.eq("exclusive_to_year", options.exclusiveToYear);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query.returns<CosmeticRecord[]>();

  if (error) {
    raise(error);
  }

  return data ?? [];
}

export async function fetchCosmeticById(id: string): Promise<CosmeticRecord> {
  const response = await supabase
    .from("cosmetics")
    .select("*")
    .eq("id", id)
    .returns<CosmeticRecord>()
    .single();

  return unwrap(response);
}

export async function fetchItems(
  options: QueryOptions & {
    cosmeticId?: string;
    ownerId?: string | null;
  } = {},
): Promise<ItemRecord[]> {
  let query = supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (options.cosmeticId) {
    query = query.eq("cosmetic", options.cosmeticId);
  }

  if (options.ownerId === null) {
    query = query.is("current_owner", null);
  } else if (typeof options.ownerId === "string") {
    query = query.eq("current_owner", options.ownerId);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query.returns<ItemRecord[]>();

  if (error) {
    raise(error);
  }

  return data ?? [];
}

export async function fetchOwnershipEventsForItem(
  itemId: string,
  options: QueryOptions = {},
): Promise<OwnershipEventRecord[]> {
  let query = supabase
    .from("ownership_events")
    .select("*")
    .eq("item_id", itemId)
    .order("occurred_at", { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query.returns<OwnershipEventRecord[]>();

  if (error) {
    raise(error);
  }

  return data ?? [];
}

export async function createOwnershipEvent(
  payload: OwnershipEventInsert,
): Promise<OwnershipEventRecord> {
  const normalized: OwnershipEventInsert = {
    from_player: payload.from_player ?? null,
    occurred_at: payload.occurred_at,
    item_id: payload.item_id,
    action: payload.action,
    to_player: payload.to_player ?? null,
  };

  const response = await supabase
    .from("ownership_events")
    .insert(normalized)
    .select("*")
    .returns<OwnershipEventRecord>()
    .single();

  return unwrap(response);
}

export async function fetchPlayers(
  options: QueryOptions & {
    search?: string;
    includeBanned?: boolean;
  } = {},
): Promise<PlayerRecord[]> {
  let query = supabase
    .from("players")
    .select("*")
    .order("display_name", { ascending: true, nullsFirst: false });

  if (options.search) {
    const term = `%${options.search}%`;
    query = query.or(
      `display_name.ilike.${term},minecraft_uuid.ilike.${term}`,
    );
  }

  if (!options.includeBanned) {
    query = query.or("is_banned.is.null,is_banned.eq.false");
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query.returns<PlayerRecord[]>();

  if (error) {
    raise(error);
  }

  return data ?? [];
}

export async function fetchItemOwnershipSnapshots(): Promise<
  ItemOwnershipSnapshot[]
> {
  const { data, error } = await supabase
    .rpc("fetch_item_ownership_snapshots")
    .returns<ItemOwnershipSnapshot[]>();

  if (error) {
    raise(error);
  }

  if (!data) {
    return [];
  }

  if (!Array.isArray(data)) {
    throw new Error(
      "Supabase returned an unexpected payload for fetch_item_ownership_snapshots.",
    );
  }

  return data;
}
