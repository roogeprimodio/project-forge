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
  minSections: z.number().optional().describe('The minimum number of top-level sections the AI should aim to generate (default 5).'),
  maxSubSectionsPerSection: z.number().optional().describe('The maximum depth of sub-section nesting the AI should generate (default 2). 0 means no sub-sections.'),
});
export type GenerateProjectOutlineInput = z.infer<typeof GenerateProjectOutlineInputSchema>;

const GenerateProjectOutlineOutputSchema = z.object({
  // Expect an array of the recursive section schema.
  sections: z.array(OutlineSectionSchema).describe('An ordered, hierarchical list of suggested sections and sub-sections for the report. May include sections for diagrams/figures (e.g., "Figure 1: Flowchart").'),
});
export type GenerateProjectOutlineOutput = z.infer<typeof GenerateProjectOutlineOutputSchema>;

// Basic validation function for the outline structure
const validateOutlineStructure = (sections: any[] | undefined): sections is OutlineSection[] => {
    if (!Array.isArray(sections)) return false;
    return sections.every(section => {
        if (typeof section !== 'object' || !section || typeof section.name !== 'string' || !section.name.trim()) {
            console.warn("Validation failed: Section missing name or is not an object:", section);
            return false;
        }
        // Check 'subSections' property existence and type explicitly
        if (section.hasOwnProperty('subSections')) {
            if (!Array.isArray(section.subSections)) {
                console.warn("Validation failed: subSections exists but is not an array:", section);
                return false; // Fail if 'subSections' exists but isn't an array
            }
             // Recursively validate only if subSections is a non-empty array
            if (section.subSections.length > 0 && !validateOutlineStructure(section.subSections)) {
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
  return generateProjectOutlineFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProjectOutlinePrompt',
  input: {
    schema: GenerateProjectOutlineInputSchema,
  },
  output: {
    schema: GenerateProjectOutlineOutputSchema,
  },
  // **Enhanced Prompt for Diagrams, Limits, and JSON Structure**
  prompt: `You are an AI expert specializing in structuring academic and technical project reports.

  **Task:** Generate a comprehensive and logically ordered HIERARCHICAL list of section names suitable for a project report, based on the provided title and context. Aim for at least {{minSections ?? 5}} top-level sections. Include standard sections and suggest relevant sub-sections. **Where appropriate, also include placeholders for diagrams or figures as specific sub-sections (e.g., "1.1.1 Diagram: System Flowchart", "Figure 3: Results Graph").** Limit the nesting depth of sub-sections to {{maxSubSectionsPerSection ?? 2}} levels.

  **Project Title:** {{{projectTitle}}}
  **Project Context:** {{{projectContext}}}

  **Output Format:**
  The output MUST be a single, valid JSON object matching the following structure EXACTLY:
  \`\`\`json
  {
    "sections": [
      {
        "name": "1. Introduction",
        "subSections": [
          { "name": "1.1 Background" },
          {
            "name": "1.2 System Overview",
            "subSections": [ // Example of diagram placeholder at level 2 (if maxSubSectionsPerSection >= 2)
              { "name": "1.2.1 Diagram: High-Level Architecture" }
              // No deeper nesting like 1.2.1.1 if maxSubSectionsPerSection is 2
            ]
          }
        ]
      },
      { "name": "2. Methodology" }, // No subSections key if none exist
      // ... more sections, potentially with nested sub-sections and diagrams up to the specified depth
    ]
  }
  \`\`\`

  **Critical Instructions:**
  1.  **JSON ONLY:** Output ONLY the JSON object. No extra text or markdown formatting.
  2.  **Hierarchical Structure:** Adhere strictly to the schema. Use "subSections" for nesting. Do not nest deeper than {{maxSubSectionsPerSection ?? 2}} levels (e.g., if max is 2, allow 1.1 and 1.1.1, but not 1.1.1.1).
  3.  **OMIT EMPTY 'subSections':** If a section or sub-section has NO further sub-sections, COMPLETELY OMIT the "subSections" key for that object. Do NOT include \`"subSections": []\`.
  4.  **Minimum Top-Level Sections:** Generate at least {{minSections ?? 5}} top-level sections if feasible based on the context.
  5.  **Diagram Placeholders:** Intelligently insert diagram/figure placeholders as sub-sections where visuals would enhance understanding (e.g., for architecture, flowcharts, results). Use naming conventions like "Diagram: [Description]" or "Figure X: [Description]".
  6.  **Standard Sections:** Include essential academic/technical sections.
  7.  **Context is Key:** Tailor sections and sub-sections *specifically* to the project context.
  8.  **Logical Flow:** Ensure sections follow a clear progression.
  9.  **Naming:** Use clear, descriptive names. Include numbering (e.g., "1.", "1.1", "1.1.1") where appropriate, reflecting the hierarchy.
  10. **Completeness:** Aim for a reasonably complete outline based on the input.

  Now, generate the JSON output for the given Project Title and Context, respecting the section and depth limits.
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
        { name: "1. Introduction", subSections: [] },
        { name: "2. Methodology", subSections: [] },
        { name: "3. Implementation", subSections: [] },
        { name: "4. Results", subSections: [] },
        { name: "5. Conclusion", subSections: [] },
        { name: "References", subSections: [] }
    ]};

    try {
        const result = await prompt(input);
        output = result.output;

        if (!output || typeof output !== 'object' || !validateOutlineStructure(output.sections)) {
            console.warn("AI did not return a valid hierarchical structure. Output:", JSON.stringify(output));
             try {
                 // Attempt to parse defensively even if validation failed, as it might be a minor issue
                 const parsed = GenerateProjectOutlineOutputSchema.parse(output);
                 console.log("Defensive parsing successful despite initial validation warning:", parsed);
                 // Re-validate after parsing to be absolutely sure
                 if (!validateOutlineStructure(parsed.sections)) {
                     console.error("Defensive parsing succeeded but structure is still invalid.");
                     return fallbackOutline;
                 }
                 return parsed;
             } catch (parseError) {
                 console.error("Defensive parsing also failed:", parseError);
                 return fallbackOutline;
             }
        }

        console.log("AI outline generation successful and validated.");
        return output;

    } catch (error) {
        console.error("Error calling AI for project outline generation:", error);
         if (error instanceof Error && error.message.includes("invalid argument")) {
             console.warn("AI generation failed possibly due to invalid context. Returning fallback.");
             return fallbackOutline;
         }
         return fallbackOutline;
    }
});

// Type definition for hierarchical structure used internally by the validation function
interface OutlineSection {
    name: string;
    subSections?: OutlineSection[];
}
