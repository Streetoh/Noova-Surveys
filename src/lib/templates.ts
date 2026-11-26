import type { ChoiceOption, Question, Survey } from '../types/survey.ts';

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createYesNoOptions(): ChoiceOption[] {
  return [
    {
      id: generateId('opt'),
      label: { et: 'Jah', en: 'Yes', ru: 'Да', es: 'Sí' },
    },
    {
      id: generateId('opt'),
      label: { et: 'Ei', en: 'No', ru: 'Нет', es: 'No' },
    },
  ];
}

export function createEmptyChoiceOption(): ChoiceOption {
  return {
    id: generateId('opt'),
    label: { et: '', en: '', ru: '', es: '' },
  };
}

export function createEmptyQuestion(type: Question['type'] = 'rating10'): Question {
  const base: Question = {
    id: generateId('q'),
    type,
    text: { et: '', en: '', ru: '', es: '' },
    required: true,
  };
  if (type === 'text') {
    base.multiline = false;
    base.quickChips = [];
  } else if (type === 'slider') {
    base.min = 0;
    base.max = 10;
    base.polarity = 'positive';
    base.minLabel = { et: '', en: '', ru: '', es: '' };
    base.maxLabel = { et: '', en: '', ru: '', es: '' };
  } else if (type === 'rating10' || type === 'emoji5') {
    base.polarity = 'positive';
  } else if (type === 'choice') {
    base.multiSelect = false;
    base.options = createYesNoOptions();
  } else if (type === 'bodymap') {
    base.text = {
      et: 'Kas tunned kuskil valu või ebamugavust?',
      en: 'Do you feel any pain or discomfort anywhere?',
      ru: 'Чувствуешь ли ты где-нибудь боль или дискомфорт?',
      es: '¿Tienes alguna molestia o dolor hoy?',
    };
  }
  return base;
}

export function changeQuestionType(question: Question, nextType: Question['type']): Question {
  if (question.type === nextType) return question;

  const isNumericNext =
    nextType === 'rating10' || nextType === 'slider' || nextType === 'emoji5';

  const hasCustomText = Boolean(
    question.text.et.trim() ||
      question.text.en?.trim() ||
      question.text.ru?.trim() ||
      question.text.es?.trim()
  );

  const next: Question = {
    id: question.id,
    type: nextType,
    text:
      nextType === 'bodymap' && !hasCustomText
        ? { ...createEmptyQuestion('bodymap').text }
        : { ...question.text },
    required: question.required,
  };

  if (isNumericNext && question.highlightInSummary) {
    next.highlightInSummary = true;
  }

  if (nextType === 'text') {
    next.multiline = question.multiline ?? false;
    next.quickChips = question.quickChips ? [...question.quickChips] : [];
  } else if (nextType === 'slider') {
    next.min = question.min ?? 0;
    next.max = question.max ?? 10;
    next.polarity = question.polarity ?? 'positive';
    next.minLabel = question.minLabel ? { ...question.minLabel } : { et: '', en: '', ru: '', es: '' };
    next.maxLabel = question.maxLabel ? { ...question.maxLabel } : { et: '', en: '', ru: '', es: '' };
  } else if (nextType === 'rating10' || nextType === 'emoji5') {
    next.polarity = question.polarity ?? 'positive';
  } else if (nextType === 'choice') {
    next.multiSelect = question.multiSelect ?? false;
    if (question.maxSelections) {
      next.maxSelections = question.maxSelections;
    }
    next.options =
      question.options && question.options.length >= 2
        ? question.options.map((opt) => ({ id: opt.id, label: { ...opt.label } }))
        : createYesNoOptions();
  }

  return next;
}

