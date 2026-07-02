import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStudents, getDashboardStats } from "@/lib/api/supervisor";
import PageWrapper from "@/components/layout/PageWrapper";
import StudentTable from "@/components/supervisor/StudentTable";
import EmptyState from "@/components/shared/EmptyState";
import SkeletonRow from "@/components/shared/SkeletonRow";
import { Button } from "../../../@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  Folder01Icon,
  Clock01Icon,
  CheckmarkBadge01Icon,
} from "@hugeicons/core-free-icons";
import type { Student } from "@/types";

type DashboardStats = {
  total_students: number;
  total_submissions: number;
  pending_reviews: number;
  publishable_count: number;
};

export default function SupervisorDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      getStudents().catch(() => []),
      getDashboardStats().catch(() => null),
    ])
      .then(([studentsData, statsData]) => {
        setStudents(studentsData as Student[]);
        setStats(statsData as DashboardStats | null);
        console.log(stats);
        console.log(students);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <PageWrapper>
      <div className="flex items-center justify-between md:hidden mb-2">
        <h2 className="text-lg font-medium">Students Overview</h2>
        <Button
          onClick={() => navigate("/supervisor/upload-students")}
          className="bg-tf-black text-white px-3 py-1.5 rounded-xl text-xs font-medium"
        >
          Add Students
        </Button>
      </div>

      {/* Stats Grid */}
      {!isLoading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl border border-tf-gray-100 flex flex-col gap-3">
            <div className="w-8 h-8 rounded-full bg-tf-gray-50 flex items-center justify-center text-tf-gray-500">
              <HugeiconsIcon icon={UserGroupIcon} size={18} />
            </div>
            <div>
              <p className="text-2xl font-semibold text-tf-black">
                {stats.total_students}
              </p>
              <p className="text-xs font-medium text-tf-gray-500 mt-0.5">
                Total Students
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-tf-gray-100 flex flex-col gap-3">
            <div className="w-8 h-8 rounded-full bg-tf-blue-50 flex items-center justify-center text-tf-blue-700">
              <HugeiconsIcon icon={Folder01Icon} size={18} />
            </div>
            <div>
              <p className="text-2xl font-semibold text-tf-black">
                {stats.total_submissions}
              </p>
              <p className="text-xs font-medium text-tf-gray-500 mt-0.5">
                Submissions
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-tf-gray-100 flex flex-col gap-3">
            <div className="w-8 h-8 rounded-full bg-tf-amber-50 flex items-center justify-center text-tf-amber-700">
              <HugeiconsIcon icon={Clock01Icon} size={18} />
            </div>
            <div>
              <p className="text-2xl font-semibold text-tf-black">
                {stats.pending_reviews}
              </p>
              <p className="text-xs font-medium text-tf-gray-500 mt-0.5">
                Pending Reviews
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-tf-gray-100 flex flex-col gap-3">
            <div className="w-8 h-8 rounded-full bg-tf-green-50 flex items-center justify-center text-tf-green-700">
              <HugeiconsIcon icon={CheckmarkBadge01Icon} size={18} />
            </div>
            <div>
              <p className="text-2xl font-semibold text-tf-black">
                {stats.publishable_count}
              </p>
              <p className="text-xs font-medium text-tf-gray-500 mt-0.5">
                Publishable
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      {isLoading ? (
        <div className="rounded-xl border border-tf-gray-100 overflow-hidden">
          <div className="bg-tf-gray-50 h-12 border-b border-tf-gray-100" />
          {[...Array(5)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : students.length > 0 ? (
        <StudentTable students={students} />
      ) : (
        <EmptyState
          icon={UserGroupIcon}
          heading="No students yet"
          sub="Upload an Excel sheet containing your students' details to create their accounts."
          action={
            <Button
              onClick={() => navigate("/supervisor/upload-students")}
              className="bg-tf-white text-tf-black border border-tf-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-tf-gray-50"
            >
              Upload student list
            </Button>
          }
        />
      )}
    </PageWrapper>
  );
}
