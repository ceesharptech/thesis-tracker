interface Props {
  label: string;
}

export default function ChapterBadge({ label }: Props) {
  return (
    <span className="bg-tf-black text-white px-2 py-0.5 rounded-sm text-xs font-mono font-medium whitespace-nowrap">
      {label}
    </span>
  );
}
