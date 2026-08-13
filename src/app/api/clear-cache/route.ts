import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  revalidatePath('/admin/reports');
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
