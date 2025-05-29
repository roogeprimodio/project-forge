
// src/app/actions.ts
"use server";
import { generateReportSection, GenerateReportSectionInput } from '@/ai/flows/generate-report-section';
import type { GenerateReportSectionOutput } from '@/ai/flows/generate-report-section';
import { summarizeReportSection, SummarizeReportSectionInput } from '@/ai/flows/summarize-report-section';
import type { SummarizeReportSectionOutput } from '@/ai/flows/summarize-report-section';
import { generateProjectOutline, GenerateProjectOutlineInput } from '@/ai/flows/generate-project-outline';
import type { GenerateProjectOutlineOutput } from '@/ai/flows/generate-project-outline';
import { suggestImprovements, SuggestImprovementsInput } from '@/ai/flows/suggest-improvements';
import type { SuggestImprovementsOutput } from '@/ai/flows/suggest-improvements';
import { generateDiagramMermaid, GenerateDiagramMermaidInput } from '@/ai/flows/generate-diagram-mermaid';
import type { GenerateDiagramMermaidOutput } from '@/ai/flows/generate-diagram-mermaid';

// Import new flows for standard pages
import { generateCoverPage, GenerateCoverPageInput, GenerateCoverPageOutput } from '@/ai/flows/generate-cover-page';
import { generateCertificate, GenerateCertificateInput, GenerateCertificateOutput } from '@/ai/flows/generate-certificate';
import { generateDeclaration, GenerateDeclarationInput, GenerateDeclarationOutput } from '@/ai/flows/generate-declaration';
import { generateAbstract, GenerateAbstractInput, GenerateAbstractOutput } from '@/ai/flows/generate-abstract';
import { generateAcknowledgement, GenerateAcknowledgementInput, GenerateAcknowledgementOutput } from '@/ai/flows/generate-acknowledgement';

// Import new flow for concept explanation
import { explainConcept, ExplainConceptInput } from '@/ai/flows/explain-concept-flow';
import type { ExplainConceptOutput } from '@/types/project';

// Import new flow for image generation
import { generateImageFromPrompt, GenerateImageFromPromptInput, GenerateImageFromPromptOutput } from '@/ai/flows/generate-image-from-prompt-flow';

// Import new flow for parsing text outline
import { parseTextToOutline, ParseTextToOutlineInput, ParseTextToOutlineOutput } from '@/ai/flows/parse-text-to-outline-flow';


/**
 * Server action to generate a report section using the AI flow.
 * Handles potential errors during the AI call.
 */
