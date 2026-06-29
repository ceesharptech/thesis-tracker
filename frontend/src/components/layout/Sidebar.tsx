import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  // Users,
  UserPlus,
  Settings,
  FolderKanban,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "../../../@/lib/utils";
import type { UserRole } from "@/types";

interface Props {
  role: UserRole;
}

export default function Sidebar({ role }: Props) {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  const handleSignOut = () => {
    clearAuth();
    navigate("/login");
  };

  const links =
    role === "supervisor"
      ? [
          {
            to: "/supervisor/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
          },
          {
            to: "/supervisor/upload-students",
            label: "Upload Students",
            icon: UserPlus,
          },
          { to: "/supervisor/settings", label: "Settings", icon: Settings },
        ]
      : [
          { to: "/student/dashboard", label: "My Project", icon: FolderKanban },
          { to: "/student/settings", label: "Settings", icon: Settings },
        ];

  return (
    <aside className="w-55 fixed left-0 top-0 bottom-0 z-10 bg-tf-gray-900 flex flex-col">
      <div className="p-5 flex items-center gap-2">
        <span className="text-white text-[15px] font-semibold tracking-tight">
          ThesisFlow
        </span>
        <span className="text-xs bg-tf-gray-700 text-tf-gray-400 px-1.5 py-0.5 rounded-sm">
          Beta
        </span>
      </div>

      <nav className="flex-1 mt-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "mx-2 px-4 py-2.5 text-sm rounded-md flex items-center gap-3 transition-colors",
                  isActive
                    ? "text-white bg-tf-gray-700 border-l-2 border-tf-blue-500 pl-3.5"
                    : "text-tf-gray-400 hover:text-white hover:bg-tf-gray-700",
                )
              }
            >
              <Icon size={16} />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-tf-gray-700">
        <div className="flex flex-col mb-4 px-2">
          <span className="text-white text-sm font-medium truncate">
            {user?.name || "User"}
          </span>
          <span className="text-tf-gray-400 text-xs capitalize">{role}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full mx-2 px-2 py-2 text-sm text-tf-gray-400 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
