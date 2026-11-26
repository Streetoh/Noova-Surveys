import type { Question, Survey } from '../types/survey.ts';

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyQuestion(type: Question['type'] = 'rating10'): Question {
  const base: Question = {
    id: generateId('q'),
    type,
    text: { et: '', en: '', ru: '' },
    required: true,
  };
  if (type === 'text') {
    base.multiline = false;
  } else if (type === 'slider') {
    base.min = 1;
    base.max = 10;
    base.minLabel = { et: '', en: '', ru: '' };
    base.maxLabel = { et: '', en: '', ru: '' };
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
    allowIdentityChoice: true,
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
        },
      },
      {
        id: 'tpl_tr_3',
        type: 'slider',
        required: true,
        min: 1,
        max: 10,
        minLabel: { et: 'Vähe', en: 'Low', ru: 'Мало' },
        maxLabel: { et: 'Väga palju', en: 'High', ru: 'Очень много' },
        text: {
          et: 'Kui palju sa täna trennist rõõmu tundsid?',
          en: 'How much did you enjoy training today?',
          ru: 'Насколько тебе понравилась сегодняшняя тренировка?',
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
    allowIdentityChoice: true,
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
        },
      },
      {
        id: 'tpl_m_3',
        type: 'rating10',
        required: true,
        text: {
          et: 'Kui hästi me täna meeskonnana koostööd tegime? (1–10)',
          en: 'How well did we work together as a team today? (1–10)',
          ru: 'Насколько хорошо мы сегодня сыграли как команда? (1–10)',
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
    allowIdentityChoice: true,
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
        },
      },
      {
        id: 'tpl_g_2',
        type: 'slider',
        required: true,
        min: 0,
        max: 100,
        minLabel: { et: 'Väsinud', en: 'Tired', ru: 'Устал' },
        maxLabel: { et: 'Täis energiat', en: 'Full energy', ru: 'Полон сил' },
        text: {
          et: 'Kui palju energiat sul täna on?',
          en: 'How much energy do you have today?',
          ru: 'Сколько у тебя сегодня энергии?',
        },
      },
      {
        id: 'tpl_g_3',
        type: 'text',
        required: false,
        multiline: true,
        text: {
          et: 'Kas on midagi, mida treener peaks teadma?',
          en: 'Is there anything the coach should know?',
          ru: 'Есть ли что-то, о чём тренеру стоит знать?',
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
  return {
    title: options.titleSuffix ? `${source.title} ${options.titleSuffix}`.trim() : source.title,
    description: source.description,
    teamTag: source.teamTag,
    status: 'draft',
    isTemplate: options.isTemplate ?? false,
    allowIdentityChoice: source.allowIdentityChoice,
    allowMultipleFromSameDevice: source.allowMultipleFromSameDevice,
    questions: source.questions.map((q) => ({
      ...q,
      id: generateId('q'),
      text: { ...q.text },
      minLabel: q.minLabel ? { ...q.minLabel } : undefined,
      maxLabel: q.maxLabel ? { ...q.maxLabel } : undefined,
    })),
    responseCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}
