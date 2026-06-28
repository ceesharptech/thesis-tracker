// src/lib/api/auth.ts
import client from "./client";
import type { AuthUser } from "@/types";

export const login = async (identifier: string, password: string) => {
  // POST /ROUTE_PLACEHOLDER/login
  // Body: { identifier, password }
  // Response: { access_token: string, user: AuthUser }
  const res = await client.post("ROUTE_PLACEHOLDER/login", {
    identifier,
    password,
  });
  return res.data as { access_token: string; user: AuthUser };
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
) => {
  // POST /ROUTE_PLACEHOLDER/change-password
  // Body: { current_password, new_password }
  // Response: { success: boolean }
  const res = await client.post("ROUTE_PLACEHOLDER/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return res.data as { success: boolean };
};
