import { motion } from "framer-motion";
import { ArrowRight, Activity, Droplets, Volume2, ShieldCheck } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CopilotSection from "./CopilotSection";

const stats = [
  { label: "Monitoring Stations", value: "2,400+", icon: Activity },
  { label: "Water Sources Tracked", value: "850+", icon: Droplets },
  { label: "Noise Zones Mapped", value: "1,200+", icon: Volume2 },
];

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-slate-50 pt-20">
      {/* Background styling for light theme */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-slate-100 opacity-90" />
        {/* Subtle grid pattern for a technical/official look */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="container relative z-10 py-12 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left Column: Official Introduction */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-1.5 mb-8 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-slate-700">Official Environmental Compliance</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6 text-slate-900">
              National Center for
              <br />
              <span className="text-blue-700">Environmental Intelligence</span>
            </h1>

            <p className="text-lg text-slate-600 mb-10 leading-relaxed font-medium">
              PrithviNet provides comprehensive, real-time tracking of air, water, and noise pollution. Enforce compliance, analyze trends, and simulate policy impact with our advanced AI suite.
            </p>

            <div className="flex flex-wrap gap-4">
              <button className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-6 py-3 font-semibold text-white shadow-md hover:bg-blue-800 transition-all">
                Access Dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
              <button className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-300 px-6 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all">
                View Public Reports
              </button>
            </div>
          </motion.div>

          {/* Right Column: Information/Copilot Tabs */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full max-w-xl mx-auto lg:mr-0"
          >
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-800 text-lg">Interactive Tools</h3>
              </div>

              <Tabs defaultValue="copilot" className="w-full">
                <div className="px-6 pt-4">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-md">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded font-medium">System Overview</TabsTrigger>
                    <TabsTrigger value="copilot" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded font-medium">AI Copilot</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="overview" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600 mb-4">
                      Current active sensory network status across all designated monitoring zones.
                    </p>
                    <div className="grid gap-3">
                      {stats.map((stat) => (
                        <div key={stat.label} className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                            <stat.icon className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="copilot" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                  <div className="h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {/* We inject the Copilot Section here, but we will need to modify the CopilotSection component 
                             slightly so it fits nicely inside this smaller container. */}
                    <CopilotSection isWidget={true} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
