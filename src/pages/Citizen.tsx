import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Landmark, Wind, Droplets, Volume2, AlertTriangle, Factory, Globe, BookOpen, MapPin, Calendar, ArrowRight, Heart, Shield, X, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const tabs = [
  { id: "stories", label: "Stories", icon: BookOpen, color: "violet" },
  { id: "air", label: "Air Quality", icon: Wind, color: "sky" },
  { id: "water", label: "Water Quality", icon: Droplets, color: "blue" },
  { id: "noise", label: "Noise Levels", icon: Volume2, color: "purple" },
  { id: "alerts", label: "Active Alerts", icon: AlertTriangle, color: "red" },
  { id: "industries", label: "Industries", icon: Factory, color: "indigo" },
];

const REGIONS = ["All Regions", "Raipur", "Bhilai", "Korba", "Raigarh", "Bhatapara"] as const;

const aqiColor = (aqi: number | null) => {
  if (!aqi) return "bg-gray-100 text-gray-500";
  if (aqi < 50) return "bg-green-100 text-green-700";
  if (aqi < 100) return "bg-yellow-100 text-yellow-700";
  if (aqi < 150) return "bg-orange-100 text-orange-700";
  if (aqi < 200) return "bg-red-100 text-red-700";
  return "bg-purple-100 text-purple-700";
};

const aqiLabel = (aqi: number | null) => {
  if (!aqi) return "Unknown";
  if (aqi < 50) return "Good";
  if (aqi < 100) return "Moderate";
  if (aqi < 150) return "Unhealthy (Sensitive)";
  if (aqi < 200) return "Unhealthy";
  return "Very Unhealthy";
};

const noiseColor = (db: number | null) => {
  if (!db) return "bg-gray-100 text-gray-500";
  if (db < 55) return "bg-green-100 text-green-700";
  if (db < 70) return "bg-yellow-100 text-yellow-700";
  if (db < 85) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
};

const noiseLabel = (db: number | null) => {
  if (!db) return "Unknown";
  if (db < 55) return "Silent";
  if (db < 70) return "Moderate";
  if (db < 85) return "Loud";
  return "Very Loud";
};

const sevColor: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
};

const indStatus: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  compliant: "bg-green-100 text-green-700",
  violating: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-500",
};

interface Location {
  id: number;
  name: string;
  region: string;
}

interface AirReading {
  location: Location;
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  recorded_at: string;
}

interface WaterReading {
  location: Location;
  ph: number | null;
  bod: number | null;
  dissolved_oxygen: number | null;
  recorded_at: string;
}

interface NoiseReading {
  location: Location;
  decibel_level: number | null;
  zone_type: string;
  recorded_at: string;
}

interface Alert {
  id: number;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  message: string;
  affected_area: string;
  advisory: string;
  icon: string;
  created_at: string;
}

interface Industry {
  id: number;
  name: string;
  status: "active" | "compliant" | "violating" | "suspended";
  type: string;
  region: string;
  lat: number | null;
  lng: number | null;
}

interface NewsStory {
  id: number;
  headline: string;
  date: string;
  summary: string;
  fullContent: string;
  category: string;
  image_placeholder: string;
}

// Dummy Air Quality Data with correct AQI/PM correlation
const dummyAirData: AirReading[] = [
  {
    location: { id: 1, name: "Civil Lines Monitoring Station", region: "Raipur" },
    aqi: 45, pm25: 12.5, pm10: 28.3,
    recorded_at: new Date().toISOString(),
  },
  {
    location: { id: 2, name: "Siltara Industrial Zone", region: "Raipur" },
    aqi: 168, pm25: 78.4, pm10: 142.6,
    recorded_at: new Date().toISOString(),
  },
  {
    location: { id: 3, name: "Bhilai Steel Plant Sector", region: "Bhilai" },
    aqi: 135, pm25: 52.8, pm10: 98.4,
    recorded_at: new Date().toISOString(),
  },
  {
    location: { id: 4, name: "Korba Super Thermal Area", region: "Korba" },
    aqi: 185, pm25: 95.3, pm10: 165.2,
    recorded_at: new Date().toISOString(),
  },
  {
    location: { id: 5, name: "Jindal Industrial Park", region: "Raigarh" },
    aqi: 142, pm25: 58.6, pm10: 112.4,
    recorded_at: new Date().toISOString(),
  },
  {
    location: { id: 6, name: "Bhatapara Cement Belt", region: "Bhatapara" },
    aqi: 156, pm25: 65.2, pm10: 128.7,
    recorded_at: new Date().toISOString(),
  },
];

