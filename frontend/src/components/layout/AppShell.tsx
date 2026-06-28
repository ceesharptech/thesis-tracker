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
      <div className="flex flex-col flex-1 overflow-hidden ml-[220px]">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
