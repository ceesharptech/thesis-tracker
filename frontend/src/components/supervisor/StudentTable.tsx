import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import StatusBadge from "@/components/shared/StatusBadge";
import ChapterBadge from "@/components/shared/ChapterBadge";
import type { Student } from "@/types";

interface Props {
  students: Student[];
}

export default function StudentTable({ students }: Props) {
  const navigate = useNavigate();

  return (
    <div className="w-full overflow-x-auto bg-white rounded-xl border border-tf-gray-100 shadow-sm">
      <table className="w-full text-left border-collapse min-w-200">
        <thead>
          <tr className="bg-tf-gray-50 text-xs font-medium text-tf-gray-500 uppercase tracking-wide h-12 border-b border-tf-gray-100">
            <th className="px-5 font-medium">Student</th>
            <th className="px-5 font-medium">Project Title</th>
            <th className="px-5 font-medium">Last Upload</th>
            <th className="px-5 font-medium">Chapter</th>
            <th className="px-5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr
              key={student.id}
              onClick={() => navigate(`/supervisor/student/${student.id}`)}
              className="h-16 md:h-14 border-b border-tf-gray-100 hover:bg-tf-gray-50 cursor-pointer transition-colors group"
            >
              <td className="px-5">
                <div className="text-sm text-tf-black font-medium">
                  {student.name}
                </div>
                <div className="text-xs text-tf-gray-400 font-mono mt-0.5">
                  {student.matricNumber}
                </div>
              </td>
              <td className="px-5">
                <div className="text-sm text-tf-black line-clamp-1">
                  {student.projectTitle}
                </div>
                <div className="text-xs text-tf-gray-400 mt-0.5">
                  {student.department}
                </div>
              </td>
              <td className="px-5 text-sm text-tf-gray-500">
                {student.lastSubmissionAt
                  ? formatDistanceToNow(new Date(student.lastSubmissionAt), {
                      addSuffix: true,
                    })
                  : "—"}
              </td>
              <td className="px-5">
                {student.lastChapterSubmitted ? (
                  <ChapterBadge label={student.lastChapterSubmitted} />
                ) : (
                  <span className="text-sm text-tf-gray-400">—</span>
                )}
              </td>
              <td className="px-5">
                <StatusBadge status={student.publishabilityStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
