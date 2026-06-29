import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { Button } from "../../../@/components/ui/button";
import { Input } from "../../../@/components/ui/input";
import { cn } from "../../../@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { EyeClosedIcon, EyeIcon } from "@hugeicons/core-free-icons";

const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your matric number or email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setErrorMsg(null);
    try {
      const res = await login(data.identifier, data.password);
      setAuth(res.user, res.access_token);

      if (res.user.isFirstLogin) {
        navigate("/change-password");
      } else if (res.user.role === "supervisor") {
        navigate("/supervisor/dashboard");
      } else {
        navigate("/student/dashboard");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Incorrect credentials");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-tf-gray-50">
      {/* Left Panel - Dark accent side */}
      <div className="md:w-1/2 bg-linear-to-r from-black to-neutral-900 flex flex-col justify-between p-8 md:p-12 lg:p-16">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <span className="text-white text-2xl font-semibold tracking-tight">
              ThesisFlow
            </span>
            <span className="text-xs hover:-translate-y-1.5 transition-all duration-200 bg-tf-gray-700 text-tf-gray-400 px-1.5 py-0.5 rounded-full">
              Beta
            </span>
          </div>
          <h1 className="text-3xl font-medium text-white mb-8 leading-tight">
            Manage and track final-year <br />
            <span className="font-serif italic text-4xl">
              project submissions in one place.
            </span>
          </h1>
          <ul className="space-y-5 text-tf-gray-400 text-md">
            <li className="flex items-start gap-3">
              <span className="text-white mt-0.5">✦</span>
              Centralised submission timeline
            </li>
            <li className="flex items-start gap-3">
              <span className="text-white mt-0.5">✦</span>
              Direct feedback and status tracking
            </li>
            <li className="flex items-start gap-3">
              <span className="text-white mt-0.5">✦</span>
              Clear publishability indicators
            </li>
          </ul>
        </div>
        <div className="mt-12 text-sm text-tf-gray-500">
          © {new Date().getFullYear()} ThesisFlow Tracker. Internal use only.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="md:w-1/2 flex items-center justify-center p-4 py-12 md:p-12 bg-tf-white md:bg-transparent">
        <div className="w-full max-w-md md:p-8 md:rounded-md">
          <h2 className="text-3xl font-serif tracking-tight font-medium text-tf-black mb-1">
            Sign in
          </h2>
          <p className="text-md text-tf-gray-500 mb-6">
            Enter your credentials to continue
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-normal text-tf-gray-500">
                Email or Matric Number
              </label>
              <Input
                {...register("identifier")}
                className={cn(
                  "h-12 rounded-xl border-tf-gray-200 text-sm bg-white focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200",
                  errors.identifier &&
                    "border-tf-red-700 focus-visible:ring-tf-red-700",
                )}
                placeholder="e.g. j.doe@uni.edu or 1801234"
              />
              {errors.identifier && (
                <p className="text-xs text-tf-red-700">
                  {errors.identifier.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-normal text-tf-gray-500">
                Password
              </label>
              <Input
                type="password"
                {...register("password")}
                className={cn(
                  "h-12 rounded-xl border-tf-gray-200 text-sm bg-white focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200",
                  errors.password &&
                    "border-tf-red-700 focus-visible:ring-tf-red-700",
                )}
                placeholder="• • • • • • • •"
              />
              {errors.password && (
                <p className="text-xs text-tf-red-700">
                  {errors.password.message}
                </p>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-tf-red-50 border border-tf-red-100 text-tf-red-700 text-sm rounded-sm">
                {errorMsg}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-tf-black text-white hover:bg-linear-to-t hover:from-tf-black hover:to-neutral-800 hover:cursor-pointer rounded-xl h-9 py-6 text-sm font-medium transition-colors duration-300 mt-2"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
