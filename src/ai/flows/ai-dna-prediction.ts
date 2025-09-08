'use server';

/**
 * @fileOverview This file defines a Genkit flow for AI-powered DNA analysis and relative matching.
 *
 * It includes:
 * - `analyzeDnaAndPredictRelatives`: An async function to initiate DNA analysis and predict relatives.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {
  AnalyzeDnaAndPredictRelativesInputSchema,
  AnalyzeDnaAndPredictRelativesOutputSchema,
  type AnalyzeDnaAndPredictRelativesInput,
  type AnalyzeDnaAndPredictRelativesOutput,
} from '@/ai/schemas/ai-dna-prediction';

export async function analyzeDnaAndPredictRelatives(
  input: AnalyzeDnaAndPredictRelativesInput
): Promise<AnalyzeDnaAndPredictRelativesOutput> {
  return analyzeDnaAndPredictRelativesFlow(input);
}

const analyzeDnaAndPredictRelativesPrompt = ai.definePrompt({
  name: 'analyzeDnaAndPredictRelativesPrompt',
  input: {schema: AnalyzeDnaAndPredictRelativesInputSchema},
  output: {schema: AnalyzeDnaAndPredictRelativesOutputSchema},
  prompt: `You are an expert in genetic analysis and genealogy. Given a user's DNA data and the DNA data of other users, identify potential relatives, estimate the relationship probabilities, and identify possible common ancestors.

User DNA Data: {{{dnaData}}}

Other Users DNA Data: {{#each otherUsersDnaData}}{{{this}}}\n{{/each}}

{{#if userFamilyTreeData}}
User Family Tree Data: {{{userFamilyTreeData}}}
{{/if}}

Based on this information, predict potential relatives, estimate relationship probabilities, and identify possible common ancestors. Return an array of predicted relatives with their user IDs, predicted relationships, relationship probabilities, and (if available) a list of common ancestors and the amount of shared DNA.

Ensure that the output is a valid JSON array conforming to the AnalyzeDnaAndPredictRelativesOutputSchema schema.`,
});

const analyzeDnaAndPredictRelativesFlow = ai.defineFlow(
  {
    name: 'analyzeDnaAndPredictRelativesFlow',
    inputSchema: AnalyzeDnaAndPredictRelativesInputSchema,
    outputSchema: AnalyzeDnaAndPredictRelativesOutputSchema,
  },
  async input => {
    const {output} = await analyzeDnaAndPredictRelativesPrompt(input, { model: googleAI.model('gemini-1.5-flash') });
    return output!;
  }
);
