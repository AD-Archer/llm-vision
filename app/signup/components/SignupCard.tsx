interface SignupCardProps {
  children: React.ReactNode;
}

export default function SignupCard({ children }: SignupCardProps) {
  return (
    <div className="bg-slate-800 rounded-lg shadow-2xl p-4 sm:p-6 md:p-8 border border-slate-700">
      {children}
    </div>
  );
}
