import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { AuthService } from '@/services/authService';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const modelName = resolvedParams.table;
  const tableName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  
  if (!Object.keys(Prisma.ModelName).includes(modelName)) {
    return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { _password } = body;

    // Verify Password for destructive action
    if (!_password) {
      return NextResponse.json({ error: 'Super Admin password required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

    const isPasswordValid = await AuthService.verifyPassword(_password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Capture count for audit
    // @ts-ignore
    const count = await prisma[tableName].count();

    // Perform Soft Truncate (Set deletedAt to now for all records)
    // NOTE: This assumes the table has a deletedAt column. If it doesn't, this will throw.
    // @ts-ignore
    await prisma[tableName].updateMany({
      data: { deletedAt: new Date() }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SUPER_ADMIN_TRUNCATE',
        entity: tableName,
        entityId: 'ALL',
        beforeState: JSON.stringify({ count }),
        afterState: JSON.stringify({ truncated: true, at: new Date() })
      }
    });

    return NextResponse.json({ success: true, message: `Soft truncated ${count} records.` });
  } catch (error: any) {
    console.error(`Error truncating ${tableName}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
