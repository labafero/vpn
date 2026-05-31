export type Database = {
  public: {
    Tables: {
      posts: {
        Row: {
          id: number;
          title: string;
          body: string;
          cover_url: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          body?: string;
          cover_url?: string;
          user_id: string;
        };
        Update: {
          title?: string;
          body?: string;
          cover_url?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
};
