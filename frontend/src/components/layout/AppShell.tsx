import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import type { UserRole } from "@/types";

interface Props {
  role: UserRole;
}

export default function AppShell({ role }: Props) {
  return (
    <div className="flex h-screen bg-tf-gray-50 overflow-hidden">
      <Sidebar role={role} />
      {/* 
        md:ml-[220px] -> matches the w-55 (220px) sidebar width on desktop 
        pb-[72px] md:pb-0 -> adds bottom padding on mobile to clear the bottom tab bar 
      */}
      <div className="flex flex-col flex-1 overflow-hidden md:ml-[220px] pb-[72px] md:pb-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
