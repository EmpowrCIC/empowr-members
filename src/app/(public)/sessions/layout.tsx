import { PublicHeader } from "@/components/PublicHeader";

export default function SessionsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-cream">
      <PublicHeader />
      {children}
    </div>
  );
}
