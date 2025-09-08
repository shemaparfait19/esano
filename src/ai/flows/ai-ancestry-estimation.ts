// This is a Genkit flow that leverages AI to analyze user SNP data and generate a detailed ancestry report with ethnicity estimates and confidence intervals.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AncestryEstimationInputSchema = z.object({
  snpData: z
    .string()
    .describe(
      'A string representing the user SNP data to be analyzed for ancestry estimation.'
    ),
});
export type AncestryEstimationInput = z.infer<typeof AncestryEstimationInputSchema>;

const AncestryEstimationOutputSchema = z.object({
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
  model: 'googleai/gemini-2.5-flash',
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
    const {output} = await ancestryEstimationPrompt(input);
    return output!;
  }
);
