// src/components/standard-page-preview.tsx
"use client";

import React from 'react';
import type { Project } from '@/types/project';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StandardPagePreviewProps {
  pageName: string;
  project: Project;
}

// Helper function to generate content for standard pages
const generateStandardPageContent = (pageName: string, project: Project): React.ReactNode => {
  switch (pageName) {
    case 'Cover Page':
      return (
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold mt-12">{project.title}</h1>
          <p className="text-lg">by</p>
          <p className="text-xl font-semibold">{project.teamDetails.split('\n').map(member => member.split(' - ')[0]).join(', ')}</p>
          <div className="mt-8 text-sm">
            <p>Enrollment Numbers: {project.teamDetails.split('\n').map(member => member.split(' - ')[1]).join(', ')}</p>
            <p>{project.branch}</p>
            <p>{project.instituteName}</p>
            {project.universityLogoUrl && <img src={project.universityLogoUrl} alt="University Logo" data-ai-hint="university logo" className="mx-auto h-16 mt-4 object-contain" />}
            {project.collegeLogoUrl && <img src={project.collegeLogoUrl} alt="College Logo" data-ai-hint="college logo" className="mx-auto h-12 mt-2 object-contain" />}
            <p className="mt-8">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      );
    case 'Certificate':
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-center mb-8">Certificate</h2>
          <p>This is to certify that the project report titled "<strong>{project.title}</strong>" submitted by:</p>
          <ul className="list-disc list-inside ml-4">
            {project.teamDetails.split('\n').map((member, idx) => <li key={idx}>{member}</li>)}
          </ul>
          <p>is a bonafide record of work carried out by them under my/our supervision and guidance in partial fulfillment of the requirements for the award of the degree of Bachelor of Engineering in {project.branch} at {project.instituteName}.</p>
          <div className="mt-16 grid grid-cols-2 gap-8">
            <div>
              <p className="mt-8 border-t pt-2">_________________________</p>
              <p>{project.guideName || '[Guide Name]'}</p>
              <p>Project Guide</p>
            </div>
            <div>
              <p className="mt-8 border-t pt-2">_________________________</p>
              <p>[Head of Department Name]</p>
              <p>Head of Department, {project.branch}</p>
            </div>
          </div>
        </div>
      );
    case 'Declaration':
       return (
         <div className="space-y-4">
           <h2 className="text-2xl font-semibold text-center mb-8">Declaration</h2>
           <p>We, the undersigned, hereby declare that the project report entitled "<strong>{project.title}</strong>" submitted for the degree of Bachelor of Engineering in {project.branch} is a record of original work done by us under the guidance of {project.guideName || '[Guide Name]'}.</p>
           <p>This work has not been submitted in part or full for any other degree or diploma of any university or institution.</p>
           <div className="mt-16 space-y-4">
             {project.teamDetails.split('\n').map((member, idx) => (
               <div key={idx}>
                 <p className="mt-4">_________________________</p>
                 <p>{member.split(' - ')[0]} ({member.split(' - ')[1]})</p>
               </div>
             ))}
           </div>
         </div>
       );
    case 'Abstract':
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold mb-4">Abstract</h2>
          <p className="text-justify leading-relaxed">
            [AI-generated or user-provided abstract for "{project.title}". This section should provide a concise summary of the project's objectives, methodology, key findings, and conclusions. It should be self-contained and give the reader a quick overview of the entire project.]
          </p>
           <p className="text-sm italic text-muted-foreground mt-4">(Abstract content to be generated or manually entered. Current project context: {project.projectContext || "Not provided"})</p>
        </div>
      );
     case 'Acknowledgement':
       return (
         <div className="space-y-4">
           <h2 className="text-2xl font-semibold mb-4">Acknowledgement</h2>
           <p className="text-justify leading-relaxed">
             We would like to express our sincere gratitude to our project guide, {project.guideName || '[Guide Name]'}, for their invaluable guidance, support, and encouragement throughout the course of this project. Their insights and expertise were instrumental in shaping our work.
           </p>
           <p>
             We are also thankful to the Head of Department and the faculty members of the {project.branch} department at {project.instituteName} for providing us with the necessary resources and a conducive learning environment.
           </p>
           <p>
             Our heartfelt thanks to our parents, friends, and well-wishers for their constant motivation and understanding during this endeavor.
           </p>
           <p className="text-sm italic text-muted-foreground mt-4">(This is a template. Please customize as needed.)</p>
         </div>
       );
    // Add more cases for other standard pages
    default:
      return (
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-4 h-full">
          <ShieldAlert className="w-10 h-10 md:w-12 md:h-12 opacity-50 mb-3" />
          <p>Content for "{pageName}" is typically auto-generated or requires specific formatting.</p>
          <p className="text-xs mt-2">This preview shows a general placeholder.</p>
        </div>
      );
  }
};

export const StandardPagePreview: React.FC<StandardPagePreviewProps> = ({ pageName, project }) => {
  const content = generateStandardPageContent(pageName, project);

  return (
    <Card className="shadow-lg w-full h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-xl md:text-2xl text-primary text-glow-primary">
          Preview: {pageName}
        </CardTitle>
        <CardDescription>This is a preview of how the "{pageName}" might look in the final report.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full pr-1">
          <div
            className={cn(
              "bg-white dark:bg-neutral-900 shadow-2xl rounded-sm mx-auto",
              "p-4 sm:p-8 md:p-12", // Responsive padding
              "w-full max-w-[210mm] min-h-[297mm] md:min-h-[calc(var(--a4-height-multiplier,1.414)*var(--a4-width,210mm))]", // A4 aspect ratio
              "aspect-[210/297]" // Maintain A4 aspect ratio
            )}
            style={{
              // Use CSS variables for better control if needed, or direct values
              // '--a4-width': '210mm',
              // '--a4-height-multiplier': '1.4142', // sqrt(2)
              // width: 'var(--a4-width)',
              // minHeight: 'calc(var(--a4-height-multiplier) * var(--a4-width))',
              boxSizing: 'border-box',
            }}
          >
            {content}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
