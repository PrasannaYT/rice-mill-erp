import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { AuthService } from '@/services/authService';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { logId, _password } = await request.json();

    if (!_password) {
      return NextResponse.json({ error: 'Super Admin password required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

    const isPasswordValid = await AuthService.verifyPassword(_password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const log = await prisma.auditLog.findUnique({ where: { id: logId } });
    if (!log) return NextResponse.json({ error: 'Audit log not found' }, { status: 404 });
    
    if (log.isReverted) {
      return NextResponse.json({ error: 'Action already reverted' }, { status: 400 });
    }

    const tableName = log.entity;
    
    // Check if it's a valid prisma model
    const prismaModels = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
    if (!prismaModels.includes(tableName)) {
      return NextResponse.json({ error: `Cannot revert. Entity ${tableName} is not recognized as a Prisma model.` }, { status: 400 });
    }

    if (log.action === 'SUPER_ADMIN_TRUNCATE') {
      // Revert Truncate (Undelete)
      const afterState = JSON.parse(log.afterState || '{}');
      if (afterState.at) {
        // @ts-ignore
        await prisma[tableName].updateMany({
          where: { deletedAt: new Date(afterState.at) },
          data: { deletedAt: null }
        });
      } else {
        // Fallback: undelete all
        // @ts-ignore
        await prisma[tableName].updateMany({
          data: { deletedAt: null }
        });
      }
    } else if (log.action === 'SUPER_ADMIN_RAW_UPDATE' || log.beforeState) {
      // Revert single record update or delete
      const beforeState = JSON.parse(log.beforeState || '{}');
      if (log.entityId && log.entityId !== 'ALL') {
        // Remove relationships and immutable fields from beforeState before updating
        delete beforeState.createdAt;
        delete beforeState.updatedAt;
        
        // Ensure deletedAt is correctly mapped if reverting a delete
        if (beforeState.deletedAt === undefined) beforeState.deletedAt = null;

        // @ts-ignore
        await prisma[tableName].update({
          where: { id: log.entityId },
          data: beforeState
        });
      }
    } else {
      return NextResponse.json({ error: 'Unrecognized action type for reversal' }, { status: 400 });
    }

    // Mark as reverted
    await prisma.auditLog.update({
      where: { id: logId },
      data: { isReverted: true }
    });
    
    // Log the reversal action itself!
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SUPER_ADMIN_REVERT',
        entity: 'AuditLog',
        entityId: logId,
        beforeState: JSON.stringify({ isReverted: false }),
        afterState: JSON.stringify({ isReverted: true })
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error reverting action:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
