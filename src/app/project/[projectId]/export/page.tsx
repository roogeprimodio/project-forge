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
import { Loader2, ChevronLeft, Download, CloudOff, Home } from 'lucide-react';
import { jsPDF } from "jspdf";
import 'jspdf-autotable'; // Import autotable plugin for better table support in PDF
import {marked} from 'marked'; // For converting Markdown to HTML


// Extend jsPDF type definitions to include autoTable if necessary (may not be needed with standard import)
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}


export default function ExportPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [projects] = useLocalStorage<Project[]>('projects', []);
  const [isProjectFound, setIsProjectFound] = useState<boolean | null>(null);
  const [format, setFormat] = useState<'markdown' | 'pdf' | 'html'>('markdown');
  const [includeTitlePage, setIncludeTitlePage] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
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
      if (project.teamDetails) markdown += `**Team:**\n${project.teamDetails.split('\n').map(line => `- ${line}`).join('\n')}\n\n`;
      if (project.collegeInfo) markdown += `**College:** ${project.collegeInfo}\n\n`;
      markdown += '---\n\n';
    }

    project.sections.forEach(section => {
        if (!includeToc && section.name === 'Table of Contents') return;
        markdown += `## ${section.name}\n\n${section.content}\n\n---\n\n`;
    });

    return markdown;
  };

   const generateHtml = async (markdownContent: string): Promise<string> => {
        const htmlBody = await marked.parse(markdownContent);
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project?.title || 'Project Report'}</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: auto; }
        h1, h2, h3 { color: #333; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #eee; padding-bottom: 5px; }
        pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
        code { font-family: monospace; }
        blockquote { border-left: 4px solid #ccc; padding-left: 10px; color: #666; margin-left: 0; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        hr { border: 0; height: 1px; background: #eee; margin: 20px 0; }
    </style>
</head>
<body>
    ${htmlBody}
</body>
</html>
        `;
    };

  const generatePdf = async () => {
    if (!project) return;
    const doc = new jsPDF();
    let yPos = 15; // Initial Y position

    const addText = (text: string, size: number, style = 'normal', maxWidth = 180) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style); // Correct method to set font style
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        if (yPos > 280) { // Check if new page needed
          doc.addPage();
          yPos = 15;
        }
        doc.text(line, 15, yPos);
        yPos += (size * 0.35) + 2; // Adjust line spacing based on font size
      });
       yPos += 5; // Add some space after the block
    };

    if (includeTitlePage) {
      addText(project.title, 24, 'bold');
      if (project.teamDetails) addText(`Team:\n${project.teamDetails}`, 12);
      if (project.collegeInfo) addText(`College: ${project.collegeInfo}`, 12);
      yPos += 10; // Add extra space after title page elements
    }

    // Use marked to parse markdown to HTML, then try to add HTML to PDF
    for (const section of project.sections) {
        if (!includeToc && section.name === 'Table of Contents') continue;

        if (yPos > 260) { // Check before starting section
             doc.addPage();
             yPos = 15;
         }
        addText(section.name, 16, 'bold'); // Section Title

        try {
             // Convert markdown section content to HTML
            const htmlContent = await marked.parse(section.content || '');

            // Attempt to render HTML. Note: jsPDF's HTML support is limited.
            // Complex HTML/CSS won't render well. Consider alternative libraries (html2pdf.js)
            // or simplifying the markdown/HTML for PDF export if this isn't sufficient.
            await doc.html(htmlContent, {
                 callback: function (doc) {
                     // Update yPos based on where the HTML rendering finished (if possible)
                     // This part is tricky and might need refinement or a different approach
                     // For now, let's add a fixed space or estimate
                     // yPos = doc.internal.pageSize.height - 20; // Example: Move to near bottom (not ideal)
                 },
                 x: 15,
                 y: yPos,
                 width: 180, // Maximum width
                 windowWidth: 800 // Virtual window width for rendering
             });
             // Manually adjust yPos after HTML rendering - this is a rough estimate
             // A better approach might involve parsing the rendered HTML height if the callback provided it.
             yPos += 60; // Increment by an estimated amount, adjust as needed

        } catch (htmlError) {
            console.error("Error rendering HTML to PDF, falling back to text:", htmlError);
            // Fallback: Add content as plain text if HTML fails
             addText(section.content || '', 12);
        }

         yPos += 10; // Add space between sections
    }

    doc.save(`${project.title.replace(/ /g, '_')}_report.pdf`);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      switch (format) {
        case 'markdown':
          const mdContent = generateMarkdown();
          const mdBlob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
          downloadBlob(mdBlob, `${project?.title.replace(/ /g, '_')}_report.md`);
          break;
        case 'html':
          const mdForHtml = generateMarkdown(); // Generate markdown first
          const htmlContent = await generateHtml(mdForHtml);
          const htmlBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
          downloadBlob(htmlBlob, `${project?.title.replace(/ /g, '_')}_report.html`);
          break;
        case 'pdf':
          await generatePdf(); // generatePdf handles its own download
          break;
      }
    } catch (error) {
        console.error("Export failed:", error);
        // Add toast notification for error
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
    return ( <div className="flex flex-col items-center justify-center min-h-screen text-center p-4"><Loader2 className="h-16 w-16 animate-spin text-primary mb-4" /><p className="text-lg text-muted-foreground">Loading export options...</p></div> );
  }

  if (!isProjectFound || !project) {
    return ( <div className="flex flex-col items-center justify-center min-h-screen text-center p-4"><CloudOff className="h-16 w-16 text-destructive mb-4" /><h2 className="text-2xl font-semibold text-destructive mb-2">Project Not Found</h2><p className="text-muted-foreground mb-6">Cannot export project with ID <code className="bg-muted px-1 rounded">{projectId}</code>.</p><Button onClick={() => router.push('/')}><Home className="mr-2 h-4 w-4" /> Go to Dashboard</Button></div> );
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
            <Select value={format} onValueChange={(value: 'markdown' | 'pdf' | 'html') => setFormat(value)}>
              <SelectTrigger id="format-select" className="w-full">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">Markdown (.md)</SelectItem>
                <SelectItem value="html">HTML (.html)</SelectItem>
                <SelectItem value="pdf">PDF (.pdf)</SelectItem>
              </SelectContent>
            </Select>
             {format === 'pdf' && <p className="text-xs text-muted-foreground">Note: PDF export has limited formatting capabilities for complex content like tables or advanced markdown.</p>}
          </div>

          <div className="space-y-4">
             <Label>Include</Label>
             <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-title"
                  checked={includeTitlePage}
                  onCheckedChange={(checked) => setIncludeTitlePage(!!checked)} // Handle boolean conversion
                />
                <Label htmlFor="include-title" className="font-normal">
                  Title Page (Project Title, Team, College)
                </Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-toc"
                  checked={includeToc}
                  onCheckedChange={(checked) => setIncludeToc(!!checked)}
                />
                <Label htmlFor="include-toc" className="font-normal">
                  Table of Contents (if generated)
                </Label>
             </div>
          </div>

        </CardContent>
        <CardFooter>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full hover:glow-primary focus-visible:glow-primary"
          >
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {isExporting ? `Exporting as ${format.toUpperCase()}...` : `Export as ${format.toUpperCase()}`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
