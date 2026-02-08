interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {icon && <div className="text-text-muted mb-3">{icon}</div>}
      <h3 className="text-sm font-medium text-text mb-1">{title}</h3>
      <p className="text-xs text-text-muted mb-4 max-w-[240px]">{description}</p>
      {action}
    </div>
  );
}
