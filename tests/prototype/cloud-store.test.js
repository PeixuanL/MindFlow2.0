import test from "node:test";
import assert from "node:assert/strict";
import { createMindFlowCloudStore } from "../../src/prototype/cloud-store.mjs";
import { createMindFlowStore } from "../../src/prototype/store.mjs";

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

test("cloud store ignores legacy local sessions without a cloud auth session", () => {
  const storage = createMemoryStorage();
  const localStore = createMindFlowStore({ storage, now: () => 1000 });
  localStore.register({
    accountName: "legacy@example.com",
    password: "password-123",
    confirmPassword: "password-123",
  });

  const store = createMindFlowCloudStore({
    storage,
    cloudClient: {
      getSession: () => null,
    },
  });

  assert.equal(store.getSession(), null);
});

test("cloud store loads a remote state after Supabase login", async () => {
  const storage = createMemoryStorage();
  const savedStates = [];
  const remoteState = {
    sessionUserId: "cloud-user-1",
    users: {
      "cloud-user-1": {
        id: "cloud-user-1",
        key: "jane@example.com",
        accountName: "jane@example.com",
        name: "Jane",
        createdAt: 1000,
        lastLoginAt: 1000,
        items: [],
        batches: [],
        skips: {},
        snoozes: {},
      },
    },
  };
  const session = {
    access_token: "token",
    user: {
      id: "cloud-user-1",
      email: "jane@example.com",
      user_metadata: { display_name: "Jane" },
      created_at: "2026-08-02T00:00:00.000Z",
    },
  };

  const store = createMindFlowCloudStore({
    storage,
    cloudClient: {
      getSession: () => session,
      signIn: async () => session,
      fetchUserState: async () => remoteState,
      saveUserState: async (_userId, state) => {
        savedStates.push(state);
      },
    },
  });

  const user = await store.login({
    accountName: "jane@example.com",
    password: "password-123",
  });

  assert.equal(user.id, "cloud-user-1");
  assert.equal(user.accountName, "jane@example.com");
  assert.equal(store.getSession().id, "cloud-user-1");
  assert.equal(savedStates.length, 0);
});

test("cloud store maps username login to an internal auth email", async () => {
  const storage = createMemoryStorage();
  let signInEmail = "";
  const session = {
    access_token: "token",
    user: {
      id: "cloud-user-2",
      email: "jane-doe@mindflow.local",
      user_metadata: { display_name: "Jane Doe" },
      created_at: "2026-08-02T00:00:00.000Z",
    },
  };

  const store = createMindFlowCloudStore({
    storage,
    cloudClient: {
      getSession: () => session,
      signIn: async ({ email }) => {
        signInEmail = email;
        return session;
      },
      fetchUserState: async () => null,
      saveUserState: async () => {},
    },
  });

  const user = await store.login({
    accountName: "Jane-Doe",
    password: "password-123",
  });

  assert.equal(signInEmail, "jane-doe@mindflow.local");
  assert.equal(user.accountName, "jane-doe");
  assert.equal(user.name, "Jane Doe");
});

test("cloud store rejects usernames that cannot map safely to auth email", async () => {
  const storage = createMemoryStorage();
  const store = createMindFlowCloudStore({
    storage,
    cloudClient: {
      getSession: () => null,
    },
  });

  await assert.rejects(
    () => store.login({ accountName: "a", password: "password-123" }),
    /invalid_username/,
  );
});
