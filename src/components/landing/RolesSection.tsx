import { motion } from "framer-motion";
import { Crown, Building2, Users, Factory, Eye } from "lucide-react";

const roles = [
  { icon: Crown, title: "Super Admin", desc: "State HQ oversight with full platform control and cross-regional analytics.", color: "text-accent" },
  { icon: Building2, title: "Regional Officer", desc: "District-level monitoring, compliance enforcement, and inspection management.", color: "text-primary" },
  { icon: Users, title: "Monitoring Team", desc: "Field data collection, station calibration, and special campaign execution.", color: "text-primary" },
  { icon: Factory, title: "Industry User", desc: "Self-reporting portal for emissions data, compliance status, and alerts.", color: "text-primary" },
  { icon: Eye, title: "Citizen Portal", desc: "Public transparency dashboard with air quality, water safety, and noise data.", color: "text-accent" },
];

const RolesSection = () => {
  return (
    <section className="py-24" id="roles">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-accent tracking-widest uppercase">Access Control</span>
          <h2 className="text-3xl md:text-5xl font-bold mt-3 mb-4">
            Role-Based
            <span className="text-gradient-accent"> Ecosystem</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Secure, granular access for every stakeholder — from state administrators to citizens.
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
          {roles.map((role, i) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card glow-border p-6 w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.33%-0.75rem)]"
            >
              <role.icon className={`h-6 w-6 ${role.color} mb-3`} />
              <h3 className="font-heading font-semibold text-foreground mb-1">{role.title}</h3>
              <p className="text-sm text-muted-foreground">{role.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RolesSection;
