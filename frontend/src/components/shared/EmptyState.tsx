import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

interface Props {
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  heading: string;
  sub: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, heading, sub, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed border-tf-gray-200 bg-white">
      <div className="text-tf-gray-200 mb-3">
        <HugeiconsIcon icon={icon} size={48} />
      </div>
      <h3 className="text-sm font-medium text-tf-gray-500">{heading}</h3>
      <p className="text-xs text-tf-gray-400 mt-1 max-w-xs mx-auto">{sub}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
