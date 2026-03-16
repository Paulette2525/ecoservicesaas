import { Wifi, WifiOff, Loader2, CloudUpload } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PendingRecording } from "@/lib/offlineDb";

interface OnlineStatusIndicatorProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  pendingItems: PendingRecording[];
  onSyncNow: () => void;
}

export default function OnlineStatusIndicator({
  isOnline,
  pendingCount,
  isSyncing,
  pendingItems,
  onSyncNow,
}: OnlineStatusIndicatorProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors">
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : isOnline ? (
            <Wifi className="h-4 w-4 text-emerald-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-destructive" />
          )}
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className="h-5 min-w-5 flex items-center justify-center p-0 text-[10px]"
            >
              {pendingCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                isOnline ? "bg-emerald-500" : "bg-destructive"
              )}
            />
            <span className="text-sm font-medium">
              {isOnline ? "En ligne" : "Hors ligne"}
            </span>
          </div>

          {pendingCount === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aucun enregistrement en attente.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {pendingCount} enregistrement{pendingCount > 1 ? "s" : ""} en
                attente de synchronisation
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {pendingItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded border px-2 py-1.5 text-xs"
                  >
                    <div className="truncate">
                      <span className="font-medium">{item.clientName}</span>
                      <span className="text-muted-foreground ml-1">
                        {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    {item.status === "syncing" && (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              {isOnline && !isSyncing && (
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={onSyncNow}>
                  <CloudUpload className="h-3.5 w-3.5" />
                  Synchroniser maintenant
                </Button>
              )}
              {isSyncing && (
                <p className="text-xs text-muted-foreground text-center">
                  Synchronisation en cours…
                </p>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
