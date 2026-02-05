import Link from "next/link";
import { getCategoryBySlug } from "@/lib/categories";

interface PostCardProps {
  id: string;
  title: string;
  authorUsername: string;
  categorySlug: string;
  categoryName: string;
  replyCount: number;
  createdAt: string;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function PostCard({
  id,
  title,
  authorUsername,
  categorySlug,
  categoryName,
  replyCount,
  createdAt,
}: PostCardProps) {
  const category = getCategoryBySlug(categorySlug);
  const colorClass = category?.color ?? "bg-gray-100 text-gray-700";

  return (
    <Link
      href={`/post/${id}`}
      className="block rounded-lg border border-gray-200 p-4 transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-gray-900">
            {title}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
            >
              {categoryName}
            </span>
            <span>{authorUsername}</span>
            <span>&middot;</span>
            <span>{timeAgo(createdAt)}</span>
          </div>
        </div>
        <div className="shrink-0 text-sm text-gray-400">
          {replyCount} {replyCount === 1 ? "reply" : "replies"}
        </div>
      </div>
    </Link>
  );
}
