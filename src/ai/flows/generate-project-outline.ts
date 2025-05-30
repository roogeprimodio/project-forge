
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
import type { OutlineSection as HierarchicalOutlineSectionType } from '@/types/project';
import { BaseAiInputSchema, getModel, getConfig, getMissingApiKeyError } from './common';
import { toast } from '@/hooks/use-toast'; // Assuming toast can be used server-side or this is a placeholder

// Recursive schema for sections and sub-sections allowing deeper nesting
const OutlineSectionSchema: z.ZodType<HierarchicalOutlineSectionType> = z.lazy(() =>
    z.object({
        name: z.string().describe('The full name of the section or sub-section (e.g., "1.1 Background", "1.1.1 Diagram: System Architecture"). Should be descriptive. For diagrams, figures, flowcharts, or tables, YOU MUST use prefixes like "Diagram: ", "Figure X: ", "Flowchart Z: ", or "Table Y: ". Increment X, Y, Z for each figure/table/flowchart type independently throughout the entire outline.'),
        subSections: z.array(OutlineSectionSchema).optional().describe('An optional array of sub-sections or items (like diagrams/figures/tables) nested under this section. Allows for multiple levels (e.g., section -> sub-section -> diagram). COMPLETELY OMIT this key if there are no sub-items.'),
    }).describe('A single section or sub-section in the report outline. Sections should be logically ordered.')
);

const GenerateProjectOutlineInputSchemaInternal = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  projectContext: z.string().describe('A detailed description of the project, its goals, scope, target audience, key features, technologies used, and methodology (if known). More context leads to better outlines.'),
  minSections: z.number().optional().describe('If provided (constraints enabled), the minimum number of TOP-LEVEL sections the AI should aim to generate. This does not count sub-sections or deeply nested items.'),
  maxSubSectionsPerSection: z.number().optional().describe('If provided (constraints enabled), the maximum TOTAL DEPTH of sub-section/item nesting the AI should generate. For example, 0 means no sub-sections (e.g., "1. Intro"). 1 means one level of sub-sections (e.g., "1. Intro" -> "1.1 Background"). 2 means two levels (e.g., "1. Intro" -> "1.1 Background" -> "1.1.1 Diagram: Flow"). Items at the max depth cannot have further subSections.'),
  isAiOutlineConstrained: z.boolean().optional().default(true).describe('If true, minSections and maxSubSectionsPerSection constraints are applied. If false, AI has more freedom.'),
});

export const GenerateProjectOutlineInputSchema = GenerateProjectOutlineInputSchemaInternal.merge(BaseAiInputSchema);
export type GenerateProjectOutlineInput = z.infer<typeof GenerateProjectOutlineInputSchema>;

const GenerateProjectOutlineOutputSchema = z.object({
  sections: z.array(OutlineSectionSchema).describe('An ordered, hierarchical list of suggested sections and sub-sections for the report. Must include items for diagrams/figures/flowcharts/tables (e.g., "Figure 1: Flowchart", "Table 1: Results") nested appropriately within relevant sub-sections.'),
  error: z.string().optional(),
});
export type GenerateProjectOutlineOutput = z.infer<typeof GenerateProjectOutlineOutputSchema>;

