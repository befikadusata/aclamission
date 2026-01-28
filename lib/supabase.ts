export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      individuals: {
        Row: {
          id: string
          name: string
          phone_number: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone_number?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone_number?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pledges: {
        Row: {
          id: string
          individual_id: string
          missionaries_committed: number
          frequency: "monthly" | "quarterly" | "annually" | null
          amount_per_frequency: number
          special_support_amount: number
          special_support_frequency: "monthly" | "quarterly" | "annually" | null
          in_kind_support: boolean
          in_kind_support_details: string | null
          yearly_missionary_support: number
          yearly_special_support: number
          fulfillment_status: number
          last_fulfillment_date: string | null
          date_of_commitment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          individual_id: string
          missionaries_committed?: number
          frequency?: "monthly" | "quarterly" | "annually" | null
          amount_per_frequency?: number
          special_support_amount?: number
          special_support_frequency?: "monthly" | "quarterly" | "annually" | null
          in_kind_support?: boolean
          in_kind_support_details?: string | null
          yearly_missionary_support?: number
          yearly_special_support?: number
          fulfillment_status?: number
          last_fulfillment_date?: string | null
          date_of_commitment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          individual_id?: string
          missionaries_committed?: number
          frequency?: "monthly" | "quarterly" | "annually" | null
          amount_per_frequency?: number
          special_support_amount?: number
          special_support_frequency?: "monthly" | "quarterly" | "annually" | null
          in_kind_support?: boolean
          in_kind_support_details?: string | null
          yearly_missionary_support?: number
          yearly_special_support?: number
          fulfillment_status?: number
          last_fulfillment_date?: string | null
          date_of_commitment?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agreements: {
        Row: {
          id: string
          partner_id: string
          agreement_code: string
          type: "annual" | "one_time_special"
          support_type: "missionary_support" | "special_project"
          frequency: "monthly" | "quarterly" | "annually" | "one_time"
          delivery_type: "direct_to_missionary" | "through_partner"
          number_of_missionaries: number | null
          amount_per_missionary: string | null
          total_amount: string | null
          start_date: string | null
          end_date: string | null
          status: "active" | "expired" | "awaiting_renewal" | "draft"
          agreement_document_url: string | null
          notes: string | null
          bank_name: string | null
          bank_account_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          partner_id: string
          agreement_code: string
          type: "annual" | "one_time_special"
          support_type: "missionary_support" | "special_project"
          frequency: "monthly" | "quarterly" | "annually" | "one_time"
          delivery_type: "direct_to_missionary" | "through_partner"
          number_of_missionaries?: number | null
          amount_per_missionary?: string | null
          total_amount?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: "active" | "expired" | "awaiting_renewal" | "draft"
          agreement_document_url?: string | null
          notes?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          partner_id?: string
          agreement_code?: string
          type?: "annual" | "one_time_special"
          support_type?: "missionary_support" | "special_project"
          frequency?: "monthly" | "quarterly" | "annually" | "one_time"
          delivery_type?: "direct_to_missionary" | "through_partner"
          number_of_missionaries?: number | null
          amount_per_missionary?: string | null
          total_amount?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: "active" | "expired" | "awaiting_renewal" | "draft"
          agreement_document_url?: string | null
          notes?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      outgoings: {
        Row: {
          id: string
          type: "missionary_support" | "other"
          title: string
          description: string | null
          amount: number
          status: "requested" | "approved" | "finalized"
          request_date: string
          agreement_id: string | null
          expense_category: string | null
          supporting_doc_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: "missionary_support" | "other"
          title: string
          description?: string | null
          amount: number
          status?: "requested" | "approved" | "finalized"
          request_date?: string
          agreement_id?: string | null
          expense_category?: string | null
          supporting_doc_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: "missionary_support" | "other"
          title?: string
          description?: string | null
          amount?: number
          status?: "requested" | "approved" | "finalized"
          request_date?: string
          agreement_id?: string | null
          expense_category?: string | null
          supporting_doc_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      approvals: {
        Row: {
          id: string
          outgoing_id: string
          approved_by: string
          approval_date: string
          created_at: string
        }
        Insert: {
          id?: string
          outgoing_id: string
          approved_by: string
          approval_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          outgoing_id?: string
          approved_by?: string
          approval_date?: string
          created_at?: string
        }
      }
      finalizations: {
        Row: {
          id: string
          outgoing_id: string
          bank_name: string
          transfer_date: string
          transfer_amount: number
          transfer_doc_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          outgoing_id: string
          bank_name: string
          transfer_date: string
          transfer_amount: number
          transfer_doc_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          outgoing_id?: string
          bank_name?: string
          transfer_date?: string
          transfer_amount?: number
          transfer_doc_url?: string | null
          created_at?: string
        }
      }
      bank_transactions: {
        Row: {
          id: string
          date: string
          description: string
          amount: number
          balance: number | null
          reference: string | null
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          description: string
          amount: number
          balance?: number | null
          reference?: string | null
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          description?: string
          amount?: number
          balance?: number | null
          reference?: string | null
          category?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      disbursements: {
        Row: {
          id: string
          agreement_id: string
          missionary_id: string | null
          amount: number
          date: string
          status: "pending" | "completed" | "failed"
          reference_number: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agreement_id: string
          missionary_id?: string | null
          amount: number
          date: string
          status?: "pending" | "completed" | "failed"
          reference_number?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agreement_id?: string
          missionary_id?: string | null
          amount?: number
          date?: string
          status?: "pending" | "completed" | "failed"
          reference_number?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      missionaries: {
        Row: {
          id: string
          name: string
          partner_id: string
          email: string | null
          phone: string | null
          country_of_service: string | null
          area_of_ministry: string | null
          ministry_description: string | null
          photo_url: string | null
          status: "active" | "inactive" | "on_leave"
          agreement_id: string | null
          gender: "male" | "female" | null
          age: number | null
          marital_status: "married" | "single" | null
          number_of_family_members: number | null
          denomination: string | null
          church: string | null
          educational_status: string | null
          language: string | null
          region: string | null
          zone: string | null
          woreda: string | null
          information_approved_by: string | null
          monthly_support_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          partner_id: string
          email?: string | null
          phone?: string | null
          country_of_service?: string | null
          area_of_ministry?: string | null
          ministry_description?: string | null
          photo_url?: string | null
          status?: "active" | "inactive" | "on_leave"
          agreement_id?: string | null
          gender?: "male" | "female" | null
          age?: number | null
          marital_status?: "married" | "single" | null
          number_of_family_members?: number | null
          denomination?: string | null
          church?: string | null
          educational_status?: string | null
          language?: string | null
          region?: string | null
          zone?: string | null
          woreda?: string | null
          information_approved_by?: string | null
          monthly_support_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          partner_id?: string
          email?: string | null
          phone?: string | null
          country_of_service?: string | null
          area_of_ministry?: string | null
          ministry_description?: string | null
          photo_url?: string | null
          status?: "active" | "inactive" | "on_leave"
          agreement_id?: string | null
          gender?: "male" | "female" | null
          age?: number | null
          marital_status?: "married" | "single" | null
          number_of_family_members?: number | null
          denomination?: string | null
          church?: string | null
          educational_status?: string | null
          language?: string | null
          region?: string | null
          zone?: string | null
          woreda?: string | null
          information_approved_by?: string | null
          monthly_support_amount?: number | null
          created_at: string
          updated_at: string
        }
      }
      partners: {
        Row: {
          id: string
          name: string
          type: "church" | "organization" | "individual"
          country: string | null
          contact_person_name: string | null
          contact_email: string | null
          contact_phone: string | null
          address: string | null
          bank_name: string | null
          bank_account_number: string | null
          bank_routing_number: string | null
          bank_swift_code: string | null
          status: "active" | "inactive" | "pending"
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: "church" | "organization" | "individual"
          country?: string | null
          contact_person_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_routing_number?: string | null
          bank_swift_code?: string | null
          status?: "active" | "inactive" | "pending"
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: "church" | "organization" | "individual"
          country?: string | null
          contact_person_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_routing_number?: string | null
          bank_swift_code?: string | null
          status?: "active" | "inactive" | "pending"
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      receipts_reports: {
        Row: {
          id: string
          partner_id: string
          type: "receipt" | "report"
          title: string
          description: string | null
          file_url: string
          file_name: string
          file_size: number | null
          upload_date: string
          period_start: string | null
          period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          partner_id: string
          type: "receipt" | "report"
          title: string
          description?: string | null
          file_url: string
          file_name: string
          file_size?: number | null
          upload_date: string
          period_start?: string | null
          period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          partner_id?: string
          type?: "receipt" | "report"
          title?: string
          description?: string | null
          file_url?: string
          file_name?: string
          file_size?: number | null
          upload_date?: string
          period_start?: string | null
          period_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: "admin" | "user"
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: "admin" | "user"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: "admin" | "user"
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    ? (Database["public"]["Tables"] & Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends keyof Database["public"]["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof Database["public"]["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends keyof Database["public"]["Enums"] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
