import { NextResponse } from "next/server";
import { askGenealogyAssistant } from "@/ai/flows/ai-genealogy-assistant";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }
    const result = await askGenealogyAssistant({ query });
    return NextResponse.json({ response: result.response });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Assistant unavailable" },
      { status: 500 }
    );
  }
}
