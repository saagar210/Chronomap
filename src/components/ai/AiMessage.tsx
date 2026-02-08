import { cn } from "../../lib/utils";
import { Bot, User } from "lucide-react";

interface AiMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function AiMessage({ role, content }: AiMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-2 mb-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
          isUser ? "bg-accent" : "bg-bg-tertiary"
        )}
      >
        {isUser ? (
          <User size={12} className="text-white" />
        ) : (
          <Bot size={12} className="text-text-secondary" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed",
          isUser
            ? "bg-accent text-white rounded-br-sm"
            : "bg-bg-tertiary text-text rounded-bl-sm"
        )}
      >
        {content}
      </div>
    </div>
  );
}
