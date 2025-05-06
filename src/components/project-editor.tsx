"use client"; // Keep this if ProjectEditor uses client hooks like useState, useEffect

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Settings, ChevronLeft, Save, Loader2, Wand2, ScrollText, Download, Lightbulb, FileText, Cloud, CloudOff, Home, Menu, Undo, MessageSquareQuote, Sparkles, UploadCloud, XCircle, ShieldAlert, Eye, Projector, BrainCircuit, Plus, Minus, CheckCircle, Edit3, ChevronRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import type { Project, HierarchicalProjectSection, GeneratedSectionOutline, SectionIdentifier, OutlineSection } from '@/types/project'; // Use hierarchical type
import { findSectionById, updateSectionById, deleteSectionById, STANDARD_REPORT_PAGES, STANDARD_PAGE_INDICES, TOC_SECTION_NAME, ensureDefaultSubSection, getSectionNumbering } from '@/lib/project-utils';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { generateSectionAction, summarizeSectionAction, generateOutlineAction, suggestImprovementsAction, generateDiagramAction } from '@/app/actions';
import type { GenerateDiagramMermaidInput } from '@/ai/flows/generate-diagram-mermaid';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { marked } from 'marked';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { v4 as uuidv4 } from 'uuid';
import AiDiagramGenerator from '@/components/ai-diagram-generator';
import MermaidDiagram from './mermaid-diagram';
import { ProjectSidebarContent } from '@/components/project-sidebar-content';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateProject as updateProjectHelper } from '@/lib/project-utils';
import MarkdownPreview from '@/components/markdown-preview';
import { CombinedSectionPreview } from '@/components/combined-section-preview';
import { StandardPagePreview } from '@/components/standard-page-preview';
import { MarkdownToolbar } from '@/components/markdown-toolbar';


// Recursive component to render the preview outline
const OutlinePreviewItem: React.FC<{ item: OutlineSection; level: number }> = ({ item, level }) => {
  const hasSubSections = item.subSections && item.subSections.length > 0;
  const isDiagram = item.name.toLowerCase().startsWith("diagram:") || item.name.toLowerCase().startsWith("figure:");

  return (
    <div className="text-sm">
      <div className="flex items-center" style={{ paddingLeft: `${level * 1.5}rem` }}>
        <span className="mr-2 text-muted-foreground">-</span>
        <span className={cn(isDiagram && "italic text-muted-foreground")}>{item.name}</span>
      </div>
      {hasSubSections && (
        <div className="border-l border-muted/30 ml-2 pl-2">
          {item.subSections.map((subItem, index) => (
            <OutlinePreviewItem key={`${item.name}-${index}`} item={subItem} level={level +1} />
          ))}
        </div>
      )}
    </div>
  );
};


interface ProjectEditorProps {
  projectId: string;
}

const MIN_CONTEXT_LENGTH = 30;
const MIN_CONTEXT_WORDS = 5;
const MAX_HISTORY_LENGTH = 10;

const LogoUpload = ({
    label,
    logoUrl,
    field,
    onUpload,
    onRemove,
    isUploading,
}: {
    label: string;
    logoUrl?: string;
    field: 'universityLogoUrl' | 'collegeLogoUrl';
    onUpload: (field: 'universityLogoUrl' | 'collegeLogoUrl', file: File | null) => void;
    onRemove: (field: 'universityLogoUrl' | 'collegeLogoUrl') => void;
    isUploading?: boolean;
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onUpload(field, event.target.files ? event.target.files[0] : null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const file = event.dataTransfer.files?.[0];
        if (file) {
            onUpload(field, file);
        }
        event.currentTarget.classList.remove('border-primary', 'bg-primary/10');
    };

    const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.add('border-primary', 'bg-primary/10');
    };

    const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('border-primary', 'bg-primary/10');
    };

    return (
        <div className="space-y-2">
            <Label htmlFor={`${field}-input`}>{label}</Label>
            <Label
                htmlFor={`${field}-input`}
                className={cn(
                    "flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80 transition-colors duration-200",
                    !logoUrl && "p-4 text-center",
                    logoUrl && "relative overflow-hidden",
                    "aspect-square h-24 sm:h-32"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {isUploading ? (
                     <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 mb-3 text-muted-foreground animate-spin" />
                        <p className="text-xs sm:text-sm text-muted-foreground">Uploading...</p>
                    </div>
                ) : logoUrl ? (
                    <>
                        <img
                            src={logoUrl}
                            alt={`${label} Preview`}
                            data-ai-hint={`${label.toLowerCase().replace(' logo', '')} logo`}
                            className="absolute inset-0 w-full h-full object-contain p-1 sm:p-2"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.preventDefault();
                                onRemove(field);
                            }}
                            className="absolute top-1 right-1 z-10 bg-background/50 hover:bg-destructive hover:text-destructive-foreground h-5 w-5 sm:h-6 sm:w-6 rounded-full"
                            title={`Remove ${label}`}
                        >
                            <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        <UploadCloud className="w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-3 text-muted-foreground" />
                        <p className="mb-1 text-xs sm:text-sm text-muted-foreground"><span className="font-semibold">Click or drag</span></p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, WEBP</p>
                    </div>
                )}
                <Input
                    id={`${field}-input`}
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                />
            </Label>
        </div>
    );
};

const CounterInput = ({ label, value, onChange, onBlur, min = 0, inputId }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    onBlur?: () => void;
    min?: number;
    inputId: string;
}) => {
    const handleIncrement = () => onChange(value + 1);
    const handleDecrement = () => onChange(Math.max(min, value - 1));

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numValue = parseInt(e.target.value, 10);
        if (!isNaN(numValue)) {
            onChange(Math.max(min, numValue));
        } else if (e.target.value === '') {
            onChange(min);
        }
    };

    return (
        <div>
            <Label htmlFor={inputId}>{label}</Label>
            <div className="flex items-center gap-1 mt-1">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleDecrement}
                    className="h-8 w-8"
                    aria-label={`Decrease ${label}`}
                >
                    <Minus className="h-4 w-4" />
                </Button>
                <Input
                    id={inputId}
                    type="number"
                    value={value}
                    onChange={handleInputChange}
                    onBlur={onBlur}
                    className="h-8 text-center w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min={min}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleIncrement}
                    className="h-8 w-8"
                    aria-label={`Increase ${label}`}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};


