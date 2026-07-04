import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { changePassword } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/error";
import { useAuthStore } from "@/store/authStore";
import PageWrapper from "@/components/layout/PageWrapper";
import { Button } from "../../../@/components/ui/button";
import { Input } from "../../../@/components/ui/input";
import { cn } from "../../../@/lib/utils";

// Note: Name update is mocked here as there's no API defined for it in AGENT_CONTEXT
const nameSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

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

export default function SupervisorSettings() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Name Form
  const {
    register: registerName,
    handleSubmit: handleNameSubmit,
    formState: { errors: nameErrors, isSubmitting: isNameSubmitting },
  } = useForm({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: user?.name || "" },
  });

  // Password Form
  const {
    register: registerPwd,
    handleSubmit: handlePwdSubmit,
    reset: resetPwd,
    setError: setPwdError,
    formState: { errors: pwdErrors, isSubmitting: isPwdSubmitting },
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const onUpdateName = async (data: { name: string }) => {
    await new Promise((r) => setTimeout(r, 800)); // Mock delay
    if (user && token) {
      setAuth({ ...user, name: data.name }, token);
      toast.success("Name updated successfully");
    }
  };

  const onUpdatePassword = async (data: PasswordForm) => {
    try {
      await changePassword(data.currentPassword, data.newPassword);
      toast.success("Password changed successfully");
      resetPwd();
    } catch (err) {
      setPwdError("currentPassword", {
        message: getErrorMessage(err) || "Failed to update password",
      });
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-2xl bg-white rounded-xl border border-tf-gray-100 p-6 md:p-8 space-y-10">
        {/* Update Name Section */}
        <section>
          <div className="mb-5">
            <h2 className="text-lg font-medium text-tf-black">
              Profile Information
            </h2>
            <p className="text-sm text-tf-gray-500">
              Update your account name displayed to students.
            </p>
          </div>

          <form
            onSubmit={handleNameSubmit(onUpdateName)}
            className="space-y-4 max-w-sm"
          >
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-tf-gray-500">
                Full Name
              </label>
              <Input
                {...registerName("name")}
                className={cn(
                  "h-12 rounded-xl border-tf-gray-200 text-sm bg-white focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200",
                  nameErrors.name && "border-tf-red-700",
                )}
              />
              {nameErrors.name && (
                <p className="text-xs text-tf-red-700">
                  {nameErrors.name.message as string}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isNameSubmitting}
              className="bg-tf-black text-white rounded-xl px-6 h-10"
            >
              {isNameSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </section>

        <hr className="border-tf-gray-100" />

        {/* Change Password Section */}
        <section>
          <div className="mb-5">
            <h2 className="text-lg font-medium text-tf-black">
              Change Password
            </h2>
            <p className="text-sm text-tf-gray-500">
              Ensure your account is using a long, secure password.
            </p>
          </div>

          <form
            onSubmit={handlePwdSubmit(onUpdatePassword)}
            className="space-y-4 max-w-sm"
          >
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-medium text-tf-gray-500">
                Current Password
              </label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  {...registerPwd("currentPassword")}
                  className={cn(
                    "h-12 border-tf-gray-200 bg-white focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200h-12 w-full rounded-xl text-sm pr-12",
                    pwdErrors.currentPassword && "border-tf-red-700",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-tf-gray-400"
                >
                  <HugeiconsIcon
                    icon={showCurrent ? ViewOffSlashIcon : ViewIcon}
                    size={20}
                  />
                </button>
              </div>
              {pwdErrors.currentPassword && (
                <p className="text-xs text-tf-red-700">
                  {pwdErrors.currentPassword.message as string}
                </p>
              )}
            </div>

            <div className="space-y-1.5 relative">
              <label className="block text-xs font-medium text-tf-gray-500">
                New Password
              </label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  {...registerPwd("newPassword")}
                  className={cn(
                    "h-12 rounded-xl border-tf-gray-200 text-sm bg-white focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200  w-full pr-12",
                    pwdErrors.newPassword && "border-tf-red-700",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-tf-gray-400"
                >
                  <HugeiconsIcon
                    icon={showNew ? ViewOffSlashIcon : ViewIcon}
                    size={20}
                  />
                </button>
              </div>
              {pwdErrors.newPassword && (
                <p className="text-xs text-tf-red-700">
                  {pwdErrors.newPassword.message as string}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-tf-gray-500">
                Confirm New Password
              </label>
              <Input
                type="password"
                {...registerPwd("confirmPassword")}
                className={cn(
                  "h-12 rounded-xl border-tf-gray-200 text-sm bg-white focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200",
                  pwdErrors.confirmPassword && "border-tf-red-700",
                )}
              />
              {pwdErrors.confirmPassword && (
                <p className="text-xs text-tf-red-700">
                  {pwdErrors.confirmPassword.message as string}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isPwdSubmitting}
              className="bg-tf-black text-white rounded-xl px-6 h-10 mt-2"
            >
              {isPwdSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </section>
      </div>
    </PageWrapper>
  );
}
