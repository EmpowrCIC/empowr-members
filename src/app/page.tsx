export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight">
        Empowr Members
      </h1>
      <p className="max-w-md text-lg text-neutral-600">
        Book sessions, manage your membership, and access everything Empowr
        CIC offers — coming soon.
      </p>
      <a
        href="https://eela.empowrcic.org"
        className="mt-2 rounded-full border border-neutral-300 px-6 py-2 font-semibold transition-colors hover:bg-neutral-100"
      >
        Explore our sessions
      </a>
    </main>
  );
}
