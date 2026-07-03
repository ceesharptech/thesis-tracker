import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/error";
import { useAuthStore } from "@/store/authStore";
import { Button } from "../../../@/components/ui/button";
import { Input } from "../../../@/components/ui/input";
import { cn } from "../../../@/lib/utils";
// Add ViewIcon and ViewOffSlashIcon to your Hugeicons imports
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";

const loginSchema = z.object({
  identifier: z.string().min(1, "Please enter your login credential"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Added Role Toggle State
  const [loginRole, setLoginRole] = useState<"student" | "supervisor">(
    "student",
  );

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
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
    } catch (err) {
      setErrorMsg(getErrorMessage(err) || "Incorrect credentials");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-tf-gray-50">
      {/* Left Panel - Dark accent side (Becomes a compact top header on mobile) */}
      <div className="w-full hidden md:w-1/2 bg-linear-to-r from-black to-neutral-900 lg:flex flex-col justify-between p-8 md:p-12 lg:p-16 min-h-50 md:min-h-0">
        <div>
          <div className="flex items-center gap-2 mb-6 md:mb-12">
            <span className="text-white text-xl md:text-2xl font-semibold tracking-tight">
              ThesisFlow
            </span>
            <span className="text-xs hover:-translate-y-1.5 transition-all duration-200 bg-tf-gray-700 text-tf-gray-400 px-1.5 py-0.5 rounded-full">
              Beta
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-medium text-white md:mb-8 leading-tight">
            Manage and track final-year <br className="hidden md:block" />
            <span className="font-serif italic text-3xl md:text-4xl">
              project submissions in one place.
            </span>
          </h1>
          <ul className="hidden md:block space-y-5 text-tf-gray-400 text-md mt-8">
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
        <div className="hidden md:block mt-12 text-sm text-tf-gray-500">
          © {new Date().getFullYear()} ThesisFlow Tracker. Internal use only.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 py-10 md:p-12 bg-tf-gray-50 md:bg-transparent flex-1">
        <div className="w-full max-w-md md:p-8 md:rounded-md">
          <div className="lg:hidden flex items-center mb-10 gap-2">
            <div className="rounded-full w-6 h-6 bg-linear-to-r from-black to-neutral-600"></div>
            <h2 className="text-lg font-semibold tracking-tighter text-tf-black">
              ThesisFlow
            </h2>
          </div>
          <div className="flex flex-col items-start">
            <h2 className="text-3xl font-serif tracking-tight font-medium text-tf-black mb-1">
              Sign in
            </h2>
            <p className="text-md text-tf-gray-500 mb-6 md:mb-8">
              Select your role to continue
            </p>
          </div>

          {/* Role Toggle Switch */}
          <div className="relative flex bg-tf-gray-100 p-2 rounded-2xl mb-10 gap-2">
            <div
              className={cn(
                "absolute top-2 bottom-2 w-[calc(50%-8px)] rounded-xl bg-white shadow-sm transition-all duration-300 ease-out",
                loginRole === "student" ? "left-2" : "left-[calc(50%)]",
              )}
            />
            <button
              type="button"
              onClick={() => {
                setLoginRole("student");
                reset();
                setErrorMsg(null);
              }}
              className={cn(
                "relative z-10 flex-1 text-sm font-medium py-3 px-4 rounded-xl transition-colors duration-200 hover:cursor-pointer",
                loginRole === "student"
                  ? "text-tf-black"
                  : "text-tf-gray-500 hover:text-tf-gray-900",
              )}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginRole("supervisor");
                reset();
                setErrorMsg(null);
              }}
              className={cn(
                "relative z-10 flex-1 text-sm font-medium py-3 px-4 rounded-xl transition-colors duration-200 hover:cursor-pointer",
                loginRole === "supervisor"
                  ? "text-tf-black"
                  : "text-tf-gray-500 hover:text-tf-gray-900",
              )}
            >
              Supervisor
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-normal text-tf-gray-500">
                {loginRole === "student" ? "Matric Number" : "Email Address"}
              </label>
              <Input
                {...register("identifier")}
                className={cn(
                  "h-12 rounded-xl border-tf-gray-200 text-sm bg-white focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200",
                  errors.identifier &&
                    "border-tf-red-700 focus-visible:ring-tf-red-700",
                )}
                placeholder={
                  loginRole === "student"
                    ? "e.g. 1801234"
                    : "e.g. supervisor@uni.edu"
                }
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
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  className={cn(
                    "h-12 w-full rounded-xl border-tf-gray-200 text-sm bg-white pr-12 focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200",
                    errors.password &&
                      "border-tf-red-700 focus-visible:ring-tf-red-700",
                  )}
                  placeholder="• • • • • • • •"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-tf-gray-400 hover:text-tf-gray-900 transition-colors"
                >
                  <HugeiconsIcon
                    icon={showPassword ? ViewIcon : ViewOffSlashIcon}
                    size={20}
                  />
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-tf-red-700">
                  {errors.password.message}
                </p>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-tf-red-50 border border-tf-red-100 text-tf-red-700 text-sm rounded-lg">
                {errorMsg}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-tf-black text-white hover:bg-linear-to-t hover:from-tf-black hover:to-neutral-800 hover:cursor-pointer rounded-xl h-9 py-6 text-sm font-medium transition-colors duration-300 mt-4"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
