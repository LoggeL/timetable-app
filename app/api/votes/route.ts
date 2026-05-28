import { NextResponse } from "next/server";
import { readVotes, toggleVote } from "@/lib/votes";

export async function GET() {
  return NextResponse.json(await readVotes());
}

export async function POST(request: Request) {
  const body = (await request.json()) as { actId?: string; name?: string };
  if (!body.actId || !body.name?.trim()) {
    return NextResponse.json({ error: "actId and name are required" }, { status: 400 });
  }

  return NextResponse.json(await toggleVote(body.actId, body.name));
}