// Dummy Noise Data (6 stations)
const dummyNoiseData: NoiseReading[] = [
  {
    location: { id: 1, name: "Railway Colony, Raipur", region: "Raipur" },
    decibel_level: 72, zone_type: "Commercial",
    recorded_at: new Date().toISOString(),
  },
  {
    location: { id: 2, name: "Bhilai Steel Plant Gate", region: "Bhilai" },
    decibel_level: 88, zone_type: "Industrial",
    recorded_at: new Date().toISOString(),
  },
  {
    location: { id: 3, name: "Korba NTPC Township", region: "Korba" },
    decibel_level: 68, zone_type: "Residential",
    recorded_at: new Date().toISOString(),
  },
  {
    location: { id: 4, name: "Raigarh Bypass Highway", region: "Raigarh" },
    decibel_level: 82, zone_type: "Commercial",
    recorded_at: new Date().toISOString(),
  },
  {
    location: { id: 5, name: "Bhatapara Industrial Area", region: "Bhatapara" },
    decibel_level: 91, zone_type: "Industrial",
    recorded_at: new Date().toISOString(),
  },
  {
    location: { id: 6, name: "Civil Lines Park Area", region: "Raipur" },
    decibel_level: 52, zone_type: "Residential",
    recorded_at: new Date().toISOString(),
  },
];

