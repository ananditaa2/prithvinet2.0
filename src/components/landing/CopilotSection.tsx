import { useState } from "react";
import { Copy, ArrowRight, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import { api } from "@/lib/api";

interface SimulationResult {
    scenario: {
        region: string;
        industry: string;
        pollutant: string;
        reduction_percentage: number;
        current_risk_score: number;
    };
    baseline_calculation: {
        estimated_new_score: number;
    };
    ai_analysis: string;
}

export default function CopilotSection({ isWidget = false }: { isWidget?: boolean }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        region: "Industrial Zone A",
        industry: "Power Generation",
        pollutant: "SO2",
        reduction_percentage: 30,
        current_risk_score: 85.0
    });

    const [result, setResult] = useState<SimulationResult | null>(null);

    const handleSimulate = async () => {
        setLoading(true);
        try {
            const data = await api.ai.simulateRisk(formData);
            setResult(data);
            toast({
                title: "Simulation Complete",
                description: "AI analysis has been successfully generated.",
            });
        } catch (error) {
            console.error("Simulation error:", error);
            toast({
                title: "Simulation Failed",
                description: "Could not connect to the backend server. Make sure it is running.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className={`${isWidget ? 'py-4' : 'py-24 bg-slate-50'} relative overflow-hidden`} id={isWidget ? undefined : "copilot"}>
            <div className={`${isWidget ? '' : 'container px-4 md:px-6'} relative z-10`}>
                {!isWidget && (
                    <div className="flex flex-col items-center text-center space-y-4 mb-16">
                        <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-800 font-medium mb-2">
                            <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2 animate-pulse"></span>
                            Advanced Feature
                        </div>
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-slate-900">
                            AI-Assisted Compliance Copilot
                        </h2>
                        <p className="max-w-[700px] text-slate-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                            Run "What-if" analyses instantly. See how specific emission reductions impact regional environmental health based on real-time AI simulations.
                        </p>
                    </div>
                )}

                <div className={`grid gap-8 ${isWidget ? 'grid-cols-1' : 'lg:grid-cols-2 lg:gap-12 max-w-6xl mx-auto'} items-start`}>
                    {/* Configuration Form */}
                    <Card className="border-slate-200 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                        <CardHeader className="bg-slate-50/50 pb-6">
                            <CardTitle className="text-2xl font-bold">Simulation Parameters</CardTitle>
                            <CardDescription>
                                Define the intervention scenario to simulate environmental impact.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="space-y-2">
                                <Label htmlFor="region" className="font-semibold text-slate-700">Region</Label>
                                <Input
                                    id="region"
                                    value={formData.region}
                                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                                    className="bg-white border-slate-200 focus-visible:ring-blue-500 rounded-lg h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="industry" className="font-semibold text-slate-700">Industry Sector</Label>
                                <Input
                                    id="industry"
                                    value={formData.industry}
                                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                    className="bg-white border-slate-200 focus-visible:ring-blue-500 rounded-lg h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pollutant" className="font-semibold text-slate-700">Target Pollutant</Label>
                                <Input
                                    id="pollutant"
                                    value={formData.pollutant}
                                    onChange={(e) => setFormData({ ...formData, pollutant: e.target.value })}
                                    className="bg-white border-slate-200 focus-visible:ring-blue-500 rounded-lg h-11"
                                />
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <Label className="font-semibold text-slate-700">Reduction Target</Label>
                                    <span className="text-xl font-bold text-blue-600">{formData.reduction_percentage}%</span>
                                </div>
                                <Slider
                                    defaultValue={[formData.reduction_percentage]}
                                    max={100}
                                    step={1}
                                    onValueChange={(val) => setFormData({ ...formData, reduction_percentage: val[0] })}
                                    className="py-4"
                                />
                                <p className="text-xs text-slate-500">
                                    Slide to adjust the proposed reduction percentage for the target pollutant.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-50/50 pt-6 pb-6 border-t border-slate-100">
                            <Button
                                onClick={handleSimulate}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md font-semibold h-12 text-lg rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Simulating Impact...
                                    </>
                                ) : (
                                    <>
                                        Run AI Simulation
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Results Panel */}
                    <div className="space-y-6">
                        {!result ? (
                            <Card className="h-full min-h-[500px] border-dashed border-2 border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center p-8 shadow-sm">
                                <div className="h-20 w-20 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                    <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Awaiting Scenario</h3>
                                <p className="text-slate-500 max-w-[300px]">
                                    Configure your parameters on the left and run the simulation to see the AI-generated impact analysis.
                                </p>
                            </Card>
                        ) : (
                            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-500">
                                <Card className="border-slate-200 shadow-md border-t-4 border-t-emerald-500 overflow-hidden">
                                    <CardHeader className="pb-3 bg-emerald-50/30">
                                        <CardTitle className="text-lg flex items-center text-emerald-800">
                                            <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                            Impact Projection
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4 pb-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-center">
                                                <span className="text-sm font-medium text-slate-500 mb-1">Current Risk Score</span>
                                                <div className="flex items-end">
                                                    <span className="text-3xl font-bold text-slate-800">{result.scenario.current_risk_score}</span>
                                                    <span className="text-sm text-slate-500 ml-1 mb-1">/100</span>
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col justify-center relative overflow-hidden">
                                                <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full"></div>
                                                <span className="text-sm font-medium text-emerald-800 mb-1">Est. New Score</span>
                                                <div className="flex items-end text-emerald-600">
                                                    <span className="text-3xl font-bold">{result.baseline_calculation.estimated_new_score}</span>
                                                    <span className="text-sm ml-1 mb-1 font-medium">/100</span>
                                                </div>
                                                <div className="absolute top-4 right-4 text-emerald-500 font-bold text-sm">
                                                    -{((result.scenario.current_risk_score - result.baseline_calculation.estimated_new_score) / result.scenario.current_risk_score * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-200 shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                    <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-lg flex items-center text-slate-800">
                                                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                </svg>
                                                AI Executive Summary
                                            </CardTitle>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Gemini 1.5 Pro</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="prose prose-slate prose-sm max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-strong:text-slate-800 prose-li:text-slate-600">
                                            <ReactMarkdown>{result.ai_analysis}</ReactMarkdown>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

// Simple Badge component to avoid creating a new file if not needed
function Badge({ children, className }: { children: React.ReactNode; className?: string; variant?: "default" | "outline" }) {
    return (
        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
            {children}
        </div>
    )
}
