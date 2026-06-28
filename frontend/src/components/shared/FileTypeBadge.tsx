import { cn } from "../../../@/lib/utils";

interface Props {
  type: "pdf" | "docx";
}

export default function FileTypeBadge({ type }: Props) {
  return (
    <span
      className={cn(
        "text-xs font-medium px-2 py-0.5 rounded-sm uppercase",
        type === "pdf"
          ? "bg-tf-red-50 text-tf-red-700"
          : "bg-tf-blue-50 text-tf-blue-700",
      )}
    >
      {type}
    </span>
  );
}
