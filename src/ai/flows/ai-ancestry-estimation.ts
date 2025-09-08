'use server';
/**
 * @fileOverview This file defines a Genkit flow for AI-powered ancestry estimation.
 *
 * It includes:
 * - analyzeAncestry: An async function to initiate ancestry analysis.
 * - AncestryEstimationInput: The input type for the analyzeAncestry function.
 * - AncestryEstimationOutput: The output type for the analyzeAncestry function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const AncestryEstimationInputSchema = z.object({
  snpData: z
    .string()
    .describe(
      'A string representing the user SNP data to be analyzed for ancestry estimation.'
    ),
});
export type AncestryEstimationInput = z.infer<typeof AncestryEstimationInputSchema>;

export const AncestryEstimationOutputSchema = z.object({
  ethnicityEstimates: z
    .string()
    .describe(
      'A detailed report of ethnicity estimates with confidence intervals.'
    ),
});
export type AncestryEstimationOutput = z.infer<typeof AncestryEstimationOutputSchema>;

export async function analyzeAncestry(
  input: AncestryEstimationInput
): Promise<AncestryEstimationOutput> {
  return analyzeAncestryFlow(input);
}

const ancestryEstimationPrompt = ai.definePrompt({
  name: 'ancestryEstimationPrompt',
  input: {schema: AncestryEstimationInputSchema},
  output: {schema: AncestryEstimationOutputSchema},
  prompt: `Analyze the following SNP data and generate a detailed ancestry report with ethnicity estimates and confidence intervals. Ensure that the ethnicity estimates are as accurate as possible and provide confidence intervals for each estimate.

SNP Data: {{{snpData}}}`,
});

const analyzeAncestryFlow = ai.defineFlow(
  {
    name: 'analyzeAncestryFlow',
    inputSchema: AncestryEstimationInputSchema,
    outputSchema: AncestryEstimationOutputSchema,
  },
  async input => {
    const {output} = await ancestryEstimationPrompt(input, { model: googleAI.model('gemini-1.5-flash') });
    return output!;
  }
);
