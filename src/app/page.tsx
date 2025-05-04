"use client";

import React from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Project } from '@/types/project';
import { ProjectList } from '@/components/project-list';
import { useRouter } from 'next/navigation';
// Removed uuidv4 import as ID generation is now in the dialog
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { CreateProjectDialog } from '@/components/create-project-dialog'; // Import the dialog
import { Button } from '@/components/ui/button'; // Import Button
import { PlusCircle } from 'lucide-react'; // Import Icon

export default function DashboardPage() {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', []);
  const router = useRouter();
  const { toast } = useToast(); // Get toast function

  const handleCreateProject = (newProject: Project) => {
    // Use functional update to ensure we have the latest projects array
    setProjects((prevProjects = []) => [...prevProjects, newProject]);
    // Navigate to the newly created project's page
    router.push(`/project/${newProject.id}`);
    toast({
        title: "Project Created",
        description: `"${newProject.title}" has been created. You can now generate an outline.`,
    });
  };

  const handleDeleteProject = (id: string) => {
    // Find project details *before* filtering for the toast message
    const projectToDelete = projects.find(p => p.id === id);

    // Use functional update for safe state transition
    setProjects((prevProjects = []) => prevProjects.filter((project) => project.id !== id));

    // Show a toast notification after deletion
    toast({
      title: "Project Deleted",
      description: `"${projectToDelete?.title || 'Untitled Project'}" has been removed.`,
      variant: "destructive",
    });
  };

  return (
      <main className="min-h-screen bg-background">
         {/* Add a header/navbar later if needed */}
         <div className="container mx-auto p-4 md:p-8">
             <div className="flex justify-between items-center mb-6">
               <h1 className="text-2xl md:text-3xl font-bold text-primary text-glow-primary">Your Projects</h1>
                {/* Use the Dialog component */}
               <CreateProjectDialog onCreateProject={handleCreateProject}>
                   <Button size="lg">
                     <PlusCircle className="mr-2" /> Create New Project
                   </Button>
               </CreateProjectDialog>
             </div>

             <ProjectList
                projects={projects || []} // Ensure projects is always an array
                // Pass down delete handler, creation is now handled by dialog trigger above
                onDeleteProject={handleDeleteProject}
             />
         </div>
      </main>
  );
}
