export type Locale = 'et' | 'en' | 'ru' | 'es';

export type SurveyStatus = 'draft' | 'active' | 'closed';

export type QuestionType = 'text' | 'slider' | 'rating10' | 'emoji5' | 'choice';

export interface LocalizedText {
  et: string;
  en?: string;
  ru?: string;
  es?: string;
}

export interface ChoiceOption {
  id: string;
  label: LocalizedText;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: LocalizedText;
  required: boolean;
  multiline?: boolean;
  min?: number;
  max?: number;
  minLabel?: LocalizedText;
  maxLabel?: LocalizedText;
  multiSelect?: boolean;
  options?: ChoiceOption[];
}

export interface Team {
  id: string;
  name: string;
  players: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  teamTag: string;
  teamId?: string;
  teamRosterSnapshot?: string[];
  closesAt?: number | null;
  status: SurveyStatus;
  isTemplate: boolean;
  allowMultipleFromSameDevice: boolean;
  questions: Question[];
  responseCount: number;
  createdAt: number;
  updatedAt: number;
}

export type AnswerValue = string | number | string[];

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentName: string;
  locale: Locale;
  answers: Record<string, AnswerValue>;
  submittedAt: number;
}
