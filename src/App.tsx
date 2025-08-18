import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import CataloguePreviewPage from "./pages/CataloguePreviewPage";
import CartPage from "./pages/CartPage";
import Navigation from "./components/Navigation";
import AdminDashboard from "./components/dashboards/AdminDashboard";
import ManagerDashboard from "./components/dashboards/ManagerDashboard";
import DesignerDashboard from "./components/dashboards/DesignerDashboard";
import FinanceDashboard from "./components/dashboards/FinanceDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Navigation />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/catalogue/:catalogueId" element={<CataloguePreviewPage />} />
            <Route path="/cart" element={<CartPage />} />
            
            {/* Direct dashboard access routes */}
            <Route path="/dashboard/admin" element={<AdminDashboard onLogout={() => window.location.href = '/'} />} />
            <Route path="/dashboard/manager" element={<ManagerDashboard onLogout={() => window.location.href = '/'} />} />
            <Route path="/dashboard/designer" element={<DesignerDashboard user={null} onLogout={() => window.location.href = '/'} />} />
            <Route path="/dashboard/finance" element={<FinanceDashboard onLogout={() => window.location.href = '/'} />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
