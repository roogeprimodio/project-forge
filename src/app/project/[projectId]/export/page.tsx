// src/app/project/[projectId]/export/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Project } from '@/types/project';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, ChevronLeft, Download, CloudOff, Home, FileWarning, Eye } from 'lucide-react';
import { jsPDF } from "jspdf";
import 'jspdf-autotable'; // Ensure autotable plugin is imported for advanced features if needed
import { marked } from 'marked'; // For converting Markdown to HTML (used as intermediate for PDF)
import { useToast } from '@/hooks/use-toast';


// Extend jsPDF type definitions if necessary
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
        lastAutoTable: { finalY?: number }; // Add properties used by autoTable if needed
    }
}


export default function ExportPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.projectId as string;
  const [projects] = useLocalStorage<Project[]>('projects', []);
  const [isProjectFound, setIsProjectFound] = useState<boolean | null>(null);
  const [format, setFormat] = useState<'markdown' | 'pdf'>('pdf'); // Default to PDF
  const [includeTitlePage, setIncludeTitlePage] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [addHeadersFooters, setAddHeadersFooters] = useState(true); // New option for PDF
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false); // State for preview loading

  const project = useMemo(() => {
    return Array.isArray(projects) ? projects.find(p => p.id === projectId) : undefined;
  }, [projects, projectId]);

  useEffect(() => {
    if (projects !== undefined && isProjectFound === null) {
      const exists = Array.isArray(projects) && projects.some(p => p.id === projectId);
      setIsProjectFound(exists);
    }
  }, [projects, projectId, isProjectFound]);

  const generateMarkdown = () => {
    if (!project) return '';

    let markdown = '';

    if (includeTitlePage) {
        markdown += `# ${project.title}\n\n`;
        if (project.instituteName) markdown += `**Institute:** ${project.instituteName}\n`;
        if (project.branch) markdown += `**Branch:** ${project.branch}\n`;
        if (project.semester) markdown += `**Semester:** ${project.semester}\n`;
        if (project.subject) markdown += `**Subject:** ${project.subject}\n`;
        if (project.teamId) markdown += `**Team ID:** ${project.teamId}\n`;
        if (project.teamDetails) markdown += `**Team Members:**\n${project.teamDetails.split('\n').filter(Boolean).map(line => `- ${line}`).join('\n')}\n`;
        if (project.guideName) markdown += `**Guide:** ${project.guideName}\n\n`;
        markdown += '---\n\n';
    }

    project.sections.forEach(section => {
        if (!includeToc && section.name === 'Table of Contents') return;
        markdown += `## ${section.name}\n\n${section.content || '[Content not generated]'}\n\n---\n\n`;
    });

    return markdown;
  };

  // --- Common PDF Generation Logic ---
  const createPdfDocument = async (project: Project): Promise<jsPDF> => {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = margin;
    let currentPage = 1;

    const addHeaderFooter = (currentPageNum: number, totalPagesNum: number, sectionName?: string) => {
        if (!addHeadersFooters) return;
        const headerText = `${project.title} ${sectionName ? `- ${sectionName}` : ''}`;
        const footerText = `Page ${currentPageNum} of ${totalPagesNum}`;

        doc.setFontSize(8);
        doc.setTextColor(150); // Light gray color

        // Header - Limited length
        const maxHeaderWidth = pageWidth - 2 * margin;
        const truncatedHeaderText = doc.splitTextToSize(headerText, maxHeaderWidth)[0]; // Take only the first line if it exceeds width
        doc.text(truncatedHeaderText, margin, margin / 2, { align: 'left' });

        // Footer
        doc.text(footerText, pageWidth / 2, pageHeight - margin / 2, { align: 'center' });

        doc.setTextColor(0); // Reset color
        doc.setFontSize(12); // Reset font size for main content
    };


    const checkAndAddPage = (requiredHeight: number = 10) => {
      if (yPos + requiredHeight > pageHeight - margin) {
        // Don't add header/footer here, do it after content is placed or during final loop
        doc.addPage();
        currentPage++;
        yPos = margin;
      }
    };

    const addFormattedText = async (
        text: string,
        size: number,
        style: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal',
        options: { align?: 'left' | 'center' | 'right'; isHtml?: boolean } = {}
    ) => {
        const maxWidth = pageWidth - 2 * margin;
        doc.setFontSize(size);
        doc.setFont('helvetica', style);

        let textToAdd = text;
        if (options.isHtml) {
            // Basic HTML cleanup for jsPDF's limited support
            textToAdd = textToAdd
                .replace(/<\/?(div|p|br)[^>]*>/gi, '\n') // Replace divs, p, br with newlines
                .replace(/<\/?b[^>]*>|<\/?strong[^>]*>/gi, '**') // Placeholder for bold (jsPDF doesn't directly support complex HTML)
                .replace(/<\/?i[^>]*>|<\/?em[^>]*>/gi, '_')     // Placeholder for italic
                .replace(/<[^>]+>/g, '')              // Remove remaining HTML tags
                .replace(/&nbsp;/g, ' ')              // Replace non-breaking spaces
                .replace(/\n{3,}/g, '\n\n')          // Collapse multiple newlines
                .trim();

             // For actual HTML rendering (more complex, less reliable with pagination)
             /*
             try {
               await doc.html(text, {
                 callback: (docInstance) => {
                   yPos = docInstance.internal.pageSize.height - margin; // Needs refinement
                 },
                 x: margin,
                 y: yPos,
                 width: maxWidth,
                 windowWidth: maxWidth, // Important for scaling
                 autoPaging: 'text', // 'text' or 'slice'
                 margin: [0, margin, margin, margin] // T, R, B, L - Adjust as needed
               });
               yPos = doc.internal.pageSize.getHeight() - margin; // Update yPos after html rendering
               return; // Exit early as html function handles text placement
             } catch (htmlError) {
               console.warn("PDF HTML rendering may have issues, falling back to text:", htmlError);
               // Fallback logic below will handle it as plain text
               textToAdd = text.replace(/<[^>]+>/g, ''); // Basic strip tags for fallback
             }
             */
        }


        const lines = doc.splitTextToSize(textToAdd, maxWidth);
        lines.forEach((line: string) => {
            // Estimate line height based on font size
            const lineHeight = size * 0.35 * 1.2; // size * ptToMm * lineSpacingFactor
            checkAndAddPage(lineHeight);
            doc.text(line, options.align === 'center' ? pageWidth / 2 : margin, yPos, { align: options.align || 'left' });
            yPos += lineHeight;
        });
        checkAndAddPage(5); // Add space after the block
        yPos += 5; // Small gap after text block
    };

    // --- PDF Content Generation ---
    if (includeTitlePage) {
      checkAndAddPage(40); // Estimate space needed
      await addFormattedText(project.title, 22, 'bold', { align: 'center' });
      yPos += 10; // Extra space

      if (project.instituteName) await addFormattedText(`Institute: ${project.instituteName}`, 12);
      if (project.branch) await addFormattedText(`Branch: ${project.branch}`, 12);
      if (project.semester) await addFormattedText(`Semester: ${project.semester}`, 12);
      if (project.subject) await addFormattedText(`Subject: ${project.subject}`, 12);
      if (project.teamId) await addFormattedText(`Team ID: ${project.teamId}`, 12);
      if (project.teamDetails) await addFormattedText(`Team Members:\n${project.teamDetails.split('\n').filter(Boolean).join('\n')}`, 12);
      if (project.guideName) await addFormattedText(`Faculty Guide: ${project.guideName}`, 12);

      doc.addPage(); // Start sections on a new page after the title page
      currentPage++;
      yPos = margin;
    }

    for (const section of project.sections) {
      if (!includeToc && section.name === 'Table of Contents') continue;

      checkAndAddPage(20); // Space for section title
      await addFormattedText(section.name, 16, 'bold'); // Section Title
      yPos += 2; // Small gap after title

      // Convert Markdown to basic text/HTML before passing to addFormattedText
      // jsPDF has very limited HTML support, so we pass isHtml: true to do basic cleanup.
      // For better fidelity, consider a server-side solution or a more robust client-side library.
      const content = section.content || '[Content not generated]';
      const parsedHtmlAttempt = await marked.parse(content); // Convert markdown

      checkAndAddPage(10); // Minimum space before content
      await addFormattedText(parsedHtmlAttempt, 12, 'normal', { isHtml: true }); // Pass as HTML

      checkAndAddPage(5); // Ensure space before potential next section title
      yPos += 5;
    }

     // --- Add Headers and Footers in a final pass ---
     if (addHeadersFooters) {
        const totalPages = doc.internal.pages.length - 1; // Get total number of pages
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            // Ideally, determine the section name for the header based on page content start
            // For simplicity, we'll use a generic header or omit section name
            addHeaderFooter(i, totalPages);
        }
        doc.setPage(totalPages); // Go back to the last page
     }


    return doc;
  };

  // Enhanced PDF generation with Headers and Footers for Export
  const generatePdfForExport = async () => {
    if (!project) return;
    const doc = await createPdfDocument(project);
    doc.save(`${project.title.replace(/ /g, '_')}_report.pdf`);
  };

  // PDF Preview Function using direct browser rendering
  const handlePreview = async () => {
     if (!project || format !== 'pdf') {
        toast({ variant: "destructive", title: "Preview Unavailable", description: "Preview is only available for PDF format." });
        return;
     }
     setIsPreviewing(true);
     toast({ title: "Generating Preview...", description: "Opening PDF in a new tab..." });
     try {
       const doc = await createPdfDocument(project);

       // Open in new tab using data URL.
       // Note: Google Drive Viewer (gview) cannot access client-side generated
       // data URIs or blob URLs directly because they are not publicly hosted.
       // Opening directly in the browser is the standard client-side approach.
       doc.output('dataurlnewwindow');

       // No explicit success toast needed, as the new tab opening serves as confirmation.
     } catch (error) {
       console.error("Preview generation failed:", error);
       toast({ variant: "destructive", title: "Preview Failed", description: error instanceof Error ? error.message : "An unknown error occurred generating the PDF preview." });
     } finally {
       setIsPreviewing(false);
     }
   };


  const generateDocx = () => {
       // Placeholder for DOCX generation - Requires a library like 'docx'
       toast({
           variant: "destructive",
           title: "DOCX Export Not Implemented",
           description: "Exporting as .docx is not yet available.",
       });
       console.warn("DOCX export functionality requires the 'docx' library and implementation.");
   };

  const handleExport = async () => {
    if (!project) return;
    setIsExporting(true);
    try {
      switch (format) {
        case 'markdown':
          const mdContent = generateMarkdown();
          const mdBlob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
          downloadBlob(mdBlob, `${project.title.replace(/ /g, '_')}_report.md`);
          toast({ title: "Export Successful", description: `Report exported as ${format.toUpperCase()}.` });
          break;
        // case 'docx': // Re-enable when implemented
        //   generateDocx();
        //   break;
        case 'pdf':
          toast({ title: "Generating PDF...", description: "This may take a moment for longer reports."});
          await generatePdfForExport(); // Use the specific export function
          // Add success toast for PDF export
          toast({ title: "Export Successful", description: `Report exported as PDF.` });
          break;
      }
    } catch (error) {
        console.error("Export failed:", error);
        toast({ variant: "destructive", title: "Export Failed", description: error instanceof Error ? error.message : "An unknown error occurred during export." });
    } finally {
        setIsExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Render Logic ---

  if (isProjectFound === null) {
    return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,60px))] text-center p-4"><Loader2 className="h-16 w-16 animate-spin text-primary mb-4" /><p className="text-lg text-muted-foreground">Loading export options...</p></div> );
  }

  if (!isProjectFound || !project) {
    return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,60px))] text-center p-4"><CloudOff className="h-16 w-16 text-destructive mb-4" /><h2 className="text-2xl font-semibold text-destructive mb-2">Project Not Found</h2><p className="text-muted-foreground mb-6">Cannot export project with ID <code className="bg-muted px-1 rounded">{projectId}</code>.</p><Button onClick={() => router.push('/')}><Home className="mr-2 h-4 w-4" /> Go to Dashboard</Button></div> );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-2xl">
       <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
         <ChevronLeft className="mr-2 h-4 w-4" /> Back to Editor
       </Button>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-primary text-glow-primary">Export Project Report</CardTitle>
          <CardDescription>Choose the format and options for exporting "{project.title}".</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="format-select">Export Format</Label>
            <Select value={format} onValueChange={(value: 'markdown' | 'pdf') => setFormat(value)}>
              <SelectTrigger id="format-select" className="w-full">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">Markdown (.md)</SelectItem>
                <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                <SelectItem value="docx" disabled>DOCX (.docx) - Coming Soon</SelectItem>
              </SelectContent>
            </Select>
             {format === 'pdf' && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><FileWarning className="h-3 w-3 text-amber-500"/> PDF formatting has limitations and may differ from screen.</p>}
             {format === 'docx' && <p className="text-xs text-muted-foreground mt-1">DOCX export is not yet available.</p>}
          </div>

          <div className="space-y-4">
             <Label>Include</Label>
             <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-title"
                  checked={includeTitlePage}
                  onCheckedChange={(checked) => setIncludeTitlePage(!!checked)}
                />
                <Label htmlFor="include-title" className="font-normal cursor-pointer">
                  Title Page / Project Details
                </Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-toc"
                  checked={includeToc}
                  onCheckedChange={(checked) => setIncludeToc(!!checked)}
                />
                <Label htmlFor="include-toc" className="font-normal cursor-pointer">
                  Table of Contents (if generated)
                </Label>
             </div>
             {format === 'pdf' && (
                 <div className="flex items-center space-x-2">
                    <Checkbox
                      id="add-headers-footers"
                      checked={addHeadersFooters}
                      onCheckedChange={(checked) => setAddHeadersFooters(!!checked)}
                    />
                    <Label htmlFor="add-headers-footers" className="font-normal cursor-pointer">
                      Headers (Title) & Footers (Page Numbers)
                    </Label>
                 </div>
             )}
          </div>

        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2">
           <Button
               variant="outline"
               onClick={handlePreview}
               disabled={isPreviewing || isExporting || format !== 'pdf'}
               className="w-full sm:w-auto focus-visible:glow-accent"
           >
               {isPreviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
               {isPreviewing ? 'Generating Preview...' : 'Preview PDF'}
           </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || isPreviewing || format === 'docx'} // Disable if exporting/previewing or format is DOCX
            className="w-full sm:flex-1 hover:glow-primary focus-visible:glow-primary" // flex-1 to take remaining space on small screens if needed
          >
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {isExporting ? `Exporting as ${format.toUpperCase()}...` : `Export as ${format.toUpperCase()}`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
