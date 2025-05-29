
// src/lib/project-utils.ts
import type { Project, HierarchicalProjectSection, OutlineSection } from '@/types/project';
import type React from 'react';
import { v4 as uuidv4 } from 'uuid'; // Import uuid

// Recursive function to find a section by ID
export function findSectionById(sections: HierarchicalProjectSection[], id: string): HierarchicalProjectSection | null {
    for (const section of sections) {
        if (section.id === id) {
            return section;
        }
        if (section.subSections) {
            const foundInChildren = findSectionById(section.subSections, id);
            if (foundInChildren) {
                return foundInChildren;
            }
        }
    }
    return null;
}

// Recursive function to update a section by ID
export function updateSectionById(
    sections: HierarchicalProjectSection[],
    id: string,
    updates: Partial<Omit<HierarchicalProjectSection, 'id' | 'subSections'>>
): HierarchicalProjectSection[] {
    return sections.map(section => {
        if (section.id === id) {
            return { ...section, ...updates, updatedAt: new Date().toISOString() }; // Also update updatedAt timestamp
        }
        if (section.subSections) {
            const updatedSubSections = updateSectionById(section.subSections, id, updates);
            // Check if subSections array reference changed to avoid unnecessary re-renders
            if (updatedSubSections !== section.subSections) {
                return { ...section, subSections: updatedSubSections, updatedAt: new Date().toISOString() };
            }
        }
        return section;
    });
}

// Helper function to generate numbering for sections
export const getSectionNumbering = (sections: HierarchicalProjectSection[], targetId: string, parentNumbering: string = ''): string => {
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const currentNumbering = parentNumbering ? `${parentNumbering}.${i + 1}` : `${i + 1}`;
        if (section.id === targetId) {
            return currentNumbering;
        }
        if (section.subSections && section.subSections.length > 0) {
            const foundNumbering = getSectionNumbering(section.subSections, targetId, currentNumbering);
            if (foundNumbering) {
                return foundNumbering;
            }
        }
    }
    return '';
};


// Function to ensure a section has a default sub-section if it's meant to hold content but has no explicit sub-sections
// This function is now less relevant as the AI prompt is designed to create rich sub-sections.
// It might still be useful if a user manually adds a section that should have content.
export function ensureDefaultSubSection(section: HierarchicalProjectSection, baseNumbering: string): HierarchicalProjectSection {
    const isSpecializedItem =
        section.name.toLowerCase().startsWith("diagram:") ||
        section.name.toLowerCase().startsWith("figure:") ||
        section.name.toLowerCase().startsWith("table:") ||
        section.name.toLowerCase().startsWith("flowchart:");

    // If it's not a specialized item and has no subSections, add a default "Overview" child.
    if (!isSpecializedItem && (!section.subSections || section.subSections.length === 0)) {
        const defaultSubSectionName = `${baseNumbering}.1 Overview`;
        return {
            ...section,
            subSections: [
                {
                    id: uuidv4(),
                    name: defaultSubSectionName,
                    prompt: `Generate an overview or main content for the "${section.name}" section, specifically focusing on what would be covered in "${defaultSubSectionName}".`,
                    content: '',
                    subSections: [], // Default sub-sections are leaves
                    lastGenerated: undefined,
                },
            ],
        };
    }
    return section;
}


// Recursive function to add a subsection under a specific parent ID
export function addSubSectionById(
    sections: HierarchicalProjectSection[],
    parentId: string,
    newSubSectionData: Omit<HierarchicalProjectSection, 'subSections' | 'id'>,
    parentNumbering: string = '' // Pass parent numbering for default sub-section naming
): HierarchicalProjectSection[] {
    return sections.map((section, index) => {
        const currentNumbering = parentNumbering ? `${parentNumbering}.${index + 1}` : `${index + 1}`;
        if (section.id === parentId) {
            const newSubSectionId = uuidv4();
            let subSectionToAdd: HierarchicalProjectSection = {
                ...newSubSectionData,
                id: newSubSectionId,
                subSections: [], // New sub-items start with no children of their own
                prompt: newSubSectionData.prompt || `Generate content for ${newSubSectionData.name} as part of ${section.name}.`,
            };

            // No longer call ensureDefaultSubSection here when adding.
            // The user/AI will decide if this new item needs further children.

            return {
                ...section,
                subSections: [...(section.subSections || []), subSectionToAdd],
            };
        }
        if (section.subSections) {
            const updatedSubSections = addSubSectionById(section.subSections, parentId, newSubSectionData, currentNumbering);
            if (updatedSubSections !== section.subSections) {
                return { ...section, subSections: updatedSubSections };
            }
        }
        return section;
    });
}


