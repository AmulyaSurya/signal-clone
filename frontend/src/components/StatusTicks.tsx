import { Check, CheckCheck, Clock } from "lucide-react";
import { MessageStatus } from "@/types";

export default function StatusTicks({ status }: { status: MessageStatus }) {
  if (status === "sending") {
    return <Clock size={13} className="text-white/70" />;
  }
  if (status === "sent") {
    return <Check size={14} className="text-white/70" />;
  }
  if (status === "delivered") {
    return <CheckCheck size={14} className="text-white/70" />;
  }
  // read
  return <CheckCheck size={14} className="text-sky-300" />;
}
