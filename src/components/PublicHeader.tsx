import Image from "next/image";
import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="border-b border-line bg-warm-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Empowr CIC"
            width={140}
            height={140}
            className="h-auto w-[44px]"
          />
          <span className="text-lg font-black tracking-tight text-black">
            Empowr Members
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-bold text-mid">
          <Link href="/sessions" className="transition-colors hover:text-blue">
            Sessions
          </Link>
          <Link href="/account" className="transition-colors hover:text-blue">
            My account
          </Link>
        </nav>
      </div>
    </header>
  );
}
