import { createClient } from "@/lib/supabase/server";
import PostCard from "@/components/post-card";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  if (!query) {
    return (
      <div className="py-12 text-center text-gray-400">
        Enter a search term to find posts.
      </div>
    );
  }

  const supabase = await createClient();

  const { data: posts } = await supabase
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
    )
    .or(`title.ilike.%${query}%,body.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">
        Results for &ldquo;{query}&rdquo;
      </h1>

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
            No posts found matching your search.
          </p>
        )}
      </div>
    </div>
  );
}
