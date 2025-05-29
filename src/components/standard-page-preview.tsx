
"use client";

import React, { useEffect, useState } from 'react';
import type { Project } from '@/types/project';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import MarkdownPreview from './markdown-preview'; // Assuming MarkdownPreview can handle HTML string

// Import server actions for AI generation
import {
  generateCoverPageAction,
  generateCertificateAction,
  generateDeclarationAction,
  generateAbstractAction,
  generateAcknowledgementAction,
} from '@/app/actions';

interface StandardPagePreviewProps {
  pageName: string;
  project: Project;
}

// Helper function to generate static placeholder content for standard pages
// This now returns an HTML string and uses specific placeholders
const getStaticPlaceholderContent = (pageName: string, project: Project): string => {
  const defaultOr = (value: string | undefined, placeholder: string) => value?.trim() || placeholder;
  const defaultYear = new Date().getFullYear().toString();

  switch (pageName) {
    case 'Cover Page':
      return `
        <div style="text-align: center; font-family: 'Times New Roman', serif; padding: 20px; min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #ddd;">
          <div>
            ${project.universityLogoUrl ? `<img src="${project.universityLogoUrl}" alt="University Logo" data-ai-hint="university logo" style="height: 80px; margin-bottom: 15px; margin-top: 30px;"><br>` : ''}
            ${project.collegeLogoUrl ? `<img src="${project.collegeLogoUrl}" alt="College Logo" data-ai-hint="college logo" style="height: 70px; margin-bottom: 25px;"><br>` : ''}
          </div>
          <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center;">
            <h1 style="font-size: 24pt; font-weight: bold; margin-top: 10px; margin-bottom: 30px;">${defaultOr(project.title, '[Project Title Placeholder]')}</h1>
            <p style="font-size: 12pt; margin-bottom: 5px;"><em>A Project Report Submitted By</em></p>
            <div style="font-size: 14pt; font-weight: bold; margin-bottom: 20px;">
              ${(defaultOr(project.teamDetails, '[Team Member Names & Enrollment Numbers Placeholder]').split('\n').filter(Boolean).map(line => `${line}<br>`).join(''))}
            </div>
            <p style="font-size: 12pt; margin-bottom: 5px;"><em>In partial fulfillment for the award of the degree of</em></p>
            <p style="font-size: 16pt; font-weight: bold; margin-bottom: 5px;">${defaultOr(project.degree, '[Degree Placeholder]')}</p>
            <p style="font-size: 12pt; margin-bottom: 5px;"><em>In</em></p>
            <p style="font-size: 14pt; font-weight: bold; margin-bottom: 20px;">${defaultOr(project.branch, '[Branch Placeholder]')}</p>
            <p style="font-size: 12pt; margin-bottom: 5px;"><em>At</em></p>
            <p style="font-size: 14pt; font-weight: bold;">${defaultOr(project.instituteName, '[Institute Name Placeholder]')}</p>
            ${project.universityName ? `<p style="font-size: 12pt; margin-bottom: 30px;">(Affiliated to ${defaultOr(project.universityName, '[University Name Placeholder]')})</p>` : '<div style="margin-bottom: 30px;"></div>'}
          </div>
          <div style="margin-top: auto;">
            <p style="font-size: 12pt;">${defaultOr(project.submissionDate, '[Submission Date Placeholder]')}</p>
          </div>
        </div>
      `;
    case 'Certificate':
      return `
        <div style="text-align: center; font-family: 'Times New Roman', serif; padding: 20px; border: 1px solid #ccc; margin: 20px; page-break-after: always;">
          ${project.collegeLogoUrl ? `<img src="${project.collegeLogoUrl}" alt="College Logo" data-ai-hint="college logo" style="height: 70px; margin-bottom: 15px; margin-top: 10px;"><br>` : ''}
          <h2 style="font-size: 18pt; font-weight: bold; margin-top: 20px; margin-bottom: 5px;">${defaultOr(project.instituteName, '[Institute Name Placeholder]')}</h2>
          <h3 style="font-size: 14pt; margin-bottom: 25px;">Department of ${defaultOr(project.branch, '[Branch Placeholder]')}</h3>
          <h1 style="font-size: 22pt; font-weight: bold; margin-bottom: 30px; text-decoration: underline;">CERTIFICATE</h1>
          <p style="font-size: 12pt; line-height: 1.6; text-align: justify; margin-bottom: 15px;">This is to certify that the project report entitled</p>
          <p style="font-size: 14pt; font-weight: bold; margin-bottom: 15px;">"${defaultOr(project.title, '[Project Title Placeholder]')}"</p>
          <p style="font-size: 12pt; line-height: 1.6; text-align: justify; margin-bottom: 15px;">is a bonafide record of the work carried out by:</p>
          <div style="font-size: 12pt; font-weight: bold; margin-bottom: 20px; text-align: center;">
            ${(defaultOr(project.teamDetails, '[Team Member Names & Enrollment Numbers Placeholder]').split('\n').filter(Boolean).map(line => `${line}<br>`).join(''))}
          </div>
          <p style="font-size: 12pt; line-height: 1.6; text-align: justify; margin-bottom: 30px;">in partial fulfillment of the requirements for the award of the degree of <strong>${defaultOr(project.degree, '[Degree Placeholder]')}</strong> in <strong>${defaultOr(project.branch, '[Branch Placeholder]')}</strong> during the academic year ${defaultOr(project.submissionYear, defaultYear)}.</p>
          <div style="display: flex; justify-content: space-between; margin-top: 70px; font-size: 12pt;">
            <div style="text-align: left;">
              <div style="height: 30px;"></div><hr style="border-top: 1px solid #000; width: 150px; margin-bottom: 5px;">
              <strong>${defaultOr(project.guideName, '[Guide Name Placeholder]')}</strong><br>(Project Guide)
            </div>
            <div style="text-align: right;">
              <div style="height: 30px;"></div><hr style="border-top: 1px solid #000; width: 150px; margin-bottom: 5px;">
              <strong>${defaultOr(project.hodName, '[HOD Name Placeholder]')}</strong><br>(Head of Department)
            </div>
          </div>
        </div>
      `;
     case 'Declaration':
        const teamMembers = defaultOr(project.teamDetails, '[Team Member Names & Enrollment Numbers Placeholder]').split('\n').filter(Boolean);
        const isPlural = teamMembers.length > 1 || (teamMembers.length === 0 && project.teamDetails?.includes('\n'));
        const pronoun = isPlural ? "We" : "I";
        const objectPronoun = isPlural ? "us" : "me";
        return `
            <div style="font-family: 'Times New Roman', serif; padding: 20px; margin: 20px; page-break-after: always;">
            <h1 style="text-align: center; font-size: 20pt; font-weight: bold; margin-bottom: 40px; text-decoration: underline;">DECLARATION</h1>
            <p style="font-size: 12pt; line-height: 1.8; text-align: justify; margin-bottom: 20px;">
            ${pronoun}, the undersigned, hereby declare that the project report entitled
            </p>
            <p style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 20px;">
            "${defaultOr(project.title, '[Project Title Placeholder]')}"
            </p>
            <p style="font-size: 12pt; line-height: 1.8; text-align: justify; margin-bottom: 20px;">
            submitted for the degree of <strong>${defaultOr(project.degree, '[Degree Placeholder]')}</strong> in <strong>${defaultOr(project.branch, '[Branch Placeholder]')}</strong> at <strong>${defaultOr(project.instituteName, '[Institute Name Placeholder]')}</strong>, is a record of original work done by ${objectPronoun}. This work has not been submitted in part or full for any other degree or diploma of any university or institution.
            </p>
            <br><br><br>
            <div style="font-size: 12pt; margin-top: 50px;">
            ${teamMembers.length > 0 ? teamMembers.map(member => `<div style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;"><span style="min-width: 250px;">${member}</span><span style="border-bottom: 1px solid #000; width: 200px; text-align: right; padding-bottom: 2px;">(Signature)</span></div>`).join('') : `<div style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;"><span style="min-width: 250px;">[Team Member Names & Enrollment Numbers Placeholder]</span><span style="border-bottom: 1px solid #000; width: 200px; text-align: right; padding-bottom: 2px;">(Signature)</span></div>`}
            </div>
            <br>
            <p style="font-size: 12pt; margin-top: 30px; text-align: left;">Date: ${defaultOr(project.submissionDate, '[Submission Date Placeholder]')}</p>
            <p style="font-size: 12pt; text-align: left;">Place: [City/Town Placeholder]</p>
            </div>
        `;
    case 'Abstract':
        const isContextSufficient = project.projectContext && project.projectContext.trim().length >= 50;
        return `
          <div style="font-family: 'Times New Roman', serif; padding: 20px; margin: 20px; page-break-after: always;">
          <h1 style="text-align: center; font-size: 20pt; font-weight: bold; margin-bottom: 30px; text-decoration: underline;">ABSTRACT</h1>
          <p style="font-size: 12pt; line-height: 1.8; text-align: justify; text-indent: 30px;">
            ${isContextSufficient ? '[Abstract content will be generated by AI. Please click "Generate with AI".]' : '[Abstract content cannot be generated due to insufficient project context. Please provide more details in Project Details section.]'}
          </p>
          <br><br>
          <p style="font-size: 12pt; font-weight: bold;">Keywords: <span style="font-weight: normal;">${isContextSufficient ? '[Keywords will be suggested by AI]' : '[Keywords placeholder - add 3-5 relevant keywords]'}</span></p>
          </div>
        `;
    case 'Acknowledgement':
        const ackTeamMembers = defaultOr(project.teamDetails, '[Team Member Name(s) & Enrollment Placeholder(s)]').split('\n').filter(Boolean);
        const ackIsPlural = ackTeamMembers.length > 1 || (ackTeamMembers.length === 0 && project.teamDetails?.includes('\n'));
        const ackPronoun = ackIsPlural ? "We" : "I";
        const ackPossessivePronoun = ackIsPlural ? "our" : "my";
        const ackVerbOwe = "owe"; // Helper would handle this
        const ackVerbAmAre = ackIsPlural ? "are" : "am"; // Helper would handle this
        const ackVerbWish = "wish"; // Helper would handle this
        const ackThankHOD = project.hodName ? `To the Head of the Department, Prof. ${defaultOr(project.hodName, '[HOD Name Placeholder]')}, ${ackPronoun} would like to express ${ackPossessivePronoun} gratitude for his/her cordial collaboration and support in ${ackPossessivePronoun} endeavor.` : '';
        const ackAdditionalThanks = project.additionalThanks ? `<p style="font-size: 12pt; line-height: 1.8; text-align: justify; text-indent: 30px; margin-bottom: 15px;">${ackPronoun} would also like to extend ${ackPossessivePronoun} thanks to ${project.additionalThanks}.</p>` : '';

        return `
            <div style="font-family: 'Times New Roman', serif; padding: 20px; margin: 20px; page-break-after: always;">
            <h1 style="text-align: center; font-size: 20pt; font-weight: bold; margin-bottom: 30px; text-decoration: underline;">ACKNOWLEDGEMENT</h1>
            <p style="font-size: 12pt; line-height: 1.8; text-align: justify; text-indent: 30px; margin-bottom: 15px;">
            ${ackPronoun} would like to express ${ackPossessivePronoun} sincere gratitude to all those who have helped ${ackPronoun} in the successful completion of this project. This project has taken a lot of time and work on ${ackPossessivePronoun} part. However, it would not have been possible without the kind support and cooperation of many individuals and organizations.
            </p>
            <p style="font-size: 12pt; line-height: 1.8; text-align: justify; text-indent: 30px; margin-bottom: 15px;">
            ${ackPronoun} ${ackVerbOwe} a lot to ${defaultOr(project.guideName, '[Guide Name Placeholder]')} for ${ackPossessivePronoun} guidance and constant supervision, as well as for providing important project specifics and invaluable support throughout the course of this project.
            </p>
            <p style="font-size: 12pt; line-height: 1.8; text-align: justify; text-indent: 30px; margin-bottom: 15px;">
            ${ackPronoun} ${ackVerbAmAre} thankful to the <strong>${defaultOr(project.instituteName, '[Institute Name Placeholder]')}</strong> and the Department of <strong>${defaultOr(project.branch, '[Branch Placeholder]')}</strong> for providing all the necessary facilities and a conducive environment for the project work.
            ${ackThankHOD}
            </p>
            ${ackAdditionalThanks}
            <p style="font-size: 12pt; line-height: 1.8; text-align: justify; text-indent: 30px; margin-bottom: 15px;">
            Finally, ${ackPronoun} ${ackVerbWish} to thank ${ackPossessivePronoun} friends and family for their encouragement and support.
            </p>
            <br><br>
            <div style="font-size: 12pt; margin-top: 40px; text-align: right;">
            ${ackTeamMembers.length > 0 ? ackTeamMembers.map(member => `<div style="margin-bottom: 5px;"><strong>${member}</strong></div>`).join('') : `<div style="margin-bottom: 5px;"><strong>[Team Member Name(s) & Enrollment Placeholder(s)]</strong></div>`}
            </div>
            </div>
        `;
    default: // For List of Figures, Tables, Abbreviations, Table of Contents
      return `
        <div class="flex flex-col items-center justify-center text-center text-muted-foreground p-4 h-full">
          <h1 style="text-align: center; font-size: 20pt; font-weight: bold; margin-bottom: 30px; text-decoration: underline; font-family: 'Times New Roman', serif;">${pageName.toUpperCase()}</h1>
          <svg class="w-10 h-10 md:w-12 md:h-12 opacity-50 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <p>Content for "${pageName}" is typically auto-generated during final export or requires manual creation.</p>
          <p class="text-xs italic text-muted-foreground mt-6">This preview shows a placeholder.</p>
        </div>
      `;
  }
};

export const StandardPagePreview: React.FC<StandardPagePreviewProps> = ({ pageName, project }) => {
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setGeneratedContent(null); // Reset AI content when pageName or project key details change
    setError(null);
  }, [pageName, project.id, project.title, project.projectContext, project.teamDetails, project.instituteName, project.branch, project.guideName, project.hodName, project.universityLogoUrl, project.collegeLogoUrl, project.degree, project.submissionDate, project.submissionYear, project.keyFindings, project.additionalThanks, project.universityName]);

  const aiGeneratablePages = ["Cover Page", "Certificate", "Declaration", "Abstract", "Acknowledgement"];
  const canAiGenerate = aiGeneratablePages.includes(pageName);

  const handleGenerateWithAi = async () => {
    if (!project) return;
    setIsLoading(true);
    setError(null);
    setGeneratedContent(null); // Clear previous AI content before new generation

    try {
      let result: any;
      const commonInput = {
        projectTitle: project.title,
        teamDetails: project.teamDetails || "",
        degree: project.degree,
        branch: project.branch,
        instituteName: project.instituteName,
        universityName: project.universityName,
        submissionDate: project.submissionDate,
        universityLogoUrl: project.universityLogoUrl,
        collegeLogoUrl: project.collegeLogoUrl,
        guideName: project.guideName,
        hodName: project.hodName,
        submissionYear: project.submissionYear,
      };

      switch (pageName) {
        case "Cover Page":
          result = await generateCoverPageAction(commonInput);
          if (result && result.coverPageMarkdown) setGeneratedContent(result.coverPageMarkdown);
          break;
        case "Certificate":
          result = await generateCertificateAction(commonInput);
          if (result && result.certificateMarkdown) setGeneratedContent(result.certificateMarkdown);
          break;
        case "Declaration":
          result = await generateDeclarationAction(commonInput);
          if (result && result.declarationMarkdown) setGeneratedContent(result.declarationMarkdown);
          break;
        case "Abstract":
          result = await generateAbstractAction({
            projectTitle: project.title,
            projectContext: project.projectContext || "",
            keyFindings: project.keyFindings
          });
          if (result && result.abstractMarkdown) setGeneratedContent(result.abstractMarkdown);
          break;
        case "Acknowledgement":
          result = await generateAcknowledgementAction({
            projectTitle: project.title,
            guideName: project.guideName,
            instituteName: project.instituteName,
            branch: project.branch,
            hodName: project.hodName,
            teamDetails: project.teamDetails || "",
            additionalThanks: project.additionalThanks
          });
          if (result && result.acknowledgementMarkdown) setGeneratedContent(result.acknowledgementMarkdown);
          break;
        default:
          throw new Error(`AI generation not configured for ${pageName}`);
      }

      if (result && result.error) {
          // If the action returned a specific error message, show it as a toast
          toast({ variant: "destructive", title: `Failed to Generate ${pageName}`, description: result.error, duration: 7000 });
          setError(result.error); // Optionally set local error state too
          setIsLoading(false); // Ensure loading state is reset
          return; // Stop further execution
      }
      toast({ title: `${pageName} Content Generated`, description: "AI has generated the content for this page." });

    } catch (err: any) { // This catch block is for unexpected errors during the action call itself
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during generation.";
      setError(errorMessage);
      toast({ variant: "destructive", title: `Failed to Generate ${pageName}`, description: errorMessage, duration: 7000 });
      console.error(`Error generating ${pageName}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const displayHtml = generatedContent !== null ? generatedContent : getStaticPlaceholderContent(pageName, project);

  return (
    <Card className="shadow-lg w-full h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle className="text-xl md:text-2xl text-primary text-glow-primary">
              Preview: {pageName}
            </CardTitle>
            <CardDescription>This is a preview of how the "{pageName}" might look in the final report. Use project details to fill placeholders.</CardDescription>
          </div>
          {canAiGenerate && (
            <Button onClick={handleGenerateWithAi} disabled={isLoading} size="sm" className="hover:glow-primary focus-visible:glow-primary w-full sm:w-auto mt-2 sm:mt-0">
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI is preparing {pageName.toLowerCase()}...</> : <><Wand2 className="mr-2 h-4 w-4" /> Generate {pageName} with AI</>}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full pr-1">
          {error && !isLoading && !generatedContent && ( // Show error only if not loading, no generated content, and error exists
            <div className="my-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-5 w-5"/> Error Generating Content:
              </div>
              <p className="mt-1 pl-7">{error}</p>
            </div>
          )}
          <div
            className={cn(
              "bg-white dark:bg-neutral-900 shadow-xl rounded-sm mx-auto",
              "p-6 sm:p-10 md:p-16",
              "w-full max-w-[210mm]",
              "min-h-[297mm] md:min-h-[calc(1.4142*var(--a4-width-val,210mm))]",
              "aspect-[210/297]",
              "text-sm sm:text-base"
            )}
            style={{
              '--a4-width-val': '210mm',
               boxSizing: 'border-box',
            } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: displayHtml }}
          />
        </ScrollArea>
      </CardContent>
       {(generatedContent !== null && !error) && (
        <CardFooter>
            <p className="text-xs text-muted-foreground italic">This content was generated by AI. Review and edit placeholders/details as needed.</p>
        </CardFooter>
       )}
    </Card>
  );
};
