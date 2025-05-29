
"use client";

import type React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Cloud, CloudOff, Edit, CalendarDays, FileText as FileTextIcon } from 'lucide-react'; // Added CalendarDays, FileTextIcon
import type { Project } from '@/types/project';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { cn } from '@/lib/utils';

interface ProjectListProps {
  projects: Project[];
  onDeleteProject: (id: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onDeleteProject }) => {
   const { toast } = useToast();

  const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    onDeleteProject(project.id);
  };


  return (
    <>
      {projects.length === 0 ? (
        <Card className="text-center py-8 sm:py-12 border-2 border-dashed border-muted-foreground/30 bg-muted/10 rounded-lg shadow-none">
          <CardHeader className="px-4 sm:px-6">
            <PlusCircle className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/40 mx-auto mb-4" />
            <CardTitle className="text-lg sm:text-xl font-semibold text-foreground">No projects yet!</CardTitle>
            <CardDescription className="text-sm sm:text-base text-muted-foreground">
              Click the "Create New Project" button to get started.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className={cn(
                "group flex flex-col justify-between overflow-hidden rounded-lg border bg-card text-card-foreground shadow-md transition-all duration-300 ease-in-out hover:shadow-xl hover:border-primary/50",
                "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background" // Added focus state for accessibility
              )}
            >
              <Link href={`/project/${project.id}`} className="flex flex-col flex-grow h-full focus:outline-none">
                <CardHeader className="p-4 sm:p-5">
                  <div className="flex justify-between items-start gap-2">
                       <CardTitle className="text-primary group-hover:text-primary/90 transition-colors text-base sm:text-lg font-semibold leading-tight truncate">
                        {project.title || 'Untitled Project'}
                       </CardTitle>
                       <div
                        className={cn(
                            "flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border text-muted-foreground transition-colors",
                            project.storageType === 'local' ? "bg-muted/50 border-muted-foreground/20" : "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400"
                        )}
                        title={`Stored ${project.storageType === 'local' ? 'Locally' : 'in Cloud'}`}
                       >
                          {project.storageType === 'local' ? <CloudOff className="h-3 w-3" /> : <Cloud className="h-3 w-3" />}
                          <span className="hidden xs:inline">{project.storageType === 'local' ? 'Local' : 'Cloud'}</span>
                       </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 pt-0 flex-grow space-y-2">
                  <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>
                        {project.updatedAt ? `Updated: ${format(new Date(project.updatedAt), 'MMM d, yyyy')}` : 'Not updated yet'}
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                    <FileTextIcon className="h-3.5 w-3.5" />
                    <span>
                        {project.sections?.length || 0} section(s)
                    </span>
                  </div>
                   <p className="text-xs sm:text-sm text-muted-foreground/80 line-clamp-2 pt-1">
                    {project.projectContext || 'No context provided.'}
                  </p>
                </CardContent>
              </Link>
              <CardFooter className="flex justify-end items-center p-3 sm:p-4 border-t bg-muted/20 gap-2">
                 <Link href={`/project/${project.id}`} className="focus:outline-none">
                    <Button variant="outline" size="sm" className="text-xs px-2 sm:px-3 py-1 h-8 sm:h-9 focus-visible:glow-accent hover:glow-accent">
                      <Edit className="mr-1.5 h-3.5 w-3.5"/> Edit
                    </Button>
                 </Link>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button
                        variant="destructive"
                        size="sm" // Consistent size with Edit button
                        className="text-xs px-2 sm:px-3 py-1 h-8 sm:h-9"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Delete project ${project.title}`}
                       >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5"/> Delete
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

