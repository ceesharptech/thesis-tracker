import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getSubmissionDetail, getSubmissionComments, getSubmissionAnnotations } from "@/lib/api/student";
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
  /**
   * WORKAROUND: annotation count fetched separately because SubmissionResponse
   * does not yet include annotation_count from the backend.
   * TODO: Once backend adds annotation_count to SubmissionResponse, read it
   * from submission.annotationCount and remove this secondary fetch.
   */
  const [annotationCount, setAnnotationCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getSubmissionDetail(id),
      getSubmissionComments(id),
      // WORKAROUND: fetch annotations just to get the count for the button.
      // Remove once backend exposes annotation_count on SubmissionResponse.
      getSubmissionAnnotations(id).catch(() => []),
    ])
      .then(([subData, commentsData, annotationsData]) => {
        setSubmission(subData);
        setComments(commentsData);
        setAnnotationCount((annotationsData as { length: number }).length);
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
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}${submission.fileUrl}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-tf-blue-700 hover:underline flex gap-2"
            >
              <HugeiconsIcon icon={Download01Icon} size={18} />
              Download {submission.fileName}
            </a>

            {/*
             * View Annotations button — shown when supervisor has left inline
             * annotations. Count is fetched separately (see WORKAROUND above).
             * @see ThesisFlow Annotation Implementation Plan § 5.5
             */}
            {annotationCount > 0 && (
              <Button
                variant="outline"
                onClick={() => navigate(`/student/submission/${id}/annotate`)}
                className="rounded-xl border-tf-blue-700/30 text-tf-blue-700 hover:bg-tf-blue-50 text-sm h-9 px-4 flex items-center gap-2"
              >
                {/* Chat bubble icon */}
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                View {annotationCount} annotation
                {annotationCount !== 1 ? "s" : ""}
              </Button>
            )}
          </div>
        </div>

        <p className="text-sm text-tf-gray-500 mt-4">
          Submitted{" "}
          {formatDistanceToNow(
            new Date(
              submission.uploadedAt.endsWith("Z")
                ? submission.uploadedAt
                : `${submission.uploadedAt}Z`,
            ),
            {
              addSuffix: true,
            },
          )}
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
                    {formatDistanceToNow(
                      new Date(
                        comment.createdAt.endsWith("Z")
                          ? comment.createdAt
                          : `${comment.createdAt}Z`,
                      ),
                      {
                        addSuffix: true,
                      },
                    )}
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
