import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { uploadStudentsExcel } from "@/lib/api/supervisor";
import PageWrapper from "@/components/layout/PageWrapper";
import { Button } from "../../../@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FileUploadIcon,
  Alert01Icon,
  File01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "../../../@/lib/utils";
import type { StudentImportRow } from "@/types";

export default function UploadStudentsPage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [failedRows, setFailedRows] = useState<StudentImportRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verify it's an excel file (basic check)
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (
      !validTypes.includes(file.type) &&
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls")
    ) {
      toast.error("Please upload a valid .xlsx or .xls file");
      return;
    }

    setSelectedFile(file);
    setFailedRows([]); // Reset any previous errors
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsSubmitting(true);
    try {
      const res = await uploadStudentsExcel(selectedFile);

      if (res.imported > 0) {
        toast.success(`${res.imported} accounts created successfully`);
      }

      if (res.failed && res.failed.length > 0) {
        setFailedRows(res.failed);
        toast.error(`${res.failed.length} rows failed validation`);
      } else {
        // If everything succeeded, go back to dashboard
        navigate("/supervisor/dashboard");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to process Excel file");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Dropzone area */}
        <div className="relative border-2 border-dashed border-tf-gray-200 rounded-xl bg-white p-10 flex flex-col items-center justify-center text-center hover:bg-tf-gray-50 transition-colors">
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="text-tf-gray-400 mb-4 bg-tf-gray-50 p-4 rounded-full">
            <HugeiconsIcon
              icon={selectedFile ? File01Icon : FileUploadIcon}
              size={32}
            />
          </div>
          <h3 className="text-base font-medium text-tf-black mb-1">
            {selectedFile ? selectedFile.name : "Click or drag Excel file here"}
          </h3>
          <p className="text-sm text-tf-gray-500">
            {selectedFile
              ? `${(selectedFile.size / 1024).toFixed(1)} KB`
              : "Must contain columns for Name, Matric Number, and Project Title."}
          </p>
        </div>

        {/* Action Button */}
        {selectedFile && failedRows.length === 0 && (
          <div className="flex justify-end animate-in fade-in duration-300">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-tf-black text-white hover:bg-tf-gray-900 rounded-xl px-6 h-12 w-full md:w-auto"
            >
              {isSubmitting
                ? "Uploading & Processing..."
                : "Upload and Create Accounts"}
            </Button>
          </div>
        )}

        {/* Failed Rows Preview Table */}
        {failedRows.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-tf-red-700 flex items-center gap-2">
                  <HugeiconsIcon icon={Alert01Icon} size={20} />
                  Failed Rows ({failedRows.length})
                </h3>
                <p className="text-sm text-tf-gray-500 mt-1">
                  These rows were skipped. Fix them in your Excel file and
                  upload again.
                </p>
              </div>
            </div>

            <div className="w-full overflow-x-auto bg-white rounded-xl border border-tf-red-100 shadow-sm max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="sticky top-0 bg-tf-red-50 z-10 shadow-sm">
                  <tr className="text-xs font-medium text-tf-red-700 uppercase tracking-wide h-10 border-b border-tf-red-100">
                    <th className="px-4">Name</th>
                    <th className="px-4">Matric</th>
                    <th className="px-4">Project Title</th>
                    <th className="px-4">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {failedRows.map((row, i) => (
                    <tr
                      key={i}
                      className="h-12 border-b border-tf-gray-100 text-sm hover:bg-tf-gray-50"
                    >
                      <td className="px-4 py-2 text-tf-black">
                        <span
                          className={cn(!row.name && "text-tf-red-700 italic")}
                        >
                          {row.name || "Missing"}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-tf-gray-500 text-xs">
                        {row.matricNumber || "---"}
                      </td>
                      <td className="px-4 py-2 text-tf-black line-clamp-1">
                        {row.projectTitle || "---"}
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-xs font-medium text-tf-red-700">
                          {row.errors?.join(", ") || "Unknown error"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
