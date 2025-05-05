export type SectionIdentifier = string | number; // ID (string) or standard page index (number)

// Update ProjectSection to be hierarchical and include an ID
export interface HierarchicalProjectSection {
  id: string; // Unique identifier for the section
  name: string;
  prompt: string;
  content: string;
  lastGenerated?: Date | string;
  subSections?: HierarchicalProjectSection[]; // Array for sub-sections
}

// Interface for the structure expected from the AI outline generation (Hierarchical)
interface OutlineSection {
  name: string;
  subSections?: OutlineSection[]; // Recursive definition
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

// Name for the specific Table of Contents section (still relevant for standard pages)
export const TOC_SECTION_NAME = "Table of Contents"; // Make sure this is exported

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
  // TOC is implicitly handled by the hierarchical section structure now for generated sections
  // but we keep the constant for identifying the standard page if needed.
];

// Assign negative indices to standard pages for sidebar identification
export const STANDARD_PAGE_INDICES: { [key: string]: number } = {};
STANDARD_REPORT_PAGES.forEach((page, index) => {
  STANDARD_PAGE_INDICES[page] = -(index + 2); // Start from -2 (-1 is Project Details)
});
STANDARD_PAGE_INDICES[TOC_SECTION_NAME] = -100; // Assign a distinct index for TOC if needed as a standard page concept


// Predefined common sections (less critical now with AI generation, but kept for potential future use)
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

// --- Helper Functions for Hierarchical Sections ---

/**
 * Finds a section (or sub-section) by its unique ID within a hierarchical structure.
 * @param sections The array of top-level sections to search within.
 * @param id The ID of the section to find.
 * @returns The found section object or null if not found.
 */
export function findSectionById(sections: HierarchicalProjectSection[], id: string): HierarchicalProjectSection | null {
    for (const section of sections) {
        if (section.id === id) {
            return section;
        }
        if (section.subSections) {
            const foundInSection = findSectionById(section.subSections, id);
            if (foundInSection) {
                return foundInSection;
            }
        }
    }
    return null;
}

/**
 * Updates a section (or sub-section) by its ID with new data. Returns a new array with the update.
 * @param sections The original array of top-level sections.
 * @param id The ID of the section to update.
 * @param updates An object containing the properties to update.
 * @returns A new array of sections with the specified section updated.
 */
export function updateSectionById(
    sections: HierarchicalProjectSection[],
    id: string,
    updates: Partial<Omit<HierarchicalProjectSection, 'id' | 'subSections'>>
): HierarchicalProjectSection[] {
    return sections.map(section => {
        if (section.id === id) {
            return { ...section, ...updates };
        }
        if (section.subSections) {
            // Recursively update sub-sections
            const updatedSubSections = updateSectionById(section.subSections, id, updates);
            // Only create a new object if sub-sections actually changed
            if (updatedSubSections !== section.subSections) {
                return { ...section, subSections: updatedSubSections };
            }
        }
        return section; // Return unchanged section if ID doesn't match and no sub-sections changed
    });
}

/**
 * Deletes a section (or sub-section) by its ID. Returns a new array without the deleted section.
 * @param sections The original array of top-level sections.
 * @param id The ID of the section to delete.
 * @returns A new array of sections with the specified section removed.
 */
export function deleteSectionById(sections: HierarchicalProjectSection[], id: string): HierarchicalProjectSection[] {
    return sections.reduce((acc, section) => {
        if (section.id === id) {
            return acc; // Skip adding the section to delete
        }
        if (section.subSections) {
            // Recursively delete from sub-sections
            const updatedSubSections = deleteSectionById(section.subSections, id);
            // Add the section back with potentially updated sub-sections
            acc.push({ ...section, subSections: updatedSubSections });
        } else {
            // Add the section back if it doesn't match the ID and has no sub-sections
            acc.push(section);
        }
        return acc;
    }, [] as HierarchicalProjectSection[]); // Initialize accumulator as an empty array
}
