export type PermitType =
  | 'municipal'
  | 'electrical'
  | 'environmental'
  | 'fire_safety'
  | 'structural'
  | 'interconnection'
  | 'net_metering';

export type PermitStatus = 'pending' | 'submitted' | 'in_review' | 'approved' | 'rejected';

export interface PermitDocument {
  name: string;
  url: string;
  type: string;
  uploaded_at: string;
}

export interface Permit {
  id: string;
  project_id: string;
  permit_type: PermitType;
  status: PermitStatus;
  submitted_at: string | null;
  approved_at: string | null;
  reference_number: string | null;
  notes: string | null;
  documents: PermitDocument[] | null;
  created_at: string;
  updated_at: string;
}

export type PermitInsert = Omit<Permit, 'id' | 'created_at' | 'updated_at'>;
export type PermitUpdate = Partial<PermitInsert>;
