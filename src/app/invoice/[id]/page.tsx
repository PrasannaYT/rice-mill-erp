import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import InvoicePrintView from "@/components/InvoicePrintView";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  const invoice = await prisma.salesInvoice.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      items: {
        include: {
          product: true,
        }
      }
    }
  });

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Invoice Not Found</h2>
          <p className="text-gray-600">The requested invoice could not be found.</p>
        </div>
      </div>
    );
  }

  // Passing data down to the client component for rendering and inline editing
  const safeInvoice = JSON.parse(JSON.stringify(invoice));
  return <InvoicePrintView invoice={safeInvoice} />;
}
