import React, { useState, useEffect } from 'react';
import { FileText, ShoppingCart, Send, X, Check, Eye, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  const [selectedCatalogue, setSelectedCatalogue] = useState<Catalogue | null>(null);
  const [pdfPages, setPdfPages] = useState<CataloguePageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set<number>());
  const [currentView, setCurrentView] = useState<'home' | 'catalogue' | 'cart' | 'admin-login' | 'admin'>('home');
  const [customerInfo, setCustomerInfo] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    company_name: '', 
    address: '', 
    notes: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

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

  const loadCatalogue = async (catalogue: Catalogue) => {
    setIsLoading(true);
    setSelectedCatalogue(catalogue);

    try {
      const response = await fetch(catalogue.file_url);
      const arrayBuffer = await response.arrayBuffer();
      const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages: CataloguePageData[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        // Calculate aspect ratio for dynamic layout
        const aspectRatio = viewport.width / viewport.height;

        pages.push({
          pageNumber: i,
          dataUrl: canvas.toDataURL(),
          aspectRatio: aspectRatio
        });
      }

      setPdfPages(pages);
      setCurrentView('catalogue');
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast({
        title: "Error",
        description: "Failed to load catalogue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemSelection = (pageNumber: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(pageNumber)) {
      newSelected.delete(pageNumber);
    } else {
      newSelected.add(pageNumber);
    }
    setSelectedItems(newSelected);
  };

  const handleSubmitOrder = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one item",
        variant: "destructive",
      });
      return;
    }
    
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Name, Email, Phone)",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCatalogue) {
      toast({
        title: "Error",
        description: "No catalogue selected",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Save order to database
      const { data: orderData, error } = await supabase
        .from('orders')
        .insert({
          catalogue_id: selectedCatalogue.id,
          catalogue_name: selectedCatalogue.name,
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          company_name: customerInfo.company_name,
          address: customerInfo.address,
          notes: customerInfo.notes,
          selected_pages: Array.from(selectedItems).sort((a, b) => a - b),
        })
        .select()
        .single();

      if (error) throw error;

      // Call edge function to send notification email
      try {
        await supabase.functions.invoke('send-order-notification', {
          body: { order_id: orderData.id }
        });
      } catch (emailError) {
        console.warn('Failed to send notification email:', emailError);
        // Don't fail the order if email fails
      }
      
      setShowSuccess(true);
      
      // Auto-reset after 3 seconds
      setTimeout(() => {
        setSelectedItems(new Set());
        setCustomerInfo({ 
          name: '', 
          email: '', 
          phone: '', 
          company_name: '', 
          address: '', 
          notes: '' 
        });
        setShowSuccess(false);
        setCurrentView('home');
      }, 3000);
    } catch (error) {
      console.error('Error submitting order:', error);
      toast({
        title: "Error",
        description: "Failed to submit order. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const resetApp = () => {
    setSelectedCatalogue(null);
    setPdfPages([]);
    setSelectedItems(new Set());
    setCurrentView('home');
    setCustomerInfo({ 
      name: '', 
      email: '', 
      phone: '', 
      company_name: '', 
      address: '', 
      notes: '' 
    });
    setIsSubmitting(false);
    setShowSuccess(false);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Digital Catalogue</h1>
            <p className="text-gray-600">Browse our catalogues and place your orders</p>
          </div>

          {/* Admin Access Button */}
          <div className="text-center mb-6">
            <Button
              variant="outline"
              onClick={() => setCurrentView('admin-login')}
              className="mb-4"
            >
              <Settings className="h-4 w-4 mr-2" />
              Admin Access
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6">Available Catalogues</h2>
            
            {catalogues.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-medium text-gray-700 mb-2">No Catalogues Available</h3>
                <p className="text-gray-500">Please check back later or contact the administrator.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {catalogues.map((catalogue) => (
                  <CatalogueCard 
                    key={catalogue.id} 
                    catalogue={catalogue} 
                    onSelect={() => loadCatalogue(catalogue)} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'cart') {
    if (showSuccess) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-8 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Congratulations!</h2>
            <p className="text-gray-600 mb-4">Your order has been confirmed successfully!</p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Redirecting...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Your Selection</h2>
              <Button
                variant="outline"
                onClick={() => setCurrentView('catalogue')}
                disabled={isSubmitting}
              >
                <Eye className="h-5 w-5 mr-2" />
                Back to Catalogue
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Selected Items ({selectedItems.size})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Array.from(selectedItems).sort((a, b) => a - b).map(pageNum => (
                    <div key={pageNum} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium">Page {pageNum}</span>
                      <button
                        onClick={() => toggleItemSelection(pageNum)}
                        className="text-red-600 hover:text-red-700"
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Full Name *"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    disabled={isSubmitting}
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Email Address *"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    disabled={isSubmitting}
                    required
                  />
                  <Input
                    type="tel"
                    placeholder="Phone Number *"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    disabled={isSubmitting}
                    required
                  />
                  <Input
                    type="text"
                    placeholder="Company Name (Optional)"
                    value={customerInfo.company_name}
                    onChange={(e) => setCustomerInfo({...customerInfo, company_name: e.target.value})}
                    disabled={isSubmitting}
                  />
                  <Input
                    type="text"
                    placeholder="Address (Optional)"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                    disabled={isSubmitting}
                  />
                  <Input
                    type="text"
                    placeholder="Notes (Optional)"
                    value={customerInfo.notes}
                    onChange={(e) => setCustomerInfo({...customerInfo, notes: e.target.value})}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button
                onClick={handleSubmitOrder}
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Submit Order
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={resetApp}
                disabled={isSubmitting}
              >
                Start Over
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Catalogue view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-800">{selectedCatalogue?.name}</h1>
                <p className="text-sm text-gray-500">{pdfPages.length} pages available</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setCurrentView('cart')}
                className="relative"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart ({selectedItems.size})
              </Button>
              <Button
                variant="outline"
                onClick={resetApp}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading catalogue...</p>
          </div>
        </div>
      )}

      {/* Catalogue Grid */}
      {!isLoading && (
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pdfPages.map((page) => (
              <div
                key={page.pageNumber}
                className={`relative bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                  selectedItems.has(page.pageNumber) ? 'ring-4 ring-blue-500' : ''
                }`}
                onClick={() => toggleItemSelection(page.pageNumber)}
              >
                <div 
                  className="relative w-full"
                  style={{ aspectRatio: page.aspectRatio }}
                >
                  <img
                    src={page.dataUrl}
                    alt={`Page ${page.pageNumber}`}
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Selection Overlay */}
                  {selectedItems.has(page.pageNumber) && (
                    <div className="absolute inset-0 bg-blue-600 bg-opacity-20 flex items-center justify-center">
                      <div className="bg-blue-600 text-white rounded-full p-2">
                        <Check className="h-6 w-6" />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="font-medium text-gray-800">Page {page.pageNumber}</h3>
                  <p className="text-sm text-gray-500">Click to select</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Order Button */}
      {selectedItems.size > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={() => setCurrentView('cart')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 transition-all hover:scale-105 animate-fade-in"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="font-semibold">Order ({selectedItems.size})</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CatalogueApp;