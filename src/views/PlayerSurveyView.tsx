import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BodyMapSvg } from '../components/BodyMapSvg.tsx';
import { LanguageSwitcher } from '../components/LanguageSwitcher.tsx';
import { SemicircularDial } from '../components/SemicircularDial.tsx';
import { createTranslator, type TranslationKey } from '../i18n/index.ts';
import { isBlockedByAntispam, markSubmittedOnDevice } from '../lib/antispam.ts';
import {
  isAllClearSelected,
  isBodyZoneId,
  normalizeBodyAnswer,
  selectBodyAllClear,
  toggleBodyZoneSelection,
} from '../lib/bodymap.ts';
import { isQuickChipActiveInText, toggleQuickChipInText } from '../lib/dial.ts';
import { sortPlayersAlphabetically } from '../lib/roster.ts';
import {
  canAdvanceQuestion,
  isSurveyEffectivelyClosed,
  resolveLocalizedText,
  validateAllAnswers,
} from '../lib/validation.ts';
import { getSurveyById, submitSurveyResponse } from '../services/surveysRepo.ts';
import { useAppStore } from '../store/useAppStore.ts';
import type { AnswerValue, BodyZoneId, Question, Survey } from '../types/survey.ts';

const SAVED_PLAYER_NAME_KEY = 'pps_saved_player_name_v1';
const OTHER_PLAYER_SENTINEL = '__OTHER__';

