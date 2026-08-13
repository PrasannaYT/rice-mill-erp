import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { AuthService } from '@/services/authService';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ table: string, id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const modelName = resolvedParams.table;
  const tableName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const id = resolvedParams.id;
  
  if (!Object.keys(Prisma.ModelName).includes(modelName)) {
    return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { _password, ...updateData } = body;

    // Verify Password for destructive/super-admin actions
    if (!_password) {
      return NextResponse.json({ error: 'Super Admin password required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

    const isPasswordValid = await AuthService.verifyPassword(_password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Capture before state for audit log
    // @ts-ignore
    const beforeState = await prisma[tableName].findUnique({ where: { id } }).catch(() => null);

    // Perform Update
    // @ts-ignore
    const updatedRecord = await prisma[tableName].update({
      where: { id },
      data: updateData
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SUPER_ADMIN_RAW_UPDATE',
        entity: tableName,
        entityId: id,
        beforeState: beforeState ? JSON.stringify(beforeState) : null,
        afterState: JSON.stringify(updatedRecord)
      }
    });

    return NextResponse.json({ success: true, data: updatedRecord });
  } catch (error: any) {
    console.error(`Error updating ${tableName}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
