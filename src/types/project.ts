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
  prompt: string;
  content: string; // For text sections or to store Mermaid code/image ref
  lastGenerated?: Date | string;
  subSections: HierarchicalProjectSection[]; // Subsections should always be an array
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
  sections: HierarchicalProjectSection[]; // Use hierarchical structure
  createdAt: Date | string;
  updatedAt: Date | string;
  storageType: 'local' | 'cloud';
  minSections?: number; // Minimum sections AI should aim for
  maxSubSectionsPerSection?: number; // Max depth of sub-sections AI should generate
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
  STANDARD_PAGE_INDICES[page] = -(index + 2); // Start from -2 (-1 is Project Details)
});
STANDARD_PAGE_INDICES[TOC_SECTION_NAME] = -100; // Assign a distinct index for TOC