import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  LayoutDashboard, Factory, MapPin, Wind, FileBarChart2, Cpu,
  Globe, LogOut, Landmark, Menu, X, User, Map, SearchCheck, FileWarning
} from "lucide-react";

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  notif_type: string;
  created_at: string;
  severity?: "critical" | "high" | "medium" | "low";
}

interface Alert {
  id: number;
  severity: "critical" | "high" | "medium" | "low";
  alert_type: string;
  message: string;
  status: "active" | "resolved";
  created_at: string;
  location_id?: number;
  industry_id?: number;
}

const navItems = [
  {
    icon: LayoutDashboard,
    label: "Overview",
    to: "/dashboard",
    roles: ["admin", "regional_officer", "monitoring_team", "industry_user", "citizen"],
  },
  {
    icon: Factory,
    label: "Industries",
    to: "/dashboard/industries",
    roles: ["admin", "regional_officer", "monitoring_team", "industry_user"],
  },
  {
    icon: MapPin,
    label: "Locations",
    to: "/dashboard/locations",
    roles: ["admin", "regional_officer", "monitoring_team"],
  },
  {
    icon: FileBarChart2,
    label: "Alerts",
    to: "/dashboard/alerts",
    roles: ["admin", "regional_officer", "monitoring_team", "industry_user"],
  },
  {
    icon: SearchCheck,
    label: "Inspection Priority",
    to: "/dashboard/inspection-priority",
    roles: ["admin", "regional_officer"],
  },
  {
    icon: FileBarChart2,
    label: "Reports",
    to: "/dashboard/reports",
    roles: ["admin", "regional_officer", "monitoring_team", "industry_user"],
  },
  {
    icon: Cpu,
    label: "AI Tools",
    to: "/dashboard/ai",
    roles: ["admin", "regional_officer"],
  },
  {
    icon: Map,
    label: "Heatmap",
    to: "/dashboard/heatmap",
    roles: ["admin", "regional_officer", "monitoring_team", "industry_user", "citizen"],
  },
  {
    icon: Globe,
    label: "Citizen Portal",
    to: "/public",
    roles: ["admin", "regional_officer", "monitoring_team", "industry_user", "citizen"],
  },
];

const roleBadgeColor: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  regional_officer: "bg-indigo-100 text-indigo-700",
  monitoring_team: "bg-teal-100 text-teal-700",
  industry_user: "bg-amber-100 text-amber-700",
  citizen: "bg-gray-100 text-gray-700",
};