// Recursive function to delete a section by ID
export function deleteSectionById(sections: HierarchicalProjectSection[], id: string): HierarchicalProjectSection[] {
    return sections.reduce((acc, section) => {
        if (section.id === id) {
            return acc; // Skip this section
        }
        if (section.subSections) {
            const updatedSubSections = deleteSectionById(section.subSections, id);
            // Only push if subSections changed or it wasn't empty before and now is (edge case)
            if (updatedSubSections !== section.subSections || (section.subSections.length > 0 && updatedSubSections.length === 0)) {
                 acc.push({ ...section, subSections: updatedSubSections });
            } else if (updatedSubSections.length > 0 || section.subSections.length === 0 ) { // if no subsections or subsections still exist
                 acc.push({ ...section, subSections: updatedSubSections });
            } else {
                 acc.push(section); // No change in subsections, push original
            }
        } else {
            acc.push(section);
        }
        return acc;
    }, [] as HierarchicalProjectSection[]);
}

// Function to parse text-based outline into OutlineSection[]
export function parseTextToOutlineStructure(text: string): OutlineSection[] | null {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const result: OutlineSection[] = [];
    const stack: { level: number; section: OutlineSection }[] = [];

    // Determine indentation type and size from the first indented line
    let indentSize = 2; // Default to 2 spaces
    let indentType: 'space' | 'tab' | null = null;

    for (const line of lines) {
        const firstChar = line[0];
        if (firstChar === ' ') {
            indentType = 'space';
            let count = 0;
            while (line[count] === ' ') count++;
            if (count > 0) indentSize = count; // Assume first indent sets the size
            break;
        } else if (firstChar === '\t') {
            indentType = 'tab';
            indentSize = 1; // Tabs are typically 1 unit of indentation
            break;
        }
    }
     if (indentType === null && lines.length > 1 && (lines[1].startsWith(' ') || lines[1].startsWith('\t'))) {
        // If first line has no indent but second does, re-check from second
        const firstCharSecond = lines[1][0];
         if (firstCharSecond === ' ') {
            indentType = 'space';
            let count = 0;
            while (lines[1][count] === ' ') count++;
            if (count > 0) indentSize = count;
        } else if (firstCharSecond === '\t') {
            indentType = 'tab';
            indentSize = 1;
        }
    }


    const getIndentationLevel = (line: string): number => {
        if (indentType === 'space') {
            const match = line.match(/^(\s*)/);
            return match ? Math.floor(match[0].length / indentSize) : 0;
        } else if (indentType === 'tab') {
            const match = line.match(/^(\t*)/);
            return match ? match[0].length : 0;
        }
        return 0; // No indentation or mixed
    };

    for (const line of lines) {
        const level = getIndentationLevel(line);
        const name = line.trim().replace(/^(- |\* |\d+\.?\s*)/, '').trim(); // Clean list markers and numbers

        if (!name) continue; // Skip empty lines after trimming markers

        const newSection: OutlineSection = { name }; // Initialize subSections as undefined

        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
            stack.pop();
        }

        if (stack.length === 0) {
            result.push(newSection);
        } else {
            const parent = stack[stack.length - 1].section;
            if (!parent.subSections) { 
                parent.subSections = []; // Initialize if it's the first child
            }
            parent.subSections.push(newSection);
        }
        stack.push({ level, section: newSection });
    }
    
    // Clean up empty subSections arrays to match AI flow expectation (omit key if empty)
    // This also ensures consistency: if subSections has items, it's an array; otherwise, the key is omitted.
    const cleanEmptySubSections = (sections: OutlineSection[]): void => {
        for (const section of sections) {
            if (section.subSections) {
                if (section.subSections.length === 0) {
                    delete section.subSections;
                } else {
                    cleanEmptySubSections(section.subSections);
                }
            }
        }
    };
    cleanEmptySubSections(result);
    return result.length > 0 ? result : null;
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


