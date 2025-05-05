export type SectionIdentifier = string | number; // ID (string) or standard page index (number)

// Update ProjectSection to be hierarchical and include an ID
export interface HierarchicalProjectSection {
  id: string; // Unique identifier for the section
  name: string;
  prompt: string;
  content: string;
  lastGenerated?: Date | string;
  subSections: HierarchicalProjectSection[]; // Ensure subSections is always an array
}

// Interface for the structure expected from the AI outline generation (Hierarchical)
export interface OutlineSection {
  name: string;
  subSections?: OutlineSection[]; // Recursive definition (optional from AI)
}
export interface GeneratedSectionOutline {
  sections: OutlineSection[];
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
}