const EMOJI_OPTIONS: {
  value: number;
  face: string;
  color: string;
  labelKey: 'emoji.1' | 'emoji.2' | 'emoji.3' | 'emoji.4' | 'emoji.5';
}[] = [
  { value: 1, face: '😣', color: '#FF5A5F', labelKey: 'emoji.1' },
  { value: 2, face: '😕', color: '#F97316', labelKey: 'emoji.2' },
  { value: 3, face: '😐', color: '#F59E0B', labelKey: 'emoji.3' },
  { value: 4, face: '🙂', color: '#84CC16', labelKey: 'emoji.4' },
  { value: 5, face: '😄', color: '#B8FF2C', labelKey: 'emoji.5' },
];

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
    if (currentArr.includes(optionId)) {
      setAnswer(
        question.id,
        currentArr.filter((id) => id !== optionId)
      );
      return;
    }
    if (
      typeof question.maxSelections === 'number' &&
      question.maxSelections > 0 &&
      currentArr.length >= question.maxSelections
    ) {
      return;
    }
    setAnswer(question.id, [...currentArr, optionId]);
  }

  async function handleContinueOrSubmit() {
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
          <div className="story-card" style={{ justifyContent: 'center', textAlign: 'center', alignItems: 'center' }}>
            <h1 className="player-question-title">{t('player.closedTitle')}</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{t('player.closedBody')}</p>
          </div>
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
          <div className="story-card" style={{ justifyContent: 'center', textAlign: 'center', alignItems: 'center' }}>
            <h1 className="player-question-title">{t('player.alreadySubmittedTitle')}</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              {t('player.alreadySubmittedBody')}
            </p>
          </div>
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

          <div className="story-card">
            <div className="story-card-body" style={{ justifyContent: 'flex-start' }}>
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
                <span aria-hidden="true">🔒</span>
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

            <button
              type="button"
              className="btn btn-primary story-cta-btn"
              disabled={!resolvedPlayerName}
              onClick={handleStart}
            >
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

          <div className="story-card" style={{ justifyContent: 'center', textAlign: 'center', alignItems: 'center' }}>
            <div className="story-card-body" style={{ alignItems: 'center' }}>
              <div className="done-check-badge" aria-hidden="true">✓</div>
              <h1 className="player-question-title">
                {t('player.donePersonalTitle', { name: resolvedPlayerName })}
              </h1>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 16 }}>
                {t('player.thanksBody')}
              </p>
              {!survey.allowMultipleFromSameDevice && !previewMode && (
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
                  {t('player.deviceLockedNote')}
                </p>
              )}
            </div>

            {(survey.allowMultipleFromSameDevice || previewMode) && (
              <button type="button" className="btn btn-primary story-cta-btn" onClick={handleAnswerAgain}>
                {t('player.answerAgain')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = survey.questions[questionIndex];
  const currentValue = answers[currentQuestion.id];
  const isLast = questionIndex === survey.questions.length - 1;
  const canContinue = canAdvanceQuestion(currentQuestion, currentValue);

  const dialMin = currentQuestion.type === 'rating10' ? 1 : (currentQuestion.min ?? 0);
  const dialMax = currentQuestion.type === 'rating10' ? 10 : (currentQuestion.max ?? 10);
  const dialMinLabel =
    currentQuestion.type === 'rating10'
      ? `1 · ${t('player.scaleLow')}`
      : resolveLocalizedText(currentQuestion.minLabel, locale) || String(dialMin);
  const dialMaxLabel =
    currentQuestion.type === 'rating10'
      ? `10 · ${t('player.scaleHigh')}`
      : resolveLocalizedText(currentQuestion.maxLabel, locale) || String(dialMax);

  const selectedBodyZones = normalizeBodyAnswer(currentValue).filter(isBodyZoneId);
  const bodyAllClear = isAllClearSelected(currentValue);

  const selectedChoices = Array.isArray(currentValue) ? currentValue : [];
  const maxSelections = currentQuestion.maxSelections;
  const limitReached =
    Boolean(currentQuestion.multiSelect) &&
    typeof maxSelections === 'number' &&
    maxSelections > 0 &&
    selectedChoices.length >= maxSelections;

  const textVal = typeof currentValue === 'string' ? currentValue : '';

  return (
    <div className="player-shell">
      {previewBanner}
      <div className="player-container">
        {/* Stories Segmented Top Bar */}
        <header className="stories-header">
          <div
            className="stories-segments"
            style={{ gridTemplateColumns: `repeat(${survey.questions.length}, 1fr)` }}
            aria-hidden="true"
          >
            {survey.questions.map((q, idx) => (
              <div
                key={q.id}
                className={`story-seg${idx < questionIndex ? ' done' : idx === questionIndex ? ' current' : ''}`}
              />
            ))}
          </div>

          <div className="stories-nav-row">
            <button
              type="button"
              className="story-back-btn"
              onClick={() => {
                setStepError(null);
                if (questionIndex === 0) setPhase('welcome');
                else setQuestionIndex((i) => i - 1);
              }}
              aria-label={t('player.previous')}
            >
              ←
            </button>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t('player.progress', {
                current: questionIndex + 1,
                total: survey.questions.length,
              })}
            </span>
            {!currentQuestion.required ? (
              <span className="badge">{t('player.optionalBadge')}</span>
            ) : (
              <span style={{ width: 44 }} />
            )}
          </div>
        </header>

        {/* Full-Screen Centered Story Card */}
        <div className="story-card">
          <div className="story-card-body">
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

            {(currentQuestion.type === 'rating10' || currentQuestion.type === 'slider') && (
              <SemicircularDial
                min={dialMin}
                max={dialMax}
                value={typeof currentValue === 'number' ? currentValue : undefined}
                polarity={currentQuestion.polarity || 'positive'}
                minLabel={dialMinLabel}
                maxLabel={dialMaxLabel}
                hintText={t('player.sliderTouchHint')}
                translateLevel={(k) => t(k)}
                onChange={(val) => setAnswer(currentQuestion.id, val)}
              />
            )}

            {currentQuestion.type === 'bodymap' && (
              <div className="bodymap-wrap">
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  {t('body.tapZoneHint')}
                </p>

                <BodyMapSvg
                  mode="select"
                  selectedZones={selectedBodyZones}
                  frontLabel={t('body.front')}
                  backLabel={t('body.backView')}
                  sideRightLabel={t('body.sideRight')}
                  sideLeftLabel={t('body.sideLeft')}
                  getZoneLabel={(zoneId: BodyZoneId) => t(`body.${zoneId}` as TranslationKey)}
                  onToggleZone={(zoneId) =>
                    setAnswer(currentQuestion.id, toggleBodyZoneSelection(currentValue, zoneId))
                  }
                />

                {selectedBodyZones.length > 0 && (
                  <div className="chip-strip">
                    {selectedBodyZones.map((zoneId) => (
                      <button
                        key={zoneId}
                        type="button"
                        className="chip coral active"
                        onClick={() =>
                          setAnswer(
                            currentQuestion.id,
                            toggleBodyZoneSelection(currentValue, zoneId as BodyZoneId)
                          )
                        }
                      >
                        <span>{t(`body.${zoneId}` as TranslationKey)}</span>
                        <span>✕</span>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className={`all-clear-btn${bodyAllClear ? ' active' : ''}`}
                  onClick={() => setAnswer(currentQuestion.id, selectBodyAllClear())}
                  aria-pressed={bodyAllClear}
                >
                  <span>{bodyAllClear ? '✓' : '○'}</span>
                  <span>{t('body.allClear')}</span>
                </button>
              </div>
            )}

            {currentQuestion.type === 'choice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {currentQuestion.multiSelect && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                    {typeof maxSelections === 'number' && maxSelections > 0
                      ? t('player.maxSelectionsHint', { max: maxSelections })
                      : t('player.multiChoiceHint')}
                  </div>
                )}
                <div className="choice-list" role="group">
                  {(currentQuestion.options || []).map((opt) => {
                    const selected = currentQuestion.multiSelect
                      ? selectedChoices.includes(opt.id)
                      : currentValue === opt.id;
                    const disabled = Boolean(currentQuestion.multiSelect && limitReached && !selected);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`choice-btn${selected ? ' selected' : ''}`}
                        disabled={disabled}
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

            {currentQuestion.type === 'text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Array.isArray(currentQuestion.quickChips) && currentQuestion.quickChips.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      {t('player.quickChipsHint')}
                    </span>
                    <div className="chip-strip">
                      {currentQuestion.quickChips.map((chip) => {
                        const active = isQuickChipActiveInText(textVal, chip);
                        return (
                          <button
                            key={chip}
                            type="button"
                            className={`chip${active ? ' active' : ''}`}
                            onClick={() =>
                              setAnswer(currentQuestion.id, toggleQuickChipInText(textVal, chip))
                            }
                            aria-pressed={active}
                          >
                            {active ? `✓ ${chip}` : `+ ${chip}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {currentQuestion.multiline ? (
                  <textarea
                    className="textarea"
                    style={{ minHeight: 130, fontSize: 16 }}
                    value={textVal}
                    onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                    placeholder={t('player.textPlaceholder')}
                  />
                ) : (
                  <input
                    className="input"
                    style={{ minHeight: 54, fontSize: 16 }}
                    value={textVal}
                    onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                    placeholder={t('player.textPlaceholder')}
                  />
                )}
              </div>
            )}

            {stepError && <p className="field-error">{stepError}</p>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isLast && (
              <div className="privacy-subtle" role="note">
                🔒 {t('player.privacyNotice')}
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary story-cta-btn"
              disabled={!canContinue || submitting}
              onClick={handleContinueOrSubmit}
            >
              {submitting
                ? t('player.submitting')
                : isLast
                  ? t('player.submit')
                  : t('player.continue')}
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
          <div className="story-card" style={{ justifyContent: 'center', textAlign: 'center', alignItems: 'center' }}>
            <h1 className="player-question-title">{t('player.notFoundTitle')}</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{t('player.notFoundBody')}</p>
          </div>
        </div>
      </div>
    );
  }

  return <PlayerSurveyRunner survey={survey} />;
}
