import { useState } from "react";
import { Menu, X, Landmark } from "lucide-react";

const links = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#use-case" },
  { label: "Roles", href: "#roles" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="gov-header">
        <div className="container flex justify-between items-center">
          <span>Official Environment Monitoring Portal | Government of Bharat</span>
          <div className="flex space-x-4">
            <a href="#" className="hover:underline">Language</a>
            <a href="#" className="hover:underline">Accessibility</a>
          </div>
        </div>
      </div>
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2 font-heading text-xl font-bold text-blue-900">
            <Landmark className="h-6 w-6 text-blue-700" />
            PrithviNet
          </a>

          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a key={l.label} href={l.href} className="text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors">
                {l.label}
              </a>
            ))}
            <button className="rounded-md bg-blue-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 transition-all">
              Login to Dashboard
            </button>
          </div>

          <button className="md:hidden text-gray-800" onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-gray-200 bg-white px-6 py-4 space-y-3 shadow-lg">
            {links.map((l) => (
              <a key={l.label} href={l.href} className="block text-sm font-medium text-gray-700 hover:text-blue-700" onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
            <button className="w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
              Login to Dashboard
            </button>
          </div>
        )}
      </nav>
    </div>
  );
};

export default Navbar;
