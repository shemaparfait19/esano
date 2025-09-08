'use server';

/**
 * @fileOverview This file defines a Genkit flow for AI-powered DNA analysis and relative matching.
 *
 * It includes:
 * - `analyzeDnaAndPredictRelatives`: An async function to initiate DNA analysis and predict relatives.
 * - `AnalyzeDnaAndPredictRelativesInput`: The input type for the analyzeDnaAndPredictRelatives function, defining the structure of the DNA data to be analyzed.
 * - `AnalyzeDnaAndPredictRelativesOutput`: The output type for the analyzeDnaAndPredictRelatives function, defining the structure of the predicted relative matches.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeDnaAndPredictRelativesInputSchema = z.object({
  dnaData: z.string().describe('The user DNA data in a standardized format.'),
  otherUsersDnaData: z
    .array(z.string())
    .describe('Array of other consented users DNA data in the database.'),
  userFamilyTreeData: z
    .string() // Assuming family tree data can be represented as a string (e.g., JSON or similar)
    .optional()
    .describe('User family tree data, if available, to help identify common ancestors.'),
});

export type AnalyzeDnaAndPredictRelativesInput = z.infer<
  typeof AnalyzeDnaAndPredictRelativesInputSchema
>;

const PredictedRelativeSchema = z.object({
  userId: z.string().describe('The ID of the potential relative.'),
  predictedRelationship: z
    .string()
    .describe('The predicted relationship to the user (e.g., 2nd cousin).'),
  relationshipProbability: z
    .number()
    .describe('The probability of the predicted relationship.'),
  commonAncestors: z
    .array(z.string())
    .optional()
    .describe('List of common ancestors, if identified.'),
  sharedCentimorgans: z
    .number()
    .optional()
    .describe('The amount of shared DNA in centimorgans.'),
});

const AnalyzeDnaAndPredictRelativesOutputSchema = z.array(
  PredictedRelativeSchema
);

export type AnalyzeDnaAndPredictRelativesOutput = z.infer<
  typeof AnalyzeDnaAndPredictRelativesOutputSchema
>;

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
    const {output} = await analyzeDnaAndPredictRelativesPrompt(input);
    return output!;
  }
);
