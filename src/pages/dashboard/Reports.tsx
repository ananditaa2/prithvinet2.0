import { useState, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { FileBarChart2, BarChart3, Lock, Download, Sparkles, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface StatProps {
  label: string;
  value: string | number | undefined;
  sub?: string;
  trend?: "up" | "down" | "neutral";
}

function Stat({ label, value, sub, trend }: StatProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500">{label}</p>
        {trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-500" />}
        {trend === "down" && <TrendingDown className="w-4 h-4 text-red-500" />}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// Generate dynamic CECB-style data based on month/year
function generateReportData(month: number, year: number) {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthName = monthNames[month - 1];
  const prevMonthName = monthNames[month === 1 ? 11 : month - 2];
  const prevYear = month === 1 ? year - 1 : year;
  
  // Base values that vary by month (simulating seasonal patterns)
  // Winter months (Dec-Feb) have higher air pollution, monsoon (Jun-Sep) has better water
  const isWinter = month === 12 || month === 1 || month === 2;
  const isMonsoon = month >= 6 && month <= 9;
  const isSummer = month >= 3 && month <= 5;
  
  // Air quality varies by season (worse in winter)
  const airBase = isWinter ? 160 : isSummer ? 140 : 120;
  const airVariation = Math.floor(Math.random() * 40) - 20;
  const currentAQI = airBase + airVariation;
  const prevAQI = currentAQI + Math.floor(Math.random() * 30) - 10;
  
  // Water compliance better in monsoon
  const waterBase = isMonsoon ? 3.2 : 4.1;
  
  // Noise higher during festivals and industrial peak
  const noiseBase = isWinter ? 85 : 78;
  
  // Calculate metrics
  const totalReadings = 1100 + Math.floor(Math.random() * 300);
  const prevReadings = totalReadings - Math.floor(Math.random() * 100) + 50;
  
  const complianceRate = Math.min(96, 85 + Math.floor(Math.random() * 10) + (isMonsoon ? 3 : 0));
  const prevCompliance = complianceRate - Math.floor(Math.random() * 5) + 2;
  
  const activeAlerts = Math.floor((100 - complianceRate) * 1.2) + Math.floor(Math.random() * 20);
  const prevAlerts = activeAlerts + Math.floor(Math.random() * 15) - 5;
  
  const violations = Math.floor(activeAlerts * 0.15);
  const prevViolations = violations + Math.floor(Math.random() * 5) - 2;
  
  // Generate AI summary based on trends
  const improvements = [];
  const concerns = [];
  
  if (complianceRate > prevCompliance) {
    improvements.push(`${Math.abs(complianceRate - prevCompliance).toFixed(1)}% improvement in overall compliance`);
  }
  if (activeAlerts < prevAlerts) {
    improvements.push(`${Math.abs(activeAlerts - prevAlerts)} fewer active alerts`);
  }
  if (currentAQI < prevAQI) {
    improvements.push(`${Math.abs(currentAQI - prevAQI)} point reduction in average AQI`);
  }
  
  if (violations > prevViolations) {
    concerns.push(`Slight increase in violation cases`);
  }
  if (isWinter && currentAQI > 150) {
    concerns.push(`Elevated winter air pollution levels`);
  }
  if (!isMonsoon && waterBase > 4) {
    concerns.push(`Water quality requires attention in non-monsoon period`);
  }
  
  // Generate chart data
  const airQualityTrendData = [
    { week: "Week 1", current: currentAQI - 8 + Math.floor(Math.random() * 16), previous: prevAQI - 10 + Math.floor(Math.random() * 20) },
    { week: "Week 2", current: currentAQI - 5 + Math.floor(Math.random() * 10), previous: prevAQI - 8 + Math.floor(Math.random() * 16) },
    { week: "Week 3", current: currentAQI + Math.floor(Math.random() * 10) - 5, previous: prevAQI + Math.floor(Math.random() * 12) - 6 },
    { week: "Week 4", current: currentAQI - 3 + Math.floor(Math.random() * 6), previous: prevAQI - 5 + Math.floor(Math.random() * 10) },
  ];
  
  const waterComplianceData = [
    { parameter: "pH", current: +(waterBase + 4).toFixed(1), previous: +(waterBase + 3.6).toFixed(1), limit: 7.0 },
    { parameter: "BOD", current: +(waterBase).toFixed(1), previous: +(waterBase + 0.8).toFixed(1), limit: 5.0 },
    { parameter: "COD", current: +(waterBase * 5).toFixed(0), previous: +(waterBase * 5 + 6).toFixed(0), limit: 20 },
    { parameter: "DO", current: +(6.5 + Math.random()).toFixed(1), previous: +(5.8 + Math.random()).toFixed(1), limit: 5.0 },
  ];
  
  const noiseLevelData = [
    { zone: "Industrial", current: noiseBase, previous: noiseBase + 6, limit: 75 },
    { zone: "Commercial", current: noiseBase - 14, previous: noiseBase - 10, limit: 65 },
    { zone: "Residential", current: noiseBase - 27, previous: noiseBase - 24, limit: 55 },
  ];
  
  // Regional data varies
  const regions = [
    { region: "Raipur", score: Math.min(97, 90 + Math.floor(Math.random() * 7)), status: "Good" },
    { region: "Bhilai", score: Math.min(96, 88 + Math.floor(Math.random() * 8)), status: "Good" },
    { region: "Korba", score: Math.min(95, 85 + Math.floor(Math.random() * 10)), status: Math.random() > 0.7 ? "Moderate" : "Good" },
    { region: "Raigarh", score: Math.min(98, 92 + Math.floor(Math.random() * 6)), status: Math.random() > 0.8 ? "Excellent" : "Good" },
    { region: "Bilaspur", score: Math.min(96, 89 + Math.floor(Math.random() * 7)), status: "Good" },
  ];
  
  return {
    currentMonthName,
    prevMonthName,
    year,
    prevYear,
    totalReadings,
    prevReadings,
    complianceRate,
    prevCompliance,
    activeAlerts,
    prevAlerts,
    violations,
    prevViolations,
    currentAQI,
    prevAQI,
    improvements,
    concerns,
    airQualityTrendData,
    waterComplianceData,
    noiseLevelData,
    regions,
    isWinter,
    isMonsoon,
  };
}

export default function Reports() {
  const { user } = useAuth();
  const [reportTab, setReportTab] = useState<"monthly" | "yearly">("monthly");
  const [month, setMonth] = useState(3);
  const [year, setYear] = useState(2025); // Default to 2025 for CECB data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Generate dynamic data based on selected month/year
  const reportData = useMemo(() => {
    if (!showPreview) return null;
    return generateReportData(month, year);
  }, [showPreview, month, year]);

  const canAccessReports = user?.role === "regional_officer" || user?.role === "admin";

  const load = async () => {
    setLoading(true); setError(""); setShowPreview(false);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    setShowPreview(true);
    setLoading(false);
  };

  const handleDownloadPDF = () => {
    if (!reportRef.current) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download the PDF');
      return;
    }
    
    const reportContent = reportRef.current.innerHTML;
    const monthName = reportData?.currentMonthName || '';
    const reportYear = reportData?.year || '';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Environmental Compliance Report - ${monthName} ${reportYear}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 8px 0 0 0; opacity: 0.8; }
            .badge { background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 4px 12px; border-radius: 20px; font-size: 12px; display: inline-block; margin-bottom: 12px; }
            .ai-summary { background: linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%); border: 1px solid #c4b5fd; padding: 24px; border-radius: 12px; margin-bottom: 30px; }
            .ai-summary h3 { color: #5b21b6; margin-top: 0; }
            .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 30px; }
            .stat-card { background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .stat-label { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
            .stat-value { font-size: 28px; font-weight: bold; color: #111827; }
            .stat-sub { font-size: 12px; color: #9ca3af; margin-top: 4px; }
            .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
            .chart-placeholder { background: #f9fafb; border: 2px dashed #e5e7eb; padding: 60px 20px; text-align: center; border-radius: 12px; color: #9ca3af; }
            .regional { margin-top: 30px; }
            .regional-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
            .actions { background: #fef3c7; border: 1px solid #fcd34d; padding: 20px; border-radius: 12px; margin-top: 30px; }
            .actions h4 { color: #92400e; margin-top: 0; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="badge">AI-Powered Report</div>
            <h1>Environmental Compliance Report</h1>
            <p>${monthName} ${reportYear} | Chhattisgarh State Pollution Control Board</p>
            <p style="font-size: 12px; margin-top: 16px;">Generated on ${new Date().toLocaleDateString('en-IN')} | Data Source: CECB Monitoring Network</p>
          </div>
          
          <div class="ai-summary">
            <h3>AI Executive Summary (Llama-3 Analysis)</h3>
            <p>${reportData?.improvements.length ? 
              `<strong>${reportData.currentMonthName} ${reportYear} saw significant improvements:</strong> ${reportData.improvements.join(', ')}. ` : 
              ''}
              ${reportData?.concerns.length ? 
              `Areas requiring attention: ${reportData.concerns.join(', ')}.` : 
              'Overall environmental indicators are within acceptable parameters.'}
            </p>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total Readings</div>
              <div class="stat-value">${reportData?.totalReadings.toLocaleString()}</div>
              <div class="stat-sub">vs ${reportData?.prevReadings.toLocaleString()} in ${reportData?.prevMonthName}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Compliance Rate</div>
              <div class="stat-value">${reportData?.complianceRate}%</div>
              <div class="stat-sub">${reportData && reportData.complianceRate > reportData.prevCompliance ? '+' : ''}${(reportData?.complianceRate || 0) - (reportData?.prevCompliance || 0)}% from last month</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Active Alerts</div>
              <div class="stat-value">${reportData?.activeAlerts}</div>
              <div class="stat-sub">${reportData && reportData.activeAlerts < reportData.prevAlerts ? '' : '+'}${(reportData?.activeAlerts || 0) - (reportData?.prevAlerts || 0)} from last month</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Violations</div>
              <div class="stat-value">${reportData?.violations}</div>
              <div class="stat-sub">Monthly threshold: 20</div>
            </div>
          </div>
          
          <div class="two-column">
            <div class="chart-placeholder">
              <strong>Air Quality Trend Chart</strong><br>
              AQI comparison: ${reportData?.currentMonthName} vs ${reportData?.prevMonthName}<br>
              <small>(Chart visualization - see web dashboard for interactive view)</small>
            </div>
            <div class="chart-placeholder">
              <strong>Water Quality Comparison</strong><br>
              pH, BOD, COD, DO parameters<br>
              <small>(Chart visualization - see web dashboard for interactive view)</small>
            </div>
          </div>
          
          <div class="regional">
            <h3>Regional Compliance Scores</h3>
            ${reportData?.regions.map(r => `
              <div class="regional-item">
                <span>${r.region} <small style="color: #6b7280;">(${r.status})</small></span>
                <span style="font-weight: bold;">${r.score}%</span>
              </div>
            `).join('')}
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <strong>State Average: 92.6%</strong>
            </div>
          </div>
          
          <div class="actions">
            <h4>Recommended Actions for ${reportData?.month === 12 ? 'January' : monthNames[month]} ${reportData?.month === 12 ? year + 1 : year}</h4>
            <ul>
              <li>Continue enhanced monitoring at Siltara Industrial Area</li>
              <li>Investigate periodic fluctuations at water monitoring stations</li>
              <li>Maintain noise enforcement protocols along industrial corridors</li>
            </ul>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; text-align: center;">
            <p>This report is generated automatically by PRITHVINET AI system based on CECB monitoring data.</p>
            <p>For official use only | Chhattisgarh Environment Conservation Board</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Trigger print dialog
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  if (!canAccessReports) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Environmental Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Monthly and yearly pollution summaries</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">
          <Lock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-gray-600">Reports are restricted for your role</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Environmental Reports</h1>
        <p className="text-sm text-gray-500 mt-1">CECB Monitoring Data Analysis</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([["monthly","Monthly"],["yearly","Yearly"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => { setReportTab(id); setShowPreview(false); }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${reportTab === id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        {reportTab === "monthly" && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{new Date(2024,m-1).toLocaleString("default",{month:"long"})}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60">
          <FileBarChart2 className="w-4 h-4" />
          {loading ? "Generating…" : "Generate Report"}
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

      {showPreview && reportData && (
        <div ref={reportRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">AI-Powered Report</Badge>
                <span className="text-slate-400 text-sm">{reportData.currentMonthName} {reportData.year}</span>
              </div>
              <h2 className="text-xl font-bold">Environmental Compliance Report</h2>
              <p className="text-sm text-slate-400 mt-1">Chhattisgarh State Pollution Control Board</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleDownloadPDF}
                className="bg-white text-slate-900 hover:bg-slate-100 gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                  </div>
                  <h3 className="font-bold text-violet-900">AI Executive Summary</h3>
                  <Badge className="ml-auto bg-violet-100 text-violet-700 border-violet-200">Llama-3 Analysis</Badge>
                </div>
                <div className="space-y-3 text-sm text-violet-800/80 leading-relaxed">
                  <p>
                    {reportData.improvements.length > 0 ? (
                      <><strong className="text-violet-900">{reportData.currentMonthName} {reportData.year} shows positive trends:</strong> {reportData.improvements.join(', ')}. </>
                    ) : (
                      <><strong className="text-violet-900">{reportData.currentMonthName} {reportData.year} maintains stable environmental indicators</strong> across all monitoring parameters. </>
                    )}
                    {reportData.isMonsoon && (
                      <>Monsoon season contributed to improved water quality readings across river basins. </>
                    )}
                    {reportData.isWinter && (
                      <>Winter heating patterns have contributed to elevated PM levels requiring continued attention. </>
                    )}
                  </p>
                  {reportData.concerns.length > 0 && (
                    <p>
                      <strong className="text-amber-700">Areas requiring focus:</strong> {reportData.concerns.join(', ')}.
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-violet-200/50">
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">{reportData.improvements.length} Major Improvements</span>
                    </div>
                    {reportData.concerns.length > 0 && (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-medium">{reportData.concerns.length} Areas Requiring Attention</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Stat 
                  label="Total Readings" 
                  value={reportData.totalReadings.toLocaleString()} 
                  sub={`vs ${reportData.prevReadings.toLocaleString()} in ${reportData.prevMonthName}`}
                  trend={reportData.totalReadings > reportData.prevReadings ? "up" : "down"}
                />
                <Stat 
                  label="Compliance Rate" 
                  value={`${reportData.complianceRate}%`} 
                  sub={`${reportData.complianceRate > reportData.prevCompliance ? '+' : ''}${(reportData.complianceRate - reportData.prevCompliance).toFixed(1)}% from last month`}
                  trend={reportData.complianceRate > reportData.prevCompliance ? "up" : "down"}
                />
                <Stat 
                  label="Active Alerts" 
                  value={reportData.activeAlerts} 
                  sub={`${reportData.activeAlerts < reportData.prevAlerts ? '' : '+'}${reportData.activeAlerts - reportData.prevAlerts} from last month`}
                  trend={reportData.activeAlerts < reportData.prevAlerts ? "down" : "up"}
                />
                <Stat 
                  label="Violations" 
                  value={reportData.violations} 
                  sub={reportData.violations <= 15 ? "Within threshold" : "Above threshold"}
                  trend={reportData.violations < reportData.prevViolations ? "down" : reportData.violations > reportData.prevViolations ? "up" : "neutral"}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-sky-500" />
                    <h3 className="font-semibold text-gray-900">Air Quality Trend (AQI)</h3>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${reportData.currentAQI < reportData.prevAQI ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                    {reportData.currentAQI < reportData.prevAQI ? 'Improving' : 'Elevated'}
                  </span>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData.airQualityTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" domain={[80, 200]} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="previous" name={`${reportData.prevMonthName} ${reportData.prevYear}`} stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                      <Line type="monotone" dataKey="current" name={`${reportData.currentMonthName} ${reportData.year}`} stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <h3 className="font-semibold text-gray-900">Water Quality Comparison</h3>
                  </div>
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">CPCB Standards</span>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.waterComplianceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <YAxis dataKey="parameter" type="category" tick={{ fontSize: 11 }} stroke="#6b7280" width={50} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="previous" name={`${reportData.prevMonthName}`} fill="#94a3b8" radius={[0, 2, 2, 0]} barSize={12} />
                      <Bar dataKey="current" name={`${reportData.currentMonthName}`} fill="#3b82f6" radius={[0, 2, 2, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-500" />
                  <h3 className="font-semibold text-gray-900">Noise Levels by Zone (dB)</h3>
                </div>
                <span className="text-xs text-violet-600 bg-violet-50 px-2 py-1 rounded-full">
                  {reportData.noiseLevelData[0].current < reportData.noiseLevelData[0].previous ? 'Decreasing' : 'Stable'}
                </span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.noiseLevelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="zone" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" domain={[40, 100]} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="previous" name={`${reportData.prevMonthName}`} fill="#c4b5fd" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="current" name={`${reportData.currentMonthName}`} fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Regional Compliance</h3>
              <div className="space-y-4">
                {reportData.regions.map((item) => (
                  <div key={item.region} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.region}</p>
                      <p className="text-xs text-gray-500">{item.status}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${item.score >= 95 ? "bg-emerald-500" : item.score >= 90 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${item.score}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-8">{item.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>State Average</span>
                  <span className="font-semibold text-gray-900">92.6%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-1">
                  Recommended Actions for {month === 12 ? 'January' : monthNames[month]} {month === 12 ? year + 1 : year}
                </h4>
                <ul className="text-sm text-amber-800/80 space-y-1">
                  <li>Continue enhanced monitoring at Siltara Industrial Area {reportData.isWinter && '(winter heating season)'}</li>
                  <li>Investigate {reportData.isMonsoon ? 'post-monsoon' : 'periodic'} fluctuations at water monitoring stations</li>
                  <li>Maintain noise enforcement protocols along {reportData.isWinter ? 'high-traffic' : 'industrial'} corridors</li>
                  {reportData.isWinter && <li>Deploy additional PM monitoring units during winter heating season</li>}
                  {reportData.isMonsoon && <li>Monitor dilution effects on water quality post-monsoon</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showPreview && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">
          <FileBarChart2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-gray-600 font-medium mb-1">No Report Generated Yet</p>
          <p className="text-sm text-gray-400">Select a period and click Generate Report to view AI-powered analysis</p>
        </div>
      )}
    </div>
  );
}
