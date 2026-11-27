import type { ChoiceOption, LocalizedText, Question, Survey } from '../types/survey.ts';

export interface StarterTemplate
  extends Omit<Survey, 'id' | 'createdAt' | 'updatedAt' | 'responseCount'> {
  localizedTitle: LocalizedText;
  localizedDescription: LocalizedText;
}

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

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    title: 'Trennijärgne tagasiside',
    localizedTitle: {
      et: 'Trennijärgne tagasiside',
      en: 'Post-Training Check-in',
      ru: 'Оценка тренировки',
      es: 'Check-in Post-Entreno',
    },
    description: 'Kiire enesetunde, koormuse ja valude kontroll pärast trenni',
    localizedDescription: {
      et: 'Kiire enesetunde, koormuse ja valude kontroll pärast trenni',
      en: 'Quick mood, load and soreness check after training',
      ru: 'Быстрая проверка настроя, нагрузки и самочувствия после тренировки',
      es: 'Control rápido de sensaciones, carga y molestias tras el entreno',
    },
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
          et: 'Kuidas sulle tänane trenn meeldis?',
          en: "How much did you enjoy today's training?",
          ru: 'Как тебе сегодняшняя тренировка?',
          es: '¿Cuánto te ha gustado el entrenamiento de hoy?',
        },
      },
      {
        id: 'tpl_tr_2',
        type: 'rating10',
        required: true,
        highlightInSummary: true,
        polarity: 'inverse',
        text: {
          et: 'Kui raske oli tänane trenn? (1 = väga kerge, 10 = väga raske)',
          en: "How hard was today's training? (1 = very easy, 10 = very hard)",
          ru: 'Насколько тяжёлой была тренировка? (1 = очень легко, 10 = очень тяжело)',
          es: '¿Cómo de duro ha sido el entreno? (1 = muy fácil, 10 = muy duro)',
        },
      },
      {
        id: 'tpl_tr_3',
        type: 'bodymap',
        required: false,
        text: {
          et: 'Kas sul valutab kuskilt või tunned ebamugavust?',
          en: 'Does anything hurt or feel uncomfortable?',
          ru: 'Есть ли где-то боль или дискомфорт?',
          es: '¿Te duele algo o notas alguna molestia?',
        },
      },
      {
        id: 'tpl_tr_4',
        type: 'text',
        required: false,
        multiline: true,
        quickChips: ['1v1', 'Löömine', 'Söödud', 'Mäng'],
        text: {
          et: 'Mis oli täna kõige lahedam või mida uut õppisid?',
          en: 'What was the best part today or what did you learn?',
          ru: 'Что было самым классным сегодня или чему новому ты научился?',
          es: '¿Qué ha sido lo mejor de hoy o qué has aprendido nuevo?',
        },
      },
    ],
  },
  {
    title: 'Mängujärgne tagasiside',
    localizedTitle: {
      et: 'Mängujärgne tagasiside',
      en: 'Post-Match Reflection',
      ru: 'Оценка после игры',
      es: 'Reflexión Post-Partido',
    },
    description: 'Pingutuse, meeskonnatöö ja enesetunde analüüs pärast mängu',
    localizedDescription: {
      et: 'Pingutuse, meeskonnatöö ja enesetunde analüüs pärast mängu',
      en: 'Effort, teamwork and recovery check after the match',
      ru: 'Анализ самоотдачи, командной игры и самочувствия после матча',
      es: 'Análisis de esfuerzo, trabajo en equipo y molestias tras el partido',
    },
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
          et: 'Kuidas sa end pärast mängu tunned?',
          en: 'How do you feel after the match?',
          ru: 'Как ты себя чувствуешь после игры?',
          es: '¿Cómo te sientes después del partido?',
        },
      },
      {
        id: 'tpl_m_2',
        type: 'rating10',
        required: true,
        highlightInSummary: true,
        polarity: 'positive',
        text: {
          et: 'Kui palju sa täna platsil pingutasid?',
          en: 'How much effort did you give on the pitch today?',
          ru: 'Насколько сильно ты выложился сегодня на поле?',
          es: '¿Cuánto te has esforzado hoy en el campo?',
        },
      },
      {
        id: 'tpl_m_3',
        type: 'slider',
        required: true,
        polarity: 'positive',
        min: 0,
        max: 10,
        minLabel: { et: 'Nõrk', en: 'Low', ru: 'Слабо', es: 'Poco' },
        maxLabel: { et: 'Suurepärane', en: 'Great', ru: 'Отлично', es: 'Excelente' },
        text: {
          et: 'Kuidas meeskond täna koos mängis ja üksteist toetas?',
          en: 'How well did the team play together and support each other?',
          ru: 'Насколько хорошо команда играла вместе и поддерживала друг друга?',
          es: '¿Cómo de bien ha jugado unido y se ha apoyado el equipo hoy?',
        },
      },
      {
        id: 'tpl_m_4',
        type: 'bodymap',
        required: false,
        text: {
          et: 'Kas said mängus kuskile pihta või tunned valu?',
          en: 'Did you get any knocks or feel pain from the match?',
          ru: 'Получил ли ты ушиб или чувствуешь боль после игры?',
          es: '¿Te llevaste algún golpe o notas dolor tras el partido?',
        },
      },
      {
        id: 'tpl_m_5',
        type: 'text',
        required: false,
        multiline: true,
        quickChips: ['Kaitse', 'Rünnak', 'Suhtlus', 'Kiirus'],
        text: {
          et: 'Üks asi, mida tegid hästi, ja üks asi, mida tahad järgmine kord paremini teha:',
          en: 'One thing you did well, and one thing to improve next time:',
          ru: 'Одна вещь, которая получилась хорошо, и одна, которую хочешь улучшить:',
          es: 'Una cosa que hiciste bien y una que quieres mejorar la próxima vez:',
        },
      },
    ],
  },
  {
    title: 'Meeskonna tunne ja heaolu',
    localizedTitle: {
      et: 'Meeskonna tunne ja heaolu',
      en: 'Team Vibe & Wellbeing',
      ru: 'Атмосфера в команде',
      es: 'Clima de Equipo y Bienestar',
    },
    description: 'Kiire ülevaade tiimi õhkkonnast, turvatundest ja suhetest',
    localizedDescription: {
      et: 'Kiire ülevaade tiimi õhkkonnast, turvatundest ja suhetest',
      en: 'Check-in on team atmosphere, safety and teammate connection',
      ru: 'Проверка атмосферы, комфорта и отношений в команде',
      es: 'Pulso rápido del ambiente, seguridad y relación con el grupo',
    },
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
          et: 'Kui hästi sa end meie meeskonnas tunned?',
          en: 'How good do you feel in our team?',
          ru: 'Насколько хорошо ты чувствуешь себя в команде?',
          es: '¿Cómo de a gusto te sientes en el equipo?',
        },
      },
      {
        id: 'tpl_g_2',
        type: 'rating10',
        required: true,
        highlightInSummary: true,
        polarity: 'positive',
        text: {
          et: 'Kui lõbus ja turvaline sul trennides on?',
          en: 'How fun and safe do you feel at training?',
          ru: 'Насколько весело и комфортно тебе на тренировках?',
          es: '¿Cuánto te diviertes y qué tan seguro te sientes entrenando?',
        },
      },
      {
        id: 'tpl_g_3',
        type: 'slider',
        required: true,
        polarity: 'positive',
        min: 0,
        max: 10,
        minLabel: { et: 'Vähe', en: 'Not much', ru: 'Слабо', es: 'Poco' },
        maxLabel: { et: 'Väga hästi', en: 'Very well', ru: 'Отлично', es: 'Genial' },
        text: {
          et: 'Kui hästi sa meeskonnakaaslastega läbi saad?',
          en: 'How well do you get along with your teammates?',
          ru: 'Насколько хорошо ты ладишь с партнёрами по команде?',
          es: '¿Qué tal te llevas con tus compañeros de equipo?',
        },
      },
      {
        id: 'tpl_g_4',
        type: 'text',
        required: false,
        multiline: true,
        text: {
          et: 'Kas on midagi, mida tahaksid treenerile öelda või trennides muuta?',
          en: "Is there anything you'd like to tell the coach or change in training?",
          ru: 'Есть ли что-то, что ты хочешь сказать тренеру или изменить на тренировках?',
          es: '¿Hay algo que quieras contarle al entrenador o cambiar en los entrenos?',
        },
      },
    ],
  },
  {
    title: 'Valmisolek enne turniiri',
    localizedTitle: {
      et: 'Valmisolek enne turniiri',
      en: 'Pre-Tournament Readiness',
      ru: 'Готовность к турниру',
      es: 'Preparación Pre-Torneo',
    },
    description: 'Energia, une, valude ja isikliku eesmärgi kontroll enne mänge',
    localizedDescription: {
      et: 'Energia, une, valude ja isikliku eesmärgi kontroll enne mänge',
      en: 'Energy, sleep, soreness and personal goal check before games',
      ru: 'Проверка энергии, сна, самочувствия и личной цели перед играми',
      es: 'Control de energía, sueño, molestias y objetivo personal antes de jugar',
    },
    teamTag: 'U12',
    status: 'draft',
    isTemplate: true,
    allowMultipleFromSameDevice: false,
    questions: [
      {
        id: 'tpl_pt_1',
        type: 'emoji5',
        required: true,
        highlightInSummary: true,
        polarity: 'positive',
        text: {
          et: 'Kuidas sa end enne mänge tunned?',
          en: 'How are you feeling before the games?',
          ru: 'Как ты себя чувствуешь перед играми?',
          es: '¿Cómo te sientes antes de empezar?',
        },
      },
      {
        id: 'tpl_pt_2',
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
        id: 'tpl_pt_3',
        type: 'rating10',
        required: true,
        highlightInSummary: true,
        polarity: 'positive',
        text: {
          et: 'Kui hästi sa öösel magasid?',
          en: 'How well did you sleep last night?',
          ru: 'Насколько хорошо ты спал этой ночью?',
          es: '¿Cómo de bien has dormido esta noche?',
        },
      },
      {
        id: 'tpl_pt_4',
        type: 'bodymap',
        required: false,
        text: {
          et: 'Kas sul on enne mänge mõni väike valu või väsimus?',
          en: 'Do you have any small aches or soreness before playing?',
          ru: 'Есть ли какая-то боль или усталость перед играми?',
          es: '¿Tienes alguna molestia o sobrecarga antes de jugar?',
        },
      },
      {
        id: 'tpl_pt_5',
        type: 'text',
        required: false,
        multiline: false,
        text: {
          et: 'Mis on sinu isiklik eesmärk tänasel päeval? (nt julgelt triblada, rohkem rääkida)',
          en: 'What is your personal goal today? (e.g., dribble bravely, talk more)',
          ru: 'Какая у тебя личная цель на сегодня? (например, смелее идти в обыгрыш, больше подсказывать)',
          es: '¿Cuál es tu objetivo personal hoy? (ej. regatear sin miedo, hablar más)',
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
