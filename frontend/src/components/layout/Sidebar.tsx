import { NavLink, useNavigate } from "react-router-dom";
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
    <aside
      className="fixed z-50 bg-tf-gray-50 border-gray-200 transition-all 
      md:w-55 md:left-0 md:top-0 md:bottom-0 md:flex md:flex-col md:border-r md:px-2
      bottom-0 left-0 right-0 flex flex-row border-t h-18 md:h-auto"
    >
      {/* Desktop Top Logo */}
      <div className="hidden md:flex p-5 items-center gap-2 mb-4 mt-2">
        <span className="text-tf-gray-900 text-xl font-semibold tracking-tight">
          ThesisFlow
        </span>
        <span className="text-xs bg-tf-blue-50 text-tf-gray-500 px-1.5 py-0.5 rounded-full">
          Beta
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 flex md:flex-col flex-row md:mt-4 md:space-y-4 justify-around md:justify-start items-center md:items-stretch w-full px-2 md:px-0">
        {links.map((link) => {
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "flex transition-colors",
                  // Desktop styling
                  "md:mx-2 md:px-4 md:py-2.5 md:text-sm md:rounded-full md:justify-start md:flex-row md:items-center md:gap-3",
                  // Mobile styling
                  "flex-col items-center justify-center py-2 px-3 text-[10px] gap-1.5 rounded-lg",
                  isActive
                    ? "text-tf-gray-900 md:bg-tf-gray-100 md:pl-3.5 font-medium"
                    : "text-tf-gray-500 hover:text-tf-gray-900 md:hover:bg-tf-gray-100",
                )
              }
            >
              <HugeiconsIcon
                icon={link.icon}
                className="w-6 h-6 md:w-6 md:h-6"
              />
              <span className="hidden md:inline">{link.label}</span>
              <span className="md:hidden">{link.label}</span>
            </NavLink>
          );
        })}

        {/* Mobile Sign Out Button (integrated into bottom tab) */}
        <button
          onClick={handleSignOut}
          className="md:hidden flex flex-col items-center justify-center py-2 px-3 text-[10px] gap-1.5 rounded-lg text-tf-gray-500 hover:text-tf-gray-900 transition-colors"
        >
          <HugeiconsIcon icon={LogOut} className="w-6 h-6" />
          <span>Sign out</span>
        </button>
      </nav>

      {/* Desktop Bottom User Section */}
      <div className="hidden md:block p-4 mt-auto mb-4">
        <div className="flex flex-col mb-5">
          <span className="text-tf-gray-900 text-sm font-medium truncate">
            {user?.name || "User"}
          </span>
          <span className="text-tf-gray-500 text-xs capitalize">{role}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-5 py-3 text-sm bg-tf-gray-900 rounded-full hover:bg-neutral-950 text-white hover:cursor-pointer transition-colors"
        >
          <HugeiconsIcon icon={LogOut} size={24} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
