import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/sonner";
import {
  LayoutDashboard, Factory, MapPin, Wind, Bell, FileBarChart2, Cpu,
  Globe, LogOut, Landmark, Menu, X, User, Map, CalendarClock, CheckCheck
} from "lucide-react";

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
    icon: Bell,
    label: "Alerts",
    to: "/dashboard/alerts",
    roles: ["admin", "regional_officer", "monitoring_team", "industry_user"],
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  const visibleNavItems = useMemo(() => {
    if (!user) return [];
    return navItems.filter((item) => item.roles.includes(user.role));
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    api.alerts.notifications()
      .then((items) => {
        if (isMounted) {
          setNotifications(items);
        }
      })
      .catch((error) => {
        console.error("Failed to load notifications:", error);
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

    const socket = new WebSocket(`${wsProtocol}://${wsHost}/ws/notifications?token=${encodeURIComponent(token)}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type !== "notification" || !payload.notification) return;

        setNotifications((current) => {
          const existing = current.some((item) => item.id === payload.notification.id);
          return existing ? current : [payload.notification, ...current];
        });

        toast(payload.notification.title || "New notification", {
          description: payload.notification.message || "A new portal notification has arrived.",
        });
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
            <div className="relative group">
              <button
                className="relative inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notifications</span>
                {unreadCount > 0 && (
                  <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              <div className="absolute right-0 mt-2 hidden w-96 rounded-xl border border-gray-200 bg-white shadow-xl group-hover:block z-50">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Portal Notifications</p>
                    <p className="text-xs text-gray-500">Meeting scheduling and compliance alerts</p>
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`border-b border-gray-100 px-4 py-3 last:border-b-0 ${
                          notification.is_read ? "bg-white" : "bg-red-50/40"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                            <CalendarClock className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                              {!notification.is_read && (
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                              )}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-gray-600">
                              {notification.message}
                            </p>
                            <p className="mt-2 text-[11px] uppercase tracking-wide text-gray-400">
                              {notification.notif_type} · {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

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
