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
        name: z.string().describe('The full name of the section or sub-section (e.g., "1.1 Background", "1.1.1 System Architecture Diagram"). Should be descriptive. Use "Figure X:" or "Diagram:" prefix for visuals.'),
        // Ensure subSections is ALWAYS an array, even if empty, when present.
        subSections: z.array(OutlineSectionSchema).optional().describe('An optional array of sub-sections nested under this section. Allows for multiple levels (e.g., section -> sub-section -> diagram).'),
    }).describe('A single section or sub-section in the report outline. Sections should be logically ordered.')
);

const GenerateProjectOutlineInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  projectContext: z.string().describe('A detailed description of the project, its goals, scope, target audience, key features, technologies used, and methodology (if known). More context leads to better outlines.'),
  minSections: z.number().optional().default(5).describe('The minimum number of top-level sections the AI should aim to generate (default 5).'),
  maxSubSectionsPerSection: z.number().optional().default(2).describe('The maximum depth of sub-section nesting the AI should generate (default 2). 0 means no sub-sections.'),
});
export type GenerateProjectOutlineInput = z.infer<typeof GenerateProjectOutlineInputSchema>;

const GenerateProjectOutlineOutputSchema = z.object({
  // Expect an array of the recursive section schema.
  sections: z.array(OutlineSectionSchema).describe('An ordered, hierarchical list of suggested sections and sub-sections for the report. May include sections for diagrams/figures (e.g., "Figure 1: Flowchart").'),
});
export type GenerateProjectOutlineOutput = z.infer<typeof GenerateProjectOutlineOutputSchema>;

// Basic validation function for the outline structure
const validateOutlineStructure = (sections: any[] | undefined): sections is OutlineSection[] => {
    if (!Array.isArray(sections)) {
        console.warn("Outline Validation Failed: Root 'sections' is not an array.");
        return false;
    }
    return sections.every((section, index) => {
        if (typeof section !== 'object' || !section || typeof section.name !== 'string' || !section.name.trim()) {
            console.warn(`Outline Validation Failed: Section at index ${index} is invalid (missing name or not an object):`, section);
            return false;
        }
        // Check 'subSections' property existence and type explicitly
        if (section.hasOwnProperty('subSections')) {
            if (!Array.isArray(section.subSections)) {
                console.warn(`Outline Validation Failed: subSections for "${section.name}" exists but is not an array:`, section.subSections);
                return false; // Fail if 'subSections' exists but isn't an array
            }
             // Recursively validate only if subSections is a non-empty array
            if (section.subSections.length > 0 && !validateOutlineStructure(section.subSections)) {
                console.warn(`Outline Validation Failed: Invalid structure within subSections of "${section.name}".`);
                return false;
            }
        }
        // If 'subSections' key exists but is an empty array, it's technically valid by schema, but the prompt discourages it.
        // The prompt asks to OMIT the key if empty. Let's keep validation less strict for now.
        return true;
    });
};


