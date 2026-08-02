export const MIND_FLOW_STORAGE_KEY = "mindflow:v1";
const STORAGE_KEY = MIND_FLOW_STORAGE_KEY;
const SKIP_MS = 30 * 60 * 1000;
const SNOOZE_MS = 24 * 60 * 60 * 1000;

let idCounter = 0;

export const priorityLabels = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const defaultState = {
  sessionUserId: null,
  users: {},
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix, now, random) {
  idCounter += 1;
  return `${prefix}-${now().toString(36)}-${idCounter.toString(36)}-${Math.floor(random() * 1_000_000).toString(36)}`;
}

function readState(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return clone(defaultState);
    }

    const parsed = JSON.parse(raw);
    return {
      ...clone(defaultState),
      ...parsed,
      users: parsed.users && typeof parsed.users === "object" ? parsed.users : {},
    };
  } catch {
    return clone(defaultState);
  }
}

function writeState(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeUserName(name) {
  return String(name ?? "").trim().slice(0, 40);
}

function normalizeAccountName(accountName) {
  return String(accountName ?? "").trim().slice(0, 40);
}

function normalizePassword(password) {
  return String(password ?? "").trim().slice(0, 80);
}

function userKey(accountName) {
  return normalizeAccountName(accountName).toLocaleLowerCase();
}

function passwordFingerprint(accountKey, password) {
  let hash = 2166136261;
  const value = `mindflow-local-v1:${accountKey}:${password}`;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function getLoginCredentials(credentials, passwordArg) {
  if (credentials && typeof credentials === "object") {
    const accountName = normalizeAccountName(credentials.accountName ?? credentials.username ?? credentials.name);
    const displayName = normalizeUserName(credentials.displayName ?? credentials.name ?? accountName);
    const password = normalizePassword(credentials.password);

    return {
      accountName,
      displayName,
      password,
      confirmPassword: normalizePassword(credentials.confirmPassword),
      requirePassword: true,
    };
  }

  const accountName = normalizeAccountName(credentials);
  return {
    accountName,
    displayName: normalizeUserName(credentials),
    password: normalizePassword(passwordArg),
    confirmPassword: "",
    requirePassword: passwordArg !== undefined,
  };
}

function normalizePriority(priority) {
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }

  if (priority === 1) {
    return "high";
  }

  if (priority === 2) {
    return "medium";
  }

  return "low";
}

function normalizeTags(tags) {
  const values = Array.isArray(tags) ? tags : String(tags ?? "").split(/[,，、]/u);
  const seen = new Set();

  return values
    .map((tag) => String(tag ?? "").trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLocaleLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function normalizeTextArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => String(value ?? "").trim()).filter(Boolean);
}

function normalizeDueAt(dueAt) {
  const value = String(dueAt ?? "").trim();
  return value || null;
}

function normalizeSteps(steps, nextStep) {
  const normalized = Array.isArray(steps)
    ? steps.map((step) => String(step ?? "").trim()).filter(Boolean)
    : [];

  if (normalized.length > 0) {
    return normalized.slice(0, 8);
  }

  return [String(nextStep || "先写下一个更小的开始。").trim()].filter(Boolean);
}

function visibleItems(items) {
  return items.filter((item) => item.status !== "deleted");
}

function findUser(state, userId) {
  const user = state.users[userId];
  if (!user) {
    throw new Error("user_not_found");
  }

  user.items ??= [];
  user.batches ??= [];
  user.skips ??= {};
  user.snoozes ??= {};
  return user;
}

function sortActive(items) {
  const rank = { high: 0, medium: 1, low: 2 };
  return [...items].sort((a, b) => {
    const priorityDelta = (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return (a.createdAt ?? 0) - (b.createdAt ?? 0);
  });
}

function createItemFromSuggestion(suggestion, index, batch, now) {
  const title = String(suggestion.title || suggestion.source || "先看一件事").trim();

  return {
    id: createId("item", now, batch.random),
    userId: batch.userId,
    batchId: batch.id,
    source: String(suggestion.source || suggestion.title || "").trim(),
    title,
    priority: normalizePriority(suggestion.priority ?? index + 1),
    status: suggestion.assignTo === "parking" ? "parking" : "active",
    reason: String(suggestion.reason || "它比较清楚，不需要一次处理太多。").trim(),
    nextStep: String(suggestion.nextStep || "").trim(),
    steps: normalizeSteps(suggestion.focusSteps, suggestion.nextStep),
    parkingReason: String(suggestion.parkingReason || suggestion.reasonParked || "先安全放着。").trim(),
    category: suggestion.category ?? "unknown",
    energy: suggestion.energy ?? "unknown",
    timeHint: suggestion.timeHint ?? null,
    dueAt: normalizeDueAt(suggestion.dueAt),
    tags: normalizeTags(suggestion.tags),
    isBigEvent: suggestion.isBigEvent === true,
    remindDaysBefore: Number.isInteger(suggestion.remindDaysBefore) ? suggestion.remindDaysBefore : null,
    parentGoal: String(suggestion.parentGoal || "").trim() || null,
    sourceUnitIds: normalizeTextArray(suggestion.sourceUnitIds),
    mentions: normalizeTextArray(suggestion.mentions),
    type: String(suggestion.type || "").trim() || null,
    deliverables: normalizeTextArray(suggestion.deliverables),
    dependsOn: normalizeTextArray(suggestion.dependsOn),
    confidence: typeof suggestion.confidence === "number" ? suggestion.confidence : null,
    ambiguities: normalizeTextArray(suggestion.ambiguities),
    aiMeta: batch.aiMeta,
    createdAt: now(),
    updatedAt: now(),
    completedAt: null,
    deletedAt: null,
    previousStatus: null,
  };
}

function createParkingItem(savedItem, batch, now) {
  const source = typeof savedItem === "string" ? savedItem : savedItem.source;
  const title = typeof savedItem === "string" ? source : savedItem.title || source;
  const parkingReason = typeof savedItem === "string" ? "先安全放着。" : savedItem.reasonParked;

  return {
    id: createId("item", now, batch.random),
    userId: batch.userId,
    batchId: batch.id,
    source: String(source || "").trim(),
    title: String(title || "先安全放着的一件事").trim(),
    priority: normalizePriority(savedItem.priority ?? "low"),
    status: savedItem.assignTo === "active" ? "active" : "parking",
    reason: String(savedItem.reason || "它可以先被保存，不需要现在处理。").trim(),
    nextStep: String(savedItem.nextStep || "想看的时候再打开它。").trim(),
    steps: normalizeSteps(savedItem.focusSteps || savedItem.steps, savedItem.nextStep || "想看的时候再打开它。"),
    parkingReason: String(parkingReason || "先安全放着。").trim(),
    category: savedItem.category ?? "unknown",
    energy: savedItem.energy ?? "unknown",
    timeHint: savedItem.timeHint ?? null,
    dueAt: normalizeDueAt(savedItem.dueAt),
    tags: normalizeTags(savedItem.tags),
    isBigEvent: savedItem.isBigEvent === true,
    remindDaysBefore: Number.isInteger(savedItem.remindDaysBefore) ? savedItem.remindDaysBefore : null,
    parentGoal: String(savedItem.parentGoal || "").trim() || null,
    sourceUnitIds: normalizeTextArray(savedItem.sourceUnitIds),
    mentions: normalizeTextArray(savedItem.mentions),
    type: String(savedItem.type || "").trim() || null,
    deliverables: normalizeTextArray(savedItem.deliverables),
    dependsOn: normalizeTextArray(savedItem.dependsOn),
    confidence: typeof savedItem.confidence === "number" ? savedItem.confidence : null,
    ambiguities: normalizeTextArray(savedItem.ambiguities),
    aiMeta: batch.aiMeta,
    createdAt: now(),
    updatedAt: now(),
    completedAt: null,
    deletedAt: null,
    previousStatus: null,
  };
}

export function createMindFlowStore(options = {}) {
  const storage = options.storage ?? globalThis.localStorage;
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;

  if (!storage) {
    throw new Error("storage_unavailable");
  }

  function mutate(fn) {
    const state = readState(storage);
    const result = fn(state);
    writeState(storage, state);
    return result;
  }

  function read(fn) {
    return fn(readState(storage));
  }

  return {
    replaceState(nextState) {
      writeState(storage, {
        ...clone(defaultState),
        ...(nextState && typeof nextState === "object" ? clone(nextState) : {}),
      });
    },

    exportState() {
      return readState(storage);
    },

    register(credentials) {
      const loginCredentials = getLoginCredentials(credentials);
      if (!loginCredentials.accountName) {
        throw new Error("empty_username");
      }

      if (!loginCredentials.password) {
        throw new Error("empty_password");
      }

      if (loginCredentials.password !== loginCredentials.confirmPassword) {
        throw new Error("password_mismatch");
      }

      return mutate((state) => {
        const key = userKey(loginCredentials.accountName);
        const existing = Object.values(state.users).find((user) => user.key === key);
        if (existing) {
          throw new Error("account_exists");
        }

        const user = {
          id: createId("user", now, random),
          key,
          accountName: loginCredentials.accountName,
          name: loginCredentials.displayName || loginCredentials.accountName,
          passwordHash: passwordFingerprint(key, loginCredentials.password),
          createdAt: now(),
          lastLoginAt: now(),
          items: [],
          batches: [],
          skips: {},
          snoozes: {},
        };

        state.users[user.id] = user;
        state.sessionUserId = user.id;
        return clone(user);
      });
    },

    login(credentials, passwordArg) {
      const loginCredentials = getLoginCredentials(credentials, passwordArg);
      if (!loginCredentials.accountName) {
        throw new Error("empty_username");
      }

      if (loginCredentials.requirePassword && !loginCredentials.password) {
        throw new Error("empty_password");
      }

      return mutate((state) => {
        const key = userKey(loginCredentials.accountName);
        const existing = Object.values(state.users).find((user) => user.key === key);
        const passwordHash = loginCredentials.requirePassword
          ? passwordFingerprint(key, loginCredentials.password)
          : null;

        if (loginCredentials.requirePassword && !existing) {
          throw new Error("invalid_credentials");
        }

        const storedPasswordHash = existing?.passwordHash ?? existing?.accessCodeHash;
        if (storedPasswordHash && passwordHash !== storedPasswordHash) {
          throw new Error("invalid_credentials");
        }

        const user =
          existing ??
          {
            id: createId("user", now, random),
            key,
            accountName: loginCredentials.accountName,
            name: loginCredentials.displayName || loginCredentials.accountName,
            passwordHash,
            createdAt: now(),
            items: [],
            batches: [],
            skips: {},
            snoozes: {},
          };

        user.accountName = loginCredentials.accountName;
        user.name = loginCredentials.displayName || user.name || loginCredentials.accountName;
        if (loginCredentials.requirePassword && !user.passwordHash) {
          user.passwordHash = passwordHash;
        }
        user.lastLoginAt = now();
        state.users[user.id] = user;
        state.sessionUserId = user.id;
        return clone(user);
      });
    },

    logout() {
      mutate((state) => {
        state.sessionUserId = null;
      });
    },

    getSession() {
      return read((state) => {
        if (!state.sessionUserId || !state.users[state.sessionUserId]) {
          return null;
        }

        return clone(state.users[state.sessionUserId]);
      });
    },

    getStateForUser(userId) {
      return read((state) => {
        const user = findUser(state, userId);
        return {
          user: clone(user),
          items: clone(visibleItems(user.items)),
        };
      });
    },

    getItemsByStatus(userId, status) {
      return read((state) => {
        const user = findUser(state, userId);
        return clone(visibleItems(user.items).filter((item) => item.status === status));
      });
    },

    saveOrganizedResult(userId, rawText, result) {
      if (!result || result.status !== "organized") {
        throw new Error("nothing_to_save");
      }

      return mutate((state) => {
        const user = findUser(state, userId);
        const batch = {
          id: createId("batch", now, random),
          userId,
          rawText: String(rawText ?? ""),
          aiMeta: result.meta ?? { modelBehavior: "fallback" },
          semanticUnits: Array.isArray(result.semanticUnits) ? clone(result.semanticUnits) : [],
          coverageCheck: result.coverageCheck && typeof result.coverageCheck === "object"
            ? clone(result.coverageCheck)
            : null,
          random,
          createdAt: now(),
        };
        const seenSources = new Set();
        const activeItems = (result.suggestions ?? []).map((suggestion, index) => {
          const item = createItemFromSuggestion(suggestion, index, batch, now);
          seenSources.add((item.source || item.title).toLocaleLowerCase());
          return item;
        });
        const parkingItems = (result.savedItems ?? [])
          .map((savedItem) => createParkingItem(savedItem, batch, now))
          .filter((item) => {
            const key = (item.source || item.title).toLocaleLowerCase();
            if (!key || seenSources.has(key)) {
              return false;
            }

            seenSources.add(key);
            return true;
          });
        const items = [...activeItems, ...parkingItems];

        if (items.length === 0) {
          throw new Error("nothing_to_save");
        }

        delete batch.random;
        user.items.push(...items);
        user.batches.push(batch);
        return {
          batch: clone(batch),
          items: clone(items),
        };
      });
    },

    addItem(userId, values = {}) {
      const title = String(values.title ?? "").trim();
      if (!title) {
        throw new Error("empty_title");
      }

      return mutate((state) => {
        const user = findUser(state, userId);
        const item = {
          id: createId("item", now, random),
          userId,
          batchId: null,
          source: title,
          title,
          priority: normalizePriority(values.priority ?? "medium"),
          status: values.status === "parking" || values.status === "done" ? values.status : "active",
          reason: String(values.reason ?? "手动记录的一件事。").trim(),
          nextStep: String(values.nextStep ?? "先写下一个小步骤。").trim(),
          steps: normalizeSteps(values.steps, values.nextStep),
          parkingReason: String(values.parkingReason ?? "先安全放着。").trim(),
          category: "manual",
          energy: "unknown",
          timeHint: null,
          dueAt: normalizeDueAt(values.dueAt),
          tags: normalizeTags(values.tags),
          isBigEvent: false,
          remindDaysBefore: null,
          aiMeta: { modelBehavior: "manual" },
          createdAt: now(),
          updatedAt: now(),
          completedAt: values.status === "done" ? now() : null,
          deletedAt: null,
          previousStatus: null,
        };

        user.items.push(item);
        return clone(item);
      });
    },

    updateItem(userId, itemId, patch) {
      return mutate((state) => {
        const user = findUser(state, userId);
        const item = user.items.find((candidate) => candidate.id === itemId);
        if (!item || item.status === "deleted") {
          throw new Error("item_not_found");
        }

        if ("title" in patch) {
          const title = String(patch.title ?? "").trim();
          if (!title) {
            throw new Error("empty_title");
          }
          item.title = title.slice(0, 120);
        }

        if ("priority" in patch) {
          item.priority = normalizePriority(patch.priority);
        }

        if ("status" in patch) {
          const nextStatus = patch.status;
          if (!["active", "parking", "done"].includes(nextStatus)) {
            throw new Error("invalid_status");
          }

          item.status = nextStatus;
          item.completedAt = nextStatus === "done" ? now() : null;
        }

        if ("steps" in patch) {
          item.steps = normalizeSteps(patch.steps, item.nextStep);
          item.nextStep = item.steps[0] ?? item.nextStep;
        }

        if ("reason" in patch) {
          item.reason = String(patch.reason ?? "").trim().slice(0, 180);
        }

        if ("parkingReason" in patch) {
          item.parkingReason = String(patch.parkingReason ?? "").trim().slice(0, 180);
        }

        if ("dueAt" in patch) {
          item.dueAt = normalizeDueAt(patch.dueAt);
        }

        if ("tags" in patch) {
          item.tags = normalizeTags(patch.tags);
        }

        item.updatedAt = now();
        delete user.skips[item.id];
        delete user.snoozes[item.id];
        return clone(item);
      });
    },

    skipItem(userId, itemId) {
      return mutate((state) => {
        const user = findUser(state, userId);
        if (!user.items.some((item) => item.id === itemId && item.status === "active")) {
          throw new Error("item_not_found");
        }

        user.skips[itemId] = now() + SKIP_MS;
        return true;
      });
    },

    snoozeParkingCandidate(userId, itemId) {
      return mutate((state) => {
        const user = findUser(state, userId);
        if (!user.items.some((item) => item.id === itemId && item.status === "parking")) {
          throw new Error("item_not_found");
        }

        user.snoozes[itemId] = now() + SNOOZE_MS;
        return true;
      });
    },

    getRecommendation(userId) {
      return read((state) => {
        const user = findUser(state, userId);
        const active = sortActive(
          visibleItems(user.items).filter((item) => {
            const skipUntil = user.skips[item.id] ?? 0;
            return item.status === "active" && skipUntil <= now();
          }),
        );

        return active[0] ? clone(active[0]) : null;
      });
    },

    getParkingCandidate(userId) {
      return read((state) => {
        const user = findUser(state, userId);
        const hasActive = visibleItems(user.items).some((item) => {
          const skipUntil = user.skips[item.id] ?? 0;
          return item.status === "active" && skipUntil <= now();
        });

        if (hasActive) {
          return null;
        }

        const candidate = visibleItems(user.items).find((item) => {
          const snoozedUntil = user.snoozes[item.id] ?? 0;
          return item.status === "parking" && snoozedUntil <= now();
        });

        return candidate ? clone(candidate) : null;
      });
    },

    softDeleteItem(userId, itemId) {
      return mutate((state) => {
        const user = findUser(state, userId);
        const item = user.items.find((candidate) => candidate.id === itemId);
        if (!item || item.status === "deleted") {
          throw new Error("item_not_found");
        }

        item.previousStatus = item.status;
        item.status = "deleted";
        item.deletedAt = now();
        item.updatedAt = now();
        return clone(item);
      });
    },

    undoDelete(userId, itemId) {
      return mutate((state) => {
        const user = findUser(state, userId);
        const item = user.items.find((candidate) => candidate.id === itemId);
        if (!item || item.status !== "deleted") {
          throw new Error("item_not_found");
        }

        item.status = item.previousStatus || "active";
        item.previousStatus = null;
        item.deletedAt = null;
        item.updatedAt = now();
        return clone(item);
      });
    },
  };
}
