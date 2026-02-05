"use client";

import { useRef } from "react";
import { createReply } from "@/app/post/[id]/actions";

export default function ReplyForm({ postId }: { postId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await createReply(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-3">
      <input type="hidden" name="post_id" value={postId} />
      <textarea
        name="body"
        required
        rows={4}
        placeholder="Write a reply (Markdown supported)..."
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Reply
      </button>
    </form>
  );
}
