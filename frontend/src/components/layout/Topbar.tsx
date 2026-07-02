import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../../@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserAdd01Icon } from "@hugeicons/core-free-icons";

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Dynamic titles based on route
  const getPageInfo = () => {
    if (location.pathname.includes("/supervisor/dashboard"))
      return { title: "Dashboard", showUploadBtn: true };
    if (location.pathname.includes("/supervisor/upload-students"))
      return { title: "Upload Students", showUploadBtn: false };
    if (location.pathname.includes("/supervisor/settings"))
      return { title: "Settings", showUploadBtn: false };
    if (location.pathname.includes("/student/dashboard"))
      return { title: "My Project", showUploadBtn: false };
    if (location.pathname.includes("/student/settings"))
      return { title: "Settings", showUploadBtn: false };
    return { title: "ThesisFlow", showUploadBtn: false };
  };

  const { title, showUploadBtn } = getPageInfo();

  return (
    <header className="h-15 md:h-18 bg-white border-b border-tf-gray-100 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-10">
      <h1 className="text-lg md:text-xl font-medium text-tf-black">{title}</h1>

      {showUploadBtn && (
        <Button
          onClick={() => navigate("/supervisor/upload-students")}
          className="bg-tf-white text-tf-black border border-tf-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-tf-gray-50 h-9 hidden md:flex items-center gap-2"
        >
          <HugeiconsIcon icon={UserAdd01Icon} size={18} />
          Upload student list
        </Button>
      )}
    </header>
  );
}
