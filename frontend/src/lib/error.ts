import { AxiosError } from "axios";

export function getErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.detail || err.message || "Something went wrong";
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Something went wrong";
}
