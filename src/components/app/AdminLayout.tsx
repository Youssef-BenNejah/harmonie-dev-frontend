import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  ChevronDown,
  Coins,
  Crown,
  FileMinus,
  FileText,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Percent,
  PieChart,
  Receipt,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
  User,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { NotificationsBell } from "@/components/app/NotificationsBell";
import { getMyPlanUsage, logout, useCurrentUser } from "@/lib/api";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/personnes", label: "Personnes", icon: Users },
  { to: "/entreprises", label: "Entreprises", icon: Building2 },
  { to: "/clients", label: "Clients", icon: User },
  { to: "/services", label: "Services", icon: Receipt },
  { to: "/factures-ventes", label: "Factures Ventes", icon: FileText },
  { to: "/factures-achats", label: "Factures Achats", icon: FileMinus },
  { to: "/paiements", label: "Paiements", icon: HandCoins },
  { to: "/devise", label: "Devise", icon: Coins },
  { to: "/taxes", label: "Taxes", icon: Percent },
  { to: "/depenses", label: "Dépenses", icon: Wallet },
  { to: "/mon-entreprise", label: "Ma entreprise", icon: Settings2 },
  { to: "/rapports", label: "Rapports", icon: PieChart },
] as const;

const superAdminNav = [
  { to: "/superadmin", label: "Utilisateurs actuels", icon: ShieldCheck },
  { to: "/superadmin/demandes", label: "Demandes d'adhésion", icon: UserPlus },
  { to: "/superadmin/plans", label: "Plans d'abonnement", icon: Crown },
] as const;

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("facture-theme");
    const isDark = saved === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("facture-theme", next ? "dark" : "light");
      return next;
    });
  };
  return { dark, toggle };
}

function NavList({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentUser = useCurrentUser();
  const isSuperAdmin = currentUser?.role === "ADMIN";
  const superAdminActive = pathname.startsWith("/superadmin");
  const [superAdminOpen, setSuperAdminOpen] = useState(superAdminActive);

  return (
    <nav className="flex flex-col gap-1 px-3">
      {nav.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-all",
              "hover:bg-white/10 hover:text-sidebar-foreground",
              active &&
                "bg-ocean text-primary-foreground shadow-[0_10px_30px_-10px_var(--ocean)] hover:bg-ocean hover:text-primary-foreground",
            )}
          >
            <item.icon className="size-[18px] shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}

      {isSuperAdmin ? (
        <>
          <button
            type="button"
            onClick={() => setSuperAdminOpen((o) => !o)}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-all",
              "hover:bg-white/10 hover:text-sidebar-foreground",
              superAdminActive && !superAdminOpen && "text-sidebar-foreground",
            )}
          >
            <ShieldCheck className="size-[18px] shrink-0" />
            <span className="flex-1 truncate text-left">Super Admin</span>
            <ChevronDown className={cn("size-4 shrink-0 transition-transform", superAdminOpen && "rotate-180")} />
          </button>
          {superAdminOpen ? (
            <div className="ml-4 flex flex-col gap-1 border-l border-white/10 pl-3">
              {superAdminNav.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-all",
                      "hover:bg-white/10 hover:text-sidebar-foreground",
                      active &&
                        "bg-ocean text-primary-foreground shadow-[0_10px_30px_-10px_var(--ocean)] hover:bg-ocean hover:text-primary-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}
    </nav>
  );
}

function PlanFooter({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const currentUser = useCurrentUser();
  const isSuperAdmin = currentUser?.role === "ADMIN";
  const { data: usage } = useQuery({
    queryKey: ["plan-usage"],
    queryFn: getMyPlanUsage,
    enabled: !!currentUser && !isSuperAdmin,
    staleTime: 60_000,
  });

  if (isSuperAdmin || !usage) return null;

  const invoicesLabel =
    usage.invoices.limit === null ? "Factures illimitées" : `${usage.invoices.used}/${usage.invoices.limit} factures ce mois-ci`;

  return (
    <div className="mt-auto px-5 pt-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold text-sidebar-foreground">{usage.planNom ?? "Plan"}</p>
        <p className="mt-1 text-xs text-sidebar-foreground/70">
          {usage.freeTrial && usage.trialDaysLeft !== null
            ? `Il vous reste ${usage.trialDaysLeft} jour${usage.trialDaysLeft > 1 ? "s" : ""} d'essai.`
            : invoicesLabel}
        </p>
        <Link
          to="/abonnement"
          onClick={onNavigate}
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-sky/90 px-3 py-2 text-xs font-semibold text-midnight transition-colors hover:bg-sky"
        >
          Voir les offres
        </Link>
      </div>
    </div>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="surface-ocean flex h-full flex-col overflow-y-auto pb-6">
      <div className="flex items-center gap-3 px-6 py-6">
        <img src="/logo-mark.png" alt="" className="size-10 shrink-0" />
        <div>
          <p className="text-base font-semibold text-sidebar-foreground">Harmonie-dev</p>
          <p className="text-xs text-sidebar-foreground/60">Facturation & gestion</p>
        </div>
      </div>
      <NavList onNavigate={onNavigate} />
      <PlanFooter onNavigate={onNavigate} />
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { dark, toggle } = useDarkMode();
  const [open, setOpen] = useState(false);
  const currentUser = useCurrentUser();
  const navigate = useNavigate();

  const displayName = currentUser
    ? [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") || currentUser.email
    : "Zouhair B.";
  const initials = currentUser
    ? `${currentUser.firstName?.[0] ?? ""}${currentUser.lastName?.[0] ?? ""}`.toUpperCase() || currentUser.email[0]!.toUpperCase()
    : "ZB";
  const roleLabel = currentUser?.role === "ADMIN" ? "Super Admin" : "Administrateur";

  const handleLogout = async () => {
    await logout().catch(() => {});
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] lg:block">
        <SidebarInner />
      </aside>

      <div className="lg:pl-[264px]">
        <header className="glass sticky top-0 z-30 flex items-center gap-3 px-4 pt-safe-header pb-3 backdrop-blur-xl sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] border-0 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarInner onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher une facture, un client…" className="h-10 rounded-xl border-border/60 bg-background/60 pl-9" />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <NotificationsBell />
            <Button variant="ghost" size="icon" className="size-11 rounded-xl" onClick={toggle} aria-label="Basculer le thème">
              {dark ? <Sun className="size-6" /> : <Moon className="size-6" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 flex items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-accent">
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-ocean text-sm font-semibold text-primary-foreground">
                    {currentUser?.photoUrl ? (
                      <img src={currentUser.photoUrl} alt="" className="size-10 rounded-full object-cover" />
                    ) : (
                      initials
                    )}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block text-sm font-semibold leading-tight">{displayName}</span>
                    <span className="block text-xs text-muted-foreground">{roleLabel}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profil">
                    <User className="mr-2 size-4" /> Mon profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 size-4" /> Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 pb-28 sm:px-6 lg:pb-10">{children}</main>
      </div>

      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex justify-around px-2 pt-2 pb-safe-nav lg:hidden">
        {nav.slice(0, 5).map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors [&.active]:text-ocean"
          >
            <item.icon className="size-5" />
            {item.label.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
