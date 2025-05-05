export interface ProjectSection {
  name: string;
  prompt: string;
  content: string;
  lastGenerated?: Date | string;
}

export interface Project {
  id: string;
  title: string;
  projectContext: string; // Added field to store initial project context
  teamDetails: string; // Simple string for now, represents team members & enrollments. TODO: Refactor to Array<{name: string, enrollment: string}>
  instituteName: string; // Replaced collegeInfo
  universityLogoUrl?: string; // Added: Optional URL for University Logo
  collegeLogoUrl?: string; // Added: Optional URL for College Logo
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

// Predefined common sections (used as suggestions if needed, but primary source is AI outline)
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
