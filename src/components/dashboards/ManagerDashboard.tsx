import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CalendarIcon, KanbanSquare, Users, Plus, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ManagerDashboardProps {
  onLogout: () => void;
}

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
}

interface NewJobForm {
  title: string;
  description: string;
  priority: number;
  deadline: string;
  assigned_to: string;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ onLogout }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
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
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      console.error('Error loading jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createJob = async () => {
    try {
      const { error } = await supabase
        .from('jobs')
        .insert([{
          title: newJob.title,
          description: newJob.description,
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

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: newStatus,
          started_at: newStatus === 'in_progress' ? new Date().toISOString() : undefined,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined
        })
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

  const getJobsByStatus = (status: string) => {
    return jobs.filter(job => job.status === status);
  };

  const getJobStats = () => {
    return {
      total: jobs.length,
      queued: getJobsByStatus('queued').length,
      in_progress: getJobsByStatus('in_progress').length,
      completed: getJobsByStatus('completed').length
    };
  };

  const stats = getJobStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Manager Dashboard</h1>
            <p className="text-muted-foreground">
              Job priority recommendations, assignments, and workflow management
            </p>
          </div>
          <div className="flex gap-2">
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
                    <label className="text-sm font-medium">Title</label>
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
                    <Input
                      value={newJob.assigned_to}
                      onChange={(e) => setNewJob({ ...newJob, assigned_to: e.target.value })}
                      placeholder="User ID or email"
                    />
                  </div>
                  <Button onClick={createJob} className="w-full">
                    Create Job
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={onLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <KanbanSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queued</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.queued}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.in_progress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="kanban" className="space-y-4">
          <TabsList>
            <TabsTrigger value="kanban">Kanban View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Queued Column */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Queued ({stats.queued})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getJobsByStatus('queued').map((job) => (
                    <Card key={job.id} className="p-3">
                      <div className="space-y-2">
                        <div className="font-medium">{job.title}</div>
                        <div className="flex justify-between items-center">
                          <Badge className={getPriorityColor(job.priority)}>
                            {getPriorityLabel(job.priority)}
                          </Badge>
                          <Select
                            value={job.status}
                            onValueChange={(value) => updateJobStatus(job.id, value)}
                          >
                            <SelectTrigger className="w-24 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="queued">Queued</SelectItem>
                              <SelectItem value="in_progress">Start</SelectItem>
                              <SelectItem value="cancelled">Cancel</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {job.deadline && (
                          <div className="text-sm text-muted-foreground">
                            Due: {new Date(job.deadline).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </CardContent>
              </Card>

              {/* In Progress Column */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">In Progress ({stats.in_progress})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getJobsByStatus('in_progress').map((job) => (
                    <Card key={job.id} className="p-3">
                      <div className="space-y-2">
                        <div className="font-medium">{job.title}</div>
                        <div className="flex justify-between items-center">
                          <Badge className={getPriorityColor(job.priority)}>
                            {getPriorityLabel(job.priority)}
                          </Badge>
                          <Select
                            value={job.status}
                            onValueChange={(value) => updateJobStatus(job.id, value)}
                          >
                            <SelectTrigger className="w-24 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in_progress">Working</SelectItem>
                              <SelectItem value="completed">Complete</SelectItem>
                              <SelectItem value="queued">Back to Queue</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {job.assigned_to && (
                          <div className="text-sm text-muted-foreground">
                            Assigned to: {job.assigned_to}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </CardContent>
              </Card>

              {/* Completed Column */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Completed ({stats.completed})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getJobsByStatus('completed').map((job) => (
                    <Card key={job.id} className="p-3">
                      <div className="space-y-2">
                        <div className="font-medium">{job.title}</div>
                        <Badge className={getStatusColor(job.status)}>
                          Completed
                        </Badge>
                        {job.assigned_to && (
                          <div className="text-sm text-muted-foreground">
                            Completed by: {job.assigned_to}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(job.priority)}>
                            {getPriorityLabel(job.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell>{job.assigned_to || 'Unassigned'}</TableCell>
                        <TableCell>
                          {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'No deadline'}
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Job Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Current Assignee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reassign</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.filter(job => job.status !== 'completed').map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>{job.assigned_to || 'Unassigned'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Enter user ID/email"
                            className="w-48"
                            onBlur={(e) => {
                              if (e.target.value !== job.assigned_to) {
                                updateJobAssignment(job.id, e.target.value);
                              }
                            }}
                            defaultValue={job.assigned_to || ''}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ManagerDashboard;