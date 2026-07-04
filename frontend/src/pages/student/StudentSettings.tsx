import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { changePassword } from "@/lib/api/auth";
import PageWrapper from "@/components/layout/PageWrapper";
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
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export default function StudentSettings() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onUpdatePassword = async (data: PasswordForm) => {
    try {
      await changePassword(data.currentPassword, data.newPassword);
      toast.success("Password changed successfully");
      reset();
    } catch (err: any) {
      setError("currentPassword", {
        message:
          err.response?.data?.detail ||
          err.message ||
          "Failed to update password",
      });
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-2xl bg-white rounded-xl border border-tf-gray-100 p-6 md:p-8">
        <section>
          <div className="mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-medium text-tf-black">
              Change Password
            </h2>
            <p className="text-sm text-tf-gray-500 mt-1">
              Ensure your account is using a long, secure password.
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onUpdatePassword)}
            className="space-y-5 max-w-sm"
          >
            {/* Current Password */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-medium text-tf-gray-500">
                Current Password
              </label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  {...register("currentPassword")}
                  className={cn(
                    "h-12 w-full rounded-xl border-tf-gray-200 text-sm bg-white pr-12 focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200",
                    errors.currentPassword &&
                      "border-tf-red-700 focus-visible:ring-tf-red-700",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-tf-gray-400 hover:text-tf-gray-900 transition-colors"
                >
                  <HugeiconsIcon
                    icon={showCurrent ? ViewIcon : ViewOffSlashIcon}
                    size={20}
                  />
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-tf-red-700">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-medium text-tf-gray-500">
                New Password
              </label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  {...register("newPassword")}
                  className={cn(
                    "h-12 w-full rounded-xl border-tf-gray-200 text-sm bg-white pr-12 focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200",
                    errors.newPassword &&
                      "border-tf-red-700 focus-visible:ring-tf-red-700",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-tf-gray-400 hover:text-tf-gray-900 transition-colors"
                >
                  <HugeiconsIcon
                    icon={showNew ? ViewIcon : ViewOffSlashIcon}
                    size={20}
                  />
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-tf-red-700">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-medium text-tf-gray-500">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  {...register("confirmPassword")}
                  className={cn(
                    "h-12 w-full rounded-xl border-tf-gray-200 text-sm bg-white pr-12 focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200",
                    errors.confirmPassword &&
                      "border-tf-red-700 focus-visible:ring-tf-red-700",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-tf-gray-400 hover:text-tf-gray-900 transition-colors"
                >
                  <HugeiconsIcon
                    icon={showConfirm ? ViewIcon : ViewOffSlashIcon}
                    size={20}
                  />
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-tf-red-700">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-tf-black text-white hover:bg-linear-to-t hover:from-tf-black hover:to-neutral-800 rounded-xl px-6 h-12 w-full md:w-auto mt-4 transition-colors duration-300"
            >
              {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </section>
      </div>
    </PageWrapper>
  );
}
