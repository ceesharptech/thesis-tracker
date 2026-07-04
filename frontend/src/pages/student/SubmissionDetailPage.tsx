import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getSubmissionDetail, getSubmissionComments } from "@/lib/api/student";
import { getErrorMessage } from "@/lib/error";
import PageWrapper from "@/components/layout/PageWrapper";
import ChapterBadge from "@/components/shared/ChapterBadge";
import FileTypeBadge from "@/components/shared/FileTypeBadge";
import { Button } from "../../../@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import type { Submission, Comment } from "@/types";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon } from "@hugeicons/core-free-icons";

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getSubmissionDetail(id), getSubmissionComments(id)])
      .then(([subData, commentsData]) => {
        setSubmission(subData);
        setComments(commentsData);
      })
      .catch((err) =>
        toast.error(getErrorMessage(err) || "Failed to load submission"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="h-64 bg-tf-gray-50 animate-pulse rounded-xl" />
      </PageWrapper>
    );
  }

  if (!submission) {
    return (
      <PageWrapper>
        <div className="text-center py-16 text-tf-gray-500">
          Submission not found.
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Button
        variant="outline"
        onClick={() => navigate("/student/dashboard")}
        className="mb-4 rounded-xl border-tf-gray-200"
      >
        ← Back to dashboard
      </Button>

      <div className="bg-white rounded-xl border border-tf-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ChapterBadge label={submission.chapterLabel} />
            <FileTypeBadge type={submission.fileType} />
          </div>
          <a
            href={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}${submission.fileUrl}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-tf-blue-700 hover:underline flex gap-2"
          >
            <HugeiconsIcon icon={Download01Icon} size={18} />
            Download {submission.fileName}
          </a>
        </div>

        <p className="text-sm text-tf-gray-500 mt-4">
          Submitted{" "}
          {formatDistanceToNow(new Date(submission.uploadedAt), {
            addSuffix: true,
          })}
        </p>

        {submission.studentNote && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-tf-gray-700 mb-1">
              Your Note
            </h3>
            <p className="text-sm text-tf-gray-600">{submission.studentNote}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-tf-gray-100 p-6">
        <h2 className="text-lg font-medium text-tf-black mb-4">
          Supervisor Comments ({comments.length})
        </h2>
        {comments.length === 0 ? (
          <p className="text-sm text-tf-gray-500">No comments yet.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-tf-gray-50 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-tf-black">
                    {comment.authorName}
                  </span>
                  <span className="text-xs text-tf-gray-400">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-sm text-tf-gray-700">{comment.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
