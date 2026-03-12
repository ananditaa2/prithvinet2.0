export type UserRole =
  | "admin"
  | "regional_officer"
  | "monitoring_team"
  | "industry_user"
  | "citizen";

export type DashboardFeature =
  | "overview"
  | "industries"
  | "locations"
  | "alerts"
  | "reports"
  | "ai_tools"
  | "heatmap"
  | "citizen_portal"
  | "raw_data_table"
  | "violation_logs"
  | "system_logs"
  | "websocket_stream";

export type FeatureAccessLevel =
  | "hidden"
  | "blocked"
  | "redacted"
  | "view"
  | "view_own_only"
  | "view_own_region"
  | "view_all"
  | "unredacted"
  | "full_access"
  | "active";

export interface RoleAccessRule {
  access: FeatureAccessLevel;
  visible: boolean;
  enabled: boolean;
  label: string;
}

export type RoleAccessMatrix = Record<UserRole, Record<DashboardFeature, RoleAccessRule>>;

const ALLOW = (
  access: FeatureAccessLevel,
  label: string,
  options?: Partial<Pick<RoleAccessRule, "visible" | "enabled">>,
): RoleAccessRule => ({
  access,
  label,
  visible: options?.visible ?? true,
  enabled: options?.enabled ?? true,
});

const DENY = (
  access: Extract<FeatureAccessLevel, "hidden" | "blocked" | "redacted">,
  label: string,
  options?: Partial<Pick<RoleAccessRule, "visible" | "enabled">>,
): RoleAccessRule => ({
  access,
  label,
  visible: options?.visible ?? access !== "hidden",
  enabled: options?.enabled ?? false,
});

export const ROLE_ACCESS: RoleAccessMatrix = {
  citizen: {
    overview: ALLOW("view", "View"),
    industries: ALLOW("view", "View"),
    locations: ALLOW("view", "View"),
    alerts: ALLOW("view", "View"),
    reports: ALLOW("view", "View"),
    ai_tools: DENY("blocked", "Blocked"),
    heatmap: ALLOW("view", "View"),
    citizen_portal: ALLOW("active", "Active"),
    raw_data_table: DENY("hidden", "Hidden", { visible: false }),
    violation_logs: DENY("redacted", "Redacted"),
    system_logs: DENY("blocked", "Blocked"),
    websocket_stream: ALLOW("active", "Active"),
  },

  industry_user: {
    overview: ALLOW("view", "View"),
    industries: ALLOW("view_own_only", "View (Own Only)"),
    locations: ALLOW("view", "View"),
    alerts: ALLOW("view_own_only", "View (Own Only)"),
    reports: ALLOW("view_own_only", "View (Own Only)"),
    ai_tools: DENY("blocked", "Blocked"),
    heatmap: ALLOW("view", "View"),
    citizen_portal: ALLOW("active", "Active"),
    raw_data_table: ALLOW("view_own_only", "View (Own Only)"),
    violation_logs: ALLOW("view_own_only", "View (Own Only)"),
    system_logs: DENY("blocked", "Blocked"),
    websocket_stream: ALLOW("active", "Active"),
  },

  monitoring_team: {
    overview: ALLOW("view", "View"),
    industries: ALLOW("view", "View"),
    locations: ALLOW("view_all", "View All"),
    alerts: ALLOW("full_access", "Full Access"),
    reports: ALLOW("view", "View"),
    ai_tools: DENY("blocked", "Blocked"),
    heatmap: ALLOW("view", "View"),
    citizen_portal: ALLOW("active", "Active"),
    raw_data_table: ALLOW("view_all", "View All"),
    violation_logs: ALLOW("unredacted", "Unredacted"),
    system_logs: DENY("blocked", "Blocked"),
    websocket_stream: ALLOW("active", "Active"),
  },

  regional_officer: {
    overview: ALLOW("view", "View"),
    industries: ALLOW("view", "View"),
    locations: ALLOW("view", "View"),
    alerts: ALLOW("full_access", "Full Access"),
    reports: ALLOW("view", "View"),
    ai_tools: ALLOW("full_access", "Full Access"),
    heatmap: ALLOW("view", "View"),
    citizen_portal: ALLOW("active", "Active"),
    raw_data_table: ALLOW("view_own_region", "View (Own Region)"),
    violation_logs: ALLOW("unredacted", "Unredacted"),
    system_logs: DENY("blocked", "Blocked"),
    websocket_stream: ALLOW("active", "Active"),
  },

  admin: {
    overview: ALLOW("view", "View"),
    industries: ALLOW("view_all", "View All"),
    locations: ALLOW("view_all", "View All"),
    alerts: ALLOW("full_access", "Full Access"),
    reports: ALLOW("full_access", "Full Access"),
    ai_tools: ALLOW("full_access", "Full Access"),
    heatmap: ALLOW("view", "View"),
    citizen_portal: ALLOW("active", "Active"),
    raw_data_table: ALLOW("view_all", "View All"),
    violation_logs: ALLOW("unredacted", "Unredacted"),
    system_logs: ALLOW("full_access", "Full Access"),
    websocket_stream: ALLOW("active", "Active"),
  },
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Super Admin",
  regional_officer: "Regional Officer",
  monitoring_team: "Monitoring Team",
  industry_user: "Industry User",
  citizen: "Citizen",
};

export const DASHBOARD_FEATURE_LABELS: Record<DashboardFeature, string> = {
  overview: "Global Key Performance Indicators",
  industries: "Industry Registry",
  locations: "Real-time Map & Environmental Views",
  alerts: "Alerts & Compliance",
  reports: "Reports",
  ai_tools: "AI Compliance Copilot",
  heatmap: "Real-time Map & Environmental Views",
  citizen_portal: "Citizen Portal",
  raw_data_table: "Station-Level Raw Data Table",
  violation_logs: "Violation Logs & Entity Names",
  system_logs: "System Event / API Logs",
  websocket_stream: "\"System Live\" WebSocket Stream",
};

export function getRoleAccess(role?: string | null) {
  if (!role || !(role in ROLE_ACCESS)) {
    return ROLE_ACCESS.citizen;
  }

  return ROLE_ACCESS[role as UserRole];
}

export function getFeatureAccess(role: string | null | undefined, feature: DashboardFeature): RoleAccessRule {
  return getRoleAccess(role)[feature];
}

export function canAccessFeature(role: string | null | undefined, feature: DashboardFeature): boolean {
  return getFeatureAccess(role, feature).enabled;
}

export function isFeatureVisible(role: string | null | undefined, feature: DashboardFeature): boolean {
  return getFeatureAccess(role, feature).visible;
}

export function hasFullAccess(role: string | null | undefined, feature: DashboardFeature): boolean {
  return getFeatureAccess(role, feature).access === "full_access";
}

export function isOwnOnlyAccess(role: string | null | undefined, feature: DashboardFeature): boolean {
  return getFeatureAccess(role, feature).access === "view_own_only";
}

export function isOwnRegionAccess(role: string | null | undefined, feature: DashboardFeature): boolean {
  return getFeatureAccess(role, feature).access === "view_own_region";
}

export function isUnredactedAccess(role: string | null | undefined, feature: DashboardFeature): boolean {
  return getFeatureAccess(role, feature).access === "unredacted";
}
