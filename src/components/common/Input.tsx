import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text",
          "placeholder:text-text-muted",
          "focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent",
          className
        )}
        {...props}
      />
    </div>
  );
}
