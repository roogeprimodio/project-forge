"use client";

import type React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { Project } from '@/types/project';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast"; // Import useToast to ensure it's available if needed, although delete is handled in parent
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


interface ProjectListProps {
  projects: Project[];
  onCreateProject: () => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onCreateProject, onDeleteProject }) => {
   const { toast } = useToast(); // Ensure toast is available if needed locally

  const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation(); // Prevent card link navigation
    // Confirmation is now handled by AlertDialog, directly call onDeleteProject
    onDeleteProject(project.id);
  };


  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Your Projects</h1>
        <Button onClick={onCreateProject} size="lg">
          <PlusCircle className="mr-2" /> Create New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle className="text-xl text-muted-foreground">No projects yet!</CardTitle>
            <CardDescription>Click "Create New Project" to get started.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button onClick={onCreateProject}>
               <PlusCircle className="mr-2 h-4 w-4" /> Create First Project
             </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col justify-between transition-shadow duration-200 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-primary truncate">{project.title || 'Untitled Project'}</CardTitle>
                <CardDescription>
                  {project.updatedAt ? `Last updated: ${format(new Date(project.updatedAt), 'PPP p')}` : 'Not updated yet'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {project.sections?.length || 0} sections
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
                          This action cannot be undone. This will permanently delete the project
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
    </div>
  );
};
