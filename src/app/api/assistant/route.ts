import { NextResponse } from "next/server";
import { askGenealogyAssistant } from "@/ai/flows/ai-genealogy-assistant";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export const runtime = "nodejs"; // ensure Node runtime (not edge)
export const dynamic = "force-dynamic"; // avoid caching

async function withRetry<T>(fn: () => Promise<T>, tries = 2) {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw lastErr;
}

export async function POST(req: Request) {
  try {
    const { query, userId } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not set on server" },
        { status: 500 }
      );
    }

    // Gather optional user context (profile + tiny tree)
    let userContext = undefined as string | undefined;
    if (userId && typeof userId === "string") {
      try {
        const [profileSnap, treeSnap] = await Promise.all([
          getDoc(doc(db, "users", userId)),
          getDoc(doc(db, "familyTrees", userId)),
        ]);
        const profile = profileSnap.exists() ? profileSnap.data() : undefined;
        const tree = treeSnap.exists() ? treeSnap.data() : undefined;
        // Keep context concise
        const ctx = {
          profile: profile
            ? {
                fullName: profile.fullName,
                birthPlace: profile.birthPlace,
                clanOrCulturalInfo: profile.clanOrCulturalInfo,
                relativesNames: profile.relativesNames,
              }
            : undefined,
          tree: tree
            ? {
                members: Array.isArray((tree as any).members)
                  ? (tree as any).members.slice(0, 30)
                  : [],
                edges: Array.isArray((tree as any).edges)
                  ? (tree as any).edges.slice(0, 60)
                  : [],
              }
            : undefined,
        };
        userContext = JSON.stringify(ctx);
      } catch {}
    }

    const result = await withRetry(() =>
      askGenealogyAssistant({ query, userContext })
    );
    return NextResponse.json({ response: result.response });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Assistant unavailable", detail: e?.message ?? "" },
      { status: 500 }
    );
  }
}
