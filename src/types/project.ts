export interface ProjectSection {
  name: string;
  prompt: string;
  content: string;
  lastGenerated?: Date | string;
}

export interface Project {
  id: string;
  title: string;
  projectType: 'mini-project' | 'internship'; // Added project type
  projectContext: string; // Added field to store initial project context
  teamDetails: string; // Simple string for now, represents team members & enrollments. TODO: Refactor to Array<{name: string, enrollment: string}>
  instituteName?: string; // Optional institute name
  collegeInfo?: string; // Optional, potentially redundant with instituteName but kept for compatibility if used elsewhere
  universityLogoUrl?: string; // Will store Data URL if image is uploaded
  collegeLogoUrl?: string; // Will store Data URL if image is uploaded
  teamId?: string; // Optional team ID
  subject?: string; // e.g., Design Engineering - 1A
  semester?: string; // e.g., 5
  branch?: string; // e.g., Computer Engineering
  guideName?: string; // Name of the faculty guide
  sections: ProjectSection[];
  createdAt: Date | string;
  updatedAt: Date | string;
  storageType: 'local' | 'cloud'; // Added to indicate where the project is stored
}

// Name for the specific Table of Contents section
export const TOC_SECTION_NAME = "Table of Contents";

// Predefined standard report pages/sections
export const STANDARD_REPORT_PAGES = [
  "Cover Page",
  "Certificate",
  "Declaration",
  "Abstract",
  "Acknowledgement",
  "List of Figures",
  "List of Tables",
  "Abbreviations",
  TOC_SECTION_NAME, // Included here for consistency, but handled separately in UI
];


// Predefined common sections (used as suggestions if needed, but primary source is AI outline)
// Excluded Table of Contents and other standard pages as they are handled separately
export const COMMON_SECTIONS = [
  "Introduction",
  "Literature Review",
  "Methodology",
  "Implementation",
  "Results and Discussion",
  "Conclusion",
  "References",
  "Appendix",
];
