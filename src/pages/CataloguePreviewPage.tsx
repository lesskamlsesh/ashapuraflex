import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, ShoppingCart, ArrowLeft, X, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

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

const CataloguePreviewPage = () => {
  const { catalogueId } = useParams<{ catalogueId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [pdfPages, setPdfPages] = useState<CataloguePageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set<number>());
  const [currentPage, setCurrentPage] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  useEffect(() => {
    if (catalogueId) {
      loadCatalogue();
    }
  }, [catalogueId]);

  // Optimized PDF loading with lazy loading
  const loadCatalogue = async () => {
    if (!catalogueId) return;
    
    setIsLoading(true);
    
    try {
      // First fetch catalogue data
      const { data: catalogueData, error } = await supabase
        .from('catalogues')
        .select('*')
        .eq('id', catalogueId)
        .single();

      if (error) throw error;
      setCatalogue(catalogueData);

      // Load PDF document
      const response = await fetch(catalogueData.file_url);
      const arrayBuffer = await response.arrayBuffer();
      const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(pdf);

      // Load first few pages immediately
      const initialPages = Math.min(pdf.numPages, isMobile ? 2 : 4);
      const pages: CataloguePageData[] = [];

      for (let i = 1; i <= initialPages; i++) {
        const pageData = await renderPage(pdf, i);
        pages.push(pageData);
      }

      setPdfPages(pages);
    } catch (error) {
      console.error('Error loading catalogue:', error);
      toast({
        title: "Error",
        description: "Failed to load catalogue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Optimized page rendering
  const renderPage = async (pdf: any, pageNumber: number): Promise<CataloguePageData> => {
    const page = await pdf.getPage(pageNumber);
    const scale = isMobile ? 1.0 : 1.5; // Lower scale for mobile
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    return {
      pageNumber,
      dataUrl: canvas.toDataURL('image/jpeg', 0.8), // Use JPEG with compression
      aspectRatio: viewport.width / viewport.height
    };
  };

  // Lazy load more pages when needed
  const loadMorePages = async () => {
    if (!pdfDoc || pdfPages.length >= pdfDoc.numPages) return;

    const nextBatch = Math.min(
      pdfDoc.numPages,
      pdfPages.length + (isMobile ? 2 : 4)
    );

    const newPages: CataloguePageData[] = [];
    for (let i = pdfPages.length + 1; i <= nextBatch; i++) {
      const pageData = await renderPage(pdfDoc, i);
      newPages.push(pageData);
    }

    setPdfPages(prev => [...prev, ...newPages]);
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

  const navigateToCart = () => {
    const selectedArray = Array.from(selectedItems);
    navigate('/cart', { 
      state: { 
        catalogueId,
        selectedPages: selectedArray,
        catalogueName: catalogue?.name 
      } 
    });
  };

  // Memoized grid layout for performance
  const gridCols = useMemo(() => {
    return isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3';
  }, [isMobile]);

  if (!catalogue && !isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Catalogue not found</h2>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-optimized header */}
      <div className="bg-card shadow-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Back</span>}
              </Button>
              <div className="min-w-0">
                <h1 className="text-sm md:text-lg font-bold text-foreground truncate">
                  {catalogue?.name || 'Loading...'}
                </h1>
                {catalogue && (
                  <p className="text-xs text-muted-foreground">
                    {pdfPages.length}/{catalogue.page_count} pages loaded
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedItems.size > 0 && (
                <Button
                  onClick={navigateToCart}
                  size={isMobile ? "sm" : "default"}
                  className="relative"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {!isMobile && <span className="ml-2">Cart</span>}
                  <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {selectedItems.size}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading catalogue...</p>
          </div>
        </div>
      )}

      {/* PDF Pages Grid */}
      {pdfPages.length > 0 && (
        <div className="max-w-7xl mx-auto p-4">
          <div className={`grid ${gridCols} gap-4`}>
            {pdfPages.map((page) => (
              <div
                key={page.pageNumber}
                className={`relative group bg-card rounded-lg shadow-sm border border-border overflow-hidden transition-all duration-200 hover:shadow-md ${
                  selectedItems.has(page.pageNumber) 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : ''
                }`}
              >
                <div className="relative">
                  <img
                    src={page.dataUrl}
                    alt={`Page ${page.pageNumber}`}
                    className="w-full h-auto"
                    loading="lazy"
                  />
                  
                  {/* Selection overlay */}
                  <div 
                    className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                    onClick={() => toggleItemSelection(page.pageNumber)}
                  >
                    <div className={`rounded-full p-2 transition-all ${
                      selectedItems.has(page.pageNumber) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-background/90 text-foreground'
                    }`}>
                      {selectedItems.has(page.pageNumber) ? (
                        <Minus className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  {/* Page number */}
                  <div className="absolute top-2 left-2 bg-background/90 text-foreground text-xs px-2 py-1 rounded">
                    Page {page.pageNumber}
                  </div>

                  {/* Selected indicator */}
                  {selectedItems.has(page.pageNumber) && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                      ✓
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Load more button */}
          {pdfDoc && pdfPages.length < pdfDoc.numPages && (
            <div className="text-center mt-8">
              <Button
                onClick={loadMorePages}
                variant="outline"
                size={isMobile ? "sm" : "default"}
              >
                Load More Pages ({pdfDoc.numPages - pdfPages.length} remaining)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Floating cart button for mobile */}
      {isMobile && selectedItems.size > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={navigateToCart}
            size="lg"
            className="rounded-full shadow-lg relative"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-6 w-6 flex items-center justify-center">
              {selectedItems.size}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default CataloguePreviewPage;