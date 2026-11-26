import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShareSurveyModal } from '../components/ShareSurveyModal.tsx';
import { createTranslator, type TranslationKey } from '../i18n/index.ts';
import { parseQuickChipsInput } from '../lib/dial.ts';
import { sortPlayersAlphabetically } from '../lib/roster.ts';
import {
  createEmptyChoiceOption,
  createEmptyQuestion,
  createYesNoOptions,
  generateId,
} from '../lib/templates.ts';
import { validateSurveyDraft } from '../lib/validation.ts';
import {
  createSurvey,
  getSurveyById,
  getTeamsOnce,
  updateSurvey,
} from '../services/surveysRepo.ts';
import { useAppStore } from '../store/useAppStore.ts';
import type {
  ChoiceOption,
  Polarity,
  Question,
  QuestionType,
  Survey,
  SurveyStatus,
  Team,
} from '../types/survey.ts';
import { PlayerSurveyRunner } from './PlayerSurveyView.tsx';

function timestampToDatetimeLocal(ts: number | null | undefined): string {
  if (!ts || !Number.isFinite(ts)) return '';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToTimestamp(val: string): number | null {
  if (!val.trim()) return null;
  const parsed = new Date(val).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

const QUESTION_TYPE_TILES: { type: QuestionType; icon: string; key: TranslationKey }[] = [
  { type: 'emoji5', icon: '😄', key: 'editor.typeEmoji5' },
  { type: 'rating10', icon: '🎯', key: 'editor.typeRating10' },
  { type: 'slider', icon: '🎚️', key: 'editor.typeSlider' },
  { type: 'choice', icon: '☑️', key: 'editor.typeChoice' },
  { type: 'bodymap', icon: '🧍', key: 'editor.typeBodymap' },
  { type: 'text', icon: '✍️', key: 'editor.typeText' },
];

export function SurveyEditorView() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();

  const locale = useAppStore((s) => s.locale);
  const showToast = useAppStore((s) => s.showToast);
  const t = createTranslator(locale);

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamTag, setTeamTag] = useState('');
  const [closesAtInput, setClosesAtInput] = useState('');
  const [status, setStatus] = useState<SurveyStatus>('draft');
  const [allowMultipleFromSameDevice, setAllowMultipleFromSameDevice] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(() => [createEmptyQuestion('emoji5')]);

  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [openTranslations, setOpenTranslations] = useState<Record<string, boolean>>({});
  const [chipsDrafts, setChipsDrafts] = useState<Record<string, string>>({});
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [sharedSurvey, setSharedSurvey] = useState<Survey | null>(null);
  const [previewSurvey, setPreviewSurvey] = useState<Survey | null>(null);

  const skipFetchIdRef = useRef<string | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    getTeamsOnce().then((list) => {
      if (mounted) setTeams(list);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isNew) return;
    if (skipFetchIdRef.current === id) {
      skipFetchIdRef.current = null;
      return;
    }
    let mounted = true;
    getSurveyById(id).then((found) => {
      if (!mounted) return;
      if (!found) {
        navigate('/coach', { replace: true });
        return;
      }
      setTitle(found.title);
      setDescription(found.description);
      setSelectedTeamId(found.teamId || '');
      setTeamTag(found.teamTag);
      setClosesAtInput(timestampToDatetimeLocal(found.closesAt));
      setStatus(found.status);
      setAllowMultipleFromSameDevice(found.allowMultipleFromSameDevice);
      const loadedQuestions =
        found.questions.length > 0 ? found.questions : [createEmptyQuestion('emoji5')];
      setQuestions(loadedQuestions);
      const initialChips: Record<string, string> = {};
      for (const q of loadedQuestions) {
        if (q.quickChips?.length) initialChips[q.id] = q.quickChips.join(', ');
      }
      setChipsDrafts(initialChips);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [id, isNew, navigate]);

  function scrollToSlide(index: number) {
    const track = carouselRef.current;
    const bounded = Math.max(0, Math.min(questions.length - 1, index));
    setActiveSlide(bounded);
    if (!track) return;
    const card = track.children[bounded] as HTMLElement | undefined;
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }
  }

  function handleCarouselScroll() {
    const track = carouselRef.current;
    if (!track || track.children.length === 0) return;
    const firstCard = track.children[0] as HTMLElement;
    const stepWidth = firstCard.offsetWidth + 16;
    if (stepWidth <= 0) return;
    const idx = Math.round(track.scrollLeft / stepWidth);
    if (idx >= 0 && idx < questions.length && idx !== activeSlide) {
      setActiveSlide(idx);
    }
  }

  function handleSelectTeam(nextTeamId: string) {
    setSelectedTeamId(nextTeamId);
    const chosen = teams.find((tm) => tm.id === nextTeamId);
    if (chosen) {
      setTeamTag(chosen.name);
    }
  }

  function updateQuestion(qId: string, patch: Partial<Question>) {
    setQuestions((prev) => prev.map((q) => (q.id === qId ? { ...q, ...patch } : q)));
    if (errorKey) setErrorKey(null);
    if (runtimeError) setRuntimeError(null);
  }

  function updateChoiceOptionMain(q: Question, optId: string, val: string) {
    const translationsOpen = Boolean(openTranslations[q.id]);
    const nextOpts: ChoiceOption[] = (q.options || []).map((opt) => {
      if (opt.id !== optId) return opt;
      if (translationsOpen) {
        return { ...opt, label: { ...opt.label, et: val } };
      }
      return {
        ...opt,
        label: {
          et: val,
          [locale]: val,
        },
      };
    });
    updateQuestion(q.id, { options: nextOpts });
  }

  function updateChoiceOption(
    q: Question,
    optId: string,
    lang: 'et' | 'en' | 'ru' | 'es',
    val: string
  ) {
    const nextOpts: ChoiceOption[] = (q.options || []).map((opt) =>
      opt.id === optId ? { ...opt, label: { ...opt.label, [lang]: val } } : opt
    );
    updateQuestion(q.id, { options: nextOpts });
  }

  function addChoiceOption(q: Question) {
    const nextOpts = [...(q.options || []), createEmptyChoiceOption()];
    updateQuestion(q.id, { options: nextOpts });
  }

  function removeChoiceOption(q: Question, optId: string) {
    const current = q.options || [];
    if (current.length <= 2) return;
    updateQuestion(q.id, { options: current.filter((o) => o.id !== optId) });
  }

  function addQuestionFromSheet(type: QuestionType) {
    const q = createEmptyQuestion(type);
    const nextIndex = questions.length;
    setQuestions((prev) => [...prev, q]);
    setShowAddSheet(false);
    if (errorKey) setErrorKey(null);
    setTimeout(() => scrollToSlide(nextIndex), 40);
  }

  function duplicateQuestion(q: Question) {
    const copy: Question = {
      ...q,
      id: generateId('q'),
      text: { ...q.text },
    };
    if (q.minLabel) copy.minLabel = { ...q.minLabel };
    if (q.maxLabel) copy.maxLabel = { ...q.maxLabel };
    if (q.quickChips) copy.quickChips = [...q.quickChips];
    if (q.options) {
      copy.options = q.options.map((o) => ({ id: generateId('opt'), label: { ...o.label } }));
    }
    const idx = questions.findIndex((item) => item.id === q.id);
    const next = [...questions];
    next.splice(idx + 1, 0, copy);
    setQuestions(next);
    setTimeout(() => scrollToSlide(idx + 1), 40);
  }

  function removeQuestion(qId: string) {
    if (questions.length <= 1) {
      setQuestions([createEmptyQuestion(questions[0].type)]);
      setActiveSlide(0);
      return;
    }
    const idx = questions.findIndex((q) => q.id === qId);
    const next = questions.filter((q) => q.id !== qId);
    setQuestions(next);
    setTimeout(() => scrollToSlide(Math.max(0, idx - 1)), 20);
    if (errorKey) setErrorKey(null);
  }

  function moveQuestion(qId: string, dir: 'left' | 'right') {
    const idx = questions.findIndex((q) => q.id === qId);
    const target = dir === 'left' ? idx - 1 : idx + 1;
    if (idx === -1 || target < 0 || target >= questions.length) return;
    const next = [...questions];
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    setQuestions(next);
    setTimeout(() => scrollToSlide(target), 20);
  }

  function toggleTranslations(qId: string) {
    setOpenTranslations((prev) => ({ ...prev, [qId]: !prev[qId] }));
  }

  function buildSurveyPayload(targetStatus: SurveyStatus, finalQuestions: Question[]): Omit<Survey, 'id'> {
    const now = Date.now();
    const linkedTeam = teams.find((tm) => tm.id === selectedTeamId);
    const closesAt = datetimeLocalToTimestamp(closesAtInput);

    return {
      title: title.trim() || t('editor.newTitle'),
      description: description.trim(),
      teamTag: linkedTeam ? linkedTeam.name : teamTag.trim(),
      teamId: linkedTeam ? linkedTeam.id : '',
      teamRosterSnapshot: linkedTeam ? sortPlayersAlphabetically(linkedTeam.players, locale) : [],
      closesAt,
      status: targetStatus,
      isTemplate: false,
      allowMultipleFromSameDevice,
      questions: finalQuestions,
      responseCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  function handleOpenPreview() {
    setErrorKey(null);
    const check = validateSurveyDraft({
      title: title.trim() || t('editor.newTitle'),
      questions,
    });
    if (!check.valid) {
      setErrorKey(check.errorKey);
      return;
    }
    const draftPayload = buildSurveyPayload('active', check.cleanedQuestions);
    setPreviewSurvey({ ...draftPayload, id: 'preview' });
  }

  async function handleSave(targetStatus: SurveyStatus, openShare = false) {
    setErrorKey(null);
    setRuntimeError(null);

    const check = validateSurveyDraft({ title, questions });
    if (!check.valid) {
      setErrorKey(check.errorKey);
      return;
    }

    const finalQuestions = check.cleanedQuestions;
    setQuestions(finalQuestions);

    setSaving(true);
    try {
      const payload = buildSurveyPayload(targetStatus, finalQuestions);

      let savedId = id || '';
      if (isNew) {
        savedId = await createSurvey(payload);
        skipFetchIdRef.current = savedId;
        navigate(`/coach/edit/${savedId}`, { replace: true });
      } else {
        const { responseCount: _rc, createdAt: _ca, ...patch } = payload;
        await updateSurvey(savedId, patch);
      }

      setStatus(targetStatus);
      showToast(targetStatus === 'active' ? t('editor.publishedToast') : t('editor.savedToast'));
      if (openShare) {
        setSharedSurvey({ ...payload, id: savedId });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setRuntimeError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="empty-state"><p>{t('common.loading')}</p></div>;
  }

  if (previewSurvey) {
    return (
      <div className="preview-overlay">
        <PlayerSurveyRunner
          survey={previewSurvey}
          previewMode
          onExitPreview={() => setPreviewSurvey(null)}
        />
      </div>
    );
  }

  return (
    <section className="editor-wrap">
      {/* Clean Header Actions */}
      <div className="row-top">
        <span className={`badge badge-${status}`}>{t(`status.${status}`)}</span>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-ghost btn-compact"
            onClick={handleOpenPreview}
          >
            {t('editor.preview')}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            disabled={saving}
            onClick={() => handleSave(status === 'active' ? 'active' : 'draft', false)}
          >
            {status === 'active' ? t('editor.saveChanges') : t('editor.saveDraft')}
          </button>
        </div>
      </div>

      {(errorKey || runtimeError) && (
        <div className="notice-banner" style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)', marginBottom: 0 }}>
          {errorKey ? t(errorKey as TranslationKey) : runtimeError}
        </div>
      )}

      {/* Clean Setup Card: Only Title + Assigned Team visible; secondary options inside closed Accordion */}
      <div className="surface-card">
        <div className="editor-core-grid">
          <div className="field">
            <label htmlFor="srv-title" className="field-label">{t('editor.titleLabel')}</label>
            <input
              id="srv-title"
              className="input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errorKey) setErrorKey(null);
              }}
              placeholder={t('editor.titlePlaceholder')}
            />
          </div>

          <div className="field">
            <label htmlFor="srv-team-select" className="field-label">{t('editor.teamSelectLabel')}</label>
            <select
              id="srv-team-select"
              className="select"
              value={selectedTeamId}
              onChange={(e) => handleSelectTeam(e.target.value)}
            >
              <option value="">{t('editor.noTeamOption')}</option>
              {teams.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.name} ({tm.players.length})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          className="accordion-trigger"
          onClick={() => setMoreOptionsOpen((o) => !o)}
          aria-expanded={moreOptionsOpen}
        >
          <span>{t('editor.moreOptions')}</span>
          <span>{moreOptionsOpen ? '▾' : '▸'}</span>
        </button>

        {moreOptionsOpen && (
          <div className="accordion-body">
            <div className="field">
              <label htmlFor="srv-desc" className="field-label">{t('editor.descriptionLabel')}</label>
              <input
                id="srv-desc"
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('editor.descriptionPlaceholder')}
              />
            </div>

            {!selectedTeamId && (
              <div className="field">
                <label htmlFor="srv-team-tag" className="field-label">{t('editor.teamTagLabel')}</label>
                <input
                  id="srv-team-tag"
                  className="input"
                  value={teamTag}
                  onChange={(e) => setTeamTag(e.target.value)}
                  placeholder={t('editor.teamTagPlaceholder')}
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="srv-closes-at" className="field-label">{t('editor.closesAtLabel')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  id="srv-closes-at"
                  type="datetime-local"
                  className="input"
                  value={closesAtInput}
                  onChange={(e) => setClosesAtInput(e.target.value)}
                />
                {closesAtInput && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact"
                    onClick={() => setClosesAtInput('')}
                    title={t('editor.closesAtClear')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <label className="toggle-row" style={{ gridColumn: '1 / -1', paddingBottom: 0 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t('editor.allowMultipleDevices')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {t('editor.allowMultipleHint')}
                </div>
              </div>
              <input
                type="checkbox"
                className="toggle-input"
                checked={allowMultipleFromSameDevice}
                onChange={(e) => setAllowMultipleFromSameDevice(e.target.checked)}
              />
            </label>
          </div>
        )}
      </div>

      {/* Horizontal Question Carousel Header */}
      <div className="carousel-header">
        <span className="section-label">
          {t('editor.questionsTitle', { count: questions.length })} · {activeSlide + 1}/{questions.length}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            disabled={activeSlide <= 0}
            onClick={() => scrollToSlide(activeSlide - 1)}
          >
            ←
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            disabled={activeSlide >= questions.length - 1}
            onClick={() => scrollToSlide(activeSlide + 1)}
          >
            →
          </button>
        </div>
      </div>

      {/* Horizontal Swipeable Carousel Track */}
      <div
        ref={carouselRef}
        className="carousel-track"
        onScroll={handleCarouselScroll}
      >
        {questions.map((q, idx) => {
          const translationsOpen = Boolean(openTranslations[q.id]);
          const isNumeric = q.type === 'rating10' || q.type === 'slider' || q.type === 'emoji5';
          const chipInput = chipsDrafts[q.id] ?? (q.quickChips ? q.quickChips.join(', ') : '');

          return (
            <article
              key={q.id}
              className={`carousel-card${idx === activeSlide ? ' active-card' : ''}`}
            >
              <div className="row-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-accent">
                    {t('editor.questionNumber', { index: idx + 1 })}
                  </span>
                  <span className="badge">
                    {t(`editor.type${capitalizeType(q.type)}` as TranslationKey)}
                  </span>
                </div>

                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact"
                    disabled={idx === 0}
                    onClick={() => moveQuestion(q.id, 'left')}
                    title={t('editor.moveLeft')}
                    aria-label={t('editor.moveLeft')}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact"
                    disabled={idx === questions.length - 1}
                    onClick={() => moveQuestion(q.id, 'right')}
                    title={t('editor.moveRight')}
                    aria-label={t('editor.moveRight')}
                  >
                    →
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact"
                    onClick={() => duplicateQuestion(q)}
                  >
                    {t('editor.duplicateQ')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => removeQuestion(q.id)}
                  >
                    {t('editor.removeQ')}
                  </button>
                </div>
              </div>

              <input
                className="input inline-question-input"
                value={q.text.et}
                onChange={(e) =>
                  updateQuestion(q.id, { text: { ...q.text, et: e.target.value } })
                }
                placeholder={t('editor.questionTextPlaceholder')}
              />

              {q.type === 'bodymap' && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    fontSize: 12.5,
                    color: 'var(--text-secondary)',
                  }}
                >
                  🧍 {t('editor.bodymapInfo')}
                </div>
              )}

              {q.type === 'choice' && (
                <div className="choice-editor-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-compact"
                        onClick={() => updateQuestion(q.id, { options: createYesNoOptions() })}
                      >
                        {t('editor.choicePresetYesNo')}
                      </button>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                        <input
                          type="checkbox"
                          className="toggle-input"
                          checked={Boolean(q.multiSelect)}
                          onChange={(e) =>
                            updateQuestion(q.id, {
                              multiSelect: e.target.checked,
                              maxSelections: e.target.checked ? q.maxSelections : undefined,
                            })
                          }
                        />
                        <span>{t('editor.choiceMultiSelect')}</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-compact"
                      onClick={() => addChoiceOption(q)}
                    >
                      + {t('editor.choiceAddOption')}
                    </button>
                  </div>

                  {q.multiSelect && (
                    <div className="field" style={{ maxWidth: 220 }}>
                      <label className="field-label">{t('editor.choiceMaxSelectionsLabel')}</label>
                      <select
                        className="select"
                        style={{ minHeight: 38 }}
                        value={q.maxSelections ? String(q.maxSelections) : ''}
                        onChange={(e) =>
                          updateQuestion(q.id, {
                            maxSelections: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      >
                        <option value="">{t('editor.choiceMaxUnlimited')}</option>
                        {[2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(q.options || []).map((opt, optIdx) => {
                      const displayVal = translationsOpen
                        ? opt.label.et
                        : (opt.label[locale] ?? opt.label.et ?? '');
                      return (
                        <div key={opt.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            className="input"
                            style={{ minHeight: 38 }}
                            value={displayVal}
                            onChange={(e) => updateChoiceOptionMain(q, opt.id, e.target.value)}
                            placeholder={t('editor.choiceOptionPlaceholder', { index: optIdx + 1 })}
                          />
                          {(q.options?.length || 0) > 2 && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-compact"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => removeChoiceOption(q, opt.id)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {q.type === 'slider' && (
                <div className="slider-config-grid">
                  <div className="field">
                    <label className="field-label">{t('editor.sliderMin')}</label>
                    <input
                      type="number"
                      className="input"
                      value={q.min ?? 0}
                      onChange={(e) => updateQuestion(q.id, { min: Number(e.target.value) })}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">{t('editor.sliderMax')}</label>
                    <input
                      type="number"
                      className="input"
                      value={q.max ?? 10}
                      onChange={(e) => updateQuestion(q.id, { max: Number(e.target.value) })}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">{t('editor.sliderMinLabel')}</label>
                    <input
                      className="input"
                      value={q.minLabel?.et || ''}
                      onChange={(e) =>
                        updateQuestion(q.id, {
                          minLabel: { ...(q.minLabel || { et: '' }), et: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">{t('editor.sliderMaxLabel')}</label>
                    <input
                      className="input"
                      value={q.maxLabel?.et || ''}
                      onChange={(e) =>
                        updateQuestion(q.id, {
                          maxLabel: { ...(q.maxLabel || { et: '' }), et: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {q.type === 'text' && (
                <div className="field">
                  <label className="field-label">{t('editor.quickChipsLabel')}</label>
                  <input
                    className="input"
                    style={{ minHeight: 40 }}
                    value={chipInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setChipsDrafts((prev) => ({ ...prev, [q.id]: raw }));
                      updateQuestion(q.id, { quickChips: parseQuickChipsInput(raw) });
                    }}
                    placeholder={t('editor.quickChipsPlaceholder')}
                  />
                </div>
              )}

              {isNumeric && (
                <div className="field">
                  <span className="field-label">{t('editor.polarityLabel')}</span>
                  <div className="chip-strip">
                    {(
                      [
                        { id: 'positive', key: 'editor.polarityPositive' },
                        { id: 'inverse', key: 'editor.polarityInverse' },
                        { id: 'neutral', key: 'editor.polarityNeutral' },
                      ] as { id: Polarity; key: TranslationKey }[]
                    ).map((pol) => {
                      const active = (q.polarity || 'positive') === pol.id;
                      return (
                        <button
                          key={pol.id}
                          type="button"
                          className={`chip${active ? ' active' : ''}`}
                          onClick={() => updateQuestion(q.id, { polarity: pol.id })}
                        >
                          {t(pol.key)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="row-top" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      className="toggle-input"
                      checked={q.required}
                      onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                    />
                    <span>{t('editor.required')}</span>
                  </label>

                  {isNumeric && (
                    <button
                      type="button"
                      className={`chip${q.highlightInSummary ? ' active' : ''}`}
                      onClick={() =>
                        updateQuestion(q.id, { highlightInSummary: !q.highlightInSummary })
                      }
                    >
                      <span>{q.highlightInSummary ? '★' : '☆'}</span>
                      <span>{t('editor.highlightInSummary')}</span>
                    </button>
                  )}

                  {q.type === 'text' && (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        className="toggle-input"
                        checked={Boolean(q.multiline)}
                        onChange={(e) => updateQuestion(q.id, { multiline: e.target.checked })}
                      />
                      <span>{t('editor.multiline')}</span>
                    </label>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-compact"
                  onClick={() => toggleTranslations(q.id)}
                >
                  {translationsOpen ? '▾' : '▸'} {t('editor.translationsToggle')}
                </button>
              </div>

              {translationsOpen && (
                <div className="translations-drawer">
                  <div className="field">
                    <label className="field-label">{t('editor.questionTextEn')}</label>
                    <input
                      className="input"
                      value={q.text.en || ''}
                      onChange={(e) =>
                        updateQuestion(q.id, { text: { ...q.text, en: e.target.value } })
                      }
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">{t('editor.questionTextRu')}</label>
                    <input
                      className="input"
                      value={q.text.ru || ''}
                      onChange={(e) =>
                        updateQuestion(q.id, { text: { ...q.text, ru: e.target.value } })
                      }
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">{t('editor.questionTextEs')}</label>
                    <input
                      className="input"
                      value={q.text.es || ''}
                      onChange={(e) =>
                        updateQuestion(q.id, { text: { ...q.text, es: e.target.value } })
                      }
                    />
                  </div>

                  {q.type === 'choice' &&
                    (q.options || []).map((opt, optIdx) => (
                      <div
                        key={opt.id}
                        style={{
                          gridColumn: '1 / -1',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 8,
                          paddingTop: 6,
                          borderTop: '1px solid var(--border)',
                        }}
                      >
                        <input
                          className="input"
                          style={{ minHeight: 34, fontSize: 12.5 }}
                          value={opt.label.en || ''}
                          onChange={(e) => updateChoiceOption(q, opt.id, 'en', e.target.value)}
                          placeholder={`EN · ${t('editor.choiceOptionPlaceholder', { index: optIdx + 1 })}`}
                        />
                        <input
                          className="input"
                          style={{ minHeight: 34, fontSize: 12.5 }}
                          value={opt.label.ru || ''}
                          onChange={(e) => updateChoiceOption(q, opt.id, 'ru', e.target.value)}
                          placeholder={`RU · ${t('editor.choiceOptionPlaceholder', { index: optIdx + 1 })}`}
                        />
                        <input
                          className="input"
                          style={{ minHeight: 34, fontSize: 12.5 }}
                          value={opt.label.es || ''}
                          onChange={(e) => updateChoiceOption(q, opt.id, 'es', e.target.value)}
                          placeholder={`ES · ${t('editor.choiceOptionPlaceholder', { index: optIdx + 1 })}`}
                        />
                      </div>
                    ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Carousel Dots */}
      <div className="carousel-dots" role="tablist" aria-label={t('editor.questionsTitle', { count: questions.length })}>
        {questions.map((q, idx) => (
          <button
            key={q.id}
            type="button"
            className={`carousel-dot${idx === activeSlide ? ' active' : ''}`}
            onClick={() => scrollToSlide(idx)}
            aria-label={t('editor.questionNumber', { index: idx + 1 })}
          />
        ))}
      </div>

      {/* Floating + Action Button */}
      <button
        type="button"
        className="editor-fab"
        onClick={() => setShowAddSheet(true)}
        aria-label={t('editor.addQuestionSheetTitle')}
        title={t('editor.addQuestionSheetTitle')}
      >
        +
      </button>

      {/* Fixed Bottom Activate & Share Bar */}
      <div className="editor-sticky-footer">
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={() => handleSave('active', true)}
        >
          {t('editor.publish')}
        </button>
      </div>

      {/* Bottom Sheet for Adding New Question Type */}
      {showAddSheet && (
        <div
          className="bottom-sheet-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowAddSheet(false)}
        >
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{t('editor.addQuestionSheetTitle')}</h2>
              <button
                type="button"
                className="btn btn-ghost btn-compact"
                onClick={() => setShowAddSheet(false)}
                aria-label={t('common.close')}
              >
                ✕
              </button>
            </div>

            <div className="type-grid">
              {QUESTION_TYPE_TILES.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  className="type-tile"
                  onClick={() => addQuestionFromSheet(item.type)}
                >
                  <span className="type-tile-icon" aria-hidden="true">{item.icon}</span>
                  <span>{t(item.key)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {sharedSurvey && (
        <ShareSurveyModal survey={sharedSurvey} onClose={() => setSharedSurvey(null)} />
      )}
    </section>
  );
}

function capitalizeType(type: QuestionType): string {
  if (type === 'text') return 'Text';
  if (type === 'slider') return 'Slider';
  if (type === 'rating10') return 'Rating10';
  if (type === 'choice') return 'Choice';
  if (type === 'bodymap') return 'Bodymap';
  return 'Emoji5';
}
