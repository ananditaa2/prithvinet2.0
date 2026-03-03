import { motion } from "framer-motion";
import { ArrowRight, Activity, Droplets, Volume2 } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const stats = [
  { label: "Monitoring Stations", value: "2,400+", icon: Activity },
  { label: "Water Sources Tracked", value: "850+", icon: Droplets },
  { label: "Noise Zones Mapped", value: "1,200+", icon: Volume2 },
];

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        <div className="absolute inset-0" style={{ background: "var(--hero-gradient)" }} />
      </div>

      <div className="container relative z-10 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-8">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-sm font-medium text-primary">Real-time Environmental Intelligence</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
            <span className="text-gradient-primary">PrithviNet</span>
            <br />
            <span className="text-foreground">Smart Environmental</span>
            <br />
            <span className="text-foreground/80">Monitoring & Compliance</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10 leading-relaxed">
            A digital platform enabling real-time environmental monitoring, automated compliance tracking, predictive analytics, and intelligent alerts for Air, Water & Noise pollution.
          </p>

          <div className="flex flex-wrap gap-4 mb-16">
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-heading font-semibold text-primary-foreground transition-all hover:shadow-[var(--glow-primary)] hover:scale-[1.02]">
              Launch Dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-6 py-3 font-heading font-medium text-secondary-foreground transition-all hover:bg-secondary">
              View Demo
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card glow-border p-5 flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
