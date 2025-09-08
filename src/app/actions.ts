'use server';

import { analyzeDnaAndPredictRelatives } from '@/ai/flows/ai-dna-prediction';
import { analyzeAncestry } from '@/ai/flows/ai-ancestry-estimation';
import { getGenerationalInsights } from '@/ai/flows/ai-generational-insights';
import { askGenealogyAssistant } from '@/ai/flows/ai-genealogy-assistant';
import type { AnalyzeDnaAndPredictRelativesInput } from '@/ai/schemas/ai-dna-prediction';
import type { AncestryEstimationInput } from '@/ai/schemas/ai-ancestry-estimation';
import type { GenerationalInsightsInput } from '@/ai/schemas/ai-generational-insights';

// This is a mock database of other users' DNA to match against.
// In a real application, this would come from a database query.
const OTHER_USERS_DNA = [
    'snp_data_user_123_cousin',
    'snp_data_user_456_sibling',
    'snp_data_user_789_unrelated',
];

export async function analyzeDna(dnaData: string) {
    try {
        const dnaInput: AnalyzeDnaAndPredictRelativesInput = { dnaData, otherUsersDnaData: OTHER_USERS_DNA, userFamilyTreeData: 'None' };
        const ancestryInput: AncestryEstimationInput = { snpData: dnaData };
        const insightsInput: GenerationalInsightsInput = { geneticMarkers: dnaData };
        
        const [relatives, ancestry, insights] = await Promise.all([
            analyzeDnaAndPredictRelatives(dnaInput),
            analyzeAncestry(ancestryInput),
            getGenerationalInsights(insightsInput)
        ]);

        return { relatives, ancestry, insights };

    } catch (error) {
        console.error("AI Analysis failed:", error);
        throw new Error("Failed to analyze DNA data. Please try again later.");
    }
}

export async function getAssistantResponse(query: string) {
    try {
        const result = await askGenealogyAssistant({ query });
        return result.response;
    } catch (error) {
        console.error("AI Assistant failed:", error);
        return "I'm sorry, I'm having trouble connecting right now. Please try again later.";
    }
}
