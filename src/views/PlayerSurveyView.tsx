import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LanguageSwitcher } from '../components/LanguageSwitcher.tsx';
import { createTranslator } from '../i18n/index.ts';
import { isBlockedByAntispam, markSubmittedOnDevice } from '../lib/antispam.ts';
import { generateNickname } from '../lib/nicknames.ts';
import {
  canAdvanceQuestion,
  resolveLocalizedText,
  validateAllAnswers,
} from '../lib/validation.ts';
import { getSurveyById, submitSurveyResponse } from '../services/surveysRepo.ts';
import { useAppStore } from '../store/useAppStore.ts';
import type { AnswerValue, IdentityMode, Locale, Survey } from '../types/survey.ts';

const EMOJI_OPTIONS: { value: number; face: string; labelKey: 'emoji.1' | 'emoji.2' | 'emoji.3' | 'emoji.4' | 'emoji.5' }[] = [
  { value: 1, face: '😣', labelKey: 'emoji.1' },
  { value: 2, face: '😕', labelKey: 'emoji.2' },
  { value: 3, face: '😐', labelKey: 'emoji.3' },
  { value: 4, face: '🙂', labelKey: 'emoji.4' },
  { value: 5, face: '😄', labelKey: 'emoji.5' },
];

type PlayerPhase = 'welcome' | 'questions' | 'done';

