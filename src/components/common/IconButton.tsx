import { cn } from "../../lib/utils";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip?: string;
}

export function IconButton({ className, tooltip, ...props }: IconButtonProps) {
  return (
    <button
      title={tooltip}
      className={cn(
        "p-1.5 rounded-md text-text-secondary hover:text-text hover:bg-bg-tertiary",
        "transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        className
      )}
      {...props}
    />
  );
}
