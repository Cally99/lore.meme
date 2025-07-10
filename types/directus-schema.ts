// Page types
export interface PageBlock {
  id: string;
  collection?: string;
  item?: string;
  status?: string;
  blocks?: any[];
}

// Post type
export interface Post {
  id: string;
  title: string;
  content?: string;
  slug?: string;
  status?: string;
  image?: DirectusFile | string | null;
  author?: DirectusUser | string | null;
  published_at?: string;
  description?: string;
}

// User type
export interface DirectusUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  avatar?: DirectusFile | string | null;
  role?: string;
  status?: 'active' | 'invited' | 'draft' | 'suspended' | 'deleted';
  profile?: any;
}

// Form field types
export interface FormField {
  id: string;
  name: string;
  type: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: any;
}

export type FormFieldType = 'text' | 'textarea' | 'email' | 'number' | 'select' | 'checkbox' | 'radio' | 'date' | 'file';

// Directus file type
export interface DirectusFile {
  id: string;
  storage?: string;
  filename_disk?: string;
  filename_download?: string;
  title?: string;
  type?: string;
  folder?: string | null;
  uploaded_by?: string;
  uploaded_on?: string;
  modified_by?: string | null;
  modified_on?: string;
  filesize?: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  description?: string | null;
  location?: string | null;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
}

// Form submission types
export interface FormSubmission {
  id: string;
  form: string;
  date_created?: string;
  user_created?: string;
  status?: string;
}

export interface FormSubmissionValue {
  id: string;
  form_submission?: string;
  field: string;
  value?: string;
  file?: string;
}

// Schema type for zod schema builders
export interface Schema {
  collection?: string;
  fields?: any[];
  relations?: any[];
}

