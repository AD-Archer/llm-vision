interface AccountDetailsFormProps {
  email: string;
  password: string;
  error: string | null;
  isLoading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export default function AccountDetailsForm({
  email,
  password,
  error,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onBack,
  onSubmit,
}: AccountDetailsFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
          Create Your Account
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-4">
          Set up your login credentials
        </p>
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2"
        >
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="you@example.com"
          disabled={isLoading}
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          required
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="••••••••"
          disabled={isLoading}
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          required
        />
        <p className="text-xs text-slate-400 mt-1">At least 6 characters</p>
      </div>

      {error && (
        <div className="p-2.5 sm:p-3 bg-red-900/20 border border-red-700 rounded-lg text-xs sm:text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 py-2 sm:py-2.5 px-3 sm:px-4 bg-slate-700 hover:bg-slate-600 text-xs sm:text-sm text-slate-200 font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-2 sm:py-2.5 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creating account..." : "Sign Up"}
        </button>
      </div>
    </form>
  );
}
