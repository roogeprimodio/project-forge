
"use client"; // Keep this if ProjectEditor uses client hooks like useState, useEffect

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Settings, ChevronLeft, Save, Loader2, Wand2, ScrollText, Download, Lightbulb, FileText, Cloud, CloudOff, Home, Menu, Undo, MessageSquareQuote, Sparkles, UploadCloud, XCircle, ShieldAlert, Eye, Projector, BrainCircuit, Plus, Minus, CheckCircle, Edit3, ChevronRight, BookOpen, HelpCircle, ImageIcon, Table as TableIcon, Eraser, FileUp, FileJson, Info } from 'lucide-react';
import Link from 'next/link';
import type { Project, HierarchicalProjectSection, GeneratedSectionOutline, SectionIdentifier, OutlineSection } from '@/types/project'; // Use hierarchical type
import { findSectionById, updateSectionById, deleteSectionById, STANDARD_REPORT_PAGES, STANDARD_PAGE_INDICES, TOC_SECTION_NAME, ensureDefaultSubSection, getSectionNumbering, addSubSectionById } from '@/lib/project-utils';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { generateSectionAction, summarizeSectionAction, generateOutlineAction, suggestImprovementsAction, generateDiagramAction, generateImageForSlideAction, parseTextOutlineAction } from '@/app/actions';
import type { GenerateDiagramMermaidInput } from '@/ai/flows/generate-diagram-mermaid';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogClose, DialogContent as DialogModalContent, DialogDescription as DialogModalDescription, DialogFooter as DialogModalFooter, DialogHeader as DialogModalHeader, DialogTitle as DialogModalTitle, DialogTrigger as DialogModalTrigger } from "@/components/ui/dialog"; // Renamed imports
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { v4 as uuidv4 } from 'uuid';
import AiDiagramGenerator from '@/components/ai-diagram-generator';
import MermaidDiagram from '@/components/mermaid-diagram';
import { ProjectSidebarContent } from '@/components/project-sidebar-content';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateProject as updateProjectHelper } from '@/lib/project-utils';
import MarkdownPreview from '@/components/markdown-preview';
import { CombinedSectionPreview } from '@/components/combined-section-preview';
import { StandardPagePreview } from '@/components/standard-page-preview';
import { MarkdownToolbar } from '@/components/markdown-toolbar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Image from 'next/image';


