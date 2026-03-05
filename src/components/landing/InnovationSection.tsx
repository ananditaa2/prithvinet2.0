import { motion } from "framer-motion";
import { TrendingUp, BarChart3, Brain } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CopilotSection from "./CopilotSection";

const capabilities = [
  {
    icon: TrendingUp,
    title: "Multi-Step Forecasting",
    desc: "Generate 24–72 hour forecasts of key environmental parameters for each station or region using advanced time-series models.",
    color: "text-blue-700",
    bg: "bg-blue-50",
  },
  {
    icon: BarChart3,
    title: "Uncertainty Prediction",
    desc: "Output point forecasts and prediction intervals with probabilistic estimates — know the confidence behind every number.",
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
  {
    icon: Brain,
    title: "Causal Inference Engine",
    desc: "Attribute pollution spikes to specific industries using causal models trained on historical emission and weather co-variates.",
    color: "text-violet-700",
    bg: "bg-violet-50",
  },
];

const InnovationSection = () => {
  return (
    <section className="py-24 bg-slate-50" id="innovation">
      <div className="container px-4 md:px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-4 py-1 text-sm font-semibold text-violet-700 mb-4">
            AI Innovation
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Advanced AI Capabilities
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto text-lg">
            Beyond standard monitoring — predictive intelligence that enables proactive environmental governance.
          </p>
        </motion.div>

        {/* Tabbed interface */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden max-w-5xl mx-auto">
          <Tabs defaultValue="capabilities" className="w-full">
            {/* Tab header */}
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <TabsList className="bg-slate-100 p-1">
                <TabsTrigger
                  value="capabilities"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold"
                >
                  🔬  AI Capabilities
                </TabsTrigger>
                <TabsTrigger
                  value="copilot"
                  className="data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:shadow-sm font-semibold"
                >
                  🤖  AI Compliance Copilot
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Capabilities tab */}
            <TabsContent value="capabilities" className="p-8 focus-visible:outline-none focus-visible:ring-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {capabilities.map((cap, i) => (
                  <motion.div
                    key={cap.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12 }}
                    className="border border-slate-100 rounded-xl p-7 text-center hover:shadow-sm transition-shadow bg-slate-50"
                  >
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${cap.bg} mx-auto mb-5`}>
                      <cap.icon className={`h-7 w-7 ${cap.color}`} />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 mb-3">{cap.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{cap.desc}</p>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* AI Copilot tab */}
            <TabsContent value="copilot" className="focus-visible:outline-none focus-visible:ring-0">
              <div className="p-6">
                <div className="mb-5 pb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-lg">AI Compliance Copilot</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Simulate what-if scenarios — ask how reducing a specific pollutant changes regional risk scores. Powered by Groq Llama-3.
                  </p>
                </div>
                <CopilotSection isWidget={true} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default InnovationSection;
