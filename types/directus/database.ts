export interface Database {
  // Define the database interface here
}

// Add missing types that were causing import errors
export interface FormSubmission {
  id: string;
  form: string;
  date_created?: string;
  user_created?: string;
  status?: string;
}

export interface FormSubmissionValue {
  id: string;
  form_submission: string;
  field: string;
  value?: string;
  file?: string;
}

export enum UserRole {
  APPLICANT = 'applicant',
  EMPLOYER_ADMIN = 'employer_admin',
  TEAM_MEMBER = 'team_member',
  ADMIN = 'admin',
  WRITER = 'writer'
}