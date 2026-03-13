import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Landmark, ChevronDown, Crown, Building2, Users, Factory, Eye } from "lucide-react";

const roles = [
  { icon: Crown, label: "Super Admin", desc: "State HQ oversight", slug: "admin" },
  { icon: Building2, label: "Regional Officer", desc: "District-level enforcement", slug: "regional_officer" },
  { icon: Users, label: "Monitoring Team", desc: "Field data collection", slug: "monitoring_team" },
  { icon: Factory, label: "Industry User", desc: "Self-reporting portal", slug: "industry_user" },
  { icon: Eye, label: "Citizen Portal", desc: "Public transparency", slug: "citizen" },
];

const navLinks = [
  { label: "Features", href: "#features" },
];

const Navbar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Top official banner */}
      <div className="gov-header">
        <div className="container flex justify-between items-center">
          <span>Official Environment Monitoring Portal | Government of Bharat</span>
          <div className="flex space-x-4">
            <a href="#" className="hover:underline">Language</a>
            <a href="#" className="hover:underline">Accessibility</a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 font-heading text-xl font-bold text-blue-900">
            <Landmark className="h-6 w-6 text-blue-700" />
            PrithviNet
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors"
              >
                {l.label}
              </a>
            ))}

            {/* Roles Dropdown */}
            <div className="relative" ref={dropRef}>
              <button
                onClick={() => setDropOpen(!dropOpen)}
                className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors"
              >
                Roles
                <ChevronDown className={`h-4 w-4 transition-transform ${dropOpen ? "rotate-180" : ""}`} />
              </button>

              {dropOpen && (
                <div className="absolute right-0 mt-3 w-64 rounded-xl bg-white border border-slate-200 shadow-xl p-2 z-50">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-3 py-2">
                    Platform Roles
                  </p>
                  {roles.map((role) => (
                    <button
                      key={role.label}
                      onClick={() => { setDropOpen(false); navigate(`/register?role=${role.slug}`); }}
                      className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                        <role.icon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{role.label}</p>
                        <p className="text-xs text-slate-500">{role.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link to="/login" className="rounded-md bg-blue-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 transition-all">
              Login to Dashboard
            </Link>
            <Link to="/public" className="text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors">
              Citizen Portal
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button className="md:hidden text-gray-800" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white px-6 py-4 space-y-3 shadow-lg">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="block text-sm font-medium text-gray-700 hover:text-blue-700"
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <div className="border-t border-slate-100 pt-2">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Roles</p>
              {roles.map((role) => (
                <a
                  key={role.label}
                  href="#"
                  className="flex items-center gap-2 py-1.5 text-sm text-gray-700 hover:text-blue-700"
                  onClick={() => setMenuOpen(false)}
                >
                  <role.icon className="h-4 w-4" />
                  {role.label}
                </a>
              ))}
            </div>
            <Link to="/login" className="block w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white text-center">
              Login to Dashboard
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
};

export default Navbar;
