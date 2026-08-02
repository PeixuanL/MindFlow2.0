import { createMindFlowStore } from "./store.mjs";
import { createSupabaseRestClient } from "./supabase-client.mjs";

const INTERNAL_USERNAME_DOMAIN = "mindflow.local";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeIdentifier(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function normalizeUsername(value) {
  return normalizeIdentifier(value).replace(/\s+/gu, "");
}

function toAuthEmail(identifier) {
  const normalized = normalizeIdentifier(identifier);

  if (!normalized) {
    return "";
  }

  if (normalized.includes("@")) {
    return normalized;
  }

  const username = normalizeUsername(normalized);
  if (!/^[a-z0-9._-]{3,40}$/u.test(username)) {
    throw new Error("invalid_username");
  }

  return `${username}@${INTERNAL_USERNAME_DOMAIN}`;
}

function toDisplayAccount(identifier, email) {
  const normalized = normalizeIdentifier(identifier);

  if (normalized && !normalized.includes("@")) {
    return normalizeUsername(normalized);
  }

  const suffix = `@${INTERNAL_USERNAME_DOMAIN}`;
  if (String(email ?? "").endsWith(suffix)) {
    return String(email).slice(0, -suffix.length);
  }

  return normalizeIdentifier(email || normalized);
}

function normalizePassword(value) {
  return String(value ?? "").trim();
}

function normalizeDisplayName(value, fallback) {
  return String(value ?? "").trim().slice(0, 40) || fallback;
}

function createCloudUser(authUser, credentials = {}) {
  const email = normalizeIdentifier(authUser?.email ?? credentials.accountName);
  const accountName = toDisplayAccount(credentials.accountName, email);
  const name = normalizeDisplayName(
    credentials.displayName ?? authUser?.user_metadata?.display_name,
    accountName,
  );

  return {
    id: authUser.id,
    key: accountName,
    accountName,
    name,
    createdAt: Date.parse(authUser.created_at) || Date.now(),
    lastLoginAt: Date.now(),
    items: [],
    batches: [],
    skips: {},
    snoozes: {},
  };
}

function createStateForUser(user) {
  return {
    sessionUserId: user.id,
    users: {
      [user.id]: user,
    },
  };
}

function updateSessionUser(state, user) {
  const nextState = clone(state);
  nextState.sessionUserId = user.id;
  nextState.users ??= {};
  nextState.users[user.id] = {
    ...user,
    ...(nextState.users[user.id] ?? {}),
    id: user.id,
    key: user.key,
    accountName: user.accountName,
    name: user.name,
    lastLoginAt: Date.now(),
    items: nextState.users[user.id]?.items ?? [],
    batches: nextState.users[user.id]?.batches ?? [],
    skips: nextState.users[user.id]?.skips ?? {},
    snoozes: nextState.users[user.id]?.snoozes ?? {},
  };
  return nextState;
}

export function createMindFlowCloudStore(options = {}) {
  const localStore = createMindFlowStore(options);
  const cloudClient = options.cloudClient ?? createSupabaseRestClient(options);
  let syncPromise = Promise.resolve();

  async function loadCloudState(user, credentials) {
    const remoteState = await cloudClient.fetchUserState(user.id);
    const nextState = remoteState
      ? updateSessionUser(remoteState, user)
      : createStateForUser(user);

    localStore.replaceState(nextState);
    if (!remoteState) {
      await cloudClient.saveUserState(user.id, localStore.exportState());
    }

    return localStore.getSession();
  }

  function scheduleSync() {
    const currentUser = localStore.getSession();
    if (!currentUser) {
      return syncPromise;
    }

    const state = localStore.exportState();
    syncPromise = syncPromise
      .catch(() => null)
      .then(() => cloudClient.saveUserState(currentUser.id, state));
    return syncPromise;
  }

  function mutateAndSync(fn) {
    const result = fn();
    scheduleSync();
    return result;
  }

  return {
    async register(credentials) {
      const accountName = normalizeIdentifier(credentials?.accountName);
      const email = toAuthEmail(accountName);
      const password = normalizePassword(credentials?.password);
      const confirmPassword = normalizePassword(credentials?.confirmPassword);

      if (!accountName) {
        throw new Error("empty_username");
      }

      if (!password) {
        throw new Error("empty_password");
      }

      if (password !== confirmPassword) {
        throw new Error("password_mismatch");
      }

      const payload = await cloudClient.signUp({
        email,
        password,
        displayName: credentials?.displayName || toDisplayAccount(accountName, email),
      });
      const session = payload?.session ?? await cloudClient.signIn({ email, password });
      const user = createCloudUser(session.user, {
        ...credentials,
        accountName,
      });

      return loadCloudState(user, credentials);
    },

    async login(credentials) {
      const accountName = normalizeIdentifier(credentials?.accountName);
      const email = toAuthEmail(accountName);
      const password = normalizePassword(credentials?.password);

      if (!accountName) {
        throw new Error("empty_username");
      }

      if (!password) {
        throw new Error("empty_password");
      }

      const session = await cloudClient.signIn({ email, password });
      const user = createCloudUser(session.user, {
        ...credentials,
        accountName,
      });
      return loadCloudState(user, credentials);
    },

    async logout() {
      localStore.logout();
      await cloudClient.signOut();
    },

    getSession() {
      if (!cloudClient.getSession()) {
        return null;
      }

      return localStore.getSession();
    },

    getStateForUser(userId) {
      return localStore.getStateForUser(userId);
    },

    getItemsByStatus(userId, status) {
      return localStore.getItemsByStatus(userId, status);
    },

    getRecommendation(userId) {
      return localStore.getRecommendation(userId);
    },

    getParkingCandidate(userId) {
      return localStore.getParkingCandidate(userId);
    },

    saveOrganizedResult(userId, rawText, result) {
      return mutateAndSync(() => localStore.saveOrganizedResult(userId, rawText, result));
    },

    addItem(userId, values) {
      return mutateAndSync(() => localStore.addItem(userId, values));
    },

    updateItem(userId, itemId, patch) {
      return mutateAndSync(() => localStore.updateItem(userId, itemId, patch));
    },

    skipItem(userId, itemId) {
      return mutateAndSync(() => localStore.skipItem(userId, itemId));
    },

    snoozeParkingCandidate(userId, itemId) {
      return mutateAndSync(() => localStore.snoozeParkingCandidate(userId, itemId));
    },

    softDeleteItem(userId, itemId) {
      return mutateAndSync(() => localStore.softDeleteItem(userId, itemId));
    },

    undoDelete(userId, itemId) {
      return mutateAndSync(() => localStore.undoDelete(userId, itemId));
    },

    flush() {
      return syncPromise;
    },
  };
}
