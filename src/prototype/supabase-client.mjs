const SESSION_KEY = "mindflow:supabase-session";

function trimText(value) {
  return String(value ?? "").trim();
}

function parseResponseBody(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function createError(message, payload, status = null) {
  const error = new Error(message);
  error.payload = payload;
  error.status = status;
  return error;
}

function normalizeSessionPayload(payload) {
  if (payload?.session) {
    return payload.session;
  }

  if (payload?.access_token && payload?.user) {
    return payload;
  }

  return null;
}

export function createSupabaseRestClient(options = {}) {
  const configUrl = options.configUrl ?? "/api/supabase-config";
  const storage = options.storage ?? globalThis.localStorage;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  let configPromise = null;
  let refreshPromise = null;

  if (!storage) {
    throw new Error("storage_unavailable");
  }

  if (!fetchImpl) {
    throw new Error("fetch_unavailable");
  }

  function readSession() {
    try {
      const raw = storage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeSession(session) {
    if (!session) {
      storage.removeItem(SESSION_KEY);
      return;
    }

    storage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  async function getConfig() {
    configPromise ??= fetchImpl(configUrl)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || (!payload.supabaseProxyUrl && (!payload.supabaseUrl || !payload.supabaseKey))) {
          throw new Error("cloud_config_unavailable");
        }

        return {
          proxyUrl: payload.supabaseProxyUrl ? String(payload.supabaseProxyUrl) : null,
          url: payload.supabaseUrl ? String(payload.supabaseUrl).replace(/\/+$/u, "") : null,
          key: payload.supabaseKey ?? null,
        };
      });

    return configPromise;
  }

  function resolveSession(options) {
    return Object.prototype.hasOwnProperty.call(options, "session")
      ? options.session
      : readSession();
  }

  async function sendRequest(config, path, options = {}, session = null) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    };

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const response = config.proxyUrl
      ? await fetchImpl(config.proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path,
          method: options.method ?? "GET",
          headers,
          body: options.body ?? null,
        }),
      })
      : await fetchImpl(`${config.url}${path}`, {
        ...options,
        headers: {
          ...headers,
          apikey: config.key,
        },
      });
    const text = await response.text();
    const body = parseResponseBody(text);

    if (!response.ok) {
      const message = body?.error_code || body?.code || body?.msg || body?.message || body?.error_description || body?.error || "cloud_request_failed";
      throw createError(message, body, response.status);
    }

    return body;
  }

  async function refreshSession(currentSession = readSession()) {
    if (!currentSession?.refresh_token) {
      throw new Error("session_refresh_unavailable");
    }

    refreshPromise ??= request("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({
        refresh_token: currentSession.refresh_token,
      }),
      session: null,
      skipAuthRefresh: true,
    })
      .then((payload) => {
        const session = normalizeSessionPayload(payload);

        if (!session?.access_token) {
          throw new Error("session_refresh_failed");
        }

        writeSession(session);
        return session;
      })
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
  }

  async function request(path, options = {}) {
    const config = await getConfig();
    const session = resolveSession(options);

    try {
      return await sendRequest(config, path, options, session);
    } catch (error) {
      if (options.skipAuthRefresh || !session?.refresh_token || error?.status !== 401) {
        throw error;
      }

      const refreshedSession = await refreshSession(session);
      return sendRequest(config, path, options, refreshedSession);
    }
  }

  return {
    getSession: readSession,
    refreshSession,

    async signUp({ email, password, displayName }) {
      const payload = await request("/auth/v1/signup", {
        method: "POST",
        body: JSON.stringify({
          email: trimText(email).toLocaleLowerCase(),
          password,
          data: {
            display_name: trimText(displayName),
          },
        }),
        session: null,
      });
      const session = normalizeSessionPayload(payload);

      if (session) {
        writeSession(session);
      }

      return {
        ...payload,
        session,
      };
    },

    async signIn({ email, password }) {
      const payload = await request("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({
          email: trimText(email).toLocaleLowerCase(),
          password,
        }),
        session: null,
      });

      if (!payload?.access_token) {
        throw new Error("invalid_credentials");
      }

      writeSession(payload);
      return payload;
    },

    async signOut() {
      const session = readSession();
      if (session?.access_token) {
        try {
          await request("/auth/v1/logout", {
            method: "POST",
            session,
          });
        } catch {
          // Local logout should still clear the browser session.
        }
      }

      writeSession(null);
    },

    async fetchUserState(userId) {
      const rows = await request(`/rest/v1/mindflow_user_states?select=state&user_id=eq.${encodeURIComponent(userId)}&limit=1`, {
        method: "GET",
      });

      return Array.isArray(rows) && rows[0]?.state ? rows[0].state : null;
    },

    async saveUserState(userId, state) {
      return request("/rest/v1/mindflow_user_states?on_conflict=user_id", {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          user_id: userId,
          state,
        }),
      });
    },
  };
}