export default function DashboardLayout() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const visibleNavItems = useMemo(() => {
    if (!user) return [];
    return navItems.filter((item) => item.roles.includes(user.role));
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  // Total active alerts count for the badge (includes alerts + notifications)
  const totalAlertCount = useMemo(() => {
    return activeAlerts.filter(a => a.status === "active").length + unreadCount;
  }, [activeAlerts, unreadCount]);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    // Load both notifications and active alerts
    Promise.all([
      api.alerts.notifications(),
      api.alerts.list({ status: "active", limit: "100" })
    ])
      .then(([notifs, alertsRes]) => {
        if (isMounted) {
          setNotifications((notifs as unknown as Notification[]) || []);
          setActiveAlerts(((alertsRes as unknown as any[]) || [])?.map(a => ({...a, severity: a.severity || "medium"})) as Alert[]);
        }
      })
      .catch((error) => {
        console.error("Failed to load notifications/alerts:", error);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsHost =
      window.location.hostname === "localhost"
        ? "127.0.0.1:8000"
        : `${window.location.hostname}:8000`;

    const socket = new WebSocket(`${wsProtocol}://${wsHost}/ws/dashboard?token=${encodeURIComponent(token)}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log("WebSocket message received:", payload);

        // Handle ANOMALY_ALERT from demo_trigger.py
        if (payload?.type === "ANOMALY_ALERT") {
          const anomaly = payload;
          
          // Show critical toast based on severity
          if (anomaly.severity === "CRITICAL") {
            toast.error(`🚨 CRITICAL: ${anomaly.message}`, {
              description: `Location: ${anomaly.location?.name}, ${anomaly.location?.region}`,
              duration: 10000,
              action: {
                label: "View Map",
                onClick: () => navigate("/dashboard/heatmap"),
              },
            });
          } else if (anomaly.severity === "HIGH") {
            toast.warning(`⚠️ HIGH: ${anomaly.message}`, {
              description: `Location: ${anomaly.location?.name}, ${anomaly.location?.region}`,
              duration: 8000,
            });
          } else {
            toast.info(anomaly.message, {
              description: `Location: ${anomaly.location?.name}`,
              duration: 5000,
            });
          }

          // Add to notifications list
          const newNotification: Notification = {
            id: Date.now(),
            title: `${anomaly.severity} ALERT: ${anomaly.data?.status || "Anomaly Detected"}`,
            message: anomaly.message,
            is_read: false,
            notif_type: "anomaly",
            created_at: new Date().toISOString(),
            severity: anomaly.severity?.toLowerCase(),
          };
          
          setNotifications((current) => [newNotification, ...current]);
          return;
        }

        // Handle regular notifications
        if (payload?.type === "notification" && payload.notification) {
          setNotifications((current) => {
            const existing = current.some((item) => item.id === payload.notification.id);
            return existing ? current : [payload.notification, ...current];
          });

          toast(payload.notification.title || "New notification", {
            description: payload.notification.message || "A new portal notification has arrived.",
          });
        }
      } catch (error) {
        console.error("Failed to parse websocket notification:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("Notification websocket error:", error);
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [token]);

  const markAllNotificationsRead = async () => {
    const unreadNotifications = notifications.filter((notification) => !notification.is_read);

    setNotifications((current) =>
      current.map((notification) => ({ ...notification, is_read: true }))
    );

    await Promise.all(
      unreadNotifications.map((notification) =>
        api.alerts.markRead(notification.id).catch((error) => {
          console.error(`Failed to mark notification ${notification.id} as read:`, error);
        })
      )
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // DEMO: Trigger test anomaly popup (Ctrl+Shift+D)
  const triggerDemoAnomaly = () => {
    const demoAnomalies = [
      {
        type: "ANOMALY_ALERT",
        severity: "CRITICAL",
        message: "PM10 Limit Breached at Bhilai Steel Plant!",
        location: { name: "Bhilai Steel Plant", region: "Bhilai", lat: 21.2160, lng: 81.4310 },
        data: { aqi: 320, pm25: 145.2, pm10: 198.5, status: "HAZARDOUS" },
        escalation_timer: 300,
        demo_mode: true,
      },
      {
        type: "ANOMALY_ALERT",
        severity: "HIGH",
        message: "Water pH critical at Korba River Monitoring Point",
        location: { name: "Korba River Point", region: "Korba", lat: 22.3500, lng: 82.7400 },
        data: { ph: 4.8, bod: 18.5, dissolved_oxygen: 2.1, status: "CRITICAL" },
        escalation_timer: 600,
        demo_mode: true,
      },
      {
        type: "ANOMALY_ALERT",
        severity: "CRITICAL",
        message: "Noise violation at Jindal Industrial Park",
        location: { name: "Jindal Industrial Park", region: "Raigarh", lat: 21.9000, lng: 83.4000 },
        data: { decibel_level: 112, zone_type: "Industrial", status: "VIOLATION" },
        escalation_timer: 180,
        demo_mode: true,
      },
    ];

    const randomAnomaly = demoAnomalies[Math.floor(Math.random() * demoAnomalies.length)];
    
    // Simulate WebSocket message
    if (randomAnomaly.severity === "CRITICAL") {
      toast.error(`🚨 CRITICAL: ${randomAnomaly.message}`, {
        description: `Location: ${randomAnomaly.location.name}, ${randomAnomaly.location.region}`,
        duration: 10000,
        action: {
          label: "View Map",
          onClick: () => navigate("/dashboard/heatmap"),
        },
      });
    } else {
      toast.warning(`⚠️ HIGH: ${randomAnomaly.message}`, {
        description: `Location: ${randomAnomaly.location.name}, ${randomAnomaly.location.region}`,
        duration: 8000,
      });
    }

    const newNotification: Notification = {
      id: Date.now(),
      title: `${randomAnomaly.severity} ALERT`,
      message: randomAnomaly.message,
      is_read: false,
      notif_type: "demo_anomaly",
      created_at: new Date().toISOString(),
      severity: randomAnomaly.severity.toLowerCase() as "critical" | "high" | "medium" | "low",
    };

    setNotifications((current) => [newNotification, ...current]);
    console.log("🎯 Demo anomaly triggered:", randomAnomaly);
  };

  // Keyboard shortcut for demo (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        triggerDemoAnomaly();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-60" : "w-16"} transition-all duration-300 flex-shrink-0 bg-blue-900 flex flex-col h-full`}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-blue-800">
          <Landmark className="w-5 h-5 text-blue-300 flex-shrink-0" />
          {sidebarOpen && <span className="ml-2.5 font-bold text-white font-heading text-base">PrithviNet</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto px-2">
          {visibleNavItems.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/dashboard"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-blue-200 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        {sidebarOpen && user && (
          <div className="p-4 border-t border-blue-800">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{user.name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleBadgeColor[user.role] || "bg-gray-100 text-gray-700"}`}>
                  {user.role.replace(/_/g, " ")}
                </span>
              </div>
            </div>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2 text-blue-300 hover:text-white text-xs py-1.5 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-700 transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="text-xs text-gray-400">Official Environment Monitoring Portal | Government of Bharat</span>
          <div className="ml-auto flex items-center gap-3">
            {!sidebarOpen && user && (
              <span className="text-sm font-medium text-gray-700">{user.name}</span>
            )}
            <button onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
                  </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
