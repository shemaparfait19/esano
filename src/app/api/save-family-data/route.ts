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

    // Sync to family tree
    const treeMembers: any[] = [];
    const treeEdges: any[] = [];

    // Add family heads as tree members
    familyHeads.forEach((head: any) => {
      treeMembers.push({
        id: head.id,
        fullName: head.name,
        birthPlace: undefined,
        photoUrl: undefined,
      });
    });

    // Add family members and create edges
    familyMembers.forEach((member: any) => {
      treeMembers.push({
        id: member.id,
        fullName: member.name,
        birthPlace: member.birthPlace,
        photoUrl: undefined,
      });

      // Create edge based on relationship to user
      const head = familyHeads.find((h: any) => h.id === member.connectedTo);
      if (head) {
        let edgeRelation: string = 'cousin';

        const relationship = member.relationshipToUser.toLowerCase();

        if (relationship.includes('father') || relationship.includes('mother') || relationship.includes('parent')) {
          edgeRelation = 'parent';
        } else if (relationship.includes('brother') || relationship.includes('sister') || relationship.includes('sibling')) {
          edgeRelation = 'sibling';
        } else if (relationship.includes('grandfather') || relationship.includes('grandmother') || relationship.includes('grandparent')) {
          edgeRelation = 'grandparent';
        } else if (relationship.includes('uncle') || relationship.includes('aunt')) {
          edgeRelation = 'cousin';
        } else if (relationship.includes('cousin')) {
          edgeRelation = 'cousin';
        }

        treeEdges.push({
          fromId: head.id,
          toId: member.id,
          relation: edgeRelation,
        });
      }
    });

    // Save to family tree collection
    await adminDb.collection('familyTrees').doc(userId).set(sanitize({
      ownerUserId: userId,
      members: treeMembers,
      edges: treeEdges,
      updatedAt: new Date().toISOString(),
    }));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Error saving family data:', e);
    return NextResponse.json({ error: "Failed to save family information" }, { status: 500 });
  }
}