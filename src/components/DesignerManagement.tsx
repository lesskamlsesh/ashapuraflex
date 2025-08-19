import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, User, Trash2, Edit, Mail, Phone, Award, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Designer {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  specialization?: string;
  skills?: string[];
  experience_years?: number;
  hourly_rate?: number;
  availability_status: string;
  bio?: string;
  role: string;
  created_at: string;
}

interface DesignerManagementProps {
  onDesignersUpdate?: () => void;
}

interface DesignerForm {
  full_name: string;
  email: string;
  phone: string;
  specialization: string;
  skills: string;
  experience_years: number;
  hourly_rate: number;
  availability_status: string;
  bio: string;
  role: 'designer' | 'admin' | 'manager' | 'finance';
}

const DesignerManagement: React.FC<DesignerManagementProps> = ({ onDesignersUpdate }) => {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDesigner, setEditingDesigner] = useState<Designer | null>(null);
  const [newDesigner, setNewDesigner] = useState<DesignerForm>({
    full_name: '',
    email: '',
    phone: '',
    specialization: '',
    skills: '',
    experience_years: 0,
    hourly_rate: 0,
    availability_status: 'available',
    bio: '',
    role: 'designer'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDesigners();
  }, []);

  const loadDesigners = async () => {
    try {
      setIsLoading(true);
      
      // Get all users with roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .in('role', ['designer', 'admin', 'manager']);

      if (roleError) throw roleError;

      // Get profiles for those users
      const userIds = roleData?.map(r => r.user_id) || [];
      
      if (userIds.length === 0) {
        setDesigners([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine role and profile data
      const designersData = roleData?.map(role => {
        const profile = profiles?.find(p => p.user_id === role.user_id);
        return {
          id: profile?.id || crypto.randomUUID(),
          user_id: role.user_id,
          full_name: profile?.full_name || 'No Name',
          email: profile?.email || 'No Email',
          phone: profile?.phone,
          specialization: profile?.specialization,
          skills: profile?.skills,
          experience_years: profile?.experience_years,
          hourly_rate: profile?.hourly_rate,
          availability_status: profile?.availability_status || 'available',
          bio: profile?.bio,
          role: role.role,
          created_at: role.created_at
        };
      }) || [];

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
    if (!newDesigner.full_name || !newDesigner.email) {
      toast({
        title: "Error",
        description: "Please fill in required fields (name and email)",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a mock user ID for demo purposes
      const mockUserId = crypto.randomUUID();

      // Insert into profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: mockUserId,
          full_name: newDesigner.full_name,
          email: newDesigner.email,
          phone: newDesigner.phone || null,
          specialization: newDesigner.specialization || null,
          skills: newDesigner.skills ? newDesigner.skills.split(',').map(s => s.trim()) : [],
          experience_years: newDesigner.experience_years || 0,
          hourly_rate: newDesigner.hourly_rate || null,
          availability_status: newDesigner.availability_status,
          bio: newDesigner.bio || null
        });

      if (profileError) throw profileError;

      // Insert into user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: mockUserId,
          role: newDesigner.role
        });

      if (roleError) throw roleError;

      toast({
        title: "Success",
        description: "Designer added successfully",
      });

      setNewDesigner({
        full_name: '',
        email: '',
        phone: '',
        specialization: '',
        skills: '',
        experience_years: 0,
        hourly_rate: 0,
        availability_status: 'available',
        bio: '',
        role: 'designer'
      });
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

  const updateDesigner = async () => {
    if (!editingDesigner) return;

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: newDesigner.full_name,
          email: newDesigner.email,
          phone: newDesigner.phone || null,
          specialization: newDesigner.specialization || null,
          skills: newDesigner.skills ? newDesigner.skills.split(',').map(s => s.trim()) : [],
          experience_years: newDesigner.experience_years || 0,
          hourly_rate: newDesigner.hourly_rate || null,
          availability_status: newDesigner.availability_status,
          bio: newDesigner.bio || null
        })
        .eq('user_id', editingDesigner.user_id);

      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: newDesigner.role })
        .eq('user_id', editingDesigner.user_id);

      if (roleError) throw roleError;

      toast({
        title: "Success",
        description: "Designer updated successfully",
      });

      setEditingDesigner(null);
      setIsDialogOpen(false);
      loadDesigners();
      onDesignersUpdate?.();
    } catch (error: any) {
      console.error('Error updating designer:', error);
      toast({
        title: "Error",
        description: "Failed to update designer",
        variant: "destructive",
      });
    }
  };

  const removeDesigner = async (userId: string) => {
    try {
      // Delete from user_roles (profile will be deleted via cascade if needed)
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

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

  const openEditDialog = (designer: Designer) => {
    setEditingDesigner(designer);
    setNewDesigner({
      full_name: designer.full_name,
      email: designer.email,
      phone: designer.phone || '',
      specialization: designer.specialization || '',
      skills: designer.skills?.join(', ') || '',
      experience_years: designer.experience_years || 0,
      hourly_rate: designer.hourly_rate || 0,
      availability_status: designer.availability_status,
      bio: designer.bio || '',
      role: designer.role as any
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setNewDesigner({
      full_name: '',
      email: '',
      phone: '',
      specialization: '',
      skills: '',
      experience_years: 0,
      hourly_rate: 0,
      availability_status: 'available',
      bio: '',
      role: 'designer'
    });
    setEditingDesigner(null);
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-red-100 text-red-800';
      case 'away': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Designer Management
            </CardTitle>
            <p className="text-muted-foreground text-sm mt-1">
              Manage designer profiles and assignments
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Designer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDesigner ? 'Edit Designer' : 'Add New Designer'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Full Name *</label>
                  <Input
                    placeholder="Designer full name"
                    value={newDesigner.full_name}
                    onChange={(e) => setNewDesigner({...newDesigner, full_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    placeholder="designer@example.com"
                    value={newDesigner.email}
                    onChange={(e) => setNewDesigner({...newDesigner, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    placeholder="+1 (555) 123-4567"
                    value={newDesigner.phone}
                    onChange={(e) => setNewDesigner({...newDesigner, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Specialization</label>
                  <Input
                    placeholder="UI/UX, Graphic Design, etc."
                    value={newDesigner.specialization}
                    onChange={(e) => setNewDesigner({...newDesigner, specialization: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Skills (comma-separated)</label>
                  <Input
                    placeholder="Figma, Photoshop, Sketch"
                    value={newDesigner.skills}
                    onChange={(e) => setNewDesigner({...newDesigner, skills: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Experience (years)</label>
                  <Input
                    type="number"
                    min="0"
                    value={newDesigner.experience_years}
                    onChange={(e) => setNewDesigner({...newDesigner, experience_years: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Hourly Rate ($)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newDesigner.hourly_rate}
                    onChange={(e) => setNewDesigner({...newDesigner, hourly_rate: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Availability</label>
                  <Select value={newDesigner.availability_status} onValueChange={(value) => setNewDesigner({...newDesigner, availability_status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="away">Away</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <Select value={newDesigner.role} onValueChange={(value: any) => setNewDesigner({...newDesigner, role: value})}>
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
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Bio</label>
                  <Textarea
                    placeholder="Brief description about the designer..."
                    value={newDesigner.bio}
                    onChange={(e) => setNewDesigner({...newDesigner, bio: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={editingDesigner ? updateDesigner : addDesigner} className="flex-1">
                  {editingDesigner ? 'Update Designer' : 'Add Designer'}
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Specialization</TableHead>
                  <TableHead className="hidden lg:table-cell">Experience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {designers.map((designer) => (
                  <TableRow key={designer.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{designer.full_name}</div>
                          {designer.hourly_rate && (
                            <div className="text-sm text-muted-foreground">
                              ${designer.hourly_rate}/hr
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {designer.email}
                        </div>
                        {designer.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {designer.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>
                        {designer.specialization && (
                          <div className="font-medium">{designer.specialization}</div>
                        )}
                        {designer.skills && designer.skills.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {designer.skills.slice(0, 2).join(', ')}
                            {designer.skills.length > 2 && '...'}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {designer.experience_years ? (
                        <div className="flex items-center gap-1">
                          <Award className="h-4 w-4 text-muted-foreground" />
                          {designer.experience_years} years
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getAvailabilityColor(designer.availability_status)}>
                        {designer.availability_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {designer.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(designer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DesignerManagement;