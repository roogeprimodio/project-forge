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

// Recursive schema for sections and sub-sections allowing deeper nesting
const OutlineSectionSchema: z.ZodType<any> = z.lazy(() =>
    z.object({
        name: z.string().describe('The full name of the section or sub-section (e.g., "1.1 Background", "1.1.1 Diagram: System Architecture"). Should be descriptive. For diagrams, figures, or tables, use prefixes like "Diagram: ", "Figure X: ", or "Table: ".'),
        subSections: z.array(OutlineSectionSchema).optional().describe('An optional array of sub-sections or items (like diagrams/figures/tables) nested under this section. Allows for multiple levels (e.g., section -> sub-section -> diagram). OMIT this key if there are no sub-items.'),
    }).describe('A single section or sub-section in the report outline. Sections should be logically ordered.')
);

const GenerateProjectOutlineInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  projectContext: z.string().describe('A detailed description of the project, its goals, scope, target audience, key features, technologies used, and methodology (if known). More context leads to better outlines.'),
  minSections: z.number().optional().default(5).describe('The minimum number of TOP-LEVEL sections the AI should aim to generate (default 5). This does not count sub-sections or deeply nested items.'),
  maxSubSectionsPerSection: z.number().optional().default(2).describe('The maximum TOTAL DEPTH of sub-section/item nesting the AI should generate (default 2). For example, 0 means no sub-sections (e.g., "1. Intro"). 1 means one level of sub-sections (e.g., "1. Intro" -> "1.1 Background"). 2 means two levels (e.g., "1. Intro" -> "1.1 Background" -> "1.1.1 Diagram: Flow").'),
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
    return sections.every((section, index) => {
        if (typeof section !== 'object' || !section || typeof section.name !== 'string' || !section.name.trim()) {
            console.warn(`Outline Validation Failed (Depth ${currentDepth}): Section at index ${index} is invalid (missing name or not an object):`, section);
            return false;
        }
        if (currentDepth > maxDepth) {
            console.warn(`Outline Validation Failed (Depth ${currentDepth}): Section "${section.name}" exceeds maximum depth of ${maxDepth}.`);
            return false;
        }
        if (section.hasOwnProperty('subSections')) {
            if (!Array.isArray(section.subSections)) {
                console.warn(`Outline Validation Failed (Depth ${currentDepth}): subSections for "${section.name}" exists but is not an array:`, section.subSections);
                return false;
            }
            if (section.subSections.length > 0 && !validateOutlineStructure(section.subSections, currentDepth + 1, maxDepth)) {
                console.warn(`Outline Validation Failed: Invalid structure within subSections of "${section.name}" (Depth ${currentDepth}).`);
                return false;
            }
        }
        return true;
    });
};


