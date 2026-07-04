import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { uploadStudentsExcel, createStudent } from "@/lib/api/supervisor";
import { getErrorMessage } from "@/lib/error";
import PageWrapper from "@/components/layout/PageWrapper";
import { Button } from "../../../@/components/ui/button";
import { Input } from "../../../@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FileUploadIcon,
  Alert01Icon,
  File01Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "../../../@/lib/utils";
import type { StudentImportRow } from "@/types";

type SingleStudentForm = {
  name: string;
  matricNumber: string;
  projectTitle: string;
  department: string;
};

export default function UploadStudentsPage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [failedRows, setFailedRows] = useState<StudentImportRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [singleStudent, setSingleStudent] = useState<SingleStudentForm>({
    name: "",
    matricNumber: "",
    projectTitle: "",
    department: "",
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    setFailedRows([]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const res = await uploadStudentsExcel(selectedFile);

      if (res.imported > 0) {
        toast.success(`${res.imported} accounts created successfully`);
      }

      if (res.failed && res.failed.length > 0) {
        setFailedRows(res.failed);
        toast.error(`${res.failed.length} rows failed validation`);
      } else {
        navigate("/supervisor/dashboard");
      }
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to process Excel file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateSingle = async () => {
    if (
      !singleStudent.name ||
      !singleStudent.matricNumber ||
      !singleStudent.projectTitle ||
      !singleStudent.department
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsCreating(true);
    try {
      await createStudent(singleStudent);
      toast.success("Student account created successfully");
      navigate("/supervisor/dashboard");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to create student");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Single Student Form */}
        <div className="bg-white rounded-xl border border-tf-gray-100 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-tf-gray-50 rounded-lg text-tf-gray-700">
              <HugeiconsIcon icon={UserAdd01Icon} size={20} />
            </div>
            <div>
              <h2 className="text-lg font-medium text-tf-black">Add Single Student</h2>
              <p className="text-sm text-tf-gray-500">
                Create one student account manually.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-tf-gray-500">Full Name</label>
              <Input
                value={singleStudent.name}
                onChange={(e) =>
                  setSingleStudent((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Amara Okafor"
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-tf-gray-500">Matric Number</label>
              <Input
                value={singleStudent.matricNumber}
                onChange={(e) =>
                  setSingleStudent((prev) => ({ ...prev, matricNumber: e.target.value }))
                }
                placeholder="e.g. 22/11450"
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-medium text-tf-gray-500">Project Title</label>
              <Input
                value={singleStudent.projectTitle}
                onChange={(e) =>
                  setSingleStudent((prev) => ({ ...prev, projectTitle: e.target.value }))
                }
                placeholder="e.g. AI-Powered Crop Disease Detection"
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-medium text-tf-gray-500">Department</label>
              <Input
                value={singleStudent.department}
                onChange={(e) =>
                  setSingleStudent((prev) => ({ ...prev, department: e.target.value }))
                }
                placeholder="e.g. Computer Science"
                className="h-12 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              onClick={handleCreateSingle}
              disabled={isCreating}
              className="bg-tf-black text-white hover:bg-tf-gray-900 rounded-xl h-12 px-6"
            >
              {isCreating ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center">
          <div className="flex-1 border-t border-tf-gray-200" />
          <span className="px-4 text-sm text-tf-gray-400">or upload in bulk</span>
          <div className="flex-1 border-t border-tf-gray-200" />
        </div>

        {/* Excel Upload */}
        <div className="bg-white rounded-xl border border-tf-gray-100 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-tf-gray-50 rounded-lg text-tf-gray-700">
              <HugeiconsIcon icon={FileUploadIcon} size={20} />
            </div>
            <div>
              <h2 className="text-lg font-medium text-tf-black">Bulk Upload</h2>
              <p className="text-sm text-tf-gray-500">
                Upload an Excel file with columns: Name, Matric Number, Project Title, Department.
              </p>
            </div>
          </div>

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
                : "Must contain columns for Name, Matric Number, Project Title, Department."}
            </p>
          </div>

          {selectedFile && failedRows.length === 0 && (
            <div className="flex justify-end mt-6">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="bg-tf-black text-white hover:bg-tf-gray-900 rounded-xl h-12 px-6"
              >
                {isUploading ? "Uploading & Processing..." : "Upload and Create Accounts"}
              </Button>
            </div>
          )}
        </div>

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
                  These rows were skipped. Fix them in your Excel file and upload again.
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
