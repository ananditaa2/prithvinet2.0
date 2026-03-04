import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Disable default icon issue with leaflet+vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Mock Industry Pollution Data with coordinates across India
const POLLUTION_ZONES = [
    { lat: 28.7041, lng: 77.1025, name: "Delhi Industrial Zone", aqi: 285, type: "Severe", color: "#dc2626" },
    { lat: 19.076, lng: 72.8777, name: "Mumbai Port Area", aqi: 155, type: "Unhealthy", color: "#ea580c" },
    { lat: 22.5726, lng: 88.3639, name: "Kolkata Coal Plant", aqi: 198, type: "Very Unhealthy", color: "#dc2626" },
    { lat: 13.0827, lng: 80.2707, name: "Chennai Petrochemical", aqi: 112, type: "Moderate", color: "#d97706" },
    { lat: 17.385, lng: 78.4867, name: "Hyderabad Steel Zone", aqi: 0.5, type: "Anomaly: 0 Emissions", color: "#7c3aed" },
    { lat: 23.0225, lng: 72.5714, name: "Ahmedabad Chemical", aqi: 130, type: "Unhealthy for Sensitive", color: "#f59e0b" },
    { lat: 12.9716, lng: 77.5946, name: "Bengaluru IT Hub", aqi: 68, type: "Moderate", color: "#16a34a" },
    { lat: 26.8467, lng: 80.9462, name: "Lucknow Cement Plant", aqi: 175, type: "Unhealthy", color: "#ea580c" },
    { lat: 23.2599, lng: 77.4126, name: "Bhopal Tyre Factory", aqi: 95, type: "Moderate", color: "#d97706" },
    { lat: 21.1458, lng: 79.0882, name: "Nagpur Paper Mill", aqi: 145, type: "Unhealthy for Sensitive", color: "#f59e0b" },
];

const getRadius = (aqi: number) => {
    if (aqi < 1) return 30; // anomaly: flag with special small circle
    if (aqi > 250) return 55;
    if (aqi > 150) return 40;
    if (aqi > 100) return 28;
    return 18;
};

export default function PollutionMap({ compact = false }: { compact?: boolean }) {
    const mapRef = useRef<L.Map | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            center: [22.5, 79.5], // center of India
            zoom: compact ? 4 : 5,
            zoomControl: !compact,
            scrollWheelZoom: !compact,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        POLLUTION_ZONES.forEach((zone) => {
            const circle = L.circleMarker([zone.lat, zone.lng], {
                radius: getRadius(zone.aqi),
                fillColor: zone.color,
                color: zone.color,
                weight: zone.aqi < 1 ? 3 : 1,
                opacity: zone.aqi < 1 ? 1 : 0.7,
                fillOpacity: 0.45,
                dashArray: zone.aqi < 1 ? "6 6" : undefined,
            }).addTo(map);

            circle.bindPopup(
                `<div style="font-family:system-ui;min-width:160px">
          <p style="font-weight:700;color:#1e293b;margin-bottom:4px">${zone.name}</p>
          <p style="color:${zone.color};font-weight:600;font-size:1.1em">
            ${zone.aqi < 1 ? "⚠️ ANOMALY DETECTED" : `AQI: ${zone.aqi}`}
          </p>
          <p style="color:#64748b;font-size:0.85em">${zone.type}</p>
        </div>`,
                { className: "custom-popup" }
            );
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, [compact]);

    return (
        <div className={compact ? "h-full" : "py-10"}>
            {!compact && (
                <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
                    <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-red-600 opacity-60"></span>Severe (&gt;250)</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-orange-500 opacity-60"></span>Unhealthy (150–250)</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-amber-400 opacity-60"></span>Moderate (100–150)</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-green-600 opacity-60"></span>Good (&lt;100)</span>
                    <span className="flex items-center gap-1.5 border border-purple-400 rounded px-1.5 py-0.5 text-purple-700">⚠️ Anomaly</span>
                </div>
            )}
            <div
                ref={containerRef}
                className="w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm"
                style={{ height: compact ? "100%" : "420px" }}
            />
        </div>
    );
}
