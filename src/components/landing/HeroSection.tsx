import { motion } from "framer-motion";
import { ShieldCheck, CheckCircle } from "lucide-react";

const highlights = [
  "Real-time AI compliance monitoring",
  "Automated breach detection & alerts",
  "What-if scenario simulation",
];

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-slate-50 pt-20">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-slate-100 opacity-90" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="container relative z-10 px-4 md:px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center">

          {/* Left: Headline */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-1.5 mb-8 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-slate-700">Official Environmental Compliance</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6 text-slate-900">
              National Center for<br />
              <span className="text-blue-700">Environmental Intelligence</span>
            </h1>

            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              PrithviNet provides comprehensive, real-time tracking of air, water, and noise pollution. Enforce compliance, analyze trends, and simulate policy impact with our advanced AI suite.
            </p>

            <ul className="space-y-2.5 mb-10">
              {highlights.map((h) => (
                <li key={h} className="flex items-center gap-2.5 text-slate-700">
                  <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span className="text-sm font-medium">{h}</span>
                </li>
              ))}
            </ul>


          </motion.div>

          {/* Right: Official Government Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">

              {/* Tricolour stripe */}
              <div className="flex h-2">
                <div className="flex-1 bg-orange-500" />
                <div className="flex-1 bg-white border-y border-slate-200" />
                <div className="flex-1 bg-green-600" />
              </div>

              {/* Ministry Header */}
              <div className="bg-[#002B7F] px-6 py-5 flex items-center gap-4">
                <div className="shrink-0 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-inner border-2 border-yellow-400">
                  <span className="text-2xl select-none">🦁</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.25em] text-blue-200 uppercase mb-0.5">Government of India</p>
                  <p className="text-white font-extrabold text-base leading-tight">Ministry of Environment,</p>
                  <p className="text-white font-extrabold text-base leading-tight">Forest &amp; Climate Change</p>
                </div>
              </div>

              {/* Body */}
              <div className="bg-white px-6 py-5 space-y-4">

                {/* Official Notice Header */}
                <div className="border-b border-dashed border-slate-300 pb-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Official Notification No. MoEFCC/2025/ENV-AI/001</p>
                  <h3 className="text-slate-900 font-bold text-base leading-snug">
                    PrithviNet — Integrated Environmental Compliance Platform
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Issued under the Environment (Protection) Act, 1986 · EPA § 5 &amp; § 15</p>
                </div>

                {/* Authorization Items */}
                <div className="space-y-3">
                  {[
                    { code: "CPCB/2025", label: "Authorized by Central Pollution Control Board" },
                    { code: "SPCB-CG/08", label: "State PCB Chhattisgarh — Class A Operator License" },
                    { code: "NDAP/CERT", label: "National Digital Portal Certified — ISO 27001" },
                  ].map((item) => (
                    <div key={item.code} className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 rounded bg-blue-700 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">{item.code}</span>
                      <span className="text-xs text-slate-600">{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* Platform Active Status */}
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-700">Platform Active — Real-Time Monitoring</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold">ON</span>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">© 2025 MoEFCC, Govt. of India. All rights reserved.</span>
                <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">सत्यमेव जयते</span>
              </div>

            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
