import Link from "next/link";

export function SignUpLink() {
  return (
    <div className="mt-4 sm:mt-6 text-center">
      <p className="text-xs sm:text-sm text-slate-400">
        New to LLM Vision?{" "}
        <Link
          href="/signup"
          className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          Sign up with an invitation
        </Link>
      </p>
    </div>
  );
}
