export function OnboardingContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-3 sm:px-4">
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  );
}
