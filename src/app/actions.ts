// src/app/actions.ts
"use server";
import { generateReportSection, GenerateReportSectionInput } from '@/ai/flows/generate-report-section';
import type { GenerateReportSectionOutput } from '@/ai/flows/generate-report-section';
import { summarizeReportSection, SummarizeReportSectionInput } from '@/ai/flows/summarize-report-section';
import type { SummarizeReportSectionOutput } from '@/ai/flows/summarize-report-section';
import { generateTableOfContents, GenerateTableOfContentsInput } from '@/ai/flows/generate-table-of-contents';
import type { GenerateTableOfContentsOutput } from '@/ai/flows/generate-table-of-contents';
import { generateProjectOutline, GenerateProjectOutlineInput } from '@/ai/flows/generate-project-outline'; // Import new flow
import type { GenerateProjectOutlineOutput } from '@/ai/flows/generate-project-outline'; // Import new flow types


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
    // Check if the error has a specific structure from Genkit or API response
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
 * Server action to generate a table of contents using the AI flow.
 * Handles potential errors during the AI call.
 */
export async function generateTocAction(input: GenerateTableOfContentsInput): Promise<GenerateTableOfContentsOutput | { error: string }> {
  try {
    console.log("Generating Table of Contents with input content length:", input.reportContent.length);
    if (!input.reportContent || input.reportContent.trim().length === 0) {
      return { error: "Report content is empty, cannot generate Table of Contents." };
    }
    const result = await generateTableOfContents(input);
    console.log("Table of Contents generation result:", { tocLength: result.tableOfContents.length });
    return result;
  } catch (error) {
    console.error("Error generating Table of Contents:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during Table of Contents generation.";
    return { error: errorMessage };
  }
}

/**
 * Server action to generate a project outline using the AI flow.
 * Handles potential errors during the AI call.
 */
export async function generateOutlineAction(input: GenerateProjectOutlineInput): Promise<GenerateProjectOutlineOutput | { error: string }> {
  try {
    console.log("Generating project outline with input:", input);
    if (!input.projectTitle || !input.projectContext) {
      // Basic validation, more robust checks might be needed
      return { error: "Project title and context are required to generate an outline." };
    }
    const result = await generateProjectOutline(input);
    console.log("Outline generation result:", result);
    return result;
  } catch (error) {
    console.error("Error generating project outline:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during outline generation.";
    return { error: errorMessage };
  }
}
