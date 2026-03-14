import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Building2, AlertTriangle, Clock, ChevronRight, Sparkles, FileText, UserCircle, MapPin, Activity } from "lucide-react";

// HARDCODED DEMO DATA - For presentation only
const DEMO_CASES = [
  {
    id: "IND-BSP-001",
    industryName: "Bhilai Steel Plant",
    region: "Bhilai",
    priorityScore: 98,
    severity: "Critical",
    violationCount: 4,
    lastBreach: "2 hours ago",
    aiInsight: "Llama-3 Insight: Recommend immediate physical inspection. Facility has breached PM10 (150 µg/m³) and SO2 limits for 48 consecutive hours during a high-risk weather inversion.",
    actionTaken: false
  },
  {
    id: "IND-KOR-005",
    industryName: "Balco Aluminum",
    region: "Korba",
    priorityScore: 85,
    severity: "High",
    violationCount: 2,
    lastBreach: "5 hours ago",
    aiInsight: "Llama-3 Insight: Elevated priority. Consistent wastewater pH anomalies detected downstream. Cross-referencing with recent Hasdeo River sensor drops.",
    actionTaken: false
  }
];

interface DemoCase {
  id: string;
  industryName: string;
  region: string;
  priorityScore: number;
  severity: string;
  violationCount: number;
  lastBreach: string;
  aiInsight: string;
  actionTaken: boolean;
}

const CHHATTISGARH_NODES = [
  { value: "raipur", label: "Raipur" },
  { value: "bhilai", label: "Bhilai" },
  { value: "korba", label: "Korba" },
  { value: "raigarh", label: "Raigarh" },
  { value: "bilaspur", label: "Bilaspur" },
];

const FIELD_OFFICERS = [
  { value: "rohit.sharma", label: "Rohit Sharma (Senior Inspector)" },
  { value: "priya.patel", label: "Priya Patel (Environmental Officer)" },
  { value: "amit.kumar", label: "Amit Kumar (Field Agent)" },
  { value: "sneha.gupta", label: "Sneha Gupta (Regional Lead)" },
];

export default function InspectionPriority() {
  const [cases, setCases] = useState<DemoCase[]>(DEMO_CASES);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignedOfficers, setAssignedOfficers] = useState<Record<string, string>>({});
  const [generatedMandates, setGeneratedMandates] = useState<Record<string, boolean>>({});

  // Filter cases by selected regions
  const filteredCases = selectedRegions.length > 0
    ? cases.filter(c => selectedRegions.some(r => c.region.toLowerCase().includes(r)))
    : cases;

  const handleRegionToggle = (regionValue: string) => {
    setSelectedRegions(prev => 
      prev.includes(regionValue) 
        ? prev.filter(r => r !== regionValue)
        : [...prev, regionValue]
    );
  };

  const handleAssignOfficer = (caseId: string, officer: string) => {
    setAssignedOfficers(prev => ({ ...prev, [caseId]: officer }));
  };

  const handleGenerateMandate = (caseId: string) => {
    setGeneratedMandates(prev => ({ ...prev, [caseId]: true }));
    alert(`Inspection Mandate PDF generated for ${cases.find(c => c.id === caseId)?.industryName}\n\nDocument includes:\n- Official CPCB letterhead\n- Violation details\n- Legal references (EPA 1986 §15)\n- 15-day compliance deadline`);
  };

  const regionLabel = selectedRegions.length > 0 
    ? `${selectedRegions.length} region${selectedRegions.length > 1 ? 's' : ''} selected`
    : "All Regions";

  const getSeverityColor = (severity: string) => {
    if (severity === "Critical") return "bg-red-100 text-red-700 border-red-200";
    if (severity === "High") return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Inspection Priority</h1>
        <p className="text-sm text-gray-500 mt-1">
          Top industries to inspect this week — ranked by violations, severity & recency
        </p>
      </div>

      {/* AI Powered Raid Planner Banner - Elevated to top */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl border border-blue-500 p-4 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/20 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            AI Powered
          </div>
          <span className="text-xs text-blue-100">Raid Planner</span>
        </div>
        <p className="font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Prioritized by severity-weighted active alerts
        </p>
        <p className="mt-1 text-sm text-blue-100">
          Schedule physical inspections for top entries. Algorithm considers violation severity, 
          recency, and compliance history.
        </p>
      </div>

      {/* Multi-Select Region Filter */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter by Region:</span>
            <div className="relative">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
                onClick={() => document.getElementById('region-dropdown')?.classList.toggle('hidden')}
              >
                <span className="text-gray-700">{regionLabel}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
              </button>
              
              {/* Dropdown */}
              <div id="region-dropdown" className="hidden absolute top-full left-0 mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-10 py-1">
                {CHHATTISGARH_NODES.map((node) => (
                  <label
                    key={node.value}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRegions.includes(node.value)}
                      onChange={() => handleRegionToggle(node.value)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{node.label}</span>
                  </label>
                ))}
                {selectedRegions.length > 0 && (
                  <div className="border-t border-gray-100 mt-1 pt-1 px-3">
                    <button
                      onClick={() => setSelectedRegions([])}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No priority cases</p>
          <p className="text-sm text-gray-400 mt-1">All industries are compliant or no active alerts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCases.map((caseItem, idx) => (
            <div
              key={caseItem.id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${
                idx === 0 ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
              }`}
            >
              {/* AI Insight Banner */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 p-4">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800 leading-relaxed">
                    {caseItem.aiInsight}
                  </p>
                </div>
              </div>
              
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Priority Score - BIG & RED */}
                  <div className={`flex-shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center ${
                    idx === 0 ? 'bg-red-600' : 'bg-orange-500'
                  }`}>
                    <span className="text-3xl font-bold text-white">{caseItem.priorityScore}</span>
                    <span className="text-xs text-white/80">Score</span>
                  </div>
                  
                  {/* Industry Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg text-gray-900">{caseItem.industryName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(caseItem.severity)}`}>
                        {caseItem.severity}
                      </span>
                      {idx === 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                          🔥 HIGHEST PRIORITY
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {caseItem.region}
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5" />
                        {caseItem.violationCount} active violations
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Last breach: {caseItem.lastBreach}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-1">Reg: {caseItem.id}</p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                  {/* Assign Field Officer Dropdown */}
                  <div className="flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-gray-400" />
                    <select
                      value={assignedOfficers[caseItem.id] || ""}
                      onChange={(e) => handleAssignOfficer(caseItem.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]"
                    >
                      <option value="">Assign Field Officer...</option>
                      {FIELD_OFFICERS.map((officer) => (
                        <option key={officer.value} value={officer.value}>
                          {officer.label}
                        </option>
                      ))}
                    </select>
                    {assignedOfficers[caseItem.id] && (
                      <span className="text-xs text-green-600 font-medium">✓ Assigned</span>
                    )}
                  </div>
                  
                  {/* Generate Mandate Button */}
                  <button
                    onClick={() => handleGenerateMandate(caseItem.id)}
                    disabled={generatedMandates[caseItem.id]}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      generatedMandates[caseItem.id]
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    {generatedMandates[caseItem.id] ? 'Mandate Generated ✓' : 'Generate Mandate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
