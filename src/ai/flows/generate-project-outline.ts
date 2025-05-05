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

// Recursive schema for sections and sub-sections
const OutlineSectionSchema: z.ZodType<any> = z.lazy(() => // Use z.lazy for recursion
    z.object({
        name: z.string().describe('The full name of the section or sub-section (e.g., "1.1 Background and Motivation"). Should be descriptive and appropriate for a report heading.'),
        // Ensure subSections is ALWAYS an array, even if empty, when present in the AI output for consistency.
        subSections: z.array(OutlineSectionSchema).optional().describe('An optional array of sub-sections nested under this section. Each sub-section must follow the same structure. Only include sub-sections where logical subdivision is appropriate. If present, it must be an array.'),
    }).describe('A single section or sub-section in the report outline. Sections should be logically ordered.')
);

const GenerateProjectOutlineInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  projectContext: z.string().describe('A detailed description of the project, its goals, scope, target audience, key features, technologies used, and methodology (if known). More context leads to better outlines.'),
});
export type GenerateProjectOutlineInput = z.infer<typeof GenerateProjectOutlineInputSchema>;

const GenerateProjectOutlineOutputSchema = z.object({
  // The output schema expects an array of the recursive section schema.
  sections: z.array(OutlineSectionSchema).describe('An ordered, hierarchical list of suggested sections and sub-sections for the report. The structure must strictly follow the schema, with sections containing optional subSections arrays.'),
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
        // If subSections exists, it MUST be an array (can be empty). Recursively validate.
        if (section.hasOwnProperty('subSections')) {
            if (!Array.isArray(section.subSections)) {
                console.warn("Validation failed: subSections exists but is not an array:", section);
                return false;
            }
            // Recursively validate sub-sections
            if (!validateOutlineStructure(section.subSections)) return false;
        }
        return true;
    });
};


export async function generateProjectOutline(input: GenerateProjectOutlineInput): Promise<GenerateProjectOutlineOutput> {
  // Add a basic check for minimal context length before calling the flow
  if (!input.projectContext || input.projectContext.trim().length < 30) { // Increased minimum length slightly
      console.warn("Project context is very short, AI outline generation might be suboptimal.");
      // Optionally, you could return a specific error or default structure here
      // return { error: "Project context is too short for effective outline generation." };
  }
  return generateProjectOutlineFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProjectOutlinePrompt',
  input: {
    schema: GenerateProjectOutlineInputSchema,
  },
  output: {
    schema: GenerateProjectOutlineOutputSchema, // Use the hierarchical schema
  },
  // **Enhanced Prompt**
  prompt: `You are an AI expert specializing in structuring academic and technical project reports.

  **Task:** Generate a comprehensive and logically ordered HIERARCHICAL list of section names suitable for a project report, based on the provided title and context.

  **Project Title:** {{{projectTitle}}}
  **Project Context:** {{{projectContext}}}

  **Output Format:**
  The output MUST be a single, valid JSON object matching the following structure EXACTLY:
  \`\`\`json
  {
    "sections": [
      {
        "name": "Section 1 Name (e.g., 1. Introduction)",
        "subSections": [ // Optional: Include ONLY if logical sub-sections exist. MUST be an array if present.
          {
            "name": "Sub-section 1.1 Name",
            "subSections": [] // Can be nested further if needed, MUST be an array.
          },
          { "name": "Sub-section 1.2 Name" }
        ]
      },
      {
        "name": "Section 2 Name"
        // "subSections" key is omitted if there are no sub-sections.
      },
      // ... more sections
    ]
  }
  \`\`\`

  **Critical Instructions:**
  1.  **JSON ONLY:** Output ONLY the JSON object. Do NOT include any introductory text, explanations, apologies, markdown formatting (like \`\`\`json ... \`\`\`), or any characters before the opening \`{\` or after the closing \`}\`.
  2.  **Hierarchical Structure:** Adhere strictly to the JSON schema. Use the "subSections" array for nesting (1-2 levels deep is typical). If a section has no sub-sections, OMIT the "subSections" key entirely for that section. If the "subSections" key IS present, its value MUST be an array (it can be empty: \`[]\`).
  3.  **Standard Sections:** Include essential academic/technical sections (e.g., Introduction, Literature Review, Methodology/Design, Implementation, Results/Evaluation, Discussion, Conclusion, References, Appendix). Adapt these based on the project context.
  4.  **Context is Key:** Tailor sections and sub-sections *specifically* to the details in the project context. Reflect mentioned technologies, features, evaluation methods, etc.
  5.  **Logical Flow:** Ensure sections follow a clear progression (problem -> solution -> evaluation -> conclusion).
  6.  **Naming:** Use clear, descriptive, concise names appropriate for report headings. Include numbering (e.g., "1.", "1.1") if appropriate for the context.
  7.  **Completeness:** Aim for a reasonably complete outline covering typical report components relevant to the context.

  **Example Valid JSON Output (for a different project):**
  \`\`\`json
  {
    "sections": [
      {
        "name": "1. Introduction",
        "subSections": [
          { "name": "1.1 Background and Motivation" },
          { "name": "1.2 Problem Statement" },
          { "name": "1.3 Objectives" },
          { "name": "1.4 Scope and Limitations" }
        ]
      },
      { "name": "2. Literature Review" },
      {
        "name": "3. System Design",
        "subSections": [
          { "name": "3.1 Architecture Overview" },
          { "name": "3.2 Database Schema" }
        ]
      },
      { "name": "4. Implementation" },
      { "name": "5. Testing and Evaluation" },
      { "name": "6. Conclusion" }
    ]
  }
  \`\`\`

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
    // **Improved Fallback Outline** (Hierarchical)
    const fallbackOutline: GenerateProjectOutlineOutput = { sections: [
        { name: "1. Introduction", subSections: [] }, // Use empty arrays for consistency
        { name: "2. Methodology", subSections: [] },
        { name: "3. Implementation", subSections: [] },
        { name: "4. Results", subSections: [] },
        { name: "5. Conclusion", subSections: [] },
        { name: "References", subSections: [] }
    ]};

    try {
        const result = await prompt(input);
        output = result.output;

        // **Enhanced Validation**
        if (!output || typeof output !== 'object' || !validateOutlineStructure(output.sections)) {
            console.warn("AI did not return a valid hierarchical section structure according to validation. Output received:", JSON.stringify(output));
            // Attempt to parse schema defensively (might catch simple errors)
             try {
                const parsed = GenerateProjectOutlineOutputSchema.parse(output);
                console.log("Defensive parsing successful, using parsed output:", parsed);
                return parsed; // Use the Zod-parsed output if possible
             } catch (parseError) {
                 console.error("Defensive parsing also failed:", parseError);
                 return fallbackOutline; // Fallback if even parsing fails
             }
        }

        console.log("AI outline generation successful and validated.");
        return output; // Return validated output

    } catch (error) {
        console.error("Error calling AI for project outline generation:", error);
         if (error instanceof Error && error.message.includes("invalid argument")) {
             console.warn("AI generation failed possibly due to invalid context. Returning fallback.");
             return fallbackOutline;
         }
         // General fallback on other errors
         return fallbackOutline;
    }
});
