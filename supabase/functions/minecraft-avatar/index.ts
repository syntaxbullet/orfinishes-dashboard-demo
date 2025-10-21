import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { corsHeaders, preflightResponse } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const bucketName = Deno.env.get("MINECRAFT_AVATAR_BUCKET") ?? "minecraft-avatars";
const avatarTtlMs = Number(Deno.env.get("MINECRAFT_AVATAR_TTL_MS") ?? 6 * 60 * 60 * 1000);
const profileTtlMs = Number(Deno.env.get("MINECRAFT_PROFILE_TTL_MS") ?? avatarTtlMs);

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  throw new Error("Server configuration error");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const normalizeUuid = (input: string | null): string | null => {
  if (!input) return null;
  const normalized = input.replace(/[^a-fA-F0-9]/g, "").toLowerCase();
  return normalized.length === 32 ? normalized : null;
};

const clampAvatarSize = (candidate: number): number => {
  if (!Number.isFinite(candidate)) return 64;
  const clamped = Math.floor(candidate);
  return Math.min(Math.max(clamped, 16), 256);
};

const fetchMojangAvatar = async (uuid: string, size: number): Promise<Uint8Array | null> => {
  const upstream = await fetch(`https://crafatar.com/avatars/${uuid}?size=${size}&overlay`);

  if (upstream.status === 404) {
    return null;
  }

  if (!upstream.ok) {
    throw new Error(`Upstream avatar error ${upstream.status}`);
  }

  return new Uint8Array(await upstream.arrayBuffer());
};

const fetchMojangProfile = async (uuid: string): Promise<{ id: string; name: string } | null> => {
  const upstream = await fetch(
    `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`,
  );

  if (upstream.status === 404) {
    return null;
  }

  if (!upstream.ok) {
    throw new Error(`Upstream profile error ${upstream.status}`);
  }

  const payload = (await upstream.json()) as { id?: string; name?: string };

  if (!payload || typeof payload.id !== "string" || typeof payload.name !== "string") {
    throw new Error("Invalid upstream profile payload");
  }

  return { id: payload.id, name: payload.name };
};

