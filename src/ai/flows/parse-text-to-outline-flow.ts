
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
    name: z.string().min(1).describe('The full name of the section or sub-section. Original numbering/markers MUST be stripped. This name is MANDATORY and must not be empty.'),
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

**CRITICAL Instructions for JSON Conversion:**
1.  **Hierarchy:** Accurately interpret the indentation to determine parent-child relationships.
    *   Lines with less indentation are parents to subsequent lines with more indentation.
    *   Lines with the same indentation level (after a parent) are siblings.
2.  **Section Names (MANDATORY):**
    *   For EVERY item in the outline (section or sub-section), you MUST extract a meaningful 'name'.
    *   Strip any leading list markers (e.g., '-', '*', '1.', 'A)', 'i.') and their subsequent spaces from the name.
    *   Trim leading/trailing whitespace from the extracted name.
    *   Ensure EVERY section and sub-section object in the output JSON has a non-empty 'name' string property. If a line seems to be only indentation or markers with no actual text, it should be ignored or you should try to infer a placeholder name like "[Unnamed Item]".
3.  **'subSections' Key:**
    *   If a section has child items, represent them as an array in a 'subSections' key.
    *   **CRITICAL: If a section has NO children, COMPLETELY OMIT the 'subSections' key for that object in the JSON. Do NOT include \`"subSections": []\` for leaf nodes.**
4.  **Output Format:**
    *   The entire output MUST be a single JSON object matching the 'ParseTextToOutlineOutputSchema'.
    *   The root of this object must have a "sections" key, which is an array of top-level OutlineSection objects.
    *   If the input text is empty, invalid, or cannot be parsed into a meaningful outline with named sections, return an empty "sections" array: \`{ "sections": [] }\`.

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
  async (input): Promise<ParseTextToOutlineOutput> => {
    if (!input.textOutline || input.textOutline.trim() === '') {
      return { sections: [] }; // Return empty if input is empty
    }
    try {
      const { output: rawOutput } = await prompt(input);

      // Validate the raw output from AI against the Zod schema
      // This will throw an error if the structure is incorrect (e.g., missing 'name')
      const parsedOutput = ParseTextToOutlineOutputSchema.parse(rawOutput);

      // Additional explicit check for names, although Zod should catch it.
      const validateNamesRecursive = (secs: OutlineSection[]): boolean => {
        return secs.every(s => {
          if (typeof s.name !== 'string' || !s.name.trim()) return false;
          if (s.subSections && !validateNamesRecursive(s.subSections)) return false;
          return true;
        });
      };

      if (!parsedOutput.sections || !validateNamesRecursive(parsedOutput.sections)) {
        console.error("AI parsing returned items without names or invalid section structure:", parsedOutput);
        return { sections: [{ name: "Error: AI returned an invalid outline structure (e.g., missing names). Please check your text format or simplify."}] };
      }

      return parsedOutput;

    } catch (error: any) {
      console.error("Error in parseTextToOutlineFlow:", error);
      let errorMessage = "AI failed to parse the outline. Please check your text format or try again.";
      if (error instanceof z.ZodError) {
        errorMessage = `AI returned data in an unexpected format. Details: ${error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ')}`;
        // Limit length of Zod error details in toast
        if (errorMessage.length > 200) errorMessage = errorMessage.substring(0, 197) + "...";
      } else if (error.message) {
        errorMessage = error.message.substring(0,200); // Limit length for toast
      }
      // Return a valid structure with an error message
      return { sections: [{ name: `Error: ${errorMessage}` }] };
    }
  }
);
