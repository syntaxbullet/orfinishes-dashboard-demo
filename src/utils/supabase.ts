import {
  createClient,
  type PostgrestError,
  type PostgrestSingleResponse,
} from "@supabase/supabase-js";

const supabaseUrl = Bun.env.SUPABASE_URL;
const supabaseKey = Bun.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const supabase = createClient(supabaseUrl!, supabaseKey!);

type CacheEntry<T> =
  | { status: "pending"; promise: Promise<T> }
  | { status: "resolved"; value: T };

type CacheOptions = {
  forceRefresh?: boolean;
};

const cacheStore = new Map<string, CacheEntry<unknown>>();

const getCacheEntry = <T>(key: string): CacheEntry<T> | undefined => {
  return cacheStore.get(key) as CacheEntry<T> | undefined;
};

const setCacheEntry = <T>(key: string, entry: CacheEntry<T>) => {
  cacheStore.set(key, entry as CacheEntry<unknown>);
};

function stableStringify(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (typeof value === "object" && value !== undefined) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, val]) => `"${key}":${stableStringify(val)}`);

    return `{${entries.join(",")}}`;
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  return String(value);
}

function buildCacheKey(prefix: string, payload?: unknown): string {
  if (payload === undefined) {
    return prefix;
  }

  return `${prefix}:${stableStringify(payload)}`;
}

async function readThroughCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  if (!options.forceRefresh) {
    const existing = getCacheEntry<T>(key);

    if (existing?.status === "resolved") {
      return existing.value;
    }

    if (existing?.status === "pending") {
      return existing.promise;
    }
  }

  const fetchPromise = fetcher();

  const trackedPromise = fetchPromise
    .then((value) => {
      setCacheEntry(key, { status: "resolved", value });
      return value;
    })
    .catch((error) => {
      cacheStore.delete(key);
      throw error;
    });

  setCacheEntry(key, { status: "pending", promise: trackedPromise });

  return trackedPromise;
}

function invalidateCache(prefix: string) {
  for (const key of Array.from(cacheStore.keys())) {
    if (key === prefix || key.startsWith(`${prefix}:`)) {
      cacheStore.delete(key);
    }
  }
}

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

export type ItemInsert = {
  cosmetic: string;
  finish_type: string;
  current_owner?: string | null;
  minted_by?: string | null;
  minted_at?: string;
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
    forceRefresh?: boolean;
  } = {},
): Promise<CosmeticRecord[]> {
  const { forceRefresh, ...queryOptions } = options;

  const cacheKey = buildCacheKey("cosmetics", {
    exclusiveToYear: Object.prototype.hasOwnProperty.call(
      queryOptions,
      "exclusiveToYear",
    )
      ? queryOptions.exclusiveToYear
      : undefined,
    limit: queryOptions.limit ?? null,
    search: queryOptions.search ?? null,
  });

  return readThroughCache(
    cacheKey,
    async () => {
      let query = supabase
        .from("cosmetics")
        .select("*")
        .order("name", { ascending: true });

      if (queryOptions.search) {
        query = query.ilike("name", `%${queryOptions.search}%`);
      }

      if (queryOptions.exclusiveToYear === null) {
        query = query.is("exclusive_to_year", null);
      } else if (typeof queryOptions.exclusiveToYear === "number") {
        query = query.eq("exclusive_to_year", queryOptions.exclusiveToYear);
      }

      if (queryOptions.limit) {
        query = query.limit(queryOptions.limit);
      }

      const { data, error } = await query.returns<CosmeticRecord[]>();

      if (error) {
        raise(error);
      }

      return data ?? [];
    },
    { forceRefresh },
  );
}

export async function fetchCosmeticById(
  id: string,
  options: CacheOptions = {},
): Promise<CosmeticRecord> {
  const normalizedId = id.trim();
  const cacheKey = buildCacheKey("cosmeticById", normalizedId);

  return readThroughCache(
    cacheKey,
    async () => {
      const response = await supabase
        .from("cosmetics")
        .select("*")
        .eq("id", normalizedId)
        .returns<CosmeticRecord>()
        .single();

      return unwrap(response);
    },
    options,
  );
}

