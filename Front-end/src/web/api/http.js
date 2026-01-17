import { API_BASE_URL } from "./config.js";

function toMessage(data, fallback) {
  const d = data?.detail;

  // FastAPI sometimes returns `detail` as string, sometimes object, sometimes list
  if (typeof d === "string" && d.trim()) return d;

  if (d && typeof d === "object") {
    // common patterns
    if (typeof d.message === "string" && d.message.trim()) return d.message;
    if (typeof d.code === "string" && d.code.trim()) return d.code;

    // last resort
    try { return JSON.stringify(d); } catch {}
  }

  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  return fallback;
}

export async function httpJson(path, { token, method = "GET", body, headers = {} } = {}) {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(toMessage(data, `HTTP ${res.status}`));
    err.status = res.status;
    err.data = data;
    err.url = url;
    err.method = method;
    throw err;
  }

  return data;
}

export async function httpBytes(path, { token, method = "GET", body, headers = {} } = {}) {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err = new Error(txt || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = { text: txt };
    err.url = url;
    err.method = method;
    throw err;
  }

  return new Uint8Array(await res.arrayBuffer());
}
