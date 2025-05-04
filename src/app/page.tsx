"use client";

import React from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Project } from '@/types/project';
import { ProjectList } from '@/components/project-list';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
import { useToast } from '@/hooks/use-toast'; // Import useToast

export default function DashboardPage() {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', []);
  const router = useRouter();
  const { toast } = useToast(); // Get toast function

  const handleCreateProject = () => {
    const newProjectId = uuidv4();
    const newProject: Project = {
      id: newProjectId,
      title: `Untitled Project ${projects.length + 1}`,
      teamDetails: '',
      collegeInfo: '',
      sections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Use functional update to ensure we have the latest projects array
    setProjects((prevProjects = []) => [...prevProjects, newProject]);
    // Navigate to the newly created project's page
    router.push(`/project/${newProjectId}`);
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
         <ProjectList
            projects={projects || []} // Ensure projects is always an array
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
         />
      </main>
  );
}
