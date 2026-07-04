import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getMySubmissions, uploadSubmission } from "@/lib/api/student";
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
  SelectGroup,
} from "../../../@/components/ui/select";
import {
  CHAPTER_OPTIONS,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_TYPES,
} from "@/lib/constants";
import { getErrorMessage } from "@/lib/error";
import { formatDistanceToNow } from "date-fns";
import type { Submission, ChapterLabel } from "@/types";
import { cn } from "../../../@/lib/utils";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [chapterLabel, setChapterLabel] = useState<ChapterLabel | "">("");
  const [note, setNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const data = await getMySubmissions();
      const sortedData = [...data].sort(
        (a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt),
      );
      setSubmissions(sortedData);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getMySubmissions()
      .then((data) => {
        const sortedData = [...data].sort(
          (a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt),
        );
        setSubmissions(sortedData);
        console.log(data);
      })
      .catch((err) =>
        toast.error(getErrorMessage(err) || "Failed to load submissions"),
      )
      .finally(() => setLoading(false));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("File is too large. Max size is 20MB.");
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error("Only PDF and DOCX files are allowed.");
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !chapterLabel) {
      toast.error("Please select a file and chapter.");
      return;
    }

    setIsUploading(true);
    try {
      await uploadSubmission(chapterLabel, selectedFile, note || undefined);
      toast.success("Submission uploaded successfully");
      setSelectedFile(null);
      setChapterLabel("");
      setNote("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchSubmissions();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <PageWrapper>
      {/* Upload Section */}
      <div className="bg-white rounded-xl border border-tf-gray-100 p-8">
        <h2 className="text-lg font-medium text-tf-black mb-4">
          Upload New Submission
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2 flex flex-col md:flex-row md:justify-start md:items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-tf-gray-500 mb-1.5">
                Chapter / Draft
              </label>
              <Select
                value={chapterLabel}
                onValueChange={(value) =>
                  setChapterLabel(value as ChapterLabel)
                }
              >
                <SelectTrigger
                  className={cn(
                    "h-12 rounded-xl border-tf-gray-200 text-sm bg-white focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200",
                  )}
                >
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {CHAPTER_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt}
                        value={opt}
                        className={cn("hover:bg-tf-gray-50")}
                      >
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-tf-gray-500 mb-1.5">
                File (PDF or DOCX)
              </label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileSelect}
                className={cn(
                  "rounded-xl border-tf-gray-200 text-sm bg-white focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200",
                )}
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-tf-gray-500 mb-1.5">
              Note (optional)
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a short note for your supervisor..."
              className={cn(
                "h-12 rounded-xl border-tf-gray-200 text-sm bg-white focus-visible:ring-2 focus-visible:ring-tf-blue-700 focus-visible:ring-offset-1 transition-all duration-200",
              )}
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile || !chapterLabel}
              className="bg-tf-black text-white rounded-xl h-12 px-6"
            >
              {isUploading ? "Uploading..." : "Submit"}
            </Button>
          </div>
        </div>
      </div>
      {/* Submissions List */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-tf-black">My Submissions</h2>
        {loading ? (
          <div className="h-48 bg-tf-gray-50 animate-pulse rounded-xl" />
        ) : submissions.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-tf-gray-200 p-10 text-center text-tf-gray-500">
            No submissions yet. Upload your first chapter above.
          </div>
        ) : (
          submissions.map((sub) => (
            <div
              key={sub.id}
              onClick={() => navigate(`/student/submission/${sub.id}`)}
              className="bg-white rounded-xl border border-tf-gray-100 p-5 cursor-pointer hover:bg-tf-gray-50 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <ChapterBadge label={sub.chapterLabel} />
                  <FileTypeBadge type={sub.fileType} />
                  <span className="text-sm text-tf-gray-500">
                    {formatDistanceToNow(
                      new Date(
                        sub.uploadedAt.endsWith("Z")
                          ? sub.uploadedAt
                          : `${sub.uploadedAt}Z`,
                      ),
                      {
                        addSuffix: true,
                      },
                    )}
                  </span>
                </div>
                <span className="text-sm text-tf-blue-700 hover:underline">
                  {sub.commentCount > 0
                    ? `${sub.commentCount} comment${sub.commentCount === 1 ? "" : "s"}`
                    : "No comments yet"}
                </span>
              </div>
              <p className="text-base text-tf-black mt-3 font-medium">
                {sub.fileName}
              </p>
              {sub.studentNote && (
                <p className="text-sm text-tf-gray-600 mt-1 line-clamp-2">
                  {sub.studentNote}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </PageWrapper>
  );
}
