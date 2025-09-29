import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

function sanitize<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => sanitize(v)) as any;
  if (value && typeof value === "object") {
    const out: any = {};
    Object.entries(value as any).forEach(([k, v]) => {
      if (v === undefined) return;
      out[k] = sanitize(v as any);
    });
    return out;
  }
  return value;
}

export async function POST(req: Request) {
  try {
    const { familyHeads, familyMembers, userId } = await req.json();
    if (!userId || !familyHeads || !familyMembers) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Save to familyData
    const dataToSave = {
      familyHeads,
      familyMembers,
      updatedAt: new Date().toISOString(),
    };
    await adminDb.collection('familyData').doc(userId).set(sanitize(dataToSave));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Error saving family data:', e);
    return NextResponse.json({ error: "Failed to save family information" }, { status: 500 });
  }
}