export async function fetchItems(
  options: QueryOptions & {
    cosmeticId?: string;
    ownerId?: string | null;
    forceRefresh?: boolean;
  } = {},
): Promise<ItemRecord[]> {
  const { forceRefresh, ...queryOptions } = options;
  const cacheKey = buildCacheKey("items", {
    cosmeticId: queryOptions.cosmeticId ?? null,
    ownerId: queryOptions.ownerId ?? null,
    limit: queryOptions.limit ?? null,
  });

  return readThroughCache(
    cacheKey,
    async () => {
      const PAGE_SIZE = 1000;
      const results: ItemRecord[] = [];
      const totalLimit = typeof queryOptions.limit === "number"
        ? queryOptions.limit
        : null;

      let offset = 0;

      while (true) {
        if (totalLimit !== null && results.length >= totalLimit) {
          break;
        }

        const remaining =
          totalLimit !== null ? totalLimit - results.length : PAGE_SIZE;

        if (totalLimit !== null && remaining <= 0) {
          break;
        }

        const pageSize = totalLimit !== null
          ? Math.min(PAGE_SIZE, remaining)
          : PAGE_SIZE;

        let query = supabase
          .from("items")
          .select("*")
          .order("created_at", { ascending: false });

        if (queryOptions.cosmeticId) {
          query = query.eq("cosmetic", queryOptions.cosmeticId);
        }

        if (queryOptions.ownerId === null) {
          query = query.is("current_owner", null);
        } else if (typeof queryOptions.ownerId === "string") {
          query = query.eq("current_owner", queryOptions.ownerId);
        }

        query = query.range(offset, offset + pageSize - 1);

        const { data, error } = await query.returns<ItemRecord[]>();

        if (error) {
          raise(error);
        }

        if (!data || data.length === 0) {
          break;
        }

        results.push(...data);

        if (data.length < pageSize) {
          break;
        }

        offset += pageSize;
      }

      return results;
    },
    { forceRefresh },
  );
}

export async function fetchItemsCount(
  options: {
    cosmeticId?: string;
    ownerId?: string | null;
    forceRefresh?: boolean;
  } = {},
): Promise<number> {
  const { forceRefresh, ...queryOptions } = options;
  const cacheKey = buildCacheKey("itemsCount", {
    cosmeticId: queryOptions.cosmeticId ?? null,
    ownerId: queryOptions.ownerId ?? null,
  });

  return readThroughCache(
    cacheKey,
    async () => {
      let query = supabase
        .from("items")
        .select("*", { count: "exact", head: true });

      if (queryOptions.cosmeticId) {
        query = query.eq("cosmetic", queryOptions.cosmeticId);
      }

      if (queryOptions.ownerId === null) {
        query = query.is("current_owner", null);
      } else if (typeof queryOptions.ownerId === "string") {
        query = query.eq("current_owner", queryOptions.ownerId);
      }

      const { count, error } = await query;

      if (error) {
        raise(error);
      }

      return count ?? 0;
    },
    { forceRefresh },
  );
}

export async function searchItems(
  options: QueryOptions & {
    search?: string;
    forceRefresh?: boolean;
  } = {},
): Promise<ItemRecord[]> {
  const { forceRefresh, ...queryOptions } = options;
  const cacheKey = buildCacheKey("searchItems", {
    search: queryOptions.search ?? null,
    limit: queryOptions.limit ?? null,
  });

  return readThroughCache(
    cacheKey,
    async () => {
      let query = supabase
        .from("items")
        .select(`
          *,
          cosmetics!inner(name, type),
          players!items_current_owner_fkey(id, display_name, minecraft_uuid, is_banned, avatar_storage_path, avatar_synced_at, profile_synced_at)
        `)
        .order("id", { ascending: false });

      if (queryOptions.search && queryOptions.search.trim()) {
        const searchPattern = `%${queryOptions.search.trim()}%`;
        // Search across cosmetic name, finish type, and player display name
        query = query.ilike("cosmetics.name", searchPattern)
      }

      if (queryOptions.limit) {
        query = query.limit(queryOptions.limit);
      }

      const { data, error } = await query.returns<ItemRecord[]>();

      if (error) {
        raise(error);
      }

      return data ?? [];
    },
    { forceRefresh },
  );
}

