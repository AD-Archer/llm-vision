export function SaveSuccessMessage() {
  return (
    <div className="fixed bottom-3 sm:bottom-4 right-3 sm:right-4 left-3 sm:left-auto p-3 sm:p-4 bg-green-900/30 border border-green-700 rounded-lg text-xs sm:text-sm text-green-400 flex items-center gap-2">
      <svg
        className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      Settings saved successfully!
    </div>
  );
}
