import { createClient } from "@/lib/supabase/server";
import PostCard from "@/components/post-card";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const supabase = await createClient();
  const { category: activeCategory, sort: sortParam } = await searchParams;
  const sort = sortParam || "latest";

  let query = supabase
    .from("posts")
    .select(
      `
      id,
      title,
      reply_count,
      created_at,
      users!author_id ( username ),
      categories!category_id ( name, slug )
    `
    );

  if (activeCategory) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", activeCategory)
      .single();
    if (cat) {
      query = query.eq("category_id", cat.id);
    }
  }

  if (sort === "replies") {
    query = query.order("reply_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.limit(50);

  const { data: posts } = await query;

  return (
    <div className="space-y-6">
      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/"
          className={`rounded-full px-3 py-1 text-sm font-medium transition ${
            !activeCategory
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </Link>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/?category=${cat.slug}`}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              activeCategory === cat.slug
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat.name.split(" ")[0]}
          </Link>
        ))}
      </div>

      {/* Sort options */}
      <div className="flex gap-3 text-sm">
        <Link
          href={`/?${activeCategory ? `category=${activeCategory}&` : ""}sort=latest`}
          className={
            sort === "latest"
              ? "font-semibold text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }
        >
          Latest
        </Link>
        <Link
          href={`/?${activeCategory ? `category=${activeCategory}&` : ""}sort=replies`}
          className={
            sort === "replies"
              ? "font-semibold text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }
        >
          Most Replies
        </Link>
      </div>

      {/* Post list */}
      <div className="space-y-3">
        {posts && posts.length > 0 ? (
          posts.map((post) => (
            <PostCard
              key={post.id}
              id={post.id}
              title={post.title}
              authorUsername={
                (post.users as unknown as { username: string })?.username ??
                "unknown"
              }
              categorySlug={
                (post.categories as unknown as { slug: string })?.slug ?? ""
              }
              categoryName={
                (post.categories as unknown as { name: string })?.name ?? ""
              }
              replyCount={post.reply_count}
              createdAt={post.created_at}
            />
          ))
        ) : (
          <p className="py-12 text-center text-gray-400">
            No posts yet. Be the first to start a discussion!
          </p>
        )}
      </div>
    </div>
  );
}
