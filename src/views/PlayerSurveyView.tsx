import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LanguageSwitcher } from '../components/LanguageSwitcher.tsx';
import { createTranslator } from '../i18n/index.ts';
import { isBlockedByAntispam, markSubmittedOnDevice } from '../lib/antispam.ts';
import { sortPlayersAlphabetically } from '../lib/roster.ts';
import {
  canAdvanceQuestion,
  isSurveyEffectivelyClosed,
  resolveLocalizedText,
  validateAllAnswers,
} from '../lib/validation.ts';
import { getSurveyById, submitSurveyResponse } from '../services/surveysRepo.ts';
import { useAppStore } from '../store/useAppStore.ts';
import type { AnswerValue, Question, Survey } from '../types/survey.ts';

const SAVED_PLAYER_NAME_KEY = 'pps_saved_player_name_v1';
const OTHER_PLAYER_SENTINEL = '__OTHER__';

const EMOJI_OPTIONS: {
  value: number;
  face: string;
  color: string;
  labelKey: 'emoji.1' | 'emoji.2' | 'emoji.3' | 'emoji.4' | 'emoji.5';
}[] = [
  { value: 1, face: '😣', color: '#ef4444', labelKey: 'emoji.1' },
  { value: 2, face: '😕', color: '#f97316', labelKey: 'emoji.2' },
  { value: 3, face: '😐', color: '#eab308', labelKey: 'emoji.3' },
  { value: 4, face: '🙂', color: '#84cc16', labelKey: 'emoji.4' },
  { value: 5, face: '😄', color: '#22c55e', labelKey: 'emoji.5' },
];

const RATING10_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f43f5e',
  3: '#f97316',
  4: '#fb923c',
  5: '#eab308',
  6: '#a3e635',
  7: '#84cc16',
  8: '#4ade80',
  9: '#22c55e',
  10: '#10b981',
};

function getSpectrumColor(ratio: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const hue = clamped <= 0.5 ? clamped * 2 * 46 : 46 + (clamped - 0.5) * 2 * 96;
  return `hsl(${Math.round(hue)}, 84%, 54%)`;
}

function readSavedPlayerName(): string {
  try {
    return window.localStorage.getItem(SAVED_PLAYER_NAME_KEY) || '';
  } catch {
    return '';
  }
}

function writeSavedPlayerName(name: string): void {
  try {
    window.localStorage.setItem(SAVED_PLAYER_NAME_KEY, name);
  } catch {
    // Ignore
  }
}

type PlayerPhase = 'welcome' | 'questions' | 'done';

interface PlayerSurveyRunnerProps {
  survey: Survey;
  previewMode?: boolean;
  onExitPreview?: () => void;
}

