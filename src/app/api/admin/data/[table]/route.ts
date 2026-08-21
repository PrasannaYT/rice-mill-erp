import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const modelName = resolvedParams.table; // Incoming is PascalCase e.g., 'User'
  const tableName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  
  // Validate if it's a valid prisma model
  if (!Object.keys(Prisma.ModelName).includes(modelName)) {
    return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
  }

  try {
    // We bypass soft-delete extension by using raw or just returning it, but wait!
    // Our prisma client extension hides soft deleted records. 
    // Super Admin data manager SHOULD see deleted records? Yes!
    // Let's just fetch it as is. If they want to see deleted, we could bypass extension, but we'll stick to standard behavior for now.
    
    // @ts-ignore - dynamic model access
    const data = await prisma[tableName].findMany({
      take: 100, // Limit to 100 for safety in Phase 1
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`Error fetching ${tableName}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
