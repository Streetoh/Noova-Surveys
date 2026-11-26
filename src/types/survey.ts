export type Locale = 'et' | 'en' | 'ru';

export type SurveyStatus = 'draft' | 'active' | 'closed';

export type QuestionType = 'text' | 'slider' | 'rating10' | 'emoji5';

export type IdentityMode = 'name' | 'pseudonym';

export interface LocalizedText {
  et: string;
  en?: string;
  ru?: string;
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
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  teamTag: string;
  status: SurveyStatus;
  isTemplate: boolean;
  allowIdentityChoice: boolean;
  allowMultipleFromSameDevice: boolean;
  questions: Question[];
  responseCount: number;
  createdAt: number;
  updatedAt: number;
}

export type AnswerValue = string | number;

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentName: string;
  identityMode: IdentityMode;
  locale: Locale;
  answers: Record<string, AnswerValue>;
  submittedAt: number;
}
