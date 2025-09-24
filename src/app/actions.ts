"use server";

import { analyzeDnaAndPredictRelatives } from "@/ai/flows/ai-dna-prediction";
import { analyzeAncestry } from "@/ai/flows/ai-ancestry-estimation";
import { getGenerationalInsights } from "@/ai/flows/ai-generational-insights";
import { askGenealogyAssistant } from "@/ai/flows/ai-genealogy-assistant";
import type { AnalyzeDnaAndPredictRelativesInput } from "@/ai/schemas/ai-dna-prediction";
import type { AncestryEstimationInput } from "@/ai/schemas/ai-ancestry-estimation";
import type { GenerationalInsightsInput } from "@/ai/schemas/ai-generational-insights";
import { db } from "@/lib/firebase";
import {
  collection,
  doc as fsDoc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import type {
  UserProfile,
  ConnectionRequest,
  ConnectionRequestStatus,
  FamilyTree,
  FamilyTreeMember,
  FamilyTreeEdge,
} from "@/types/firestore";

async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 2,
  baseDelayMs = 500
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-throw-literal
  throw lastError;
}

export async function analyzeDna(
  userId: string,
  dnaData: string,
  fileName: string
) {
  try {
    // 1. Get other users' DNA data from Firestore
    const usersCollection = collection(db, "users");
    const querySnapshot = await getDocs(usersCollection);
    const otherUsersDnaData = querySnapshot.docs
      .map((d) => ({ id: d.id, data: d.data() as UserProfile }))
      .filter(({ id, data }) => id !== userId && !!data.dnaData)
      .map(({ data }) => data.dnaData!)
      .slice(0, 50); // cap to reasonable size for prompt safety

    // 2. Prepare inputs for AI flows
    const dnaInput: AnalyzeDnaAndPredictRelativesInput = {
      dnaData,
      otherUsersDnaData,
      userFamilyTreeData: "None",
    };
    const ancestryInput: AncestryEstimationInput = { snpData: dnaData };
    const insightsInput: GenerationalInsightsInput = {
      geneticMarkers: dnaData,
    };

    // 3. Run AI analysis in parallel
    const [relatives, ancestry, insights] = await Promise.all([
      withRetry(() => analyzeDnaAndPredictRelatives(dnaInput)),
      withRetry(() => analyzeAncestry(ancestryInput)),
      withRetry(() => getGenerationalInsights(insightsInput)),
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
      },
    };

    // Use the authenticated userId as the document ID
    await setDoc(fsDoc(db, "users", userId), userProfile, { merge: true });

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

export type SaveProfileInput = {
  userId: string;
  fullName: string;
  birthDate?: string;
  birthPlace?: string;
  clanOrCulturalInfo?: string;
  relativesNames?: string[];
};

export async function saveUserProfile(input: SaveProfileInput) {
  const {
    userId,
    fullName,
    birthDate,
    birthPlace,
    clanOrCulturalInfo,
    relativesNames,
  } = input;
  if (!userId || !fullName) {
    throw new Error("Missing required fields");
  }
  const nowIso = new Date().toISOString();
  const partial: Partial<UserProfile> = {
    userId,
    fullName,
    birthDate,
    birthPlace,
    clanOrCulturalInfo,
    relativesNames: relativesNames?.filter(Boolean) ?? [],
    profileCompleted: true,
    updatedAt: nowIso,
  };
  await setDoc(fsDoc(db, "users", userId), partial, { merge: true });
  return { ok: true } as const;
}

export type SuggestedMatch = {
  userId: string;
  fullName?: string;
  score: number; // 0..1
  reasons: string[];
};

export async function getSuggestedMatches(
  currentUserId: string
): Promise<SuggestedMatch[]> {
  // Simple heuristic suggestions based on profile overlap (non-DNA)
  const currentDoc = await getDoc(fsDoc(db, "users", currentUserId));
  if (!currentDoc.exists()) return [];
  const me = currentDoc.data() as UserProfile;
  const usersSnapshot = await getDocs(collection(db, "users"));

  const suggestions: SuggestedMatch[] = [];
  for (const d of usersSnapshot.docs) {
    const otherId = d.id;
    if (otherId === currentUserId) continue;
    const other = d.data() as UserProfile;

    let score = 0;
    const reasons: string[] = [];

    // Name overlap (very naive)
    const myNames = (me.relativesNames ?? []).map((n) => n.toLowerCase());
    const otherNames = (other.relativesNames ?? []).map((n) => n.toLowerCase());
    const sharedNames = myNames.filter((n) => otherNames.includes(n));
    if (sharedNames.length > 0) {
      score += Math.min(0.4, sharedNames.length * 0.1);
      reasons.push(`Shared relatives: ${sharedNames.slice(0, 3).join(", ")}`);
    }

    // Birth place match
    if (
      me.birthPlace &&
      other.birthPlace &&
      me.birthPlace.toLowerCase() === other.birthPlace.toLowerCase()
    ) {
      score += 0.25;
      reasons.push("Same birth place");
    }

    // Clan / cultural info match
    if (
      me.clanOrCulturalInfo &&
      other.clanOrCulturalInfo &&
      me.clanOrCulturalInfo.toLowerCase() ===
        other.clanOrCulturalInfo.toLowerCase()
    ) {
      score += 0.25;
      reasons.push("Matching clan/cultural info");
    }

    // Full name fuzzy contains
    if (me.fullName && other.fullName) {
      const a = me.fullName.toLowerCase();
      const b = other.fullName.toLowerCase();
      if (a.includes(b) || b.includes(a)) {
        score += 0.1;
        reasons.push("Similar full name");
      }
    }

    if (score > 0) {
      suggestions.push({
        userId: otherId,
        fullName: other.fullName,
        score: Math.min(1, score),
        reasons,
      });
    }
  }

  suggestions.sort((x, y) => y.score - x.score);
  return suggestions.slice(0, 9);
}

// Connection Requests
export async function sendConnectionRequest(
  fromUserId: string,
  toUserId: string
) {
  if (!fromUserId || !toUserId || fromUserId === toUserId) {
    throw new Error("Invalid users");
  }
  const id = `${fromUserId}_${toUserId}`;
  const req: ConnectionRequest = {
    fromUserId,
    toUserId,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await setDoc(fsDoc(db, "connectionRequests", id), req, { merge: true });
  return { ok: true } as const;
}

export async function respondToConnectionRequest(
  id: string,
  status: ConnectionRequestStatus
) {
  if (!["accepted", "declined"].includes(status)) {
    throw new Error("Invalid status");
  }
  await setDoc(
    fsDoc(db, "connectionRequests", id),
    { status, respondedAt: new Date().toISOString() },
    { merge: true }
  );
  return { ok: true } as const;
}

export async function getMyConnectionRequests(userId: string) {
  const snap = await getDocs(collection(db, "connectionRequests"));
  const all = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as ConnectionRequest),
  }));
  const incoming = all.filter(
    (r) => r.toUserId === userId && r.status === "pending"
  );
  const outgoing = all.filter(
    (r) => r.fromUserId === userId && r.status === "pending"
  );
  return { incoming, outgoing };
}