// Recursive component to render the preview outline
const OutlinePreviewItem: React.FC<{ item: OutlineSection; level: number }> = ({ item, level }) => {
  const hasSubSections = item.subSections && item.subSections.length > 0;
  const itemName = (typeof item.name === 'string' && item.name.trim()) ? item.name : "[Unnamed Section]";
  const isSpecializedItem = itemName.toLowerCase().startsWith("diagram:") || itemName.toLowerCase().startsWith("figure:") || itemName.toLowerCase().startsWith("table:") || itemName.toLowerCase().startsWith("flowchart:");

  return (
    <div className="text-sm">
      <div className="flex items-center" style={{ paddingLeft: `${level * 1.5}rem` }}>
        <span className="mr-2 text-muted-foreground">-</span>
        <span className={cn(isSpecializedItem && "italic text-muted-foreground")}>{itemName}</span>
      </div>
      {hasSubSections && (
        <div className="border-l border-muted/30 ml-2 pl-2">
          {item.subSections.map((subItem, index) => (
            <OutlinePreviewItem key={`${itemName}-${index}-${level}`} item={subItem} level={level + 1} />
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
                        <Image
                            src={logoUrl}
                            alt={`${label} Preview`}
                            width={100}
                            height={100}
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

const CounterInput = ({ label, value, onChange, onBlur, min = 0, inputId, tooltipText }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    onBlur?: () => void;
    min?: number;
    inputId: string;
    tooltipText?: string;
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

    const content = (
        <div>
            <Label htmlFor={inputId} className="flex items-center gap-1">
                {label}
                {tooltipText && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                            <p>{tooltipText}</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </Label>
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
    
    return tooltipText ? <TooltipProvider>{content}</TooltipProvider> : content;
};


export function ProjectEditor({ projectId }: ProjectEditorProps) {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', []);
  const { toast } = useToast();
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
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
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const contentTextAreaRef = useRef<HTMLTextAreaElement>(null);
  
  const [textOutlineInput, setTextOutlineInput] = useState('');
  const [isParsingTextOutline, setIsParsingTextOutline] = useState(false);
  const textOutlineFileInputRef = useRef<HTMLInputElement>(null);
  const projectStructureFileInputRef = useRef<HTMLInputElement>(null);
  const [isExampleJsonDialogOpen, setIsExampleJsonDialogOpen] = useState(false);


  const [activeSubSectionId, setActiveSubSectionId] = useState<string | null>(null);
  const [isAiOutlineConstrained, setIsAiOutlineConstrained] = useState(true);


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
      setIsAiOutlineConstrained(project.isAiOutlineConstrained ?? true);
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
      if (undoneProject.isAiOutlineConstrained !== undefined) {
        setIsAiOutlineConstrained(undoneProject.isAiOutlineConstrained);
      }
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

  const handleSectionPromptChange = (id: string, promptText: string) => {
    if (!project) return;
     updateProject(prev => ({
         ...prev,
         sections: updateSectionById(prev.sections, id, { prompt: promptText }),
     }), false);
  }

   const handleSectionPromptBlur = () => {
       if (!project) return;
       updateProject(prev => ({ ...prev }), true);
   };

  const handleProjectDetailChange = (field: keyof Project, value: string | number | boolean) => {
    if (!project) return;
    const validStringFields: (keyof Project)[] = ['title', 'projectContext', 'teamDetails', 'instituteName', 'collegeInfo', 'teamId', 'subject', 'semester', 'branch', 'guideName', 'hodName', 'universityName', 'degree', 'submissionDate', 'submissionYear', 'keyFindings', 'additionalThanks'];
    const validNumberFields: (keyof Project)[] = ['minSections', 'maxSubSectionsPerSection'];
    const validBooleanFields: (keyof Project)[] = ['isAiOutlineConstrained'];


    if (validStringFields.includes(field) && typeof value === 'string') {
        updateProject({ [field]: value }, false);
    } else if (validNumberFields.includes(field) && typeof value === 'number' && !isNaN(value)) {
         updateProject({ [field]: Math.max(0, value) }, false);
    } else if (validBooleanFields.includes(field) && typeof value === 'boolean') {
        updateProject({ [field]: value }, false);
        if (field === 'isAiOutlineConstrained') setIsAiOutlineConstrained(value);
    } else if (validNumberFields.includes(field) && typeof value === 'string') {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
             updateProject({ [field]: Math.max(0, numValue) }, false);
        } else if (value === '') {
             const defaultValue = field === 'minSections' ? (project.minSections ?? 5) : (project.maxSubSectionsPerSection ?? 2);
             updateProject({ [field]: defaultValue }, false);
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
    const maxSizeInBytes = 2 * 1024 * 1024; // 2MB
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
             return outlineSections.map((outlineSection, index) => {
                 const currentNumber = parentNumbering ? `${parentNumbering}.${index + 1}` : `${index + 1}`;
                 const newId = uuidv4();
                 const nameLower = outlineSection.name.toLowerCase();
                 const isDiagram = nameLower.startsWith("diagram:");
                 const isFigure = nameLower.startsWith("figure ");
                 const isTable = nameLower.startsWith("table:");
                 const isFlowchart = nameLower.startsWith("flowchart ");

                 let promptText = `Generate content for the "${outlineSection.name.trim()}" section.`;
                 if (isDiagram) {
                     promptText = `Generate Mermaid code for: ${outlineSection.name.replace(/^Diagram:\s*/i, '').trim()}`;
                 } else if (isFlowchart) {
                    promptText = `Generate Mermaid code for a flowchart: ${outlineSection.name.replace(/^Flowchart \d+:\s*/i, '').trim()}`;
                 } else if (isFigure) {
                     promptText = `Provide a detailed description or prompt for an AI to generate an image for: ${outlineSection.name.replace(/^Figure \d+:\s*/i, '').trim()}`;
                 } else if (isTable) {
                     promptText = `Generate Markdown table data for: ${outlineSection.name.replace(/^Table \d+:\s*/i, '').trim()}`;
                 }  else {
                     promptText = `Generate the content for the section titled "${outlineSection.name.trim()}" which is numbered ${currentNumber}. This section is part of the project "${project.title}". The overall project context is: "${project.projectContext || '[No specific context provided by user for the project.]'}". Focus on providing relevant, well-structured information for this specific section.`;
                 }


                 let subSections: HierarchicalProjectSection[] = [];
                 if (outlineSection.subSections && (project.isAiOutlineConstrained === false || level < (project.maxSubSectionsPerSection ?? 2))) {
                     subSections = convertOutlineToSections(outlineSection.subSections, level + 1, currentNumber);
                 } else if (outlineSection.subSections) {
                     console.warn(`Subsections for "${outlineSection.name}" ignored due to depth limit (${project.maxSubSectionsPerSection ?? 2}).`);
                 }

                 let baseSection: HierarchicalProjectSection = {
                     id: newId,
                     name: outlineSection.name.trim(),
                     prompt: promptText,
                     content: '', 
                     lastGenerated: undefined,
                     subSections: subSections,
                 };

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
        if (!project || isGenerating || isSummarizing || isGeneratingOutline ) return;
        setIsGeneratingOutline(true);
        setPreviewedOutline(null);
        try {
            const outlineInput: GenerateProjectOutlineInput = {
                projectTitle: project.title,
                projectContext: project.projectContext || '',
                isAiOutlineConstrained: project.isAiOutlineConstrained ?? true,
            };
            if (project.isAiOutlineConstrained ?? true) { 
                outlineInput.minSections = project.minSections ?? 5;
                outlineInput.maxSubSectionsPerSection = project.maxSubSectionsPerSection ?? 2;
            }


            const result = await generateOutlineAction(outlineInput);

            if (result && typeof result === 'object' && 'error' in result) {
                toast({ variant: "destructive", title: "Outline Generation Failed", description: result.error || "An unknown error occurred from the AI." });
                setIsGeneratingOutline(false);
                return;
            }

            if (!result || !Array.isArray(result.sections) || !validateOutlineStructure(result.sections, 0, (project.isAiOutlineConstrained ?? true) ? project.maxSubSectionsPerSection : undefined)) {
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
    }, [project, isGenerating, isSummarizing, isGeneratingOutline, toast]);

    const handleGenerateTocClick = () => {
        if (!project || isGenerating || isSummarizing || isGeneratingOutline ) return;
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
      if (!project || !targetSection || isGenerating || isSummarizing || isGeneratingOutline || isGeneratingDiagram || isGeneratingImage) return;

        const nameLower = targetSection.name.toLowerCase();
        const isDiagram = nameLower.startsWith("diagram:") || nameLower.startsWith("flowchart:");
        const isFigure = nameLower.startsWith("figure ");
        const isTable = nameLower.startsWith("table:");

        if (isDiagram) {
            setIsGeneratingDiagram(true);
            try {
                const diagramInput: GenerateDiagramMermaidInput = {
                    description: targetSection.prompt || `Diagram for ${targetSection.name.replace(/^(Diagram:|Flowchart \d+:)\s*/i, '').trim()}`,
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
        } else if (isFigure) {
            setIsGeneratingImage(true);
            try {
                const imageGenPrompt = targetSection.prompt || `An image depicting: ${targetSection.name.replace(/^Figure \d+:\s*/i, '')}`;
                const result = await generateImageForSlideAction({ prompt: imageGenPrompt }); 
                if (result.error) {
                    throw new Error(result.error);
                }
                 updateProject(prev => ({
                    ...prev,
                    sections: updateSectionById(prev.sections, sectionIdToGenerate, {
                        content: result.generatedImageUrl, 
                        prompt: imageGenPrompt, 
                        lastGenerated: new Date().toISOString(),
                    }),
                }), true);
                toast({ title: "Image Generated", description: `Image for "${targetSection.name}" created.` });
            } catch (error) {
                console.error("Image generation failed:", error);
                toast({ variant: "destructive", title: "Image Generation Failed", description: error instanceof Error ? error.message : "Could not generate image." });
            } finally {
                setIsGeneratingImage(false);
            }
        } else if (isTable) {
             setIsGenerating(true); 
             try {
                const tablePrompt = targetSection.prompt || `Generate a Markdown table for: ${targetSection.name.replace(/^Table \d+:\s*/i, '')}`;
                const input = {
                    projectTitle: project.title || 'Untitled Project',
                    sectionName: targetSection.name, 
                    prompt: `Generate a detailed and well-formatted Markdown table based on the following request: "${tablePrompt}". Ensure the output is ONLY the Markdown table.`,
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
                 toast({ title: "Table Generated", description: `Markdown table for "${targetSection.name}" created.` });
             } catch (error) {
                 console.error("Table generation failed:", error);
                 toast({ variant: "destructive", title: "Table Generation Failed", description: error instanceof Error ? error.message : "Could not generate table." });
             } finally {
                 setIsGenerating(false);
             }
        } else { 
            setIsGenerating(true);
            try {
                let fullPrompt = `Project Title: ${project.title}\n`;
                fullPrompt += `Overall Project Context: ${project.projectContext}\n\n`;
                fullPrompt += `You are generating content for the sub-section: "${targetSection.name}".\n`;

                const findParent = (secs: HierarchicalProjectSection[], childId: string): HierarchicalProjectSection | null => {
                    for (const s of secs) {
                        if (s.subSections.some(sub => sub.id === childId)) return s;
                        if (s.subSections) {
                            const parent = findParent(s.subSections, childId);
                            if (parent) return parent;
                        }
                    }
                    return null;
                };
                const parentSection = findParent(project.sections, sectionIdToGenerate);
                if (parentSection) {
                    fullPrompt += `This sub-section is part of a larger section titled "${parentSection.name}".\n`;
                }
                fullPrompt += `Specific instructions for this sub-section ("${targetSection.name}"): ${targetSection.prompt}`;


                const input = {
                    projectTitle: project.title || 'Untitled Project',
                    sectionName: targetSection.name,
                    prompt: fullPrompt, 
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
        if (!project || !targetSection || isGenerating || isSummarizing || isGeneratingOutline ) return;

        const nameLower = targetSection.name.toLowerCase();
        const isDiagram = nameLower.startsWith("diagram:") || nameLower.startsWith("flowchart:");
        const isFigure = nameLower.startsWith("figure ");
        const isTable = nameLower.startsWith("table:");

        if (isDiagram || isFigure || isTable) {
            toast({ variant: "destructive", title: "Cannot Summarize", description: "Diagrams, figures, or tables cannot be summarized directly. Summarize their parent content section." });
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

  const handleDiagramGeneratedInSection = (mermaidCode: string, sectionId?: string) => {
    const targetId = sectionId || activeSubSectionId;
    if (!project || !targetId) return;

    const subSection = findSectionById(project.sections, targetId);
    if (!subSection || !(subSection.name.toLowerCase().startsWith("diagram:") || subSection.name.toLowerCase().startsWith("flowchart:"))) return;

    updateProject(prev => ({
        ...prev,
        sections: updateSectionById(prev.sections, targetId!, {
            content: mermaidCode,
            lastGenerated: new Date().toISOString(),
        }),
    }), true);
    toast({ title: 'Diagram Code Saved', description: `Mermaid code saved for "${subSection.name}".` });
  };

  const handleImagePromptSubmit = async (imagePrompt: string, sectionId: string) => {
    if (!project) return;
    const targetSection = findSectionById(project.sections, sectionId);
    if (!targetSection || !targetSection.name.toLowerCase().startsWith("figure ")) return;

    setIsGeneratingImage(true);
    try {
        const result = await generateImageForSlideAction({ prompt: imagePrompt });
        if (result.error) {
            throw new Error(result.error);
        }
        updateProject(prev => ({
            ...prev,
            sections: updateSectionById(prev.sections, sectionId, {
                content: result.generatedImageUrl,
                prompt: imagePrompt, 
                lastGenerated: new Date().toISOString(),
            }),
        }), true);
        toast({ title: "Image Generated", description: `Image for "${targetSection.name}" created.` });
    } catch (error) {
        console.error("Image generation for section failed:", error);
        toast({ variant: "destructive", title: "Image Generation Failed", description: error instanceof Error ? error.message : "Could not generate image." });
    } finally {
        setIsGeneratingImage(false);
    }
  };


  const handleApplyMarkdownFormat = (newContent: string, newCursorPosition?: number) => {
     if (!project || !activeSubSectionId) return;
     const currentActive = findSectionById(project.sections, activeSubSectionId);
     if (currentActive?.name.toLowerCase().startsWith("diagram:") || currentActive?.name.toLowerCase().startsWith("figure ") || currentActive?.name.toLowerCase().startsWith("table:") || currentActive?.name.toLowerCase().startsWith("flowchart:")) {
        toast({variant: "destructive", title: "Cannot Edit Directly", description: "Specialized items like diagrams or figures cannot be edited with the Markdown toolbar. Use their specific generation/edit tools."});
        return;
     }

     handleSectionContentChange(activeSubSectionId, newContent);
     setTimeout(() => {
       if (contentTextAreaRef.current && newCursorPosition !== undefined) {
         contentTextAreaRef.current.focus();
         contentTextAreaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
       }
     }, 0);
     handleSectionContentBlur();
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

  const handleParseTextOutline = async () => {
    if (!project || !textOutlineInput.trim()) {
        toast({ variant: "destructive", title: "No Text Provided", description: "Please paste or type your outline into the text area." });
        return;
    }
    setIsParsingTextOutline(true);
    try {
        const result = await parseTextOutlineAction({ textOutline: textOutlineInput });
        if (result && 'error' in result && typeof result.error === 'string') {
             toast({ variant: "destructive", title: "Parsing Failed", description: result.error });
        } else if (result && Array.isArray(result.sections)) {
            if (result.sections.length === 0 && textOutlineInput.trim().length > 0) {
                 toast({ variant: "destructive", title: "Parsing Issue", description: "AI could not parse the provided text into a valid outline. Please check format or try rephrasing." });
            } else if (result.sections.length > 0 && result.sections[0]?.name?.startsWith("Error:")) {
                 toast({ variant: "destructive", title: "AI Parsing Error", description: result.sections[0].name });
            } else if (result.sections.length > 0) {
                 setPreviewedOutline({ sections: result.sections });
                 toast({ title: "Text Outline Parsed by AI", description: "Review the preview below and click 'Apply Outline' if it looks correct." });
                 setTextOutlineInput('');
            } else {
                 toast({ title: "No Outline Generated", description: "The AI did not generate an outline from the provided text. It might be empty or unclear." });
            }
        } else {
             toast({ variant: "destructive", title: "Parsing Failed", description: "An unexpected error occurred while parsing the outline with AI." });
        }
    } catch (error) {
        console.error("Error calling parseTextOutlineAction:", error);
        toast({ variant: "destructive", title: "Parsing Error", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
        setIsParsingTextOutline(false);
    }
  };

  const handleTextOutlineFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setTextOutlineInput(text);
        toast({
          title: "File Content Loaded",
          description: "Text outline loaded. Click 'Parse & Preview' to process.",
        });
      };
      reader.onerror = () => {
        toast({ variant: "destructive", title: "File Read Error", description: "Could not read the selected text file." });
      };
      reader.readAsText(file);
    }
    if (textOutlineFileInputRef.current) {
      textOutlineFileInputRef.current.value = "";
    }
  };

  const handleProjectStructureFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.type !== 'application/json') {
            toast({ variant: "destructive", title: "Invalid File Type", description: "Please upload a valid JSON file for project structure."});
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const parsedJson = JSON.parse(text);
                // Validate if parsedJson has a 'sections' property and it's an array
                if (parsedJson && Array.isArray(parsedJson.sections) && validateOutlineStructure(parsedJson.sections)) {
                     // Further validate if each item in sections matches OutlineSection structure (simplified check here)
                    const isValidStructure = parsedJson.sections.every((sec: any) => typeof sec.name === 'string');
                    if (isValidStructure) {
                        setPreviewedOutline({ sections: parsedJson.sections });
                        toast({ title: "Project Structure Loaded", description: "Review the preview and click 'Apply Outline'." });
                    } else {
                        throw new Error("JSON structure is not a valid section outline.");
                    }
                } else if (parsedJson && Array.isArray(parsedJson) && validateOutlineStructure(parsedJson)) {
                    // Handle case where the uploaded JSON is directly an array of OutlineSection
                    setPreviewedOutline({ sections: parsedJson });
                    toast({ title: "Project Structure Loaded", description: "Review the preview and click 'Apply Outline'." });
                } else {
                    throw new Error("JSON file does not contain a valid 'sections' array or is not a direct array of sections.");
                }
            } catch (err) {
                console.error("Error parsing project structure JSON:", err);
                toast({ variant: "destructive", title: "Import Failed", description: `Could not parse JSON file: ${err instanceof Error ? err.message : "Unknown error"}` });
            }
        };
        reader.onerror = () => {
            toast({ variant: "destructive", title: "File Read Error", description: "Could not read the project structure file." });
        };
        reader.readAsText(file);
    }
    if (projectStructureFileInputRef.current) {
        projectStructureFileInputRef.current.value = "";
    }
  };

  const exampleJsonStructure = `[
  {
    "name": "1. Main Example Section",
    "subSections": [
      {
        "name": "1.1 Example Sub-Section",
        "subSections": [
          { "name": "1.1.1 Diagram: Example Diagram" }
        ]
      },
      { "name": "1.2 Another Example Sub-Section" }
    ]
  },
  {
    "name": "2. Second Main Example",
    "subSections": [
      { "name": "2.1 Simple Sub-Section" }
    ]
  },
  {
    "name": "3. Section without Sub-sections"
  }
]`;


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
    
    const itemToRender = currentActiveSubSection || currentActiveMainSection;
    const nameLower = itemToRender?.name?.toLowerCase() || "";
    const isDiagramItem = nameLower.startsWith("diagram:") || nameLower.startsWith("flowchart:");
    const isFigureItem = nameLower.startsWith("figure ");
    const isTableItem = nameLower.startsWith("table:");


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
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                         <CounterInput
                             label="Min Sections (Outline)"
                             value={project.minSections ?? 5}
                             onChange={(val) => handleProjectDetailChange('minSections', val)}
                             onBlur={handleProjectDetailBlur}
                             min={1}
                             inputId="min-sections-counter"
                             tooltipText="Minimum TOP-LEVEL sections AI should aim for (if constraints enabled)."
                         />
                         <CounterInput
                             label="Max Sub-Section Depth"
                             value={project.maxSubSectionsPerSection ?? 2}
                             onChange={(val) => handleProjectDetailChange('maxSubSectionsPerSection', val)}
                             onBlur={handleProjectDetailBlur}
                             min={0}
                             inputId="max-subsection-depth-counter"
                             tooltipText="Max nesting level for sub-sections (e.g., 2 means 1.1.1) (if constraints enabled)."
                         />
                         <div className="flex items-center space-x-2 sm:col-span-2">
                             <Switch
                                 id="ai-outline-constrained-toggle"
                                 checked={isAiOutlineConstrained}
                                 onCheckedChange={(checked) => {
                                     handleProjectDetailChange('isAiOutlineConstrained', checked);
                                     handleProjectDetailBlur(); 
                                 }}
                                 aria-label="Toggle AI Outline Constraints"
                             />
                             <Label htmlFor="ai-outline-constrained-toggle" className="text-sm cursor-pointer">
                                 {isAiOutlineConstrained ? "Constrain AI Outline (Uses Counters)" : "AI Freedom for Outline (Ignores Counters)"}
                             </Label>
                         </div>
                     </div>
                     <p className="text-xs text-muted-foreground -mt-4 sm:col-span-2">Control AI outline generation parameters. When constrained, AI uses the counters. When free, AI uses its judgment based on project context.</p>

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
                         <div> <Label htmlFor="universityName">University Name</Label> <Input id="universityName" value={project.universityName || ''} onChange={(e) => handleProjectDetailChange('universityName', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="Affiliated University" className="mt-1"/> </div>
                         <div> <Label htmlFor="degree">Degree</Label> <Input id="degree" value={project.degree || ''} onChange={(e) => handleProjectDetailChange('degree', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="e.g., Bachelor of Engineering" className="mt-1"/> </div>
                         <div> <Label htmlFor="submissionDate">Submission Date</Label> <Input id="submissionDate" value={project.submissionDate || ''} onChange={(e) => handleProjectDetailChange('submissionDate', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="e.g., May 2024" className="mt-1"/> </div>
                         <div> <Label htmlFor="submissionYear">Submission Year</Label> <Input id="submissionYear" value={project.submissionYear || ''} onChange={(e) => handleProjectDetailChange('submissionYear', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="e.g., 2023-2024" className="mt-1"/> </div>
                         <div> <Label htmlFor="keyFindings">Key Findings (for Abstract)</Label> <Textarea id="keyFindings" value={project.keyFindings || ''} onChange={(e) => handleProjectDetailChange('keyFindings', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="Briefly list key results or findings..." className="mt-1 h-20"/> </div>
                         <div> <Label htmlFor="additionalThanks">Additional Thanks (for Ack.)</Label> <Textarea id="additionalThanks" value={project.additionalThanks || ''} onChange={(e) => handleProjectDetailChange('additionalThanks', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="e.g., Librarian, specific friends..." className="mt-1 h-20"/> </div>
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
                     <Button variant="default" size="sm" onClick={handleGenerateTocClick} disabled={isGeneratingOutline || isGenerating || isSummarizing  || !project.projectContext?.trim()} className="hover:glow-primary focus-visible:glow-primary">
                        {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                        {isGeneratingOutline ? 'Generating Outline...' : 'Generate Outline Preview'}
                     </Button>
                      <Separator />
                     <div>
                         <Label htmlFor="text-outline-input">Paste Text Outline (for AI Parsing)</Label>
                         <Textarea
                             id="text-outline-input"
                             value={textOutlineInput}
                             onChange={(e) => setTextOutlineInput(e.target.value)}
                             placeholder="Paste your outline here (use indentation for hierarchy)..."
                             className="mt-1 min-h-[100px] focus-visible:glow-primary"
                         />
                         <div className="flex items-center gap-2 mt-2">
                             <Button variant="outline" size="sm" onClick={handleParseTextOutline} className="flex-1" disabled={isParsingTextOutline || !textOutlineInput.trim()}>
                                 {isParsingTextOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Eraser className="mr-2 h-4 w-4" />}
                                  {isParsingTextOutline ? 'Parsing...' : 'Parse & Preview Text Outline'}
                             </Button>
                             <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => textOutlineFileInputRef.current?.click()}
                                title="Upload Text Outline File"
                                className="h-9 w-9"
                            >
                                <FileUp className="h-4 w-4" />
                                <span className="sr-only">Upload Text Outline File</span>
                             </Button>
                             <Input
                                id="text-outline-file-input"
                                type="file"
                                accept=".txt,text/plain"
                                ref={textOutlineFileInputRef}
                                onChange={handleTextOutlineFileChange}
                                className="hidden"
                              />
                         </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            AI will parse this text into a hierarchical outline. You can also upload a .txt file.
                         </p>
                     </div>

                      <Separator />
                       <div>
                        <Label htmlFor="project-structure-file-input">Import Project Structure (JSON)</Label>
                        <div className="flex items-center gap-2 mt-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => projectStructureFileInputRef.current?.click()}
                                className="flex-1"
                            >
                                <FileJson className="mr-2 h-4 w-4" /> Upload JSON File
                            </Button>
                            <Dialog open={isExampleJsonDialogOpen} onOpenChange={setIsExampleJsonDialogOpen}>
                                <DialogModalTrigger asChild>
                                    <Button variant="link" size="sm" className="text-xs h-auto p-0">
                                        <Info className="mr-1 h-3 w-3" /> View Example Format
                                    </Button>
                                </DialogModalTrigger>
                                <DialogModalContent className="sm:max-w-md md:max-w-lg lg:max-w-xl">
                                    <DialogModalHeader>
                                        <DialogModalTitle>Example JSON Outline Structure</DialogModalTitle>
                                        <DialogModalDescription>
                                            Use this format for your JSON file. Ensure 'name' is present for all items. 'subSections' is optional.
                                        </DialogModalDescription>
                                    </DialogModalHeader>
                                    <ScrollArea className="max-h-[60vh] mt-4">
                                        <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                                            <code>{exampleJsonStructure}</code>
                                        </pre>
                                    </ScrollArea>
                                    <DialogModalFooter className="mt-4">
                                        <DialogClose asChild>
                                            <Button type="button" variant="secondary">Close</Button>
                                        </DialogClose>
                                    </DialogModalFooter>
                                </DialogModalContent>
                            </Dialog>

                            <Input
                                id="project-structure-file-input"
                                type="file"
                                accept=".json,application/json"
                                ref={projectStructureFileInputRef}
                                onChange={handleProjectStructureFileChange}
                                className="hidden"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Upload a JSON file containing a pre-defined section structure.
                        </p>
                       </div>


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
                                     disabled={isGeneratingOutline || isParsingTextOutline}
                                     className="hover:glow-accent focus-visible:glow-accent"
                                 >
                                     <CheckCircle className="mr-2 h-4 w-4" /> Apply Outline
                                 </Button>
                                  <Button
                                     variant="outline"
                                     size="sm"
                                     onClick={() => setPreviewedOutline(null)}
                                     disabled={isGeneratingOutline || isParsingTextOutline}
                                  >
                                      Discard Preview
                                  </Button>
                             </div>
                         </div>
                     )}
                </CardFooter>
            </Card>
        );
    } else if (itemToRender) { 
        activeViewName = itemToRender.name;
        const isMainLevelSection = !activeSubSectionId && !!activeSectionId && itemToRender.id === activeSectionId;

        if (isMainLevelSection && itemToRender.subSections.length > 0) {
            activeViewContent = <CombinedSectionPreview section={itemToRender} projectTitle={project.title} />;
        } else if (isDiagramItem) {
            activeViewContent = (
               <div className="space-y-6">
                   <Card className="shadow-md">
                     <CardHeader>
                       <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-primary text-glow-primary">
                           <Projector className="w-5 h-5"/> {itemToRender.name}
                       </CardTitle>
                       {itemToRender.lastGenerated && ( <CardDescription className="text-xs md:text-sm">Last generated: {new Date(itemToRender.lastGenerated).toLocaleString()}</CardDescription> )}
                     </CardHeader>
                     <CardContent className="space-y-4">
                       <p className="text-sm text-muted-foreground">Use the AI generator below to create the diagram content. The generated Mermaid code will be stored for this item.</p>
                       <AiDiagramGenerator
                            onDiagramGenerated={(code) => handleDiagramGeneratedInSection(code, itemToRender.id)}
                            initialDescription={itemToRender.prompt.replace(/^(Generate Mermaid code for:|Diagram:|Flowchart \d+:)\s*/i, '').trim()}
                            projectContext={`For project: ${project.title}. Section: ${itemToRender.name}.`}
                        />
                       {itemToRender.content && (
                           <div className="mt-4 space-y-2">
                               <Label>Current Diagram:</Label>
                               <MermaidDiagram chart={itemToRender.content} id={`diagram-${itemToRender.id}`} />
                               <details className="mt-2 text-xs">
                                   <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show Mermaid Code</summary>
                                   <pre className="mt-1 p-2 bg-muted rounded-md text-muted-foreground overflow-x-auto max-h-40 text-[10px] md:text-xs">
                                     <code>{itemToRender.content}</code>
                                   </pre>
                               </details>
                           </div>
                        )}
                     </CardContent>
                   </Card>
               </div>
            );
        } else if (isFigureItem) {
             activeViewContent = (
                <div className="space-y-6">
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-primary text-glow-primary"><ImageIcon className="w-5 h-5" /> {itemToRender.name}</CardTitle>
                             {itemToRender.lastGenerated && ( <CardDescription className="text-xs md:text-sm">Last updated: {new Date(itemToRender.lastGenerated).toLocaleString()}</CardDescription> )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor={`image-prompt-${itemToRender.id}`}>AI Image Generation Prompt</Label>
                                <Textarea
                                    id={`image-prompt-${itemToRender.id}`}
                                    value={itemToRender.prompt.replace(/^Provide a detailed description or prompt for an AI to generate an image for:\s*/i, '').trim()}
                                    onChange={(e) => handleSectionPromptChange(itemToRender.id, `Provide a detailed description or prompt for an AI to generate an image for: ${e.target.value}`)}
                                    onBlur={handleSectionPromptBlur}
                                    placeholder="e.g., A futuristic cityscape with flying cars under a neon sky."
                                    className="mt-1 min-h-[80px] focus-visible:glow-primary"
                                />
                            </div>
                            <Button onClick={() => handleImagePromptSubmit(itemToRender.prompt, itemToRender.id)} disabled={isGeneratingImage || isGenerating || isSummarizing || isGeneratingOutline } className="hover:glow-primary focus-visible:glow-primary">
                                {isGeneratingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                {isGeneratingImage ? 'Generating Image...' : 'Generate Image with AI'}
                            </Button>
                            {itemToRender.content && (
                                <div className="mt-4 space-y-2">
                                    <Label>Current Image:</Label>
                                    <div className="relative w-full max-w-md aspect-video border rounded-md overflow-hidden bg-muted">
                                        <Image src={itemToRender.content} alt={itemToRender.name} layout="fill" objectFit="contain" data-ai-hint="generated illustration" />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            );
        } else if (isTableItem) {
             activeViewContent = (
                <div className="space-y-6">
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-primary text-glow-primary"><TableIcon className="w-5 h-5" /> {itemToRender.name}</CardTitle>
                            {itemToRender.lastGenerated && ( <CardDescription className="text-xs md:text-sm">Last generated: {new Date(itemToRender.lastGenerated).toLocaleString()}</CardDescription> )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor={`table-prompt-${itemToRender.id}`}>AI Table Generation Prompt</Label>
                                <Textarea
                                    id={`table-prompt-${itemToRender.id}`}
                                    value={itemToRender.prompt.replace(/^Generate Markdown table data for:\s*/i, '').trim()}
                                    onChange={(e) => handleSectionPromptChange(itemToRender.id, `Generate Markdown table data for: ${e.target.value}`)}
                                    onBlur={handleSectionPromptBlur}
                                    placeholder="e.g., A table comparing features of product A, B, and C including price, rating, and availability."
                                    className="mt-1 min-h-[80px] focus-visible:glow-primary"
                                />
                            </div>
                            <Button onClick={() => handleGenerateSection(itemToRender.id)} disabled={isGenerating || isSummarizing || isGeneratingOutline } className="hover:glow-primary focus-visible:glow-primary">
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                {isGenerating ? 'Generating Table...' : 'Generate Table with AI'}
                            </Button>
                            {itemToRender.content && (
                                <div className="mt-4 space-y-2">
                                    <Label>Current Table (Markdown):</Label>
                                    <Textarea
                                        value={itemToRender.content}
                                        onChange={(e) => handleSectionContentChange(itemToRender.id, e.target.value)}
                                        onBlur={handleSectionContentBlur}
                                        className="min-h-[150px] font-mono text-sm focus-visible:glow-primary"
                                        placeholder="Markdown table content appears here..."
                                    />
                                    <h4 className="text-sm font-medium mt-2">Preview:</h4>
                                    <MarkdownPreview content={itemToRender.content} />
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
                        <CardTitle className="text-primary text-glow-primary text-lg md:text-xl">{itemToRender.name} - AI Prompt</CardTitle>
                        {itemToRender.lastGenerated && ( <CardDescription className="text-xs md:text-sm">Last generated: {new Date(itemToRender.lastGenerated).toLocaleString()}</CardDescription> )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor={`section-prompt-${itemToRender.id}`}>Generation Prompt</Label>
                          <Textarea id={`section-prompt-${itemToRender.id}`} value={itemToRender.prompt} onChange={(e) => handleSectionPromptChange(itemToRender.id, e.target.value)} onBlur={handleSectionPromptBlur} placeholder="Instructions for the AI to generate content for this sub-section..." className="mt-1 min-h-[100px] font-mono text-sm focus-visible:glow-primary" />
                        </div>
                        <Button onClick={() => handleGenerateSection(itemToRender.id)} disabled={isGenerating || isSummarizing || isGeneratingOutline || isGeneratingDiagram || isGeneratingImage} className="hover:glow-primary focus-visible:glow-primary">
                          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                          {isGenerating ? 'Generating...' : 'Generate Content'}
                        </Button>
                      </CardContent>
                    </Card>
                    <Card className="shadow-md mb-6">
                       <CardHeader>
                         <CardTitle className="text-lg md:text-xl">{itemToRender.name} - Content</CardTitle>
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
                                   id={`section-content-${itemToRender.id}`}
                                   ref={contentTextAreaRef}
                                   value={itemToRender.content}
                                   onChange={(e) => handleSectionContentChange(itemToRender.id, e.target.value)}
                                   onBlur={handleSectionContentBlur}
                                   placeholder={"Generated content appears here. Use Markdown for formatting..."}
                                   className="min-h-[300px] md:min-h-[400px] text-sm md:text-base focus-visible:glow-primary font-mono"
                                />
                           </TabsContent>
                           <TabsContent value="preview">
                               <MarkdownPreview content={itemToRender.content || ''} />
                           </TabsContent>
                         </Tabs>
                       </CardContent>
                       <CardFooter className="flex justify-end">
                         <Button variant="outline" size="sm" onClick={() => handleSummarizeSection(itemToRender.id)} disabled={isSummarizing || isGenerating || isGeneratingOutline  || !itemToRender.content?.trim()} className="hover:glow-accent focus-visible:glow-accent">
                           {isSummarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScrollText className="mr-2 h-4 w-4" />}
                           {isSummarizing ? 'Summarizing...' : 'Summarize'}
                         </Button>
                       </CardFooter>
                    </Card>
                </div>
            );
        }
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
                        <Button variant="default" size="sm" onClick={handleGenerateTocClick} disabled={isGeneratingOutline || isGenerating || isSummarizing  || !project.projectContext?.trim()} className="hover:glow-primary focus-visible:glow-primary">
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
                handleSaveOnline={handleSaveOnline}
                canUndo={canUndo}
                handleUndo={handleUndo}
                isEditingSections={isEditingSections}
                setIsEditingSections={setIsEditingSections}
                onEditSectionName={handleEditSectionName}
                onDeleteSection={handleDeleteSection}
                onAddSubSection={(parentId) => {
                    if (!project) return;
                    const parentSection = findSectionById(project.sections, parentId);
                    if (!parentSection) return;
                    const parentNumbering = getSectionNumbering(project.sections, parentId);
                    const newSubSectionName = `New Sub-Item ${parentNumbering}.${(parentSection.subSections || []).length + 1}`;
                    updateProject(
                        prev => ({ ...prev, sections: addSubSectionById(prev.sections, parentId, { name: newSubSectionName, prompt: `Generate content for ${newSubSectionName}`, content: "" }, parentNumbering) }),
                        true
                    );
                    toast({ title: "Sub-item added", description: `Added "${newSubSectionName}" under "${parentSection.name}".`});
                 }}
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
                handleSaveOnline={handleSaveOnline}
                canUndo={handleUndo}
                handleUndo={handleUndo}
                onCloseSheet={() => setIsMobileSheetOpen(false)}
                isEditingSections={isEditingSections}
                setIsEditingSections={setIsEditingSections}
                onEditSectionName={handleEditSectionName}
                onDeleteSection={handleDeleteSection}
                 onAddSubSection={(parentId) => {
                    if (!project) return;
                     const parentSection = findSectionById(project.sections, parentId);
                    if (!parentSection) return;
                    const parentNumbering = getSectionNumbering(project.sections, parentId);
                    const newSubSectionName = `New Sub-Item ${parentNumbering}.${(parentSection.subSections || []).length + 1}`;
                     updateProject(
                        prev => ({ ...prev, sections: addSubSectionById(prev.sections, parentId, { name: newSubSectionName, prompt: `Generate content for ${newSubSectionName}`, content: "" }, parentNumbering) }),
                        true
                    );
                    toast({ title: "Sub-item added", description: `Added "${newSubSectionName}" under "${parentSection.name}".`});
                }}
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

// Validates the structure of OutlineSection[] for basic correctness
const validateOutlineStructure = (sections: any[] | undefined, currentDepth = 0, maxDepth?: number): sections is OutlineSection[] => {
    if (!Array.isArray(sections)) {
        console.warn(`Outline Validation Failed (Depth ${currentDepth}): Root 'sections' is not an array.`);
        return false;
    }
    if (sections.length === 0 && currentDepth === 0) {
        // Allow empty outline if that's what AI genuinely returns after parsing an empty input
    }
    return sections.every((section, index) => {
        if (typeof section !== 'object' || !section || typeof section.name !== 'string' ) { 
            console.warn(`Outline Validation Failed (Depth ${currentDepth}): Section at index ${index} is invalid (missing name or not an object):`, JSON.stringify(section));
            return false;
        }
        if (maxDepth !== undefined && currentDepth >= maxDepth) {
            if (section.subSections && Array.isArray(section.subSections) && section.subSections.length > 0) {
                console.warn(`Outline Validation Failed (Depth ${currentDepth}): Section "${section.name}" at max depth ${maxDepth} has subSections.`);
                return false;
            }
        }
        if (section.hasOwnProperty('subSections')) {
            if (!Array.isArray(section.subSections)) {
                console.warn(`Outline Validation Failed (Depth ${currentDepth}): subSections for "${section.name}" exists but is not an array:`, section.subSections);
                return false;
            }
            if (section.subSections.length > 0) {
                if (maxDepth !== undefined && currentDepth + 1 > maxDepth) {
                     console.warn(`Outline Validation Failed (Depth ${currentDepth}): Section "${section.name}" has subSections that would exceed max depth ${maxDepth}. Children count: ${section.subSections.length}`);
                     return false;
                }
                if (!validateOutlineStructure(section.subSections, currentDepth + 1, maxDepth)) {
                    console.warn(`Outline Validation Failed: Invalid structure within subSections of "${section.name}" (Depth ${currentDepth}).`);
                    return false;
                }
            }
        }
        return true;
    });
};
