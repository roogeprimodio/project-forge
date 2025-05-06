"use client";

import type React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Cloud, CloudOff, Edit } from 'lucide-react'; // Added Edit icon
import type { Project } from '@/types/project';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CreateProjectDialog } from '@/components/create-project-dialog';

interface ProjectListProps {
  projects: Project[];
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
        <Card className="text-center py-8 sm:py-12 border-dashed border-muted-foreground/50 bg-muted/10">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl text-muted-foreground">No projects yet!</CardTitle>
            <CardDescription className="text-sm sm:text-base">Click "Create New Project" above to get started.</CardDescription>
          </CardHeader>
          <CardContent className="mt-2 sm:mt-4">
              {/* Placeholder content or maybe a subtle icon */}
              <PlusCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30 mx-auto" />
          </CardContent>
        </Card>
      ) : (
        // Use responsive grid: 1 column default, 2 on sm, 3 on lg
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col justify-between transition-shadow duration-200 hover:shadow-lg">
              <Link href={`/project/${project.id}`} className="flex flex-col flex-grow h-full p-3 sm:p-4"> {/* Make card clickable and adjust padding */}
                <CardHeader className="p-0 mb-2 sm:mb-3"> {/* Reduced padding for header */}
                  <div className="flex justify-between items-start">
                       <CardTitle className="text-primary truncate pr-2 text-base sm:text-lg md:text-xl">{project.title || 'Untitled Project'}</CardTitle>
                       <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0" title={`Stored ${project.storageType === 'local' ? 'Locally' : 'in Cloud'}`}>
                          {project.storageType === 'local' ? <CloudOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Cloud className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />}
                          <span className="hidden xs:inline">{project.storageType === 'local' ? 'Local' : 'Cloud'}</span> {/* Show on extra small screens */}
                       </div>
                  </div>
                  <CardDescription className="text-xs md:text-sm">
                    {project.updatedAt ? `Updated: ${format(new Date(project.updatedAt), 'PPp')}` : 'Not updated'} {/* Use PPp for shorter format */}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow p-0"> {/* Reduced padding for content */}
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {project.sections?.length || 0} sections
                  </p>
                   <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2 line-clamp-2">
                    Context: {project.projectContext || 'No context provided'}
                  </p>
                </CardContent>
              </Link>
              {/* Footer outside the Link to keep buttons separate */}
              <CardFooter className="flex justify-between items-center p-3 sm:p-4 border-t mt-2 sm:mt-3"> {/* Adjust padding and margin */}
                 <Link href={`/project/${project.id}`}>
                    <Button variant="outline" size="sm" className="text-xs px-2 sm:px-3 py-1 h-8 sm:h-9"> {/* Adjusted button size */}
                      <Edit className="mr-1 h-3 w-3 sm:h-4 sm:w-4"/> Edit
                    </Button>
                 </Link>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8" // Adjusted icon button size
                        onClick={(e) => e.stopPropagation()} // Prevent card click
                        aria-label={`Delete project ${project.title}`}
                       >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4"/>
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
                           className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
