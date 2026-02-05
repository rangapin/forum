"use client";

import { useState } from "react";
import { reportContent } from "@/app/post/[id]/actions";

interface ReportButtonProps {
  postId?: string;
  replyId?: string;
}

export default function ReportButton({ postId, replyId }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <span className="text-xs text-gray-400">Reported</span>;
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-gray-400 hover:text-red-500"
      >
        Report
      </button>
      {open && (
        <form
          action={async (formData) => {
            await reportContent(formData);
            setSubmitted(true);
            setOpen(false);
          }}
          className="mt-2 flex gap-2"
        >
          {postId && <input type="hidden" name="post_id" value={postId} />}
          {replyId && <input type="hidden" name="reply_id" value={replyId} />}
          <input
            name="reason"
            required
            placeholder="Reason for report"
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
          />
          <button
            type="submit"
            className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
          >
            Submit
          </button>
        </form>
      )}
    </>
  );
}
