import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/categories";
import MarkdownBody from "@/components/markdown-body";
import ReplyList from "@/components/reply-list";
import ReplyForm from "@/components/reply-form";
import RealtimeReplies from "@/components/realtime-replies";
import ReportButton from "@/components/report-button";
import DeleteButton from "@/components/delete-button";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("title")
    .eq("id", id)
    .single();
  return { title: post ? `${post.title} — Freediving Forum` : "Not Found" };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select(
      `
      *,
      users!author_id ( username, avatar_url ),
      categories!category_id ( name, slug )
    `
    )
    .eq("id", id)
    .single();

  if (!post) notFound();

  const { data: replies } = await supabase
    .from("replies")
    .select(
      `
      id,
      body,
      author_id,
      created_at,
      users!author_id ( username, avatar_url )
    `
    )
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: currentUser } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = currentUser?.is_admin ?? false;
  }

  const postUsers = post.users as unknown as {
    username: string;
    avatar_url: string | null;
  } | null;
  const postCategories = post.categories as unknown as {
    name: string;
    slug: string;
  } | null;
  const category = getCategoryBySlug(postCategories?.slug ?? "");
  const colorClass = category?.color ?? "bg-gray-100 text-gray-700";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Post header */}
      <div>
        <Link
          href={`/c/${postCategories?.slug}`}
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
        >
          {postCategories?.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{post.title}</h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
          <Link
            href={`/profile/${postUsers?.username}`}
            className="font-medium text-gray-700 hover:underline"
          >
            {postUsers?.username}
          </Link>
          <span>&middot;</span>
          <span>
            {new Date(post.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Post body */}
      <MarkdownBody content={post.body} />

      {/* Post actions */}
      <div className="flex gap-3">
        {user && <ReportButton postId={id} />}
        {user && (user.id === post.author_id || isAdmin) && (
          <DeleteButton postId={id} />
        )}
      </div>

      {/* Replies */}
      <RealtimeReplies postId={id} />
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          {post.reply_count} {post.reply_count === 1 ? "Reply" : "Replies"}
        </h2>

        {replies && replies.length > 0 && (
          <ReplyList
            replies={
              replies as unknown as Array<{
                id: string;
                body: string;
                author_id: string;
                created_at: string;
                users: { username: string; avatar_url: string | null } | null;
              }>
            }
            postId={id}
            currentUserId={user?.id}
            isAdmin={isAdmin}
          />
        )}

        {user ? (
          <ReplyForm postId={id} />
        ) : (
          <p className="text-sm text-gray-500">
            <Link
              href="/auth/login"
              className="text-blue-600 hover:underline"
            >
              Log in
            </Link>{" "}
            to reply.
          </p>
        )}
      </div>
    </div>
  );
}
