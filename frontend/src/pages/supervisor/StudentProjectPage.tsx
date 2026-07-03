import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  getStudentDetail,
  getStudentSubmissions,
  getComments,
  addComment,
  updatePublishabilityStatus,
} from "@/lib/api/supervisor";
import PageWrapper from "@/components/layout/PageWrapper";
import ChapterBadge from "@/components/shared/ChapterBadge";
import FileTypeBadge from "@/components/shared/FileTypeBadge";
import { Button } from "../../../@/components/ui/button";
import { Input } from "../../../@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../@/components/ui/select";
import { PUBLISHABILITY_OPTIONS } from "@/lib/constants";
import { getErrorMessage } from "@/lib/error";
import { formatDistanceToNow } from "date-fns";
import type { Student, Submission, Comment, PublishabilityStatus } from "@/types";

export default function StudentProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(true);
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    let submissionsData: Submission[] = [];
    Promise.all([getStudentDetail(id), getStudentSubmissions(id)])
      .then(([studentData, subsData]) => {
        submissionsData = subsData;
        setStudent(studentData);
        setSubmissions(subsData);
        return Promise.all(subsData.map((sub) => getComments(sub.id)));
      })
      .then((commentsData) => {
        const commentMap: Record<string, Comment[]> = {};
        submissionsData.forEach((sub, idx) => {
          commentMap[sub.id] = commentsData[idx];
        });
        setComments(commentMap);
      })
      .catch((err) => toast.error(getErrorMessage(err) || "Failed to load student data"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (status: PublishabilityStatus) => {
    if (!id || !student) return;
    try {
      const updated = await updatePublishabilityStatus(id, status);
      setStudent(updated);
      toast.success("Publishability status updated");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to update status");
    }
  };

  const handleAddComment = async (submissionId: string) => {
    const body = commentDraft[submissionId]?.trim();
    if (!body) return;
    try {
      const comment = await addComment(submissionId, body);
      setComments((prev) => ({
        ...prev,
        [submissionId]: [...(prev[submissionId] || []), comment],
      }));
      setCommentDraft((prev) => ({ ...prev, [submissionId]: "" }));
      toast.success("Comment added");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to add comment");
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="h-64 bg-tf-gray-50 animate-pulse rounded-xl" />
      </PageWrapper>
    );
  }

  if (!student) {
    return (
      <PageWrapper>
        <div className="text-center py-16 text-tf-gray-500">Student not found.</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* Header */}
      <div className="bg-white rounded-xl border border-tf-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-medium text-tf-black">{student.name}</h1>
            <p className="text-sm text-tf-gray-500 font-mono mt-0.5">
              {student.matricNumber} · {student.department}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-tf-gray-500">Publishability:</span>
            <Select
              value={student.publishabilityStatus || "null"}
              onValueChange={(value) =>
                handleStatusChange(value === "null" ? null : (value as PublishabilityStatus))
              }
            >
              <SelectTrigger className="w-[180px] rounded-xl h-10">
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">No Status</SelectItem>
                {PUBLISHABILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-medium text-tf-gray-500 uppercase tracking-wide">
            Project Title
          </h2>
          <p className="text-base text-tf-black mt-1">{student.projectTitle}</p>
        </div>
      </div>

      {/* Submissions */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-tf-black">Submissions</h2>
        {submissions.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-tf-gray-200 p-10 text-center text-tf-gray-500">
            No submissions yet.
          </div>
        ) : (
          submissions.map((sub) => (
            <div
              key={sub.id}
              className="bg-white rounded-xl border border-tf-gray-100 overflow-hidden"
            >
              <div className="p-5 border-b border-tf-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ChapterBadge label={sub.chapterLabel} />
                    <FileTypeBadge type={sub.fileType} />
                    <span className="text-sm text-tf-gray-500">
                      {formatDistanceToNow(new Date(sub.uploadedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <a
                    href={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}${sub.fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-tf-blue-700 hover:underline"
                  >
                    Download {sub.fileName}
                  </a>
                </div>
                {sub.studentNote && (
                  <p className="text-sm text-tf-gray-600 mt-3">{sub.studentNote}</p>
                )}
              </div>

              {/* Comments */}
              <div className="p-5 bg-tf-gray-50">
                <h3 className="text-sm font-medium text-tf-gray-700 mb-3">
                  Comments ({comments[sub.id]?.length || 0})
                </h3>
                <div className="space-y-3 mb-4">
                  {(comments[sub.id] || []).map((comment) => (
                    <div key={comment.id} className="bg-white p-3 rounded-lg border border-tf-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-tf-black">
                          {comment.authorName}
                        </span>
                        <span className="text-xs text-tf-gray-400">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-tf-gray-600">{comment.body}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={commentDraft[sub.id] || ""}
                    onChange={(e) =>
                      setCommentDraft((prev) => ({ ...prev, [sub.id]: e.target.value }))
                    }
                    placeholder="Add a comment..."
                    className="bg-white rounded-xl h-10"
                  />
                  <Button
                    onClick={() => handleAddComment(sub.id)}
                    className="bg-tf-black text-white rounded-xl h-10 px-4"
                  >
                    Post
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </PageWrapper>
  );
}
