// This is an AI-powered assistant that can answer questions about genealogy and DNA analysis.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const GenealogyAssistantInputSchema = z.object({
  query: z.string().describe('The user query about genealogy or DNA analysis.'),
});
export type GenealogyAssistantInput = z.infer<typeof GenealogyAssistantInputSchema>;

const GenealogyAssistantOutputSchema = z.string().describe('The AI assistant\'s response to the user query.');
export type GenealogyAssistantOutput = z.infer<typeof GenealogyAssistantOutputSchema>;

export async function askGenealogyAssistant(
  input: GenealogyAssistantInput
): Promise<GenealogyAssistantOutput> {
  return genealogyAssistantFlow(input);
}

const genealogyAssistantPrompt = ai.definePrompt({
  name: 'genealogyAssistantPrompt',
  input: {schema: GenealogyAssistantInputSchema},
  output: {schema: GenealogyAssistantOutputSchema},
  prompt: `You are a helpful AI assistant specialized in genealogy and DNA analysis.

  Your goal is to answer the user's questions accurately and provide guidance on using the application.
  You can also offer proactive suggestions related to genealogy and DNA analysis.

  Here's the user's question:
  {{{query}}}`,
});

const genealogyAssistantFlow = ai.defineFlow(
  {
    name: 'genealogyAssistantFlow',
    inputSchema: GenealogyAssistantInputSchema,
    outputSchema: GenealogyAssistantOutputSchema,
  },
  async (input) => {
    const {output} = await genealogyAssistantPrompt(input, { model: googleAI.model('gemini-1.5-flash') });
    return output!;
  }
);
