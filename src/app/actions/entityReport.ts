'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ReportService } from "@/services/reportService";

async function checkAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Unauthorized");
  }
  const allowedRoles = ['ADMIN', 'MANAGER', 'MILL_OWNER', 'SUPER_ADMIN'];
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error("Forbidden: Insufficient privileges");
  }
  return session;
}

export async function getEntityReportAction(
  mode: 'PURCHASES' | 'SALES',
  periodType: 'MONTHLY' | 'YEARLY',
  periodValue: string
) {
  await checkAuth();
  
  try {
    const data = await ReportService.getEntityLedgerData({ mode, periodType, periodValue });
    return data;
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch entity report data");
  }
}