export async function generateProjectOutline(input: GenerateProjectOutlineInput): Promise<GenerateProjectOutlineOutput> {
  if (!input.projectContext || input.projectContext.trim().length < 30) {
      console.warn("Project context is very short, AI outline generation might be suboptimal.");
  }
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
  prompt: `You are an AI expert specializing in structuring academic and technical project reports.

  **Task:** Generate a comprehensive and logically ordered **DEEPLY HIERARCHICAL** list of section names suitable for a project report.
  This MUST include relevant **sub-sections** nested under main sections.
  Crucially, these sub-sections can *themselves* contain further nested items like **diagrams, figures, or tables**.

  **Project Title:** {{{projectTitle}}}
  **Project Context:** {{{projectContext}}}
  **Generation Limits:**
  *   Aim for at least **{{minSections}}** TOP-LEVEL sections.
  *   The maximum TOTAL NESTING DEPTH for any item (section, sub-section, diagram, figure, table) is **{{maxSubSectionsPerSection}}** levels.
      *   Depth 0: "1. Introduction"
      *   Depth 1: "1.1 Background" (Sub-section of Introduction)
      *   Depth 2: "1.1.1 Diagram: System Flow" (Diagram under Background)
      *   Items at depth {{maxSubSectionsPerSection}} (e.g., a Diagram at depth 2 if maxSubSectionsPerSection is 2) MUST NOT have their own "subSections".

  **Output Format:**
  The output MUST be a single, valid JSON object matching the 'GenerateProjectOutlineOutputSchema'.
  Example for \`maxSubSectionsPerSection = 2\`:
  \`\`\`json
  {
    "sections": [
      {
        "name": "1. Introduction",
        "subSections": [
          {
            "name": "1.1 Background and Motivation",
            "subSections": [
              { "name": "1.1.1 Diagram: Conceptual Model" } // Max depth reached if maxSubSectionsPerSection = 2
            ]
          },
          { "name": "1.2 Problem Statement" },
          { "name": "1.3 Project Goals and Objectives" }
        ]
      },
      {
        "name": "2. Literature Review"
        // No "subSections" key here as it has no children in this example.
      },
      {
        "name": "3. System Design",
        "subSections": [
          { "name": "3.1 Architecture Overview" },
          { "name": "3.2 Figure 1: High-Level Architecture Diagram" },
          {
            "name": "3.3 Component Design",
            "subSections": [
              { "name": "3.3.1 Table: Component APIs" } // Max depth reached
            ]
          }
        ]
      },
      // ... more sections ...
    ]
  }
  \`\`\`

  **Critical Instructions:**
  1.  **JSON ONLY:** Output ONLY the JSON object. No extra text, explanations, or markdown formatting.
  2.  **DEEP HIERARCHY:** Prioritize creating a meaningful multi-level structure.
      *   Main sections should have sub-sections.
      *   Sub-sections can have their own nested items like diagrams, figures, or tables.
  3.  **PREFIXES FOR ITEMS:** For diagrams, figures, or tables, **YOU MUST** use prefixes in their "name" field:
      *   "Diagram: [Descriptive Name]" (e.g., "Diagram: User Login Flow")
      *   "Figure X: [Descriptive Name]" (e.g., "Figure 1: System Architecture") - Increment X for each figure.
      *   "Table Y: [Descriptive Name]" (e.g., "Table 1: Comparison of Algorithms") - Increment Y for each table.
  4.  **OMIT EMPTY 'subSections':** If a section or item has NO children, COMPLETELY OMIT the "subSections" key for that object. Do NOT include \`"subSections": []\`.
  5.  **ADHERE TO MAX DEPTH:** Strictly follow the \`{{maxSubSectionsPerSection}}\` limit. Items at the maximum depth must not have a "subSections" key.
  6.  **NUMBERING:** Include hierarchical numbering in the section names (e.g., "1.", "1.1", "1.1.1").
  7.  **CONTEXT-DRIVEN:** Tailor all sections, sub-sections, and item placements *specifically* to the project described.
  8.  **STANDARD SECTIONS:** Include essential report sections (Introduction, Methodology, Results, Conclusion, etc.) and structure them with relevant sub-sections and items.

  Generate the detailed, hierarchical JSON output now.
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
async input => {
    let output: GenerateProjectOutlineOutput | undefined;
    const fallbackOutline: GenerateProjectOutlineOutput = { sections: [
        { name: "1. Introduction", subSections: [
            { name: "1.1 Background" },
            { name: "1.1.1 Diagram: Basic Flow" }
        ]},
        { name: "2. Methodology" },
        { name: "3. Implementation Details" },
        { name: "4. Results & Discussion" },
        { name: "5. Conclusion & Future Work" },
        { name: "References" }
    ]};

    try {
        console.log("Calling AI for outline with input:", input);
        const result = await prompt(input);
        output = result.output;
        console.log("Raw AI output for outline:", JSON.stringify(output));

        if (!output || !validateOutlineStructure(output.sections, 0, input.maxSubSectionsPerSection)) {
            console.warn("AI outline validation failed. Output:", JSON.stringify(output));
             try {
                 const parsed = GenerateProjectOutlineOutputSchema.parse(output);
                 console.log("Defensive parsing successful despite validation warning. Parsed:", parsed);
                 if (!validateOutlineStructure(parsed.sections, 0, input.maxSubSectionsPerSection)) {
                     console.error("Defensive parsing ok, but structure STILL invalid after Zod parse. Using fallback.");
                     return fallbackOutline;
                 }
                 console.log("Structure validated successfully after defensive parsing.");
                 return parsed;
             } catch (parseError) {
                 console.error("Defensive parsing failed after validation warning:", parseError);
                 return fallbackOutline;
             }
        }

        console.log("AI outline generation successful and validated.");
        return output;

    } catch (error) {
        console.error("Error calling AI for project outline generation:", error);
         if (error instanceof Error && (error.message.includes("invalid argument") || error.message.includes("content safety") || error.message.includes("400 Bad Request"))) {
             console.warn(`AI generation failed (${error.message}). Returning fallback.`);
             return fallbackOutline;
         }
         console.warn("Unknown error during AI call. Returning fallback.");
         return fallbackOutline;
    }
});

// Type definition for hierarchical structure used internally by the validation function
// Re-declare here if not imported, to avoid circular dependencies if types.ts imports this.
interface OutlineSection {
    name: string;
    subSections?: OutlineSection[];
}
