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
        name: z.string().describe('The full name of the section or sub-section (e.g., "1.1 Background", "1.1.1 Diagram: System Architecture"). Should be descriptive. For diagrams, figures, or tables, use prefixes like "Diagram: ", "Figure X: ", or "Table: ". Increment X/Y for each figure/table type independently.'),
        subSections: z.array(OutlineSectionSchema).optional().describe('An optional array of sub-sections or items (like diagrams/figures/tables) nested under this section. Allows for multiple levels (e.g., section -> sub-section -> diagram). OMIT this key if there are no sub-items.'),
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
    return sections.every((section, index) => {
        if (typeof section !== 'object' || !section || typeof section.name !== 'string' || !section.name.trim()) {
            console.warn(`Outline Validation Failed (Depth ${currentDepth}): Section at index ${index} is invalid (missing name or not an object):`, section);
            return false;
        }
        if (currentDepth > maxDepth) {
            // This checks if a section *at* a depth greater than maxDepth has subSections.
            // An item *at* maxDepth is allowed, but it cannot have children.
            // So, if currentDepth IS maxDepth, section.subSections must be empty or undefined.
            if (section.subSections && section.subSections.length > 0) {
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
                 // If current depth + 1 would exceed max depth, and there are subSections, it's an error.
                if (currentDepth + 1 > maxDepth) {
                     console.warn(`Outline Validation Failed (Depth ${currentDepth}): Section "${section.name}" has subSections that would exceed max depth ${maxDepth}.`);
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
      console.warn("Project context is very short, AI outline generation might be suboptimal.");
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
  prompt: `You are an AI expert specializing in structuring academic and technical project reports. Your task is to generate a comprehensive, **deeply hierarchical**, and logically ordered list of section names suitable for a project report.

  **Project Title:** {{{projectTitle}}}
  **Project Context:** {{{projectContext}}}

  **Generation Constraints & Instructions:**
  1.  **Hierarchical Structure is CRITICAL:**
      *   Generate at least **{{minSections}}** TOP-LEVEL sections (e.g., "1. Introduction", "2. Literature Review").
      *   Most top-level sections should be **broken down into multiple logical sub-sections** (e.g., "1.1 Background", "1.2 Problem Statement"). These sub-sections are children of the top-level section.
      *   **Deep Nesting for Items:** Sub-sections can, and often should, contain further nested items like diagrams, figures, or tables. These items are children of their respective sub-sections.
  2.  **Maximum Nesting Depth:** The absolute maximum nesting depth for any item (section, sub-section, diagram, figure, table) is **{{maxSubSectionsPerSection}}** levels.
      *   Example: If \`maxSubSectionsPerSection\` is 2:
          *   Depth 0: "1. Introduction"
          *   Depth 1: "1.1 Background and Motivation" (child of Introduction)
          *   Depth 2: "1.1.1 Diagram: Conceptual Model" (child of Background and Motivation)
      *   An item at the \`maxSubSectionsPerSection\` depth (e.g., the Diagram above if depth is 2) **MUST NOT** have its own "subSections" key or array.
  3.  **Prefixes for Specialized Items:** When suggesting diagrams, figures, or tables, **YOU MUST** use the following prefixes in their "name" field:
      *   "Diagram: [Descriptive Name]" (e.g., "Diagram: User Login Flow")
      *   "Figure X: [Descriptive Name]" (e.g., "Figure 1: System Architecture") - Increment X for each figure throughout the entire outline.
      *   "Table Y: [Descriptive Name]" (e.g., "Table 1: Comparison of Algorithms") - Increment Y for each table throughout the entire outline.
  4.  **Numbering:** Include hierarchical numbering in all section and sub-item names (e.g., "1.", "1.1", "1.1.1", "3.2.1 Figure 1: Architecture").
  5.  **OMIT EMPTY 'subSections' KEY:** If a section or any sub-item has NO children, COMPLETELY OMIT the "subSections" key for that object in the JSON. Do NOT include \`"subSections": []\`.
  6.  **Context-Driven Content:** Tailor all sections, sub-sections, and item placements *specifically* to the project described in the provided context.
  7.  **Standard Sections:** Include essential academic/technical report sections (e.g., Introduction, Literature Review, Methodology, System Design, Implementation, Results, Discussion, Conclusion, References, Appendix) and structure them with relevant sub-sections and nested items as appropriate.
  8.  **JSON Output ONLY:** The output MUST be a single, valid JSON object matching the 'GenerateProjectOutlineOutputSchema'. No extra text, explanations, apologies, or markdown formatting outside the JSON structure.

  **Example of Desired JSON Output Structure (for \`maxSubSectionsPerSection = 2\`):**
  \`\`\`json
  {
    "sections": [
      {
        "name": "1. Introduction",
        "subSections": [
          {
            "name": "1.1 Background and Motivation",
            "subSections": [
              { "name": "1.1.1 Diagram: Conceptual Model" }
            ]
          },
          { "name": "1.2 Problem Statement" },
          { "name": "1.3 Project Goals and Objectives" }
        ]
      },
      {
        "name": "2. Literature Review"
      },
      {
        "name": "3. System Design",
        "subSections": [
          { "name": "3.1 Architecture Overview" },
          { "name": "3.2.1 Figure 1: High-Level Architecture" },
          {
            "name": "3.3 Component Design",
            "subSections": [
              { "name": "3.3.1 Table 1: Component APIs" }
            ]
          }
        ]
      }
      // ... more top-level sections with similar hierarchical sub-items ...
    ]
  }
  \`\`\`

  Generate the detailed, hierarchical JSON outline now, strictly adhering to all constraints and instructions.
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
async (input) => { // input here already has defaults applied by the wrapper
    let output: GenerateProjectOutlineOutput | undefined;
    const fallbackOutline: GenerateProjectOutlineOutput = { sections: [
        { name: "1. Introduction", subSections: [ { name: "1.1 Background" }, { name: "1.1.1 Diagram: Basic Flow" } ]},
        { name: "2. Methodology" }, { name: "3. Implementation Details" }, { name: "4. Results & Discussion" },
        { name: "5. Conclusion & Future Work" }, { name: "References" }
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
        
        // Validate the structure against maxDepth
        if (!validateOutlineStructure(output.sections, 0, input.maxSubSectionsPerSection)) {
            console.warn("AI outline validation failed against max depth or structure. Output:", JSON.stringify(output, null, 2));
            // Attempt to parse defensively with Zod. If it passes Zod but fails our custom validation, it's likely a depth issue.
             try {
                 const parsed = GenerateProjectOutlineOutputSchema.parse(output);
                 console.log("Defensive Zod parsing successful despite custom validation warning. Parsed:", parsed);
                 // Re-validate with Zod parsed output, as Zod might strip extra fields.
                 if (!validateOutlineStructure(parsed.sections, 0, input.maxSubSectionsPerSection)) {
                     console.error("Zod parsing ok, but structure STILL invalid for depth/rules. Using fallback.");
                     toast({ variant: "destructive", title: "Outline Structure Invalid", description: `Generated outline violates depth limits (${input.maxSubSectionsPerSection}) or structure. Using fallback.` });
                     return fallbackOutline;
                 }
                 console.log("Structure validated successfully after defensive Zod parsing.");
                 return parsed;
             } catch (parseError) {
                 console.error("Defensive Zod parsing failed after custom validation warning:", parseError);
                 toast({ variant: "destructive", title: "Outline Parsing Failed", description: "Generated outline has an invalid format. Using fallback." });
                 return fallbackOutline;
             }
        }

        console.log("AI outline generation successful and validated.");
        return output;

    } catch (error) {
        console.error("Error calling AI for project outline generation:", error);
         if (error instanceof Error && (error.message.includes("invalid argument") || error.message.includes("content safety") || error.message.includes("400 Bad Request"))) {
             console.warn(`AI generation failed (${error.message}). Returning fallback.`);
             toast({ variant: "destructive", title: "AI Generation Error", description: `AI service failed: ${error.message.substring(0,100)}. Using fallback.` });
             return fallbackOutline;
         }
         console.warn("Unknown error during AI call. Returning fallback.");
         toast({ variant: "destructive", title: "Outline Error", description: "An unknown error occurred during outline generation. Using fallback." });
         return fallbackOutline;
    }
});

// Helper function to use toast (assuming it's available in this context or passed in)
// This is a placeholder; actual toast implementation would be in the UI component calling this flow.
const toast = (options: {variant?: string, title: string, description: string}) => {
    console.log(`Toast: ${options.title} - ${options.description}`);
};


// Type definition for hierarchical structure used internally by the validation function
// Must match the Zod schema structure
interface OutlineSection {
    name: string;
    subSections?: OutlineSection[];
}