export async function fetchItemsByIds(
  ids: string[],
  options: CacheOptions = {},
): Promise<ItemRecord[]> {
  const normalizedIds = ids
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter((value) => value.length > 0);
  const uniqueIds = Array.from(new Set(normalizedIds)).sort((a, b) =>
    a.localeCompare(b),
  );

  if (uniqueIds.length === 0) {
    return [];
  }

  const cacheKey = buildCacheKey("itemsByIds", uniqueIds);

  return readThroughCache(
    cacheKey,
    async () => {
      const CHUNK_SIZE = 100;
      const results: ItemRecord[] = [];

      for (let index = 0; index < uniqueIds.length; index += CHUNK_SIZE) {
        const chunk = uniqueIds.slice(index, index + CHUNK_SIZE);

        const { data, error } = await supabase
          .from("items")
          .select("*")
          .in("id", chunk)
          .returns<ItemRecord[]>();

        if (error) {
          raise(error);
        }

        if (data?.length) {
          results.push(...data);
        }
      }

      return results;
    },
    options,
  );
}

export async function fetchCosmeticsByIds(
  ids: string[],
  options: CacheOptions = {},
): Promise<CosmeticRecord[]> {
  const normalizedIds = ids
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter((value) => value.length > 0);
  const uniqueIds = Array.from(new Set(normalizedIds)).sort((a, b) =>
    a.localeCompare(b),
  );

  if (uniqueIds.length === 0) {
    return [];
  }

  const cacheKey = buildCacheKey("cosmeticsByIds", uniqueIds);

  return readThroughCache(
    cacheKey,
    async () => {
      const CHUNK_SIZE = 100;
      const results: CosmeticRecord[] = [];

      for (let index = 0; index < uniqueIds.length; index += CHUNK_SIZE) {
        const chunk = uniqueIds.slice(index, index + CHUNK_SIZE);

        const { data, error } = await supabase
          .from("cosmetics")
          .select("*")
          .in("id", chunk)
          .returns<CosmeticRecord[]>();

        if (error) {
          raise(error);
        }

        if (data?.length) {
          results.push(...data);
        }
      }

      return results;
    },
    options,
  );
}

export async function fetchFinishTypes(
  options: CacheOptions = {},
): Promise<string[]> {
  const cacheKey = buildCacheKey("finishTypes");

  type FinishTypeRecord = {
    finish_type: string | null;
  };

  return readThroughCache(
    cacheKey,
    async () => {
      const unique = new Set<string>();
      const PAGE_SIZE = 1000;
      let offset = 0;

      while (true) {
        const to = offset + PAGE_SIZE - 1;
        const { data, error } = await supabase
          .from("items")
          .select("finish_type")
          .order("finish_type", { ascending: true })
          .range(offset, to)
          .returns<FinishTypeRecord[]>();

        if (error) {
          raise(error);
        }

        if (!data?.length) {
          break;
        }

        for (const record of data) {
          const finishType = record.finish_type?.trim();
          if (finishType) {
            unique.add(finishType);
          }
        }

        if (data.length < PAGE_SIZE) {
          break;
        }

        offset += PAGE_SIZE;
      }

      return Array.from(unique).sort((a, b) => a.localeCompare(b));
    },
    options,
  );
}

export async function fetchPlayersByIds(
  ids: string[],
  options: CacheOptions = {},
): Promise<PlayerRecord[]> {
  const normalizedIds = ids
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter((value) => value.length > 0);
  const uniqueIds = Array.from(new Set(normalizedIds)).sort((a, b) =>
    a.localeCompare(b),
  );

  if (uniqueIds.length === 0) {
    return [];
  }

  const cacheKey = buildCacheKey("playersByIds", uniqueIds);

  return readThroughCache(
    cacheKey,
    async () => {
      const CHUNK_SIZE = 100;
      const results: PlayerRecord[] = [];

      for (let index = 0; index < uniqueIds.length; index += CHUNK_SIZE) {
        const chunk = uniqueIds.slice(index, index + CHUNK_SIZE);

        const { data, error } = await supabase
          .from("players")
          .select("*")
          .in("id", chunk)
          .returns<PlayerRecord[]>();

        if (error) {
          raise(error);
        }

        if (data?.length) {
          results.push(...data);
        }
      }

      return results;
    },
    options,
  );
}

