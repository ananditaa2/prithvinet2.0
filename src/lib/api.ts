// Central API client — all calls go through here
const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

function getToken(): string | null {
  return localStorage.getItem("prithvinet_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (err: any) {
    // Network errors (e.g. backend not running, CORS, DNS failures) come through here.
    throw new Error(
      `Network error connecting to API (${BASE_URL}${path}): ${err?.message || "Unknown error"}. ` +
        "Make sure the backend is running and VITE_API_URL is set correctly."
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ access_token: string; user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (data: any) =>
      request<any>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    me: () => request<any>("/auth/me"),
    users: () => request<any[]>("/auth/users"),
  },

  // ── Industries ─────────────────────────────────────────────────────────────
  industries: {
    list: (params?: Record<string, string>) =>
      request<any[]>(`/industries?${new URLSearchParams(params || {})}`),
    get: (id: number) => request<any>(`/industries/${id}`),
    create: (data: any) =>
      request<any>("/industries", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/industries/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/industries/${id}`, { method: "DELETE" }),
  },

  // ── Monitoring Locations ───────────────────────────────────────────────────
  locations: {
    list: () => request<any[]>("/locations"),
    get: (id: number) => request<any>(`/locations/${id}`),
    create: (data: any) =>
      request<any>("/locations", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/locations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/locations/${id}`, { method: "DELETE" }),
  },

  // ── Environmental Data ─────────────────────────────────────────────────────
  data: {
    list: (params?: Record<string, string>) =>
      request<any[]>(`/data?${new URLSearchParams(params || {})}`),
    submitAir: (data: any) =>
      request<any>("/data/air", { method: "POST", body: JSON.stringify(data) }),
    submitWater: (data: any) =>
      request<any>("/data/water", { method: "POST", body: JSON.stringify(data) }),
    submitNoise: (data: any) =>
      request<any>("/data/noise", { method: "POST", body: JSON.stringify(data) }),
    latest: (locationId: number) => request<any[]>(`/data/latest/${locationId}`),
  },

  // ── Alerts ─────────────────────────────────────────────────────────────────
  alerts: {
    list: (params?: Record<string, string>) =>
      request<any[]>(`/alerts?${new URLSearchParams(params || {})}`),
    resolve: (id: number) =>
      request<any>(`/alerts/${id}/resolve`, { method: "PATCH" }),
    acknowledge: (id: number) =>
      request<any>(`/alerts/${id}/acknowledge`, { method: "PATCH" }),
    compliance: () => request<any>("/compliance"),
    complianceHistory: (industryId: number) =>
      request<any>(`/compliance/${industryId}`),
    notifications: () => request<any[]>("/notifications"),
    markRead: (id: number) =>
      request<any>(`/notifications/${id}/read`, { method: "PATCH" }),
  },

  // ── Reports ────────────────────────────────────────────────────────────────
  reports: {
    monthly: (year: number, month: number) =>
      request<any>(`/reports/monthly?year=${year}&month=${month}`),
    yearly: (year: number) => request<any>(`/reports/yearly?year=${year}`),
    industry: (id: number) => request<any>(`/reports/industry/${id}`),
  },

  // ── AI ─────────────────────────────────────────────────────────────────────
  ai: {
    simulateRisk: (data: any) =>
      request<any>("/ai/simulate-risk", { method: "POST", body: JSON.stringify(data) }),
    predict: (locationId: number, hours: number) =>
      request<any>("/ai/predict", {
        method: "POST",
        body: JSON.stringify({ location_id: locationId, hours }),
      }),
    copilot: (question: string, context?: string) =>
      request<any>("/ai/copilot", {
        method: "POST",
        body: JSON.stringify({ question, context }),
      }),
  },

  // ── Heatmap ────────────────────────────────────────────────────────────────
  heatmap: {
    get: (dataType = "air", pollutant?: string) =>
      request<any>(`/heatmap?data_type=${dataType}${pollutant ? `&pollutant=${pollutant}` : ""}`),
  },

  // ── Public ─────────────────────────────────────────────────────────────────
  public: {
    airQuality: (region?: string) =>
        request<any>(`/public/air-quality${region ? `?region=${region}` : ""}`),
    waterQuality: (region?: string) =>
        request<any>(`/public/water-quality${region ? `?region=${region}` : ""}`),
    alerts: (severity?: string) =>
        request<any>(`/public/alerts${severity ? `?severity=${severity}` : ""}`),
    industries: (region?: string) =>
        request<any>(`/public/industries${region ? `?region=${region}` : ""}`),
  },
};
