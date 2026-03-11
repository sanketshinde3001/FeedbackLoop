// Auto-maintained by hand until we add supabase gen types CI
// Re-run `npx supabase gen types typescript --project-id <ref>` to regenerate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SessionStatus = "draft" | "active" | "closed";
export type SentimentType = "positive" | "neutral" | "negative";
export type EmojiType = "loved_it" | "helpful" | "needs_improvement" | "confused";

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          title: string;
          host_id: string;
          questions: string[];
          status: SessionStatus;
          session_date: string | null;
          wall_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          host_id: string;
          questions?: string[];
          status?: SessionStatus;
          session_date?: string | null;
          wall_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          host_id?: string;
          questions?: string[];
          status?: SessionStatus;
          session_date?: string | null;
          wall_enabled?: boolean;
          created_at?: string;
        };
      };
      attendees: {
        Row: {
          id: string;
          session_id: string;
          email: string;
          name: string;
          unique_token: string;
          reminded_at: string | null;
          submitted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          email: string;
          name: string;
          unique_token?: string;
          reminded_at?: string | null;
          submitted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          email?: string;
          name?: string;
          unique_token?: string;
          reminded_at?: string | null;
          submitted_at?: string | null;
          created_at?: string;
        };
      };
      responses: {
        Row: {
          id: string;
          attendee_id: string;
          session_id: string;
          video_url: string | null;
          transcript: string | null;
          sentiment: SentimentType | null;
          sentiment_score: number | null;
          approved_for_wall: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          attendee_id: string;
          session_id: string;
          video_url?: string | null;
          transcript?: string | null;
          sentiment?: SentimentType | null;
          sentiment_score?: number | null;
          approved_for_wall?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          attendee_id?: string;
          session_id?: string;
          video_url?: string | null;
          transcript?: string | null;
          sentiment?: SentimentType | null;
          sentiment_score?: number | null;
          approved_for_wall?: boolean;
          created_at?: string;
        };
      };
      reactions: {
        Row: {
          id: string;
          attendee_id: string;
          session_id: string;
          emoji_type: EmojiType;
          created_at: string;
        };
        Insert: {
          id?: string;
          attendee_id: string;
          session_id: string;
          emoji_type: EmojiType;
          created_at?: string;
        };
        Update: {
          id?: string;
          attendee_id?: string;
          session_id?: string;
          emoji_type?: EmojiType;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      session_status: SessionStatus;
      sentiment_type: SentimentType;
      emoji_type: EmojiType;
    };
  };
}
