import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { uploadStudentsExcel } from "@/lib/api/supervisor";
import { getErrorMessage } from "@/lib/error";
import { EXCEL_COLUMN_MAP } from "@/lib/constants";
import PageWrapper from "@/components/layout/PageWrapper";
import { Button } from "../../../@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FileUploadIcon,
  Alert01Icon,
  InformationCircleIcon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "../../../@/lib/utils";
import type { StudentImportRow } from "@/types";

export default function UploadStudentsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCheckingHeaders, setIsCheckingHeaders] = useState(false);
  const [headerErrors, setHeaderErrors] = useState<string[]>([]);

  const [failedRows, setFailedRows] = useState<StudentImportRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validate File Type
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

    // Reset states
    setSelectedFile(null);
    setHeaderErrors([]);
    setFailedRows([]);
    setIsCheckingHeaders(true);

    // 2. Pre-parse headers client-side to ensure consistency
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Read just the first row (headers)
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
        if (rows.length === 0) throw new Error("The Excel file is empty.");

        const rawHeaders = rows[0] || [];
        const headers = rawHeaders.map((h) => String(h).toLowerCase().trim());

        const missingColumns: string[] = [];

        // Check required columns against constants mapping
        if (!EXCEL_COLUMN_MAP.name.some((opt) => headers.includes(opt))) {
          missingColumns.push("Name");
        }
        if (
          !EXCEL_COLUMN_MAP.matricNumber.some((opt) => headers.includes(opt))
        ) {
          missingColumns.push("Matric Number");
        }
        if (
          !EXCEL_COLUMN_MAP.projectTitle.some((opt) => headers.includes(opt))
        ) {
          missingColumns.push("Project Title");
        }

        if (missingColumns.length > 0) {
          setHeaderErrors(missingColumns);
        } else {
          // File is perfectly valid, stage it for backend upload
          setSelectedFile(file);
        }
      } catch (err) {
        toast.error(
          "Failed to read the file. Ensure it is a valid Excel spreadsheet.",
        );
      } finally {
        setIsCheckingHeaders(false);
        // Reset input value so the same file can trigger onChange again if needed
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
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
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to process Excel file");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Expected Format Guide */}
        <div className="bg-white border border-tf-gray-100 rounded-xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
          <div className="bg-tf-blue-50 text-tf-blue-700 p-3 rounded-full shrink-0">
            <HugeiconsIcon icon={InformationCircleIcon} size={24} />
          </div>
          <div>
            <h2 className="text-lg font-medium text-tf-black mb-2">
              Required Excel Format
            </h2>
            <p className="text-sm text-tf-gray-500 mb-4">
              Your file must be a <strong>.xlsx</strong> or{" "}
              <strong>.xls</strong> file containing a header row. Ensure your
              sheet includes the following columns (variants are accepted):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-tf-gray-50 p-4 rounded-xl border border-tf-gray-100">
                <div className="text-sm font-medium text-tf-black mb-1">
                  Name <span className="text-tf-red-700">*</span>
                </div>
                <div className="text-xs text-tf-gray-500 font-mono">
                  Accepts: name, full name, student name
                </div>
              </div>
              <div className="bg-tf-gray-50 p-4 rounded-xl border border-tf-gray-100">
                <div className="text-sm font-medium text-tf-black mb-1">
                  Matric Number <span className="text-tf-red-700">*</span>
                </div>
                <div className="text-xs text-tf-gray-500 font-mono">
                  Accepts: matric, matric number, reg no
                </div>
              </div>
              <div className="bg-tf-gray-50 p-4 rounded-xl border border-tf-gray-100">
                <div className="text-sm font-medium text-tf-black mb-1">
                  Project Title <span className="text-tf-red-700">*</span>
                </div>
                <div className="text-xs text-tf-gray-500 font-mono">
                  Accepts: project title, title, project
                </div>
              </div>
              <div className="bg-tf-gray-50 p-4 rounded-xl border border-tf-gray-100">
                <div className="text-sm font-medium text-tf-black mb-1">
                  Department (Optional)
                </div>
                <div className="text-xs text-tf-gray-500 font-mono">
                  Accepts: department, dept
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dropzone area */}
        <div
          className={cn(
            "relative border-2 border-dashed rounded-xl bg-white p-10 flex flex-col items-center justify-center text-center transition-colors",
            headerErrors.length > 0
              ? "border-tf-red-700 bg-tf-red-50/20"
              : "border-tf-gray-200 hover:bg-tf-gray-50",
          )}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx, .xls"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div
            className={cn(
              "mb-4 p-4 rounded-full",
              headerErrors.length > 0
                ? "bg-tf-red-50 text-tf-red-700"
                : "bg-tf-gray-50 text-tf-gray-400",
            )}
          >
            {headerErrors.length > 0 ? (
              <HugeiconsIcon icon={Alert01Icon} size={32} />
            ) : selectedFile ? (
              <HugeiconsIcon
                icon={CheckmarkCircle01Icon}
                size={32}
                className="text-tf-green-700"
              />
            ) : (
              <HugeiconsIcon icon={FileUploadIcon} size={32} />
            )}
          </div>

          <h3
            className={cn(
              "text-base font-medium mb-1",
              headerErrors.length > 0 ? "text-tf-red-700" : "text-tf-black",
            )}
          >
            {isCheckingHeaders
              ? "Analyzing headers..."
              : headerErrors.length > 0
                ? "Missing required columns"
                : selectedFile
                  ? selectedFile.name
                  : "Click or drag Excel file here"}
          </h3>

          <div className="text-sm">
            {headerErrors.length > 0 ? (
              <p className="text-tf-red-700">
                Your file is missing: <strong>{headerErrors.join(", ")}</strong>
                . Please update your file and try again.
              </p>
            ) : selectedFile ? (
              <p className="text-tf-gray-500">
                File ready for upload ({(selectedFile.size / 1024).toFixed(1)}{" "}
                KB)
              </p>
            ) : (
              <p className="text-tf-gray-500">Maximum file size: 20MB</p>
            )}
          </div>
        </div>

        {/* Action Button */}
        {selectedFile &&
          failedRows.length === 0 &&
          headerErrors.length === 0 && (
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

        {/* Failed Rows Preview Table (From Backend Response) */}
        {failedRows.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-tf-red-700 flex items-center gap-2">
                  <HugeiconsIcon icon={Alert01Icon} size={20} />
                  Failed Rows ({failedRows.length})
                </h3>
                <p className="text-sm text-tf-gray-500 mt-1">
                  These rows were skipped by the server. Fix them in your Excel
                  file and upload again.
                </p>
              </div>
            </div>

            <div className="w-full overflow-x-auto bg-white rounded-xl border border-tf-red-100 shadow-sm max-h-125 overflow-y-auto">
              <table className="w-full text-left border-collapse min-w-175">
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
