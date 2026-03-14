import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Wind, Droplets, Volume2, Clock, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnomalyEvent {
  id: string;
  type: "ANOMALY_ALERT" | "SYSTEM_UPDATE" | "DEMO_RESET";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  message: string;
  timestamp: string;
  location: {
    id: number;
    name: string;
    region: string;
    lat?: number;
    lng?: number;
  };
  data: {
    aqi?: number;
    pm25?: number;
    pm10?: number;
    ph?: number;
    bod?: number;
    decibel_level?: number;
    status?: string;
  };
  escalation_timer?: number;
  demo_mode?: boolean;
}

interface LiveAnomalyFeedProps {
  onStationAlert?: (locationId: number, severity: string) => void;
  onClearAlert?: (locationId: number) => void;
}

export function LiveAnomalyFeed({ onStationAlert, onClearAlert }: LiveAnomalyFeedProps) {
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const connectWebSocket = () => {
      const wsUrl = `ws://${window.location.hostname}:8000/ws/dashboard`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("🔌 WebSocket connected");
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different event types
          if (data.type === "ANOMALY_ALERT") {
            const anomaly: AnomalyEvent = {
              id: `${data.location?.id}-${Date.now()}`,
              ...data,
            };
            
            setAnomalies((prev) => [anomaly, ...prev].slice(0, 10)); // Keep last 10
            
            // Notify parent component about station alert
            if (data.location?.id && data.severity) {
              onStationAlert?.(data.location.id, data.severity);
            }
          } else if (data.type === "DEMO_RESET") {
            setAnomalies([]);
            setDismissed(new Set());
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        console.log("🔌 WebSocket disconnected");
        setConnected(false);
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [onStationAlert]);

  const dismissAnomaly = (id: string, locationId?: number) => {
    setDismissed((prev) => new Set(prev).add(id));
    if (locationId) {
      onClearAlert?.(locationId);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return "bg-red-500 border-red-600";
      case "HIGH": return "bg-orange-500 border-orange-600";
      case "MEDIUM": return "bg-yellow-500 border-yellow-600";
      default: return "bg-blue-500 border-blue-600";
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return "bg-red-50 border-red-200";
      case "HIGH": return "bg-orange-50 border-orange-200";
      case "MEDIUM": return "bg-yellow-50 border-yellow-200";
      default: return "bg-blue-50 border-blue-200";
    }
  };

  const getDataTypeIcon = (data: AnomalyEvent["data"]) => {
    if (data.aqi !== undefined) return <Wind className="w-4 h-4" />;
    if (data.ph !== undefined) return <Droplets className="w-4 h-4" />;
    if (data.decibel_level !== undefined) return <Volume2 className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const activeAnomalies = anomalies.filter(a => !dismissed.has(a.id));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full animate-pulse ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <h3 className="font-bold">Live Anomaly Feed</h3>
          <span className="text-xs text-slate-400">
            {connected ? 'Real-time' : 'Reconnecting...'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeAnomalies.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {activeAnomalies.length} Active
            </span>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setAnomalies([]);
              setDismissed(new Set());
            }}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Anomaly List */}
      <div className="max-h-[400px] overflow-y-auto">
        {activeAnomalies.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active anomalies</p>
            <p className="text-xs mt-1">Live feed is monitoring...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeAnomalies.map((anomaly) => (
              <div 
                key={anomaly.id}
                className={`p-4 ${getSeverityBg(anomaly.severity)} transition-all hover:shadow-md`}
              >
                {/* Top row: Severity & Time */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-bold text-white rounded ${getSeverityColor(anomaly.severity)}`}>
                      {anomaly.severity}
                    </span>
                    {anomaly.demo_mode && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                        DEMO
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {formatTime(anomaly.timestamp)}
                  </div>
                </div>

                {/* Message */}
                <p className="text-sm font-medium text-gray-900 mb-2">
                  {anomaly.message}
                </p>

                {/* Location */}
                <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                  <MapPin className="w-3 h-3" />
                  {anomaly.location.name}, {anomaly.location.region}
                </div>

                {/* Data values */}
                <div className="flex items-center gap-4 text-xs">
                  {anomaly.data.aqi !== undefined && (
                    <span className="flex items-center gap-1">
                      {getDataTypeIcon(anomaly.data)}
                      <strong>AQI: {anomaly.data.aqi}</strong>
                    </span>
                  )}
                  {anomaly.data.pm25 !== undefined && (
                    <span>PM2.5: {anomaly.data.pm25.toFixed(1)}</span>
                  )}
                  {anomaly.data.pm10 !== undefined && (
                    <span>PM10: {anomaly.data.pm10.toFixed(1)}</span>
                  )}
                  {anomaly.data.ph !== undefined && (
                    <span className="flex items-center gap-1">
                      {getDataTypeIcon(anomaly.data)}
                      <strong>pH: {anomaly.data.ph.toFixed(1)}</strong>
                    </span>
                  )}
                  {anomaly.data.decibel_level !== undefined && (
                    <span className="flex items-center gap-1">
                      {getDataTypeIcon(anomaly.data)}
                      <strong>{anomaly.data.decibel_level.toFixed(0)} dB</strong>
                    </span>
                  )}
                </div>

                {/* Escalation Timer */}
                {anomaly.escalation_timer && (
                  <div className="mt-3 pt-2 border-t border-gray-200/50">
                    <EscalationTimer 
                      seconds={anomaly.escalation_timer} 
                      severity={anomaly.severity}
                    />
                  </div>
                )}

                {/* Dismiss button */}
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissAnomaly(anomaly.id, anomaly.location.id)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      {activeAnomalies.length > 0 && (
        <div className="bg-gray-50 p-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
          <span>Total: {anomalies.length} anomalies</span>
          <span>Active: {activeAnomalies.length}</span>
        </div>
      )}
    </div>
  );
}

// Escalation Timer Component
function EscalationTimer({ seconds, severity }: { seconds: number; severity: string }) {
  const [remaining, setRemaining] = useState(seconds);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const secs_remain = secs % 60;
    return `${mins}:${secs_remain.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (isExpired) return "text-red-600 bg-red-100";
    if (remaining < 60) return "text-red-600 bg-red-50";
    if (remaining < 180) return "text-orange-600 bg-orange-50";
    return "text-green-600 bg-green-50";
  };

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${getTimerColor()}`}>
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4" />
        <span className="text-xs font-medium">
          {isExpired ? "⏰ ESCALATION OVERDUE" : "Response window:"}
        </span>
      </div>
      <span className={`font-mono font-bold ${isExpired ? 'text-red-700' : ''}`}>
        {formatTime(remaining)}
      </span>
    </div>
  );
}
