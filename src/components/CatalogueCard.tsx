import React, { useState, useEffect } from 'react';
import { FileText, Eye, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Catalogue {
  id: string;
  name: string;
  file_url: string;
  file_size: number;
  page_count: number;
  uploaded_at: string;
  cover_page?: number;
}

interface CatalogueCardProps {
  catalogue: Catalogue;
  onSelect: () => void;
}

const CatalogueCard: React.FC<CatalogueCardProps> = ({ catalogue, onSelect }) => {
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isLoadingCover, setIsLoadingCover] = useState(false);

  useEffect(() => {
    loadCoverImage();
  }, [catalogue]);

  const loadCoverImage = async () => {
    if (!catalogue.file_url) return;
    
    setIsLoadingCover(true);
    try {
      const response = await fetch(catalogue.file_url);
      const arrayBuffer = await response.arrayBuffer();
      const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Use cover_page if set, otherwise use page 1
      const pageNum = catalogue.cover_page || 1;
      const page = await pdf.getPage(Math.min(pageNum, pdf.numPages));
      const viewport = page.getViewport({ scale: 1.0 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      setCoverImage(canvas.toDataURL());
    } catch (error) {
      console.error('Error loading cover image:', error);
    } finally {
      setIsLoadingCover(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="group bg-card rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer transform hover:-translate-y-1">
      <div className="relative h-48 bg-muted/50 flex items-center justify-center">
        {isLoadingCover ? (
          <div className="flex flex-col items-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
            <span className="text-sm">Loading preview...</span>
          </div>
        ) : coverImage ? (
          <img
            src={coverImage}
            alt={`${catalogue.name} cover`}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <FileText className="h-20 w-20 text-muted-foreground" />
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-background rounded-full p-3 transform scale-90 group-hover:scale-100 transition-transform">
            <Eye className="h-6 w-6 text-primary" />
          </div>
        </div>
      </div>
      
      <div className="p-4 md:p-6">
        <div className="mb-4">
          <h3 className="text-base md:text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {catalogue.name}
          </h3>
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span className="flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              {catalogue.page_count} pages
            </span>
            <span>{formatFileSize(catalogue.file_size)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Uploaded: {new Date(catalogue.uploaded_at).toLocaleDateString()}
          </p>
        </div>
        
        <Button 
          onClick={onSelect}
          className="w-full"
          size="sm"
        >
          Browse Catalogue
        </Button>
      </div>
    </div>
  );
};

export default CatalogueCard;