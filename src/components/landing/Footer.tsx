import { Landmark, Activity, Droplets, Volume2 } from "lucide-react";

const links = [
  { label: "Features", href: "#features" },
  { label: "AI Innovation", href: "#innovation" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Roles", href: "#roles" },
  { label: "Contact", href: "#contact" },
];

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400" id="footer">
      {/* Main footer */}
      <div className="container px-4 md:px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-blue-700">
                <Landmark className="h-5 w-5 text-white" />
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight">PrithviNet</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400 max-w-xs">
              National Environmental Intelligence & Compliance Management System. Authorized by Ministry of Environment, Forest and Climate Change.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              {links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="hover:text-white transition-colors">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Monitoring */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Monitoring</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { icon: Activity, label: "Air Quality (AQI)" },
                { icon: Droplets, label: "Water Quality" },
                { icon: Volume2, label: "Noise Levels" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-blue-400" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Policy */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Regulatory</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                "Environment Protection Act, 1986",
                "Water (Prevention) Act, 1974",
                "Air (Prevention) Act, 1981",
                "Noise Pollution Rules, 2000",
              ].map((item) => (
                <li key={item} className="text-xs leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="container px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <p>© 2026 PrithviNet. Ministry of Environment, Forest and Climate Change, Government of India.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Use</a>
            <a href="#" className="hover:text-white transition-colors">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
