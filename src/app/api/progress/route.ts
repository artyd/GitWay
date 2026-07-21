import { NextRequest, NextResponse } from "next/server";
import { getProgress, saveModuleComplete } from "@/lib/store";

export async function GET(req: NextRequest) {
  const profile = req.nextUrl.searchParams.get("profile");
  if (!profile) {
    return NextResponse.json({ error: "profile is required" }, { status: 400 });
  }
  const progress = await getProgress(profile);
  return NextResponse.json(progress);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { profile, moduleSlug, quizScore } = body as {
    profile?: string;
    moduleSlug?: string;
    quizScore?: number;
  };

  if (!profile || !moduleSlug) {
    return NextResponse.json(
      { error: "profile and moduleSlug are required" },
      { status: 400 }
    );
  }

  const progress = await saveModuleComplete(profile, moduleSlug, quizScore);
  return NextResponse.json(progress);
}
