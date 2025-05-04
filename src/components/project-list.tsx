"use client";

import type React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { Project } from '@/types/project';
import { format } from 'date-fns';

interface ProjectListProps {
  projects: Project[];
  onCreateProject: () => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onCreateProject, onDeleteProject }) => {
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
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col justify-between transition-shadow duration-200 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-primary truncate">{project.title || 'Untitled Project'}</CardTitle>
                <CardDescription>
                  Last updated: {format(new Date(project.updatedAt), 'PPP p')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add a brief summary or number of sections here later if needed */}
                <p className="text-sm text-muted-foreground">
                  {project.sections?.length || 0} sections
                </p>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                 <Link href={`/project/${project.id}`} passHref legacyBehavior>
                    <Button variant="outline">Edit Project</Button>
                 </Link>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click navigation
                    if (window.confirm(`Are you sure you want to delete "${project.title || 'this project'}"?`)) {
                      onDeleteProject(project.id);
                    }
                  }}
                  aria-label={`Delete project ${project.title}`}
                >
                  <Trash2 />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