// Family Tree actions
export async function getFamilyTree(ownerUserId: string): Promise<FamilyTree> {
  const ref = fsDoc(db, "familyTrees", ownerUserId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as FamilyTree;
  }
  const empty: FamilyTree = {
    ownerUserId,
    members: [],
    edges: [],
    updatedAt: new Date().toISOString(),
  };
  await setDoc(ref, empty, { merge: true });
  return empty;
}

export async function addFamilyMember(
  ownerUserId: string,
  member: FamilyTreeMember
): Promise<FamilyTree> {
  const tree = await getFamilyTree(ownerUserId);
  const updated: FamilyTree = {
    ...tree,
    members: [...tree.members.filter((m) => m.id !== member.id), member],
    updatedAt: new Date().toISOString(),
  };
  await setDoc(fsDoc(db, "familyTrees", ownerUserId), updated, { merge: true });
  return updated;
}

export async function linkFamilyRelation(
  ownerUserId: string,
  edge: FamilyTreeEdge
): Promise<FamilyTree> {
  const tree = await getFamilyTree(ownerUserId);
  const withoutDup = tree.edges.filter(
    (e) =>
      !(
        e.fromId === edge.fromId &&
        e.toId === edge.toId &&
        e.relation === edge.relation
      )
  );
  const updated: FamilyTree = {
    ...tree,
    edges: [...withoutDup, edge],
    updatedAt: new Date().toISOString(),
  };
  await setDoc(fsDoc(db, "familyTrees", ownerUserId), updated, { merge: true });
  return updated;
}
