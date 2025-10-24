import { serve } from "bun";
import index from "./index.html";
const normalizeAvatarSize = (size: number) => {
  const MIN_SIZE = 16;
  const MAX_SIZE = 256;
  if (Number.isNaN(size) || !Number.isFinite(size)) {
    return 64;
  }
  return Math.min(Math.max(Math.floor(size), MIN_SIZE), MAX_SIZE);
};

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET() {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT() {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    "/api/minecraft-profile/:uuid/avatar": async req => {
      const input = req.params.uuid;
      const normalized = input.replace(/[^a-fA-F0-9]/g, "").toLowerCase();

      if (normalized.length !== 32) {
        return Response.json(
          { error: "Invalid UUID" },
          { status: 400 },
        );
      }

      const url = new URL(req.url);
      const sizeParam = Number(url.searchParams.get("size") ?? 64);
      const size = normalizeAvatarSize(sizeParam);

      const edgeBase =
        process.env.SUPABASE_EDGE_FUNCTION_URL ??
        process.env.SUPABASE_FUNCTIONS_URL ??
        "";
      const anonKey = process.env.SUPABASE_ANON_KEY ?? "";

      if (!edgeBase || !anonKey) {
        return Response.json(
          { error: "Avatar proxy is not configured" },
          { status: 500 },
        );
      }

      const edgeEndpoint = `${edgeBase.replace(/\/$/, "")}/minecraft-avatar?uuid=${normalized}&size=${size}`;

      try {
        const edgeResponse = await fetch(edgeEndpoint, {
          headers: {
            apikey: anonKey,
            authorization: `Bearer ${anonKey}`,
          },
        });

        if (!edgeResponse.ok) {
          const contentType = edgeResponse.headers.get("Content-Type") ?? "";
          let body: unknown = { error: `Failed to load avatar (${edgeResponse.status})` };

          if (contentType.includes("application/json")) {
            try {
              body = await edgeResponse.json();
            } catch (parseError) {
              console.warn("Failed to parse edge avatar error payload", parseError);
            }
          }

          return Response.json(body, { status: edgeResponse.status });
        }

        const avatarData = await edgeResponse.arrayBuffer();
        const contentType = edgeResponse.headers.get("Content-Type") ?? "image/png";
        const cacheControl = edgeResponse.headers.get("Cache-Control") ?? "public, max-age=300";
        const staleFlag = edgeResponse.headers.get("X-Avatar-Stale") ?? undefined;

        const responseHeaders: Record<string, string> = {
          "Content-Type": contentType,
          "Cache-Control": cacheControl,
        };

        if (staleFlag) {
          responseHeaders["X-Avatar-Stale"] = staleFlag;
        }

        return new Response(avatarData, {
          headers: responseHeaders,
        });
      } catch (error) {
        console.error("Failed to proxy minecraft avatar", error);
        return Response.json(
          { error: "Failed to proxy avatar" },
          { status: 502 },
        );
      }
    },

    "/api/minecraft-profile/:uuid": async req => {
      const input = req.params.uuid;
      const normalized = input.replace(/[^a-fA-F0-9]/g, "").toLowerCase();

      if (normalized.length !== 32) {
        return Response.json(
          { error: "Invalid UUID" },
          { status: 400 },
        );
      }

      const edgeBase =
        process.env.SUPABASE_EDGE_FUNCTION_URL ??
        process.env.SUPABASE_FUNCTIONS_URL ??
        "";
      const anonKey = process.env.SUPABASE_ANON_KEY ?? "";

      if (!edgeBase || !anonKey) {
        return Response.json(
          { error: "Profile proxy is not configured" },
          { status: 500 },
        );
      }

      const edgeEndpoint = `${edgeBase.replace(/\/$/, "")}/minecraft-avatar?uuid=${normalized}&mode=profile`;

      try {
        const edgeResponse = await fetch(edgeEndpoint, {
          headers: {
            apikey: anonKey,
            authorization: `Bearer ${anonKey}`,
          },
        });

        if (!edgeResponse.ok) {
          const contentType = edgeResponse.headers.get("Content-Type") ?? "";
          let body: unknown = { error: `Failed to load profile (${edgeResponse.status})` };

          if (contentType.includes("application/json")) {
            try {
              body = await edgeResponse.json();
            } catch (parseError) {
              console.warn("Failed to parse edge profile error payload", parseError);
            }
          }

          return Response.json(body, { status: edgeResponse.status });
        }

        const contentType = edgeResponse.headers.get("Content-Type") ?? "application/json";
        const cacheControl = edgeResponse.headers.get("Cache-Control") ?? "public, max-age=60";
        const staleFlag = edgeResponse.headers.get("X-Profile-Stale") ?? undefined;

        const payloadBuffer = await edgeResponse.arrayBuffer();

        const headers: Record<string, string> = {
          "Content-Type": contentType,
          "Cache-Control": cacheControl,
        };

        if (staleFlag) {
          headers["X-Profile-Stale"] = staleFlag;
        }

        return new Response(payloadBuffer, {
          status: edgeResponse.status,
          headers,
        });
      } catch (error) {
        console.error("Failed to proxy minecraft profile", error);
        return Response.json(
          { error: "Failed to proxy profile" },
          { status: 502 },
        );
      }
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
