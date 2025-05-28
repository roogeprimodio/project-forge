
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
        name: z.string().describe('The full name of the section or sub-section (e.g., "1.1 Background", "1.1.1 Diagram: System Architecture"). Should be descriptive. For diagrams, figures, flowcharts, or tables, YOU MUST use prefixes like "Diagram: ", "Figure X: ", "Flowchart Z: ", or "Table Y: ". Increment X, Y, Z for each figure/table/flowchart type independently throughout the entire outline.'),
        subSections: z.array(OutlineSectionSchema).optional().describe('An optional array of sub-sections or items (like diagrams/figures/tables) nested under this section. Allows for multiple levels (e.g., section -> sub-section -> diagram). COMPLETELY OMIT this key if there are no sub-items.'),
    }).describe('A single section or sub-section in the report outline. Sections should be logically ordered.')
);

const GenerateProjectOutlineInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  projectContext: z.string().describe('A detailed description of the project, its goals, scope, target audience, key features, technologies used, and methodology (if known). More context leads to better outlines.'),
  minSections: z.number().optional().describe('If provided (constraints enabled), the minimum number of TOP-LEVEL sections the AI should aim to generate. This does not count sub-sections or deeply nested items.'),
  maxSubSectionsPerSection: z.number().optional().describe('If provided (constraints enabled), the maximum TOTAL DEPTH of sub-section/item nesting the AI should generate. For example, 0 means no sub-sections (e.g., "1. Intro"). 1 means one level of sub-sections (e.g., "1. Intro" -> "1.1 Background"). 2 means two levels (e.g., "1. Intro" -> "1.1 Background" -> "1.1.1 Diagram: Flow"). Items at the max depth cannot have further subSections.'),
  isAiOutlineConstrained: z.boolean().optional().default(true).describe('If true, minSections and maxSubSectionsPerSection constraints are applied. If false, AI has more freedom.'),
});
export type GenerateProjectOutlineInput = z.infer<typeof GenerateProjectOutlineInputSchema>;

const GenerateProjectOutlineOutputSchema = z.object({
  sections: z.array(OutlineSectionSchema).describe('An ordered, hierarchical list of suggested sections and sub-sections for the report. Must include items for diagrams/figures/flowcharts/tables (e.g., "Figure 1: Flowchart", "Table 1: Results") nested appropriately within relevant sub-sections.'),
});
export type GenerateProjectOutlineOutput = z.infer<typeof GenerateProjectOutlineOutputSchema>;

// Basic validation function for the outline structure
const validateOutlineStructure = (sections: any[] | undefined, currentDepth = 0, maxDepth?: number): sections is OutlineSection[] => {
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
  if (!input.projectContext || input.projectContext.trim().length < 30) {
      console.warn("Project context is very short for outline generation. AI results may be suboptimal.");
  }
  const parsedInput = GenerateProjectOutlineInputSchema.parse(input);
  return generateProjectOutlineFlow(parsedInput);
}

