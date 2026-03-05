import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 bg-blue-700" id="contact">
      <div className="container px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500 bg-blue-600 px-4 py-1.5 mb-8">
            <ShieldCheck className="h-4 w-4 text-blue-200" />
            <span className="text-sm font-semibold text-blue-100">Government Authorized Platform</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">
            Ready to Modernize Environmental Compliance?
          </h2>
          <p className="text-blue-200 max-w-xl mx-auto mb-10 text-lg leading-relaxed">
            Join pollution control boards across India that are transforming their monitoring infrastructure with PrithviNet's AI-powered platform.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button className="inline-flex items-center gap-2 rounded-md bg-white px-8 py-3.5 font-bold text-blue-700 shadow-lg hover:bg-blue-50 transition-all">
              🚀 Access Dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
            <button className="inline-flex items-center gap-2 rounded-md border border-blue-400 bg-blue-600 px-8 py-3.5 font-semibold text-white hover:bg-blue-500 transition-all">
              View Public Reports
            </button>
          </div>

          <p className="mt-8 text-xs text-blue-300">
            Ministry of Environment, Forest and Climate Change · Government of India
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
