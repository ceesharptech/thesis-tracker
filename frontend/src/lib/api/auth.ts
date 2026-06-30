// import client from "./client";
import type { AuthUser } from "@/types";

export const login = async (identifier: string, password: string) => {
  // MOCK IMPLEMENTATION FOR PHASE 2 TESTING
  // Simulating network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (password !== "password123") {
    throw new Error("Incorrect credentials");
  }

  // Toggle `isFirstLogin` and `role` here to test different redirect flows
  const mockUser: AuthUser = {
    id: "user-123",
    name: "Dr. Supervisor",
    role: "student", // Change to 'student' to test student flow
    identifier: identifier,
    isFirstLogin: false, // Change to false to test direct-to-dashboard flow
  };

  return { access_token: "mock-jwt-token", user: mockUser };

  /* 
  // REAL IMPLEMENTATION (Uncomment when backend is ready)
  const res = await client.post('ROUTE_PLACEHOLDER/login', { identifier, password })
  return res.data as { access_token: string; user: AuthUser }
  */
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
) => {
  // MOCK IMPLEMENTATION
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (currentPassword !== "password123") {
    throw new Error("Current password is incorrect");
    console.log(newPassword);
  }

  return { success: true };

  /*
  // REAL IMPLEMENTATION
  const res = await client.post('ROUTE_PLACEHOLDER/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
  return res.data as { success: boolean }
  */
};
