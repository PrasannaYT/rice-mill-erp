import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { 
  SupplierRepository, 
  CustomerRepository,
  ProductRepository,
  GodownRepository,
  VehicleRepository,
  BankRepository,
  LaborerRepository,
  FarmerRepository
} from "@/repositories/masterDataRepository";
import Link from "next/link";
import { Users, Package, Warehouse, Truck, Settings, Coins, ArrowRight, HardHat, Sprout } from "lucide-react";
import { AppHeader } from "@/components/ui/AppHeader";

export const metadata = {
  title: 'Master Data - Rice Mill ERP',
};

export default async function MasterDataPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER' && session.user?.role !== 'MILL_OWNER' && session.user?.role !== 'SUPER_ADMIN')) {
    redirect('/dashboard');
  }

  // Fetch some summary stats
  const [
    suppliersCount,
    customersCount,
    productsCount,
    godownsCount,
    vehiclesCount,
    banksCount,
    laborersCount,
    farmersCount
  ] = await Promise.all([
    SupplierRepository.count(),
    CustomerRepository.count(),
    ProductRepository.count(),
    GodownRepository.count(),
    VehicleRepository.count(),
    BankRepository.count(),
    LaborerRepository.count(),
    FarmerRepository.count()
  ]);

  const cards = [
    { title: "Suppliers & Customers", count: suppliersCount + customersCount, icon: Users, link: "/admin/master-data/people", color: "var(--blue)" },
    { title: "Farmers", count: farmersCount, icon: Sprout, link: "/admin/master-data/farmers", color: "var(--green)" },
    { title: "Laborers & Gangs", count: laborersCount, icon: HardHat, link: "/admin/master-data/laborers", color: "var(--red)" },
    { title: "Products & Yields", count: productsCount, icon: Package, link: "/admin/master-data/products", color: "var(--blue)" },
    { title: "Godowns & Warehouses", count: godownsCount, icon: Warehouse, link: "/admin/master-data/godowns", color: "var(--gold)" },
    { title: "Vehicles & Transport", count: vehiclesCount, icon: Truck, link: "/admin/master-data/vehicles", color: "var(--blue)" },
    { title: "Banks & Finances", count: banksCount, icon: Coins, link: "/admin/master-data/finance", color: "var(--red)" },
  ];

  return (
    <div className="min-h-screen">
      <AppHeader title="Master Data Hub" subtitle="Manage the core entities that power the Rice Mill ERP." breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Master Data'}]} />
      
      <div className="page-wrapper pb-32">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 stagger">
          {cards.map((card) => (
            <Link key={card.title} href={card.link} className="block h-full">
              <div className="card-brutal p-4 sm:p-6 bg-[var(--surface)] h-full flex flex-row sm:flex-col justify-between hover:bg-[var(--surface-2)] transition-colors group animate-fade-up active:translate-y-[2px] active:shadow-none items-center sm:items-start gap-4 sm:gap-0">
                
                {/* Mobile Icon */}
                <div className="sm:hidden w-12 h-12 shrink-0 flex items-center justify-center border-2 border-[var(--border)] shadow-[2px_2px_0px_#0D0D0B] bg-[var(--surface)] group-hover:bg-[var(--gold)] transition-colors">
                  <card.icon className="h-6 w-6 text-[var(--text)]" />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col justify-between h-full min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h2 className="font-display font-black text-sm sm:text-xl uppercase tracking-widest text-[var(--text)] truncate sm:whitespace-normal">
                        {card.title}
                      </h2>
                      <p className="hidden sm:block text-4xl font-black mt-4 tabular-nums" style={{ color: card.color }}>
                        {card.count}
                      </p>
                    </div>
                    {/* Desktop Icon */}
                    <div className="hidden sm:flex w-12 h-12 shrink-0 items-center justify-center border-2 border-[var(--border)] shadow-[2px_2px_0px_#0D0D0B] bg-[var(--surface)] group-hover:bg-[var(--gold)] transition-colors ml-4">
                      <card.icon className="h-6 w-6 text-[var(--text)]" />
                    </div>
                  </div>
                  {/* Desktop Footer */}
                  <div className="hidden sm:flex mt-8 text-[10px] font-black uppercase tracking-widest text-[var(--muted)] items-center group-hover:text-[var(--text)] transition-colors">
                    MANAGE {card.title} <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>

                {/* Mobile Count */}
                <div className="sm:hidden text-2xl font-black tabular-nums shrink-0" style={{ color: card.color }}>
                  {card.count}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
