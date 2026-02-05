import { createClient } from "@/lib/supabase/server";
import PostCard from "@/components/post-card";
import RealtimePosts from "@/components/realtime-posts";
import { getCategoryBySlug } from "@/lib/categories";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return { title: "Not Found" };
  return { title: `${category.name} — Freediving Forum` };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category: slug } = await params;
  const { sort: sortParam } = await searchParams;
  const supabase = await createClient();
  const sort = sortParam || "latest";

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!category) notFound();

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
    )
    .eq("category_id", category.id);

  if (sort === "replies") {
    query = query.order("reply_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.limit(50);

  const { data: posts } = await query;

  return (
    <div className="space-y-6">
      <RealtimePosts />
      <div>
        <h1 className="text-2xl font-bold">{category.name}</h1>
        <p className="mt-1 text-sm text-gray-500">{category.description}</p>
      </div>

      <div className="flex gap-3 text-sm">
        <Link
          href={`/c/${slug}?sort=latest`}
          className={
            sort === "latest"
              ? "font-semibold text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }
        >
          Latest
        </Link>
        <Link
          href={`/c/${slug}?sort=replies`}
          className={
            sort === "replies"
              ? "font-semibold text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }
        >
          Most Replies
        </Link>
      </div>

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
            No posts in this category yet.
          </p>
        )}
      </div>
    </div>
  );
}
