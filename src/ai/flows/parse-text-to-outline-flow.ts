
'use server';
/**
 * @fileOverview AI agent to parse a text-based outline into a hierarchical JSON structure.
 *
 * - parseTextToOutline - Converts raw text outline into a structured format.
 * - ParseTextToOutlineInput - Input type for the flow.
 * - ParseTextToOutlineOutput - Output type for the flow (matches GeneratedSectionOutline).
 */

import { ai } from '@/ai/ai-instance'; // Assuming your global AI instance is here
import { z } from 'genkit';
import type { OutlineSection, GeneratedSectionOutline } from '@/types/project';

// Recursive schema for sections and sub-sections
const OutlineSectionSchema: z.ZodType<OutlineSection> = z.lazy(() =>
  z.object({
    name: z.string().min(1).describe('The full name of the section or sub-section. Original numbering/markers MUST be stripped. This name is MANDATORY.'), // Enforce non-empty name
    subSections: z.array(OutlineSectionSchema).optional().describe('An optional array of sub-sections. OMIT this key if there are no sub-items.'),
  })
);

const ParseTextToOutlineInputSchema = z.object({
  textOutline: z.string().describe('The raw text outline provided by the user. It may use spaces or tabs for indentation, and various list markers (-, *, 1., a., etc.).'),
});
export type ParseTextToOutlineInput = z.infer<typeof ParseTextToOutlineInputSchema>;

// Output schema matches GeneratedSectionOutline from types/project.ts
const ParseTextToOutlineOutputSchema = z.object({
  sections: z.array(OutlineSectionSchema).describe('An ordered, hierarchical list of sections parsed from the text. Return an empty array if parsing fails or text is empty.'),
});
export type ParseTextToOutlineOutput = z.infer<typeof ParseTextToOutlineOutputSchema>;


export async function parseTextToOutline(input: ParseTextToOutlineInput): Promise<ParseTextToOutlineOutput> {
  return parseTextToOutlineFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseTextToOutlinePrompt',
  input: { schema: ParseTextToOutlineInputSchema },
  output: { schema: ParseTextToOutlineOutputSchema },
  prompt: `You are an expert text processor. Your task is to convert a raw text-based outline into a structured hierarchical JSON format.
The user will provide a text outline where hierarchy is typically indicated by indentation (spaces or tabs) and possibly list markers (like '-', '*', '1.', 'a.', etc.).

Input Text Outline:
\`\`\`text
{{{textOutline}}}
\`\`\`

**Instructions for JSON Conversion:**
1.  **Hierarchy:** Accurately interpret the indentation to determine parent-child relationships.
    *   Lines with less indentation are parents to subsequent lines with more indentation.
    *   Lines with the same indentation level (after a parent) are siblings.
2.  **Section Names (CRITICAL):**
    *   Extract the meaningful name for each section/sub-section. This name field is MANDATORY.
    *   Strip any leading list markers (e.g., '-', '*', '1.', 'A)', 'i.') and their subsequent spaces from the name.
    *   Trim leading/trailing whitespace from the extracted name.
    *   Ensure EVERY section and sub-section object has a non-empty 'name' property.
3.  subSections Key:
    *   If a section has child items, represent them as an array in a 'subSections' key.
    *   **CRITICAL: If a section has NO children, COMPLETELY OMIT the 'subSections' key for that object in the JSON. Do NOT include \`"subSections": []\` for leaf nodes.**
4.  **Output Format:**
    *   The entire output MUST be a single JSON object matching the 'ParseTextToOutlineOutputSchema'.
    *   The root of this object must have a "sections" key, which is an array of top-level OutlineSection objects.
    *   If the input text is empty, invalid, or cannot be parsed into a meaningful outline, return an empty "sections" array: \`{ "sections": [] }\`.

**Example Input Text:**
\`\`\`text
- Main Topic 1
  - Subtopic 1.1
    - Detail 1.1.1
  - Subtopic 1.2
- Main Topic 2
  - Subtopic 2.1
\`\`\`

**Corresponding Example JSON Output (Ensure EVERY item has a 'name'):**
\`\`\`json
{
  "sections": [
    {
      "name": "Main Topic 1",
      "subSections": [
        {
          "name": "Subtopic 1.1",
          "subSections": [
            {
              "name": "Detail 1.1.1"
            }
          ]
        },
        {
          "name": "Subtopic 1.2"
        }
      ]
    },
    {
      "name": "Main Topic 2",
      "subSections": [
        {
          "name": "Subtopic 2.1"
        }
      ]
    }
  ]
}
\`\`\`
Process the provided "{{{textOutline}}}" now. Ensure all generated section objects have a 'name' property.
`,
});

const parseTextToOutlineFlow = ai.defineFlow(
  {
    name: 'parseTextToOutlineFlow',
    inputSchema: ParseTextToOutlineInputSchema,
    outputSchema: ParseTextToOutlineOutputSchema,
  },
  async (input) => {
    if (!input.textOutline || input.textOutline.trim() === '') {
      return { sections: [] }; // Return empty if input is empty
    }
    const { output } = await prompt(input);
    if (!output || !Array.isArray(output.sections)) {
        console.error("AI parsing for text outline returned invalid structure:", output);
        // Attempt to provide a fallback or indicate error
        return { sections: [{ name: "Error: AI failed to parse the outline. Please check your text format."}] };
    }
    // Additional validation to ensure all items have names (though Zod should catch this)
    const validateNames = (secs: OutlineSection[]): boolean => {
        return secs.every(s => {
            if (typeof s.name !== 'string' || !s.name.trim()) return false;
            if (s.subSections && !validateNames(s.subSections)) return false;
            return true;
        });
    };
    if (!validateNames(output.sections)) {
        console.error("AI parsing returned items without names:", output);
        return { sections: [{ name: "Error: AI returned some items without names. Please check your text format."}] };
    }

    return output;
  }
);
