"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createPost(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  const categoryId = formData.get("category_id") as string;

  if (!title?.trim() || !body?.trim() || !categoryId) {
    redirect("/new?error=All fields are required");
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      title: title.trim(),
      body: body.trim(),
      category_id: categoryId,
      author_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/post/${post.id}`);
}
