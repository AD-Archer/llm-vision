interface UserProfileSectionProps {
  email: string | undefined;
  name: string | undefined;
}

export function UserProfileSection({ email, name }: UserProfileSectionProps) {
  return (
    <div className="p-4 sm:p-6 border-b border-slate-700">
      <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">
        Account
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email || ""}
            disabled
            className="w-full px-3 sm:px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 text-sm cursor-not-allowed"
          />
          <p className="text-xs text-slate-400 mt-1">Your account email</p>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={name || ""}
            disabled
            className="w-full px-3 sm:px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 text-sm cursor-not-allowed"
          />
          <p className="text-xs text-slate-400 mt-1">Derived from your email</p>
        </div>
      </div>
    </div>
  );
}
