export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string;
          sort_order?: number;
        };
      };
      users: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          bio: string | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          bio?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          bio?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          title: string;
          body: string;
          category_id: string;
          author_id: string;
          reply_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          category_id: string;
          author_id: string;
          reply_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          body?: string;
          category_id?: string;
          author_id?: string;
          reply_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      replies: {
        Row: {
          id: string;
          body: string;
          post_id: string;
          author_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          body: string;
          post_id: string;
          author_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          body?: string;
          post_id?: string;
          author_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          post_id: string | null;
          reply_id: string | null;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          post_id?: string | null;
          reply_id?: string | null;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          post_id?: string | null;
          reply_id?: string | null;
          reason?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