export async function fetchOwnershipEventsForItem(
  itemId: string,
  options: QueryOptions & CacheOptions = {},
): Promise<OwnershipEventRecord[]> {
  const { forceRefresh, ...queryOptions } = options;
  const normalizedItemId = itemId.trim();
  const cacheKey = buildCacheKey("ownershipEventsForItem", {
    itemId: normalizedItemId,
    limit: queryOptions.limit ?? null,
  });

  return readThroughCache(
    cacheKey,
    async () => {
      let query = supabase
        .from("ownership_events")
        .select("*")
        .eq("item_id", normalizedItemId)
        .order("occurred_at", { ascending: false });

      if (queryOptions.limit) {
        query = query.limit(queryOptions.limit);
      }

      const { data, error } = await query.returns<OwnershipEventRecord[]>();

      if (error) {
        raise(error);
      }

      return data ?? [];
    },
    { forceRefresh },
  );
}

export async function fetchOwnershipEvents(
  options: QueryOptions & {
    action?: OwnershipAction;
    search?: string;
    forceRefresh?: boolean;
  } = {},
): Promise<OwnershipEventRecord[]> {
  const { forceRefresh, ...queryOptions } = options;
  const cacheKey = buildCacheKey("ownershipEvents", {
    action: queryOptions.action ?? null,
    limit: queryOptions.limit ?? null,
    search:
      typeof queryOptions.search === "string"
        ? queryOptions.search.trim()
        : null,
  });

  return readThroughCache(
    cacheKey,
    async () => {
      const PAGE_SIZE = 1000;
      const results: OwnershipEventRecord[] = [];
      const totalLimit = typeof queryOptions.limit === "number"
        ? queryOptions.limit
        : null;

      let offset = 0;

      while (true) {
        if (totalLimit !== null && results.length >= totalLimit) {
          break;
        }

        const remaining =
          totalLimit !== null ? totalLimit - results.length : PAGE_SIZE;

        if (totalLimit !== null && remaining <= 0) {
          break;
        }

        const pageSize = totalLimit !== null
          ? Math.min(PAGE_SIZE, remaining)
          : PAGE_SIZE;

        let query = supabase
          .from("ownership_events")
          .select("*")
          .order("occurred_at", { ascending: false });

        if (queryOptions.action) {
          query = query.eq("action", queryOptions.action);
        }

        if (
          typeof queryOptions.search === "string" &&
          queryOptions.search.trim() !== ""
        ) {
          const term = `%${queryOptions.search.trim()}%`;
          query = query.or(
            `item_id.ilike.${term},from_player.ilike.${term},to_player.ilike.${term}`,
          );
        }

        query = query.range(offset, offset + pageSize - 1);

        const { data, error } = await query.returns<OwnershipEventRecord[]>();

        if (error) {
          raise(error);
        }

        if (!data || data.length === 0) {
          break;
        }

        results.push(...data);

        if (data.length < pageSize) {
          break;
        }

        offset += pageSize;
      }

      return results;
    },
    { forceRefresh },
  );
}

export async function createItem(
  payload: ItemInsert,
): Promise<ItemRecord> {
  const normalized: ItemInsert = {
    cosmetic: payload.cosmetic,
    finish_type: payload.finish_type,
    current_owner: payload.current_owner ?? null,
    minted_by: payload.minted_by ?? null,
    minted_at: payload.minted_at,
  };

  const response = await supabase
    .from("items")
    .insert(normalized)
    .select("*")
    .returns<ItemRecord>()
    .single();

  const record = unwrap(response);

  invalidateCache("items");
  invalidateCache("itemsByIds");

  // Trigger store refresh
  try {
    const { useItemsStore } = await import("@/stores/items-store");
    useItemsStore.getState().refreshItems();
  } catch (error) {
    console.error("Failed to refresh items store:", error);
  }

  return record;
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

  const record = unwrap(response);

  invalidateCache("ownershipEvents");
  invalidateCache("ownershipEventsForItem");

  // Trigger store refresh
  try {
    const { useEventsStore } = await import("@/stores/events-store");
    useEventsStore.getState().refreshEvents();
  } catch (error) {
    console.error("Failed to refresh events store:", error);
  }

  return record;
}

