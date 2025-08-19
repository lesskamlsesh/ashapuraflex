import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, UserCheck, Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Job {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: number;
  assigned_to?: string;
  deadline?: string;
  created_at: string;
  order_id?: string;
  started_at?: string;
  completed_at?: string;
  designer_name?: string;
  designer_email?: string;
}

interface Designer {
  user_id: string;
  full_name: string;
  email: string;
  availability_status: string;
  specialization?: string;
  hourly_rate?: number;
}

interface JobAssignmentProps {
  userRole: string;
}

interface NewJobForm {
  title: string;
  description: string;
  priority: number;
  deadline: string;
  assigned_to: string;
}

const JobAssignment: React.FC<JobAssignmentProps> = ({ userRole }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [newJob, setNewJob] = useState<NewJobForm>({
    title: '',
    description: '',
    priority: 3,
    deadline: '',
    assigned_to: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([loadJobs(), loadDesigners()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get designer info separately for assigned jobs
      const jobsWithDesignerInfo = await Promise.all(
        (data || []).map(async (job) => {
          if (job.assigned_to) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', job.assigned_to)
              .single();
            
            return {
              ...job,
              designer_name: profileData?.full_name,
              designer_email: profileData?.email
            };
          }
          return job;
        })
      );

      setJobs(jobsWithDesignerInfo);
    } catch (error: any) {
      console.error('Error loading jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
    }
  };

  const loadDesigners = async () => {
    try {
      // Get user roles first
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['designer', 'admin', 'manager']);

      if (rolesError) throw rolesError;

      // Get profiles for those users
      const userIds = roles?.map(r => r.user_id) || [];
      
      if (userIds.length === 0) {
        setDesigners([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, availability_status, specialization, hourly_rate')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const designersData = profiles?.map(profile => ({
        user_id: profile.user_id,
        full_name: profile.full_name || 'Unknown',
        email: profile.email || '',
        availability_status: profile.availability_status || 'available',
        specialization: profile.specialization,
        hourly_rate: profile.hourly_rate
      })) || [];

      setDesigners(designersData);
    } catch (error: any) {
      console.error('Error loading designers:', error);
      toast({
        title: "Error",
        description: "Failed to load designers",
        variant: "destructive",
      });
    }
  };

  const createJob = async () => {
    if (!newJob.title) {
      toast({
        title: "Error",
        description: "Please enter a job title",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .insert([{
          title: newJob.title,
          description: newJob.description || null,
          priority: newJob.priority,
          deadline: newJob.deadline || null,
          assigned_to: newJob.assigned_to || null
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job created successfully",
      });

      setShowCreateJob(false);
      setNewJob({
        title: '',
        description: '',
        priority: 3,
        deadline: '',
        assigned_to: ''
      });
      loadJobs();
    } catch (error: any) {
      console.error('Error creating job:', error);
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    }
  };

  const updateJobAssignment = async (jobId: string, assignedTo: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ assigned_to: assignedTo || null })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job assignment updated successfully",
      });
      
      loadJobs();
    } catch (error: any) {
      console.error('Error updating job assignment:', error);
      toast({
        title: "Error",
        description: "Failed to update job assignment",
        variant: "destructive",
      });
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      
      if (newStatus === 'in_progress') {
        updates.started_at = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job status updated successfully",
      });
      
      loadJobs();
    } catch (error: any) {
      console.error('Error updating job status:', error);
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-orange-100 text-orange-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-blue-100 text-blue-800';
      case 5: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Urgent';
      case 2: return 'High';
      case 3: return 'Medium';
      case 4: return 'Low';
      case 5: return 'Lowest';
      default: return 'Medium';
    }
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-red-100 text-red-800';
      case 'away': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canCreateJobs = userRole === 'admin' || userRole === 'manager';
  const canAssignJobs = userRole === 'admin' || userRole === 'manager';

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading job assignments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Job Assignment</h2>
          <p className="text-muted-foreground">
            Manage job assignments and track progress
          </p>
        </div>
        {canCreateJobs && (
          <Dialog open={showCreateJob} onOpenChange={setShowCreateJob}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Job
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Job</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    placeholder="Job title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newJob.description}
                    onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                    placeholder="Job description"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={newJob.priority.toString()}
                    onValueChange={(value) => setNewJob({ ...newJob, priority: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Urgent</SelectItem>
                      <SelectItem value="2">2 - High</SelectItem>
                      <SelectItem value="3">3 - Medium</SelectItem>
                      <SelectItem value="4">4 - Low</SelectItem>
                      <SelectItem value="5">5 - Lowest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Deadline</label>
                  <Input
                    type="date"
                    value={newJob.deadline}
                    onChange={(e) => setNewJob({ ...newJob, deadline: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Assign To</label>
                  <Select
                    value={newJob.assigned_to}
                    onValueChange={(value) => setNewJob({ ...newJob, assigned_to: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a designer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {designers.map((designer) => (
                        <SelectItem key={designer.user_id} value={designer.user_id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{designer.full_name}</span>
                            <Badge 
                              variant="secondary" 
                              className={`ml-2 ${getAvailabilityColor(designer.availability_status)}`}
                            >
                              {designer.availability_status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createJob} className="w-full">
                  Create Job
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Available Designers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Available Designers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {designers.filter(d => d.availability_status === 'available').map((designer) => (
              <Card key={designer.user_id} className="p-4">
                <div className="space-y-2">
                  <div className="font-medium">{designer.full_name}</div>
                  <div className="text-sm text-muted-foreground">{designer.email}</div>
                  {designer.specialization && (
                    <div className="text-sm">{designer.specialization}</div>
                  )}
                  {designer.hourly_rate && (
                    <div className="text-sm font-medium">${designer.hourly_rate}/hr</div>
                  )}
                  <Badge variant="secondary" className={getAvailabilityColor(designer.availability_status)}>
                    {designer.availability_status}
                  </Badge>
                </div>
              </Card>
            ))}
            {designers.filter(d => d.availability_status === 'available').length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No available designers
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="hidden md:table-cell">Assigned To</TableHead>
                  <TableHead className="hidden lg:table-cell">Deadline</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{job.title}</div>
                        {job.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {job.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(job.priority)}>
                        {getPriorityLabel(job.priority)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {canAssignJobs ? (
                        <Select
                          value={job.assigned_to || ''}
                          onValueChange={(value) => updateJobAssignment(job.id, value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Assign to..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Unassigned</SelectItem>
                            {designers.map((designer) => (
                              <SelectItem key={designer.user_id} value={designer.user_id}>
                                {designer.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span>{job.designer_name || 'Unassigned'}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {job.deadline ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(job.deadline).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No deadline</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={job.status}
                        onValueChange={(value) => updateJobStatus(job.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="queued">Queued</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {jobs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No jobs found. {canCreateJobs && 'Create your first job to get started.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobAssignment;