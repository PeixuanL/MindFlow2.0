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
      email: "jane-doe@mindflow-mu-tawny.vercel.app",
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

  assert.equal(signInEmail, "jane-doe@mindflow-mu-tawny.vercel.app");
  assert.equal(user.accountName, "jane-doe");
  assert.equal(user.name, "Jane Doe");
});

test("cloud store does not auto-login when signup still requires email confirmation", async () => {
  const storage = createMemoryStorage();
  let signInCalls = 0;
  const store = createMindFlowCloudStore({
    storage,
    cloudClient: {
      getSession: () => null,
      signUp: async () => ({
        user: {
          id: "cloud-user-pending",
          email: "pending@mindflow-mu-tawny.vercel.app",
        },
        session: null,
      }),
      signIn: async () => {
        signInCalls += 1;
        throw new Error("email_not_confirmed");
      },
    },
  });

  await assert.rejects(
    () => store.register({
      accountName: "pending",
      password: "password-123",
      confirmPassword: "password-123",
    }),
    /email_confirmation_required/,
  );
  assert.equal(signInCalls, 0);
});

test("cloud store enters immediately when signup returns a confirmed session", async () => {
  const storage = createMemoryStorage();
  const session = {
    access_token: "token",
    user: {
      id: "cloud-user-3",
      email: "ready@mindflow-mu-tawny.vercel.app",
      user_metadata: { display_name: "ready" },
      created_at: "2026-08-03T00:00:00.000Z",
    },
  };
  const store = createMindFlowCloudStore({
    storage,
    cloudClient: {
      getSession: () => session,
      signUp: async () => ({ session }),
      fetchUserState: async () => null,
      saveUserState: async () => {},
    },
  });

  const user = await store.register({
    accountName: "ready",
    password: "password-123",
    confirmPassword: "password-123",
  });

  assert.equal(user.id, "cloud-user-3");
  assert.equal(user.accountName, "ready");
});

test("cloud store flushes edited title, steps, and concrete step completion to remote state", async () => {
  const storage = createMemoryStorage();
  const savedStates = [];
  const session = {
    access_token: "token",
    user: {
      id: "cloud-user-4",
      email: "editor@mindflow-mu-tawny.vercel.app",
      user_metadata: { display_name: "editor" },
      created_at: "2026-08-03T00:00:00.000Z",
    },
  };
  const store = createMindFlowCloudStore({
    storage,
    cloudClient: {
      getSession: () => session,
      signIn: async () => session,
      fetchUserState: async () => null,
      saveUserState: async (_userId, state) => {
        savedStates.push(state);
      },
    },
  });

  const user = await store.login({
    accountName: "editor",
    password: "password-123",
  });
  const item = store.addItem(user.id, {
    title: "原来的标题",
    steps: ["第一步", "第二步"],
  });

  store.updateItem(user.id, item.id, {
    title: "新的标题",
    steps: ["改后的第一步", "改后的第二步"],
    completedStepIndexes: [1],
  });
  await store.flush();

  const remoteItem = savedStates.at(-1).users[user.id].items.find((candidate) => candidate.id === item.id);
  assert.equal(remoteItem.title, "新的标题");
  assert.deepEqual(remoteItem.steps, ["改后的第一步", "改后的第二步"]);
  assert.deepEqual(remoteItem.completedStepIndexes, [1]);
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
