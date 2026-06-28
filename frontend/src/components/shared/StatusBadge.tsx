import { cn } from "../../../@/lib/utils";
import type { PublishabilityStatus } from "@/types";

interface Props {
  status: PublishabilityStatus;
}

export default function StatusBadge({ status }: Props) {
  const config = {
    publishable: {
      bg: "bg-tf-green-50",
      text: "text-tf-green-700",
      dot: "bg-tf-green-700",
      label: "Publishable",
    },
    not_publishable: {
      bg: "bg-tf-red-50",
      text: "text-tf-red-700",
      dot: "bg-tf-red-700",
      label: "Not Publishable",
    },
    needs_further_work: {
      bg: "bg-tf-amber-50",
      text: "text-tf-amber-700",
      dot: "bg-tf-amber-700",
      label: "Needs Further Work",
    },
    null: {
      bg: "bg-tf-gray-100",
      text: "text-tf-gray-500",
      dot: "bg-tf-gray-500",
      label: "No Status",
    },
  };

  const active = status ? config[status] : config["null"];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
        active.bg,
        active.text,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", active.dot)} />
      {active.label}
    </span>
  );
}
