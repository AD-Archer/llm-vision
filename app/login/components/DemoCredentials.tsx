export function DemoCredentials() {
  return (
    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-700">
      <p className="text-xs text-slate-400 text-center mb-2 sm:mb-3">
        Demo credentials (use any email & password):
      </p>
      <div className="bg-slate-900 rounded p-2.5 sm:p-3 text-xs text-slate-300">
        <p>
          📧 <span className="font-mono text-xs">demo@example.com</span>
        </p>
        <p>
          🔐 <span className="font-mono text-xs">password123</span>
        </p>
      </div>
    </div>
  );
}
