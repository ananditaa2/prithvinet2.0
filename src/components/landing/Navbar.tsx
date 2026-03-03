import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#use-case" },
  { label: "Roles", href: "#roles" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container flex items-center justify-between h-16">
        <a href="/" className="font-heading text-xl font-bold text-gradient-primary">
          PrithviNet
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:shadow-[var(--glow-primary)] transition-all">
            Launch App
          </button>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl px-6 py-4 space-y-3">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <button className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Launch App
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
