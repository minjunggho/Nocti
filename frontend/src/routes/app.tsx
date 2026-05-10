import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/nocti/BottomNav";
import { DriverProvider } from "@/lib/driver-context";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <DriverProvider>
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 mx-auto w-full max-w-2xl">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </DriverProvider>
  );
}
