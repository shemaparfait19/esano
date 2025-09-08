'use server';

import { analyzeDnaAndPredictRelatives } from '@/ai/flows/ai-dna-prediction';
import { analyzeAncestry } from '@/ai/flows/ai-ancestry-estimation';
import { getGenerationalInsights } from '@/ai/flows/ai-generational-insights';
import { askGenealogyAssistant } from '@/ai/flows/ai-genealogy-assistant';
import type { AnalyzeDnaAndPredictRelativesInput } from '@/ai/schemas/ai-dna-prediction';
import type { AncestryEstimationInput } from '@/ai/schemas/ai-ancestry-estimation';
import type { GenerationalInsightsInput } from '@/ai/schemas/ai-generational-insights';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/types/firestore';

export async function analyzeDna(userId: string, dnaData: string, fileName: string) {
    try {
        // 1. Get other users' DNA data from Firestore
        const usersCollection = collection(db, 'users');
        const querySnapshot = await getDocs(usersCollection);
        const otherUsersDnaData = querySnapshot.docs
            .map(doc => doc.data() as UserProfile)
            .filter(user => user.dnaData && doc.id !== userId) // Filter out users without DNA data and the current user
            .map(user => user.dnaData!);

        // 2. Prepare inputs for AI flows
        const dnaInput: AnalyzeDnaAndPredictRelativesInput = { dnaData, otherUsersDnaData, userFamilyTreeData: 'None' };
        const ancestryInput: AncestryEstimationInput = { snpData: dnaData };
        const insightsInput: GenerationalInsightsInput = { geneticMarkers: dnaData };
        
        // 3. Run AI analysis in parallel
        const [relatives, ancestry, insights] = await Promise.all([
            analyzeDnaAndPredictRelatives(dnaInput),
            analyzeAncestry(ancestryInput),
            getGenerationalInsights(insightsInput)
        ]);

        // 4. Save new user profile and results to Firestore
        const userProfile: UserProfile = {
            userId,
            dnaData,
            dnaFileName: fileName,
            analysis: {
                relatives,
                ancestry,
                insights,
                completedAt: new Date().toISOString(),
            }
        };

        // Use the authenticated userId as the document ID
        await setDoc(doc(db, 'users', userId), userProfile, { merge: true });


        return { relatives, ancestry, insights };

    } catch (error) {
        console.error("AI Analysis or Firestore operation failed:", error);
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