const validateOutlineStructure = (sections: any[] | undefined, currentDepth = 0, maxDepth?: number): sections is HierarchicalOutlineSectionType[] => {
    if (!Array.isArray(sections)) {
        console.warn(`Outline Validation Failed (Depth ${currentDepth}): Root 'sections' is not an array.`);
        return false;
    }
    if (sections.length === 0 && currentDepth === 0) {
        // Allow empty outline if AI genuinely returns it (e.g., for very poor context)
    }
    return sections.every((section, index) => {
        if (typeof section !== 'object' || !section || typeof section.name !== 'string' || !section.name.trim()) {
            console.warn(`Outline Validation Failed (Depth ${currentDepth}): Section at index ${index} is invalid (missing name or not an object):`, JSON.stringify(section));
            return false;
        }
        if (maxDepth !== undefined && currentDepth >= maxDepth) {
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
                if (maxDepth !== undefined && currentDepth + 1 > maxDepth) {
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
  const apiKeyError = getMissingApiKeyError(
    input.aiModel || 'gemini',
    input.userApiKey,
    !!process.env.GOOGLE_GENAI_API_KEY,
    !!process.env.OPENAI_API_KEY
  );
  if (apiKeyError) {
    return { sections: [], error: apiKeyError };
  }

  if (!input.projectContext || input.projectContext.trim().length < 30) {
      console.warn("Project context is very short for outline generation. AI results may be suboptimal.");
  }
  const parsedInput = GenerateProjectOutlineInputSchema.parse(input); // Ensures all defaults are set
  return generateProjectOutlineFlow(parsedInput);
}

const generateProjectOutlinePrompt = ai.definePrompt({
  name: 'generateProjectOutlinePrompt',
  input: {
    schema: GenerateProjectOutlineInputSchemaInternal,
  },
  output: {
    schema: GenerateProjectOutlineOutputSchema,
  },
  prompt: `You are an AI expert specializing in structuring detailed and comprehensive academic and technical project reports.
Your task is to generate a **deeply hierarchical, multi-level, and thoroughly decomposed** list of section names suitable for a full final year college project report.
The quality, depth, and breadth of this outline are paramount. Think like a student preparing a comprehensive final year project report and consider all typical components and how they break down.

**Project Title:** {{{projectTitle}}}
**Project Context:** {{{projectContext}}}

**CRITICAL Generation Constraints & Instructions:**

{{#if isAiOutlineConstrained}}
  {{#if minSections}}
  1.  **Minimum Top-Level Sections (CONSTRAINT ENABLED):** Generate at least **{{minSections}}** TOP-LEVEL sections (e.g., Introduction, Literature Review, etc.).
  {{else}}
  1.  **Top-Level Sections (CONSTRAINT ENABLED, NO MINIMUM SET):** Generate an appropriate number of top-level sections based on the project context and standard report structures.
  {{/if}}

  {{#if maxSubSectionsPerSection}}
  2.  **Maximum Nesting Depth (CONSTRAINT ENABLED):** The absolute maximum *nesting depth* for any item (section, sub-section, diagram, figure, table, flowchart) is **{{maxSubSectionsPerSection}}**.
      *   Depth 0: Top-level section (e.g., "1. Introduction").
      *   Depth 1: Sub-section of a top-level section (e.g., "1.1 Background").
      *   Depth 2: Sub-sub-item (e.g., "1.1.1 Diagram: Flow", or "3.2.1 Module A: User Auth").
      *   An item at the \`maxSubSectionsPerSection\` depth **MUST NOT** have its own "subSections" key or array.
      *   **DISTINCTION:** This \`maxSubSectionsPerSection\` constraint refers to *nesting depth*. This does NOT limit the *number* of sub-sections you can create at any given level (e.g., you can have 1.1, 1.2, 1.3, 1.4 etc., each being at depth 1).
  {{else}}
  2.  **Nesting Depth (CONSTRAINT ENABLED, NO MAXIMUM SET):** Use your judgment for appropriate nesting depth, ensuring a detailed and logical structure. Strive for multiple levels where beneficial.
  {{/if}}
{{else}}
1.  **Top-Level Sections (AI FREEDOM ENABLED):** Generate a comprehensive number of top-level sections appropriate for the project.
2.  **Nesting Depth (AI FREEDOM ENABLED):** Use your expert judgment to create a deeply nested and logical structure with multiple levels. Prioritize thoroughness.
{{/if}}

3.  **GENERATION REQUIREMENT: For each main section (e.g., Introduction, Literature Review, Methodology, System Design, Implementation, Results, Discussion, Conclusion, References, Appendices), you are REQUIRED to generate a MINIMUM of 2, and ideally 3 to 5, distinct and logical sub-sections.** Decompose each main topic thoroughly. A flat list of main sections, or main sections with only a single sub-item, is NOT acceptable.

4.  **DEEP NESTING FOR SPECIALIZED ITEMS:** Sub-sections themselves can, and often should, contain further nested items like diagrams, figures, flowcharts, or tables if relevant. These items are children of their respective sub-sections and contribute to the depth. For example, "1.1 Background" (a sub-section) can have "1.1.1 Diagram: Conceptual Model" as its child.

5.  **Prefixes for Specialized Items:** When suggesting diagrams, figures, flowcharts, or tables, **YOU MUST** use the following prefixes in their "name" field:
    *   "Diagram: [Descriptive Name]" (e.g., "Diagram: User Login Flow")
    *   "Figure X: [Descriptive Name]" (e.g., "Figure 1: System Architecture") - Increment X for each figure throughout the *entire* outline, starting from 1.
    *   "Table Y: [Descriptive Name]" (e.g., "Table 1: Comparison of Algorithms") - Increment Y for each table throughout the *entire* outline, starting from 1.
    *   "Flowchart Z: [Descriptive Name]" (e.g., "Flowchart 1: User Registration Process") - Increment Z for each flowchart throughout the *entire* outline, starting from 1.

6.  **Numbering:** Include hierarchical numbering in ALL section and sub-item names (e.g., "1.", "1.1", "1.1.1 Figure 1: Architecture", "3.2.1 Table 1: Component APIs").

7.  **OMIT EMPTY 'subSections' KEY:** If a section or any sub-item has NO children, COMPLETELY OMIT the "subSections" key for that object in the JSON. Do NOT include \`"subSections": []\`.

8.  **Context-Driven Content:** Tailor all sections, sub-sections, and item placements *specifically* to the project described in the provided context. Be thorough and imaginative. Think about what typically goes into each main section of a report and break that down into multiple meaningful sub-topics.

9.  **JSON Output ONLY:** The output MUST be a single, valid JSON object matching the 'GenerateProjectOutlineOutputSchema'. No extra text, explanations, apologies, or markdown formatting outside the JSON structure.

**Example of Desired JSON Output Structure (Follow this structure and level of detail closely):**
\`\`\`json
{
  "sections": [
    {
      "name": "1. Introduction",
      "subSections": [
        { "name": "1.1 Background and Motivation" },
        { "name": "1.2 Problem Statement" },
        { "name": "1.3 Project Goals and Objectives" },
        { "name": "1.4 Research Questions (if applicable)" },
        { "name": "1.5 Scope and Limitations of the Study" },
        { "name": "1.6 Significance of the Project" },
        { "name": "1.7 Definitions of Key Terms" },
        { "name": "1.8 Organization of the Report" }
      ]
    },
    {
      "name": "2. Literature Review",
      "subSections": [
        { "name": "2.1 Introduction to Literature Search" },
        { "name": "2.2 Review of Existing Similar Systems/Solutions" },
        {
          "name": "2.3 Analysis of Relevant Technologies and Frameworks",
          "subSections": [
            { "name": "2.3.1 Technology A: Overview and Relevance" },
            { "name": "2.3.2 Technology B: Pros, Cons, and Suitability" },
            { "name": "2.3.3 Table 1: Technology Comparison Matrix" }
          ]
        },
        { "name": "2.4 Discussion of Key Theories and Models" },
        { "name": "2.5 Identification of Research Gaps from Literature" },
        { "name": "2.6 Summary and Synthesis of Reviewed Literature" },
        {
           "name": "2.7 Visual Aids from Literature (Examples)",
           "subSections": [
               { "name": "2.7.1 Figure 1: Trends in [Relevant Field] (Graph/Image)" }
           ]
        }
      ]
    },
    // ... (Include more comprehensive examples for other sections like System Design, Implementation, etc., following the user's detailed example structure)
    {
      "name": "4. System Design",
      "subSections": [
        {
          "name": "4.1 System Architecture Design",
          "subSections": [
            { "name": "4.1.1 Architectural Pattern Chosen (e.g., MVC, Microservices, Layered)" },
            { "name": "4.1.2 Figure 3: High-Level System Architecture Diagram" },
            { "name": "4.1.3 Figure 4: Detailed Component Diagram" }
          ]
        },
        {
          "name": "4.2 Database Design",
          "subSections": [
            { "name": "4.2.1 Choice of Database (e.g., SQL, NoSQL)" },
            { "name": "4.2.2 Figure 5: Entity-Relationship Diagram (ERD)" },
            { "name": "4.2.3 Table 3: Database Schema - User Table Description" }
          ]
        },
        {
          "name": "4.3 User Interface (UI) / User Experience (UX) Design",
          "subSections": [
            { "name": "4.3.1 UI Design Principles Followed" },
            { "name": "4.3.2 Figure 6: Wireframe - Dashboard Page" },
            { "name": "4.3.3 Flowchart 1: User Registration and Login Flow" }
          ]
        }
      ]
    }
  ]
}
\`\`\`

Generate the detailed, hierarchical JSON outline now. Ensure VIRTUALLY ALL top-level sections have MULTIPLE (3-5, or more if logical) meaningful sub-sections and that relevant diagrams/figures/tables are nested appropriately within these sub-sections. The output must be a comprehensive structure for a detailed report.
  `,
});

const generateProjectOutlineFlow = ai.defineFlow(
  {
    name: 'generateProjectOutlineFlow',
    inputSchema: GenerateProjectOutlineInputSchema,
    outputSchema: GenerateProjectOutlineOutputSchema,
  },
  async (input) => {
    const { userApiKey, aiModel, ...promptDataInput } = input;
    const model = getModel({ aiModel, userApiKey });
    const config = getConfig({ aiModel, userApiKey });

    const promptInput = { ...promptDataInput };
    if (!input.isAiOutlineConstrained || input.minSections === undefined) {
        delete promptInput.minSections;
    }
    if (!input.isAiOutlineConstrained || input.maxSubSectionsPerSection === undefined) {
        delete promptInput.maxSubSectionsPerSection;
    }
    promptInput.isAiOutlineConstrained = input.isAiOutlineConstrained ?? true;


    const fallbackOutline: GenerateProjectOutlineOutput = { sections: [
        { name: "1. Introduction", subSections: [ { name: "1.1 Background" }, { name: "1.1.1 Diagram: Basic Flow" } ]},
        { name: "2. Methodology", subSections: [ { name: "2.1 Research Approach" }, { name: "2.1.1 Table 1: Methods Comparison"} ] },
        { name: "3. Conclusion" }
    ]};

    try {
        console.log("Calling AI for outline with input:", promptInput);
        const result = await generateProjectOutlinePrompt(promptInput, { model, config });
        const output = result.output;
        console.log("Raw AI output for outline:", JSON.stringify(output, null, 2));

        if (!output || !output.sections || !Array.isArray(output.sections) || output.sections.length === 0) {
            console.warn("AI outline generation returned empty or invalid 'sections' array. Output:", output);
            toast({ variant: "destructive", title: "Outline Generation Failed", description: "AI returned no sections. Using fallback." });
            return {...fallbackOutline, error: "AI returned no sections."};
        }

        const maxDepthForValidation = input.isAiOutlineConstrained ? input.maxSubSectionsPerSection : undefined;
        if (!validateOutlineStructure(output.sections, 0, maxDepthForValidation)) {
            console.warn("AI outline validation failed against max depth or structure rules. Output:", JSON.stringify(output, null, 2));
             try {
                 const parsed = GenerateProjectOutlineOutputSchema.parse(output);
                 if (!validateOutlineStructure(parsed.sections, 0, maxDepthForValidation)) {
                     console.error("Zod parsing ok, but structure STILL invalid for depth/rules. Using fallback.");
                     toast({ variant: "destructive", title: "Outline Structure Invalid", description: `Generated outline violates depth limits or has invalid item structure. Using fallback.` });
                     return {...fallbackOutline, error: "Generated outline violates depth limits or has invalid item structure."};
                 }
                 return parsed;
             } catch (parseError) {
                 console.error("Defensive Zod parsing failed after custom validation warning:", parseError);
                 toast({ variant: "destructive", title: "Outline Parsing Failed", description: "Generated outline has an invalid format. Using fallback." });
                 return {...fallbackOutline, error: "Generated outline has an invalid format."};
             }
        }

        return output;

    } catch (error: any) {
        console.error("Error calling AI for project outline generation:", error);
         const errorMessage = error instanceof Error ? error.message : "Unknown AI error";
         toast({ variant: "destructive", title: "AI Generation Error", description: `AI service failed: ${errorMessage.substring(0,100)}. Using fallback.` });
         return {...fallbackOutline, error: `AI service failed: ${errorMessage}`};
    }
  }
);
