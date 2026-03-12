import { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Factory, MapPin, Wind, Bell, FileBarChart2, Cpu,
  Globe, LogOut, Landmark, Menu, X, User, Map
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const visibleNavItems = useMemo(() => {
    if (!user) return [];
    return navItems.filter((item) => item.roles.includes(user.role));
  }, [user]);

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
