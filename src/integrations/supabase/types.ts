export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          details: Json
          id: string
          target_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
        }
        Relationships: []
      }
      ai_chat_cache: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          crop_type: string | null
          embedding: string | null
          expires_at: string
          helpful_count: number
          hit_count: number
          id: string
          question: string
          season: string | null
          unhelpful_count: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          crop_type?: string | null
          embedding?: string | null
          expires_at?: string
          helpful_count?: number
          hit_count?: number
          id?: string
          question: string
          season?: string | null
          unhelpful_count?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          crop_type?: string | null
          embedding?: string | null
          expires_at?: string
          helpful_count?: number
          hit_count?: number
          id?: string
          question?: string
          season?: string | null
          unhelpful_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      app_installs: {
        Row: {
          id: string
          installed_at: string
          platform: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          installed_at?: string
          platform?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          installed_at?: string
          platform?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          category: string | null
          created_at: string
          crop_type: string | null
          id: string
          is_saved: boolean
          messages: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          crop_type?: string | null
          id?: string
          is_saved?: boolean
          messages?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          crop_type?: string | null
          id?: string
          is_saved?: boolean
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      crop_diary_entries: {
        Row: {
          created_at: string
          crop_type: string
          entry_date: string
          id: string
          notes: string
          plan_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crop_type: string
          entry_date?: string
          id?: string
          notes: string
          plan_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crop_type?: string
          entry_date?: string
          id?: string
          notes?: string
          plan_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_diary_entries_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "user_crop_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_reminders: {
        Row: {
          created_at: string
          crop_type: string
          id: string
          is_active: boolean
          is_done: boolean
          last_notified_date: string | null
          note: string | null
          plan_id: string | null
          reminder_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crop_type: string
          id?: string
          is_active?: boolean
          is_done?: boolean
          last_notified_date?: string | null
          note?: string | null
          plan_id?: string | null
          reminder_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crop_type?: string
          id?: string
          is_active?: boolean
          is_done?: boolean
          last_notified_date?: string | null
          note?: string | null
          plan_id?: string | null
          reminder_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_reminders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "user_crop_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_task_completions: {
        Row: {
          completed_at: string
          id: string
          plan_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          plan_id: string
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          plan_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_task_completions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "user_crop_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      disease_history: {
        Row: {
          created_at: string
          crop_type: string
          disease_name: string
          id: string
          image_url: string | null
          result_json: Json
          severity: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crop_type: string
          disease_name: string
          id?: string
          image_url?: string | null
          result_json: Json
          severity: string
          user_id: string
        }
        Update: {
          created_at?: string
          crop_type?: string
          disease_name?: string
          id?: string
          image_url?: string | null
          result_json?: Json
          severity?: string
          user_id?: string
        }
        Relationships: []
      }
      exchanges: {
        Row: {
          created_at: string
          description: string | null
          district: string
          id: string
          image_url: string | null
          is_active: boolean
          is_free: boolean
          price: number | null
          title: string
          type: string
          unit: string | null
          upazila: string | null
          user_id: string
          user_name: string
          user_phone: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          district: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_free?: boolean
          price?: number | null
          title: string
          type?: string
          unit?: string | null
          upazila?: string | null
          user_id: string
          user_name?: string
          user_phone?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          district?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_free?: boolean
          price?: number | null
          title?: string
          type?: string
          unit?: string | null
          upazila?: string | null
          user_id?: string
          user_name?: string
          user_phone?: string | null
        }
        Relationships: []
      }
      feature_waitlist: {
        Row: {
          created_at: string
          feature: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      govt_prices: {
        Row: {
          created_at: string
          district: string
          id: string
          market_name: string | null
          price_avg: number
          price_date: string
          price_max: number | null
          price_min: number | null
          price_type: string
          product_name: string
          source: string
          unit: string
        }
        Insert: {
          created_at?: string
          district: string
          id?: string
          market_name?: string | null
          price_avg: number
          price_date: string
          price_max?: number | null
          price_min?: number | null
          price_type?: string
          product_name: string
          source?: string
          unit?: string
        }
        Update: {
          created_at?: string
          district?: string
          id?: string
          market_name?: string | null
          price_avg?: number
          price_date?: string
          price_max?: number | null
          price_min?: number | null
          price_type?: string
          product_name?: string
          source?: string
          unit?: string
        }
        Relationships: []
      }
      internal_secrets: {
        Row: {
          name: string
          updated_at: string
          value: string
        }
        Insert: {
          name: string
          updated_at?: string
          value: string
        }
        Update: {
          name?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      muted_users: {
        Row: {
          created_at: string
          id: string
          muted_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          muted_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          muted_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_broadcasts: {
        Row: {
          admin_id: string
          body: string
          created_at: string
          icon: string | null
          id: string
          link: string | null
          opened_count: number
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number
          target_type: string
          target_value: string | null
          title: string
        }
        Insert: {
          admin_id: string
          body: string
          created_at?: string
          icon?: string | null
          id?: string
          link?: string | null
          opened_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          target_type?: string
          target_value?: string | null
          title: string
        }
        Update: {
          admin_id?: string
          body?: string
          created_at?: string
          icon?: string | null
          id?: string
          link?: string | null
          opened_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          target_type?: string
          target_value?: string | null
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          ref_id: string | null
          ref_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          ref_id?: string | null
          ref_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          ref_id?: string | null
          ref_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organic_guide_videos: {
        Row: {
          created_at: string
          created_by: string | null
          duration: string | null
          guide_key: string
          id: string
          is_active: boolean
          sort_order: number
          source: string
          title: string
          updated_at: string
          youtube_url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration?: string | null
          guide_key: string
          id?: string
          is_active?: boolean
          sort_order?: number
          source?: string
          title: string
          updated_at?: string
          youtube_url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration?: string | null
          guide_key?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          source?: string
          title?: string
          updated_at?: string
          youtube_url?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          user_id: string
          user_name?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          crop_tag: string | null
          district: string | null
          id: string
          image_url: string | null
          likes_count: number
          type: string
          upazila: string | null
          user_district: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string
          crop_tag?: string | null
          district?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number
          type?: string
          upazila?: string | null
          user_district?: string | null
          user_id: string
          user_name?: string
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          crop_tag?: string | null
          district?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number
          type?: string
          upazila?: string | null
          user_district?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          alert_threshold: number
          created_at: string
          direction: string
          district: string
          id: string
          is_active: boolean
          last_triggered: string | null
          product_name: string
          user_id: string
        }
        Insert: {
          alert_threshold?: number
          created_at?: string
          direction?: string
          district: string
          id?: string
          is_active?: boolean
          last_triggered?: string | null
          product_name: string
          user_id: string
        }
        Update: {
          alert_threshold?: number
          created_at?: string
          direction?: string
          district?: string
          id?: string
          is_active?: boolean
          last_triggered?: string | null
          product_name?: string
          user_id?: string
        }
        Relationships: []
      }
      price_predictions: {
        Row: {
          actual_price: number | null
          checked_at: string | null
          created_at: string
          data_points: number
          district: string
          id: string
          prediction_json: Json
          product_name: string
          trend: string | null
          user_id: string | null
          was_correct: boolean | null
        }
        Insert: {
          actual_price?: number | null
          checked_at?: string | null
          created_at?: string
          data_points?: number
          district: string
          id?: string
          prediction_json: Json
          product_name: string
          trend?: string | null
          user_id?: string | null
          was_correct?: boolean | null
        }
        Update: {
          actual_price?: number | null
          checked_at?: string | null
          created_at?: string
          data_points?: number
          district?: string
          id?: string
          prediction_json?: Json
          product_name?: string
          trend?: string | null
          user_id?: string | null
          was_correct?: boolean | null
        }
        Relationships: []
      }
      prices: {
        Row: {
          category: string
          created_at: string
          district: string
          id: string
          market_name: string
          origin_id: string | null
          origin_type: string | null
          previous_price: number | null
          price: number
          price_type: string
          product_name: string
          source: string
          unit: string
          upazila: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          category?: string
          created_at?: string
          district: string
          id?: string
          market_name: string
          origin_id?: string | null
          origin_type?: string | null
          previous_price?: number | null
          price: number
          price_type?: string
          product_name: string
          source?: string
          unit?: string
          upazila?: string | null
          user_id: string
          user_name?: string
        }
        Update: {
          category?: string
          created_at?: string
          district?: string
          id?: string
          market_name?: string
          origin_id?: string | null
          origin_type?: string | null
          previous_price?: number | null
          price?: number
          price_type?: string
          product_name?: string
          source?: string
          unit?: string
          upazila?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      pro_subscriptions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          payment_ref: string | null
          plan: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          payment_ref?: string | null
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          payment_ref?: string | null
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_details: {
        Row: {
          address_line: string | null
          courier_phone: string | null
          created_at: string
          onboarding_completed_at: string | null
          post_office: string | null
          postcode: string | null
          updated_at: string
          user_id: string
          village: string | null
        }
        Insert: {
          address_line?: string | null
          courier_phone?: string | null
          created_at?: string
          onboarding_completed_at?: string | null
          post_office?: string | null
          postcode?: string | null
          updated_at?: string
          user_id: string
          village?: string | null
        }
        Update: {
          address_line?: string | null
          courier_phone?: string | null
          created_at?: string
          onboarding_completed_at?: string | null
          post_office?: string | null
          postcode?: string | null
          updated_at?: string
          user_id?: string
          village?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          crops: string[]
          district: string | null
          exchanges_count: number
          expert_institution: string | null
          expert_specialty: string | null
          id: string
          is_suspended: boolean
          is_verified: boolean
          last_active: string | null
          name: string
          phone: string | null
          posts_count: number
          prices_count: number
          role: string
          suspension_reason: string | null
          suspension_until: string | null
          total_reports: number
          upazila: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          crops?: string[]
          district?: string | null
          exchanges_count?: number
          expert_institution?: string | null
          expert_specialty?: string | null
          id: string
          is_suspended?: boolean
          is_verified?: boolean
          last_active?: string | null
          name?: string
          phone?: string | null
          posts_count?: number
          prices_count?: number
          role?: string
          suspension_reason?: string | null
          suspension_until?: string | null
          total_reports?: number
          upazila?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          crops?: string[]
          district?: string | null
          exchanges_count?: number
          expert_institution?: string | null
          expert_specialty?: string | null
          id?: string
          is_suspended?: boolean
          is_verified?: boolean
          last_active?: string | null
          name?: string
          phone?: string | null
          posts_count?: number
          prices_count?: number
          role?: string
          suspension_reason?: string | null
          suspension_until?: string | null
          total_reports?: number
          upazila?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          district: string | null
          endpoint: string
          id: string
          p256dh: string
          upazila: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          district?: string | null
          endpoint: string
          id?: string
          p256dh: string
          upazila?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          district?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          upazila?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      revenue_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          reference: string | null
          status: string
          subscription_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          reference?: string | null
          status?: string
          subscription_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          reference?: string | null
          status?: string
          subscription_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "pro_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_calculations: {
        Row: {
          area_shotok: number
          area_unit: string
          area_value: number
          created_at: string
          crop_type: string
          id: string
          result_json: Json
          soil_type: string
          user_id: string
        }
        Insert: {
          area_shotok: number
          area_unit: string
          area_value: number
          created_at?: string
          crop_type: string
          id?: string
          result_json: Json
          soil_type: string
          user_id: string
        }
        Update: {
          area_shotok?: number
          area_unit?: string
          area_value?: number
          created_at?: string
          crop_type?: string
          id?: string
          result_json?: Json
          soil_type?: string
          user_id?: string
        }
        Relationships: []
      }
      soil_reports: {
        Row: {
          area_label: string | null
          created_at: string
          health_score: number | null
          id: string
          result_json: Json
          user_id: string
        }
        Insert: {
          area_label?: string | null
          created_at?: string
          health_score?: number | null
          id?: string
          result_json: Json
          user_id: string
        }
        Update: {
          area_label?: string | null
          created_at?: string
          health_score?: number | null
          id?: string
          result_json?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_crop_plans: {
        Row: {
          created_at: string
          crop_type: string
          id: string
          is_active: boolean
          planting_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crop_type: string
          id?: string
          is_active?: boolean
          planting_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          crop_type?: string
          id?: string
          is_active?: boolean
          planting_date?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          content_id: string | null
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_user_id: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          content_id?: string | null
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_user_id?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          content_id?: string | null
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weather_alerts_sent: {
        Row: {
          alert_type: string
          day: string | null
          district: string
          id: string
          sent_at: string
          upazila: string | null
        }
        Insert: {
          alert_type: string
          day?: string | null
          district: string
          id?: string
          sent_at?: string
          upazila?: string | null
        }
        Update: {
          alert_type?: string
          day?: string | null
          district?: string
          id?: string
          sent_at?: string
          upazila?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_find_user_by_phone: { Args: { _phone: string }; Returns: string }
      admin_get_phones: {
        Args: { _ids: string[] }
        Returns: {
          id: string
          phone: string
        }[]
      }
      cancel_connection: {
        Args: { connection_id: string }
        Returns: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "connections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cleanup_ai_chat_cache: { Args: never; Returns: undefined }
      decrement_likes: { Args: { post_id: string }; Returns: undefined }
      get_connected_farmer_phone: {
        Args: { target_user_id: string }
        Returns: string
      }
      get_connection_state: {
        Args: { target_user_id: string }
        Returns: string
      }
      get_direct_threads: {
        Args: never
        Returns: {
          last_body: string
          last_message_at: string
          peer_avatar_url: string
          peer_district: string
          peer_id: string
          peer_name: string
          unread_count: number
        }[]
      }
      get_exchange_phone: { Args: { _id: string }; Returns: string }
      get_my_phone: { Args: never; Returns: string }
      get_price_history: {
        Args: { p_days?: number; p_district: string; p_product: string }
        Returns: {
          avg_price: number
          data_points: number
          max_price: number
          min_price: number
          price_date: string
          source: string
        }[]
      }
      get_public_connected_farmers: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          crops: string[]
          district: string
          id: string
          is_verified: boolean
          name: string
          role: string
          upazila: string
        }[]
      }
      get_public_user_roles: {
        Args: { _ids: string[] }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_cache_hit: { Args: { _id: string }; Returns: undefined }
      increment_comments: { Args: { post_id: string }; Returns: undefined }
      increment_likes: { Args: { post_id: string }; Returns: undefined }
      invoke_cron_hook: { Args: { _path: string }; Returns: number }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
      mark_direct_messages_read: {
        Args: { peer_user_id: string }
        Returns: number
      }
      record_cache_feedback: {
        Args: { _helpful: boolean; _id: string }
        Returns: undefined
      }
      request_connection: {
        Args: { target_user_id: string }
        Returns: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "connections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_connection: {
        Args: { connection_id: string; next_status: string }
        Returns: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "connections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_cache: {
        Args: {
          filter_category?: string
          filter_season?: string
          max_results?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          answer: string
          category: string
          hit_count: number
          id: string
          question: string
          similarity: number
        }[]
      }
      send_direct_message: {
        Args: { message_body: string; target_user_id: string }
        Returns: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        SetofOptions: {
          from: "*"
          to: "direct_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_cron_secret: { Args: { _value: string }; Returns: undefined }
      suggest_farmers_by_crops: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          common_crops: string[]
          crops: string[]
          district: string
          id: string
          is_verified: boolean
          name: string
          upazila: string
        }[]
      }
      unfriend_connection: {
        Args: { connection_id: string }
        Returns: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "connections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "farmer" | "expert" | "moderator" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["farmer", "expert", "moderator", "admin"],
    },
  },
} as const
