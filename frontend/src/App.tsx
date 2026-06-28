import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import LoginPage from "@/pages/auth/LoginPage";
import ChangePasswordPage from "@/pages/auth/ChangePasswordPage";
import SupervisorDashboard from "@/pages/supervisor/SupervisorDashboard";
import UploadStudentsPage from "@/pages/supervisor/UploadStudentsPage";
import StudentProjectPage from "@/pages/supervisor/StudentProjectPage";
import SupervisorSettings from "@/pages/supervisor/SupervisorSettings";
import StudentDashboard from "@/pages/student/StudentDashboard";
import SubmissionDetailPage from "@/pages/student/SubmissionDetailPage";
import StudentSettings from "@/pages/student/StudentSettings";
import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/router/ProtectedRoute";
import RoleRoute from "@/router/RoleRoute";

// Temporary imports for Phase 1 Design Verification
import StatusBadge from "@/components/shared/StatusBadge";
import ChapterBadge from "@/components/shared/ChapterBadge";
import FileTypeBadge from "@/components/shared/FileTypeBadge";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        {/* PHASE 1: TEMPORARY DESIGN SYSTEM TEST ROUTE */}
        <Route
          path="/test"
          element={
            <div className="p-10 space-y-8 bg-tf-gray-50 min-h-screen">
              <h1 className="text-xl font-semibold text-tf-black">
                Design System Verification
              </h1>
              <div className="flex gap-4">
                <StatusBadge status="publishable" />
                <StatusBadge status="needs_further_work" />
                <StatusBadge status="not_publishable" />
                <StatusBadge status={null} />
              </div>
              <div className="flex gap-4">
                <ChapterBadge label="CH 01" />
                <ChapterBadge label="FULL DRAFT" />
              </div>
              <div className="flex gap-4">
                <FileTypeBadge type="pdf" />
                <FileTypeBadge type="docx" />
              </div>
            </div>
          }
        />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />

        {/* Supervisor routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRole="supervisor" />}>
            <Route element={<AppShell role="supervisor" />}>
              <Route
                path="/supervisor/dashboard"
                element={<SupervisorDashboard />}
              />
              <Route
                path="/supervisor/upload-students"
                element={<UploadStudentsPage />}
              />
              <Route
                path="/supervisor/student/:id"
                element={<StudentProjectPage />}
              />
              <Route
                path="/supervisor/settings"
                element={<SupervisorSettings />}
              />
            </Route>
          </Route>
        </Route>

        {/* Student routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRole="student" />}>
            <Route element={<AppShell role="student" />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route
                path="/student/submission/:id"
                element={<SubmissionDetailPage />}
              />
              <Route path="/student/settings" element={<StudentSettings />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
