import { MemberHeader } from "@/components/MemberHeader";

export default function MemberLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-cream">
      <MemberHeader />
      {children}
    </div>
  );
}
