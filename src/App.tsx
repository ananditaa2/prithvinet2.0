import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/dashboard/ProtectedRoute";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import CitizenPortal from "./pages/Citizen";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import Overview from "./pages/dashboard/Overview";
import Industries from "./pages/dashboard/Industries";
import Locations from "./pages/dashboard/Locations";
import Alerts from "./pages/dashboard/Alerts";
import Reports from "./pages/dashboard/Reports";
import AITools from "./pages/dashboard/AITools";
import HeatmapView from "./pages/dashboard/HeatmapView";
import InspectionPriority from "./pages/dashboard/InspectionPriority";
import CasesToAct from "./pages/dashboard/CasesToAct";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/public" element={<CitizenPortal />} />

              {/* Protected Dashboard */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Overview />} />
                <Route path="industries" element={<Industries />} />
                <Route path="locations" element={<Locations />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="inspection-priority" element={<InspectionPriority />} />
                <Route path="cases-to-act" element={<CasesToAct />} />
                <Route path="reports" element={<Reports />} />
                <Route path="ai" element={<AITools />} />
                <Route path="heatmap" element={<HeatmapView />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
