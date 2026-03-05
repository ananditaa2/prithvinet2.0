import { motion } from "framer-motion";
import { Crown, Building2, Users, Factory, Eye } from "lucide-react";

const roles = [
  {
    icon: Crown,
    title: "Super Admin",
    desc: "State HQ oversight with full platform control and cross-regional analytics.",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    icon: Building2,
    title: "Regional Officer",
    desc: "District-level monitoring, compliance enforcement, and inspection management.",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    icon: Users,
    title: "Monitoring Team",
    desc: "Field data collection, station calibration, and special campaign execution.",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-100",
  },
  {
    icon: Factory,
    title: "Industry User",
    desc: "Self-reporting portal for emissions data, compliance status, and alerts.",
    color: "text-slate-700",
    bg: "bg-slate-100",
    border: "border-slate-200",
  },
  {
    icon: Eye,
    title: "Citizen Portal",
    desc: "Public transparency dashboard with air quality, water safety, and noise data.",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-100",
  },
];

const RolesSection = () => {
  return (
    <section className="py-24 bg-slate-50" id="roles">
      <div className="container px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-sm font-semibold text-amber-700 mb-4">
            Access Control
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Role-Based Ecosystem
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto text-lg">
            Secure, granular access for every stakeholder — from state administrators to citizens.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 max-w-6xl mx-auto">
          {roles.map((role, i) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`bg-white border ${role.border} rounded-xl p-6 text-center shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${role.bg} mx-auto mb-4`}>
                <role.icon className={`h-6 w-6 ${role.color}`} />
              </div>
              <h3 className="font-bold text-slate-800 mb-2">{role.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{role.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RolesSection;
