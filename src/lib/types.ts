// Row types for the mem_ tables this app reads. Keep in sync with
// src/supabase/migrations/ — extend as later phases touch more tables.

export type Account = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  whatsapp_opt_in: boolean;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Participant = {
  id: string;
  account_id: string;
  name: string;
  dob: string; // ISO date
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  medical_notes: string | null;
  person_id: string | null; // waiver system link
  created_at: string;
  updated_at: string;
};
