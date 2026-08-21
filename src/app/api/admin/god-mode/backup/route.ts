import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { AuthService } from '@/services/authService';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = util.promisify(exec);

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { _password } = await request.json();

    if (!_password) {
      return NextResponse.json({ error: 'Super Admin password required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

    const isPasswordValid = await AuthService.verifyPassword(_password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json({ error: 'DATABASE_URL not configured.' }, { status: 500 });
    }

    // Ensure backups directory exists
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = `snp_${Date.now()}.sql`;
    const filepath = path.join(backupDir, filename);

    // Note: This requires pg_dump to be installed on the host OS.
    // In a fully serverless environment (e.g. Vercel), this will throw 'command not found'.
    await execAsync(`pg_dump "${dbUrl}" -F c -f "${filepath}"`);

    const stats = fs.statSync(filepath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';

    // Log the backup action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SUPER_ADMIN_SNAPSHOT',
        entity: 'Database',
        entityId: 'ALL',
        afterState: JSON.stringify({ filename, size: sizeMB })
      }
    });

    return NextResponse.json({ success: true, filename, size: sizeMB });
  } catch (error: any) {
    console.error(`Error creating snapshot:`, error);
    
    // Check if it's a pg_dump not found error
    if (error.message?.includes('not found') || error.message?.includes('not recognized')) {
      return NextResponse.json({ 
        error: 'pg_dump is not installed on the host server environment. Manual backups via Supabase dashboard recommended.' 
      }, { status: 501 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
