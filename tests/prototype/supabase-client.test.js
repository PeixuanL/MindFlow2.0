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
