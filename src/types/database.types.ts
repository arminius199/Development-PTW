export interface PTWRecord {
  id?: string;
  number: string;
  description: string;
  company: string;
  location: string;
  type: string;
  project: string;
  owner: string;
  day: string; // Can be "Day", "Night", or date string (YYYY-MM-DD)
  status: string;
  created_at?: string;
}