export async function generateSectionAction(input: GenerateReportSectionInput): Promise<GenerateReportSectionOutput | { error: string }> {
  try {
    console.log("Generating section with input:", input);
    if (!input.projectTitle || !input.sectionName || !input.prompt) {
      return { error: "Project title, section name, and prompt are required for generation." };
    }
    const result = await generateReportSection(input);
    console.log("Generation result:", result);
    return result;
  } catch (error) {
    console.error("Error in generateSectionAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during section generation.";
    return { error: `AI Section Generation Failed: ${errorMessage}` };
  }
}

/**
 * Server action to summarize a report section using the AI flow.
 * Handles potential errors during the AI call.
 */
export async function summarizeSectionAction(input: SummarizeReportSectionInput): Promise<SummarizeReportSectionOutput | { error: string }> {
  try {
    console.log("Summarizing section with input:", { projectTitle: input.projectTitle, sectionTextLength: input.sectionText.length });
    if (!input.sectionText || input.sectionText.trim().length === 0) {
        return { error: "Section content is empty, cannot summarize." };
    }
    const result = await summarizeReportSection(input);
    console.log("Summarization result:", { summaryLength: result.summary.length });
    return result;
  } catch (error) {
    console.error("Error in summarizeSectionAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during section summarization.";
    return { error: `AI Summarization Failed: ${errorMessage}` };
  }
}

/**
 * Server action to generate a project outline (list of sections) using the AI flow.
 * Handles potential errors during the AI call.
 */
export async function generateOutlineAction(input: GenerateProjectOutlineInput): Promise<GenerateProjectOutlineOutput | { error: string }> {
  try {
    console.log("Generating project outline with input:", input);
    if (!input.projectTitle || !input.projectContext) {
      return { error: "Project title and context are required to generate an outline." };
    }
    const result = await generateProjectOutline(input);
    console.log("Outline generation result:", result);

    if (!result || typeof result !== 'object' || !Array.isArray(result.sections)) {
        console.warn("AI outline generation returned unexpected format or fallback. Result:", result);
        return { error: "AI failed to generate a valid outline structure. Please try again or adjust the project context." };
    }
    return result;
  } catch (error) {
    console.error("Error in generateOutlineAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during outline generation.";
    return { error: `AI Outline Generation Failed: ${errorMessage}` };
  }
}

/**
 * Server action to suggest improvements for the project report using the AI flow.
 * Handles potential errors during the AI call.
 */
export async function suggestImprovementsAction(input: SuggestImprovementsInput): Promise<SuggestImprovementsOutput | { error: string }> {
  try {
    console.log("Suggesting improvements with input:", {
        projectTitle: input.projectTitle,
        projectContextLength: input.projectContext?.length,
        allSectionsContentLength: input.allSectionsContent.length,
        focusArea: input.focusArea,
        existingSections: input.existingSections,
        projectType: input.projectType,
    });
    if (!input.allSectionsContent?.trim() && !input.projectContext?.trim()) {
        return { error: "Please provide project context or some section content to get suggestions." };
    }
    const result = await suggestImprovements(input);
    console.log("Suggestion result:", result);
    return result;
  } catch (error) {
    console.error("Error in suggestImprovementsAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while suggesting improvements.";
    return { error: `AI Suggestion Failed: ${errorMessage}` };
  }
}

/**
 * Server action to generate Mermaid diagram code using the AI flow.
 * Handles potential errors during the AI call.
 */
export async function generateDiagramAction(input: GenerateDiagramMermaidInput): Promise<GenerateDiagramMermaidOutput | { error: string }> {
  try {
    console.log("Generating diagram with input:", input);
    if (!input.description?.trim()) {
      return { error: "Diagram description cannot be empty." };
    }
    const result = await generateDiagramMermaid(input);
    console.log("Diagram generation result:", result);
    return result;
  } catch (error) {
    console.error("Error in generateDiagramAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during diagram generation.";
    return { error: `AI Diagram Generation Failed: ${errorMessage}` };
  }
}

// New Server Actions for Standard Pages

export async function generateCoverPageAction(input: GenerateCoverPageInput): Promise<GenerateCoverPageOutput | { error: string }> {
    try {
        console.log("Generating Cover Page with input:", input);
        const result = await generateCoverPage(input);
        return result;
    } catch (error) {
        console.error("Error in generateCoverPageAction:", error);
        return { error: `Failed to generate Cover Page: ${error instanceof Error ? error.message : "Unknown AI error."}` };
    }
}

export async function generateCertificateAction(input: GenerateCertificateInput): Promise<GenerateCertificateOutput | { error: string }> {
    try {
        console.log("Generating Certificate with input:", input);
        const result = await generateCertificate(input);
        return result;
    } catch (error) {
        console.error("Error in generateCertificateAction:", error);
        return { error: `Failed to generate Certificate: ${error instanceof Error ? error.message : "Unknown AI error."}` };
    }
}

export async function generateDeclarationAction(input: GenerateDeclarationInput): Promise<GenerateDeclarationOutput | { error: string }> {
    try {
        console.log("Generating Declaration with input:", input);
        const result = await generateDeclaration(input);
        return result;
    } catch (error) {
        console.error("Error in generateDeclarationAction:", error);
        return { error: `Failed to generate Declaration: ${error instanceof Error ? error.message : "Unknown AI error."}` };
    }
}

export async function generateAbstractAction(input: GenerateAbstractInput): Promise<GenerateAbstractOutput | { error: string }> {
    try {
        console.log("Generating Abstract with input:", input);
         if (!input.projectContext || input.projectContext.trim().length < 50) { // Check from flow
            return { error: "Project context is too short to generate a meaningful abstract. Please provide more details about the project."};
        }
        const result = await generateAbstract(input);
        return result;
    } catch (error) {
        console.error("Error in generateAbstractAction:", error);
        return { error: `Failed to generate Abstract: ${error instanceof Error ? error.message : "Unknown AI error."}` };
    }
}

export async function generateAcknowledgementAction(input: GenerateAcknowledgementInput): Promise<GenerateAcknowledgementOutput | { error: string }> {
    try {
        console.log("Generating Acknowledgement with input:", input);
        const result = await generateAcknowledgement(input);
        return result;
    } catch (error) {
        console.error("Error in generateAcknowledgementAction:", error);
        return { error: `Failed to generate Acknowledgement: ${error instanceof Error ? error.message : "Unknown AI error."}` };
    }
}

/**
 * Server action to explain a concept using the AI flow.
 */
export async function explainConceptAction(input: ExplainConceptInput): Promise<ExplainConceptOutput | { error: string }> {
  try {
    console.log("Explaining concept with input:", { concept: input.concept, projectContextLength: input.projectContext?.length });
    if (!input.concept.trim()) {
      return { error: "Concept to explain cannot be empty." };
    }
    const result = await explainConcept(input);
    console.log("Concept explanation (text & diagram prompts) result:", { title: result.conceptTitle, slidesCount: result.slides.length });
    return result;
  } catch (error) {
    console.error("Error in explainConceptAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during concept explanation.";
    return { error: `AI Concept Explanation Failed: ${errorMessage}` };
  }
}

/**
 * Server action to generate an image for a slide using the AI flow.
 */
export async function generateImageForSlideAction(input: GenerateImageFromPromptInput): Promise<GenerateImageFromPromptOutput> {
    try {
        console.log("Generating image for slide with prompt:", input.prompt);
        if (!input.prompt?.trim()) {
            return { generatedImageUrl: '', error: "Image prompt cannot be empty." };
        }
        const result = await generateImageFromPrompt(input);
        return result;
    } catch (error) {
        console.error("Error in generateImageForSlideAction:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during image generation for slide.";
        return { generatedImageUrl: '', error: `AI Image Generation Failed: ${errorMessage}` };
    }
}

/**
 * Server action to parse a text-based outline using an AI flow.
 */
export async function parseTextOutlineAction(input: ParseTextToOutlineInput): Promise<ParseTextToOutlineOutput | { error: string }> {
  try {
    console.log("Parsing text outline with AI. Text length:", input.textOutline.length);
    if (!input.textOutline.trim()) {
      return { sections: [] }; // Consistent with AI flow's empty input handling
    }
    const result = await parseTextToOutline(input);
     // The flow itself should return { sections: [] } or { sections: [{name: "Error..."}]} on failure.
     // So we just check if 'error' key exists if the action wrapper itself fails.
    if (result && 'error' in result && typeof result.error === 'string') { // Check if the action wrapper caught an error
        return { error: result.error };
    }
    console.log("AI Text outline parsing result:", result);
    return result as ParseTextToOutlineOutput; // Cast because error case is handled above.
  } catch (error) {
    console.error("Error in parseTextOutlineAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during AI text outline parsing.";
    return { error: errorMessage };
  }
}
