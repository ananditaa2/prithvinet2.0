import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Droplets,
  Volume2,
  Brain,
  ArrowLeft,
  Bell,
  RefreshCw,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AirQualityTab from "@/components/dashboard/AirQualityTab";
import WaterQualityTab from "@/components/dashboard/WaterQualityTab";
import NoiseTab from "@/components/dashboard/NoiseTab";
import CopilotSection from "@/components/landing/CopilotSection";
import EnvironmentalMap from "@/components/dashboard/EnvironmentalMap";
import { useWebSocket } from "@/context/WebSocketContext";

export default function Dashboard() {
  const [showAlert, setShowAlert] = useState(false);
  const { isConnected, lastEvent } = useWebSocket();

  // Show banner when an anomaly event arrives
  if (lastEvent?.type === 'ANOMALY_ALERT' && !showAlert) {
      setShowAlert(true);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top Nav Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="container flex items-center justify-between px-4 md:px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium hidden sm:inline">Home</span>
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  PrithviNet Dashboard
                </h1>
                <p className="text-xs text-slate-400">
                  Chhattisgarh Environmental Intelligence
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              <RefreshCw className="h-3 w-3" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <div className="relative">
              <Bell className="h-5 w-5 text-slate-500" />
              {lastEvent && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  !
                </span>
              )}
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
              SA
            </div>
          </div>
        </div>
      </header>

      {/* Dynamic WebSocket Alert Banner */}
      {showAlert && lastEvent?.type === 'ANOMALY_ALERT' && (
        <div className="bg-red-50 border-b border-red-200 animate-in slide-in-from-top-4 duration-500">
          <div className="container flex items-center justify-between px-4 md:px-6 py-2.5">
            <p className="text-sm text-red-800 font-medium">
              🚨 {lastEvent.message}
              <span className="text-red-500 text-xs ml-2 flex items-center gap-1 inline-flex">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                LIVE
              </span>
            </p>
            <button
              onClick={() => setShowAlert(false)}
              className="text-red-400 hover:text-red-600 text-lg font-bold ml-4 shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <main className="container px-4 md:px-6 py-6 space-y-6">
        <EnvironmentalMap />

        <Tabs defaultValue="air" className="w-full">
          <TabsList className="bg-white border border-slate-200 shadow-sm p-1 mb-6 w-full sm:w-auto">
            <TabsTrigger
              value="air"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-semibold gap-1.5"
            >
              <Activity className="h-4 w-4" />
              Air Quality
            </TabsTrigger>
            <TabsTrigger
              value="water"
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-semibold gap-1.5"
            >
              <Droplets className="h-4 w-4" />
              Water Quality
            </TabsTrigger>
            <TabsTrigger
              value="noise"
              className="data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-semibold gap-1.5"
            >
              <Volume2 className="h-4 w-4" />
              Noise
            </TabsTrigger>
            <TabsTrigger
              value="copilot"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-semibold gap-1.5"
            >
              <Brain className="h-4 w-4" />
              AI Copilot
            </TabsTrigger>
          </TabsList>

          <TabsContent value="air" className="focus-visible:outline-none">
            <AirQualityTab />
          </TabsContent>

          <TabsContent value="water" className="focus-visible:outline-none">
            <WaterQualityTab />
          </TabsContent>

          <TabsContent value="noise" className="focus-visible:outline-none">
            <NoiseTab />
          </TabsContent>

          <TabsContent value="copilot" className="focus-visible:outline-none">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="mb-5 pb-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-lg">
                  AI Compliance Copilot
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Simulate what-if scenarios — ask how reducing a specific
                  pollutant changes regional risk scores. Powered by Groq
                  Llama-3.
                </p>
              </div>
              <CopilotSection isWidget={true} />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="container px-4 md:px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            PrithviNet — Data sourced from CPCB, CECB, and CGSPCB monitoring networks
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
             <span className="relative flex h-2 w-2">
               <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`}></span>
               <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
             </span>
             {isConnected ? 'System Live' : 'System Offline (Live Stream Disconnected)'}
          </div>
        </div>
      </footer>
    </div>
  );
}
