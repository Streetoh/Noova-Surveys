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
  } else if (type === 'slider') {
    base.min = 0;
    base.max = 10;
    base.minLabel = { et: '', en: '', ru: '', es: '' };
    base.maxLabel = { et: '', en: '', ru: '', es: '' };
  } else if (type === 'choice') {
    base.multiSelect = false;
    base.options = createYesNoOptions();
  }
  return base;
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
        text: {
          et: 'Kui raske tänane trenn sinu jaoks oli? (1 = väga kerge, 10 = maksimaalne)',
          en: 'How hard was today’s session? (1 = very easy, 10 = maximum)',
          ru: 'Насколько тяжёлой была тренировка? (1 = очень лёгкая, 10 = максимум)',
          es: '¿Qué tan duro fue el entrenamiento hoy? (1 = muy suave, 10 = máximo)',
        },
      },
      {
        id: 'tpl_tr_3',
        type: 'slider',
        required: true,
        min: 0,
        max: 10,
        minLabel: { et: 'Üldse mitte', en: 'Not at all', ru: 'Совсем нет', es: 'Nada' },
        maxLabel: { et: 'Väga palju', en: 'Very much', ru: 'Очень сильно', es: 'Muchísimo' },
        text: {
          et: 'Kui palju sa täna trennist rõõmu tundsid?',
          en: 'How much did you enjoy training today?',
          ru: 'Насколько тебе понравилась сегодняшняя тренировка?',
          es: '¿Cuánto disfrutaste del entrenamiento de hoy?',
        },
      },
      {
        id: 'tpl_tr_4',
        type: 'text',
        required: false,
        multiline: true,
        text: {
          et: 'Mis läks hästi või mida tahaksid järgmisel korral harjutada?',
          en: 'What went well or what would you like to practice next?',
          ru: 'Что получилось хорошо или что хочешь потренировать в следующий раз?',
          es: '¿Qué salió bien o qué te gustaría practicar en el próximo entreno?',
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
        text: {
          et: 'Hinda oma pingutust ja keskendumist väljakul (1–10)',
          en: 'Rate your effort and focus on the pitch (1–10)',
          ru: 'Оцени свою самоотдачу и концентрацию на поле (1–10)',
          es: 'Valora tu esfuerzo y concentración en el campo (1–10)',
        },
      },
      {
        id: 'tpl_m_3',
        type: 'slider',
        required: true,
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
        min: 0,
        max: 10,
        minLabel: { et: 'Väsinud', en: 'Tired', ru: 'Устал', es: 'Cansado' },
        maxLabel: { et: 'Täis energiat', en: 'Full energy', ru: 'Полон сил', es: 'A tope de energía' },
        text: {
          et: 'Kui palju energiat sul täna on?',
          en: 'How much energy do you have today?',
          ru: 'Сколько у тебя сегодня энергии?',
          es: '¿Cuánta energía tienes hoy?',
        },
      },
      {
        id: 'tpl_g_3',
        type: 'choice',
        required: true,
        multiSelect: false,
        options: [
          { id: 'opt_yes', label: { et: 'Jah', en: 'Yes', ru: 'Да', es: 'Sí' } },
          { id: 'opt_no', label: { et: 'Ei', en: 'No', ru: 'Нет', es: 'No' } },
        ],
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
