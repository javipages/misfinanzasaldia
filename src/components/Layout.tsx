import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";
import { YearProvider } from "@/contexts/YearContext";

export function Layout() {
  return (
    <SidebarProvider>
      <YearProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex-1 ">
            <main className="p-6">
              <Outlet />
            </main>
          </div>
        </SidebarInset>
      </YearProvider>
    </SidebarProvider>
  );
}
