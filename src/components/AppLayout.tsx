import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import OnlineStatusIndicator from "@/components/OnlineStatusIndicator";

export function AppLayout({ children }: { children: ReactNode }) {
  const { isOnline, pendingCount, isSyncing, pendingItems, syncAll } = useOfflineSync();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4">
            <SidebarTrigger className="mr-4" />
            <OnlineStatusIndicator
              isOnline={isOnline}
              pendingCount={pendingCount}
              isSyncing={isSyncing}
              pendingItems={pendingItems}
              onSyncNow={syncAll}
            />
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
