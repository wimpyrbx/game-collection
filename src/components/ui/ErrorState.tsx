interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ 
  message = "An error occurred", 
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-red-400">{message}</span>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="text-sm text-cyan-500 hover:text-cyan-400"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  )
} 