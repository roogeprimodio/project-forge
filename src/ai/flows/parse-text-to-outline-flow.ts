
'use server';
/**
 * @fileOverview AI agent to parse a text-based outline into a hierarchical JSON structure.
 *
 * - parseTextToOutline - Converts raw text outline into a structured format.
 * - ParseTextToOutlineInput - Input type for the flow.
 * - ParseTextToOutlineOutput - Output type for the flow (matches GeneratedSectionOutline).
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { OutlineSection } from '@/types/project';
import { BaseAiInputSchema, getModel, getConfig, getMissingApiKeyError } from './common';

const OutlineSectionSchema: z.ZodType<OutlineSection> = z.lazy(() =>
  z.object({
    name: z.string().min(1, { message: "Section name cannot be empty." }).describe('The full name of the section or sub-section, extracted verbatim from the input text after stripping list markers. THIS IS MANDATORY and must not be empty.'),
    subSections: z.array(OutlineSectionSchema).optional().describe('An optional array of sub-sections. OMIT this key completely if there are no sub-items. DO NOT provide an empty array like "subSections": [].'),
  })
);

const ParseTextToOutlineOutputSchema = z.object({
  sections: z.array(OutlineSectionSchema).describe('An ordered, hierarchical list of sections parsed from the text. If parsing fails or text is empty/unparseable, return an object like: { "sections": [{ "name": "Error: Parsing failed due to [reason]. Please check your text format or simplify." }] }. If input is empty, return { "sections": [] }.'),
  error: z.string().optional(),
});
export type ParseTextToOutlineOutput = z.infer<typeof ParseTextToOutlineOutputSchema>;

const ParseTextToOutlineInputSchemaInternal = z.object({
  textOutline: z.string().describe('The raw text outline provided by the user. It may use spaces or tabs for indentation, and various list markers (-, *, 1., a., etc.).'),
});

export const ParseTextToOutlineInputSchema = ParseTextToOutlineInputSchemaInternal.merge(BaseAiInputSchema);
export type ParseTextToOutlineInput = z.infer<typeof ParseTextToOutlineInputSchema>;

export async function parseTextToOutline(input: ParseTextToOutlineInput): Promise<ParseTextToOutlineOutput> {
  const apiKeyError = getMissingApiKeyError(
    input.aiModel || 'gemini',
    input.userApiKey,
    !!process.env.GOOGLE_GENAI_API_KEY,
    !!process.env.OPENAI_API_KEY
  );
  if (apiKeyError) {
    return { sections: [{name: "Error: API Key missing for selected model."}], error: apiKeyError };
  }
  return parseTextToOutlineFlow(input);
}

const parseTextToOutlinePrompt = ai.definePrompt({
  name: 'parseTextToOutlinePrompt',
  input: { schema: ParseTextToOutlineInputSchemaInternal },
  output: { schema: ParseTextToOutlineOutputSchema },
  prompt: `You are an expert text processor. Your SOLE TASK is to convert the following raw text-based outline into a structured hierarchical JSON format based EXACTLY on the provided schema.
DO NOT add, remove, rephrase, or interpret the content of the section names. Your job is purely structural transformation.
Ensure every section object has a 'name' property. If a line seems like an item but has no text after stripping markers, use a placeholder like "[Unnamed Item]".

Input Text Outline:
\`\`\`text
{{{textOutline}}}
\`\`\`

**CRITICAL Instructions for JSON Conversion (Adhere Strictly):**
1.  **Hierarchy Determination:**
    *   Accurately interpret indentation (spaces or tabs) to determine parent-child relationships.
    *   Lines with less indentation are parents to subsequent lines with more indentation.
    *   Lines with the same indentation level (after a parent) are siblings.
2.  **Section Names (MANDATORY 'name' field):**
    *   For EVERY item in the outline (section or sub-section), you MUST extract its name.
    *   Strip any leading list markers (e.g., '-', '*', '1.', 'A)', 'i.', '#', '##') and any subsequent spaces from the name.
    *   The extracted name becomes the value for the 'name' string property.
    *   Trim leading/trailing whitespace from the extracted name.
    *   **Ensure EVERY section object in the output JSON has a non-empty 'name' string property.** If a line is empty or only markers, create a name like "[Unnamed Item]" or skip it if truly empty after marker stripping.
3.  'subSections' Key:
    *   If a section has child items (items indented further beneath it), represent these children as an array in a 'subSections' key for that parent section.
    *   **CRITICAL: If a section has NO children, COMPLETELY OMIT the 'subSections' key for that object in the JSON. Do NOT include \`"subSections": []\` for leaf nodes.**
4.  **Output Format:**
    *   The entire output MUST be a single JSON object precisely matching the 'ParseTextToOutlineOutputSchema'.
    *   The root of this object must have a "sections" key, which is an array of top-level OutlineSection objects.
    *   If the input text is empty, return \`{ "sections": [] }\`.
    *   If the input text cannot be parsed into a meaningful outline (e.g., completely random text), return an object like \`{ "sections": [{ "name": "Error: Could not parse the provided text into a hierarchical outline. Please check formatting and ensure clear indentation." }] }\`.
    *   DO NOT return conversational text or explanations outside the JSON.

Process the provided "{{{textOutline}}}" now. Adhere STRICTLY to all instructions and the JSON output format.
Only output the JSON object. If parsing fails due to ambiguous input, provide the structured error format mentioned above.
`,
});

const parseTextToOutlineFlow = ai.defineFlow(
  {
    name: 'parseTextToOutlineFlow',
    inputSchema: ParseTextToOutlineInputSchema,
    outputSchema: ParseTextToOutlineOutputSchema,
  },
  async (input): Promise<ParseTextToOutlineOutput> => {
    const { userApiKey, aiModel, ...promptData } = input;
    const model = getModel({ aiModel, userApiKey });
    const config = getConfig({ aiModel, userApiKey });

    if (!promptData.textOutline || promptData.textOutline.trim() === '') {
      console.log("parseTextToOutlineFlow: Empty input text, returning empty sections.");
      return { sections: [] };
    }

    try {
      console.log("parseTextToOutlineFlow: Calling AI prompt with text outline:", promptData.textOutline.substring(0, 100) + "...");
      const { output: rawOutput } = await parseTextToOutlinePrompt(promptData, { model, config });

      if (!rawOutput) {
        console.error("parseTextToOutlineFlow: AI returned null or undefined output.");
        return { sections: [{ name: "Error: AI returned no output. Please try again." }], error: "AI returned null output." };
      }

      console.log("parseTextToOutlineFlow: Raw AI output:", JSON.stringify(rawOutput).substring(0, 200) + "...");

      let outputObject: any = rawOutput;
      if (typeof rawOutput === 'string') {
        try {
          outputObject = JSON.parse(rawOutput);
        } catch (jsonParseError) {
          console.error("parseTextToOutlineFlow: Failed to parse AI's string output as JSON.", jsonParseError);
          const errorMsg = `Error: AI output was not valid JSON. Output: ${rawOutput.substring(0,100)}...`;
          return { sections: [{ name: errorMsg }], error: errorMsg };
        }
      }

      const parsedOutput = ParseTextToOutlineOutputSchema.safeParse(outputObject);

      if (!parsedOutput.success) {
        console.error("parseTextToOutlineFlow: Zod validation failed for AI output.", parsedOutput.error.issues);
        const errorMessages = parsedOutput.error.issues.map(issue => `Path: ${issue.path.join('.')}, Message: ${issue.message}`).join('; ');
        const errorMsg = `Error: AI output structure invalid. Details: ${errorMessages.substring(0,150)}...`;
        return { sections: [{ name: errorMsg }], error: errorMsg };
      }

      const validateNamesRecursive = (secs: OutlineSection[]): boolean => {
        return secs.every(s => {
          if (typeof s.name !== 'string' || !s.name.trim()) return false;
          if (s.subSections && !validateNamesRecursive(s.subSections)) return false;
          return true;
        });
      };

      if (!parsedOutput.data.sections || (parsedOutput.data.sections.length > 0 && !validateNamesRecursive(parsedOutput.data.sections))) {
        console.error("parseTextToOutlineFlow: AI parsing returned items without names or invalid section structure after Zod success:", parsedOutput.data);
        const errorMsg = "Error: AI returned an invalid outline (e.g., missing names). Please check text format or simplify.";
        return { sections: [{ name: errorMsg }], error: errorMsg};
      }

      console.log("parseTextToOutlineFlow: Successfully parsed AI output.");
      return parsedOutput.data;

    } catch (error: any) {
      console.error("parseTextToOutlineFlow: Critical error in flow execution:", error);
      let errorMessage = "AI failed to parse the outline. Please check your text format or try again.";
      if (error.message) {
        errorMessage = error.message.substring(0,200);
      }
      return { sections: [{ name: `Error: ${errorMessage}` }], error: errorMessage };
    }
  }
);