/**
 * Centralized function to update project state, handle local storage, and manage history.
 */
export const updateProject = (
    updatedData: Partial<Project> | ((prev: Project) => Project),
    saveToHistory: boolean,
    projectId: string,
    currentProjectState: Project | undefined,
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>,
    setHistory: React.Dispatch<React.SetStateAction<Project[]>>,
    setHistoryIndex: React.Dispatch<React.SetStateAction<number>>,
    isUpdatingHistory: React.MutableRefObject<boolean>,
    historyIndex: number,
    maxHistoryLength: number
) => {
    if (!currentProjectState && typeof updatedData !== 'function') {
        console.error("Cannot update project: Current project state is undefined and update is not a function.");
        return;
    }

    isUpdatingHistory.current = true;

    setProjects((prevProjects = []) => {
        const currentProjectsArray = Array.isArray(prevProjects) ? prevProjects : [];
        const currentProjectIndex = currentProjectsArray.findIndex(p => p.id === projectId);

        let projectToUpdate: Project | undefined;
        if (currentProjectIndex !== -1) {
            projectToUpdate = currentProjectsArray[currentProjectIndex];
        } else if (currentProjectState) {
            // This case might occur if history is ahead of the main 'projects' list
            projectToUpdate = currentProjectState;
        }


        if (!projectToUpdate) {
            console.error("Project not found in setProjects during update");
            requestAnimationFrame(() => { isUpdatingHistory.current = false; });
            return currentProjectsArray;
        }
        
        const newProjectData = typeof updatedData === 'function'
            ? updatedData(projectToUpdate)
            : { ...projectToUpdate, ...updatedData };

        // Always set a new updatedAt timestamp for any meaningful change
        const newProjectState = { ...newProjectData, updatedAt: new Date().toISOString() };


        if (saveToHistory) {
            setHistory(prevHistory => {
                const newHistorySlice = prevHistory.slice(0, historyIndex + 1);
                if (newHistorySlice.length === 0 || JSON.stringify(newHistorySlice[newHistorySlice.length - 1]) !== JSON.stringify(newProjectState)) {
                    const updatedHistory = [...newHistorySlice, newProjectState];
                    const finalHistory = updatedHistory.length > maxHistoryLength ? updatedHistory.slice(-maxHistoryLength) : updatedHistory;
                    setHistoryIndex(finalHistory.length - 1);
                    return finalHistory;
                }
                // If the new state is identical to the current history top, don't add a duplicate
                setHistoryIndex(newHistorySlice.length - 1); 
                return newHistorySlice;
            });
        } else {
            // If not saving to history (e.g., intermediate typing), update the current history state
            setHistory(prevHistory => {
                const newHistory = [...prevHistory];
                if (historyIndex >= 0 && historyIndex < newHistory.length) {
                     // Only update if different to avoid re-renders
                    if (JSON.stringify(newHistory[historyIndex]) !== JSON.stringify(newProjectState)) {
                        newHistory[historyIndex] = newProjectState;
                    }
                } else if (newHistory.length === 0) { // Handle empty history
                    newHistory.push(newProjectState);
                    setHistoryIndex(0);
                }
                return newHistory;
            });
        }

        const updatedProjectsArray = [...currentProjectsArray];
        if (currentProjectIndex !== -1) {
             // Only update if different to avoid re-renders
            if (JSON.stringify(updatedProjectsArray[currentProjectIndex]) !== JSON.stringify(newProjectState)) {
                 updatedProjectsArray[currentProjectIndex] = newProjectState;
                return updatedProjectsArray;
            }
        } else if (currentProjectState && saveToHistory) { // Project might not be in 'projects' if coming from history
             if (!updatedProjectsArray.some(p => p.id === projectId)) { // Add if not present
                updatedProjectsArray.push(newProjectState);
                return updatedProjectsArray;
             }
        }
        return currentProjectsArray; 
    });

    requestAnimationFrame(() => { isUpdatingHistory.current = false; });
};

      
