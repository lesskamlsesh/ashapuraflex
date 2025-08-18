import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, User, Trash2, UserCheck, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Designer {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

interface DesignerManagementProps {
  onDesignersUpdate?: () => void;
}

type UserRole = 'designer' | 'admin' | 'manager' | 'finance';

const DesignerManagement: React.FC<DesignerManagementProps> = ({ onDesignersUpdate }) => {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDesigner, setNewDesigner] = useState<{
    email: string;
    name: string;
    role: UserRole;
  }>({
    email: '',
    name: '',
    role: 'designer'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDesigners();
  }, []);

  const loadDesigners = async () => {
    try {
      setIsLoading(true);
      
      // Get all users with designer role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .eq('role', 'designer');

      if (roleError) throw roleError;

      // Since we can't directly query auth.users, we'll create a profiles table approach
      // For now, we'll just use the user_id and simulate user data
      const designersData = roleData?.map(role => ({
        id: role.user_id,
        user_id: role.user_id,
        email: `user-${role.user_id.slice(0, 8)}@example.com`, // Placeholder
        name: `Designer ${role.user_id.slice(0, 8)}`, // Placeholder
        role: role.role,
        created_at: role.created_at
      })) || [];

      setDesigners(designersData);
    } catch (error: any) {
      console.error('Error loading designers:', error);
      toast({
        title: "Error",
        description: "Failed to load designers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addDesigner = async () => {
    if (!newDesigner.email || !newDesigner.name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // For demo purposes, we'll create a mock user ID
      // In a real app, you'd invite the user through Supabase Auth
      const mockUserId = crypto.randomUUID();

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: mockUserId,
          role: newDesigner.role
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Designer added successfully",
      });

      setNewDesigner({ email: '', name: '', role: 'designer' });
      setIsDialogOpen(false);
      loadDesigners();
      onDesignersUpdate?.();
    } catch (error: any) {
      console.error('Error adding designer:', error);
      toast({
        title: "Error",
        description: "Failed to add designer",
        variant: "destructive",
      });
    }
  };

  const removeDesigner = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'designer');

      if (error) throw error;

      toast({
        title: "Success",
        description: "Designer removed successfully",
      });

      loadDesigners();
      onDesignersUpdate?.();
    } catch (error: any) {
      console.error('Error removing designer:', error);
      toast({
        title: "Error",
        description: "Failed to remove designer",
        variant: "destructive",
      });
    }
  };

  const updateDesignerRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Designer role updated successfully",
      });

      loadDesigners();
      onDesignersUpdate?.();
    } catch (error: any) {
      console.error('Error updating designer role:', error);
      toast({
        title: "Error",
        description: "Failed to update designer role",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Designer Management
            </CardTitle>
            <p className="text-muted-foreground text-sm mt-1">
              Manage designers who can be assigned to jobs
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Designer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Designer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="designer@example.com"
                    value={newDesigner.email}
                    onChange={(e) => setNewDesigner({...newDesigner, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    placeholder="Designer Name"
                    value={newDesigner.name}
                    onChange={(e) => setNewDesigner({...newDesigner, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <Select value={newDesigner.role} onValueChange={(value: UserRole) => setNewDesigner({...newDesigner, role: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="designer">Designer</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={addDesigner} className="flex-1">
                    Add Designer
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading designers...</p>
          </div>
        ) : designers.length === 0 ? (
          <div className="text-center py-8">
            <UserCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Designers Found</h3>
            <p className="text-muted-foreground mb-4">Add designers to assign jobs to them</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Designer
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {designers.map((designer) => (
                <TableRow key={designer.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {designer.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {designer.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {designer.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(designer.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select 
                        value={designer.role} 
                        onValueChange={(value: UserRole) => updateDesignerRole(designer.user_id, value)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="designer">Designer</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDesigner(designer.user_id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default DesignerManagement;