export async function fetchPlayers(
  options: QueryOptions & {
    search?: string;
    includeBanned?: boolean;
    forceRefresh?: boolean;
  } = {},
): Promise<PlayerRecord[]> {
  const { forceRefresh, ...queryOptions } = options;
  const includeBanned = Boolean(queryOptions.includeBanned);
  const normalizedSearch = typeof queryOptions.search === "string"
    ? queryOptions.search.trim()
    : "";

  const cacheKey = buildCacheKey("players", {
    includeBanned,
    limit: queryOptions.limit ?? null,
    search: normalizedSearch || null,
  });

  return readThroughCache(
    cacheKey,
    async () => {
      let query = supabase
        .from("players")
        .select("*")
        .order("display_name", { ascending: true, nullsFirst: false });

      if (normalizedSearch) {
        const term = `%${normalizedSearch}%`;
        query = query.or(
          `display_name.ilike.${term},minecraft_uuid.ilike.${term}`,
        );
      }

      if (!includeBanned) {
        query = query.or("is_banned.is.null,is_banned.eq.false");
      }

      if (queryOptions.limit) {
        query = query.limit(queryOptions.limit);
      }

      const { data, error } = await query.returns<PlayerRecord[]>();

      if (error) {
        raise(error);
      }

      return data ?? [];
    },
    { forceRefresh },
  );
}

export async function fetchItemOwnershipSnapshots(): Promise<
  ItemOwnershipSnapshot[]
> {
  const PAGE_SIZE = 1000;
  const results: ItemOwnershipSnapshot[] = [];

  let offset = 0;

  while (true) {
    const limit = offset + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .rpc("fetch_item_ownership_snapshots")
      .range(offset, limit)
      .returns<ItemOwnershipSnapshot[]>();

    if (error) {
      raise(error);
    }

    if (!data) {
      break;
    }

    if (!Array.isArray(data)) {
      throw new Error(
        "Supabase returned an unexpected payload for fetch_item_ownership_snapshots.",
      );
    }

    results.push(...data);

    if (data.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return results;
}

export async function deleteOwnershipEvent(
  id: string,
): Promise<void> {
  const normalizedId = id.trim();
  
  const { error, data } = await supabase
    .from("ownership_events")
    .delete()
    .eq("id", normalizedId)
    .select("id");

  if (error) {
    raise(error);
  }
  if (data === null || (data as unknown as unknown[]).length === 0) {
    throw new Error("You do not have permission to delete this ownership event");
  }
  invalidateCache("ownershipEvents");
  invalidateCache("ownershipEventsForItem");

  // Trigger store refresh
  try {
    const { useEventsStore } = await import("@/stores/events-store");
    useEventsStore.getState().refreshEvents();
  } catch (error) {
    console.error("Failed to refresh events store:", error);
  }
}

export async function deleteItem(
  id: string,
): Promise<void> {
  const normalizedId = id.trim();
  
  const { error, data } = await supabase
    .from("items")
    .delete()
    .eq("id", normalizedId)
    .select("id");

  if (error) {
    raise(error);
  }
  if (data === null || (data as unknown as unknown[]).length === 0) {
    throw new Error("You do not have permission to delete this item");
  }
  invalidateCache("items");
  invalidateCache("itemsByIds");
  invalidateCache("ownershipEvents");
  invalidateCache("ownershipEventsForItem");

  // Trigger store refresh
  try {
    const { useItemsStore } = await import("@/stores/items-store");
    useItemsStore.getState().refreshItems();
  } catch (error) {
    console.error("Failed to refresh items store:", error);
  }
}
