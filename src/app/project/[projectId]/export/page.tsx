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
import { Loader2, ChevronLeft, Download, CloudOff, Home, FileWarning } from 'lucide-react';
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
  const [format, setFormat] = useState<'markdown' | 'pdf'>('markdown'); // Removed 'html', 'docx' for now
  const [includeTitlePage, setIncludeTitlePage] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [addHeadersFooters, setAddHeadersFooters] = useState(true); // New option for PDF
  const [isExporting, setIsExporting] = useState(false);

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

  // Enhanced PDF generation with Headers and Footers
  const generatePdf = async () => {
    if (!project) return;
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

    const addHeaderFooter = (sectionName?: string) => {
        if (!addHeadersFooters) return;
        const headerText = `${project.title} ${sectionName ? `- ${sectionName}` : ''}`;
        const footerText = `Page ${currentPage}`;

        doc.setFontSize(8);
        doc.setTextColor(150); // Light gray color

        // Header
        doc.text(headerText, margin, margin / 2, { align: 'left' });
        // Footer
        doc.text(footerText, pageWidth / 2, pageHeight - margin / 2, { align: 'center' });

        doc.setTextColor(0); // Reset color
    };

    const checkAndAddPage = (requiredHeight: number = 10) => {
        if (yPos + requiredHeight > pageHeight - margin) {
            addHeaderFooter(); // Add footer to current page before adding new one
            doc.addPage();
            currentPage++;
            yPos = margin;
            addHeaderFooter(); // Add header to new page
        }
    };

     // Helper to add text and manage yPos, checks for page breaks
    const addFormattedText = async (text: string, size: number, style = 'normal', options: { align?: 'left' | 'center' | 'right', isHtml?: boolean } = {}) => {
        const maxWidth = pageWidth - 2 * margin;
        doc.setFontSize(size);
        doc.setFont('helvetica', style);

        if (options.isHtml) {
             try {
                // Attempt to render HTML. jsPDF's support is basic.
                // This might need adjustment based on content complexity.
                const element = document.createElement('div');
                element.innerHTML = text; // Ensure text is valid HTML
                 element.style.width = `${maxWidth}mm`; // Set width for rendering

                await doc.html(element, {
                    callback: function (docInstance) {
                         // Use finalY from autoTable if available, otherwise estimate
                         yPos = (docInstance as any).lastAutoTable?.finalY ? (docInstance as any).lastAutoTable.finalY + 5 : yPos + 10; // Estimate increment
                    },
                    x: margin,
                    y: yPos,
                     html2canvas: { scale: 0.26 }, // Adjust scale as needed
                     margin: [0, margin, 0, margin], // Top, Right, Bottom, Left
                     autoPaging: 'text', // Try 'text' or 'slice'
                     width: maxWidth,
                });
                 // Ensure yPos is updated after potential page breaks from html()
                 yPos = doc.internal.pageSize.height - margin; // Rough estimate, move near bottom

            } catch (htmlError) {
                console.warn("PDF HTML rendering failed, falling back to text:", htmlError);
                 // Fallback to plain text rendering
                 const lines = doc.splitTextToSize(text.replace(/<[^>]+>/g, ''), maxWidth); // Strip HTML tags for fallback
                 lines.forEach((line: string) => {
                    checkAndAddPage(size * 0.35 + 2);
                    doc.text(line, options.align === 'center' ? pageWidth / 2 : margin, yPos, { align: options.align || 'left' });
                    yPos += size * 0.35 + 2;
                 });
            }
        } else {
            const lines = doc.splitTextToSize(text, maxWidth);
            lines.forEach((line: string) => {
                checkAndAddPage(size * 0.35 + 2);
                doc.text(line, options.align === 'center' ? pageWidth / 2 : margin, yPos, { align: options.align || 'left' });
                yPos += size * 0.35 + 2; // Adjust line spacing
            });
        }
        yPos += 5; // Add space after the block
    };


    // --- PDF Content Generation ---
    addHeaderFooter(); // Add header/footer to the first page

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

        yPos += 10; // Space after title block
    }

    for (const section of project.sections) {
        if (!includeToc && section.name === 'Table of Contents') continue;

        checkAndAddPage(20); // Space for section title
        await addFormattedText(section.name, 16, 'bold'); // Section Title

        // Convert markdown section content to HTML for potential better rendering
         const htmlContent = await marked.parse(section.content || '');

        checkAndAddPage(10); // Minimum space before content
        await addFormattedText(htmlContent || '[Content not generated]', 12, 'normal', { isHtml: true });

        yPos += 5; // Space between sections
    }

    // Add header/footer to the last page if it wasn't added by checkAndAddPage
    if (addHeadersFooters) {
        // Force adding footer to the very last page manually if needed
        // This might require getting the total number of pages after generation
        const totalPages = doc.internal.pages.length -1; // Adjust based on jsPDF internals
         for (let i = 1; i <= totalPages +1; i++) {
             doc.setPage(i);
             doc.setFontSize(8);
             doc.setTextColor(150);
             // Re-add footer to ensure it's on all pages
             doc.text(`Page ${i}`, pageWidth / 2, pageHeight - margin / 2, { align: 'center' });
             doc.setTextColor(0);
             // Re-add header potentially? This is complex if section names vary per page
         }
    }

    doc.save(`${project.title.replace(/ /g, '_')}_report.pdf`);
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
          break;
        // case 'docx': // Re-enable when implemented
        //   generateDocx();
        //   break;
        case 'pdf':
          toast({ title: "Generating PDF...", description: "This may take a moment for longer reports."});
          await generatePdf(); // generatePdf handles its own download
          break;
      }
       if (format !== 'pdf') { // PDF toast is handled inside generatePdf start
           toast({ title: "Export Successful", description: `Report exported as ${format.toUpperCase()}.` });
       }
    } catch (error) {
        console.error("Export failed:", error);
        toast({ variant: "destructive", title: "Export Failed", description: error instanceof Error ? error.message : "An unknown error occurred." });
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
             {format === 'pdf' && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><FileWarning className="h-3 w-3 text-amber-500"/> PDF formatting might differ from screen preview.</p>}
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
        <CardFooter>
          <Button
            onClick={handleExport}
            disabled={isExporting || format === 'docx'} // Disable if exporting or format is DOCX
            className="w-full hover:glow-primary focus-visible:glow-primary"
          >
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {isExporting ? `Exporting as ${format.toUpperCase()}...` : `Export as ${format.toUpperCase()}`}
          </Button>
        </CardFooter>
      </Card>
        {/* Placeholder for Preview Button */}
       {/*
       <div className="mt-6 text-center">
           <Button variant="outline" disabled>
               <Eye className="mr-2 h-4 w-4" /> Preview (Coming Soon)
            </Button>
       </div>
       */}
    </div>
  );
}

    