export function ProjectEditor({ projectId }: ProjectEditorProps) {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', []);
  const { toast } = useToast();
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionInput, setSuggestionInput] = useState('');
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [isProjectFound, setIsProjectFound] = useState<boolean | null>(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [showOutlineContextAlert, setShowOutlineContextAlert] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState<Record<'universityLogoUrl' | 'collegeLogoUrl', boolean>>({ universityLogoUrl: false, collegeLogoUrl: false });
  const router = useRouter();
  const [isEditingSections, setIsEditingSections] = useState(false);
  const [history, setHistory] = useState<Project[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isUpdatingHistory = useRef(false);
  const [previewedOutline, setPreviewedOutline] = useState<GeneratedSectionOutline | null>(null);
  const [fabPosition, setFabPosition] = useState({ x: 0, y: 0 });
  const [isDraggingFab, setIsDraggingFab] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
    const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);
    const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const contentTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const [activeSubSectionId, setActiveSubSectionId] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
    const updateInitialFabPosition = () => {
        if (typeof window === 'undefined') return;
        const fabWidth = 56;
        const fabHeight = 56;
        const margin = 16;
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const initialX = vw - fabWidth - margin;
        const initialY = vh - fabHeight - margin;
        setFabPosition({ x: initialX, y: initialY });
    };
    updateInitialFabPosition();
    window.addEventListener('resize', updateInitialFabPosition);
    return () => window.removeEventListener('resize', updateInitialFabPosition);
  }, []);

   const project = useMemo(() => {
     if (historyIndex >= 0 && historyIndex < history.length) {
       return history[historyIndex];
     }
     const currentProjects = Array.isArray(projects) ? projects : [];
     return currentProjects.find(p => p.id === projectId);
   }, [projects, projectId, history, historyIndex]);

  useEffect(() => {
    if (hasMounted && project && history.length === 0 && historyIndex === -1) {
      setHistory([project]);
      setHistoryIndex(0);
    }
  }, [project, hasMounted, history.length, historyIndex]);

   const updateProject = useCallback((updatedData: Partial<Project> | ((prev: Project) => Project), saveToHistory: boolean = true) => {
       updateProjectHelper(updatedData, saveToHistory, projectId, project, setProjects, setHistory, setHistoryIndex, isUpdatingHistory, historyIndex, MAX_HISTORY_LENGTH);
   }, [projectId, project, setProjects, setHistory, setHistoryIndex, historyIndex]);

    const handleSetActiveSection = useCallback((idOrIndex: SectionIdentifier) => {
        const newActiveId = String(idOrIndex);
        setActiveSubSectionId(null);
        if (activeSectionId !== newActiveId) {
            setActiveSectionId(newActiveId);
            if (newActiveId !== String(-1)) {
                setPreviewedOutline(null);
            }
        }
        setIsMobileSheetOpen(false);
    }, [activeSectionId]);

  useEffect(() => {
     if (!hasMounted || projects === undefined || isUpdatingHistory.current) return;
    const currentProjects = Array.isArray(projects) ? projects : [];
    const projectExists = currentProjects.some(p => p.id === projectId);
    if (projectExists && isProjectFound !== true) {
      setIsProjectFound(true);
      if (activeSectionId === null) {
        handleSetActiveSection(String(-1));
      }
    } else if (!projectExists && isProjectFound !== false) {
      setIsProjectFound(false);
      toast({
        variant: "destructive",
        title: "Project Not Found",
        description: `The project with ID ${projectId} could not be found. Redirecting...`,
      });
      const timer = setTimeout(() => router.push('/'), 2000);
      return () => clearTimeout(timer);
    }
  }, [projectId, projects, activeSectionId, toast, router, isProjectFound, hasMounted, handleSetActiveSection]);


  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
       isUpdatingHistory.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const undoneProject = history[newIndex];
      setProjects((prevProjects = []) => {
         const currentProjectsArray = Array.isArray(prevProjects) ? prevProjects : [];
         const projectIndex = currentProjectsArray.findIndex(p => p.id === projectId);
         if (projectIndex !== -1) {
            const updatedProjects = [...currentProjectsArray];
            updatedProjects[projectIndex] = undoneProject;
            return updatedProjects;
         }
         return currentProjectsArray;
      });
      setPreviewedOutline(null);
      toast({ title: "Undo successful" });
       requestAnimationFrame(() => { isUpdatingHistory.current = false; });
    } else {
      toast({ variant: "destructive", title: "Nothing to undo" });
    }
  }, [historyIndex, history, setProjects, projectId, toast]);

  const canUndo = historyIndex > 0;

  const handleSectionContentChange = (id: string, content: string) => {
    if (!project) return;
     updateProject(prev => ({
         ...prev,
         sections: updateSectionById(prev.sections, id, { content }),
     }), false);
  };

   const handleSectionContentBlur = () => {
       if (!project) return;
       updateProject(prev => ({ ...prev }), true);
   };

  const handleSectionPromptChange = (id: string, prompt: string) => {
    if (!project) return;
     updateProject(prev => ({
         ...prev,
         sections: updateSectionById(prev.sections, id, { prompt }),
     }), false);
  }

   const handleSectionPromptBlur = () => {
       if (!project) return;
       updateProject(prev => ({ ...prev }), true);
   };

  const handleProjectDetailChange = (field: keyof Project, value: string | number) => {
    if (!project) return;
    const validStringFields: (keyof Project)[] = ['title', 'projectContext', 'teamDetails', 'instituteName', 'collegeInfo', 'teamId', 'subject', 'semester', 'branch', 'guideName', 'hodName'];
    const validNumberFields: (keyof Project)[] = ['minSections', 'maxSubSectionsPerSection'];

    if (validStringFields.includes(field) && typeof value === 'string') {
        updateProject({ [field]: value }, false);
    } else if (validNumberFields.includes(field) && typeof value === 'number' && !isNaN(value)) {
         updateProject({ [field]: Math.max(0, value) }, false);
    } else if (validNumberFields.includes(field) && typeof value === 'string') {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
             updateProject({ [field]: Math.max(0, numValue) }, false);
        } else if (value === '') {
             updateProject({ [field]: 0 }, false);
        }
    } else {
        console.warn(`Attempted to update field ${String(field)} with incompatible value type: ${typeof value}`);
    }
  };

  const handleProjectDetailBlur = () => {
      if (!project) return;
      updateProject(prev => ({ ...prev }), true);
  };


  const handleProjectTypeChange = (value: 'mini-project' | 'internship') => {
    if (!project) return;
    updateProject({ projectType: value }, true);
  };

  const handleLogoUpload = (field: 'universityLogoUrl' | 'collegeLogoUrl', file: File | null) => {
    if (!project || !file) return;
    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload an image file.' });
        return;
    }
    const maxSizeInBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
         toast({ variant: 'destructive', title: 'File Too Large', description: `Image must be smaller than ${maxSizeInBytes / (1024 * 1024)}MB.` });
        return;
    }
    setIsUploadingLogo(prev => ({ ...prev, [field]: true }));
    const reader = new FileReader();
    reader.onloadend = () => {
        updateProject({ [field]: reader.result as string }, true);
        toast({ title: 'Logo Uploaded', description: `${field === 'universityLogoUrl' ? 'University' : 'College'} logo updated.` });
        setIsUploadingLogo(prev => ({ ...prev, [field]: false }));
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not read the file.' });
        setIsUploadingLogo(prev => ({ ...prev, [field]: false }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (field: 'universityLogoUrl' | 'collegeLogoUrl') => {
       if (!project) return;
       updateProject({ [field]: undefined }, true);
       toast({ title: 'Logo Removed', description: `${field === 'universityLogoUrl' ? 'University' : 'College'} logo removed.` });
   };

    const applyGeneratedOutline = useCallback(() => {
        if (!project || !previewedOutline) return;
        if (!previewedOutline || !Array.isArray(previewedOutline.sections)) {
            toast({ variant: "destructive", title: "Section Update Failed", description: "No valid outline preview available to apply." });
            return;
        }

         const convertOutlineToSections = (outlineSections: OutlineSection[], level = 0, parentNumbering = ''): HierarchicalProjectSection[] => {
            const limitedTopLevel = level === 0 ? outlineSections.slice(0, project.minSections ?? 5) : outlineSections;

             return limitedTopLevel.map((outlineSection, index) => {
                 const currentNumber = parentNumbering ? `${parentNumbering}.${index + 1}` : `${index + 1}`;
                 const newId = uuidv4();
                 const isDiagram = outlineSection.name.toLowerCase().startsWith("diagram:") || outlineSection.name.toLowerCase().startsWith("figure:");

                 let subSections: HierarchicalProjectSection[] = [];
                 if (outlineSection.subSections && level < (project.maxSubSectionsPerSection ?? 2)) {
                     subSections = convertOutlineToSections(outlineSection.subSections, level + 1, currentNumber);
                 } else if (outlineSection.subSections) {
                     console.warn(`Subsections for "${outlineSection.name}" ignored due to depth limit (${project.maxSubSectionsPerSection ?? 2}).`);
                 }

                 let baseSection: HierarchicalProjectSection = {
                     id: newId,
                     name: outlineSection.name.trim(),
                     prompt: isDiagram
                         ? `Generate Mermaid code for: ${outlineSection.name.replace(/^(Diagram:|Figure \d+:)\s*/i, '').trim()}`
                         : `Generate the ${outlineSection.name.trim()} section for the project titled "${project.title}". Context: ${project.projectContext || '[No context provided by user]'}.`,
                     content: '',
                     lastGenerated: undefined,
                     subSections: subSections,
                 };

                 if (subSections.length === 0 && !isDiagram) {
                    baseSection = ensureDefaultSubSection(baseSection, currentNumber);
                 }

                 return baseSection;
             });
         };

         const newSections = convertOutlineToSections(previewedOutline.sections);

        updateProject(prev => ({
            ...prev,
            sections: newSections,
        }), true);

        toast({ title: "Sections Updated", description: `Project sections updated with the generated outline. You can now edit individual sections.`, duration: 7000 });
        setPreviewedOutline(null);

        const currentActiveSection = activeSectionId ? findSectionById(project.sections, activeSectionId) : null;
        if (currentActiveSection && !findSectionById(newSections, activeSectionId)) {
            handleSetActiveSection(String(-1));
        } else if (newSections.length > 0 && activeSectionId === null) {
            handleSetActiveSection(String(-1));
        } else if (newSections.length === 0) {
            handleSetActiveSection(String(-1));
        }
        setIsMobileSheetOpen(false);
    }, [project, updateProject, toast, activeSectionId, handleSetActiveSection, previewedOutline]);


    const proceedWithOutlinePreviewGeneration = useCallback(async () => {
        if (!project || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;
        setIsGeneratingOutline(true);
        setPreviewedOutline(null);
        try {
            const result = await generateOutlineAction({
                projectTitle: project.title,
                projectContext: project.projectContext || '',
                minSections: project.minSections ?? 5,
                maxSubSectionsPerSection: project.maxSubSectionsPerSection ?? 2,
            });

            if (result && typeof result === 'object' && 'error' in result) {
                toast({ variant: "destructive", title: "Outline Generation Failed", description: result.error || "An unknown error occurred from the AI." });
                setIsGeneratingOutline(false);
                return;
            }

            if (!result || !Array.isArray(result.sections) || !validateOutlineStructure(result.sections)) {
                 console.error("Invalid outline structure received from AI:", result);
                 toast({ variant: "destructive", title: "Outline Generation Failed", description: "AI did not return the expected hierarchical section structure. Please check the console for details and try again." });
                 setIsGeneratingOutline(false);
                 return;
            }

             const outlineResult = result as GeneratedSectionOutline;
            if (!outlineResult.sections?.length) {
                toast({ variant: "destructive", title: "Outline Generation Failed", description: "AI did not return any suggested sections. Please try refining your project context or try again." });
                 setIsGeneratingOutline(false);
                return;
            }

            setPreviewedOutline(outlineResult);
            toast({ title: "Outline Preview Generated", description: `Review the proposed outline below. Click "Apply Outline" to update your project sections or "Discard" to keep current sections.`, duration: 10000 });
        } catch (error) {
            console.error("Outline generation failed:", error);
            toast({ variant: "destructive", title: "Outline Generation Failed", description: error instanceof Error ? error.message : "Could not generate sections." });
        } finally {
            setIsGeneratingOutline(false);
        }
    }, [project, isGenerating, isSummarizing, isGeneratingOutline, isSuggesting, toast]);

    const handleGenerateTocClick = () => {
        if (!project || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;
        const contextLength = project.projectContext?.trim().length || 0;
        const contextWords = project.projectContext?.trim().split(/\s+/).filter(Boolean).length || 0;

        if (contextLength < MIN_CONTEXT_LENGTH || contextWords < MIN_CONTEXT_WORDS) {
            setShowOutlineContextAlert(true);
        } else {
            proceedWithOutlinePreviewGeneration();
        }
    };

    const handleGenerateSection = async (sectionIdToGenerate: string) => {
      const targetSection = project ? findSectionById(project.sections, sectionIdToGenerate) : null;
      if (!project || !targetSection || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting || isGeneratingDiagram) return;

        const isDiagram = targetSection.name.toLowerCase().startsWith("diagram:") || targetSection.name.toLowerCase().startsWith("figure");

        if (isDiagram) {
            setIsGeneratingDiagram(true);
            try {
                const diagramInput: GenerateDiagramMermaidInput = {
                    description: targetSection.prompt || `Diagram for ${targetSection.name}`,
                };
                const result = await generateDiagramAction(diagramInput);
                if ('error' in result) {
                    throw new Error(result.error);
                }
                updateProject(prev => ({
                    ...prev,
                    sections: updateSectionById(prev.sections, sectionIdToGenerate, {
                        content: result.mermaidCode,
                        lastGenerated: new Date().toISOString(),
                    }),
                }), true);
                toast({ title: "Diagram Generated", description: `Mermaid code for "${targetSection.name}" created.` });
            } catch (error) {
                console.error("Diagram generation failed:", error);
                toast({ variant: "destructive", title: "Diagram Generation Failed", description: error instanceof Error ? error.message : "Could not generate diagram." });
            } finally {
                setIsGeneratingDiagram(false);
            }
        } else {
            setIsGenerating(true);
            try {
                const input = {
                    projectTitle: project.title || 'Untitled Project',
                    sectionName: targetSection.name,
                    prompt: targetSection.prompt,
                    teamDetails: project.teamDetails || '',
                    instituteName: project.instituteName || '',
                    teamId: project.teamId,
                    subject: project.subject,
                    semester: project.semester,
                    branch: project.branch,
                    guideName: project.guideName,
                };
                const result = await generateSectionAction(input);
                if ('error' in result) {
                    throw new Error(result.error);
                }
                updateProject(prev => ({
                    ...prev,
                    sections: updateSectionById(prev.sections, sectionIdToGenerate, {
                        content: result.reportSectionContent,
                        lastGenerated: new Date().toISOString(),
                    }),
                }), true);
                toast({ title: "Section Generated", description: `"${targetSection.name}" content updated.` });
            } catch (error) {
                console.error("Generation failed:", error);
                toast({ variant: "destructive", title: "Generation Failed", description: error instanceof Error ? error.message : "Could not generate content." });
            } finally {
                setIsGenerating(false);
            }
        }
    };

    const handleSummarizeSection = async (sectionIdToSummarize: string) => {
        const targetSection = project ? findSectionById(project.sections, sectionIdToSummarize) : null;
        if (!project || !targetSection || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;

        const isDiagram = targetSection.name.toLowerCase().startsWith("diagram:") || targetSection.name.toLowerCase().startsWith("figure");
        if (isDiagram) {
            toast({ variant: "destructive", title: "Cannot Summarize", description: "Diagram sections cannot be summarized." });
            return;
        }

        if (!targetSection.content?.trim()) {
            toast({ variant: "destructive", title: "Summarization Failed", description: "Section content is empty." });
            return;
        }
        setIsSummarizing(true);
        try {
            const result = await summarizeSectionAction({
                projectTitle: project.title,
                sectionText: targetSection.content,
            });
            if ('error' in result) {
                throw new Error(result.error);
            }
            toast({
                title: `Summary for "${targetSection.name}"`,
                description: (
                    <ScrollArea className="h-32 w-full">
                        <p className="text-sm">{result.summary}</p>
                    </ScrollArea>
                ),
                duration: 9000,
            });
        } catch (error) {
            console.error("Summarization failed:", error);
            toast({ variant: "destructive", title: "Summarization Failed", description: error instanceof Error ? error.message : "Could not summarize." });
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleGetSuggestions = async () => {
        if (!project || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;
        setIsSuggesting(true);
        setSuggestions(null);
        try {
            const flattenSections = (sections: HierarchicalProjectSection[], level = 0): string => {
                return sections.map(s =>
                    `${'#'.repeat(level + 2)} ${s.name}\n\n${s.content || '[Empty Section]'}\n\n` +
                    (s.subSections ? flattenSections(s.subSections, level + 1) : '')
                ).join('---\n\n');
            };

            const currentSectionsContent = project.sections ? flattenSections(project.sections) : '';

            const suggestionActionInput = {
                projectTitle: project.title,
                projectContext: project.projectContext,
                allSectionsContent: currentSectionsContent,
                focusArea: suggestionInput || undefined,
                existingSections: project.sections.map(s => s.name).join(', '),
                projectType: project.projectType,
            };

            const result = await suggestImprovementsAction(suggestionActionInput);
            if ('error' in result) {
                throw new Error(result.error);
            }
            setSuggestions(result.suggestions);
            toast({ title: "AI Suggestions Ready", description: "Suggestions for improvement generated." });
        } catch (error) {
            console.error("Suggestion generation failed:", error);
            toast({ variant: "destructive", title: "Suggestion Failed", description: error instanceof Error ? error.message : "Could not generate suggestions." });
        } finally {
            setIsSuggesting(false);
        }
    };

     const handleEditSectionName = (id: string, newName: string) => {
         if (!project) return;
         updateProject(prev => ({
             ...prev,
             sections: updateSectionById(prev.sections, id, { name: newName }),
         }), true);
         toast({ title: "Section Name Updated", description: `Section "${newName}" renamed.` });
     };

    const handleDeleteSection = (id: string) => {
        setSectionToDelete(id);
    };

    const confirmDeleteSection = () => {
        if (!project || !sectionToDelete) return;
        updateProject(prev => ({
            ...prev,
            sections: deleteSectionById(prev.sections, sectionToDelete),
        }), true);
        toast({ title: "Section Deleted" });
        setSectionToDelete(null);
        if (activeSectionId === sectionToDelete || activeSubSectionId === sectionToDelete) {
            setActiveSectionId(String(-1));
            setActiveSubSectionId(null);
        }
    };

    const cancelDeleteSection = () => {
        setSectionToDelete(null);
    };

     const handleAddNewSection = () => {
         if (!project) return;
         const newSectionNumber = project.sections.length + 1;
         const newSection: HierarchicalProjectSection = {
             id: uuidv4(),
             name: `New Section ${newSectionNumber}`,
             prompt: `Generate content for this new section.`,
             content: '',
             lastGenerated: undefined,
             subSections: [],
         };
         const sectionWithDefaultSub = ensureDefaultSubSection(newSection, String(newSectionNumber));

         updateProject(prev => ({
             ...prev,
             sections: [...prev.sections, sectionWithDefaultSub],
         }), true);
         toast({ title: "Section Added", description: `"${sectionWithDefaultSub.name}" added.` });
         setActiveSectionId(newSection.id);
         setActiveSubSectionId(sectionWithDefaultSub.subSections[0]?.id || null);
         setPreviewedOutline(null);
     };

  const handleSaveOnline = () => {
     if (!project) return;
     toast({ title: "Save Online (Coming Soon)", description: "This will save your project to the cloud." });
  };

   const handleNavigateToExport = () => {
     if (project) {
       router.push(`/project/${projectId}/export`);
     } else {
        toast({ variant: "destructive", title: "Navigation Error", description: "Project data not found." });
     }
   };

  const handleDiagramGeneratedInSection = (mermaidCode: string) => {
    if (!project || !activeSubSectionId) return;

    const subSection = findSectionById(project.sections, activeSubSectionId);
    if (!subSection) return;

    updateProject(prev => ({
        ...prev,
        sections: updateSectionById(prev.sections, activeSubSectionId!, {
            content: mermaidCode,
            lastGenerated: new Date().toISOString(),
        }),
    }), true);
    toast({ title: 'Diagram Code Saved', description: `Mermaid code saved for "${subSection.name}".` });
  };

  const handleApplyMarkdownFormat = (newContent: string, newCursorPosition?: number) => {
     if (!project || !activeSubSectionId) return;
     handleSectionContentChange(activeSubSectionId, newContent);
     // Allow time for state to update before setting cursor
     setTimeout(() => {
       if (contentTextAreaRef.current && newCursorPosition !== undefined) {
         contentTextAreaRef.current.focus();
         contentTextAreaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
       }
     }, 0);
     handleSectionContentBlur(); // Trigger history save
  };


  const onFabMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const target = fabRef.current;
    if (!target) return;
    setIsDraggingFab(true);
    const rect = target.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    target.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  const onFabMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingFab || !fabRef.current) return;
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        let newX = e.clientX - dragOffset.current.x;
        let newY = e.clientY - dragOffset.current.y;
        const fabWidth = fabRef.current.offsetWidth;
        const fabHeight = fabRef.current.offsetHeight;
        const margin = 16;

        newX = Math.max(margin, Math.min(newX, vw - fabWidth - margin));
        newY = Math.max(margin, Math.min(newY, vh - fabHeight - margin));

        setFabPosition({ x: newX, y: newY });
    }, [isDraggingFab]);

    const onFabMouseUp = useCallback(() => {
        if (isDraggingFab) {
            setIsDraggingFab(false);
            if (fabRef.current) {
                fabRef.current.style.cursor = 'grab';
            }
            document.body.style.userSelect = '';
        }
    }, [isDraggingFab]);

  useEffect(() => {
    if (isDraggingFab) {
      window.addEventListener('mousemove', onFabMouseMove);
      window.addEventListener('mouseup', onFabMouseUp);
    } else {
      window.removeEventListener('mousemove', onFabMouseMove);
      window.removeEventListener('mouseup', onFabMouseUp);
    };
    return () => {
      window.removeEventListener('mousemove', onFabMouseMove);
      window.removeEventListener('mouseup', onFabMouseUp);
      document.body.style.userSelect = '';
    };
  }, [onFabMouseMove, onFabMouseUp, isDraggingFab]);

  if (!hasMounted || isProjectFound === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,60px))] text-center p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  if (isProjectFound === false || !project) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,60px))] text-center p-4">
                <CloudOff className="h-16 w-16 text-destructive mb-4" />
                <h2 className="text-2xl font-semibold text-destructive mb-2">Project Not Found</h2>
                <p className="text-muted-foreground mb-6">The project with ID <code className="bg-muted px-1 rounded">{projectId}</code> could not be found.</p>
                <Button onClick={() => router.push('/')}><Home className="mr-2 h-4 w-4" /> Go to Dashboard</Button>
            </div>
        );
    }

  let activeViewContent: React.ReactNode = null;
    let activeViewName = project.title ?? 'Project';
    let isStandardPage = false;

    const currentActiveMainSection = activeSectionId ? findSectionById(project.sections, activeSectionId) : null;
    const currentActiveSubSection = activeSubSectionId ? findSectionById(project.sections, activeSubSectionId) : null;
    const isDiagramSection = currentActiveSubSection?.name.toLowerCase().startsWith("diagram:") || currentActiveSubSection?.name.toLowerCase().startsWith("figure:");

    if (activeSectionId === String(-1)) {
        activeViewName = 'Project Details';
        activeViewContent = (
            <Card className="shadow-md mb-6">
                <CardHeader>
                    <CardTitle className="text-glow-primary text-xl md:text-2xl">Project Details</CardTitle>
                    <CardDescription>Edit general information. Context helps AI generate relevant sections.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label htmlFor="projectTitleMain">Project Title *</Label>
                        <Input id="projectTitleMain" value={project.title} onChange={(e) => handleProjectDetailChange('title', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="Enter Project Title" className="mt-1 focus-visible:glow-primary" required />
                    </div>
                    <div className="space-y-2">
                        <Label>Project Type</Label>
                        <RadioGroup value={project.projectType} onValueChange={(value: 'mini-project' | 'internship') => handleProjectTypeChange(value)} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                            <div className="flex items-center space-x-2"> <RadioGroupItem value="mini-project" id="type-mini" /> <Label htmlFor="type-mini" className="cursor-pointer">Mini Project</Label> </div>
                            <div className="flex items-center space-x-2"> <RadioGroupItem value="internship" id="type-internship" /> <Label htmlFor="type-internship" className="cursor-pointer">Internship</Label> </div>
                        </RadioGroup>
                    </div>
                    <div>
                        <Label htmlFor="projectContext">Project Context *</Label>
                        <Textarea id="projectContext" value={project.projectContext} onChange={(e) => handleProjectDetailChange('projectContext', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="Briefly describe your project, its goals, scope, and key features or technologies involved." className="mt-1 min-h-[120px] focus-visible:glow-primary" required />
                        <p className="text-xs text-muted-foreground mt-1">Crucial for AI section generation ({MIN_CONTEXT_WORDS}+ words, {MIN_CONTEXT_LENGTH}+ chars recommended).</p>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                         <CounterInput
                             label="Min Sections (Outline)"
                             value={project.minSections ?? 5}
                             onChange={(val) => handleProjectDetailChange('minSections', val)}
                             onBlur={handleProjectDetailBlur}
                             min={1}
                             inputId="min-sections-counter"
                         />
                         <CounterInput
                             label="Max Sub-Section Depth"
                             value={project.maxSubSectionsPerSection ?? 2}
                             onChange={(val) => handleProjectDetailChange('maxSubSectionsPerSection', val)}
                             onBlur={handleProjectDetailBlur}
                             min={0}
                             inputId="max-subsection-depth-counter"
                         />
                     </div>
                     <p className="text-xs text-muted-foreground -mt-4">Control AI outline generation limits. Min sections aims for at least this many top-level sections. Max depth limits sub-section nesting (0=none, 1=1.1, 2=1.1.1).</p>

                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <LogoUpload label="University Logo" logoUrl={project.universityLogoUrl} field="universityLogoUrl" onUpload={handleLogoUpload} onRemove={handleRemoveLogo} isUploading={isUploadingLogo.universityLogoUrl} />
                        <LogoUpload label="College Logo" logoUrl={project.collegeLogoUrl} field="collegeLogoUrl" onUpload={handleLogoUpload} onRemove={handleRemoveLogo} isUploading={isUploadingLogo.collegeLogoUrl} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div> <Label htmlFor="instituteName">Institute Name</Label> <Input id="instituteName" value={project.instituteName || ''} onChange={(e) => handleProjectDetailChange('instituteName', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="e.g., L. D. College of Engineering" className="mt-1"/> </div>
                        <div> <Label htmlFor="branch">Branch</Label> <Input id="branch" value={project.branch || ''} onChange={(e) => handleProjectDetailChange('branch', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="e.g., Computer Engineering" className="mt-1"/> </div>
                        <div> <Label htmlFor="semester">Semester</Label> <Input id="semester" value={project.semester || ''} onChange={(e) => handleProjectDetailChange('semester', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="e.g., 5" type="number" className="mt-1"/> </div>
                        <div> <Label htmlFor="subject">Subject</Label> <Input id="subject" value={project.subject || ''} onChange={(e) => handleProjectDetailChange('subject', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="e.g., Design Engineering - 1A" className="mt-1"/> </div>
                        <div> <Label htmlFor="hodName">HOD Name</Label> <Input id="hodName" value={project.hodName || ''} onChange={(e) => handleProjectDetailChange('hodName', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="Enter Head of Department's Name" className="mt-1"/> </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div> <Label htmlFor="teamId">Team ID</Label> <Input id="teamId" value={project.teamId || ''} onChange={(e) => handleProjectDetailChange('teamId', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="Enter Team ID" className="mt-1"/> </div>
                        <div> <Label htmlFor="guideName">Faculty Guide Name</Label> <Input id="guideName" value={project.guideName || ''} onChange={(e) => handleProjectDetailChange('guideName', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="Enter Guide's Name" className="mt-1"/> </div>
                    </div>
                    <div>
                        <Label htmlFor="teamDetails">Team Details (Members & Enrollment)</Label>
                        <Textarea id="teamDetails" value={project.teamDetails} onChange={(e) => handleProjectDetailChange('teamDetails', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="John Doe - 123456789&#10;Jane Smith - 987654321" className="mt-1 min-h-[120px] focus-visible:glow-primary"/>
                        <p className="text-xs text-muted-foreground mt-1">One member per line.</p>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col items-start gap-4">
                     <Button variant="default" size="sm" onClick={handleGenerateTocClick} disabled={isGeneratingOutline || isGenerating || isSummarizing || isSuggesting || !project.projectContext?.trim()} className="hover:glow-primary focus-visible:glow-primary">
                        {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                        {isGeneratingOutline ? 'Generating Outline...' : 'Generate Outline Preview'}
                     </Button>
                     {previewedOutline && (
                         <div className="w-full p-4 border rounded-md bg-muted/30 space-y-3">
                             <h4 className="font-semibold text-foreground">Generated Outline Preview:</h4>
                             <ScrollArea className="max-h-60">
                                {previewedOutline.sections.map((item, index) => (
                                    <OutlinePreviewItem key={`preview-${index}`} item={item} level={0} />
                                ))}
                             </ScrollArea>
                             <div className="flex gap-2">
                                 <Button
                                     variant="default"
                                     size="sm"
                                     onClick={applyGeneratedOutline}
                                     disabled={isGeneratingOutline}
                                     className="hover:glow-accent focus-visible:glow-accent"
                                 >
                                     <CheckCircle className="mr-2 h-4 w-4" /> Apply Outline
                                 </Button>
                                  <Button
                                     variant="outline"
                                     size="sm"
                                     onClick={() => setPreviewedOutline(null)}
                                     disabled={isGeneratingOutline}
                                  >
                                      Discard Preview
                                  </Button>
                             </div>
                         </div>
                     )}
                </CardFooter>
            </Card>
        );
    } else if (currentActiveSubSection) {
        activeViewName = currentActiveSubSection.name;
        if (isDiagramSection) {
            activeViewContent = (
               <div className="space-y-6">
                   <Card className="shadow-md">
                     <CardHeader>
                       <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-primary text-glow-primary"> <Projector className="w-5 h-5"/> {currentActiveSubSection.name} - Diagram</CardTitle>
                       {currentActiveSubSection.lastGenerated && ( <CardDescription className="text-xs md:text-sm">Last generated: {new Date(currentActiveSubSection.lastGenerated).toLocaleString()}</CardDescription> )}
                     </CardHeader>
                     <CardContent className="space-y-4">
                       <p className="text-sm text-muted-foreground">Use the AI generator below to create the diagram content. The generated Mermaid code will be stored.</p>
                       <AiDiagramGenerator onDiagramGenerated={handleDiagramGeneratedInSection} />
                       <Button onClick={() => handleGenerateSection(currentActiveSubSection.id)} disabled={isGeneratingDiagram || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting} className="hover:glow-primary focus-visible:glow-primary mt-2">
                         {isGeneratingDiagram ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                         {isGeneratingDiagram ? 'Generating Diagram...' : 'Generate/Update Diagram with AI'}
                       </Button>
                        {currentActiveSubSection.content && (
                           <div className="mt-4 space-y-2">
                               <Label>Current Diagram:</Label>
                               <MermaidDiagram chart={currentActiveSubSection.content} id={`diagram-${currentActiveSubSection.id}`} />
                               <details className="mt-2 text-xs">
                                   <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show Mermaid Code</summary>
                                   <pre className="mt-1 p-2 bg-muted rounded-md text-muted-foreground overflow-x-auto max-h-40 text-[10px] md:text-xs">
                                     <code>{currentActiveSubSection.content}</code>
                                   </pre>
                               </details>
                           </div>
                        )}
                     </CardContent>
                   </Card>
               </div>
            );
        } else {
             activeViewContent = (
                <div className="space-y-6">
                    <Card className="shadow-md">
                      <CardHeader>
                        <CardTitle className="text-primary text-glow-primary text-lg md:text-xl">{currentActiveSubSection.name} - AI Prompt</CardTitle>
                        {currentActiveSubSection.lastGenerated && ( <CardDescription className="text-xs md:text-sm">Last generated: {new Date(currentActiveSubSection.lastGenerated).toLocaleString()}</CardDescription> )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor={`section-prompt-${currentActiveSubSection.id}`}>Generation Prompt</Label>
                          <Textarea id={`section-prompt-${currentActiveSubSection.id}`} value={currentActiveSubSection.prompt} onChange={(e) => handleSectionPromptChange(currentActiveSubSection.id, e.target.value)} onBlur={handleSectionPromptBlur} placeholder="Instructions for the AI to generate content for this sub-section..." className="mt-1 min-h-[100px] font-mono text-sm focus-visible:glow-primary" />
                        </div>
                        <Button onClick={() => handleGenerateSection(currentActiveSubSection.id)} disabled={isGenerating || isSummarizing || isGeneratingOutline || isSuggesting || isGeneratingDiagram} className="hover:glow-primary focus-visible:glow-primary">
                          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                          {isGenerating ? 'Generating...' : 'Generate Content'}
                        </Button>
                      </CardContent>
                    </Card>
                    <Card className="shadow-md mb-6">
                       <CardHeader>
                         <CardTitle className="text-lg md:text-xl">{currentActiveSubSection.name} - Content</CardTitle>
                         <CardDescription className="text-sm">Edit the content using Markdown and preview the output.</CardDescription>
                       </CardHeader>
                       <CardContent>
                         <MarkdownToolbar textareaRef={contentTextAreaRef} onApplyFormat={handleApplyMarkdownFormat} />
                         <Tabs defaultValue="edit" className="w-full mt-2">
                           <TabsList className="grid w-full grid-cols-2 mb-4">
                             <TabsTrigger value="edit">Edit</TabsTrigger>
                             <TabsTrigger value="preview">Preview</TabsTrigger>
                           </TabsList>
                           <TabsContent value="edit" className="space-y-4">
                               <Textarea
                                   id={`section-content-${currentActiveSubSection.id}`}
                                   ref={contentTextAreaRef}
                                   value={currentActiveSubSection.content}
                                   onChange={(e) => handleSectionContentChange(currentActiveSubSection.id, e.target.value)}
                                   onBlur={handleSectionContentBlur}
                                   placeholder={"Generated content appears here. Use Markdown for formatting..."}
                                   className="min-h-[300px] md:min-h-[400px] text-sm md:text-base focus-visible:glow-primary font-mono"
                                />
                           </TabsContent>
                           <TabsContent value="preview">
                               <MarkdownPreview content={currentActiveSubSection.content || ''} />
                           </TabsContent>
                         </Tabs>
                       </CardContent>
                       <CardFooter className="flex justify-end">
                         <Button variant="outline" size="sm" onClick={() => handleSummarizeSection(currentActiveSubSection.id)} disabled={isSummarizing || isGenerating || isGeneratingOutline || isSuggesting || !currentActiveSubSection.content?.trim()} className="hover:glow-accent focus-visible:glow-accent">
                           {isSummarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScrollText className="mr-2 h-4 w-4" />}
                           {isSummarizing ? 'Summarizing...' : 'Summarize'}
                         </Button>
                       </CardFooter>
                    </Card>
                </div>
            );
        }
    } else if (currentActiveMainSection) {
        activeViewName = currentActiveMainSection.name;
        activeViewContent = (
            <CombinedSectionPreview section={currentActiveMainSection} projectTitle={project.title}/>
        );
    } else {
        const standardPageIndex = !isNaN(parseInt(activeSectionId ?? '', 10)) ? parseInt(activeSectionId!, 10) : NaN;
        if (!isNaN(standardPageIndex) && standardPageIndex < -1) {
             const standardPageEntry = Object.entries(STANDARD_PAGE_INDICES).find(([, index]) => index === standardPageIndex);
             activeViewName = standardPageEntry ? standardPageEntry[0] : 'Standard Page';
             isStandardPage = true;
             activeViewContent = <StandardPagePreview pageName={activeViewName} project={project} />;
        } else {
            activeViewContent = (
                <div className="flex items-center justify-center h-full p-4">
                   <Card className="text-center py-8 px-6 max-w-md mx-auto shadow-md">
                      <CardHeader>
                        <CardTitle className="text-xl text-primary text-glow-primary">Select or Generate Sections</CardTitle>
                        <CardDescription className="mt-2 text-sm">Choose an item from the sidebar or generate sections if none exist.</CardDescription>
                      </CardHeader>
                      <CardContent className="mt-4 space-y-4">
                         <p className="text-sm">Go to <Button variant="link" className="p-0 h-auto text-base" onClick={() => handleSetActiveSection(String(-1))}>Project Details</Button>, provide context, then click "Generate Outline Preview".</p>
                        <Button variant="default" size="sm" onClick={handleGenerateTocClick} disabled={isGeneratingOutline || isGenerating || isSummarizing || isSuggesting || !project.projectContext?.trim()} className="hover:glow-primary focus-visible:glow-primary">
                          {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                          {isGeneratingOutline ? 'Generating Outline...' : 'Generate Outline Preview'}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-3">The AI will create a proposed outline based on your project context.</p>
                      </CardContent>
                    </Card>
                </div>
            );
        }
    }

  return (
    <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
      <div className="flex h-full relative">
        <div className={cn(
             "hidden md:flex md:flex-col transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden",
             "w-72 lg:w-80 border-r bg-card"
         )}>
            <ProjectSidebarContent
                project={project}
                updateProject={updateProject}
                activeSectionId={activeSectionId}
                setActiveSectionId={handleSetActiveSection}
                activeSubSectionId={activeSubSectionId}
                setActiveSubSectionId={setActiveSubSectionId}
                handleGenerateTocClick={handleGenerateTocClick}
                isGeneratingOutline={isGeneratingOutline}
                isGenerating={isGenerating}
                isSummarizing={isSummarizing}
                isSuggesting={isSuggesting}
                handleSaveOnline={handleSaveOnline}
                canUndo={canUndo}
                handleUndo={handleUndo}
                isEditingSections={isEditingSections}
                setIsEditingSections={setIsEditingSections}
                onEditSectionName={handleEditSectionName}
                onDeleteSection={handleDeleteSection}
                handleAddNewSection={handleAddNewSection}
            />
        </div>

        <SheetContent side="left" className="p-0 w-72 sm:w-80 bg-card md:hidden">
           <SheetHeader className="p-4 border-b">
             <SheetTitle>Project Menu</SheetTitle>
             <SheetDescription>Navigate and manage your project sections.</SheetDescription>
           </SheetHeader>
            <ProjectSidebarContent
                project={project}
                updateProject={updateProject}
                activeSectionId={activeSectionId}
                setActiveSectionId={handleSetActiveSection}
                activeSubSectionId={activeSubSectionId}
                setActiveSubSectionId={setActiveSubSectionId}
                handleGenerateTocClick={handleGenerateTocClick}
                isGeneratingOutline={isGeneratingOutline}
                isGenerating={isGenerating}
                isSummarizing={isSummarizing}
                isSuggesting={isSuggesting}
                handleSaveOnline={handleSaveOnline}
                canUndo={canUndo}
                handleUndo={handleUndo}
                onCloseSheet={() => setIsMobileSheetOpen(false)}
                isEditingSections={isEditingSections}
                setIsEditingSections={setIsEditingSections}
                onEditSectionName={handleEditSectionName}
                onDeleteSection={handleDeleteSection}
                handleAddNewSection={handleAddNewSection}
            />
        </SheetContent>


        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:px-6 flex-shrink-0">
            <h1 className="flex-1 text-base sm:text-lg font-semibold md:text-xl text-primary truncate text-glow-primary">
               {activeViewName}
            </h1>
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto mr-1 sm:mr-2" title={`Project stored ${project.storageType === 'local' ? 'locally' : 'in the cloud'}`}>
              {project.storageType === 'local' ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4 text-green-500" />}
              <span className="hidden sm:inline">{project.storageType === 'local' ? 'Local' : 'Cloud'}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleNavigateToExport} className="hover:glow-accent focus-visible:glow-accent text-xs px-2 sm:px-3 py-1 h-auto">
              <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Export</span> Report
            </Button>
              <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="text-xs px-2 sm:px-3 py-1 h-auto">
                <Home className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4"/> Dashboard
              </Button>
          </header>

          <ScrollArea className="flex-1 p-3 sm:p-4 md:p-6">
              {activeViewContent}
             <Card className="shadow-md mt-6">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-primary text-glow-primary"><Sparkles className="w-5 h-5" /> AI Suggestions</CardTitle>
                    <CardDescription className="text-sm">Ask the AI for feedback on your report. Provide specific focus areas for targeted suggestions based on the current sections.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="suggestion-input">Focus area (Optional)</Label>
                        <Input id="suggestion-input" value={suggestionInput} onChange={(e) => setSuggestionInput(e.target.value)} placeholder="e.g., Improve flow, Check clarity, Add technical details..." className="mt-1 focus-visible:glow-primary" />
                    </div>
                    <Button onClick={handleGetSuggestions} disabled={isSuggesting || isGenerating || isSummarizing || isGeneratingOutline || isGeneratingDiagram} className="hover:glow-primary focus-visible:glow-primary">
                        {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareQuote className="mr-2 h-4 w-4" />}
                        {isSuggesting ? 'Getting Suggestions...' : 'Get Suggestions'}
                    </Button>
                    {suggestions && (
                        <div className="mt-4 p-4 border rounded-md bg-muted/30">
                            <h4 className="font-semibold mb-2 text-foreground">Suggestions:</h4>
                            <div className="prose prose-sm max-w-none dark:prose-invert text-foreground" dangerouslySetInnerHTML={{ __html: marked.parse(suggestions) }} />
                        </div>
                    )}
                 </CardContent>
             </Card>
          </ScrollArea>
        </div>

         <SheetTrigger asChild>
             <Button
                 ref={fabRef}
                 variant="default"
                 size="icon"
                 className={cn(
                     "fixed z-20 rounded-full shadow-lg w-12 h-12 sm:w-14 sm:h-14 hover:glow-primary focus-visible:glow-primary cursor-grab active:cursor-grabbing",
                     "md:hidden"
                 )}
                 style={{ left: `${fabPosition.x}px`, top: `${fabPosition.y}px`, position: 'fixed' }}
                 onMouseDown={onFabMouseDown}
                 onClick={(e) => {
                     if (!isDraggingFab) {
                         setIsMobileSheetOpen(true);
                     }
                 }}
                 title="Open project menu"
                 aria-label="Open project menu"
             >
                 <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
             </Button>
         </SheetTrigger>

        <AlertDialog open={showOutlineContextAlert} onOpenChange={setShowOutlineContextAlert}>
          <AlertDialogContent>
            <AlertDialogHeader> <AlertDialogTitle>Project Context May Be Limited</AlertDialogTitle> <AlertDialogDescription> The project context is short ({project?.projectContext?.trim().split(/\s+/).filter(Boolean).length || 0} words). Generating an accurate outline might be difficult. Consider adding more details. Proceed anyway? </AlertDialogDescription> </AlertDialogHeader>
            <AlertDialogFooter> <AlertDialogCancel>Cancel</AlertDialogCancel> <AlertDialogAction onClick={proceedWithOutlinePreviewGeneration}>Generate Anyway</AlertDialogAction> </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

         <AlertDialog open={!!sectionToDelete} onOpenChange={(open) => !open && setSectionToDelete(null)}>
           <AlertDialogContent>
             <AlertDialogHeader> <AlertDialogTitle>Delete Section?</AlertDialogTitle> <AlertDialogDescription> Are you sure you want to delete "{sectionToDelete ? findSectionById(project.sections, sectionToDelete)?.name : ''}" and its sub-sections? This cannot be undone. </AlertDialogDescription> </AlertDialogHeader>
             <AlertDialogFooter> <AlertDialogCancel onClick={cancelDeleteSection}>Cancel</AlertDialogCancel> <AlertDialogAction onClick={confirmDeleteSection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction> </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>
      </div>
    </Sheet>
  );
}

const validateOutlineStructure = (sections: any[] | undefined): sections is OutlineSection[] => {
    if (!Array.isArray(sections)) {
        console.warn("Validation failed: Main sections property is not an array.");
        return false;
    }
    return sections.every(section => {
        if (typeof section !== 'object' || !section || typeof section.name !== 'string' || !section.name.trim()) {
            console.warn("Validation failed: Section missing name or is not an object:", section);
            return false;
        }
        if (section.hasOwnProperty('subSections')) {
            if (!Array.isArray(section.subSections)) {
                console.warn("Validation failed: subSections exists but is not an array for section:", section.name, section);
                return false;
            }
            if (section.subSections.length > 0 && !validateOutlineStructure(section.subSections)) {
                 console.warn("Validation failed: Invalid structure within subSections of:", section.name);
                 return false;
            }
        }
        return true;
    });
};
