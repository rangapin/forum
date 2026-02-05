import MarkdownBody from "./markdown-body";
import ReportButton from "./report-button";
import DeleteButton from "./delete-button";

interface Reply {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  users: { username: string; avatar_url: string | null } | null;
}

interface ReplyListProps {
  replies: Reply[];
  postId: string;
  currentUserId?: string;
  isAdmin: boolean;
}

export default function ReplyList({
  replies,
  postId,
  currentUserId,
  isAdmin,
}: ReplyListProps) {
  return (
    <div className="space-y-4">
      {replies.map((reply) => (
        <div key={reply.id} className="rounded-lg border border-gray-200 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="font-medium text-gray-700">
                {reply.users?.username ?? "unknown"}
              </span>
              <span>&middot;</span>
              <span>
                {new Date(reply.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {currentUserId && (
                <ReportButton replyId={reply.id} />
              )}
              {currentUserId &&
                (currentUserId === reply.author_id || isAdmin) && (
                  <DeleteButton
                    replyId={reply.id}
                    parentPostId={postId}
                  />
                )}
            </div>
          </div>
          <MarkdownBody content={reply.body} />
        </div>
      ))}
    </div>
  );
}
