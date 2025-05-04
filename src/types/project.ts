export interface ProjectSection {
  name: string;
  prompt: string;
  content: string;
  lastGenerated?: Date | string;
}

export interface Project {
  id: string;
  title: string;
  teamDetails: string; // Simple string for now, can be expanded later
  collegeInfo: string; // Simple string
  sections: ProjectSection[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Special name for the Table of Contents section
export const TOC_SECTION_NAME = "Table of Contents";

// Predefined common sections, excluding the special ToC section
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