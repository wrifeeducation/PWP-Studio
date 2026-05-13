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
      ai_assessments: {
        Row: {
          assessed_at: string | null
          composition_score: number | null
          confidence_scores: Json | null
          created_at: string | null
          evidence_citations: Json | null
          flags: Json | null
          grammar_score: number | null
          id: string
          model_used: string | null
          overall_band: number | null
          piece_id: string
          punctuation_score: number | null
          purpose_audience_effect_score: number | null
          raw_ai_response: Json | null
          spelling_score: number | null
          vocabulary_score: number | null
          year_group_assessed: number
        }
        Insert: {
          assessed_at?: string | null
          composition_score?: number | null
          confidence_scores?: Json | null
          created_at?: string | null
          evidence_citations?: Json | null
          flags?: Json | null
          grammar_score?: number | null
          id?: string
          model_used?: string | null
          overall_band?: number | null
          piece_id: string
          punctuation_score?: number | null
          purpose_audience_effect_score?: number | null
          raw_ai_response?: Json | null
          spelling_score?: number | null
          vocabulary_score?: number | null
          year_group_assessed: number
        }
        Update: {
          assessed_at?: string | null
          composition_score?: number | null
          confidence_scores?: Json | null
          created_at?: string | null
          evidence_citations?: Json | null
          flags?: Json | null
          grammar_score?: number | null
          id?: string
          model_used?: string | null
          overall_band?: number | null
          piece_id?: string
          punctuation_score?: number | null
          purpose_audience_effect_score?: number | null
          raw_ai_response?: Json | null
          spelling_score?: number | null
          vocabulary_score?: number | null
          year_group_assessed?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_assessments_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: true
            referencedRelation: "v_pending_writing_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_assessments_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: true
            referencedRelation: "writing_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          icon_key: string
          id: string
          name: string
          rarity: string
          trigger_type: string
          trigger_value: Json
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          icon_key: string
          id?: string
          name: string
          rarity: string
          trigger_type: string
          trigger_value: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          icon_key?: string
          id?: string
          name?: string
          rarity?: string
          trigger_type?: string
          trigger_value?: Json
        }
        Relationships: []
      }
      certificates: {
        Row: {
          awarded_at: string | null
          certificate_type: string
          id: string
          level_id: number
          pupil_id: string
        }
        Insert: {
          awarded_at?: string | null
          certificate_type: string
          id?: string
          level_id: number
          pupil_id: string
        }
        Update: {
          awarded_at?: string | null
          certificate_type?: string
          id?: string
          level_id?: number
          pupil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "formula_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string
          created_at: string | null
          id: string
          name: string
          school_id: string
          teacher_id: string | null
          year_group: number
        }
        Insert: {
          academic_year: string
          created_at?: string | null
          id?: string
          name: string
          school_id: string
          teacher_id?: string | null
          year_group: number
        }
        Update: {
          academic_year?: string
          created_at?: string | null
          id?: string
          name?: string
          school_id?: string
          teacher_id?: string | null
          year_group?: number
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      definition_mastery: {
        Row: {
          created_at: string | null
          id: string
          mastered_at: string | null
          next_review_at: string | null
          pupil_id: string
          review_count: number
          stage_reached: number
          unlocked_at: string | null
          updated_at: string | null
          word_class: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mastered_at?: string | null
          next_review_at?: string | null
          pupil_id: string
          review_count?: number
          stage_reached?: number
          unlocked_at?: string | null
          updated_at?: string | null
          word_class: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mastered_at?: string | null
          next_review_at?: string | null
          pupil_id?: string
          review_count?: number
          stage_reached?: number
          unlocked_at?: string | null
          updated_at?: string | null
          word_class?: string
        }
        Relationships: [
          {
            foreignKeyName: "definition_mastery_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "definition_mastery_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
      formula_levels: {
        Row: {
          created_at: string | null
          formula_elements: Json
          id: number
          nc_year_group_max: number
          nc_year_group_min: number
          paragraph_active: boolean | null
          paragraph_genre_rotation: Json | null
          phase: string
          subject_rotation_bank: Json
          word_banks: Json
        }
        Insert: {
          created_at?: string | null
          formula_elements: Json
          id: number
          nc_year_group_max: number
          nc_year_group_min: number
          paragraph_active?: boolean | null
          paragraph_genre_rotation?: Json | null
          phase: string
          subject_rotation_bank: Json
          word_banks: Json
        }
        Update: {
          created_at?: string | null
          formula_elements?: Json
          id?: number
          nc_year_group_max?: number
          nc_year_group_min?: number
          paragraph_active?: boolean | null
          paragraph_genre_rotation?: Json | null
          phase?: string
          subject_rotation_bank?: Json
          word_banks?: Json
        }
        Relationships: []
      }
      formula_sessions: {
        Row: {
          ai_mastery_check: Json | null
          context_sentence: string | null
          created_at: string | null
          distractor_words_used: Json | null
          formula_score: number
          id: string
          is_lens_lab: boolean | null
          level_id: number
          pupil_id: string
          scaffold_stage: number | null
          scaffold_type: Json | null
          scaffold_used: boolean | null
          semantic_audience_score: number | null
          semantic_effect_score: number | null
          semantic_purpose_score: number | null
          sentence_built: string | null
          session_date: string
          session_number_on_level: number | null
          subject_used: string | null
          xp_earned: number
        }
        Insert: {
          ai_mastery_check?: Json | null
          context_sentence?: string | null
          created_at?: string | null
          distractor_words_used?: Json | null
          formula_score: number
          id?: string
          is_lens_lab?: boolean | null
          level_id: number
          pupil_id: string
          scaffold_stage?: number | null
          scaffold_type?: Json | null
          scaffold_used?: boolean | null
          semantic_audience_score?: number | null
          semantic_effect_score?: number | null
          semantic_purpose_score?: number | null
          sentence_built?: string | null
          session_date: string
          session_number_on_level?: number | null
          subject_used?: string | null
          xp_earned?: number
        }
        Update: {
          ai_mastery_check?: Json | null
          context_sentence?: string | null
          created_at?: string | null
          distractor_words_used?: Json | null
          formula_score?: number
          id?: string
          is_lens_lab?: boolean | null
          level_id?: number
          pupil_id?: string
          scaffold_stage?: number | null
          scaffold_type?: Json | null
          scaffold_used?: boolean | null
          semantic_audience_score?: number | null
          semantic_effect_score?: number | null
          semantic_purpose_score?: number | null
          sentence_built?: string | null
          session_date?: string
          session_number_on_level?: number | null
          subject_used?: string | null
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "formula_sessions_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "formula_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formula_sessions_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formula_sessions_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
      intervention_log: {
        Row: {
          action_taken: string
          consolidation_pack_generated: boolean | null
          consolidation_required: boolean
          created_at: string | null
          error_pattern: Json
          id: string
          pupil_id: string
          resolved_at: string | null
          trigger_date: string
          trigger_layer: string
          updated_at: string | null
        }
        Insert: {
          action_taken: string
          consolidation_pack_generated?: boolean | null
          consolidation_required?: boolean
          created_at?: string | null
          error_pattern: Json
          id?: string
          pupil_id: string
          resolved_at?: string | null
          trigger_date: string
          trigger_layer: string
          updated_at?: string | null
        }
        Update: {
          action_taken?: string
          consolidation_pack_generated?: boolean | null
          consolidation_required?: boolean
          created_at?: string | null
          error_pattern?: Json
          id?: string
          pupil_id?: string
          resolved_at?: string | null
          trigger_date?: string
          trigger_layer?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_log_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_log_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
      mastery_events: {
        Row: {
          created_at: string | null
          event_type: string
          evidence: Json | null
          from_value: string | null
          genre: string | null
          id: string
          level_id: number | null
          pupil_id: string
          scaffold_stage: number | null
          teacher_id: string | null
          teacher_note: string | null
          to_value: string | null
          triggered_by: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          evidence?: Json | null
          from_value?: string | null
          genre?: string | null
          id?: string
          level_id?: number | null
          pupil_id: string
          scaffold_stage?: number | null
          teacher_id?: string | null
          teacher_note?: string | null
          to_value?: string | null
          triggered_by?: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          evidence?: Json | null
          from_value?: string | null
          genre?: string | null
          id?: string
          level_id?: number | null
          pupil_id?: string
          scaffold_stage?: number | null
          teacher_id?: string | null
          teacher_note?: string | null
          to_value?: string | null
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_events_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mastery_events_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
          {
            foreignKeyName: "mastery_events_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mastery_events_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
      mastery_tracking: {
        Row: {
          ai_mastery_check: Json | null
          consolidation_required: boolean | null
          created_at: string | null
          current_window_average: number | null
          fast_track_eligible: boolean | null
          gate_passed: boolean | null
          gate_passed_at: string | null
          id: string
          level_id: number
          pupil_id: string
          scaffold_advanced_at: Json | null
          scaffold_stage: number
          session_1_score: number | null
          session_2_score: number | null
          session_3_score: number | null
          session_4_score: number | null
          session_5_score: number | null
          session_6_score: number | null
          session_7_score: number | null
          sessions_completed: number
          updated_at: string | null
          weak_word_class: string | null
        }
        Insert: {
          ai_mastery_check?: Json | null
          consolidation_required?: boolean | null
          created_at?: string | null
          current_window_average?: number | null
          fast_track_eligible?: boolean | null
          gate_passed?: boolean | null
          gate_passed_at?: string | null
          id?: string
          level_id: number
          pupil_id: string
          scaffold_advanced_at?: Json | null
          scaffold_stage?: number
          session_1_score?: number | null
          session_2_score?: number | null
          session_3_score?: number | null
          session_4_score?: number | null
          session_5_score?: number | null
          session_6_score?: number | null
          session_7_score?: number | null
          sessions_completed?: number
          updated_at?: string | null
          weak_word_class?: string | null
        }
        Update: {
          ai_mastery_check?: Json | null
          consolidation_required?: boolean | null
          created_at?: string | null
          current_window_average?: number | null
          fast_track_eligible?: boolean | null
          gate_passed?: boolean | null
          gate_passed_at?: string | null
          id?: string
          level_id?: number
          pupil_id?: string
          scaffold_advanced_at?: Json | null
          scaffold_stage?: number
          session_1_score?: number | null
          session_2_score?: number | null
          session_3_score?: number | null
          session_4_score?: number | null
          session_5_score?: number | null
          session_6_score?: number | null
          session_7_score?: number | null
          sessions_completed?: number
          updated_at?: string | null
          weak_word_class?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mastery_tracking_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "formula_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mastery_tracking_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mastery_tracking_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
      portfolio: {
        Row: {
          ai_score: number | null
          app: string
          content: string
          created_at: string
          id: string
          level_or_lesson: string
          pupil_id: string
          share_token: string | null
          updated_at: string
        }
        Insert: {
          ai_score?: number | null
          app: string
          content: string
          created_at?: string
          id?: string
          level_or_lesson: string
          pupil_id: string
          share_token?: string | null
          updated_at?: string
        }
        Update: {
          ai_score?: number | null
          app?: string
          content?: string
          created_at?: string
          id?: string
          level_or_lesson?: string
          pupil_id?: string
          share_token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      paragraph_sessions: {
        Row: {
          ai_feedback: Json | null
          close_quality_score: number | null
          close_sentence: string
          cohesion_score: number | null
          composite_paragraph_score: number | null
          created_at: string | null
          genre: string
          genre_match_score: number | null
          id: string
          lead_sentence: string
          level_id: number
          phase: string
          pupil_id: string
          scaffold_type: Json | null
          scaffold_used: boolean | null
          semantic_paragraph_score: number | null
          session_date: string
          support_sentences: Json
          tense_register_score: number | null
          xp_earned: number
        }
        Insert: {
          ai_feedback?: Json | null
          close_quality_score?: number | null
          close_sentence: string
          cohesion_score?: number | null
          composite_paragraph_score?: number | null
          created_at?: string | null
          genre: string
          genre_match_score?: number | null
          id?: string
          lead_sentence: string
          level_id: number
          phase: string
          pupil_id: string
          scaffold_type?: Json | null
          scaffold_used?: boolean | null
          semantic_paragraph_score?: number | null
          session_date: string
          support_sentences: Json
          tense_register_score?: number | null
          xp_earned?: number
        }
        Update: {
          ai_feedback?: Json | null
          close_quality_score?: number | null
          close_sentence?: string
          cohesion_score?: number | null
          composite_paragraph_score?: number | null
          created_at?: string | null
          genre?: string
          genre_match_score?: number | null
          id?: string
          lead_sentence?: string
          level_id?: number
          phase?: string
          pupil_id?: string
          scaffold_type?: Json | null
          scaffold_used?: boolean | null
          semantic_paragraph_score?: number | null
          session_date?: string
          support_sentences?: Json
          tense_register_score?: number | null
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "paragraph_sessions_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "formula_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paragraph_sessions_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paragraph_sessions_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
      paragraph_starters: {
        Row: {
          created_at: string | null
          genre: string
          id: string
          phase: string
          slot_type: string
          starter_text: string
          year_group_max: number
          year_group_min: number
        }
        Insert: {
          created_at?: string | null
          genre: string
          id?: string
          phase: string
          slot_type: string
          starter_text: string
          year_group_max: number
          year_group_min: number
        }
        Update: {
          created_at?: string | null
          genre?: string
          id?: string
          phase?: string
          slot_type?: string
          starter_text?: string
          year_group_max?: number
          year_group_min?: number
        }
        Relationships: []
      }
      parent_pupil: {
        Row: {
          approved: boolean | null
          child_display_name: string | null
          created_at: string | null
          id: string
          is_direct_signup: boolean
          parent_id: string
          pupil_id: string
        }
        Insert: {
          approved?: boolean | null
          child_display_name?: string | null
          created_at?: string | null
          id?: string
          is_direct_signup?: boolean
          parent_id: string
          pupil_id: string
        }
        Update: {
          approved?: boolean | null
          child_display_name?: string | null
          created_at?: string | null
          id?: string
          is_direct_signup?: boolean
          parent_id?: string
          pupil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_pupil_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_pupil_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
          {
            foreignKeyName: "parent_pupil_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_pupil_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_colour: string
          class_id: string | null
          coins: number
          created_at: string | null
          first_name: string
          id: string
          is_active: boolean
          membership_tier: string
          pin_code: string | null
          role: string
          school_id: string | null
          selected_avatar: string
          stripe_customer_id: string | null
          updated_at: string | null
          year_group: number | null
        }
        Insert: {
          avatar_colour?: string
          class_id?: string | null
          coins?: number
          created_at?: string | null
          first_name: string
          id: string
          is_active?: boolean
          membership_tier?: string
          pin_code?: string | null
          role: string
          school_id?: string | null
          selected_avatar?: string
          stripe_customer_id?: string | null
          updated_at?: string | null
          year_group?: number | null
        }
        Update: {
          avatar_colour?: string
          class_id?: string | null
          coins?: number
          created_at?: string | null
          first_name?: string
          id?: string
          is_active?: boolean
          membership_tier?: string
          pin_code?: string | null
          role?: string
          school_id?: string | null
          selected_avatar?: string
          stripe_customer_id?: string | null
          updated_at?: string | null
          year_group?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      pupil_badges: {
        Row: {
          earned_at: string | null
          badge_id: string
          created_at: string | null
          id: string
          pupil_id: string
          source: Json | null
        }
        Insert: {
          earned_at?: string | null
          badge_id: string
          created_at?: string | null
          id?: string
          pupil_id: string
          source?: Json | null
        }
        Update: {
          earned_at?: string | null
          badge_id?: string
          created_at?: string | null
          id?: string
          pupil_id?: string
          source?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pupil_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pupil_badges_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pupil_badges_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
      formula_progress: {
        Row: {
          coins: number
          consecutive_mastery_sessions: number
          created_at: string | null
          current_formula_level: number
          difficulty_profile: Json
          ready_to_advance: boolean
          current_paragraph_phase: string | null
          current_streak: number | null
          double_xp_until: string | null
          id: string
          last_session_date: string | null
          levels_mastered_count: number
          longest_streak: number | null
          paragraph_genres_mastered: Json
          paragraph_genres_started: Json
          phases_completed: Json
          pupil_id: string
          scaffold_stage_formula: number
          sessions_on_current_level: number
          star_shield_active: boolean
          stars_last_replenished: string | null
          stars_remaining: number
          streak_shield_active: boolean | null
          total_xp: number | null
          updated_at: string | null
          writing_studio_confirmed_at: string | null
          writing_studio_suggested_at: string | null
          writing_studio_unlocked: boolean | null
          pwp_onboarding_complete: boolean
        }
        Insert: {
          coins?: number
          consecutive_mastery_sessions?: number
          created_at?: string | null
          current_formula_level?: number
          current_paragraph_phase?: string | null
          current_streak?: number | null
          difficulty_profile?: Json
          double_xp_until?: string | null
          id?: string
          last_session_date?: string | null
          levels_mastered_count?: number
          longest_streak?: number | null
          paragraph_genres_mastered?: Json
          paragraph_genres_started?: Json
          phases_completed?: Json
          pupil_id: string
          pwp_onboarding_complete?: boolean
          ready_to_advance?: boolean
          scaffold_stage_formula?: number
          sessions_on_current_level?: number
          star_shield_active?: boolean
          stars_last_replenished?: string | null
          stars_remaining?: number
          streak_shield_active?: boolean | null
          total_xp?: number | null
          updated_at?: string | null
          writing_studio_confirmed_at?: string | null
          writing_studio_suggested_at?: string | null
          writing_studio_unlocked?: boolean | null
        }
        Update: {
          coins?: number
          consecutive_mastery_sessions?: number
          created_at?: string | null
          current_formula_level?: number
          current_paragraph_phase?: string | null
          current_streak?: number | null
          difficulty_profile?: Json
          double_xp_until?: string | null
          id?: string
          last_session_date?: string | null
          levels_mastered_count?: number
          longest_streak?: number | null
          paragraph_genres_mastered?: Json
          paragraph_genres_started?: Json
          phases_completed?: Json
          pupil_id?: string
          pwp_onboarding_complete?: boolean
          ready_to_advance?: boolean
          scaffold_stage_formula?: number
          sessions_on_current_level?: number
          star_shield_active?: boolean
          stars_last_replenished?: string | null
          stars_remaining?: number
          streak_shield_active?: boolean | null
          total_xp?: number | null
          updated_at?: string | null
          writing_studio_confirmed_at?: string | null
          writing_studio_suggested_at?: string | null
          writing_studio_unlocked?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "formula_progress_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formula_progress_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: true
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
      schools: {
        Row: {
          address_line1: string | null
          admin_user_id: string | null
          city: string | null
          contact_email: string | null
          created_at: string | null
          id: string
          max_pupils: number
          max_teachers: number
          name: string
          notes: string | null
          phase: string
          postcode: string | null
          status: string
          subscription_tier: string
          urn: string
        }
        Insert: {
          address_line1?: string | null
          admin_user_id?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string | null
          id?: string
          max_pupils?: number
          max_teachers?: number
          name: string
          notes?: string | null
          phase: string
          postcode?: string | null
          status?: string
          subscription_tier?: string
          urn: string
        }
        Update: {
          address_line1?: string | null
          admin_user_id?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string | null
          id?: string
          max_pupils?: number
          max_teachers?: number
          name?: string
          notes?: string | null
          phase?: string
          postcode?: string | null
          status?: string
          subscription_tier?: string
          urn?: string
        }
        Relationships: [
          {
            foreignKeyName: "schools_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          id: string
          price_id: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          id: string
          price_id?: string | null
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          price_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
      teacher_annotations: {
        Row: {
          comment_text: string
          created_at: string | null
          dimension_override: string | null
          id: string
          override_score: number | null
          paragraph_session_id: string | null
          piece_id: string | null
          range_end: number | null
          range_start: number | null
          teacher_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          dimension_override?: string | null
          id?: string
          override_score?: number | null
          paragraph_session_id?: string | null
          piece_id?: string | null
          range_end?: number | null
          range_start?: number | null
          teacher_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          dimension_override?: string | null
          id?: string
          override_score?: number | null
          paragraph_session_id?: string | null
          piece_id?: string | null
          range_end?: number | null
          range_start?: number | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_annotations_paragraph_session_id_fkey"
            columns: ["paragraph_session_id"]
            isOneToOne: false
            referencedRelation: "paragraph_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_annotations_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "v_pending_writing_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_annotations_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "writing_pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_annotations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_annotations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
      teacher_notifications: {
        Row: {
          action_required: boolean
          actioned_at: string | null
          body: string | null
          created_at: string | null
          data: Json
          dismissed_at: string | null
          id: string
          notification_type: string
          pupil_id: string | null
          read_at: string | null
          teacher_id: string
          title: string
        }
        Insert: {
          action_required?: boolean
          actioned_at?: string | null
          body?: string | null
          created_at?: string | null
          data?: Json
          dismissed_at?: string | null
          id?: string
          notification_type: string
          pupil_id?: string | null
          read_at?: string | null
          teacher_id: string
          title: string
        }
        Update: {
          action_required?: boolean
          actioned_at?: string | null
          body?: string | null
          created_at?: string | null
          data?: Json
          dismissed_at?: string | null
          id?: string
          notification_type?: string
          pupil_id?: string | null
          read_at?: string | null
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_notifications_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_notifications_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
          {
            foreignKeyName: "teacher_notifications_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_notifications_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
      teacher_task_assignments: {
        Row: {
          assigned_at: string | null
          class_id: string | null
          created_at: string | null
          due_date: string | null
          id: string
          pupil_id: string | null
          teacher_id: string
          writing_task_id: string
        }
        Insert: {
          assigned_at?: string | null
          class_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          pupil_id?: string | null
          teacher_id: string
          writing_task_id: string
        }
        Update: {
          assigned_at?: string | null
          class_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          pupil_id?: string | null
          teacher_id?: string
          writing_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_task_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_task_assignments_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_task_assignments_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
          {
            foreignKeyName: "teacher_task_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_task_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
          {
            foreignKeyName: "teacher_task_assignments_writing_task_id_fkey"
            columns: ["writing_task_id"]
            isOneToOne: false
            referencedRelation: "writing_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      word_banks: {
        Row: {
          created_at: string | null
          id: string
          images: Json
          level_id: number
          word_class: string
          words: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          images: Json
          level_id: number
          word_class: string
          words: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          images?: Json
          level_id?: number
          word_class?: string
          words?: Json
        }
        Relationships: [
          {
            foreignKeyName: "word_banks_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "formula_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      writing_pieces: {
        Row: {
          created_at: string | null
          full_text: string
          genre: string
          id: string
          plan_data: Json | null
          published_at: string | null
          pupil_confidence: number | null
          pupil_id: string
          reviewed_at: string | null
          self_review_scores: Json | null
          status: string
          submitted_at: string | null
          task_prompt_id: string | null
          task_prompt_text: string
          teacher_id: string | null
          updated_at: string | null
          word_count: number
        }
        Insert: {
          created_at?: string | null
          full_text: string
          genre: string
          id?: string
          plan_data?: Json | null
          published_at?: string | null
          pupil_confidence?: number | null
          pupil_id: string
          reviewed_at?: string | null
          self_review_scores?: Json | null
          status?: string
          submitted_at?: string | null
          task_prompt_id?: string | null
          task_prompt_text: string
          teacher_id?: string | null
          updated_at?: string | null
          word_count: number
        }
        Update: {
          created_at?: string | null
          full_text?: string
          genre?: string
          id?: string
          plan_data?: Json | null
          published_at?: string | null
          pupil_confidence?: number | null
          pupil_id?: string
          reviewed_at?: string | null
          self_review_scores?: Json | null
          status?: string
          submitted_at?: string | null
          task_prompt_id?: string | null
          task_prompt_text?: string
          teacher_id?: string | null
          updated_at?: string | null
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "writing_pieces_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writing_pieces_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
          {
            foreignKeyName: "writing_pieces_task_prompt_id_fkey"
            columns: ["task_prompt_id"]
            isOneToOne: false
            referencedRelation: "writing_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writing_pieces_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writing_pieces_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
      writing_tasks: {
        Row: {
          created_at: string | null
          genre: string
          id: string
          is_teacher_assignable: boolean | null
          planning_scaffold_type: string | null
          prompt_text: string
          success_criteria: Json
          title: string
          word_count_max: number
          word_count_min: number
          year_group_max: number
          year_group_min: number
        }
        Insert: {
          created_at?: string | null
          genre: string
          id?: string
          is_teacher_assignable?: boolean | null
          planning_scaffold_type?: string | null
          prompt_text: string
          success_criteria: Json
          title: string
          word_count_max: number
          word_count_min?: number
          year_group_max: number
          year_group_min: number
        }
        Update: {
          created_at?: string | null
          genre?: string
          id?: string
          is_teacher_assignable?: boolean | null
          planning_scaffold_type?: string | null
          prompt_text?: string
          success_criteria?: Json
          title?: string
          word_count_max?: number
          word_count_min?: number
          year_group_max?: number
          year_group_min?: number
        }
        Relationships: []
      class_members: {
        Row: { id: string; class_id: string; pupil_id: string; joined_at: string | null; created_at: string | null }
        Insert: { id?: string; class_id: string; pupil_id: string; joined_at?: string | null; created_at?: string | null }
        Update: { id?: string; class_id?: string; pupil_id?: string; joined_at?: string | null; created_at?: string | null }
        Relationships: []
      }
      grid_sessions: {
        Row: { id: string; pupil_id: string; class_id: string | null; session_date: string; xp_earned: number; genre: string; rows: Json; w_level: number; anchor_sentence: string; created_at: string | null }
        Insert: { id?: string; pupil_id: string; class_id?: string | null; session_date: string; xp_earned: number; genre: string; rows: Json; w_level: number; anchor_sentence: string; created_at?: string | null }
        Update: { id?: string; pupil_id?: string; class_id?: string | null; session_date?: string; xp_earned?: number; genre?: string; rows?: Json; w_level?: number; anchor_sentence?: string; created_at?: string | null }
        Relationships: []
      }
      grid_templates: {
        Row: { id: string; genre: string; w_level: number; template_data: Json; created_at: string | null }
        Insert: { id?: string; genre: string; w_level: number; template_data: Json; created_at?: string | null }
        Update: { id?: string; genre?: string; w_level?: number; template_data?: Json; created_at?: string | null }
        Relationships: []
      }
      learning_events: {
        Row: { id: string; pupil_id: string; event_type: string; created_at: string | null; from_value: string | null; to_value: string | null; genre: string | null; triggered_by: string | null; evidence: Json | null }
        Insert: { id?: string; pupil_id: string; event_type: string; created_at?: string | null; from_value?: string | null; to_value?: string | null; genre?: string | null; triggered_by?: string | null; evidence?: Json | null }
        Update: { id?: string; pupil_id?: string; event_type?: string; created_at?: string | null; from_value?: string | null; to_value?: string | null; genre?: string | null; triggered_by?: string | null; evidence?: Json | null }
        Relationships: []
      }
      pupils: {
        Row: { id: string; auth_user_id: string; first_name: string; year_group: number | null; class_id: string | null; created_at: string | null }
        Insert: { id?: string; auth_user_id: string; first_name: string; year_group?: number | null; class_id?: string | null; created_at?: string | null }
        Update: { id?: string; auth_user_id?: string; first_name?: string; year_group?: number | null; class_id?: string | null; created_at?: string | null }
        Relationships: []
      }
      pwp_audio_assets: {
        Row: { id: string; key: string; storage_path: string; duration_ms: number | null; created_at: string | null }
        Insert: { id?: string; key: string; storage_path: string; duration_ms?: number | null; created_at?: string | null }
        Update: { id?: string; key?: string; storage_path?: string; duration_ms?: number | null; created_at?: string | null }
        Relationships: []
      }
      pwp_challenge_assignments: {
        Row: { id: string; class_id: string; pupil_id: string | null; challenge_type: string; source: string; active: boolean; created_at: string | null; assigned_by: string | null }
        Insert: { id?: string; class_id: string; pupil_id?: string | null; challenge_type: string; source: string; active?: boolean; created_at?: string | null; assigned_by?: string | null }
        Update: { id?: string; class_id?: string; pupil_id?: string | null; challenge_type?: string; source?: string; active?: boolean; created_at?: string | null; assigned_by?: string | null }
        Relationships: []
      }
      pwp_chain_sentences: {
        Row: { id: string; session_id: string; formula_level: number; sentence: string; attempt_number: number; accepted: boolean; validation_result: Json; created_at: string | null }
        Insert: { id?: string; session_id: string; formula_level: number; sentence: string; attempt_number: number; accepted: boolean; validation_result: Json; created_at?: string | null }
        Update: { id?: string; session_id?: string; formula_level?: number; sentence?: string; attempt_number?: number; accepted?: boolean; validation_result?: Json; created_at?: string | null }
        Relationships: []
      }
      pwp_chain_sessions: {
        Row: { id: string; pupil_id: string; class_id: string | null; session_date: string; xp_earned: number; level_reached: number; subject_noun: string; chain_complete: boolean; total_attempts: number; new_formula_attempts: number; duration_seconds: number; created_at: string | null }
        Insert: { id?: string; pupil_id: string; class_id?: string | null; session_date: string; xp_earned: number; level_reached: number; subject_noun: string; chain_complete: boolean; total_attempts: number; new_formula_attempts: number; duration_seconds: number; created_at?: string | null }
        Update: { id?: string; pupil_id?: string; class_id?: string | null; session_date?: string; xp_earned?: number; level_reached?: number; subject_noun?: string; chain_complete?: boolean; total_attempts?: number; new_formula_attempts?: number; duration_seconds?: number; created_at?: string | null }
        Relationships: []
      }
      pwp_class_themes: {
        Row: { id: string; class_id: string; formula_level: number; theme_label: string; week_start: string; active: boolean; set_by: string | null; created_at: string | null }
        Insert: { id?: string; class_id: string; formula_level: number; theme_label: string; week_start: string; active?: boolean; set_by?: string | null; created_at?: string | null }
        Update: { id?: string; class_id?: string; formula_level?: number; theme_label?: string; week_start?: string; active?: boolean; set_by?: string | null; created_at?: string | null }
        Relationships: []
      }
      pwp_compound_sessions: {
        Row: { id: string; pupil_id: string; class_id: string | null; session_date: string; xp_earned: number; level: number; subject_noun: string; created_at: string | null }
        Insert: { id?: string; pupil_id: string; class_id?: string | null; session_date: string; xp_earned: number; level: number; subject_noun: string; created_at?: string | null }
        Update: { id?: string; pupil_id?: string; class_id?: string | null; session_date?: string; xp_earned?: number; level?: number; subject_noun?: string; created_at?: string | null }
        Relationships: []
      }
      pwp_free_practice_sentences: {
        Row: { id: string; pupil_id: string; class_id: string | null; xp_earned: number; accepted: boolean; level: number; attempts: number; sentence: string; subject_noun: string; created_at: string | null }
        Insert: { id?: string; pupil_id: string; class_id?: string | null; xp_earned: number; accepted: boolean; level: number; attempts: number; sentence: string; subject_noun: string; created_at?: string | null }
        Update: { id?: string; pupil_id?: string; class_id?: string | null; xp_earned?: number; accepted?: boolean; level?: number; attempts?: number; sentence?: string; subject_noun?: string; created_at?: string | null }
        Relationships: []
      }
      pwp_levels: {
        Row: { id: number; level_number: number; title: string; new_element: string; trigger_note: string | null; is_paragraph_phase: boolean; xp_reward: number; created_at: string | null }
        Insert: { id?: number; level_number: number; title: string; new_element: string; trigger_note?: string | null; is_paragraph_phase?: boolean; xp_reward?: number; created_at?: string | null }
        Update: { id?: number; level_number?: number; title?: string; new_element?: string; trigger_note?: string | null; is_paragraph_phase?: boolean; xp_reward?: number; created_at?: string | null }
        Relationships: []
      }
      pwp_paragraphs: {
        Row: { id: string; session_id: string; lead_sentence: string | null; support_sentences: Json | null; close_sentence: string | null; close_ai_passed: boolean | null; close_ai_feedback: string | null; created_at: string | null }
        Insert: { id?: string; session_id: string; lead_sentence?: string | null; support_sentences?: Json | null; close_sentence?: string | null; close_ai_passed?: boolean | null; close_ai_feedback?: string | null; created_at?: string | null }
        Update: { id?: string; session_id?: string; lead_sentence?: string | null; support_sentences?: Json | null; close_sentence?: string | null; close_ai_passed?: boolean | null; close_ai_feedback?: string | null; created_at?: string | null }
        Relationships: []
      }
      pwp_pupil_badges: {
        Row: { id: string; pupil_id: string; badge_key: string; awarded_at: string; created_at: string | null }
        Insert: { id?: string; pupil_id: string; badge_key: string; awarded_at?: string; created_at?: string | null }
        Update: { id?: string; pupil_id?: string; badge_key?: string; awarded_at?: string; created_at?: string | null }
        Relationships: []
      }
      pwp_pupil_levels: {
        Row: { id: string; pupil_id: string; class_id: string | null; current_level: number; mastery_points: number; mastery_signal: boolean; updated_at: string; created_at: string | null }
        Insert: { id?: string; pupil_id: string; class_id?: string | null; current_level: number; mastery_points?: number; mastery_signal?: boolean; updated_at?: string; created_at?: string | null }
        Update: { id?: string; pupil_id?: string; class_id?: string | null; current_level?: number; mastery_points?: number; mastery_signal?: boolean; updated_at?: string; created_at?: string | null }
        Relationships: []
      }
      pwp_pupil_positions: {
        Row: { id: string; pupil_id: string; highest_lesson: number; ready_to_advance: boolean; updated_at: string; created_at: string | null }
        Insert: { id?: string; pupil_id: string; highest_lesson: number; ready_to_advance?: boolean; updated_at?: string; created_at?: string | null }
        Update: { id?: string; pupil_id?: string; highest_lesson?: number; ready_to_advance?: boolean; updated_at?: string; created_at?: string | null }
        Relationships: []
      }
      pwp_quiz_attempts: {
        Row: { id: string; pupil_id: string; quiz_id: number; attempt_number: number; score: number; total_prompts: number; passed: boolean; xp_earned: number; created_at: string }
        Insert: { id?: string; pupil_id: string; quiz_id: number; attempt_number: number; score: number; total_prompts: number; passed: boolean; xp_earned?: number; created_at?: string }
        Update: { id?: string; pupil_id?: string; quiz_id?: number; attempt_number?: number; score?: number; total_prompts?: number; passed?: boolean; xp_earned?: number; created_at?: string }
        Relationships: []
      }
      pwp_quiz_prompts: {
        Row: { id: number; quiz_id: number; prompt_number: number; subject: string; verb: string; instruction: string; target_sentence: string | null; created_at: string | null }
        Insert: { id?: number; quiz_id: number; prompt_number: number; subject: string; verb: string; instruction: string; target_sentence?: string | null; created_at?: string | null }
        Update: { id?: number; quiz_id?: number; prompt_number?: number; subject?: string; verb?: string; instruction?: string; target_sentence?: string | null; created_at?: string | null }
        Relationships: []
      }
      pwp_quiz_results: {
        Row: { id: string; pupil_id: string; quiz_id: number; overall_passed: boolean; prompt_results: Json; attempt_number: number; session_id: string | null; created_at: string }
        Insert: { id?: string; pupil_id: string; quiz_id: number; overall_passed: boolean; prompt_results: Json; attempt_number?: number; session_id?: string | null; created_at?: string }
        Update: { id?: string; pupil_id?: string; quiz_id?: number; overall_passed?: boolean; prompt_results?: Json; attempt_number?: number; session_id?: string | null; created_at?: string }
        Relationships: []
      }
      pwp_quizzes: {
        Row: { id: number; quiz_number: number; inserted_after_level: number; title: string | null; created_at: string | null }
        Insert: { id?: number; quiz_number: number; inserted_after_level: number; title?: string | null; created_at?: string | null }
        Update: { id?: number; quiz_number?: number; inserted_after_level?: number; title?: string | null; created_at?: string | null }
        Relationships: []
      }
      pwp_session_steps: {
        Row: { id: string; session_id: string; step_number: number; formula_label: string; sentence: string; passed: boolean; attempts: number; created_at: string | null }
        Insert: { id?: string; session_id: string; step_number: number; formula_label: string; sentence: string; passed: boolean; attempts: number; created_at?: string | null }
        Update: { id?: string; session_id?: string; step_number?: number; formula_label?: string; sentence?: string; passed?: boolean; attempts?: number; created_at?: string | null }
        Relationships: []
      }
      pwp_sessions: {
        Row: { id: string; pupil_id: string; status: string; theme_noun: string | null; genre_hint: string | null; subject_noun: string; highest_lesson: number; created_at: string | null; completed_at: string | null }
        Insert: { id?: string; pupil_id: string; status?: string; theme_noun?: string | null; genre_hint?: string | null; subject_noun?: string; highest_lesson?: number; created_at?: string | null; completed_at?: string | null }
        Update: { id?: string; pupil_id?: string; status?: string; theme_noun?: string | null; genre_hint?: string | null; subject_noun?: string; highest_lesson?: number; created_at?: string | null; completed_at?: string | null }
        Relationships: []
      }
      pwp_steps: {
        Row: { id: number; level_id: number; step_number: number; formula: string; step_type: string; instruction: string; example_sentence: string | null; word_bank_config: Json | null; created_at: string | null }
        Insert: { id?: number; level_id: number; step_number: number; formula: string; step_type: string; instruction: string; example_sentence?: string | null; word_bank_config?: Json | null; created_at?: string | null }
        Update: { id?: number; level_id?: number; step_number?: number; formula?: string; step_type?: string; instruction?: string; example_sentence?: string | null; word_bank_config?: Json | null; created_at?: string | null }
        Relationships: []
      }
      streaks: {
        Row: { id: string; pupil_id: string; current_streak: number; longest_streak: number; last_activity_date: string | null; created_at: string | null }
        Insert: { id?: string; pupil_id: string; current_streak?: number; longest_streak?: number; last_activity_date?: string | null; created_at?: string | null }
        Update: { id?: string; pupil_id?: string; current_streak?: number; longest_streak?: number; last_activity_date?: string | null; created_at?: string | null }
        Relationships: []
      }
    }
    Views: {
      v_class_formula_progress: {
        Row: {
          avg_score_30d: number | null
          class_id: string | null
          class_name: string | null
          current_formula_level: number | null
          current_streak: number | null
          first_name: string | null
          has_consolidation_flag: boolean | null
          last_session_date: string | null
          longest_streak: number | null
          pupil_id: string | null
          school_id: string | null
          sessions_30d: number | null
          total_xp: number | null
          writing_studio_unlocked: boolean | null
          year_group: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pending_writing_reviews: {
        Row: {
          class_id: string | null
          days_pending: number | null
          genre: string | null
          id: string | null
          pupil_id: string | null
          pupil_name: string | null
          submitted_at: string | null
          teacher_id: string | null
          word_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writing_pieces_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writing_pieces_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
      v_pupil_transfer_rate: {
        Row: {
          class_id: string | null
          current_formula_level: number | null
          last_session_date: string | null
          pupil_id: string | null
          success_rate_last_5: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formula_progress_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formula_progress_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: true
            referencedRelation: "v_class_formula_progress"
            referencedColumns: ["pupil_id"]
          },
        ]
      }
    }
    Functions: {
      get_user_role: { Args: never; Returns: string }
      get_user_school_id: { Args: never; Returns: string }
      increment_xp: {
        Args: { amount: number; pupil_id: string }
        Returns: undefined
      }
      is_approved_parent_of_pupil: {
        Args: { pupil_id: string }
        Returns: boolean
      }
      is_school_admin: { Args: never; Returns: boolean }
      is_school_admin_of_pupil: { Args: { pupil_id: string }; Returns: boolean }
      is_teacher_of_pupil: { Args: { pupil_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
