import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { AuthService } from '@/services/authService';
import Papa from 'papaparse';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tableParam = searchParams.get('table');

  if (!tableParam) return NextResponse.json({ error: 'Table required' }, { status: 400 });
  const table = tableParam.charAt(0).toLowerCase() + tableParam.slice(1);

  try {
    // @ts-ignore
    const data = await prisma[table].findMany();
    const csv = Papa.unparse(data);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${table}_export_${Date.now()}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { table: tableParam, data, _password } = await request.json();
    const table = tableParam.charAt(0).toLowerCase() + tableParam.slice(1);

    if (!_password) return NextResponse.json({ error: 'Super Admin password required' }, { status: 400 });
    if (!data || !Array.isArray(data) || data.length === 0) return NextResponse.json({ error: 'No data provided' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

    const isPasswordValid = await AuthService.verifyPassword(_password, user.passwordHash);
    if (!isPasswordValid) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

    // Clean data (e.g. converting empty strings to null for optional relations)
    const cleanedData = data.map(row => {
      const cleanRow: any = {};
      Object.keys(row).forEach(key => {
        let val = row[key];
        if (val === '') val = null;
        // Basic type inference for Decimal/Int fields based on simple regex (this is risky in production, but okay for God Mode CSV import)
        if (val !== null && !isNaN(Number(val)) && typeof val === 'string') {
          // Keep as string if it's a known string field, but we don't have schema introspection here easily.
          // Prisma handles string-to-decimal coercing usually, so we can pass strings, except for Int fields.
        }
        cleanRow[key] = val;
      });
      return cleanRow;
    });

    // @ts-ignore
    const result = await prisma[table].createMany({
      data: cleanedData,
      skipDuplicates: true
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SUPER_ADMIN_BULK_IMPORT',
        entity: table,
        entityId: 'BULK',
        afterState: JSON.stringify({ count: result.count })
      }
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    console.error(`Error bulk importing:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
