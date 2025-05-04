"use client"; // Keep this if ProjectEditor uses client hooks like useState, useEffect

import React from 'react';
import { ProjectEditor } from '@/components/project-editor';
import { useParams } from 'next/navigation'; // Use useParams to get projectId

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string; // Type assertion

   if (!projectId) {
     // Handle case where projectId is missing, maybe redirect or show error
     return <div>Loading project or invalid ID...</div>;
   }

  return <ProjectEditor projectId={projectId} />;
}
