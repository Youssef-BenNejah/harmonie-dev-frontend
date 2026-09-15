import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2, Clock, RefreshCcw, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/mock-data";
import {
  ApiError,
  adminApproveRenewal,
  adminRejectRenewal,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
} from "@/lib/api";

export function NotificationsBell() {
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    refetchInterval: 30000,
  });
  const unread = notifications.filter((n) => !n.read).length;
  const [selected, setSelected] = useState<ApiNotification | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const onError = (err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    toast.error(fallback, { description: message });
  };

  const markReadMutation = useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate });
  const markAllReadMutation = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate });

  const approveMutation = useMutation({
    mutationFn: adminApproveRenewal,
    onSuccess: (user) => {
      toast.success("Renouvellement approuvé", { description: `${user.firstName} ${user.lastName} — plan prolongé de 30 jours` });
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelected(null);
    },
    onError: (err) => onError(err, "Échec de l'approbation"),
  });

  const rejectMutation = useMutation({
    mutationFn: adminRejectRenewal,
    onSuccess: (user) => {
      toast("Demande refusée", { description: `${user.firstName} ${user.lastName}` });
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelected(null);
    },
    onError: (err) => onError(err, "Échec du refus"),
  });

  const openNotification = (n: ApiNotification) => {
    setSelected(n);
    if (!n.read) markReadMutation.mutate(n.id);
  };

  const isPendingRenewal = selected?.type === "renewal_request";
  const isJoinRequest = selected?.type === "join_request";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative size-11 rounded-xl">
            <Bell className="size-6" />
            {unread > 0 ? (
              <span className="absolute top-1 right-1 grid size-[18px] place-items-center rounded-full bg-destructive text-[11px] font-semibold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 rounded-xl">
          <div className="flex items-center justify-between px-2 py-1.5">
            <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
            {unread > 0 ? (
              <button className="text-xs font-medium text-ocean hover:underline dark:text-sky" onClick={() => markAllReadMutation.mutate()}>
                Tout marquer lu
              </button>
            ) : null}
          </div>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">Aucune notification pour le moment.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <DropdownMenuItem key={n.id} className="flex items-start gap-2.5 rounded-lg py-2.5" onSelect={() => openNotification(n)}>
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-ocean"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCcw className="size-5 text-ocean" /> {selected?.title}
            </DialogTitle>
            <DialogDescription>{selected?.message}</DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="flex items-center justify-between rounded-xl border border-border/60 p-3.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> Reçu le
              </span>
              <span>{formatDate(selected.createdAt)}</span>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            {isPendingRenewal && selected ? (
              <>
                <Button
                  variant="outline"
                  className="rounded-xl text-destructive hover:text-destructive"
                  onClick={() => rejectMutation.mutate(selected.tenantAdminId)}
                  disabled={rejectMutation.isPending}
                >
                  <XCircle className="mr-1.5 size-4" /> Refuser
                </Button>
                <Button className="rounded-xl" onClick={() => approveMutation.mutate(selected.tenantAdminId)} disabled={approveMutation.isPending}>
                  <CheckCircle2 className="mr-1.5 size-4" /> Approuver (+30 j)
                </Button>
              </>
            ) : null}
            {isJoinRequest ? (
              <Button asChild className="rounded-xl" onClick={() => setSelected(null)}>
                <Link to="/superadmin/demandes">
                  <UserPlus className="mr-1.5 size-4" /> Voir la demande
                </Link>
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
