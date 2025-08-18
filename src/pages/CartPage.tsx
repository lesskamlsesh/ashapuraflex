import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, X, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

const CartPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [catalogueId, setCatalogueId] = useState<string>('');
  const [catalogueName, setCatalogueName] = useState<string>('');
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

  useEffect(() => {
    if (location.state) {
      const { catalogueId: id, selectedPages: pages, catalogueName: name } = location.state;
      setCatalogueId(id || '');
      setSelectedPages(pages || []);
      setCatalogueName(name || '');
    }
  }, [location.state]);

  const removeItem = (pageNumber: number) => {
    setSelectedPages(prev => prev.filter(p => p !== pageNumber));
  };

  const clearCart = () => {
    setSelectedPages([]);
  };

  const handleSubmitOrder = async () => {
    if (selectedPages.length === 0) {
      toast({
        title: "Error",
        description: "Your cart is empty",
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

    if (!catalogueId) {
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
          catalogue_id: catalogueId,
          catalogue_name: catalogueName,
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          company_name: customerInfo.company_name,
          address: customerInfo.address,
          notes: customerInfo.notes,
          selected_pages: selectedPages.sort((a, b) => a - b),
        })
        .select()
        .single();

      if (error) throw error;

      // Call edge function to send notification email
      try {
        const notificationResult = await supabase.functions.invoke('send-order-notification', {
          body: { order_id: orderData.id }
        });
        
        if (notificationResult.error) {
          console.error('Notification function error:', notificationResult.error);
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
      }
      
      setShowSuccess(true);
      
      // Auto-redirect after 3 seconds
      setTimeout(() => {
        navigate('/');
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

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-xl p-8 text-center max-w-md mx-auto border border-border">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Order Submitted!</h2>
          <p className="text-muted-foreground mb-4">Your order has been confirmed successfully!</p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Back</span>}
              </Button>
              <h1 className="text-lg md:text-xl font-bold text-foreground">
                Shopping Cart
              </h1>
            </div>
            
            {selectedPages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Clear</span>}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-card rounded-xl shadow-sm border border-border p-4 md:p-6">
          {selectedPages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">Your cart is empty</div>
              <Button onClick={() => navigate('/')} variant="outline">
                Browse Catalogues
              </Button>
            </div>
          ) : (
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'md:grid-cols-2 gap-8'}`}>
              {/* Selected Items */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground">
                  Selected Items ({selectedPages.length})
                </h3>
                <div className="space-y-2 max-h-64 md:max-h-96 overflow-y-auto">
                  {selectedPages.sort((a, b) => a - b).map(pageNum => (
                    <div key={pageNum} className="flex items-center justify-between bg-muted p-3 rounded-lg">
                      <div>
                        <span className="font-medium text-foreground">Page {pageNum}</span>
                        <p className="text-sm text-muted-foreground">{catalogueName}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(pageNum)}
                        className="text-destructive hover:text-destructive/80"
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground">Customer Information</h3>
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
                  <Textarea
                    placeholder="Notes (Optional)"
                    value={customerInfo.notes}
                    onChange={(e) => setCustomerInfo({...customerInfo, notes: e.target.value})}
                    disabled={isSubmitting}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {selectedPages.length > 0 && (
            <div className="flex flex-col md:flex-row gap-4 mt-8">
              <Button
                onClick={handleSubmitOrder}
                className="flex-1"
                disabled={isSubmitting}
                size={isMobile ? "lg" : "default"}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Order
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                disabled={isSubmitting}
                size={isMobile ? "lg" : "default"}
              >
                Continue Shopping
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartPage;