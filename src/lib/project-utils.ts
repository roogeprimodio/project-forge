
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
// This is primarily for non-specialized (content) sections.
export function ensureDefaultSubSection(section: HierarchicalProjectSection, baseNumbering: string): HierarchicalProjectSection {
    const isSpecializedItem =
        section.name.toLowerCase().startsWith("diagram:") ||
        section.name.toLowerCase().startsWith("figure ") || 
        section.name.toLowerCase().startsWith("table:") ||
        section.name.toLowerCase().startsWith("flowchart ");

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
                    subSections: [], 
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
    parentNumbering: string = '' 
): HierarchicalProjectSection[] {
    return sections.map((section, index) => {
        const currentNumbering = parentNumbering ? `${parentNumbering}.${index + 1}` : `${index + 1}`;
        if (section.id === parentId) {
            const newSubSectionId = uuidv4();
            let subSectionToAdd: HierarchicalProjectSection = {
                ...newSubSectionData,
                id: newSubSectionId,
                subSections: [], 
                prompt: newSubSectionData.prompt || `Generate content for ${newSubSectionData.name} as part of ${section.name}.`,
            };
            
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
            return acc; 
        }
        if (section.subSections) {
            const updatedSubSections = deleteSectionById(section.subSections, id);
            if (updatedSubSections !== section.subSections || (section.subSections.length > 0 && updatedSubSections.length === 0)) {
                 acc.push({ ...section, subSections: updatedSubSections });
            } else if (updatedSubSections.length > 0 || section.subSections.length === 0 ) { 
                 acc.push({ ...section, subSections: updatedSubSections });
            } else {
                 acc.push(section); 
            }
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
];

export const STANDARD_PAGE_INDICES: { [key: string]: number } = {};
STANDARD_REPORT_PAGES.forEach((page, index) => {
  STANDARD_PAGE_INDICES[page] = -(index + 2); 
});
STANDARD_PAGE_INDICES[TOC_SECTION_NAME] = -100; 


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
                setHistoryIndex(newHistorySlice.length - 1); 
                return newHistorySlice;
            });
        } else {
            setHistory(prevHistory => {
                const newHistory = [...prevHistory];
                if (historyIndex >= 0 && historyIndex < newHistory.length) {
                    if (JSON.stringify(newHistory[historyIndex]) !== JSON.stringify(newProjectState)) {
                        newHistory[historyIndex] = newProjectState;
                    }
                } else if (newHistory.length === 0) { 
                    newHistory.push(newProjectState);
                    setHistoryIndex(0);
                }
                return newHistory;
            });
        }

        const updatedProjectsArray = [...currentProjectsArray];
        if (currentProjectIndex !== -1) {
            if (JSON.stringify(updatedProjectsArray[currentProjectIndex]) !== JSON.stringify(newProjectState)) {
                 updatedProjectsArray[currentProjectIndex] = newProjectState;
                return updatedProjectsArray;
            }
        } else if (currentProjectState && saveToHistory) { 
             if (!updatedProjectsArray.some(p => p.id === projectId)) {
                updatedProjectsArray.push(newProjectState);
                return updatedProjectsArray;
             }
        }
        return currentProjectsArray; 
    });

    requestAnimationFrame(() => { isUpdatingHistory.current = false; });
};


// REMOVED the JavaScript-based parseTextToOutlineStructure function
// as it's being replaced by an AI flow.
