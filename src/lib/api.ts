// In dev, default to the local fixed backend instance on :8001.
// Deployment can override with VITE_API_URL.
const DEFAULT_BASE_URL = import.meta.env.DEV ? "http://127.0.0.1:8001" : "/api";
const BASE_URL = (import.meta.env.VITE_API_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

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
    // #region agent log
    fetch('http://127.0.0.1:7687/ingest/48847fa3-258e-4f26-90ec-c6831f033fe2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a22406'},body:JSON.stringify({sessionId:'a22406',runId:'initial',hypothesisId:'H7',location:'src/lib/api.ts:request',message:'API request start',data:{baseUrl:BASE_URL,path,method:options.method ?? 'GET'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // #region agent log
    fetch('http://127.0.0.1:7687/ingest/48847fa3-258e-4f26-90ec-c6831f033fe2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a22406'},body:JSON.stringify({sessionId:'a22406',runId:'initial',hypothesisId:'H8',location:'src/lib/api.ts:request',message:'API network error',data:{baseUrl:BASE_URL,path,method:options.method ?? 'GET',error:message},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    // Network errors (e.g. backend not running, CORS, DNS failures) come through here.
    throw new Error(
      `Network error connecting to API (${BASE_URL}${path}): ${message}. ` +
        "Make sure the backend is running and VITE_API_URL is set correctly."
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    // #region agent log
    fetch('http://127.0.0.1:7687/ingest/48847fa3-258e-4f26-90ec-c6831f033fe2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a22406'},body:JSON.stringify({sessionId:'a22406',runId:'initial',hypothesisId:'H9',location:'src/lib/api.ts:request',message:'API non-OK response',data:{baseUrl:BASE_URL,path,status:res.status,statusText:res.statusText,detail:(err as {detail?: string}).detail,type:(err as {type?: string}).type},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const msg = err.detail || err.message || "Request failed";
    const type = err.type ? ` (${err.type})` : "";
    throw new Error(`${msg}${type}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (data: Record<string, unknown>) =>
      request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    me: () => request<User>("/auth/me"),
    updateProfile: (data: { name: string }) =>
      request<User>("/auth/me", { method: "PATCH", body: JSON.stringify(data) }),
    changePassword: (data: Record<string, string>) =>
      request<{ message: string }>("/auth/change-password", { method: "POST", body: JSON.stringify(data) }),
    users: () => request<User[]>("/auth/users"),
  },

  // ── Industries ─────────────────────────────────────────────────────────────
  industries: {
    list: (params?: Record<string, string>) =>
      request<Record<string, unknown>[]>(`/industries?${new URLSearchParams(params || {})}`),
    get: (id: number) => request<Record<string, unknown>>(`/industries/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/industries", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/industries/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/industries/${id}`, { method: "DELETE" }),
  },

  // ── Monitoring Locations ───────────────────────────────────────────────────
  locations: {
    list: () => request<Record<string, unknown>[]>("/locations"),
    get: (id: number) => request<Record<string, unknown>>(`/locations/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/locations", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/locations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/locations/${id}`, { method: "DELETE" }),
  },

  // ── Environmental Data ─────────────────────────────────────────────────────
  data: {
    list: (params?: Record<string, string>) =>
      request<Record<string, unknown>[]>(`/data?${new URLSearchParams(params || {})}`),
    submitAir: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/data/air", { method: "POST", body: JSON.stringify(data) }),
    submitWater: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/data/water", { method: "POST", body: JSON.stringify(data) }),
    submitNoise: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/data/noise", { method: "POST", body: JSON.stringify(data) }),
    latest: (locationId: number) => request<Record<string, unknown>[]>(`/data/latest/${locationId}`),
  },

  // ── Alerts ─────────────────────────────────────────────────────────────────
  alerts: {
    list: (params?: Record<string, string>) =>
      request<Record<string, unknown>[]>(`/alerts?${new URLSearchParams(params || {})}`),
    resolve: (id: number) =>
      request<Record<string, unknown>>(`/alerts/${id}/resolve`, { method: "PATCH" }),
    acknowledge: (id: number) =>
      request<Record<string, unknown>>(`/alerts/${id}/acknowledge`, { method: "PATCH" }),
    compliance: () => request<Record<string, unknown>>("/compliance"),
    complianceHistory: (industryId: number) =>
      request<Record<string, unknown>>(`/compliance/${industryId}`),
    inspectionPriority: (region?: string, limit?: number) =>
      request<Record<string, unknown>>(`/alerts/inspection-priority?${new URLSearchParams({ ...(region && { region }), ...(limit && { limit: String(limit) }) })}`),
    casesToAct: (region?: string) =>
      request<Record<string, unknown>>(`/alerts/cases-to-act${region ? `?region=${encodeURIComponent(region)}` : ""}`),
    notifications: () => request<Record<string, unknown>[]>("/notifications"),
    markRead: (id: number) =>
      request<Record<string, unknown>>(`/notifications/${id}/read`, { method: "PATCH" }),
    pollutionZones: (limit = 10) =>
      request<Record<string, unknown>>(`/alerts/pollution-zones?limit=${limit}`),
  },

  // ── Reports ────────────────────────────────────────────────────────────────
  reports: {
    monthly: (year: number, month: number) =>
      request<Record<string, unknown>>(`/reports/monthly?year=${year}&month=${month}`),
    yearly: (year: number) => request<Record<string, unknown>>(`/reports/yearly?year=${year}`),
    industry: (id: number) => request<Record<string, unknown>>(`/reports/industry/${id}`),
  },

  // ── AI ─────────────────────────────────────────────────────────────────────
  ai: {
    simulateRisk: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/ai/simulate-risk", { method: "POST", body: JSON.stringify(data) }),
    predict: (locationId: number, hours: number) =>
      request<Record<string, unknown>>("/ai/predict", {
        method: "POST",
        body: JSON.stringify({ location_id: locationId, hours }),
      }),
    copilot: (question: string, context?: string) =>
      request<Record<string, unknown>>("/ai/copilot", {
        method: "POST",
        body: JSON.stringify({ question, context }),
      }),
    aqiSuggestions: (aqi: number, region: string, role: string) =>
      request<Record<string, unknown>>("/ai/aqi-suggestions", {
        method: "POST",
        body: JSON.stringify({ aqi, region, role }),
      }),
  },

  // ── Heatmap ────────────────────────────────────────────────────────────────
  heatmap: {
    get: (dataType = "air", pollutant?: string) =>
      request<Record<string, unknown>[]>(`/heatmap?data_type=${dataType}${pollutant ? `&pollutant=${pollutant}` : ""}`),
  },

  // ── Public ─────────────────────────────────────────────────────────────────
  public: {
    airQuality: (region?: string) =>
        request<Record<string, unknown>>(`/public/air-quality${region ? `?region=${region}` : ""}`),
    waterQuality: (region?: string) =>
        request<Record<string, unknown>>(`/public/water-quality${region ? `?region=${region}` : ""}`),
    alerts: (severity?: string) =>
        request<Record<string, unknown>>(`/public/alerts${severity ? `?severity=${severity}` : ""}`),
    industries: (region?: string) =>
        request<Record<string, unknown>>(`/public/industries${region ? `?region=${region}` : ""}`),
    stories: (region?: string, days?: number) => {
      const params = new URLSearchParams();
      if (region) params.set("region", region);
      if (days) params.set("days", String(days));
      return request<Record<string, unknown>>(`/public/stories${params.toString() ? `?${params}` : ""}`);
    },
  },
};
