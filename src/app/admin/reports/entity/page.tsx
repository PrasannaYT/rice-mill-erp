import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import EntityReportClient from "@/components/reports/EntityReportClient";

export const metadata = {
  title: 'Entity Reports — Rice Mill ERP',
};

export default async function EntityReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER' && session.user?.role !== 'MILL_OWNER' && session.user?.role !== 'SUPER_ADMIN')) {
    redirect('/dashboard');
  }

  return <EntityReportClient />;
}
