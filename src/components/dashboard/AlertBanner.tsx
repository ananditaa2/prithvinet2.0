import { useEffect, useState } from "react";
import { AlertTriangle, Wind, Droplets, Volume2, Clock, X, MapPin, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AlertBannerProps {
  anomaly: {
    id: string;
    type: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    message: string;
    timestamp: string;
    location: {
      name: string;
      region: string;
    };
    data: {
      aqi?: number;
      pm25?: number;
      pm10?: number;
      ph?: number;
      decibel_level?: number;
      status?: string;
    };
    escalation_timer?: number;
    demo_mode?: boolean;
  } | null;
  onDismiss?: () => void;
}

export function AlertBanner({ anomaly, onDismiss }: AlertBannerProps) {
  const [progress, setProgress] = useState(100);
  const [isPulsing, setIsPulsing] = useState(true);

  useEffect(() => {
    if (!anomaly?.escalation_timer) return;

    const totalTime = anomaly.escalation_timer * 1000; // Convert to ms
    const interval = 100; // Update every 100ms
    const decrement = (interval / totalTime) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - decrement;
        return next > 0 ? next : 0;
      });
    }, interval);

    // Pulse animation
    const pulseInterval = setInterval(() => {
      setIsPulsing((p) => !p);
    }, 500);

    return () => {
      clearInterval(timer);
      clearInterval(pulseInterval);
    };
  }, [anomaly?.escalation_timer]);

  if (!anomaly) return null;

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return {
          bg: "bg-red-600",
          border: "border-red-700",
          text: "text-white",
          accent: "bg-red-500",
          pulse: "animate-pulse",
        };
      case "HIGH":
        return {
          bg: "bg-orange-500",
          border: "border-orange-600",
          text: "text-white",
          accent: "bg-orange-400",
          pulse: "",
        };
      case "MEDIUM":
        return {
          bg: "bg-yellow-500",
          border: "border-yellow-600",
          text: "text-yellow-900",
          accent: "bg-yellow-400",
          pulse: "",
        };
      default:
        return {
          bg: "bg-blue-500",
          border: "border-blue-600",
          text: "text-white",
          accent: "bg-blue-400",
          pulse: "",
        };
    }
  };

  const styles = getSeverityStyles(anomaly.severity);

  const getDataTypeIcon = () => {
    if (anomaly.data.aqi !== undefined) return <Wind className="w-5 h-5" />;
    if (anomaly.data.ph !== undefined) return <Droplets className="w-5 h-5" />;
    if (anomaly.data.decibel_level !== undefined) return <Volume2 className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  const getTimeRemaining = () => {
    if (!anomaly.escalation_timer) return null;
    const remaining = Math.ceil((progress / 100) * anomaly.escalation_timer);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`${styles.bg} ${styles.border} ${styles.text} rounded-xl shadow-2xl overflow-hidden`}
    >
      {/* Progress bar */}
      {anomaly.escalation_timer && (
        <div className="h-1 bg-black/20">
          <div
            className={`h-full ${styles.accent} transition-all duration-100`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full ${styles.accent} flex items-center justify-center ${isPulsing && anomaly.severity === "CRITICAL" ? "animate-ping" : ""}`}
            >
              {getDataTypeIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">
                  {anomaly.severity === "CRITICAL" ? "🚨 CRITICAL ALERT" : "⚠️ ALERT"}
                </span>
                {anomaly.demo_mode && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-200 text-purple-800 rounded">
                    DEMO
                  </span>
                )}
              </div>
              <p className="text-sm opacity-90">{anomaly.message}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className={`${styles.text} hover:bg-white/20`}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Details */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-1 opacity-90">
            <MapPin className="w-4 h-4" />
            {anomaly.location.name}, {anomaly.location.region}
          </div>

          {/* Data values */}
          {anomaly.data.aqi !== undefined && (
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              <strong>AQI: {anomaly.data.aqi}</strong>
              <span className="opacity-75">({anomaly.data.status})</span>
            </div>
          )}
          {anomaly.data.pm25 !== undefined && (
            <span className="opacity-75">PM2.5: {anomaly.data.pm25.toFixed(1)}</span>
          )}
          {anomaly.data.pm10 !== undefined && (
            <span className="opacity-75">PM10: {anomaly.data.pm10.toFixed(1)}</span>
          )}
          {anomaly.data.ph !== undefined && (
            <div className="flex items-center gap-1">
              <strong>pH: {anomaly.data.ph.toFixed(1)}</strong>
              <span className="opacity-75">({anomaly.data.status})</span>
            </div>
          )}
          {anomaly.data.decibel_level !== undefined && (
            <div className="flex items-center gap-1">
              <strong>{anomaly.data.decibel_level.toFixed(0)} dB</strong>
              <span className="opacity-75">({anomaly.data.status})</span>
            </div>
          )}
        </div>

        {/* Escalation Timer */}
        {anomaly.escalation_timer && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {progress <= 0 ? "⏰ ESCALATION OVERDUE" : "Response window remaining:"}
                </span>
              </div>
              <span
                className={`font-mono font-bold text-lg ${progress < 20 ? "text-red-200" : ""}`}
              >
                {getTimeRemaining()}
              </span>
            </div>
            {progress <= 0 && (
              <p className="mt-1 text-xs bg-red-800/50 px-2 py-1 rounded">
                Auto-escalating to Regional Officer...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
