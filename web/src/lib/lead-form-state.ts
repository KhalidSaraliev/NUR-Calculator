import type { FieldErrors } from '@/lib/validation'

export interface LeadFormState {
  status: 'idle' | 'error' | 'success'
  message?: string
  errors?: FieldErrors
  /** Введённые значения — чтобы не потерять их при ошибке. */
  values?: Record<string, string>
  attempt: number
  leadNumber?: string
}

export const initialLeadFormState: LeadFormState = { status: 'idle', attempt: 0 }
