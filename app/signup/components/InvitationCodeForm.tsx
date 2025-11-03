import Link from "next/link";

interface InvitationCodeFormProps {
  invitationCode: string;
  error: string | null;
  isLoading: boolean;
  onCodeChange: (code: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export default function InvitationCodeForm({
  invitationCode,
  error,
  isLoading,
  onCodeChange,
  onSubmit,
}: InvitationCodeFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
          Enter Invitation Code
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-4">
          You should have received an 8-character code from your admin
        </p>
      </div>

      <div>
        <label
          htmlFor="code"
          className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2"
        >
          Invitation Code
        </label>
        <input
          id="code"
          type="text"
          value={invitationCode}
          onChange={(e) => {
            const code = e.target.value.toUpperCase().slice(0, 8);
            onCodeChange(code);
          }}
          placeholder="XXXXXXXX"
          disabled={isLoading}
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 uppercase tracking-widest text-center font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          required
          maxLength={8}
        />
      </div>

      {error && (
        <div className="p-2.5 sm:p-3 bg-red-900/20 border border-red-700 rounded-lg text-xs sm:text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || invitationCode.length !== 8}
        className="w-full py-2 sm:py-2.5 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>

      <div className="text-center">
        <p className="text-xs sm:text-sm text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Login here
          </Link>
        </p>
      </div>
    </form>
  );
}
