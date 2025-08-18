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
    <div className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1">
      <div className="relative h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        {isLoadingCover ? (
          <div className="flex flex-col items-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <span className="text-sm">Loading preview...</span>
          </div>
        ) : coverImage ? (
          <img
            src={coverImage}
            alt={`${catalogue.name} cover`}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <FileText className="h-20 w-20 text-blue-400" />
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white rounded-full p-3 transform scale-90 group-hover:scale-100 transition-transform">
            <Eye className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {catalogue.name}
          </h3>
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span className="flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              {catalogue.page_count} pages
            </span>
            <span>{formatFileSize(catalogue.file_size)}</span>
          </div>
          <p className="text-xs text-gray-400">
            Uploaded: {new Date(catalogue.uploaded_at).toLocaleDateString()}
          </p>
        </div>
        
        <Button 
          onClick={onSelect}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 rounded-lg transition-all duration-200"
        >
          Browse Catalogue
        </Button>
      </div>
    </div>
  );
};

export default CatalogueCard;