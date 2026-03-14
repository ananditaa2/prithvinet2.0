import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAICopilot, type AlertContext } from "@/context/AICopilotContext";
import {
  AlertTriangle,
  MapPin,
  Clock,
  Zap,
  Wind,
  Droplets,
  Volume2,
} from "lucide-react";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CRITICAL_ALERTS: AlertContext[] = [
  {
    id: "ALT-001",
    title: "PM10 Limit Exceeded",
    location: "Siltara Industrial Area",
    severity: "critical",
    pollutant: "PM10",
    value: "285 µg/m³",
    message: "PM10 levels have exceeded the prescribed limit of 100 µg/m³ by 185%. Immediate action required.",
  },
  {
    id: "ALT-002",
    title: "Water pH Critical",
    location: "Korba River Monitoring Point",
    severity: "critical",
    pollutant: "pH",
    value: "4.2",
    message: "Water pH has dropped to critically acidic levels. Normal range is 6.5-8.5. Aquatic life at risk.",
  },
  {
    id: "ALT-003",
    title: "Noise Violation Detected",
    location: "Jindal Industrial Park, Raigarh",
    severity: "critical",
    pollutant: "Decibel",
    value: "112 dB",
    message: "Industrial noise levels exceeding daytime limit of 75 dB by 37 dB. Compliance notice issued.",
  },
];

const SEVERITY_CONFIG = {
  critical: {
    badge: "bg-red-100 text-red-700 border-red-200",
    icon: "text-red-500",
    border: "border-red-200",
    bg: "bg-red-50/50",
  },
  high: {
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    icon: "text-orange-500",
    border: "border-orange-200",
    bg: "bg-orange-50/50",
  },
  medium: {
    badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: "text-yellow-500",
    border: "border-yellow-200",
    bg: "bg-yellow-50/50",
  },
  low: {
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    icon: "text-blue-500",
    border: "border-blue-200",
    bg: "bg-blue-50/50",
  },
};

const POLLUTANT_ICONS: Record<string, React.ElementType> = {
  PM10: Wind,
  pH: Droplets,
  Decibel: Volume2,
};

function AlertCard({ alert, onAskAI }: { alert: AlertContext; onAskAI: (alert: AlertContext) => void }) {
  const config = SEVERITY_CONFIG[alert.severity];
  const PollutantIcon = POLLUTANT_ICONS[alert.pollutant || ""] || AlertTriangle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`relative overflow-hidden rounded-xl border ${config.border} ${config.bg} p-4 mb-4`}
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${
          alert.severity === "critical" ? "bg-red-500" : "bg-orange-500"
        }`}
      />

      <div className="pl-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <PollutantIcon className={`w-4 h-4 ${config.icon}`} />
            <span className="text-xs font-medium text-gray-500">{alert.id}</span>
          </div>
          <Badge variant="outline" className={`text-xs font-semibold ${config.badge}`}>
            {alert.severity.toUpperCase()}
          </Badge>
        </div>

        <h3 className="font-bold text-gray-900 mb-1">{alert.title}</h3>

        <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
          <MapPin className="w-3.5 h-3.5" />
          <span>{alert.location}</span>
        </div>

        {alert.value && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl font-bold text-gray-900">{alert.value}</span>
            {alert.pollutant && (
              <span className="text-xs text-gray-500 bg-white/80 px-2 py-0.5 rounded">
                {alert.pollutant}
              </span>
            )}
          </div>
        )}

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{alert.message}</p>

        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Clock className="w-3 h-3" />
          <span>Detected {new Date().toLocaleString("en-IN")}</span>
        </div>

        <Button
          onClick={() => onAskAI(alert)}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40"
        >
          <Zap className="w-4 h-4 mr-2" />
          Ask AI for Solution
        </Button>
      </div>
    </motion.div>
  );
}

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const { openCopilot } = useAICopilot();

  const handleAskAI = (alert: AlertContext) => {
    openCopilot(alert);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md p-0 bg-white" side="right">
        <SheetHeader className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <SheetTitle className="text-lg font-bold text-gray-900">Critical Alerts</SheetTitle>
              <SheetDescription className="text-sm text-gray-500">
                {CRITICAL_ALERTS.length} active violations require immediate attention
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] px-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-4 mb-6 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-medium text-gray-700">{CRITICAL_ALERTS.length} Critical</span>
                </div>
                <div className="h-4 w-px bg-gray-300" />
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Air: 1</span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Water: 1</span>
                </div>
              </div>

              <div className="space-y-2">
                {CRITICAL_ALERTS.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    <AlertCard alert={alert} onAskAI={handleAskAI} />
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-700 leading-relaxed">
                  <strong>Pro Tip:</strong> Click "Ask AI for Solution" on any alert to get instant 
                  CECB compliance guidance and recommended Standard Operating Procedures.
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default NotificationDrawer;
