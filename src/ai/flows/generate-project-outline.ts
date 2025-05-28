
// src/ai/flows/generate-project-outline.ts
'use server';
/**
 * @fileOverview AI agent to generate a hierarchical project report outline.
 *
 * - generateProjectOutline - Generates a list of suggested section names and sub-sections based on project context.
 * - GenerateProjectOutlineInput - Input type for the generation flow.
 * - GenerateProjectOutlineOutput - Output type for the generation flow (hierarchical).
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { HierarchicalProjectSection } from '@/types/project'; // For the toast type

// Recursive schema for sections and sub-sections allowing deeper nesting
const OutlineSectionSchema: z.ZodType<any> = z.lazy(() =>
    z.object({
        name: z.string().describe('The full name of the section or sub-section (e.g., "1.1 Background", "1.1.1 Diagram: System Architecture"). Should be descriptive. For diagrams, figures, or tables, use prefixes like "Diagram: ", "Figure X: ", or "Table: ". Increment X/Y for each figure/table type independently throughout the entire outline.'),
        subSections: z.array(OutlineSectionSchema).optional().describe('An optional array of sub-sections or items (like diagrams/figures/tables) nested under this section. Allows for multiple levels (e.g., section -> sub-section -> diagram). COMPLETELY OMIT this key if there are no sub-items.'),
    }).describe('A single section or sub-section in the report outline. Sections should be logically ordered.')
);

const GenerateProjectOutlineInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  projectContext: z.string().describe('A detailed description of the project, its goals, scope, target audience, key features, technologies used, and methodology (if known). More context leads to better outlines.'),
  minSections: z.number().optional().default(5).describe('The minimum number of TOP-LEVEL sections the AI should aim to generate (default 5). This does not count sub-sections or deeply nested items.'),
  maxSubSectionsPerSection: z.number().optional().default(2).describe('The maximum TOTAL DEPTH of sub-section/item nesting the AI should generate (default 2). For example, 0 means no sub-sections (e.g., "1. Intro"). 1 means one level of sub-sections (e.g., "1. Intro" -> "1.1 Background"). 2 means two levels (e.g., "1. Intro" -> "1.1 Background" -> "1.1.1 Diagram: Flow"). Items at the max depth cannot have further subSections.'),
});
export type GenerateProjectOutlineInput = z.infer<typeof GenerateProjectOutlineInputSchema>;

const GenerateProjectOutlineOutputSchema = z.object({
  sections: z.array(OutlineSectionSchema).describe('An ordered, hierarchical list of suggested sections and sub-sections for the report. May include items for diagrams/figures/tables (e.g., "Figure 1: Flowchart", "Table 1: Results") nested appropriately.'),
});
export type GenerateProjectOutlineOutput = z.infer<typeof GenerateProjectOutlineOutputSchema>;

// Basic validation function for the outline structure
const validateOutlineStructure = (sections: any[] | undefined, currentDepth = 0, maxDepth = 2): sections is OutlineSection[] => {
    if (!Array.isArray(sections)) {
        console.warn(`Outline Validation Failed (Depth ${currentDepth}): Root 'sections' is not an array.`);
        return false;
    }
    if (sections.length === 0 && currentDepth === 0) {
        console.warn(`Outline Validation Failed: Root 'sections' array is empty.`);
        return false;
    }
    return sections.every((section, index) => {
        if (typeof section !== 'object' || !section || typeof section.name !== 'string' || !section.name.trim()) {
            console.warn(`Outline Validation Failed (Depth ${currentDepth}): Section at index ${index} is invalid (missing name or not an object):`, JSON.stringify(section));
            return false;
        }
        if (currentDepth >= maxDepth) { // Changed to >= for clarity: items AT maxDepth cannot have subSections.
            if (section.subSections && Array.isArray(section.subSections) && section.subSections.length > 0) {
                console.warn(`Outline Validation Failed (Depth ${currentDepth}): Section "${section.name}" at max depth ${maxDepth} has subSections.`);
                return false;
            }
        }
        if (section.hasOwnProperty('subSections')) {
            if (!Array.isArray(section.subSections)) {
                console.warn(`Outline Validation Failed (Depth ${currentDepth}): subSections for "${section.name}" exists but is not an array:`, section.subSections);
                return false;
            }
            if (section.subSections.length > 0) {
                if (currentDepth + 1 > maxDepth) { // This item's children would exceed max depth
                     console.warn(`Outline Validation Failed (Depth ${currentDepth}): Section "${section.name}" has subSections that would exceed max depth ${maxDepth}. Children count: ${section.subSections.length}`);
                     return false;
                }
                if (!validateOutlineStructure(section.subSections, currentDepth + 1, maxDepth)) {
                    console.warn(`Outline Validation Failed: Invalid structure within subSections of "${section.name}" (Depth ${currentDepth}).`);
                    return false;
                }
            }
        }
        return true;
    });
};


export async function generateProjectOutline(input: GenerateProjectOutlineInput): Promise<GenerateProjectOutlineOutput> {
  if (!input.projectContext || input.projectContext.trim().length < 30) {
      console.warn("Project context is very short for outline generation. AI results may be suboptimal.");
  }
  // Ensure defaults are applied if optional fields are missing
  const inputWithDefaults = GenerateProjectOutlineInputSchema.parse(input);
  return generateProjectOutlineFlow(inputWithDefaults);
}

const prompt = ai.definePrompt({
  name: 'generateProjectOutlinePrompt',
  input: {
    schema: GenerateProjectOutlineInputSchema,
  },
  output: {
    schema: GenerateProjectOutlineOutputSchema,
  },
  prompt: `You are an AI expert specializing in structuring academic and technical project reports. Your task is to generate a **thorough, detailed, and deeply hierarchical** list of section names suitable for a comprehensive project report. The quality of this outline is critical for the user.

  **Project Title:** {{{projectTitle}}}
  **Project Context:** {{{projectContext}}}

  **CRITICAL Generation Constraints & Instructions:**
  1.  **Hierarchical Structure is PARAMOUNT:**
      *   Generate at least **{{minSections}}** TOP-LEVEL sections (e.g., "1. Introduction", "2. Literature Review"). These should cover all essential parts of a typical academic/technical report.
      *   **Crucial: Almost ALL top-level sections MUST be broken down into multiple (2-4) logical sub-sections.** Do not just provide one sub-section for a major topic. For example, "Introduction" should have sub-sections like "1.1 Background and Motivation", "1.2 Problem Statement", "1.3 Project Goals and Objectives", "1.4 Scope and Limitations". Similarly for "Methodology", "System Design", "Implementation", "Results", "Discussion", etc. A flat list of main sections, or main sections with only a single sub-item, is NOT acceptable.
      *   **Deep Nesting for Items:** Sub-sections themselves can, and often should, contain further nested items like diagrams, figures, or tables if relevant to the content. These items are children of their respective sub-sections and contribute to the depth.
  2.  **Maximum Nesting Depth:** The absolute maximum nesting depth for any item (section, sub-section, diagram, figure, table) is **{{maxSubSectionsPerSection}}** levels.
      *   An item at depth 0 is a top-level section.
      *   An item at depth 1 is a sub-section of a top-level section.
      *   An item at depth 2 is a sub-sub-item (e.g., a diagram within a sub-section, or a sub-sub-section of content).
      *   An item at the \`maxSubSectionsPerSection\` depth (e.g., depth 2 if max is 2) **MUST NOT** have its own "subSections" key or array.
  3.  **Prefixes for Specialized Items:** When suggesting diagrams, figures, or tables, **YOU MUST** use the following prefixes in their "name" field:
      *   "Diagram: [Descriptive Name]" (e.g., "Diagram: User Login Flow")
      *   "Figure X: [Descriptive Name]" (e.g., "Figure 1: System Architecture") - Increment X for each figure throughout the *entire* outline, starting from 1.
      *   "Table Y: [Descriptive Name]" (e.g., "Table 1: Comparison of Algorithms") - Increment Y for each table throughout the *entire* outline, starting from 1.
  4.  **Numbering:** Include hierarchical numbering in all section and sub-item names (e.g., "1.", "1.1", "1.1.1 Figure 1: Architecture", "3.2.1 Table 1: Component APIs").
  5.  **OMIT EMPTY 'subSections' KEY:** If a section or any sub-item has NO children, COMPLETELY OMIT the "subSections" key for that object in the JSON. Do NOT include \`"subSections": []\`.
  6.  **Context-Driven Content:** Tailor all sections, sub-sections, and item placements *specifically* to the project described in the provided context. Be thorough and imaginative.
  7.  **Standard Sections (Detailed Breakdown EXPECTED):** Include essential academic/technical report sections (e.g., Introduction, Literature Review, Methodology, System Design/Architecture, Implementation, Results, Discussion, Conclusion, References, Appendix if applicable). **Each of these major sections MUST be broken down into relevant, detailed sub-sections and potentially nested items as appropriate for the project context.**
  8.  **JSON Output ONLY:** The output MUST be a single, valid JSON object matching the 'GenerateProjectOutlineOutputSchema'. No extra text, explanations, apologies, or markdown formatting outside the JSON structure.

  **Example of Desired JSON Output Structure (for \`maxSubSectionsPerSection = 2\` and demonstrating rich sub-sections and nested items):**
  \`\`\`json
  {
    "sections": [
      {
        "name": "1. Introduction",
        "subSections": [
          {
            "name": "1.1 Background and Motivation",
            "subSections": [
              { "name": "1.1.1 Diagram: Conceptual Model of the Problem Space" }
            ]
          },
          { "name": "1.2 Problem Statement" },
          { "name": "1.3 Project Goals and Objectives" },
          { "name": "1.4 Scope and Limitations" }
        ]
      },
      {
        "name": "2. Literature Review",
        "subSections": [
          { "name": "2.1 Review of Existing Similar Systems" },
          { "name": "2.2 Analysis of Relevant Technologies and Frameworks" },
          { "name": "2.3 Identification of Research Gaps" }
        ]
      },
      {
        "name": "3. System Design and Architecture",
        "subSections": [
          { "name": "3.1 Overall System Architecture" ,
            "subSections": [
                { "name": "3.1.1 Figure 1: High-Level Architectural Diagram" }
            ]
          },
          {
            "name": "3.2 Component Design",
            "subSections": [
              { "name": "3.2.1 Module A Design" },
              { "name": "3.2.2 Module B Design" },
              { "name": "3.2.3 Table 1: Component Interface Specifications" }
            ]
          },
          { "name": "3.3 Database Design (if applicable)",
            "subSections": [
                { "name": "3.3.1 Diagram: Entity-Relationship Diagram (ERD)" }
            ]
          }
        ]
      },
      {
        "name": "4. Implementation",
         "subSections": [
            { "name": "4.1 Technology Stack Used" },
            { "name": "4.2 Development Environment Setup" },
            { "name": "4.3 Implementation of Key Modules",
              "subSections": [
                { "name": "4.3.1 Figure 2: Screenshot of Core Feature X" }
              ]
            },
            { "name": "4.4 Challenges Encountered and Solutions" }
         ]
      },
      {
        "name": "5. Results and Discussion",
        "subSections": [
            { "name": "5.1 Presentation of Results" ,
              "subSections": [
                { "name": "5.1.1 Table 2: Performance Metrics" },
                { "name": "5.1.2 Figure 3: Graph of Results Y" }
              ]
            },
            { "name": "5.2 Analysis of Results" },
            { "name": "5.3 Comparison with Objectives" }
        ]
      },
      {
        "name": "6. Conclusion and Future Work",
        "subSections": [
            { "name": "6.1 Summary of Achievements" },
            { "name": "6.2 Future Enhancements and Scope" }
        ]
      },
      { "name": "7. References" },
      { "name": "8. Appendix (Optional)" }
    ]
  }
  \`\`\`

  Generate the detailed, hierarchical JSON outline now, strictly adhering to ALL constraints and instructions. Ensure VIRTUALLY ALL top-level sections have multiple, meaningful sub-sections and that relevant diagrams/figures/tables are nested appropriately. Be comprehensive.
  `,
});

const generateProjectOutlineFlow = ai.defineFlow<
  typeof GenerateProjectOutlineInputSchema,
  typeof GenerateProjectOutlineOutputSchema
>({
  name: 'generateProjectOutlineFlow',
  inputSchema: GenerateProjectOutlineInputSchema,
  outputSchema: GenerateProjectOutlineOutputSchema,
},
async (input) => {
    let output: GenerateProjectOutlineOutput | undefined;
    const fallbackOutline: GenerateProjectOutlineOutput = { sections: [
        { name: "1. Introduction", subSections: [ { name: "1.1 Background" }, { name: "1.1.1 Diagram: Basic Flow" } ]},
        { name: "2. Methodology", subSections: [ { name: "2.1 Research Approach" }, { name: "2.1.1 Table 1: Methods Comparison"} ] }, 
        { name: "3. Implementation Details", subSections: [ { name: "3.1 Core Modules" }, { name: "3.1.1 Figure 1: Module Interaction" } ] }, 
        { name: "4. Results & Discussion", subSections: [ {name: "4.1 Key Findings"}, {name: "4.1.1 Figure 2: Results Graph"}] },
        { name: "5. Conclusion & Future Work" }, 
        { name: "6. References" }
    ]};

    try {
        console.log("Calling AI for outline with validated input:", input);
        const result = await prompt(input);
        output = result.output;
        console.log("Raw AI output for outline:", JSON.stringify(output, null, 2));

        if (!output || !output.sections || !Array.isArray(output.sections) || output.sections.length === 0) {
            console.warn("AI outline generation returned empty or invalid 'sections' array. Output:", output);
            toast({ variant: "destructive", title: "Outline Generation Failed", description: "AI returned no sections. Using fallback." });
            return fallbackOutline;
        }
        
        if (!validateOutlineStructure(output.sections, 0, input.maxSubSectionsPerSection ?? 2)) {
            console.warn("AI outline validation failed against max depth or structure rules. Output:", JSON.stringify(output, null, 2));
             try {
                 const parsed = GenerateProjectOutlineOutputSchema.parse(output); 
                 console.log("Defensive Zod parsing successful despite custom validation warning. Parsed output will be used if structure is now valid.");
                 if (!validateOutlineStructure(parsed.sections, 0, input.maxSubSectionsPerSection ?? 2)) {
                     console.error("Zod parsing ok, but structure STILL invalid for depth/rules. Using fallback.");
                     toast({ variant: "destructive", title: "Outline Structure Invalid", description: `Generated outline violates depth limits (${input.maxSubSectionsPerSection ?? 2}) or has invalid item structure. Using fallback.` });
                     return fallbackOutline;
                 }
                 console.log("Structure validated successfully after defensive Zod parsing.");
                 // Qualitative check for flatness
                 const topLevelSectionsWithSubSections = parsed.sections.filter(s => s.subSections && s.subSections.length > 0).length;
                 if (parsed.sections.length > 2 && topLevelSectionsWithSubSections < Math.min(3, parsed.sections.length -1) ) { // Stricter heuristic for flatness
                    console.warn(`AI outline is structurally valid but appears too flat. Top-level sections: ${parsed.sections.length}, With sub-sections: ${topLevelSectionsWithSubSections}. Consider re-generating or refining context.`);
                    toast({ variant: "default", title: "Outline May Lack Detail", description: "The generated outline is valid but might lack depth in some areas. Review carefully or try regenerating.", duration: 7000});
                 }
                 return parsed;
             } catch (parseError) {
                 console.error("Defensive Zod parsing failed after custom validation warning:", parseError);
                 toast({ variant: "destructive", title: "Outline Parsing Failed", description: "Generated outline has an invalid format. Using fallback." });
                 return fallbackOutline;
             }
        }

        console.log("AI outline generation successful and validated.");
        const topLevelSectionsWithSubSections = output.sections.filter(s => s.subSections && s.subSections.length > 0).length;
        if (output.sections.length > 2 && topLevelSectionsWithSubSections < Math.min(3, output.sections.length -1 )) { // Stricter heuristic
            console.warn(`AI outline is structurally valid but appears too flat. Top-level sections: ${output.sections.length}, With sub-sections: ${topLevelSectionsWithSubSections}. Consider re-generating or refining context.`);
            toast({ variant: "default", title: "Outline May Lack Detail", description: "The generated outline is valid but may lack depth in some areas. Review carefully or try regenerating.", duration: 7000});
        }
        return output;

    } catch (error) {
        console.error("Error calling AI for project outline generation:", error);
         const errorMessage = error instanceof Error ? error.message : "Unknown AI error";
         if (errorMessage.includes("invalid argument") || errorMessage.includes("content safety") || errorMessage.includes("400 Bad Request")) {
             console.warn(`AI generation failed due to model error (${errorMessage}). Returning fallback.`);
             toast({ variant: "destructive", title: "AI Generation Error", description: `AI service failed: ${errorMessage.substring(0,100)}. Using fallback.` });
         } else {
             console.warn("Unknown error during AI call. Returning fallback.", error);
             toast({ variant: "destructive", title: "Outline Error", description: "An unknown error occurred during outline generation. Using fallback." });
         }
         return fallbackOutline;
    }
});

// Helper function to use toast (placeholder)
const toast = (options: {variant?: "default" | "destructive", title: string, description: string, duration?: number}) => {
    console.log(`Toast (${options.variant || 'default'}): ${options.title} - ${options.description}`);
};

// Type definition for hierarchical structure used internally by the validation function
// Must match the Zod schema structure
interface OutlineSection {
    name: string;
    subSections?: OutlineSection[];
}

    