export const STARTER_TEMPLATES: Omit<Survey, 'id' | 'createdAt' | 'updatedAt' | 'responseCount'>[] = [
  {
    title: 'Treeningu tagasiside',
    description: 'Kiire enesetunde ja koormuse kontroll pärast trenni',
    teamTag: 'U12',
    status: 'draft',
    isTemplate: true,
    allowMultipleFromSameDevice: false,
    questions: [
      {
        id: 'tpl_tr_1',
        type: 'emoji5',
        required: true,
        highlightInSummary: true,
        polarity: 'positive',
        text: {
          et: 'Kuidas sa end pärast tänast trenni tunned?',
          en: 'How do you feel after today’s training?',
          ru: 'Как ты себя чувствуешь после сегодняшней тренировки?',
          es: '¿Cómo te sientes después del entrenamiento de hoy?',
        },
      },
      {
        id: 'tpl_tr_2',
        type: 'rating10',
        required: true,
        highlightInSummary: true,
        polarity: 'inverse',
        text: {
          et: 'Kui raske tänane trenn sinu jaoks oli?',
          en: 'How hard was today’s session?',
          ru: 'Насколько тяжёлой была тренировка?',
          es: '¿Qué tan duro fue el entrenamiento hoy?',
        },
      },
      {
        id: 'tpl_tr_3',
        type: 'bodymap',
        required: true,
        text: {
          et: 'Kas tunned kuskil valu või ebamugavust?',
          en: 'Do you feel any pain or discomfort?',
          ru: 'Чувствуешь ли ты где-нибудь боль или дискомфорт?',
          es: '¿Tienes alguna molestia o dolor tras el entreno?',
        },
      },
      {
        id: 'tpl_tr_4',
        type: 'text',
        required: false,
        multiline: true,
        quickChips: ['1v1', 'Löömine', 'Söödud', 'Mäng'],
        text: {
          et: 'Mis meeldis kõige rohkem või mida tahaksid järgmisel korral harjutada?',
          en: 'What did you enjoy most or want to practice next?',
          ru: 'Что понравилось больше всего или что хочешь потренировать дальше?',
          es: '¿Qué te gustó más o qué quieres practicar en el próximo entreno?',
        },
      },
    ],
  },
  {
    title: 'Mängu hindamine',
    description: 'Meeskonna ja enda mängu analüüs pärast kohtumist',
    teamTag: 'U14',
    status: 'draft',
    isTemplate: true,
    allowMultipleFromSameDevice: false,
    questions: [
      {
        id: 'tpl_m_1',
        type: 'emoji5',
        required: true,
        highlightInSummary: true,
        polarity: 'positive',
        text: {
          et: 'Milline tunne jäi tänasest mängust?',
          en: 'How do you feel about today’s match?',
          ru: 'Какие впечатления остались от сегодняшней игры?',
          es: '¿Qué sensación te dejó el partido de hoy?',
        },
      },
      {
        id: 'tpl_m_2',
        type: 'rating10',
        required: true,
        highlightInSummary: true,
        polarity: 'positive',
        text: {
          et: 'Hinda oma pingutust ja keskendumist väljakul',
          en: 'Rate your effort and focus on the pitch',
          ru: 'Оцени свою самоотдачу и концентрацию на поле',
          es: 'Valora tu esfuerzo y concentración en el campo',
        },
      },
      {
        id: 'tpl_m_3',
        type: 'slider',
        required: true,
        polarity: 'positive',
        min: 0,
        max: 10,
        minLabel: { et: 'Nõrk', en: 'Low', ru: 'Слабо', es: 'Flojo' },
        maxLabel: { et: 'Suurepärane', en: 'Great', ru: 'Отлично', es: 'Excelente' },
        text: {
          et: 'Kui hästi me täna meeskonnana koostööd tegime?',
          en: 'How well did we work together as a team today?',
          ru: 'Насколько хорошо мы сегодня сыграли как команда?',
          es: '¿Qué tal trabajamos hoy en equipo?',
        },
      },
      {
        id: 'tpl_m_4',
        type: 'text',
        required: false,
        multiline: false,
        quickChips: ['Kaitse', 'Rünnak', 'Suhtlus', 'Kiirus'],
        text: {
          et: 'Üks asi, mida tahaksid järgmises mängus paremini teha:',
          en: 'One thing you want to do better in the next match:',
          ru: 'Одна вещь, которую хочешь сделать лучше в следующей игре:',
          es: 'Una cosa que quieras mejorar en el próximo partido:',
        },
      },
    ],
  },
  {
    title: 'Grupi meeleolu',
    description: 'Kiire ülevaade tiimi õhkkonnast ja energiast',
    teamTag: 'U10',
    status: 'draft',
    isTemplate: true,
    allowMultipleFromSameDevice: true,
    questions: [
      {
        id: 'tpl_g_1',
        type: 'emoji5',
        required: true,
        highlightInSummary: true,
        polarity: 'positive',
        text: {
          et: 'Milline on sinu tuju täna trenni tulles?',
          en: 'What is your mood coming to training today?',
          ru: 'С каким настроением ты пришёл на тренировку?',
          es: '¿Con qué ánimo vienes hoy a entrenar?',
        },
      },
      {
        id: 'tpl_g_2',
        type: 'slider',
        required: true,
        highlightInSummary: true,
        polarity: 'positive',
        min: 0,
        max: 10,
        minLabel: { et: 'Väsinud', en: 'Tired', ru: 'Устал', es: 'Cansado' },
        maxLabel: { et: 'Täis energiat', en: 'Full energy', ru: 'Полон сил', es: 'A tope' },
        text: {
          et: 'Kui palju energiat sul täna on?',
          en: 'How much energy do you have today?',
          ru: 'Сколько у тебя сегодня энергии?',
          es: '¿Cuánta energía tienes hoy?',
        },
      },
      {
        id: 'tpl_g_3',
        type: 'bodymap',
        required: true,
        text: {
          et: 'Kas tunned kuskil valu või ebamugavust?',
          en: 'Do you feel any pain or discomfort anywhere?',
          ru: 'Чувствуешь ли ты где-нибудь боль или дискомфорт?',
          es: '¿Sientes algún dolor o molestia hoy?',
        },
      },
    ],
  },
];

export function cloneSurveyAsNew(
  source: Omit<Survey, 'id' | 'createdAt' | 'updatedAt' | 'responseCount'>,
  options: { isTemplate?: boolean; titleSuffix?: string } = {}
): Omit<Survey, 'id'> {
  const now = Date.now();
  const cloned: Omit<Survey, 'id'> = {
    title: options.titleSuffix ? `${source.title} ${options.titleSuffix}`.trim() : source.title,
    description: source.description,
    teamTag: source.teamTag,
    status: 'draft',
    isTemplate: options.isTemplate ?? false,
    allowMultipleFromSameDevice: source.allowMultipleFromSameDevice,
    questions: source.questions.map((q) => {
      const nextQ: Question = {
        ...q,
        id: generateId('q'),
        text: { ...q.text },
      };
      if (q.minLabel) nextQ.minLabel = { ...q.minLabel };
      if (q.maxLabel) nextQ.maxLabel = { ...q.maxLabel };
      if (q.quickChips) nextQ.quickChips = [...q.quickChips];
      if (q.options) {
        nextQ.options = q.options.map((opt) => ({
          id: generateId('opt'),
          label: { ...opt.label },
        }));
      }
      return nextQ;
    }),
    responseCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  if (source.teamId) cloned.teamId = source.teamId;
  if (source.teamRosterSnapshot) cloned.teamRosterSnapshot = [...source.teamRosterSnapshot];
  return cloned;
}
