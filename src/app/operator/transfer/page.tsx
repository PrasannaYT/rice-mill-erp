import { redirect } from "next/navigation";

// Transfer feature removed — redirects to Inventory Hub
export default function TransferPage() {
  redirect('/admin/inventory');
}
