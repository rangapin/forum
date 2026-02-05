"use client";

import { deletePost, deleteReply } from "@/app/post/[id]/actions";

interface DeleteButtonProps {
  postId?: string;
  replyId?: string;
  parentPostId?: string;
}

export default function DeleteButton({
  postId,
  replyId,
  parentPostId,
}: DeleteButtonProps) {
  const action = postId ? deletePost : deleteReply;

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Are you sure you want to delete this?")) {
          e.preventDefault();
        }
      }}
    >
      {postId && <input type="hidden" name="post_id" value={postId} />}
      {replyId && (
        <>
          <input type="hidden" name="reply_id" value={replyId} />
          <input type="hidden" name="post_id" value={parentPostId} />
        </>
      )}
      <button
        type="submit"
        className="text-xs text-red-500 hover:text-red-700"
      >
        Delete
      </button>
    </form>
  );
}
