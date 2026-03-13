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
        Relationships: [];
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
        Relationships: [];
      };
      responses: {
        Row: {
          id: string;
          attendee_id: string;
          session_id: string;
          video_url: string | null;
          audio_language: string;
          edited_video_url: string | null;
          caption_vtt_url: string | null;
          wall_video_source: "raw" | "edited";
          transcript: string | null;
          sentiment: SentimentType | null;
          sentiment_score: number | null;
          ai_conclusion: string | null;
          approved_for_wall: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          attendee_id: string;
          session_id: string;
          video_url?: string | null;
          audio_language?: string;
          edited_video_url?: string | null;
          caption_vtt_url?: string | null;
          wall_video_source?: "raw" | "edited";
          transcript?: string | null;
          sentiment?: SentimentType | null;
          sentiment_score?: number | null;
          ai_conclusion?: string | null;
          approved_for_wall?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          attendee_id?: string;
          session_id?: string;
          video_url?: string | null;
          audio_language?: string;
          edited_video_url?: string | null;
          caption_vtt_url?: string | null;
          wall_video_source?: "raw" | "edited";
          transcript?: string | null;
          sentiment?: SentimentType | null;
          sentiment_score?: number | null;
          ai_conclusion?: string | null;
          approved_for_wall?: boolean;
          created_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      validate_attendee_token: {
        Args: { p_token: string };
        Returns: {
          attendee_id: string;
          session_id: string;
          attendee_name: string;
          session_title: string;
          questions: string[];
          submitted_at: string | null;
        }[];
      };
    };
    Enums: {
      session_status: SessionStatus;
      sentiment_type: SentimentType;
      emoji_type: EmojiType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

