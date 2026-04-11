import RemindersPanel from "./Profile/RemindersPanel";
import { MessageSquare } from "lucide-react";

const RemindersPage = () => {
  return (
    <div className="space-y-[32px] animate-fade-in-up md:max-w-4xl mx-auto">
      <div>
        <h1 className="text-[22px] font-bold text-[#0F172A] flex items-center gap-[8px]">
          <MessageSquare size={24} className="text-[#4F46E5]" /> General Settings
        </h1>
        <p className="text-[14px] text-[#64748B] mt-[4px]">Manage automation, notifications, and other general system tools.</p>
      </div>

      <RemindersPanel />
    </div>
  );
};

export default RemindersPage;
