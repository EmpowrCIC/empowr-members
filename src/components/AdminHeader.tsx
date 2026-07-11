import Image from "next/image";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";

export function AdminHeader() {
  return (
    <header className="border-b border-line bg-warm-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/admin" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Empowr CIC"
            width={140}
            height={140}
            className="h-auto w-[44px]"
          />
          <span className="text-lg font-black tracking-tight text-black">
            Members Admin
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-bold text-mid">
          <Link href="/admin/offerings" className="transition-colors hover:text-blue">
            Offerings
          </Link>
          <Link href="/admin/venues" className="transition-colors hover:text-blue">
            Venues
          </Link>
          <Link href="/account" className="transition-colors hover:text-blue">
            Member site
          </Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
