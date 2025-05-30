export type SectionIdentifier = string | number; // ID (string) or standard page index (number)

// Interface for the structure expected from the AI outline generation (Hierarchical)
export interface OutlineSection {
  name: string;
  subSections?: OutlineSection[]; // Recursive definition, AI might omit if none
}
export interface GeneratedSectionOutline {
  sections: OutlineSection[];
}

// Updated Hierarchical Project Section
export interface HierarchicalProjectSection {
  id: string; // Unique identifier for the section
  name: string;
  prompt: string; // For content sub-sections, or description for diagrams/images/tables
  content: string; // For text sections, Mermaid code, image URL/prompt, or Markdown table
  lastGenerated?: Date | string;
  subSections: HierarchicalProjectSection[]; // Subsections should always be an array
  // Optional: Add a type field if parsing names becomes too complex
  // itemType?: 'content' | 'diagram' | 'image' | 'table' | 'container';
}


export interface Project {
  id: string;
  title: string;
  projectType: 'mini-project' | 'internship';
  projectContext: string;
  teamDetails: string;
  instituteName?: string;
  collegeInfo?: string; // Potentially redundant if instituteName is used
  universityLogoUrl?: string; // URL or Base64 Data URI
  collegeLogoUrl?: string; // URL or Base64 Data URI
  teamId?: string;
  subject?: string;
  semester?: string;
  branch?: string;
  guideName?: string;
  hodName?: string; // Head of Department Name
  degree?: string; // Added for certificate/cover page
  submissionDate?: string; // Added for cover page/declaration
  submissionYear?: string; // Added for certificate
  keyFindings?: string; // Added for abstract
  additionalThanks?: string; // Added for acknowledgement
  universityName?: string; // Added for cover page
  sections: HierarchicalProjectSection[]; // Use hierarchical structure
  createdAt: Date | string;
  updatedAt: Date | string;
  storageType: 'local' | 'cloud';
  minSections?: number; // Minimum sections AI should aim for
  maxSubSectionsPerSection?: number; // Max depth of sub-sections AI should generate
  isAiOutlineConstrained?: boolean; // Toggle for AI outline constraints
  preferredAiModel?: 'gemini' | 'openai'; // User's preferred AI model for this project
}

// AI Concept Explainer Types
export interface ExplanationSlide {
  title?: string;
  content: string; // Markdown formatted text for the slide's main body
  mermaidDiagram?: string; // Optional Mermaid.js code for a diagram on this slide
  imagePromptForGeneration?: string; // Optional: A text prompt for an AI to generate an image for this slide.
  generatedImageUrl?: string; // Optional: The data URI of an AI-generated image.
  videoPlaceholderText?: string; // Optional: A description of a video that could enhance this slide.
  interactiveElementPlaceholderText?: string; // Optional: A description of an interactive element (e.g., quiz, demo).
}

export interface ExplainConceptOutput {
  slides: ExplanationSlide[];
  conceptTitle: string; // The concept being explained
}

// Constants for standard pages and their indices
export const TOC_SECTION_NAME = "Table of Contents";

export const STANDARD_REPORT_PAGES = [
  "Cover Page",
  "Certificate",
  "Declaration",
  "Abstract",
  "Acknowledgement",
  "List of Figures",
  "List of Tables",
  "Abbreviations",
];

export const STANDARD_PAGE_INDICES: { [key: string]: number } = {};
STANDARD_REPORT_PAGES.forEach((page, index) => {
  STANDARD_PAGE_INDICES[page] = -(index + 2);
});
STANDARD_PAGE_INDICES[TOC_SECTION_NAME] = -100; // Assign a distinct index for TOC
