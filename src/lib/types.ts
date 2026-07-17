export type PaymentStatus = "pending" | "slip_uploaded" | "verified" | "rejected";

export type EventStatus = "pending" | "published" | "rejected";

export type Role = "super_admin" | "organizer";

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  created_at: string;
}

export interface SeatingConfig {
  rows: string[];
  seatsPerRow: number;
  /** Seats per block, separated by walking aisles (must sum to seatsPerRow). */
  blocks: number[];
  pricePerSeat: number;
  maxSeatsPerBooking: number;
}

export interface BankDetails {
  name: string;
  accountName: string;
  accountNumber: string;
  branch: string;
}

export interface EventTeam {
  name: string;
  city: string;
  crest: string;
}

export interface ScheduleItem {
  label: string;
  value: string;
}

export interface EventRow {
  id: string;
  owner_id: string | null;
  banner_url: string | null;
  slug: string;
  name: string;
  edition: string | null;
  subtitle: string | null;
  tagline: string[];
  description: string;
  venue: string;
  schedule: ScheduleItem[];
  /** Optional "versus" module (e.g. Royal vs Trinity). */
  teams: { home: EventTeam; away: EventTeam } | null;
  /** null = "Date TBA": listed as upcoming, no countdown. */
  starts_at: string | null;
  gates_open_at: string | null;
  seating: SeatingConfig;
  bank: BankDetails;
  collect_batch: boolean;
  status: EventStatus;
  created_at: string;
  published_at: string | null;
}

export interface Registration {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  phone: string;
  batch: string;
  payment_status: PaymentStatus;
  access_token: string;
  created_at: string;
}

export interface BookedSeat {
  id: string;
  registration_id: string;
  event_id: string;
  seat_no: string;
  created_at: string;
}

export interface PaymentSlip {
  id: string;
  registration_id: string;
  storage_path: string;
  uploaded_at: string;
}

export interface Ticket {
  id: string;
  registration_id: string;
  ticket_number: string;
  qr_token: string;
  issued_at: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
}
