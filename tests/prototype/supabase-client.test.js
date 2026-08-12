import test from "node:test";
import assert from "node:assert/strict";
import { createSupabaseRestClient } from "../../src/prototype/supabase-client.mjs";

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("Supabase REST client routes auth requests through the same-origin proxy", async () => {
  const requests = [];
  const storage = createMemoryStorage();
  storage.setItem("mindflow:supabase-session", JSON.stringify({
    access_token: "stale-token",
    refresh_token: "stale-refresh-token",
  }));
  const client = createSupabaseRestClient({
    storage,
    fetchImpl: async (url, options = {}) => {
      requests.push({ url, options });

      if (url === "/api/supabase-config") {
        return new Response(JSON.stringify({ supabaseProxyUrl: "/api/supabase-proxy" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      assert.equal(url, "/api/supabase-proxy");
      const body = JSON.parse(options.body);
      assert.equal(body.path, "/auth/v1/token?grant_type=password");
      assert.equal(body.method, "POST");
      assert.equal(body.headers["Content-Type"], "application/json");
      assert.equal(body.headers.Authorization, undefined);
      assert.equal(JSON.parse(body.body).email, "jane@mindflow-mu-tawny.vercel.app");

      return new Response(JSON.stringify({
        access_token: "token",
        user: { id: "user-1", email: "jane@mindflow-mu-tawny.vercel.app" },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  const session = await client.signIn({
    email: "jane@mindflow-mu-tawny.vercel.app",
    password: "password-123",
  });

  assert.equal(session.access_token, "token");
  assert.equal(requests.length, 2);
});

test("Supabase REST client refreshes expired sessions and retries state saves", async () => {
  const requests = [];
  const storage = createMemoryStorage();
  storage.setItem("mindflow:supabase-session", JSON.stringify({
    access_token: "old-token",
    refresh_token: "old-refresh-token",
    user: { id: "user-1", email: "jane@mindflow-mu-tawny.vercel.app" },
  }));
  const client = createSupabaseRestClient({
    storage,
    fetchImpl: async (url, options = {}) => {
      if (url === "/api/supabase-config") {
        return new Response(JSON.stringify({ supabaseProxyUrl: "/api/supabase-proxy" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      assert.equal(url, "/api/supabase-proxy");
      const body = JSON.parse(options.body);
      requests.push(body);

      if (body.path === "/auth/v1/token?grant_type=refresh_token") {
        assert.equal(body.headers.Authorization, undefined);
        assert.equal(JSON.parse(body.body).refresh_token, "old-refresh-token");
        return new Response(JSON.stringify({
          access_token: "new-token",
          refresh_token: "new-refresh-token",
          user: { id: "user-1", email: "jane@mindflow-mu-tawny.vercel.app" },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      assert.equal(body.path, "/rest/v1/mindflow_user_states?on_conflict=user_id");
      if (requests.filter((request) => request.path === body.path).length === 1) {
        assert.equal(body.headers.Authorization, "Bearer old-token");
        return new Response(JSON.stringify({ message: "JWT expired" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      assert.equal(body.headers.Authorization, "Bearer new-token");
      return new Response(JSON.stringify([]), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  await client.saveUserState("user-1", { sessionUserId: "user-1" });

  assert.deepEqual(requests.map((request) => request.path), [
    "/rest/v1/mindflow_user_states?on_conflict=user_id",
    "/auth/v1/token?grant_type=refresh_token",
    "/rest/v1/mindflow_user_states?on_conflict=user_id",
  ]);
  assert.equal(client.getSession().access_token, "new-token");
  assert.equal(client.getSession().refresh_token, "new-refresh-token");
});

test("Supabase REST client surfaces auth error_code before generic messages", async () => {
  const storage = createMemoryStorage();
  const client = createSupabaseRestClient({
    storage,
    fetchImpl: async (url) => {
      if (url === "/api/supabase-config") {
        return new Response(JSON.stringify({ supabaseProxyUrl: "/api/supabase-proxy" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        error_code: "email_address_invalid",
        msg: "Email address is invalid",
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  await assert.rejects(
    () => client.signUp({
      email: "jane@mindflow-mu-tawny.vercel.app",
      password: "password-123",
      displayName: "Jane",
    }),
    /email_address_invalid/,
  );
});

test("Supabase REST client normalizes top-level signup sessions", async () => {
  const storage = createMemoryStorage();
  const client = createSupabaseRestClient({
    storage,
    fetchImpl: async (url) => {
      if (url === "/api/supabase-config") {
        return new Response(JSON.stringify({ supabaseProxyUrl: "/api/supabase-proxy" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        access_token: "signup-token",
        refresh_token: "refresh-token",
        user: {
          id: "signup-user",
          email: "ready@mindflow-mu-tawny.vercel.app",
        },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  const payload = await client.signUp({
    email: "ready@mindflow-mu-tawny.vercel.app",
    password: "password-123",
    displayName: "ready",
  });

  assert.equal(payload.session.access_token, "signup-token");
  assert.equal(client.getSession().access_token, "signup-token");
});
