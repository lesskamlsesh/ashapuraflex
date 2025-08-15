import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileImage, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DesignerDashboardProps {
  user: any;
  onLogout: () => void;
}

interface Job {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: number;
  deadline?: string;
  created_at: string;
  order_id?: string;
}

interface JobFile {
  id: string;
  job_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

const DesignerDashboard: React.FC<DesignerDashboardProps> = ({ user, onLogout }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobFiles, setJobFiles] = useState<{ [key: string]: JobFile[] }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  useEffect(() => {
    loadAssignedJobs();
  }, [user]);

  const loadAssignedJobs = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      
      // Load jobs assigned to current user
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('assigned_to', user.id)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);

      // Load job files for each job
      if (jobsData && jobsData.length > 0) {
        const jobIds = jobsData.map(job => job.id);
        const { data: filesData, error: filesError } = await supabase
          .from('job_files')
          .select('*')
          .in('job_id', jobIds)
          .order('created_at', { ascending: false });

        if (filesError) throw filesError;

        // Group files by job_id
        const filesByJob: { [key: string]: JobFile[] } = {};
        filesData?.forEach(file => {
          if (!filesByJob[file.job_id]) {
            filesByJob[file.job_id] = [];
          }
          filesByJob[file.job_id].push(file);
        });
        setJobFiles(filesByJob);
      }
    } catch (error: any) {
      console.error('Error loading assigned jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load assigned jobs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
      
      loadAssignedJobs();
    } catch (error: any) {
      console.error('Error updating job status:', error);
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    }
  };

  const uploadFile = async (jobId: string, file: File, fileType: string) => {
    try {
      setUploadingFiles(prev => ({ ...prev, [jobId]: true }));

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${jobId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('catalogues') // Reusing existing bucket
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('catalogues')
        .getPublicUrl(fileName);

      // Save file record
      const { error: dbError } = await supabase
        .from('job_files')
        .insert([{
          job_id: jobId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: fileType,
          uploaded_by: user.id
        }]);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      loadAssignedJobs();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploadingFiles(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const handleFileUpload = (jobId: string, fileType: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = fileType === 'artwork' ? '.ai,.psd,.pdf,.png,.jpg,.jpeg' : 'image/*,application/pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        uploadFile(jobId, file, fileType);
      }
    };
    input.click();
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

  const getJobStats = () => {
    return {
      total: jobs.length,
      queued: jobs.filter(job => job.status === 'queued').length,
      in_progress: jobs.filter(job => job.status === 'in_progress').length,
      completed: jobs.filter(job => job.status === 'completed').length
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
            <h1 className="text-3xl font-bold">Designer Dashboard</h1>
            <p className="text-muted-foreground">
              View assigned jobs, upload proofs and artwork
            </p>
          </div>
          <Button onClick={onLogout} variant="outline">
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Jobs</CardTitle>
              <FileImage className="h-4 w-4 text-muted-foreground" />
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
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active Jobs</TabsTrigger>
            <TabsTrigger value="completed">Completed Jobs</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <div className="grid gap-6">
              {jobs.filter(job => job.status !== 'completed').map((job) => (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        {job.description && (
                          <p className="text-muted-foreground mt-2">{job.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                        <Badge className={getPriorityColor(job.priority)}>
                          {getPriorityLabel(job.priority)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Job Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Created</label>
                        <div>{new Date(job.created_at).toLocaleDateString()}</div>
                      </div>
                      {job.deadline && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Deadline</label>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(job.deadline).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="mt-1">
                          {job.status === 'queued' && (
                            <Button 
                              size="sm" 
                              onClick={() => updateJobStatus(job.id, 'in_progress')}
                            >
                              Start Working
                            </Button>
                          )}
                          {job.status === 'in_progress' && (
                            <Button 
                              size="sm" 
                              onClick={() => updateJobStatus(job.id, 'completed')}
                              variant="outline"
                            >
                              Mark Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* File Uploads */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium">Files & Proofs</h4>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFileUpload(job.id, 'proof')}
                            disabled={uploadingFiles[job.id]}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Proof
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFileUpload(job.id, 'artwork')}
                            disabled={uploadingFiles[job.id]}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Artwork
                          </Button>
                        </div>
                      </div>

                      {/* File List */}
                      {jobFiles[job.id] && jobFiles[job.id].length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {jobFiles[job.id].map((file) => (
                            <Card key={file.id} className="p-3">
                              <div className="flex items-center gap-3">
                                <FileImage className="h-8 w-8 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{file.file_name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {file.file_type} • {new Date(file.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => window.open(file.file_url, '_blank')}
                                >
                                  View
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No files uploaded yet
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {jobs.filter(job => job.status !== 'completed').length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">All caught up!</p>
                    <p className="text-muted-foreground">No active jobs assigned to you right now.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Completed Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Completed Date</TableHead>
                      <TableHead>Files</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.filter(job => job.status === 'completed').map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(job.priority)}>
                            {getPriorityLabel(job.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(job.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {jobFiles[job.id]?.length || 0} files
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

export default DesignerDashboard;