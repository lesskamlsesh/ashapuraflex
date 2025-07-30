import React, { useState, useEffect } from 'react';
import { Upload, FileText, Settings, Trash2, Edit, LogOut, Mail, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Catalogue {
  id: string;
  name: string;
  file_url: string;
  file_size: number;
  page_count: number;
  uploaded_at: string;
}

interface Order {
  id: string;
  catalogue_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
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
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [editingCatalogue, setEditingCatalogue] = useState<Catalogue | null>(null);
  const [newCatalogueName, setNewCatalogueName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadCatalogues();
    loadOrders();
    loadSettings();
  }, []);

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
              <div>
                <label className="block text-sm font-medium mb-2">PDF File</label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </div>
              {isUploading && (
                <p className="text-sm text-muted-foreground">Uploading and processing PDF...</p>
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
              <CardTitle>Customer Orders ({orders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Catalogue</TableHead>
                      <TableHead>Selected Pages</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>{order.customer_email}</TableCell>
                        <TableCell>{order.catalogues?.name}</TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {order.selected_pages.length} pages: {order.selected_pages.slice(0, 5).join(', ')}
                            {order.selected_pages.length > 5 && '...'}
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