export async function generateProjectOutline(input: GenerateProjectOutlineInput): Promise<GenerateProjectOutlineOutput> {
  if (!input.projectContext || input.projectContext.trim().length < 30) {
      console.warn("Project context is very short, AI outline generation might be suboptimal.");
      // Consider throwing an error or returning a specific response if context is mandatory
  }
  // Ensure default values are applied if not provided
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
  // **Enhanced Prompt for Detailed Hierarchical Structure**
  prompt: `You are an AI expert specializing in structuring academic and technical project reports.

  **Task:** Generate a comprehensive and logically ordered **HIERARCHICAL** list of section names suitable for a project report. Critically, this MUST include relevant **sub-sections** nested under main sections, and potentially **sub-sub-sections** (like diagrams or figures) where appropriate. The structure should be based *logically* on the provided project title and context.

  **Project Title:** {{{projectTitle}}}
  **Project Context:** {{{projectContext}}}
  **Generation Limits:**
  *   Aim for at least **{{minSections}}** top-level sections.
  *   Do NOT nest sub-sections deeper than **{{maxSubSectionsPerSection}}** levels. (0=no sub-sections, 1=e.g., 1.1, 2=e.g., 1.1.1)

  **Output Format:**
  The output MUST be a single, valid JSON object matching the following structure EXACTLY:
  \`\`\`json
  {
    "sections": [
      {
        "name": "1. Introduction",
        "subSections": [
          { "name": "1.1 Background and Motivation" },
          {
            "name": "1.2 Problem Statement",
            "subSections": [ // Level 2 nesting example (if maxSubSectionsPerSection >= 2)
              { "name": "1.2.1 Diagram: Existing System Flow (Optional)" }
            ]
          },
          { "name": "1.3 Project Goals and Objectives" }
          // No deeper nesting like 1.2.1.1 if maxSubSectionsPerSection is 2
        ]
      },
      {
        "name": "2. Literature Review"
        // No "subSections" key because this example has none.
      },
      {
        "name": "3. System Design",
        "subSections": [
          { "name": "3.1 Architecture Overview" },
          { "name": "3.2 Diagram: High-Level Architecture" }, // Diagram as direct sub-section
          { "name": "3.3 Component Design" }
        ]
      },
      // ... more sections with appropriate nesting ...
    ]
  }
  \`\`\`

  **Critical Instructions:**
  1.  **JSON ONLY:** Output ONLY the JSON object. No extra text, explanations, or markdown formatting.
  2.  **DEEP HIERARCHY:** Prioritize creating a meaningful multi-level structure with sections and relevant sub-sections based on the context. Go deeper where it makes sense, up to the {{maxSubSectionsPerSection}} level limit.
  3.  **SUB-SECTIONS ARE KEY:** Do *not* just list top-level sections. Generate logical sub-sections for most main sections.
  4.  **DIAGRAMS/FIGURES:** Intelligently insert diagram or figure placeholders as sub-sections (e.g., "3.1.1 Diagram: Database Schema", "Figure 2: User Flow"). Use clear naming like "Diagram: [Description]" or "Figure X: [Description]".
  5.  **OMIT EMPTY 'subSections':** If a section or sub-section has NO children, COMPLETELY OMIT the "subSections" key for that object. Do NOT include \`"subSections": []\`.
  6.  **NUMBERING:** Include hierarchical numbering in the names (e.g., "1.", "1.1", "1.1.1").
  7.  **CONTEXT-DRIVEN:** Tailor the sections, sub-sections, and diagram placements *specifically* to the project described in the context.
  8.  **STANDARD SECTIONS:** Include essential academic/technical report sections (Introduction, Methodology, Results, Conclusion, References, etc.) but structure them with relevant sub-sections.
  9.  **LOGICAL FLOW:** Ensure sections follow a clear, logical progression.

  Now, generate the detailed, hierarchical JSON output for the given Project Title and Context, respecting all instructions, especially the requirement for nested sub-sections and the depth limit.
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
    // Define a more robust fallback with potential sub-sections
    const fallbackOutline: GenerateProjectOutlineOutput = { sections: [
        { name: "1. Introduction", subSections: [ {name: "1.1 Background"} ] },
        { name: "2. Methodology" },
        { name: "3. Implementation Details", subSections: [ {name: "3.1 Core Logic"}, {name:"3.2 Diagram: Flowchart"} ] },
        { name: "4. Results & Discussion" },
        { name: "5. Conclusion & Future Work" },
        { name: "References" }
    ]};

    try {
        console.log("Calling AI for outline with input:", input);
        const result = await prompt(input);
        output = result.output;
        console.log("Raw AI output:", JSON.stringify(output)); // Log raw output

        // Perform validation AFTER receiving the output
        if (!output || !validateOutlineStructure(output.sections)) {
            console.warn("AI outline validation failed. Output:", JSON.stringify(output));
             try {
                 // Attempt defensive parsing even if validation failed initially
                 const parsed = GenerateProjectOutlineOutputSchema.parse(output);
                 console.log("Defensive parsing successful despite validation warning. Parsed:", parsed);
                 // Re-validate strictly after parsing
                 if (!validateOutlineStructure(parsed.sections)) {
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
        // Check for specific error types if possible (e.g., content safety, API errors)
         if (error instanceof Error && (error.message.includes("invalid argument") || error.message.includes("content safety") || error.message.includes("400 Bad Request"))) {
             console.warn(`AI generation failed (${error.message}). Returning fallback.`);
             return fallbackOutline;
         }
         // Generic fallback
         console.warn("Unknown error during AI call. Returning fallback.");
         return fallbackOutline;
    }
});

// Type definition for hierarchical structure used internally by the validation function
interface OutlineSection {
    name: string;
    subSections?: OutlineSection[];
}
