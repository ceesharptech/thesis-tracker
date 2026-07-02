import { NavLink, useNavigate } from "react-router-dom";
// import {
//   LayoutDashboard,
//   // Users,
//   UserPlus,
//   Settings,
//   FolderKanban,
//   LogOut,
// } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare02Icon,
  UserAdd01Icon,
  Settings01Icon,
  Folder01Icon,
  LogOut,
} from "@hugeicons/core-free-icons";
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
            icon: DashboardSquare02Icon,
          },
          {
            to: "/supervisor/upload-students",
            label: "Upload Students",
            icon: UserAdd01Icon,
          },
          {
            to: "/supervisor/settings",
            label: "Settings",
            icon: Settings01Icon,
          },
        ]
      : [
          { to: "/student/dashboard", label: "My Project", icon: Folder01Icon },
          { to: "/student/settings", label: "Settings", icon: Settings01Icon },
        ];

  return (
    <aside className="w-55 fixed left-0 top-0 bottom-0 z-10 px-2 bg-tf-gray-900 flex flex-col">
      <div className="p-5 flex items-center gap-2 mb-4 mt-2">
        <span className="text-white text-xl font-semibold tracking-tight">
          ThesisFlow
        </span>
        <span className="text-xs bg-tf-gray-700 text-tf-gray-400 px-1.5 py-0.5 rounded-full">
          Beta
        </span>
      </div>

      <nav className="flex-1 mt-4 space-y-4">
        {links.map((link) => {
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "mx-2 px-4 py-2.5 text-sm rounded-full flex items-center gap-3 transition-colors",
                  isActive
                    ? "text-white bg-neutral-800 pl-3.5"
                    : "text-tf-gray-400 hover:text-white hover:bg-neutral-800",
                )
              }
            >
              <HugeiconsIcon icon={link.icon} size={24} />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 mt-auto mb-4">
        <div className="flex flex-col mb-5 ">
          <span className="text-white text-sm font-medium truncate">
            {user?.name || "User"}
          </span>
          <span className="text-tf-gray-400 text-xs capitalize">{role}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full  px-5 py-3 text-sm bg-tf-gray-100 rounded-full hover:bg-tf-gray-200 text-tf-gray-900 hover:cursor-pointer transition-colors"
        >
          <HugeiconsIcon icon={LogOut} size={24} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
