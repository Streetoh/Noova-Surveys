export type Locale = 'et' | 'en' | 'ru' | 'es';

export type SurveyStatus = 'draft' | 'active' | 'closed';

export type QuestionType = 'text' | 'slider' | 'rating10' | 'emoji5' | 'choice' | 'bodymap';

export type Polarity = 'positive' | 'inverse' | 'neutral';

export type BodyZoneId =
  | 'shoulder_r'
  | 'shoulder_l'
  | 'hip_r'
  | 'hip_l'
  | 'quad_r'
  | 'quad_l'
  | 'hamstring_r'
  | 'hamstring_l'
  | 'knee_r'
  | 'knee_l'
  | 'calf_r'
  | 'calf_l'
  | 'ankle_r'
  | 'ankle_l'
  | 'back';

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
  highlightInSummary?: boolean;
  polarity?: Polarity;
  multiline?: boolean;
  quickChips?: string[];
  min?: number;
  max?: number;
  minLabel?: LocalizedText;
  maxLabel?: LocalizedText;
  multiSelect?: boolean;
  maxSelections?: number;
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