const refreshAvatar = async (uuid: string, size: number, objectKey: string) => {
  try {
    const avatarBytes = await fetchMojangAvatar(uuid, size);
    if (!avatarBytes) {
      console.warn(`Avatar not found for UUID ${uuid}`);
      return;
    }

    const uploadResult = await supabase.storage
      .from(bucketName)
      .upload(objectKey, avatarBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("players")
      .update({
        avatar_storage_path: objectKey,
        avatar_synced_at: nowIso,
      })
      .eq("minecraft_uuid", uuid);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    console.error("Failed to refresh avatar", error);
  }
};

const refreshProfile = async (uuid: string) => {
  try {
    const profile = await fetchMojangProfile(uuid);
    if (!profile) {
      console.warn(`[minecraft-avatar] Mojang profile missing for ${uuid}`);
      return null;
    }

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("players")
      .upsert(
        {
          minecraft_uuid: uuid,
          display_name: profile.name,
          profile_synced_at: nowIso,
        },
        { onConflict: "minecraft_uuid" },
      )
      .select(
        "id, minecraft_uuid, display_name, avatar_storage_path, avatar_synced_at, profile_synced_at",
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("[minecraft-avatar] Failed to refresh profile", { uuid, error });
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return preflightResponse;
  }

  if (req.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  console.log("[minecraft-avatar] Incoming request", {
    method: req.method,
    url: req.url,
  });

  const url = new URL(req.url);
  const uuid = normalizeUuid(url.searchParams.get("uuid"));
  const requestedSize = Number(url.searchParams.get("size") ?? "64");
  const size = clampAvatarSize(requestedSize);
  const mode = url.searchParams.get("mode") ?? "avatar";

  if (!uuid) {
    console.warn("[minecraft-avatar] Invalid UUID parameter", {
      original: url.searchParams.get("uuid"),
    });
    return Response.json(
      { error: "Invalid UUID" },
      { status: 400, headers: corsHeaders },
    );
  }

  const objectKey = `${uuid}-${size}.png`;
  const now = Date.now();

  const { data: profile, error: profileError } = await supabase
    .from("players")
    .select(
      "id, minecraft_uuid, display_name, avatar_storage_path, avatar_synced_at, profile_synced_at",
    )
    .eq("minecraft_uuid", uuid)
    .maybeSingle();

  if (profileError) {
    console.error("[minecraft-avatar] Failed to load player metadata", {
      uuid,
      error: profileError,
    });
    return Response.json(
      { error: "Failed to load cached avatar metadata" },
      { status: 500, headers: corsHeaders },
    );
  }

  const lastSynced = profile?.avatar_synced_at ? Date.parse(profile.avatar_synced_at) : null;
  const isStale = !lastSynced || now - lastSynced > avatarTtlMs;
  const lastProfileSynced = profile?.profile_synced_at
    ? Date.parse(profile.profile_synced_at)
    : null;
  const isProfileStale = !lastProfileSynced || now - lastProfileSynced > profileTtlMs;

  if (mode === "profile") {
    let responseProfile = profile ?? null;

    if (!responseProfile) {
      responseProfile = await refreshProfile(uuid);
      if (!responseProfile) {
        return Response.json(
          { error: "Profile not found" },
          { status: 404, headers: corsHeaders },
        );
      }
    } else if (isProfileStale) {
      console.log("[minecraft-avatar] Profile marked for refresh", {
        uuid,
        lastSynced: lastProfileSynced,
      });
      queueMicrotask(() => {
        refreshProfile(uuid).catch((error) =>
          console.error("[minecraft-avatar] Profile refresh microtask failed", {
            uuid,
            error,
          }),
        );
      });
    }

    const responsePayload = {
      uuid,
      name: responseProfile.display_name ?? null,
      avatar_storage_path: responseProfile.avatar_storage_path ?? null,
      avatar_synced_at: responseProfile.avatar_synced_at ?? null,
      profile_synced_at: responseProfile.profile_synced_at ?? null,
    };

    console.log("[minecraft-avatar] Returning profile payload", {
      uuid,
      stale: isProfileStale,
    });

    return Response.json(responsePayload, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=60",
        "X-Profile-Stale": isProfileStale ? "1" : "0",
      },
    });
  }

  if (isStale) {
    console.log("[minecraft-avatar] Avatar marked for refresh", {
      uuid,
      size,
      lastSynced,
    });
    queueMicrotask(() => {
      refreshAvatar(uuid, size, objectKey).catch((error) =>
        console.error("[minecraft-avatar] Avatar refresh microtask failed", {
          uuid,
          size,
          error,
        }),
      );
    });
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from(bucketName)
    .download(objectKey);

  if (downloadError) {
    if (downloadError.message?.includes("Object not found")) {
      // Trigger refresh immediately for cold cache and return 404
      console.log("[minecraft-avatar] Cache miss, scheduling immediate refresh", {
        uuid,
        size,
      });
      queueMicrotask(() => {
        refreshAvatar(uuid, size, objectKey).catch((error) =>
          console.error("[minecraft-avatar] Avatar cold-refresh failed", {
            uuid,
            size,
            error,
          }),
        );
      });

      return Response.json(
        { error: "Avatar not cached yet" },
        { status: 404, headers: corsHeaders },
      );
    }

    console.error("[minecraft-avatar] Failed to download avatar from storage", {
      uuid,
      size,
      error: downloadError,
    });
    return Response.json(
      { error: "Failed to load avatar" },
      { status: 500, headers: corsHeaders },
    );
  }

  console.log("[minecraft-avatar] Returning cached avatar", {
    uuid,
    size,
    stale: isStale,
  });

  return new Response(file, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
      "X-Avatar-Stale": isStale ? "1" : "0",
      "X-Profile-Stale": isProfileStale ? "1" : "0",
    },
  });
});
