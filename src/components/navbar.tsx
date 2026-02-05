import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/auth/actions";
import MobileNav from "./mobile-nav";

const categories = [
  { name: "General", slug: "general-discussion" },
  { name: "Training", slug: "training-technique" },
  { name: "Gear", slug: "gear-equipment" },
  { name: "Spots", slug: "spots-travel" },
  { name: "Beginners", slug: "beginner-questions" },
];

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("username")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <MobileNav user={profile} />
          <Link href="/" className="text-lg font-bold text-blue-600">
            Freediving Forum
          </Link>
          <div className="hidden items-center gap-4 md:flex">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/c/${cat.slug}`}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <form action="/search" method="get" className="hidden md:block">
            <input
              name="q"
              type="search"
              placeholder="Search..."
              className="w-40 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </form>
          {user && profile ? (
            <>
              <Link
                href="/new"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                New Post
              </Link>
              <Link
                href={`/profile/${profile.username}`}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {profile.username}
              </Link>
              <form action={signout}>
                <button
                  type="submit"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
