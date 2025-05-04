
"use client";

import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Project } from '@/types/project';
import { ProjectList } from '@/components/project-list';
import { useRouter } from 'next/navigation';
// Removed uuidv4 import as ID generation is now in the dialog
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { CreateProjectDialog } from '@/components/create-project-dialog'; // Import the dialog
import { Button } from '@/components/ui/button'; // Import Button
import { PlusCircle, Loader2 } from 'lucide-react'; // Import Icon and Loader2

export default function DashboardPage() {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', []);
  const router = useRouter();
  const { toast } = useToast(); // Get toast function
  const [hasMounted, setHasMounted] = useState(false); // State to track client-side mount

  // Set hasMounted to true only after the component mounts on the client
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleCreateProject = (newProject: Project) => {
    // Use functional update to ensure we have the latest projects array
    setProjects((prevProjects = []) => [...(prevProjects || []), newProject]); // Ensure prevProjects is an array
    // Navigate to the newly created project's page
    router.push(`/project/${newProject.id}`);
    toast({
        title: "Project Created",
        description: `"${newProject.title}" has been created. You can now generate an outline.`,
    });
  };

  const handleDeleteProject = (id: string) => {
    // Find project details *before* filtering for the toast message
    const projectToDelete = projects?.find(p => p.id === id); // Added optional chaining for safety

    // Use functional update for safe state transition
    setProjects((prevProjects = []) => (prevProjects || []).filter((project) => project.id !== id));

    // Show a toast notification after deletion
    toast({
      title: "Project Deleted",
      description: `"${projectToDelete?.title || 'Untitled Project'}" has been removed.`,
      variant: "destructive",
    });
  };

  // Removed the <main> and outer container, assuming MainLayout provides structure
  return (
      <div className="p-4 md:p-8"> {/* Add padding directly */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-primary text-glow-primary">Your Projects</h1>
             {/* Use the Dialog component */}
            <CreateProjectDialog onCreateProject={handleCreateProject}>
                <Button size="lg" className="hover:glow-primary focus-visible:glow-primary">
                  <PlusCircle className="mr-2" /> Create New Project
                </Button>
            </CreateProjectDialog>
          </div>

          {/* Conditionally render ProjectList or a loading state */}
          {!hasMounted ? (
             <div className="flex items-center justify-center py-12">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
               <p className="ml-3 text-muted-foreground">Loading projects...</p>
             </div>
          ) : (
             <ProjectList
               projects={projects || []} // Ensure projects is always an array
               onDeleteProject={handleDeleteProject}
             />
          )}
      </div>
  );
}