export function PlayerSurveyRunner({
  survey,
  previewMode = false,
  onExitPreview,
}: PlayerSurveyRunnerProps) {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const t = createTranslator(locale);

  const roster = useMemo(
    () =>
      Array.isArray(survey.teamRosterSnapshot) && survey.teamRosterSnapshot.length > 0
        ? sortPlayersAlphabetically(survey.teamRosterSnapshot, locale)
        : [],
    [survey.teamRosterSnapshot, locale]
  );

  const hasRoster = roster.length > 0;

  const [phase, setPhase] = useState<PlayerPhase>('welcome');
  const [blocked] = useState(() =>
    previewMode ? false : isBlockedByAntispam(survey.id, survey.allowMultipleFromSameDevice)
  );

  const [selectedRosterChoice, setSelectedRosterChoice] = useState<string>(() => {
    if (previewMode || survey.allowMultipleFromSameDevice) return '';
    const saved = readSavedPlayerName();
    if (!saved) return '';
    if (roster.includes(saved)) return saved;
    return hasRoster ? OTHER_PLAYER_SENTINEL : '';
  });

  const [customPlayerName, setCustomPlayerName] = useState<string>(() => {
    if (previewMode || survey.allowMultipleFromSameDevice) return '';
    const saved = readSavedPlayerName();
    if (!saved) return '';
    if (hasRoster && roster.includes(saved)) return '';
    return saved;
  });

  const [nameError, setNameError] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resolvedPlayerName = hasRoster
    ? selectedRosterChoice === OTHER_PLAYER_SENTINEL
      ? customPlayerName.trim()
      : selectedRosterChoice.trim()
    : customPlayerName.trim();

  function handleStart() {
    if (!resolvedPlayerName) {
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

  function toggleChoiceOption(question: Question, optionId: string) {
    if (!question.multiSelect) {
      setAnswer(question.id, optionId);
      return;
    }
    const prev = answers[question.id];
    const currentArr = Array.isArray(prev) ? prev : [];
    const nextArr = currentArr.includes(optionId)
      ? currentArr.filter((id) => id !== optionId)
      : [...currentArr, optionId];
    setAnswer(question.id, nextArr);
  }

  async function handleNextOrSubmit() {
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

    if (previewMode) {
      setPhase('done');
      return;
    }

    setSubmitting(true);
    setStepError(null);
    try {
      await submitSurveyResponse({
        surveyId: survey.id,
        respondentName: resolvedPlayerName,
        locale,
        answers,
        submittedAt: Date.now(),
      });
      if (!survey.allowMultipleFromSameDevice) {
        markSubmittedOnDevice(survey.id);
        writeSavedPlayerName(resolvedPlayerName);
      }
      setPhase('done');
    } catch {
      setStepError(t('player.submitError'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleAnswerAgain() {
    setSelectedRosterChoice('');
    setCustomPlayerName('');
    setAnswers({});
    setQuestionIndex(0);
    setStepError(null);
    setPhase('welcome');
  }

  const previewBanner = previewMode ? (
    <div className="preview-top-banner">
      <span>{t('preview.banner')}</span>
      {onExitPreview && (
        <button type="button" className="btn btn-secondary btn-compact" onClick={onExitPreview}>
          {t('preview.closePreview')}
        </button>
      )}
    </div>
  ) : null;

  if (!previewMode && isSurveyEffectivelyClosed(survey)) {
    return (
      <div className="player-shell">
        <div className="player-container">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LanguageSwitcher locale={locale} onChange={setLocale} large />
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
            <LanguageSwitcher locale={locale} onChange={setLocale} large />
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
        {previewBanner}
        <div className="player-container">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LanguageSwitcher locale={locale} onChange={setLocale} large />
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

            <div className="privacy-banner" role="note">
              <span className="privacy-lock" aria-hidden="true">🔒</span>
              <span>{t('player.privacyNotice')}</span>
            </div>

            {hasRoster ? (
              <div className="field" style={{ gap: 10 }}>
                <span className="field-label" style={{ fontSize: 14 }}>
                  {t('player.pickYourName')}
                </span>
                <div className="roster-grid" role="group">
                  {roster.map((name) => {
                    const selected = selectedRosterChoice === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        className={`roster-btn${selected ? ' selected' : ''}`}
                        onClick={() => {
                          setSelectedRosterChoice(name);
                          if (nameError) setNameError(null);
                        }}
                        aria-pressed={selected}
                      >
                        {name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className={`roster-btn other${selectedRosterChoice === OTHER_PLAYER_SENTINEL ? ' selected' : ''}`}
                    onClick={() => {
                      setSelectedRosterChoice(OTHER_PLAYER_SENTINEL);
                      if (nameError) setNameError(null);
                    }}
                    aria-pressed={selectedRosterChoice === OTHER_PLAYER_SENTINEL}
                  >
                    {t('player.otherNameOption')}
                  </button>
                </div>

                {selectedRosterChoice === OTHER_PLAYER_SENTINEL && (
                  <input
                    className="input"
                    style={{ minHeight: 54, fontSize: 17 }}
                    value={customPlayerName}
                    onChange={(e) => {
                      setCustomPlayerName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleStart();
                    }}
                    placeholder={t('player.namePlaceholder')}
                    autoFocus
                  />
                )}
                {nameError && <p className="field-error">{nameError}</p>}
              </div>
            ) : (
              <div className="field" style={{ gap: 8 }}>
                <label htmlFor="player-real-name" className="field-label" style={{ fontSize: 14 }}>
                  {t('player.nameLabel')}
                </label>
                <input
                  id="player-real-name"
                  className="input"
                  style={{ minHeight: 54, fontSize: 17 }}
                  value={customPlayerName}
                  onChange={(e) => {
                    setCustomPlayerName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleStart();
                  }}
                  placeholder={t('player.namePlaceholder')}
                  autoFocus={!customPlayerName}
                />
                {nameError && <p className="field-error">{nameError}</p>}
              </div>
            )}
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
        {previewBanner}
        <div className="player-container">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LanguageSwitcher locale={locale} onChange={setLocale} large />
          </div>

          <div className="player-question-stage" style={{ textAlign: 'center', alignItems: 'center' }}>
            <div className="done-check-badge">✓</div>
            <h1 className="player-question-title">{t('player.thanksTitle')}</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 16 }}>
              {t('player.thanksBody')}
            </p>
            {!survey.allowMultipleFromSameDevice && !previewMode && (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
                {t('player.deviceLockedNote')}
              </p>
            )}
          </div>

          <div className="player-footer">
            {survey.allowMultipleFromSameDevice || previewMode ? (
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

  const sliderMin = currentQuestion.min ?? 0;
  const sliderMax = currentQuestion.max ?? 10;
  const sliderMid = Math.round(((sliderMin + sliderMax) / 2) * 10) / 10;
  const hasSliderValue = typeof currentValue === 'number';
  const sliderValue = hasSliderValue ? currentValue : Math.round((sliderMin + sliderMax) / 2);
  const sliderRatio =
    sliderMax > sliderMin ? (sliderValue - sliderMin) / (sliderMax - sliderMin) : 0.5;
  const sliderColor = getSpectrumColor(sliderRatio);

  return (
    <div className="player-shell">
      {previewBanner}
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
              {EMOJI_OPTIONS.map((opt) => {
                const selected = currentValue === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`emoji5-btn${selected ? ' selected' : ''}`}
                    style={
                      selected
                        ? { borderColor: opt.color, boxShadow: `0 0 0 2px ${opt.color}33` }
                        : undefined
                    }
                    onClick={() => setAnswer(currentQuestion.id, opt.value)}
                    aria-pressed={selected}
                  >
                    <span className="emoji-face">{opt.face}</span>
                    <span className="emoji-label">{t(opt.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'rating10' && (
            <div className="rating10-stage">
              <div className="rating10-grid" role="group">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
                  const selected = currentValue === num;
                  const tone = RATING10_COLORS[num];
                  return (
                    <button
                      key={num}
                      type="button"
                      className={`rating10-pill${selected ? ' selected' : ''}`}
                      style={
                        selected
                          ? {
                              backgroundColor: tone,
                              borderColor: tone,
                              color: '#08090b',
                            }
                          : undefined
                      }
                      onClick={() => setAnswer(currentQuestion.id, num)}
                      aria-pressed={selected}
                    >
                      <span className="rating10-num">{num}</span>
                      <span
                        className="rating10-bar"
                        style={{ backgroundColor: selected ? '#08090b' : tone }}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="scale-legend">
                <span>1 · {t('player.scaleLow')}</span>
                <span>10 · {t('player.scaleHigh')}</span>
              </div>
            </div>
          )}

          {currentQuestion.type === 'slider' && (
            <div className="slider-stage">
              <div
                className="slider-value-badge"
                style={{
                  color: hasSliderValue ? sliderColor : 'var(--text-muted)',
                  borderColor: hasSliderValue ? sliderColor : 'var(--border-strong)',
                }}
              >
                {hasSliderValue ? sliderValue : '—'}
              </div>

              {!hasSliderValue && (
                <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {t('player.sliderTouchHint')}
                </div>
              )}

              <div className="gradient-slider-wrap">
                <input
                  type="range"
                  className="gradient-slider"
                  min={sliderMin}
                  max={sliderMax}
                  step={1}
                  value={sliderValue}
                  onChange={(e) => setAnswer(currentQuestion.id, Number(e.target.value))}
                  onPointerDown={() => {
                    if (!hasSliderValue) {
                      setAnswer(currentQuestion.id, sliderValue);
                    }
                  }}
                />
                <div className="slider-ruler" aria-hidden="true">
                  <span>{sliderMin}</span>
                  <span className="slider-ruler-mid">{sliderMid}</span>
                  <span>{sliderMax}</span>
                </div>
              </div>

              {(resolveLocalizedText(currentQuestion.minLabel, locale) ||
                resolveLocalizedText(currentQuestion.maxLabel, locale)) && (
                <div className="slider-endpoints">
                  <span>{resolveLocalizedText(currentQuestion.minLabel, locale)}</span>
                  <span>{resolveLocalizedText(currentQuestion.maxLabel, locale)}</span>
                </div>
              )}
            </div>
          )}

          {currentQuestion.type === 'choice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentQuestion.multiSelect && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {t('player.multiChoiceHint')}
                </div>
              )}
              <div className="choice-list" role="group">
                {(currentQuestion.options || []).map((opt) => {
                  const selected = currentQuestion.multiSelect
                    ? Array.isArray(currentValue) && currentValue.includes(opt.id)
                    : currentValue === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`choice-btn${selected ? ' selected' : ''}`}
                      onClick={() => toggleChoiceOption(currentQuestion, opt.id)}
                      aria-pressed={selected}
                    >
                      <span>{resolveLocalizedText(opt.label, locale)}</span>
                      <span className="choice-indicator" aria-hidden="true">
                        {selected ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isLast && (
            <div className="privacy-subtle" role="note">
              🔒 {t('player.privacyNotice')}
            </div>
          )}

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
    </div>
  );
}

export function PlayerSurveyView() {
  const { surveyId } = useParams();
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const t = createTranslator(locale);

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [surveyId]);

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
            <LanguageSwitcher locale={locale} onChange={setLocale} large />
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

  return <PlayerSurveyRunner survey={survey} />;
}