export function PlayerSurveyView() {
  const { surveyId } = useParams();
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const t = createTranslator(locale);

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<PlayerPhase>('welcome');
  const [blocked, setBlocked] = useState(false);

  const [identityMode, setIdentityMode] = useState<IdentityMode>('name');
  const [playerName, setPlayerName] = useState('');
  const [pseudonym, setPseudonym] = useState(() => generateNickname(locale));
  const [nameError, setNameError] = useState<string | null>(null);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!surveyId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    getSurveyById(surveyId)
      .then((found) => {
        if (!mounted) return;
        setSurvey(found);
        if (found) {
          setBlocked(isBlockedByAntispam(found.id, found.allowMultipleFromSameDevice));
        }
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [surveyId]);

  function handleLanguageChange(nextLocale: Locale) {
    setLocale(nextLocale);
    if (phase === 'welcome' && identityMode === 'pseudonym') {
      setPseudonym(generateNickname(nextLocale));
    }
  }

  function handleStart() {
    const activeName = identityMode === 'name' ? playerName.trim() : pseudonym.trim();
    if (!activeName) {
      setNameError(t('player.nameRequired'));
      return;
    }
    setNameError(null);
    setQuestionIndex(0);
    setStepError(null);
    setPhase('questions');
  }

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (stepError) setStepError(null);
  }

  async function handleNextOrSubmit() {
    if (!survey) return;
    const currentQ = survey.questions[questionIndex];
    const currentValue = answers[currentQ.id];

    if (!canAdvanceQuestion(currentQ, currentValue)) {
      setStepError(t('player.requiredHint'));
      return;
    }

    if (questionIndex < survey.questions.length - 1) {
      setQuestionIndex((i) => i + 1);
      setStepError(null);
      return;
    }

    const validation = validateAllAnswers(survey.questions, answers);
    if (!validation.valid) {
      setStepError(t('player.requiredHint'));
      return;
    }

    setSubmitting(true);
    setStepError(null);
    try {
      const finalName = identityMode === 'name' ? playerName.trim() : pseudonym.trim();
      await submitSurveyResponse({
        surveyId: survey.id,
        respondentName: finalName,
        identityMode,
        locale,
        answers,
        submittedAt: Date.now(),
      });
      if (!survey.allowMultipleFromSameDevice) {
        markSubmittedOnDevice(survey.id);
      }
      setPhase('done');
    } catch {
      setStepError(t('player.submitError'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleAnswerAgain() {
    setPlayerName('');
    setPseudonym(generateNickname(locale));
    setAnswers({});
    setQuestionIndex(0);
    setStepError(null);
    setPhase('welcome');
  }

  if (loading) {
    return (
      <div className="player-shell">
        <div className="player-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="player-shell">
        <div className="player-container">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LanguageSwitcher locale={locale} onChange={handleLanguageChange} large />
          </div>
          <div className="player-question-stage" style={{ textAlign: 'center', alignItems: 'center' }}>
            <h1 className="player-question-title">{t('player.notFoundTitle')}</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{t('player.notFoundBody')}</p>
          </div>
          <div />
        </div>
      </div>
    );
  }

  if (survey.status !== 'active') {
    return (
      <div className="player-shell">
        <div className="player-container">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LanguageSwitcher locale={locale} onChange={handleLanguageChange} large />
          </div>
          <div className="player-question-stage" style={{ textAlign: 'center', alignItems: 'center' }}>
            <h1 className="player-question-title">{t('player.closedTitle')}</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{t('player.closedBody')}</p>
          </div>
          <div />
        </div>
      </div>
    );
  }

  if (blocked && phase !== 'done') {
    return (
      <div className="player-shell">
        <div className="player-container">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LanguageSwitcher locale={locale} onChange={handleLanguageChange} large />
          </div>
          <div className="player-question-stage" style={{ textAlign: 'center', alignItems: 'center' }}>
            <h1 className="player-question-title">{t('player.alreadySubmittedTitle')}</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              {t('player.alreadySubmittedBody')}
            </p>
          </div>
          <div />
        </div>
      </div>
    );
  }

  if (phase === 'welcome') {
    return (
      <div className="player-shell">
        <div className="player-container">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LanguageSwitcher locale={locale} onChange={handleLanguageChange} large />
          </div>

          <div className="player-question-stage">
            <div>
              {survey.teamTag && (
                <span className="badge badge-accent" style={{ marginBottom: 10 }}>
                  {survey.teamTag}
                </span>
              )}
              <h1 className="player-question-title">{survey.title}</h1>
              {survey.description && (
                <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
                  {survey.description}
                </p>
              )}
              <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                {t('player.questionsCount', { count: survey.questions.length })}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span className="field-label">{t('player.identityPrompt')}</span>

              {survey.allowIdentityChoice && (
                <div className="identity-toggle" role="group">
                  <button
                    type="button"
                    className={`identity-btn${identityMode === 'name' ? ' active' : ''}`}
                    onClick={() => {
                      setIdentityMode('name');
                      setNameError(null);
                    }}
                  >
                    {t('player.useRealName')}
                  </button>
                  <button
                    type="button"
                    className={`identity-btn${identityMode === 'pseudonym' ? ' active' : ''}`}
                    onClick={() => {
                      setIdentityMode('pseudonym');
                      setNameError(null);
                    }}
                  >
                    {t('player.usePseudonym')}
                  </button>
                </div>
              )}

              {identityMode === 'name' ? (
                <input
                  className="input"
                  style={{ minHeight: 52, fontSize: 16 }}
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  placeholder={t('player.namePlaceholder')}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    className="input"
                    style={{ minHeight: 52, fontSize: 16 }}
                    value={pseudonym}
                    onChange={(e) => {
                      setPseudonym(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    placeholder={t('player.pseudonymPlaceholder')}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setPseudonym(generateNickname(locale))}
                  >
                    {t('player.generateNickname')}
                  </button>
                </div>
              )}

              {nameError && <p className="field-error">{nameError}</p>}
            </div>
          </div>

          <div className="player-footer">
            <button type="button" className="btn btn-primary" onClick={handleStart}>
              {t('player.startAction')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="player-shell">
        <div className="player-container">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LanguageSwitcher locale={locale} onChange={handleLanguageChange} large />
          </div>

          <div className="player-question-stage" style={{ textAlign: 'center', alignItems: 'center' }}>
            <div style={{ fontSize: 52, lineHeight: 1 }}>✓</div>
            <h1 className="player-question-title">{t('player.thanksTitle')}</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 16 }}>
              {t('player.thanksBody')}
            </p>
            {!survey.allowMultipleFromSameDevice && (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
                {t('player.deviceLockedNote')}
              </p>
            )}
          </div>

          <div className="player-footer">
            {survey.allowMultipleFromSameDevice ? (
              <button type="button" className="btn btn-primary" onClick={handleAnswerAgain}>
                {t('player.answerAgain')}
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = survey.questions[questionIndex];
  const currentValue = answers[currentQuestion.id];
  const progressPct = Math.round(((questionIndex + 1) / survey.questions.length) * 100);
  const isLast = questionIndex === survey.questions.length - 1;
  const sliderMin = currentQuestion.min ?? 1;
  const sliderMax = currentQuestion.max ?? 10;
  const sliderValue =
    typeof currentValue === 'number'
      ? currentValue
      : Math.round((sliderMin + sliderMax) / 2);

  return (
    <div className="player-shell">
      <div className="player-container">
        <div className="player-top">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            <span>
              {t('player.progress', {
                current: questionIndex + 1,
                total: survey.questions.length,
              })}
            </span>
            {!currentQuestion.required && (
              <span className="badge">{t('player.optionalBadge')}</span>
            )}
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="player-question-stage">
          <h1 className="player-question-title">
            {resolveLocalizedText(currentQuestion.text, locale)}
          </h1>

          {currentQuestion.type === 'emoji5' && (
            <div className="emoji5-grid" role="group">
              {EMOJI_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`emoji5-btn${currentValue === opt.value ? ' selected' : ''}`}
                  onClick={() => setAnswer(currentQuestion.id, opt.value)}
                  aria-pressed={currentValue === opt.value}
                >
                  <span className="emoji-face">{opt.face}</span>
                  <span className="emoji-label">{t(opt.labelKey)}</span>
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === 'rating10' && (
            <div className="rating10-grid" role="group">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`rating10-btn${currentValue === num ? ' selected' : ''}`}
                  onClick={() => setAnswer(currentQuestion.id, num)}
                  aria-pressed={currentValue === num}
                >
                  {num}
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === 'slider' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="slider-readout">
                {typeof currentValue === 'number' ? currentValue : '—'}
              </div>
              <input
                type="range"
                className="slider-input"
                min={sliderMin}
                max={sliderMax}
                value={sliderValue}
                onChange={(e) => setAnswer(currentQuestion.id, Number(e.target.value))}
                onPointerDown={() => {
                  if (typeof currentValue !== 'number') {
                    setAnswer(currentQuestion.id, sliderValue);
                  }
                }}
              />
              <div className="slider-endpoints">
                <span>
                  {resolveLocalizedText(currentQuestion.minLabel, locale) || sliderMin}
                </span>
                <span>
                  {resolveLocalizedText(currentQuestion.maxLabel, locale) || sliderMax}
                </span>
              </div>
            </div>
          )}

          {currentQuestion.type === 'text' &&
            (currentQuestion.multiline ? (
              <textarea
                className="textarea"
                style={{ minHeight: 140, fontSize: 16 }}
                value={typeof currentValue === 'string' ? currentValue : ''}
                onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                placeholder={t('player.textPlaceholder')}
              />
            ) : (
              <input
                className="input"
                style={{ minHeight: 54, fontSize: 16 }}
                value={typeof currentValue === 'string' ? currentValue : ''}
                onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                placeholder={t('player.textPlaceholder')}
              />
            ))}

          {stepError && <p className="field-error">{stepError}</p>}
        </div>

        <div className="player-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setStepError(null);
              if (questionIndex === 0) setPhase('welcome');
              else setQuestionIndex((i) => i - 1);
            }}
          >
            {t('player.previous')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={submitting}
            onClick={handleNextOrSubmit}
          >
            {submitting
              ? t('player.submitting')
              : isLast
                ? t('player.submit')
                : t('player.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
