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
      assert.equal(JSON.parse(body.body).email, "jane@mindflow.local");

      return new Response(JSON.stringify({
        access_token: "token",
        user: { id: "user-1", email: "jane@mindflow.local" },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  const session = await client.signIn({
    email: "jane@mindflow.local",
    password: "password-123",
  });

  assert.equal(session.access_token, "token");
  assert.equal(requests.length, 2);
});
