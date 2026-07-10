import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getStudents,
  getDashboardStats,
  searchStudents,
} from "@/lib/api/supervisor";
import PageWrapper from "@/components/layout/PageWrapper";
import StudentTable from "@/components/supervisor/StudentTable";
import EmptyState from "@/components/shared/EmptyState";
import SkeletonRow from "@/components/shared/SkeletonRow";
import { Button } from "../../../@/components/ui/button";
import { Input } from "../../../@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  Folder01Icon,
  Clock01Icon,
  CheckmarkBadge01Icon,
  Search01Icon,
  Cancel01Icon,
  SearchVisualIcon,
  ArrowDown01Icon,
  FilterIcon,
} from "@hugeicons/core-free-icons";
import type { Student, PublishabilityStatus } from "@/types";

type DashboardStats = {
  total_students: number;
  total_submissions: number;
  pending_reviews: number;
  publishable_count: number;
};

export default function SupervisorDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPending, setFilterPending] = useState<"all" | "pending">("all");
  const [filterStatus, setFilterStatus] = useState<
    PublishabilityStatus | "all" | "no_status"
  >("all");

  const navigate = useNavigate();

  // 1. Initial Data Load
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const studentsData = await getStudents();
        setStudents(studentsData);
      } catch (err: any) {
        console.error(
          "Failed to fetch students:",
          err.response?.data || err.message,
        );
      }

      try {
        const statsData = await getDashboardStats();
        setStats(statsData);
      } catch (err: any) {
        console.error(
          "Failed to fetch stats:",
          err.response?.data || err.message,
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // 2. Debounced Search Effect
  useEffect(() => {
    if (isLoading) return;

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (searchQuery.trim() === "") {
          const data = await getStudents();
          setStudents(data);
        } else {
          const data = await searchStudents(searchQuery);
          setStudents(data);
        }
      } catch (err: any) {
        console.error("Search failed:", err.response?.data || err.message);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isLoading]);

  // 3. Apply Filters locally
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Pending Review Filter
      if (
        filterPending === "pending" &&
        student.pendingSubmissionsCount === 0
      ) {
        return false;
      }

      // Publishability Status Filter
      if (filterStatus !== "all") {
        if (
          filterStatus === "no_status" &&
          student.publishabilityStatus !== null
        ) {
          return false;
        }
        if (
          filterStatus !== "no_status" &&
          student.publishabilityStatus !== filterStatus
        ) {
          return false;
        }
      }

      return true;
    });
  }, [students, filterPending, filterStatus]);

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

      {/* Search and Filters Bar */}
      {!isLoading && (stats?.total_students || 0) > 0 && (
        <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-full md:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-tf-gray-400">
              <HugeiconsIcon icon={Search01Icon} size={18} />
            </div>
            <Input
              type="text"
              placeholder="Search by name, matric, or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-11 w-full rounded-xl bg-white border-tf-gray-200 text-sm focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-1 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-tf-gray-400 hover:text-tf-gray-900 transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={18} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <div className="items-center gap-2 text-tf-gray-500 hidden md:flex">
              <HugeiconsIcon icon={FilterIcon} size={18} />
            </div>

            {/* Pending Filter */}
            <div className="relative shrink-0">
              <select
                value={filterPending}
                onChange={(e) => setFilterPending(e.target.value as any)}
                className="h-11 appearance-none rounded-xl bg-white border border-tf-gray-200 text-sm text-tf-gray-700 pl-4 pr-10 focus:outline-none transition-all hover:cursor-pointer"
              >
                <option value="all">All Submissions</option>
                <option value="pending">Pending Review Only</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-tf-gray-400">
                <HugeiconsIcon icon={ArrowDown01Icon} size={16} />
              </div>
            </div>

            {/* Status Filter */}
            <div className="relative shrink-0">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="h-11 appearance-none rounded-xl bg-white border border-tf-gray-200 text-sm text-tf-gray-700 pl-4 pr-10 focus:outline-none transition-all hover:cursor-pointer"
              >
                <option value="all">Any Status</option>
                <option value="publishable">Publishable</option>
                <option value="needs_further_work">Needs Further Work</option>
                <option value="not_publishable">Not Publishable</option>
                <option value="disapproved">Disapproved</option>
                <option value="no_status">No Status</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-tf-gray-400">
                <HugeiconsIcon icon={ArrowDown01Icon} size={16} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Area */}
      {isLoading || isSearching ? (
        <div className="rounded-xl border border-tf-gray-100 overflow-hidden">
          <div className="bg-tf-gray-50 h-12 border-b border-tf-gray-100" />
          {[...Array(5)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : filteredStudents.length > 0 ? (
        <StudentTable students={filteredStudents} />
      ) : searchQuery ? (
        <EmptyState
          icon={SearchVisualIcon}
          heading="No results found"
          sub={`We couldn't find any students matching "${searchQuery}".`}
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setFilterPending("all");
                setFilterStatus("all");
              }}
              className="rounded-xl px-4"
            >
              Clear filters & search
            </Button>
          }
        />
      ) : filterPending !== "all" || filterStatus !== "all" ? (
        <EmptyState
          icon={FilterIcon}
          heading="No matches for selected filters"
          sub="Try adjusting your filter options to see more students."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setFilterPending("all");
                setFilterStatus("all");
              }}
              className="rounded-xl px-4 border border-tf-gray-200 text-sm font-medium hover:bg-tf-gray-50 hover:cursor-pointer"
            >
              Clear filters
            </Button>
          }
        />
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
