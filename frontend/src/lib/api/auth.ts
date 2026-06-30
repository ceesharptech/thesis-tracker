import client from "./client";
import type { AuthUser } from "@/types";

export const login = async (identifier: string, password: string) => {
  const res = await client.post("/auth/login", { identifier, password });
  return res.data as { access_token: string; user: AuthUser };
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
) => {
  const res = await client.post("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return res.data as { success: boolean };
};
