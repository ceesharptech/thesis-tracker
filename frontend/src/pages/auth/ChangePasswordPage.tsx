import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { changePassword } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { Button } from "../../../@/components/ui/button";
import { Input } from "../../../@/components/ui/input";
import { cn } from "../../../@/lib/utils";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordForm) => {
    try {
      await changePassword(data.currentPassword, data.newPassword);
      toast.success("Password updated successfully");

      // If they were on first login, clear the flag in the local store
      if (user && token && user.isFirstLogin) {
        setAuth({ ...user, isFirstLogin: false }, token);
      }

      // Route to correct dashboard
      if (user?.role === "supervisor") {
        navigate("/supervisor/dashboard");
      } else {
        navigate("/student/dashboard");
      }
    } catch (err: any) {
      setError("currentPassword", {
        message: err.message || "Failed to update password",
      });
    }
  };

  return (
    <div className="min-h-screen bg-tf-gray-50 flex flex-col pt-12 md:pt-24 px-4 md:px-6">
      <div className="w-full max-w-md mx-auto bg-white p-6 md:p-10 rounded-xl border border-tf-gray-100 shadow-xs md:shadow-none">
        <h1 className="text-2xl font-medium text-tf-black mb-1">
          Update your password
        </h1>
        <p className="text-sm text-tf-gray-500 mb-6 md:mb-8">
          {user?.isFirstLogin
            ? "Please change your temporary password to continue."
            : "Enter your current password and choose a new one."}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-tf-gray-500">
              Current Password
            </label>
            <Input
              type="password"
              {...register("currentPassword")}
              className={cn(
                "h-12 rounded-xl border-tf-gray-200 text-sm bg-white focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200",
                errors.currentPassword &&
                  "border-tf-red-700 focus-visible:ring-tf-red-700",
              )}
            />
            {errors.currentPassword && (
              <p className="text-xs text-tf-red-700">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-tf-gray-500">
              New Password
            </label>
            <Input
              type="password"
              {...register("newPassword")}
              className={cn(
                "h-12 rounded-xl border-tf-gray-200 text-sm bg-white focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200",
                errors.newPassword &&
                  "border-tf-red-700 focus-visible:ring-tf-red-700",
              )}
            />
            {errors.newPassword && (
              <p className="text-xs text-tf-red-700">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-tf-gray-500">
              Confirm New Password
            </label>
            <Input
              type="password"
              {...register("confirmPassword")}
              className={cn(
                "h-12 rounded-xl border-tf-gray-200 text-sm bg-white focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200",
                errors.confirmPassword &&
                  "border-tf-red-700 focus-visible:ring-tf-red-700",
              )}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-tf-red-700">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-tf-black text-white hover:bg-linear-to-t hover:from-tf-black hover:to-neutral-800 hover:cursor-pointer rounded-xl h-9 py-6 text-sm font-medium transition-colors duration-300 mt-4"
          >
            {isSubmitting ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
