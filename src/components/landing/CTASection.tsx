import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-card glow-border p-12 md:p-16 text-center max-w-3xl mx-auto"
          style={{ background: "var(--hero-gradient)" }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform
            <br />
            <span className="text-gradient-primary">Environmental Compliance?</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Join pollution control boards modernizing their monitoring infrastructure with PrithviNet.
          </p>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 font-heading font-semibold text-primary-foreground transition-all hover:shadow-[var(--glow-primary)] hover:scale-[1.02]">
            🚀 Login to Dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
