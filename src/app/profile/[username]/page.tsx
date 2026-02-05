import { createClient } from "@/lib/supabase/server";
import PostCard from "@/components/post-card";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `${username} — Freediving Forum` };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) notFound();

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
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {profile.avatar_url && (
          <Image
            src={profile.avatar_url}
            alt={profile.username}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">{profile.username}</h1>
          {profile.bio && (
            <p className="mt-1 text-sm text-gray-500">{profile.bio}</p>
          )}
          <p className="text-xs text-gray-400">
            Joined{" "}
            {new Date(profile.created_at).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Posts</h2>
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
            <p className="text-sm text-gray-400">No posts yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
