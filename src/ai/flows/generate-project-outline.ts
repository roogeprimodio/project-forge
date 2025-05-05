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
        if (section.hasOwnProperty('subSections')) {
            if (!Array.isArray(section.subSections)) {
                console.warn("Validation failed: subSections exists but is not an array:", section);
                return false;
            }
            if (!validateOutlineStructure(section.subSections)) return false;
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
  // **Enhanced Prompt for Diagrams**
  prompt: `You are an AI expert specializing in structuring academic and technical project reports.

  **Task:** Generate a comprehensive and logically ordered HIERARCHICAL list of section names suitable for a project report, based on the provided title and context. Include standard sections and suggest relevant sub-sections. **Where appropriate, also include placeholders for diagrams or figures as specific sub-sections (e.g., "1.1.1 Diagram: System Flowchart", "Figure 3: Results Graph").**

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
            "subSections": [ // Example of diagram placeholder
              { "name": "1.2.1 Diagram: High-Level Architecture" }
            ]
          }
        ]
      },
      { "name": "2. Methodology" },
      // ... more sections, potentially with nested sub-sections and diagrams
    ]
  }
  \`\`\`

  **Critical Instructions:**
  1.  **JSON ONLY:** Output ONLY the JSON object. No extra text or markdown formatting.
  2.  **Hierarchical Structure:** Adhere strictly to the schema. Use "subSections" for nesting (allow 2-3 levels). If a section has no sub-sections, OMIT the "subSections" key. If present, "subSections" MUST be an array (can be empty: \`[]\`).
  3.  **Diagram Placeholders:** Intelligently insert diagram/figure placeholders as sub-sections where visuals would enhance understanding (e.g., for architecture, flowcharts, results). Use naming conventions like "Diagram: [Description]" or "Figure X: [Description]".
  4.  **Standard Sections:** Include essential academic/technical sections.
  5.  **Context is Key:** Tailor sections and sub-sections *specifically* to the project context.
  6.  **Logical Flow:** Ensure sections follow a clear progression.
  7.  **Naming:** Use clear, descriptive names. Include numbering (e.g., "1.", "1.1", "1.1.1") where appropriate.
  8.  **Completeness:** Aim for a reasonably complete outline.

  Now, generate the JSON output for the given Project Title and Context.
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
                const parsed = GenerateProjectOutlineOutputSchema.parse(output);
                console.log("Defensive parsing successful, using parsed output:", parsed);
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
