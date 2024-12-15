export function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="p-4 text-gray-400 flex items-center justify-center min-h-[200px]">
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        <span>{message}</span>
      </div>
    </div>
  )
} 