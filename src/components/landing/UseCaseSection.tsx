import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, MapPin, ClipboardCheck } from "lucide-react";

const steps = [
  { icon: TrendingUp, label: "Data Ingestion", desc: "Steel plant submits daily SO₂ emissions via portal or IoT sensors." },
  { icon: AlertTriangle, label: "Breach Detection", desc: "Platform detects SO₂ exceeds prescribed limits — auto-alert triggered." },
  { icon: MapPin, label: "Risk Mapping", desc: "Industry flagged on geo-spatial heatmap. Regional risk score updated." },
  { icon: ClipboardCheck, label: "Action & Inspection", desc: "Regional Officer notified. Inspection scheduled with priority escalation." },
];

const UseCaseSection = () => {
  return (
    <section className="py-24 bg-muted/30" id="use-case">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-primary tracking-widest uppercase">In Action</span>
          <h2 className="text-3xl md:text-5xl font-bold mt-3 mb-4">
            How PrithviNet <span className="text-gradient-primary">Works</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            From data ingestion to enforcement — an end-to-end compliance workflow.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative text-center"
            >
              <div className="glass-card glow-border p-6 h-full">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs font-bold text-primary/60 font-heading">STEP {i + 1}</span>
                <h3 className="font-heading font-semibold text-foreground mt-1 mb-2">{step.label}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-primary/30" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCaseSection;
