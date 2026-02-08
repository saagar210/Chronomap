export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
