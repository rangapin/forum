"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createReply(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const body = formData.get("body") as string;
  const postId = formData.get("post_id") as string;

  if (!body?.trim()) return;

  const { error } = await supabase.from("replies").insert({
    body: body.trim(),
    post_id: postId,
    author_id: user.id,
  });

  if (error) return;

  revalidatePath(`/post/${postId}`);
}

export async function deletePost(formData: FormData) {
  const supabase = await createClient();
  const postId = formData.get("post_id") as string;

  const { error } = await supabase.from("posts").delete().eq("id", postId);

  if (!error) {
    redirect("/");
  }
}

export async function deleteReply(formData: FormData) {
  const supabase = await createClient();
  const replyId = formData.get("reply_id") as string;
  const postId = formData.get("post_id") as string;

  await supabase.from("replies").delete().eq("id", replyId);

  revalidatePath(`/post/${postId}`);
}

export async function reportContent(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const postId = formData.get("post_id") as string | null;
  const replyId = formData.get("reply_id") as string | null;
  const reason = formData.get("reason") as string;

  if (!reason?.trim()) return;

  await supabase.from("reports").insert({
    reporter_id: user.id,
    post_id: postId || null,
    reply_id: replyId || null,
    reason: reason.trim(),
  });
}
