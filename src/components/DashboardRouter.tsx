import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminDashboard from './dashboards/AdminDashboard';
import ManagerDashboard from './dashboards/ManagerDashboard';
import DesignerDashboard from './dashboards/DesignerDashboard';
import FinanceDashboard from './dashboards/FinanceDashboard';

interface DashboardRouterProps {
  user: any;
  onLogout: () => void;
}

type UserRole = 'admin' | 'manager' | 'designer' | 'finance';

const DashboardRouter: React.FC<DashboardRouterProps> = ({ user, onLogout }) => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    getUserRole();
  }, [user]);

  const getUserRole = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no role found, default to admin for now
        console.warn('No user role found, defaulting to admin:', error);
        setUserRole('admin');
        return;
      }

      setUserRole(data.role as UserRole);
    } catch (error: any) {
      console.error('Error getting user role:', error);
      toast({
        title: "Error",
        description: "Failed to determine user role. Defaulting to admin.",
        variant: "destructive",
      });
      setUserRole('admin');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading your dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-lg font-medium">No Role Assigned</div>
              <p className="text-muted-foreground mt-2">
                Please contact your administrator to assign you a role.
              </p>
              <button 
                onClick={onLogout}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on user role
  switch (userRole) {
    case 'admin':
      return <AdminDashboard onLogout={onLogout} />;
    case 'manager':
      return <ManagerDashboard onLogout={onLogout} />;
    case 'designer':
      return <DesignerDashboard user={user} onLogout={onLogout} />;
    case 'finance':
      return <FinanceDashboard onLogout={onLogout} />;
    default:
      return <AdminDashboard onLogout={onLogout} />;
  }
};

export default DashboardRouter;