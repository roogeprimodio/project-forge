
// src/app/project/[projectId]/export/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Project, HierarchicalProjectSection } from '@/types/project';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, ChevronLeft, Download, CloudOff, Home, FileWarning, Eye } from 'lucide-react';
import { jsPDF, HTMLOptionImage } from "jspdf"; // Import HTMLOptionImage for addImage
import 'jspdf-autotable';
import { marked } from 'marked';
import { useToast } from '@/hooks/use-toast';

// Import server actions for standard page generation
import {
  generateCoverPageAction,
  generateCertificateAction,
  generateDeclarationAction,
  generateAbstractAction,
  generateAcknowledgementAction,
} from '@/app/actions';
import { STANDARD_REPORT_PAGES, TOC_SECTION_NAME } from '@/types/project';


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
  const [includeTitlePage, setIncludeTitlePage] = useState(true); // This now refers to the Cover Page standard page
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

  const generateMarkdownForExport = () => {
    if (!project) return '';
    let markdown = '';

    // Simplified Markdown generation - Standard pages are complex HTML, difficult to convert back accurately
    // For Markdown export, we'll primarily focus on project details and report sections' raw Markdown.
    markdown += `# ${project.title}\n\n`;
    if (project.instituteName) markdown += `**Institute:** ${project.instituteName}\n`;
    if (project.branch) markdown += `**Branch:** ${project.branch}\n`;
    // Add other relevant project details...
    markdown += '---\n\n';

    if (includeToc) {
        const tocSection = project.sections.find(s => s.name === TOC_SECTION_NAME);
        if (tocSection) {
            markdown += `## ${TOC_SECTION_NAME}\n\n${tocSection.content || '[ToC not generated]'}\n\n---\n\n`;
        }
    }

    const renderHierarchicalSectionsMd = (sections: HierarchicalProjectSection[], level = 0): string => {
        let md = '';
        sections.forEach(section => {
            if (section.name === TOC_SECTION_NAME && includeToc) return; // Already handled
            md += `${'#'.repeat(level + 2)} ${section.name}\n\n`;
            // For specialized items, you might want to output their prompt or a placeholder
            const nameLower = section.name.toLowerCase();
            if (nameLower.startsWith("diagram:") || nameLower.startsWith("flowchart:")) {
                md += `\`\`\`mermaid\n${section.content || `[Mermaid diagram: ${section.name}]`}\n\`\`\`\n\n`;
            } else if (nameLower.startsWith("figure:")) {
                md += `![Figure: ${section.name}](${section.content || 'placeholder.png'})\n_Prompt: ${section.prompt}_\n\n`;
            } else if (nameLower.startsWith("table:")) {
                md += `${section.content || `[Table data for: ${section.name}]`}\n\n`; // Assuming content is Markdown table
            } else {
                md += `${section.content || '[Content not generated]'}\n\n`;
            }
            if (section.subSections && section.subSections.length > 0) {
                md += renderHierarchicalSectionsMd(section.subSections, level + 1);
            }
            md += '---\n\n';
        });
        return md;
    };
    markdown += renderHierarchicalSectionsMd(project.sections.filter(s => s.name !== TOC_SECTION_NAME));
    return markdown;
  };

  const addHtmlToPdf = async (doc: jsPDF, htmlContent: string, yPosSignal: { y: number }, options: { isStandardPage?: boolean } = {}) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    // Basic styling for PDF rendering consistency for standard pages
    if (options.isStandardPage) {
        tempDiv.style.fontFamily = "'Times New Roman', serif";
        tempDiv.style.fontSize = "12pt";
        tempDiv.style.lineHeight = "1.5";
        tempDiv.style.color = "#000000";
        const allElements = tempDiv.querySelectorAll('*');
        allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.fontFamily = "'Times New Roman', serif";
            htmlEl.style.color = "#000000";
            if (htmlEl.tagName === 'H1') htmlEl.style.fontSize = "20pt";
            if (htmlEl.tagName === 'H2') htmlEl.style.fontSize = "18pt";
            if (htmlEl.tagName === 'P') htmlEl.style.fontSize = "12pt";
        });
    }

    // Append to body to allow jsPDF to calculate dimensions, then remove
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px'; // Position off-screen
    tempDiv.style.width = `${doc.internal.pageSize.getWidth() - 2 * margin}px`; // A4 width minus margins
    document.body.appendChild(tempDiv);

    try {
        await doc.html(tempDiv, {
            callback: function (doc) {
                // yPosSignal.y is updated by jsPDF's html method's internal cursor
            },
            x: margin,
            y: yPosSignal.y,
            autoPaging: 'text', // Changed to 'text' for better flow control
            width: doc.internal.pageSize.getWidth() - 2 * margin,
            windowWidth: doc.internal.pageSize.getWidth() - 2 * margin,
            margin: [0,0,0,0] // internal margins handled by x,y and width
        });
    } catch (e) {
        console.error("Error rendering HTML to PDF with doc.html:", e);
        toast({ variant: "destructive", title: "PDF HTML Error", description: "Could not render some HTML content."});
         // Fallback to simple text rendering if doc.html fails
        doc.setFontSize(10);
        doc.text("Error rendering complex HTML. Content follows as plain text:", margin, yPosSignal.y);
        yPosSignal.y += 7;
        const lines = doc.splitTextToSize(tempDiv.innerText || "Content placeholder", doc.internal.pageSize.getWidth() - 2 * margin);
        lines.forEach((line: string) => {
            if (yPosSignal.y > pageHeight - margin) {
                doc.addPage();
                yPosSignal.y = margin;
            }
            doc.text(line, margin, yPosSignal.y);
            yPosSignal.y += 7;
        });
    } finally {
        document.body.removeChild(tempDiv);
    }
    
    if (yPosSignal.y > pageHeight - margin - 10) { // Ensure some space before adding next element
        doc.addPage();
        yPosSignal.y = margin;
    } else {
        yPosSignal.y += 5; // Add some spacing
    }
};


  const createPdfDocument = async (project: Project): Promise<jsPDF> => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPosSignal = { y: margin }; // Use an object to pass yPos by reference

    const addHeaderFooterToAllPages = (mainProjectTitle: string) => {
        if (!addHeadersFooters) return;
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            const headerText = mainProjectTitle;
            const footerText = `Page ${i} of ${totalPages}`;
            const maxHeaderWidth = pageWidth - 2 * margin;
            const truncatedHeaderText = doc.splitTextToSize(headerText, maxHeaderWidth)[0];
            doc.text(truncatedHeaderText, margin, margin / 2, { align: 'left' });
            doc.text(footerText, pageWidth / 2, pageHeight - margin / 2, { align: 'center' });
            doc.setTextColor(0);
        }
        doc.setPage(totalPages); // Return to the last page
        yPosSignal.y = doc.internal.pageSize.getHeight() - margin; // Ensure yPos is at bottom if it was the last op
        if (yPosSignal.y < margin + 10) yPosSignal.y = margin; // Reset yPos if it ended up too high on a new page.
    };
    
    const checkAndAddPage = (requiredHeight: number = 10) => {
        if (yPosSignal.y + requiredHeight > pageHeight - margin) {
            doc.addPage();
            yPosSignal.y = margin;
        }
    };

    // 1. Standard Pages
    const standardPageActions = {
        "Cover Page": generateCoverPageAction,
        "Certificate": generateCertificateAction,
        "Declaration": generateDeclarationAction,
        "Abstract": generateAbstractAction,
        "Acknowledgement": generateAcknowledgementAction,
    };

    for (const pageName of STANDARD_REPORT_PAGES) {
        if (pageName === TOC_SECTION_NAME && !includeToc) continue;
        // Skip ToC here, will be handled with report sections if enabled.
        // Also skip List of Figures, Tables, Abbreviations as AI doesn't generate these currently.
        if (["List of Figures", "List of Tables", "Abbreviations", TOC_SECTION_NAME].includes(pageName)) continue;

        const action = standardPageActions[pageName as keyof typeof standardPageActions];
        if (action) {
            toast({title: `Generating ${pageName}...`, description: "Please wait."});
            checkAndAddPage(pageHeight - (2 * margin)); // Assume standard page might take full page
            const result = await action({
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
                // For abstract and acknowledgement
                projectContext: project.projectContext || "",
                keyFindings: project.keyFindings,
                additionalThanks: project.additionalThanks,
            });
            
            let htmlContent = "";
            if (result && 'error' in result && result.error) {
                htmlContent = `<p style="color: red;">Error generating ${pageName}: ${result.error}</p>`;
                 toast({variant: "destructive", title: `Error: ${pageName}`, description: result.error});
            } else if (result) {
                if ('coverPageMarkdown' in result) htmlContent = result.coverPageMarkdown;
                else if ('certificateMarkdown' in result) htmlContent = result.certificateMarkdown;
                else if ('declarationMarkdown' in result) htmlContent = result.declarationMarkdown;
                else if ('abstractMarkdown' in result) htmlContent = result.abstractMarkdown;
                else if ('acknowledgementMarkdown' in result) htmlContent = result.acknowledgementMarkdown;
            }
            
            if (htmlContent) {
                 await addHtmlToPdf(doc, htmlContent, yPosSignal, {isStandardPage: true});
                 if (doc.getNumberOfPages() > 0) { // if addHtmlToPdf added pages
                    const lastPage = doc.getNumberOfPages();
                    doc.setPage(lastPage);
                    // This is tricky: doc.html doesn't give a precise finalY.
                    // We might need to estimate or add a manual page break if content is long.
                    // For now, just ensure yPos is reset if it's a new page after html rendering.
                    const currentYAfterHtml = (doc.internal as any).getCurrentPageInfo().pageContext.cursor.y;
                    yPosSignal.y = currentYAfterHtml > margin ? currentYAfterHtml : margin;
                 }
                 doc.addPage(); // Ensure each standard page starts on a new page
                 yPosSignal.y = margin;
            }
        }
    }


    // 2. Table of Contents (if included and exists)
    if (includeToc) {
        const tocSection = project.sections.find(s => s.name === TOC_SECTION_NAME);
        if (tocSection?.content) {
            toast({title: "Adding Table of Contents..."});
            checkAndAddPage(pageHeight - (2*margin)); // Assume ToC might take full page
            await addHtmlToPdf(doc, marked.parse(tocSection.content), yPosSignal);
            doc.addPage();
            yPosSignal.y = margin;
        }
    }

    // 3. Hierarchical Report Sections
    toast({title: "Processing Report Sections..."});
    const renderHierarchicalSectionsPdf = async (sections: HierarchicalProjectSection[], currentLevel: number, numberingPrefix: string) => {
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            if (section.name === TOC_SECTION_NAME) continue; // Skip ToC section itself here

            const currentNumber = `${numberingPrefix}${i + 1}`;
            const headingSize = Math.max(10, 18 - currentLevel * 2);
            
            checkAndAddPage(headingSize * 0.5 + 5); // Estimate heading height
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(headingSize);
            doc.text(`${currentNumber}. ${section.name}`, margin, yPosSignal.y);
            yPosSignal.y += headingSize * 0.5 + 3; // Space after heading

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);

            const nameLower = section.name.toLowerCase();
            if (section.content && section.content.trim()) {
                checkAndAddPage(10); // Min space for content start
                if (nameLower.startsWith("diagram:") || nameLower.startsWith("flowchart:")) {
                    doc.text(`[Mermaid Diagram: ${section.name.substring(nameLower.indexOf(":") + 1).trim()}]`, margin, yPosSignal.y, { maxWidth: pageWidth - 2 * margin });
                    yPosSignal.y += 7; // Placeholder height
                    doc.text(`\`\`\`mermaid\n${section.content}\n\`\`\``, margin, yPosSignal.y, { maxWidth: pageWidth - 2 * margin});
                    yPosSignal.y += (doc.splitTextToSize(section.content, pageWidth - 2 * margin).length + 2) * 5;

                } else if (nameLower.startsWith("figure:")) {
                    if (section.content.startsWith('data:image')) {
                        try {
                             // Estimate image height, this is very rough
                            const imgHeight = 80; // Assume a fixed height or derive from aspect ratio if known
                            checkAndAddPage(imgHeight + 10);
                            doc.addImage(section.content, 'PNG', margin, yPosSignal.y, 100, imgHeight, undefined, 'FAST'); // Adjust width/height as needed
                            yPosSignal.y += imgHeight + 5;
                        } catch (e) {
                            console.error("Error adding image to PDF:", e);
                            doc.text(`[Error displaying image: ${section.name}]`, margin, yPosSignal.y);
                            yPosSignal.y += 7;
                        }
                    } else {
                        doc.text(`[Figure: ${section.name.substring(nameLower.indexOf(":") + 1).trim()}] - Prompt: ${section.prompt}`, margin, yPosSignal.y, { maxWidth: pageWidth - 2 * margin });
                        yPosSignal.y += 7;
                    }
                } else if (nameLower.startsWith("table:")) {
                    try {
                        const tableHtml = marked.parse(section.content);
                        // Strip p tags that marked might add around table for autoTable
                        const tableElement = document.createElement('div');
                        tableElement.innerHTML = tableHtml;
                        const actualTable = tableElement.querySelector('table');
                        if (actualTable) {
                            (doc as any).autoTable({ html: actualTable, startY: yPosSignal.y });
                            yPosSignal.y = (doc as any).lastAutoTable.finalY + 10;
                        } else {
                             await addHtmlToPdf(doc, tableHtml, yPosSignal);
                        }
                    } catch (e) {
                        console.error("Error rendering table to PDF:", e);
                        doc.text(`[Error rendering table: ${section.name}] \n ${section.content}`, margin, yPosSignal.y, { maxWidth: pageWidth - 2 * margin });
                        yPosSignal.y += 14;
                    }
                } else {
                    const htmlContent = marked.parse(section.content);
                    await addHtmlToPdf(doc, htmlContent, yPosSignal);
                }
            }
            
            if (section.subSections && section.subSections.length > 0) {
                 await renderHierarchicalSectionsPdf(section.subSections, currentLevel + 1, `${currentNumber}.`);
            }
            checkAndAddPage(10); // Add some space before next top/sibling section
            yPosSignal.y += 5;
        }
    };

    await renderHierarchicalSectionsPdf(project.sections.filter(s => s.name !== TOC_SECTION_NAME), 0, '');

    addHeaderFooterToAllPages(project.title);
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
          const mdContent = generateMarkdownForExport();
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
             {format === 'pdf' && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><FileWarning className="h-3 w-3 text-amber-500"/> PDF formatting may vary. Complex layouts/styles might not render perfectly.</p>}
          </div>

          <div className="space-y-3 sm:space-y-4">
             <Label className="text-sm">Include</Label>
             {/* "Include Title Page" now refers to the standard Cover Page for PDF */}
             <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-title"
                  checked={includeTitlePage} // This can be kept for MD, or re-purposed for PDF's standard "Cover Page"
                  onCheckedChange={(checked) => setIncludeTitlePage(!!checked)}
                />
                <Label htmlFor="include-title" className="text-sm font-normal cursor-pointer">
                  Standard Cover Page (PDF) / Basic Title (MD)
                </Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-toc"
                  checked={includeToc}
                  onCheckedChange={(checked) => setIncludeToc(!!checked)}
                />
                <Label htmlFor="include-toc" className="text-sm font-normal cursor-pointer">
                  Table of Contents (if generated in sections)
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

