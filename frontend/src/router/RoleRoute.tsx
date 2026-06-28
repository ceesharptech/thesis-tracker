import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import type { UserRole } from "@/types";

interface Props {
  allowedRole: UserRole;
}

export default function RoleRoute({ allowedRole }: Props) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== allowedRole) {
    const redirect =
      user.role === "supervisor"
        ? "/supervisor/dashboard"
        : "/student/dashboard";
    return <Navigate to={redirect} replace />;
  }
  return <Outlet />;
}
