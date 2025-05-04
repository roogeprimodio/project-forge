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
    setProjects((prevProjects) => [...prevProjects, newProject]);
    // Navigate to the newly created project's page
    router.push(`/project/${newProjectId}`);
  };

  const handleDeleteProject = (id: string) => {
    const projectToDelete = projects.find(p => p.id === id);
    setProjects((prevProjects) => prevProjects.filter((project) => project.id !== id));
    // Show a toast notification after deletion
    toast({
      title: "Project Deleted",
      description: `"${projectToDelete?.title || 'Untitled Project'}" has been removed.`,
      variant: "destructive", // Optional: Use destructive variant for deletion confirmation
    });
  };

  return (
      <main className="min-h-screen bg-background">
         {/* Add a header/navbar later if needed */}
         <ProjectList
            projects={projects}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
         />
      </main>
  );
}

// Simple UUID generation function as fallback if uuid library is not preferred
// function generateUUID() {
//   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
//     var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
//     return v.toString(16);
//   });
// }
