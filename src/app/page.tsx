
"use client";

import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Project } from '@/types/project';
import { ProjectList } from '@/components/project-list';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', []);
  const router = useRouter();
  const { toast } = useToast();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleCreateProject = (newProject: Project) => {
    setProjects((prevProjects = []) => [...(prevProjects || []), newProject]);
    router.push(`/project/${newProject.id}`);
    toast({
        title: "Project Created",
        description: `"${newProject.title}" has been created. You can now generate an outline.`,
    });
  };

  const handleDeleteProject = (id: string) => {
    const projectToDelete = projects?.find(p => p.id === id);
    setProjects((prevProjects = []) => (prevProjects || []).filter((project) => project.id !== id));
    toast({
      title: "Project Deleted",
      description: `"${projectToDelete?.title || 'Untitled Project'}" has been removed.`,
      variant: "destructive",
    });
  };

  return (
      // Reduced padding on smaller screens
      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3 sm:gap-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary text-glow-primary">Your Projects</h1>
            <CreateProjectDialog onCreateProject={handleCreateProject}>
                {/* Adjusted button size for mobile */}
                <Button size="default" className="hover:glow-primary focus-visible:glow-primary text-sm sm:text-base w-full sm:w-auto">
                  <PlusCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Create New Project
                </Button>
            </CreateProjectDialog>
          </div>

          {!hasMounted ? (
             <div className="flex items-center justify-center py-12">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
               <p className="ml-3 text-muted-foreground">Loading projects...</p>
             </div>
          ) : (
             <ProjectList
               projects={projects || []}
               onDeleteProject={handleDeleteProject}
             />
          )}
      </div>
  );
}