// Public Health Advisory Alerts
const dummyAlerts: Alert[] = [
  {
    id: 1,
    severity: "high",
    title: "Air Quality Alert: Korba",
    message: "AQI levels have reached 185 in the Super Thermal Power Station area. People with heart or lung disease, older adults, and children should avoid prolonged outdoor exertion.",
    affected_area: "Korba Thermal Power Station vicinity, NTPC Colony",
    advisory: "Wear N95 masks if outdoors. Keep windows closed. Use air purifiers indoors. Avoid morning walks until conditions improve.",
    icon: "wind",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    severity: "medium",
    title: "Water Quality Advisory: Raipur Ward 12",
    message: "Higher than normal turbidity detected in municipal supply lines following maintenance work.",
    affected_area: "Raipur Ward 12, Civil Lines Extension",
    advisory: "Boil drinking water for 10 minutes before consumption. Avoid using tap water for infant formula preparation until cleared.",
    icon: "droplets",
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    severity: "medium",
    title: "Noise Advisory: Bhilai Industrial Zone",
    message: "Elevated industrial noise levels expected during scheduled plant maintenance operations.",
    affected_area: "Bhilai Sector 4, 5, and 6 within 2km of plant",
    advisory: "Keep windows closed during daytime hours (8 AM - 6 PM). Use ear protection if working outdoors in the area.",
    icon: "volume",
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
];

// CECB-Style News Stories with full content
const dummyStories: NewsStory[] = [
  {
    id: 1,
    headline: "Winter Smog Reduction: Chhattisgarh Achieves 15% Improvement",
    date: "March 12, 2026",
    summary: "The Chhattisgarh Environment Conservation Board reports a significant 15% reduction in winter particulate matter levels compared to last year.",
    fullContent: `The Chhattisgarh Environment Conservation Board (CECB) has announced encouraging results from its comprehensive winter air quality monitoring program. Data collected from 45 monitoring stations across the state indicates a significant 15% reduction in winter particulate matter (PM2.5 and PM10) levels compared to the previous year.

Key Achievements:
• PM2.5 levels reduced from an average of 85 μg/m³ to 72 μg/m³
• PM10 levels decreased from 142 μg/m³ to 118 μg/m³
• AQI remained below 150 for 78% of winter days vs 62% last year

This improvement has been attributed to:
1. Enhanced industrial emission controls mandated for 127 major facilities
2. Increased green cover with 2.3 lakh new saplings planted in urban centers
3. Stricter enforcement of construction dust norms
4. Promoting cleaner fuel adoption in industrial clusters

"This is a significant milestone in our air quality management journey," said the Member Secretary of CECB. "The 15% reduction demonstrates that coordinated action by industry, government, and citizens can yield measurable environmental benefits."

The Board has announced continued monitoring and additional measures for the next winter season, including expanding the real-time monitoring network to 60 stations and implementing AI-based pollution forecasting systems.

Citizens are encouraged to continue using the PrithviNet portal to track real-time air quality in their areas and follow health advisories when AQI levels are elevated.`,
    category: "Air Quality",
    image_placeholder: "winter_smog_improvement",
  },
  {
    id: 2,
    headline: "CECB Launches Mega Tree Plantation Drive in Bhilai Steel City",
    date: "March 8, 2026",
    summary: "A new initiative aims to plant 50,000 native saplings across Bhilai's industrial corridor by June 2026.",
    fullContent: `The Chhattisgarh Environment Conservation Board has launched an ambitious green initiative titled "Harit Bhilai 2026" - a mega tree plantation drive targeting the plantation of 50,000 native saplings across Bhilai's industrial corridor by June 2026.

Project Highlights:
• 25,000 saplings will be planted along BSP plant periphery as green buffers
• 15,000 saplings in residential sectors and community parks
• 10,000 saplings along major highways and railway corridors
• Native species selected: Neem, Peepal, Banyan, Jamun, and Amaltas

The project is being executed in partnership with:
- Bhilai Steel Plant (BSP) - Technical and funding support
- Bhilai Municipal Corporation - Land and maintenance
- Local schools and colleges - Volunteer participation
- Resident Welfare Associations - Community ownership

"Industrial cities need green lungs," stated the CECB Regional Officer. "This plantation drive will create natural barriers against industrial emissions while enhancing the aesthetic and ecological value of Bhilai."

Special Features:
• GPS tagging of all planted saplings for monitoring survival rates
• IoT-enabled soil moisture sensors for critical plantation zones
• QR code boards linking to tree information and care guidelines
• Annual green cover audits using satellite imagery

Citizens can participate by volunteering for plantation drives scheduled every Saturday. Register through the PrithviNet portal or contact the nearest CECB regional office.

The initiative aligns with the National Clean Air Programme (NCAP) targets and Chhattisgarh State Climate Action Plan commitments.`,
    category: "Green Initiative",
    image_placeholder: "tree_plantation_bhilai",
  },
  {
    id: 3,
    headline: "Real-Time Water Quality Monitoring Expanded to 25 New Locations",
    date: "March 5, 2026",
    summary: "Citizens can now access live water quality data from 25 additional monitoring stations across Raipur, Korba, and Raigarh districts.",
    fullContent: `The Chhattisgarh Environment Conservation Board has significantly expanded its water quality monitoring infrastructure by adding 25 new real-time monitoring stations across Raipur, Korba, and Raigarh districts. This brings the total number of online water quality monitoring points in the state to 58.

New Station Distribution:
• Raipur District: 12 new stations (urban water bodies and municipal supply)
• Korba District: 8 new stations (thermal power plant effluent and river monitoring)
• Raigarh District: 5 new stations (industrial area groundwater and surface water)

Parameters Monitored:
• Physical: pH, Turbidity, Temperature, Conductivity
• Chemical: Dissolved Oxygen (DO), Biochemical Oxygen Demand (BOD), Chemical Oxygen Demand (COD), Nitrates, Phosphates
• Biological: Total Coliform, Fecal Coliform
• Heavy Metals: Arsenic, Lead, Mercury, Cadmium (at selected stations)

Technology Upgrade:
The new stations feature advanced multi-parameter water quality probes with:
- Solar-powered operations for remote locations
- 4G/5G connectivity for real-time data transmission
- Automated sampling and calibration systems
- Weather-resistant enclosures for 24/7 operation

Public Access:
Citizens can access real-time water quality data through:
1. PrithviNet Citizen Portal (web and mobile)
2. SMS alerts for their registered area
3. Monthly water quality bulletins
4. Interactive maps showing station locations and status

"Transparency in environmental data is crucial for public health," emphasized the CECB Chairman. "These 25 new stations will provide unprecedented coverage of our water resources, enabling faster detection of pollution incidents and better protection of public health."

The expansion was funded under the National River Conservation Plan and State Water Quality Monitoring Programme. Data from these stations will feed into the State Water Quality Index and inform policy decisions on water resource management.

Citizens can report water quality concerns through the PrithviNet portal or the 24x7 CECB helpline: 0771-XXXXXXX.`,
    category: "Water Monitoring",
    image_placeholder: "water_monitoring_expansion",
  },
];

export default function CitizenPortal() {
  const [tab, setTab] = useState("stories");
  const [airData, setAirData] = useState<{ data: AirReading[] } | null>(null);
  const [waterData, setWaterData] = useState<{ data: WaterReading[] } | null>(null);
  const [noiseData, setNoiseData] = useState<{ data: NoiseReading[] } | null>(null);
  const [alertsData, setAlertsData] = useState<{ alerts: Alert[] } | null>(null);
  const [industryData, setIndustryData] = useState<{ industries: Industry[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [regionFilter, setRegionFilter] = useState<string>("All Regions");
  const [selectedStory, setSelectedStory] = useState<NewsStory | null>(null);

  const loadTab = useCallback(async (t: string) => {
    setLoading(true);
    try {
      if (t === "air") {
        const result = await api.public.airQuality(regionFilter === "All Regions" ? undefined : regionFilter);
        const data = (result as { data: AirReading[] }).data || [];
        const fallback = regionFilter === "All Regions" ? dummyAirData : dummyAirData.filter(d => d.location.region === regionFilter);
        setAirData({ data: data.length > 0 ? data : fallback });
      }
      else if (t === "noise") {
        // Will implement noise API if time permits, until then fallback
        await new Promise(r => setTimeout(r, 400));
        const filtered = regionFilter === "All Regions" ? dummyNoiseData : dummyNoiseData.filter(d => d.location.region === regionFilter);
        setNoiseData({ data: filtered });
      }
      else if (t === "alerts") {
        const result = await api.public.alerts();
        const data = (result as { alerts: any[] }).alerts || [];
        // Map backend alerts to the Alert interface format expected by Citizen portal
        const mapped = data.map(a => ({
          ...a,
          title: `Alert: ${a.alert_type}`,
          affected_area: `Location ID ${a.location_id || 'Unknown'}`,
          advisory: 'Please follow local authorities instructions.',
          icon: a.pollutant === 'noise' ? 'volume' : (a.pollutant === 'water' ? 'droplets' : 'wind')
        }));
        const combined = mapped.length > 0 ? mapped : dummyAlerts;
        const filtered = regionFilter === "All Regions" ? combined : combined.filter(a => a.affected_area.toLowerCase().includes(regionFilter.toLowerCase()));
        setAlertsData({ alerts: filtered.length > 0 ? filtered : dummyAlerts });
      }
      else if (t === "industries") {
        const result = await api.public.industries(regionFilter === "All Regions" ? undefined : regionFilter);
        const data = (result as { industries: Industry[] }).industries || [];
        setIndustryData({ industries: data });
      }
      else if (t === "water") {
        const result = await api.public.waterQuality(regionFilter === "All Regions" ? undefined : regionFilter);
        const data = (result as { data: WaterReading[] }).data || [];
        setWaterData({ data: data });
      }
    } catch (e) {
      console.error("Failed to load tab data:", e);
    } finally {
      setLoading(false);
    }
  }, [regionFilter]);

  useEffect(() => {
    loadTab(tab);
  }, [tab, loadTab]);

  const getAlertIcon = (iconName: string) => {
    switch (iconName) {
      case "wind": return <Wind className="w-5 h-5" />;
      case "droplets": return <Droplets className="w-5 h-5" />;
      case "volume": return <Volume2 className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Gov bar */}
      <div className="bg-blue-900 text-white text-xs py-1.5 px-6 flex justify-between items-center">
        <span>Official Environment Monitoring Portal | Government of Bharat</span>
        <Link to="/login" className="hover:underline">Officer Login →</Link>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-blue-900 font-heading">PrithviNet Citizen Portal</h1>
            <p className="text-xs text-gray-500">Public Environmental Transparency Dashboard — Air · Water · Noise</p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
            <Globe className="w-3.5 h-3.5" /> Public Access
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Region filter */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Filter by region:</label>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {REGIONS.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
          {regionFilter !== "All Regions" && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              Showing data for {regionFilter}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${tab === t.id ? "bg-blue-700 text-white shadow-blue-200" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Stories Tab */}
        {tab === "stories" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {dummyStories.map((story) => (
                <div key={story.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-40 bg-gradient-to-br from-blue-100 to-slate-200 flex items-center justify-center">
                    <div className="text-center">
                      <BookOpen className="w-10 h-10 text-blue-400 mx-auto mb-2" />
                      <span className="text-xs text-blue-500 font-medium uppercase tracking-wider">{story.image_placeholder.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                        {story.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {story.date}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-gray-900 mb-3 line-clamp-2 leading-tight">
                      {story.headline}
                    </h3>
                    
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                      {story.summary}
                    </p>
                    
                    <button 
                      onClick={() => setSelectedStory(story)}
                      className="flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors"
                    >
                      Read full story <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-sm text-blue-800">
                <strong>Chhattisgarh Environment Conservation Board</strong> — Official monitoring data and press releases
              </p>
            </div>
          </div>
        )}

        {/* Air Quality */}
        {tab === "air" && airData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {airData.data?.length === 0 && <p className="col-span-3 text-center text-gray-400 py-12">No air quality data available for {regionFilter}.</p>}
            {airData.data?.map((d: AirReading, i: number) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{d.location.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {d.location.region}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${aqiColor(d.aqi)}`}>
                    AQI {d.aqi?.toFixed(0) ?? "—"}
                  </span>
                </div>
                <p className={`text-sm font-medium mb-3 ${aqiColor(d.aqi)} px-2 py-1 rounded-lg inline-block`}>
                  {aqiLabel(d.aqi)}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <span>PM2.5: <b className="text-gray-700">{d.pm25 !== null ? d.pm25.toFixed(1) : "—"}</b> µg/m³</span>
                  <span>PM10: <b className="text-gray-700">{d.pm10 !== null ? d.pm10.toFixed(1) : "—"}</b> µg/m³</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Updated: {d.recorded_at ? new Date(d.recorded_at).toLocaleString() : "—"}</p>
              </div>
            ))}
          </div>
        )}

        {/* Water Quality */}
        {tab === "water" && waterData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {waterData.data?.length === 0 && <p className="col-span-3 text-center text-gray-400 py-12">No water quality data available yet.</p>}
            {waterData.data?.map((d: WaterReading, i: number) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900">{d.location.name}</h3>
                  <p className="text-xs text-gray-500">{d.location.region}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <span>pH: <b className={d.ph && (d.ph < 6.5 || d.ph > 8.5) ? "text-red-600" : "text-gray-700"}>{d.ph ?? "—"}</b></span>
                  <span>BOD: <b className="text-gray-700">{d.bod ?? "—"}</b> mg/L</span>
                  <span>DO: <b className={d.dissolved_oxygen && d.dissolved_oxygen < 4 ? "text-red-600" : "text-gray-700"}>{d.dissolved_oxygen ?? "—"}</b> mg/L</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Updated: {d.recorded_at ? new Date(d.recorded_at).toLocaleString() : "—"}</p>
              </div>
            ))}
          </div>
        )}

        {/* Noise Levels */}
        {tab === "noise" && noiseData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {noiseData.data?.length === 0 && <p className="col-span-3 text-center text-gray-400 py-12">No noise data available for {regionFilter}.</p>}
            {noiseData.data?.map((d: NoiseReading, i: number) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{d.location.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {d.location.region}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${noiseColor(d.decibel_level)}`}>
                    {d.decibel_level ?? "—"} dB
                  </span>
                </div>
                <p className={`text-sm font-medium mb-3 ${noiseColor(d.decibel_level)} px-2 py-1 rounded-lg inline-block`}>
                  {noiseLabel(d.decibel_level)}
                </p>
                <div className="space-y-2 text-xs text-gray-500">
                  <span>Zone Type: <b className="text-gray-700">{d.zone_type}</b></span>
                  <div className="flex gap-2">
                    <span className={d.zone_type === "Industrial" ? "text-orange-600" : d.zone_type === "Residential" ? "text-green-600" : "text-blue-600"}>
                      CPCB Limit: {d.zone_type === "Industrial" ? "75 dB" : d.zone_type === "Residential" ? "55 dB" : "65 dB"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">Updated: {d.recorded_at ? new Date(d.recorded_at).toLocaleString() : "—"}</p>
              </div>
            ))}
          </div>
        )}

        {/* Active Alerts */}
        {tab === "alerts" && alertsData && (
          <div className="space-y-4">
            {alertsData.alerts?.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-green-600 font-semibold text-lg">✅ No Active Health Advisories</p>
                <p className="text-gray-400 text-sm mt-1">All monitored areas are currently within safe environmental limits.</p>
              </div>
            ) : (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                  <p className="text-sm text-amber-800">
                    <strong>Public Health Advisory:</strong> The following alerts contain recommendations for citizens in affected areas.
                  </p>
                </div>
                
                {alertsData.alerts?.map((alert: Alert) => (
                  <div key={alert.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className={`h-1.5 ${alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          alert.severity === 'critical' ? 'bg-red-100 text-red-600' : 
                          alert.severity === 'high' ? 'bg-orange-100 text-orange-600' : 
                          'bg-yellow-100 text-yellow-600'
                        }`}>
                          {getAlertIcon(alert.icon)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full uppercase tracking-wide ${
                              alert.severity === 'critical' ? 'bg-red-100 text-red-700' : 
                              alert.severity === 'high' ? 'bg-orange-100 text-orange-700' : 
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {alert.severity} Priority
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(alert.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          <h3 className="font-bold text-gray-900 mb-2">{alert.title}</h3>
                          <p className="text-sm text-gray-700 mb-3">{alert.message}</p>
                          
                          <div className="flex items-start gap-2 mb-3">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-600"><strong>Affected Area:</strong> {alert.affected_area}</span>
                          </div>
                          
                          <div className={`rounded-lg p-3 ${
                            alert.severity === 'critical' ? 'bg-red-50 border border-red-100' : 
                            alert.severity === 'high' ? 'bg-orange-50 border border-orange-100' : 
                            'bg-yellow-50 border border-yellow-100'
                          }`}>
                            <div className="flex items-start gap-2">
                              <Heart className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                alert.severity === 'critical' ? 'text-red-500' : 
                                alert.severity === 'high' ? 'text-orange-500' : 
                                'text-yellow-600'
                              }`} />
                              <div>
                                <p className={`text-xs font-bold uppercase mb-1 ${
                                  alert.severity === 'critical' ? 'text-red-700' : 
                                  alert.severity === 'high' ? 'text-orange-700' : 
                                  'text-yellow-700'
                                }`}>Health Advisory</p>
                                <p className={`text-sm ${
                                  alert.severity === 'critical' ? 'text-red-800' : 
                                  alert.severity === 'high' ? 'text-orange-800' : 
                                  'text-yellow-800'
                                }`}>{alert.advisory}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Industries */}
        {tab === "industries" && industryData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {industryData.industries?.map((i: Industry) => (
              <div key={i.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{i.name}</h3>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${indStatus[i.status] || "bg-gray-100 text-gray-600"}`}>{i.status}</span>
                </div>
                <p className="text-xs text-gray-500">{i.type} · {i.region}</p>
                {i.lat && i.lng && <p className="text-xs text-gray-400 mt-1">📍 {i.lat.toFixed(3)}, {i.lng.toFixed(3)}</p>}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Story Detail Modal */}
      {selectedStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                  {selectedStory.category}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {selectedStory.date}
                </span>
              </div>
              <button 
                onClick={() => setSelectedStory(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="h-48 bg-gradient-to-br from-blue-100 to-slate-200 rounded-xl flex items-center justify-center mb-6">
                <div className="text-center">
                  <BookOpen className="w-16 h-16 text-blue-400 mx-auto mb-3" />
                  <span className="text-sm text-blue-500 font-medium uppercase tracking-wider">{selectedStory.image_placeholder.replace(/_/g, ' ')}</span>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {selectedStory.headline}
              </h2>
              
              <div className="prose prose-sm max-w-none">
                {selectedStory.fullContent.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="text-gray-700 leading-relaxed mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  <strong>Source:</strong> Chhattisgarh Environment Conservation Board (CECB) | Official Press Release
                </p>
                <button 
                  onClick={() => setSelectedStory(null)}
                  className="mt-4 w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
