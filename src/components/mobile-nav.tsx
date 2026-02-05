"use client";

import { useState } from "react";
import Link from "next/link";

const categories = [
  { name: "General Discussion", slug: "general-discussion" },
  { name: "Training & Technique", slug: "training-technique" },
  { name: "Gear & Equipment", slug: "gear-equipment" },
  { name: "Spots & Travel", slug: "spots-travel" },
  { name: "Beginner Questions", slug: "beginner-questions" },
];

export default function MobileNav({
  user,
}: {
  user: { username: string } | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-600"
        aria-label="Toggle menu"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {open ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full border-b border-gray-200 bg-white px-4 py-3">
          <form action="/search" method="get" className="mb-3">
            <input
              name="q"
              type="search"
              placeholder="Search posts..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </form>
          <div className="space-y-2">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/c/${cat.slug}`}
                onClick={() => setOpen(false)}
                className="block text-sm text-gray-600 hover:text-gray-900"
              >
                {cat.name}
              </Link>
            ))}
          </div>
          <div className="mt-3 border-t border-gray-100 pt-3">
            {user ? (
              <Link
                href={`/profile/${user.username}`}
                onClick={() => setOpen(false)}
                className="block text-sm text-gray-600"
              >
                Profile ({user.username})
              </Link>
            ) : (
              <div className="flex gap-3">
                <Link
                  href="/auth/login"
                  onClick={() => setOpen(false)}
                  className="text-sm text-gray-600"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setOpen(false)}
                  className="text-sm text-blue-600"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
