"use client";

import type React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Cloud, CloudOff } from 'lucide-react'; // Added Cloud, CloudOff icons
import type { Project } from '@/types/project';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast"; // Import useToast to ensure it's available if needed, although delete is handled in parent
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CreateProjectDialog } from '@/components/create-project-dialog'; // Import for the empty state button


interface ProjectListProps {
  projects: Project[];
  // Removed onCreateProject: () => void; // Creation is handled by dialog on parent page
  onDeleteProject: (id: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onDeleteProject }) => {
   const { toast } = useToast(); // Ensure toast is available if needed locally

  const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation(); // Prevent card link navigation
    // Confirmation is now handled by AlertDialog, directly call onDeleteProject
    onDeleteProject(project.id);
  };


  return (
    <>
      {projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle className="text-xl text-muted-foreground">No projects yet!</CardTitle>
            <CardDescription>Click "Create New Project" above to get started.</CardDescription>
          </CardHeader>
          <CardContent>
             {/* The main create button is now in the DashboardPage, this is just a prompt */}
              {/* We can keep a button here if needed, but it should trigger the same dialog */}
              {/* For simplicity, removed the button here, directing user to the header button */}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col justify-between transition-shadow duration-200 hover:shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-start">
                     <CardTitle className="text-primary truncate pr-2">{project.title || 'Untitled Project'}</CardTitle>
                     <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0" title={`Stored ${project.storageType === 'local' ? 'Locally' : 'in Cloud'}`}>
                        {project.storageType === 'local' ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4 text-green-500" />}
                        <span>{project.storageType === 'local' ? 'Local' : 'Cloud'}</span>
                     </div>
                </div>
                <CardDescription>
                  {project.updatedAt ? `Last updated: ${format(new Date(project.updatedAt), 'PPP p')}` : 'Not updated yet'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {project.sections?.length || 0} sections
                </p>
                 <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  Context: {project.projectContext || 'No context provided'}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                 {/* Updated Link usage - removed legacyBehavior and passHref */}
                 <Link href={`/project/${project.id}`}>
                    <Button variant="outline">Edit Project</Button>
                 </Link>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button
                        variant="destructive"
                        size="icon"
                        onClick={(e) => e.stopPropagation()} // Prevent card click
                        aria-label={`Delete project ${project.title}`}
                       >
                        <Trash2 />
                       </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()} >
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the {project.storageType === 'local' ? 'local' : 'cloud'} project
                          "{project.title || 'Untitled Project'}" and all its data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                           onClick={(e) => handleDeleteClick(e, project)}
                           className={/* Optional: Explicitly use destructive variant styling if needed */ "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
                        >
                          Delete Project
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                 </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};
