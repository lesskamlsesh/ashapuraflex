import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, Settings, Trash2, Edit, LogOut, Mail, Download, Search, Filter, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PDFDocument } from 'pdf-lib';

interface Catalogue {
  id: string;
  name: string;
  file_url: string;
  file_size: number;
  page_count: number;
  uploaded_at: string;
  cover_page: number;
}

interface Order {
  id: string;
  catalogue_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company_name?: string;
  address?: string;
  notes?: string;
  selected_pages: number[];
  status: string;
  created_at: string;
  catalogues?: { name: string };
}

interface AdminPanelProps {
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'orders' | 'settings'>('upload');
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [editingCatalogue, setEditingCatalogue] = useState<Catalogue | null>(null);
  const [newCatalogueName, setNewCatalogueName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  useEffect(() => {
    loadCatalogues();
    loadOrders();
    loadSettings();
  }, []);

  useEffect(() => {
    filterAndSortOrders();
  }, [orders, searchTerm, statusFilter, sortBy, sortOrder]);

  const loadCatalogues = async () => {
    const { data, error } = await supabase
      .from('catalogues')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load catalogues",
        variant: "destructive",
      });
    } else {
      setCatalogues(data || []);
    }
  };

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        catalogues (name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } else {
      setOrders(data || []);
    }
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'recipient_email')
      .single();

    if (error) {
      console.error('Error loading settings:', error);
    } else {
      setRecipientEmail(data?.setting_value || '');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      toast({
        title: "Error",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('catalogues')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get PDF page count using PDF.js
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageCount = pdf.numPages;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('catalogues')
        .getPublicUrl(fileName);

      // Save catalogue metadata to database
      const { error: dbError } = await supabase
        .from('catalogues')
        .insert({
          name: newCatalogueName || file.name.replace('.pdf', ''),
          file_url: publicUrl,
          file_size: file.size,
          page_count: pageCount,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Catalogue uploaded successfully",
      });

      setNewCatalogueName('');
      loadCatalogues();
      
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload catalogue",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCatalogue = async (id: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this catalogue?')) return;

    try {
      // Extract file name from URL
      const fileName = fileUrl.split('/').pop();
      
      // Delete from storage
      if (fileName) {
        await supabase.storage
          .from('catalogues')
          .remove([fileName]);
      }

      // Delete from database
      const { error } = await supabase
        .from('catalogues')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Catalogue deleted successfully",
      });

      loadCatalogues();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete catalogue",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCatalogue = async () => {
    if (!editingCatalogue) return;

    try {
      const { error } = await supabase
        .from('catalogues')
        .update({ name: editingCatalogue.name })
        .eq('id', editingCatalogue.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Catalogue updated successfully",
      });

      setEditingCatalogue(null);
      loadCatalogues();
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: "Failed to update catalogue",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRecipientEmail = async () => {
    try {
      const { error } = await supabase
        .from('admin_settings')
        .update({ setting_value: recipientEmail })
        .eq('setting_key', 'recipient_email');

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recipient email updated successfully",
      });
    } catch (error) {
      console.error('Email update error:', error);
      toast({
        title: "Error",
        description: "Failed to update recipient email",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filterAndSortOrders = useCallback(() => {
    let filtered = orders;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.catalogues?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Sort orders
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'customer_name':
          aValue = a.customer_name;
          bValue = b.customer_name;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'catalogue_name':
          aValue = a.catalogues?.name || '';
          bValue = b.catalogues?.name || '';
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, sortBy, sortOrder]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');

    if (pdfFile) {
      handleFileUploadFromDrop(pdfFile);
    } else {
      toast({
        title: "Error",
        description: "Please drop a PDF file",
        variant: "destructive",
      });
    }
  }, []);

  const handleFileUploadFromDrop = async (file: File) => {
    setIsUploading(true);

    try {
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('catalogues')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get PDF page count using PDF.js
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageCount = pdf.numPages;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('catalogues')
        .getPublicUrl(fileName);

      // Save catalogue metadata to database
      const { error: dbError } = await supabase
        .from('catalogues')
        .insert({
          name: newCatalogueName || file.name.replace('.pdf', ''),
          file_url: publicUrl,
          file_size: file.size,
          page_count: pageCount,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Catalogue uploaded successfully",
      });

      setNewCatalogueName('');
      loadCatalogues();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload catalogue",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order deleted successfully",
      });

      loadOrders();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    }
  };

  const downloadOrderPDF = async (order: Order) => {
    try {
      // Get the catalogue
      const catalogue = catalogues.find(c => c.id === order.catalogue_id);
      if (!catalogue) {
        toast({
          title: "Error",
          description: "Catalogue not found",
          variant: "destructive",
        });
        return;
      }

      // Download the original PDF
      const response = await fetch(catalogue.file_url);
      const pdfBytes = await response.arrayBuffer();
      
      // Load the PDF
      const originalPdf = await PDFDocument.load(pdfBytes);
      
      // Create a new PDF with only selected pages
      const newPdf = await PDFDocument.create();
      
      // Copy selected pages to the new PDF
      const pageIndices = order.selected_pages.map(pageNum => pageNum - 1); // Convert to 0-based index
      const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
      
      // Add pages to the new PDF
      copiedPages.forEach((page) => newPdf.addPage(page));
      
      // Serialize the PDF
      const newPdfBytes = await newPdf.save();
      
      // Create download
      const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${order.customer_name}-selected-pages-${order.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "PDF with selected pages downloaded",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { key: 'upload', label: 'Upload PDF', icon: Upload },
              { key: 'manage', label: 'Manage Catalogues', icon: FileText },
              { key: 'orders', label: 'Orders', icon: Download },
              { key: 'settings', label: 'Settings', icon: Settings },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>Upload New Catalogue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Catalogue Name</label>
                <Input
                  placeholder="Enter catalogue name (optional)"
                  value={newCatalogueName}
                  onChange={(e) => setNewCatalogueName(e.target.value)}
                />
              </div>
              
              {/* Drag and Drop Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drag and drop your PDF here
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Or click below to browse files
                </p>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="max-w-xs mx-auto"
                />
              </div>
              
              {isUploading && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-muted-foreground">Uploading and processing PDF...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'manage' && (
          <Card>
            <CardHeader>
              <CardTitle>Manage Catalogues ({catalogues.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Pages</TableHead>
                      <TableHead>File Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catalogues.map((catalogue) => (
                      <TableRow key={catalogue.id}>
                        <TableCell>
                          {editingCatalogue?.id === catalogue.id ? (
                            <Input
                              value={editingCatalogue.name}
                              onChange={(e) =>
                                setEditingCatalogue({
                                  ...editingCatalogue,
                                  name: e.target.value,
                                })
                              }
                              onBlur={handleUpdateCatalogue}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateCatalogue();
                                if (e.key === 'Escape') setEditingCatalogue(null);
                              }}
                              autoFocus
                            />
                          ) : (
                            catalogue.name
                          )}
                        </TableCell>
                        <TableCell>{catalogue.page_count}</TableCell>
                        <TableCell>{formatFileSize(catalogue.file_size)}</TableCell>
                        <TableCell>{formatDate(catalogue.uploaded_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingCatalogue(catalogue)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCatalogue(catalogue.id, catalogue.file_url)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'orders' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Customer Orders ({filteredOrders.length})</span>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processed">Processed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Date</SelectItem>
                      <SelectItem value="customer_name">Customer</SelectItem>
                      <SelectItem value="catalogue_name">Catalogue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Catalogue</TableHead>
                      <TableHead>Pages</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customer_name}</div>
                            {order.company_name && (
                              <div className="text-sm text-gray-500">{order.company_name}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{order.customer_email}</div>
                            <div className="text-gray-500">{order.customer_phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>{order.catalogues?.name}</TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {order.selected_pages.length} pages: {order.selected_pages.slice(0, 3).join(', ')}
                            {order.selected_pages.length > 3 && '...'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'processed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(order.created_at)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => downloadOrderPDF(order)}>
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteOrder(order.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Recipient Email
                </label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter recipient email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                  <Button onClick={handleUpdateRecipientEmail}>
                    Update
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  This email will receive all customer orders
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;