const prompt = ai.definePrompt({
  name: 'generateProjectOutlinePrompt',
  input: {
    schema: GenerateProjectOutlineInputSchema,
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
    {
      "name": "3. System Analysis and Requirements",
      "subSections": [
        { "name": "3.1 Overall System Overview" },
        { "name": "3.2 Stakeholder Identification and Analysis" },
        {
          "name": "3.3 Functional Requirements",
          "subSections": [
            { "name": "3.3.1 Requirement FR-001: User Registration" },
            { "name": "3.3.2 Requirement FR-002: Content Generation" },
            { "name": "3.3.3 Requirement FR-003: Canvas Editing" }
          ]
        },
        {
          "name": "3.4 Non-Functional Requirements",
          "subSections": [
            { "name": "3.4.1 Performance Requirements (e.g., Response Time)" },
            { "name": "3.4.2 Security Requirements (e.g., Data Privacy)" },
            { "name": "3.4.3 Usability Requirements (e.g., Ease of Use)" },
            { "name": "3.4.4 Scalability Requirements" }
          ]
        },
        {
          "name": "3.5 Use Case Analysis",
          "subSections": [
            { "name": "3.5.1 Use Case UC-01: [Actor] - [Action]" },
            { "name": "3.5.2 Use Case UC-02: [Actor] - [Action]" },
            { "name": "3.5.3 Figure 2: Overall Use Case Diagram" }
          ]
        },
        { "name": "3.6 System Constraints (Hardware/Software/Budget)" },
        {
           "name": "3.7 Supporting Documentation for Analysis",
           "subSections": [
               { "name": "3.7.1 Table 2: Requirement Traceability Matrix" },
               { "name": "3.7.2 Diagram: Stakeholder Interaction Map" }
           ]
        }
      ]
    },
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
            { "name": "4.2.3 Table 3: Database Schema - User Table Description" },
            { "name": "4.2.4 Table 4: Database Schema - Project Table Description" }
          ]
        },
        {
          "name": "4.3 User Interface (UI) / User Experience (UX) Design",
          "subSections": [
            { "name": "4.3.1 UI Design Principles Followed" },
            { "name": "4.3.2 Figure 6: Wireframe - Dashboard Page" },
            { "name": "4.3.3 Figure 7: Wireframe - Editor Page" },
            { "name": "4.3.4 Flowchart 1: User Registration and Login Flow" }
          ]
        },
        {
          "name": "4.4 Module Design Specifications",
          "subSections": [
            { "name": "4.4.1 Module A (e.g., AI Content Generation): Description and Responsibilities" },
            { "name": "4.4.2 Module B (e.g., Canvas Editor): Description and Responsibilities" },
            { "name": "4.4.3 Module C (e.g., Data Persistence): Description and Responsibilities" },
            { "name": "4.4.4 Figure 8: Module Interaction Diagram" }
          ]
        },
        {
          "name": "4.5 Process Flow Design",
          "subSections": [
            { "name": "4.5.1 Flowchart 2: Main Report Generation Process" },
            { "name": "4.5.2 Flowchart 3: AI Suggestion Feature Flow" }
          ]
        },
        { "name": "4.6 Security Design Considerations" }
      ]
    },
    {
      "name": "5. Implementation",
      "subSections": [
        { "name": "5.1 Development Environment and Tools Used" },
        { "name": "5.2 Frontend Implementation Details (e.g., React, Next.js, ShadCN)" },
        { "name": "5.3 Backend Implementation Details (e.g., Genkit Flows, Server Actions)" },
        { "name": "5.4 Database Implementation (if applicable)" },
        { "name": "5.5 Key Algorithms or Logic Implemented" },
        { "name": "5.6 Challenges During Implementation" }
      ]
    },
    {
      "name": "6. Testing and Evaluation",
      "subSections": [
        { "name": "6.1 Testing Strategy (Unit, Integration, System, User Acceptance)" },
        { "name": "6.2 Test Cases Design" ,
          "subSections": [
            { "name": "6.2.1 Table 5: Sample Test Cases for Feature X" }
          ]
        },
        { "name": "6.3 Execution of Test Cases and Results" },
        { "name": "6.4 Performance Evaluation Metrics" },
        { "name": "6.5 Usability Testing and Feedback" },
        { "name": "6.6 Bug Tracking and Resolution" }
      ]
    },
    {
      "name": "7. Results and Discussion",
      "subSections": [
        { "name": "7.1 Presentation of Key Results" },
        { "name": "7.2 Analysis of Achieved Outcomes vs Objectives" },
        { "name": "7.3 Interpretation of Results (Graphs, Charts, Figures)" ,
          "subSections": [
            { "name": "7.3.1 Figure 9: Performance Metrics Graph" },
            { "name": "7.3.2 Table 6: Summary of User Feedback Scores" }
          ]
        },
        { "name": "7.4 Discussion of Significant Findings" },
        { "name": "7.5 Comparison with Expected Results" },
        { "name": "7.6 Limitations of the Study/Project" }
      ]
    },
    {
      "name": "8. Conclusion and Future Work",
      "subSections": [
        { "name": "8.1 Summary of Project Achievements" },
        { "name": "8.2 Restatement of Contributions" },
        { "name": "8.3 Lessons Learned During the Project" },
        { "name": "8.4 Scope for Future Enhancements and Research" }
      ]
    },
    { "name": "9. References" },
    {
      "name": "10. Appendices (Optional)",
      "subSections": [
        { "name": "Appendix A: Glossary of Terms" },
        { "name": "Appendix B: User Manual (if applicable)" },
        { "name": "Appendix C: Additional Diagrams or Source Code Snippets" }
      ]
    }
  ]
}
\`\`\`

Generate the detailed, hierarchical JSON outline now. Ensure VIRTUALLY ALL top-level sections have MULTIPLE (3-5, or more if logical) meaningful sub-sections and that relevant diagrams/figures/tables are nested appropriately within these sub-sections. The output must be a comprehensive structure for a detailed report.
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
        const promptInput = { ...input };
        // Only pass constraints if they are provided AND the toggle is ON
        if (!input.isAiOutlineConstrained || input.minSections === undefined) {
            delete promptInput.minSections;
        }
        if (!input.isAiOutlineConstrained || input.maxSubSectionsPerSection === undefined) {
            delete promptInput.maxSubSectionsPerSection;
        }
        // Always pass isAiOutlineConstrained itself so the prompt can adapt
        promptInput.isAiOutlineConstrained = input.isAiOutlineConstrained ?? true;


        console.log("Calling AI for outline with input:", promptInput);
        const result = await prompt(promptInput);
        output = result.output;
        console.log("Raw AI output for outline:", JSON.stringify(output, null, 2));

        if (!output || !output.sections || !Array.isArray(output.sections) || output.sections.length === 0) {
            console.warn("AI outline generation returned empty or invalid 'sections' array. Output:", output);
            toast({ variant: "destructive", title: "Outline Generation Failed", description: "AI returned no sections. Using fallback." });
            return fallbackOutline;
        }

        const maxDepthForValidation = input.isAiOutlineConstrained ? input.maxSubSectionsPerSection : undefined;
        if (!validateOutlineStructure(output.sections, 0, maxDepthForValidation)) {
            console.warn("AI outline validation failed against max depth or structure rules. Output:", JSON.stringify(output, null, 2));
             try {
                 const parsed = GenerateProjectOutlineOutputSchema.parse(output);
                 console.log("Defensive Zod parsing successful despite custom validation warning. Parsed output will be used if structure is now valid.");
                 if (!validateOutlineStructure(parsed.sections, 0, maxDepthForValidation)) {
                     console.error("Zod parsing ok, but structure STILL invalid for depth/rules. Using fallback.");
                     toast({ variant: "destructive", title: "Outline Structure Invalid", description: `Generated outline violates depth limits or has invalid item structure. Using fallback.` });
                     return fallbackOutline;
                 }
                 console.log("Structure validated successfully after defensive Zod parsing.");
                 const topLevelSectionsWithMultipleSubSections = parsed.sections.filter(s => s.subSections && s.subSections.length >= 2).length; // Check for AT LEAST 2 sub-sections
                 const minExpectedDetailedSections = Math.min(3, parsed.sections.length -1); // Heuristic
                 if (parsed.sections.length > 1 && topLevelSectionsWithMultipleSubSections < minExpectedDetailedSections && minExpectedDetailedSections > 0) {
                    console.warn(`AI outline is structurally valid but may lack sub-section detail. Top-level: ${parsed.sections.length}, With >=2 sub-sections: ${topLevelSectionsWithMultipleSubSections}. Expected at least ${minExpectedDetailedSections} main sections to have multiple sub-sections.`);
                    toast({ variant: "default", title: "Outline May Lack Sub-Section Detail", description: "The generated outline is valid but some main sections might lack multiple sub-sections. Review carefully or try regenerating.", duration: 8000});
                 }
                 return parsed;
             } catch (parseError) {
                 console.error("Defensive Zod parsing failed after custom validation warning:", parseError);
                 toast({ variant: "destructive", title: "Outline Parsing Failed", description: "Generated outline has an invalid format. Using fallback." });
                 return fallbackOutline;
             }
        }

        console.log("AI outline generation successful and validated.");
        const topLevelSectionsWithMultipleSubSections = output.sections.filter(s => s.subSections && s.subSections.length >= 2).length; // Check for AT LEAST 2 sub-sections
        const minExpectedDetailedSections = Math.min(3, output.sections.length -1); // Heuristic

        if (output.sections.length > 1 && topLevelSectionsWithMultipleSubSections < minExpectedDetailedSections && minExpectedDetailedSections > 0) {
            console.warn(`AI outline is structurally valid but may lack sub-section detail. Top-level: ${output.sections.length}, With >=2 sub-sections: ${topLevelSectionsWithMultipleSubSections}. Expected at least ${minExpectedDetailedSections} main sections to have multiple sub-sections.`);
            toast({ variant: "default", title: "Outline May Lack Sub-Section Detail", description: "The generated outline is valid but some main sections might lack multiple sub-sections. Review carefully or try regenerating.", duration: 8000});
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


