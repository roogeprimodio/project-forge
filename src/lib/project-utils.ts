// src/lib/project-utils.ts
import type { Project, HierarchicalProjectSection } from '@/types/project';
import type React from 'react';

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
            return { ...section, ...updates };
        }
        if (section.subSections) {
            const updatedSubSections = updateSectionById(section.subSections, id, updates);
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
            acc.push({ ...section, subSections: updatedSubSections });
        } else {
            acc.push(section);
        }
        return acc;
    }, [] as HierarchicalProjectSection[]);
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
  // TOC is implicitly handled by the hierarchical section structure now for generated sections
  // but we keep the constant for identifying the standard page if needed.
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
    currentProjectState: Project | undefined, // Pass the current project state derived from history or local storage
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>, // Setter from useLocalStorage
    setHistory: React.Dispatch<React.SetStateAction<Project[]>>, // History state setter
    setHistoryIndex: React.Dispatch<React.SetStateAction<number>>, // History index setter
    isUpdatingHistory: React.MutableRefObject<boolean>, // Ref to prevent loops
    historyIndex: number, // Current history index
    maxHistoryLength: number // Max history length constant
) => {
    if (!currentProjectState && typeof updatedData !== 'function') {
        console.error("Cannot update project: Current project state is undefined and update is not a function.");
        return; // Exit if project doesn't exist and not using function update
    }

    isUpdatingHistory.current = true; // Prevent feedback loop with history effect

    // Use setProjects which updates local storage via useLocalStorage hook
    setProjects((prevProjects = []) => {
        const currentProjectsArray = Array.isArray(prevProjects) ? prevProjects : [];
        const currentProjectIndex = currentProjectsArray.findIndex(p => p.id === projectId);

        let projectToUpdate: Project | undefined;
        if (currentProjectIndex !== -1) {
            projectToUpdate = currentProjectsArray[currentProjectIndex];
        } else if (currentProjectState) { // If not found in local storage list, use the state from history/memo
            projectToUpdate = currentProjectState;
        }

        if (!projectToUpdate) {
            console.error("Project not found in setProjects during update");
            requestAnimationFrame(() => { isUpdatingHistory.current = false; });
            return currentProjectsArray; // Return unchanged list
        }

        // Apply the updates
        const updatedProject = typeof updatedData === 'function'
            ? updatedData(projectToUpdate)
            : { ...projectToUpdate, ...updatedData, updatedAt: new Date().toISOString() };

        // --- History Management ---
        if (saveToHistory) {
            setHistory(prevHistory => {
                const newHistory = prevHistory.slice(0, historyIndex + 1);
                if (newHistory.length === 0 || JSON.stringify(newHistory[newHistory.length - 1]) !== JSON.stringify(updatedProject)) {
                    newHistory.push(updatedProject);
                }
                if (newHistory.length > maxHistoryLength) {
                    newHistory.shift();
                }
                const newIndex = Math.min(newHistory.length - 1, maxHistoryLength - 1);
                setHistoryIndex(newIndex);
                return newHistory;
            });
        } else {
            // If not saving to history (e.g., during typing), update the current history state directly
            setHistory(prevHistory => {
                const newHistory = [...prevHistory];
                if (historyIndex >= 0 && historyIndex < newHistory.length) {
                     if (JSON.stringify(newHistory[historyIndex]) !== JSON.stringify(updatedProject)) {
                        newHistory[historyIndex] = updatedProject;
                     }
                }
                return newHistory;
            });
        }

        // --- Update Main Projects Array (for localStorage) ---
        const updatedProjects = [...currentProjectsArray];
        if (currentProjectIndex !== -1) {
            // Update existing project if found in the main list
            if (JSON.stringify(updatedProjects[currentProjectIndex]) !== JSON.stringify(updatedProject)) {
                updatedProjects[currentProjectIndex] = updatedProject;
                return updatedProjects;
            }
        } else if (currentProjectState && saveToHistory) {
            // If project wasn't in the main list (maybe loaded from history), add it back
             // Ensure not to add duplicates if it somehow exists but index was wrong
             if (!updatedProjects.some(p => p.id === projectId)) {
                updatedProjects.push(updatedProject);
                return updatedProjects;
             }
        }
        // Return the potentially updated or original array
        return updatedProjects;
    });

    // Reset the flag after the state update cycle
    requestAnimationFrame(() => { isUpdatingHistory.current = false; });
};
