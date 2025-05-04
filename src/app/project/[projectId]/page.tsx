"use client"; // Keep this if ProjectEditor uses client hooks like useState, useEffect

import React from 'react';
import { ProjectEditor } from '@/components/project-editor';
import { useParams } from 'next/navigation'; // Use useParams to get projectId
import { Loader2 } from 'lucide-react'; // For loading state

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string; // Type assertion

   if (!projectId) {
     // Handle case where projectId is missing, maybe redirect or show error
      return (
          <div className="flex items-center justify-center h-full">
               <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
               <p className="text-muted-foreground">Loading project ID...</p>
          </div>
      );
   }

  // Render ProjectEditor directly, layout is handled by project/[projectId]/layout.tsx and root layout.tsx
  return <ProjectEditor projectId={projectId} />;
}
