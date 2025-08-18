import React, { useState, useEffect } from 'react';
import { FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import AdminLogin from './AdminLogin';
import AdminPanel from './AdminPanel';
import CatalogueCard from './CatalogueCard';

interface Catalogue {
  id: string;
  name: string;
  file_url: string;
  file_size: number;
  page_count: number;
  uploaded_at: string;
  cover_page?: number;
}

interface CataloguePageData {
  pageNumber: number;
  dataUrl: string;
  aspectRatio: number;
}

const CatalogueApp = () => {
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [currentView, setCurrentView] = useState<'home' | 'admin-login' | 'admin'>('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Load PDF.js on component mount
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    };
    document.head.appendChild(script);

    loadCatalogues();
  }, []);

  const loadCatalogues = async () => {
    const { data, error } = await supabase
      .from('catalogues')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error loading catalogues:', error);
    } else {
      setCatalogues(data || []);
    }
  };

  const selectCatalogue = (catalogue: Catalogue) => {
    navigate(`/catalogue/${catalogue.id}`);
  };


  const handleAdminLogin = () => {
    setIsAdmin(true);
    setCurrentView('admin');
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setCurrentView('home');
    loadCatalogues(); // Refresh catalogues list
  };

  if (currentView === 'admin-login') {
    return <AdminLogin onLogin={handleAdminLogin} />;
  }

  if (currentView === 'admin') {
    return <AdminPanel onLogout={handleAdminLogout} />;
  }

  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-4">
          <div className="text-center mb-8">
            <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-foreground mb-2`}>
              Digital Catalogue
            </h1>
            <p className="text-muted-foreground">Browse our catalogues and place your orders</p>
          </div>

          {/* Admin Access Button */}
          <div className="text-center mb-6">
            <Button
              variant="outline"
              onClick={() => setCurrentView('admin-login')}
              className="mb-4"
              size={isMobile ? "sm" : "default"}
            >
              <Settings className="h-4 w-4 mr-2" />
              Admin Access
            </Button>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-4 md:p-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-6 text-foreground">Available Catalogues</h2>
            
            {catalogues.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium text-foreground mb-2">No Catalogues Available</h3>
                <p className="text-muted-foreground">Please check back later or contact the administrator.</p>
              </div>
            ) : (
              <div className={`grid gap-4 md:gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {catalogues.map((catalogue) => (
                  <CatalogueCard 
                    key={catalogue.id} 
                    catalogue={catalogue} 
                    onSelect={() => selectCatalogue(catalogue)} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Return the main view
  return null; // This component now only handles admin login/admin panel views
};

export default CatalogueApp;