import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { QuickAdd } from "@/components/QuickAdd";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <AppTopbar />
      
      {/* Main Content Area */}
      <main className="ml-sidebar pt-topbar">
        <div className="p-6">
          {children}
        </div>
      </main>

      <QuickAdd />
    </div>
  );
}
