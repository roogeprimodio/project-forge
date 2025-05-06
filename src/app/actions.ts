// src/app/actions.ts
"use server";
import { generateReportSection, GenerateReportSectionInput } from '@/ai/flows/generate-report-section';
import type { GenerateReportSectionOutput } from '@/ai/flows/generate-report-section';
import { summarizeReportSection, SummarizeReportSectionInput } from '@/ai/flows/summarize-report-section';
import type { SummarizeReportSectionOutput } from '@/ai/flows/summarize-report-section';
import { generateProjectOutline, GenerateProjectOutlineInput } from '@/ai/flows/generate-project-outline';
import type { GenerateProjectOutlineOutput } from '@/ai/flows/generate-project-outline';
import { suggestImprovements, SuggestImprovementsInput } from '@/ai/flows/suggest-improvements'; // Type SuggestImprovementsInput is already imported
import type { SuggestImprovementsOutput } from '@/ai/flows/suggest-improvements';
import { generateDiagramMermaid, GenerateDiagramMermaidInput } from '@/ai/flows/generate-diagram-mermaid'; // Import diagram flow
import type { GenerateDiagramMermaidOutput } from '@/ai/flows/generate-diagram-mermaid'; // Import diagram flow types

// Import new flows for standard pages
import { generateCoverPage, GenerateCoverPageInput, GenerateCoverPageOutput } from '@/ai/flows/generate-cover-page';
import { generateCertificate, GenerateCertificateInput, GenerateCertificateOutput } from '@/ai/flows/generate-certificate';
import { generateDeclaration, GenerateDeclarationInput, GenerateDeclarationOutput } from '@/ai/flows/generate-declaration';
import { generateAbstract, GenerateAbstractInput, GenerateAbstractOutput } from '@/ai/flows/generate-abstract';
import { generateAcknowledgement, GenerateAcknowledgementInput, GenerateAcknowledgementOutput } from '@/ai/flows/generate-acknowledgement';


/**
 * Server action to generate a report section using the AI flow.
 * Handles potential errors during the AI call.
 */
export async function generateSectionAction(input: GenerateReportSectionInput): Promise<GenerateReportSectionOutput | { error: string }> {
  try {
    console.log("Generating section with input:", input);
    const result = await generateReportSection(input);
    console.log("Generation result:", result);
    return result;
  } catch (error) {
    console.error("Error generating report section:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during section generation.";
    return { error: errorMessage };
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
    console.error("Error summarizing report section:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during section summarization.";
    return { error: errorMessage };
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

    // Check if the result itself is an error object (from the flow's fallback)
    // or if the structure is invalid.
    if (!result || typeof result !== 'object' || !Array.isArray(result.sections)) {
        console.warn("AI outline generation returned unexpected format or fallback. Result:", result);
        return { error: "AI failed to generate a valid outline structure. Please try again or adjust the project context." };
    }
    return result; // Should have the 'sections' key now
  } catch (error) {
    console.error("Error generating project outline:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during outline generation.";
    return { error: errorMessage };
  }
}

/**
 * Server action to suggest improvements for the project report using the AI flow.
 * Handles potential errors during the AI call.
 */
 // Ensure this function accepts the updated SuggestImprovementsInput type
export async function suggestImprovementsAction(input: SuggestImprovementsInput): Promise<SuggestImprovementsOutput | { error: string }> {
  try {
    // Log the enhanced input
    console.log("Suggesting improvements with input:", {
        projectTitle: input.projectTitle,
        projectContextLength: input.projectContext?.length,
        allSectionsContentLength: input.allSectionsContent.length,
        focusArea: input.focusArea,
        existingSections: input.existingSections,
        projectType: input.projectType,
    });
    const result = await suggestImprovements(input);
    console.log("Suggestion result:", result);
    return result;
  } catch (error) {
    console.error("Error suggesting improvements:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while suggesting improvements.";
    return { error: errorMessage };
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
    console.error("Error generating diagram:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during diagram generation.";
    return { error: errorMessage };
  }
}

// New Server Actions for Standard Pages

export async function generateCoverPageAction(input: GenerateCoverPageInput): Promise<GenerateCoverPageOutput | { error: string }> {
    try {
        const result = await generateCoverPage(input);
        return result;
    } catch (error) {
        console.error("Error generating cover page:", error);
        return { error: error instanceof Error ? error.message : "Failed to generate cover page." };
    }
}

export async function generateCertificateAction(input: GenerateCertificateInput): Promise<GenerateCertificateOutput | { error: string }> {
    try {
        const result = await generateCertificate(input);
        return result;
    } catch (error) {
        console.error("Error generating certificate:", error);
        return { error: error instanceof Error ? error.message : "Failed to generate certificate." };
    }
}

export async function generateDeclarationAction(input: GenerateDeclarationInput): Promise<GenerateDeclarationOutput | { error: string }> {
    try {
        const result = await generateDeclaration(input);
        return result;
    } catch (error) {
        console.error("Error generating declaration:", error);
        return { error: error instanceof Error ? error.message : "Failed to generate declaration." };
    }
}

export async function generateAbstractAction(input: GenerateAbstractInput): Promise<GenerateAbstractOutput | { error: string }> {
    try {
        const result = await generateAbstract(input);
        return result;
    } catch (error) {
        console.error("Error generating abstract:", error);
        return { error: error instanceof Error ? error.message : "Failed to generate abstract." };
    }
}

export async function generateAcknowledgementAction(input: GenerateAcknowledgementInput): Promise<GenerateAcknowledgementOutput | { error: string }> {
    try {
        const result = await generateAcknowledgement(input);
        return result;
    } catch (error) {
        console.error("Error generating acknowledgement:", error);
        return { error: error instanceof Error ? error.message : "Failed to generate acknowledgement." };
    }
}
