
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
import 'jspdf-autotable';
import { marked } from 'marked';
import { useToast } from '@/hooks/use-toast';


declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
        lastAutoTable: { finalY?: number };
    }
}


export default function ExportPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.projectId as string;
  const [projects] = useLocalStorage<Project[]>('projects', []);
  const [isProjectFound, setIsProjectFound] = useState<boolean | null>(null);
  const [format, setFormat] = useState<'markdown' | 'pdf'>('pdf');
  const [includeTitlePage, setIncludeTitlePage] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [addHeadersFooters, setAddHeadersFooters] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

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

  const createPdfDocument = async (project: Project): Promise<jsPDF> => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
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
        doc.setTextColor(150);
        const maxHeaderWidth = pageWidth - 2 * margin;
        const truncatedHeaderText = doc.splitTextToSize(headerText, maxHeaderWidth)[0];
        doc.text(truncatedHeaderText, margin, margin / 2, { align: 'left' });
        doc.text(footerText, pageWidth / 2, pageHeight - margin / 2, { align: 'center' });
        doc.setTextColor(0);
        doc.setFontSize(12);
    };

    const checkAndAddPage = (requiredHeight: number = 10) => {
      if (yPos + requiredHeight > pageHeight - margin) {
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
            textToAdd = textToAdd
                .replace(/<\/?(div|p|br)[^>]*>/gi, '\n')
                .replace(/<\/?b[^>]*>|<\/?strong[^>]*>/gi, '**')
                .replace(/<\/?i[^>]*>|<\/?em[^>]*>/gi, '_')
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        }
        const lines = doc.splitTextToSize(textToAdd, maxWidth);
        lines.forEach((line: string) => {
            const lineHeight = size * 0.35 * 1.2;
            checkAndAddPage(lineHeight);
            doc.text(line, options.align === 'center' ? pageWidth / 2 : margin, yPos, { align: options.align || 'left' });
            yPos += lineHeight;
        });
        checkAndAddPage(5);
        yPos += 5;
    };

    if (includeTitlePage) {
      checkAndAddPage(40);
      await addFormattedText(project.title, 22, 'bold', { align: 'center' });
      yPos += 10;
      if (project.instituteName) await addFormattedText(`Institute: ${project.instituteName}`, 12);
      if (project.branch) await addFormattedText(`Branch: ${project.branch}`, 12);
      if (project.semester) await addFormattedText(`Semester: ${project.semester}`, 12);
      if (project.subject) await addFormattedText(`Subject: ${project.subject}`, 12);
      if (project.teamId) await addFormattedText(`Team ID: ${project.teamId}`, 12);
      if (project.teamDetails) await addFormattedText(`Team Members:\n${project.teamDetails.split('\n').filter(Boolean).join('\n')}`, 12);
      if (project.guideName) await addFormattedText(`Faculty Guide: ${project.guideName}`, 12);
      doc.addPage();
      currentPage++;
      yPos = margin;
    }

    for (const section of project.sections) {
      if (!includeToc && section.name === 'Table of Contents') continue;
      checkAndAddPage(20);
      await addFormattedText(section.name, 16, 'bold');
      yPos += 2;
      const content = section.content || '[Content not generated]';
      const parsedHtmlAttempt = await marked.parse(content);
      checkAndAddPage(10);
      await addFormattedText(parsedHtmlAttempt, 12, 'normal', { isHtml: true });
      checkAndAddPage(5);
      yPos += 5;
    }

     if (addHeadersFooters) {
        const totalPages = doc.internal.pages.length - 1;
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addHeaderFooter(i, totalPages);
        }
        doc.setPage(totalPages);
     }
    return doc;
  };

  const generatePdfForExport = async () => {
    if (!project) return;
    const doc = await createPdfDocument(project);
    doc.save(`${project.title.replace(/ /g, '_')}_report.pdf`);
  };

  const handlePreview = async () => {
     if (!project || format !== 'pdf') {
        toast({ variant: "destructive", title: "Preview Unavailable", description: "Preview is only available for PDF format." });
        return;
     }
     setIsPreviewing(true);
     toast({ title: "Generating Preview...", description: "Opening PDF in a new tab..." });
     try {
       const doc = await createPdfDocument(project);
       doc.output('dataurlnewwindow');
     } catch (error) {
       console.error("Preview generation failed:", error);
       toast({ variant: "destructive", title: "Preview Failed", description: error instanceof Error ? error.message : "An unknown error occurred." });
     } finally {
       setIsPreviewing(false);
     }
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
        case 'pdf':
          toast({ title: "Generating PDF...", description: "This may take a moment."});
          await generatePdfForExport();
          toast({ title: "Export Successful", description: `Report exported as PDF.` });
          break;
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

  if (isProjectFound === null) {
    return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,60px))] text-center p-4"><Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-primary mb-4" /><p className="text-base sm:text-lg text-muted-foreground">Loading...</p></div> );
  }

  if (!isProjectFound || !project) {
    return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,60px))] text-center p-4"><CloudOff className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mb-4" /><h2 className="text-xl sm:text-2xl font-semibold text-destructive mb-2">Project Not Found</h2><p className="text-muted-foreground mb-6 text-sm sm:text-base">Cannot export project with ID <code className="bg-muted px-1 rounded">{projectId}</code>.</p><Button onClick={() => router.push('/')} size="sm"><Home className="mr-2 h-4 w-4" /> Dashboard</Button></div> );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-8 max-w-lg sm:max-w-xl md:max-w-2xl">
       <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4 text-xs sm:text-sm">
         <ChevronLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Back to Editor
       </Button>
      <Card className="shadow-lg">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl text-primary text-glow-primary">Export Report</CardTitle>
          <CardDescription className="text-sm">Export "{project.title}" in your desired format.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="format-select" className="text-sm">Format</Label>
            <Select value={format} onValueChange={(value: 'markdown' | 'pdf') => setFormat(value)}>
              <SelectTrigger id="format-select" className="w-full h-9 sm:h-10 text-sm">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">Markdown (.md)</SelectItem>
                <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                <SelectItem value="docx" disabled>DOCX (.docx) - Soon</SelectItem>
              </SelectContent>
            </Select>
             {format === 'pdf' && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><FileWarning className="h-3 w-3 text-amber-500"/> PDF formatting may vary.</p>}
          </div>

          <div className="space-y-3 sm:space-y-4">
             <Label className="text-sm">Include</Label>
             <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-title"
                  checked={includeTitlePage}
                  onCheckedChange={(checked) => setIncludeTitlePage(!!checked)}
                />
                <Label htmlFor="include-title" className="text-sm font-normal cursor-pointer">
                  Title Page / Project Details
                </Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-toc"
                  checked={includeToc}
                  onCheckedChange={(checked) => setIncludeToc(!!checked)}
                />
                <Label htmlFor="include-toc" className="text-sm font-normal cursor-pointer">
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
                    <Label htmlFor="add-headers-footers" className="text-sm font-normal cursor-pointer">
                      Headers & Footers (PDF only)
                    </Label>
                 </div>
             )}
          </div>

        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2 p-4 sm:p-6">
           <Button
               variant="outline"
               onClick={handlePreview}
               disabled={isPreviewing || isExporting || format !== 'pdf'}
               className="w-full sm:w-auto focus-visible:glow-accent h-9 sm:h-10 text-sm"
           >
               {isPreviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
               {isPreviewing ? 'Generating...' : 'Preview PDF'}
           </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || isPreviewing || format === 'docx'}
            className="w-full sm:flex-1 hover:glow-primary focus-visible:glow-primary h-9 sm:h-10 text-sm"
          >
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {isExporting ? `Exporting...` : `Export as ${format.toUpperCase()}`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
