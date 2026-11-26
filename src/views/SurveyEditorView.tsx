import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShareSurveyModal } from '../components/ShareSurveyModal.tsx';
import { createTranslator, type TranslationKey } from '../i18n/index.ts';
import { createEmptyQuestion, generateId } from '../lib/templates.ts';
import { resolveLocalizedText, validateSurveyDraft } from '../lib/validation.ts';
import { createSurvey, getSurveyById, updateSurvey } from '../services/surveysRepo.ts';
import { useAppStore } from '../store/useAppStore.ts';
import type { Question, QuestionType, Survey, SurveyStatus } from '../types/survey.ts';

export function SurveyEditorView() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();

  const locale = useAppStore((s) => s.locale);
  const showToast = useAppStore((s) => s.showToast);
  const t = createTranslator(locale);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [status, setStatus] = useState<SurveyStatus>('draft');
  const [allowIdentityChoice, setAllowIdentityChoice] = useState(true);
  const [allowMultipleFromSameDevice, setAllowMultipleFromSameDevice] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(() => [createEmptyQuestion('emoji5')]);
  const [activeQuestionId, setActiveQuestionId] = useState<string>('');
  const [showTranslations, setShowTranslations] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [sharedSurvey, setSharedSurvey] = useState<Survey | null>(null);

  useEffect(() => {
    if (isNew) {
      setActiveQuestionId((prev) => prev || questions[0]?.id || '');
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
      setTeamTag(found.teamTag);
      setStatus(found.status);
      setAllowIdentityChoice(found.allowIdentityChoice);
      setAllowMultipleFromSameDevice(found.allowMultipleFromSameDevice);
      setQuestions(found.questions.length > 0 ? found.questions : [createEmptyQuestion('emoji5')]);
      setActiveQuestionId(found.questions[0]?.id || '');
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [id, isNew, navigate]);

  const activeQuestion =
    questions.find((q) => q.id === activeQuestionId) || questions[0] || null;

  function updateActiveQuestion(patch: Partial<Question>) {
    if (!activeQuestion) return;
    setQuestions((prev) =>
      prev.map((q) => (q.id === activeQuestion.id ? { ...q, ...patch } : q))
    );
    if (errorKey) setErrorKey(null);
  }

  function addQuestion(type: QuestionType = 'rating10') {
    const q = createEmptyQuestion(type);
    setQuestions((prev) => [...prev, q]);
    setActiveQuestionId(q.id);
  }

  function duplicateQuestion(q: Question) {
    const copy: Question = {
      ...q,
      id: generateId('q'),
      text: { ...q.text },
      minLabel: q.minLabel ? { ...q.minLabel } : undefined,
      maxLabel: q.maxLabel ? { ...q.maxLabel } : undefined,
    };
    const idx = questions.findIndex((item) => item.id === q.id);
    const next = [...questions];
    next.splice(idx + 1, 0, copy);
    setQuestions(next);
    setActiveQuestionId(copy.id);
  }

  function removeQuestion(qId: string) {
    const next = questions.filter((q) => q.id !== qId);
    setQuestions(next);
    if (errorKey) setErrorKey(null);
    if (runtimeError) setRuntimeError(null);
    if (activeQuestionId === qId) {
      setActiveQuestionId(next[0]?.id || '');
    }
  }

  function moveQuestion(qId: string, dir: 'up' | 'down') {
    const idx = questions.findIndex((q) => q.id === qId);
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || target < 0 || target >= questions.length) return;
    const next = [...questions];
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    setQuestions(next);
  }

  async function handleSave(targetStatus: SurveyStatus, openShare = false) {
    setErrorKey(null);
    setRuntimeError(null);

    const check = validateSurveyDraft({ title, questions });
    if (!check.valid) {
      setErrorKey(check.errorKey);
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();
      const payload: Omit<Survey, 'id'> = {
        title: title.trim(),
        description: description.trim(),
        teamTag: teamTag.trim(),
        status: targetStatus,
        isTemplate: false,
        allowIdentityChoice,
        allowMultipleFromSameDevice,
        questions,
        responseCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      let savedId = id || '';
      if (isNew) {
        savedId = await createSurvey(payload);
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

  return (
    <section>
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" className="btn btn-ghost btn-compact" onClick={() => navigate('/coach')}>
            ← {t('editor.back')}
          </button>
          <h1 className="page-title">{isNew ? t('editor.newTitle') : t('editor.editTitle')}</h1>
          <span className={`badge badge-${status}`}>{t(`status.${status}`)}</span>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            disabled={saving}
            onClick={() => handleSave(status === 'active' ? 'active' : 'draft', false)}
          >
            {status === 'active' ? t('editor.saveChanges') : t('editor.saveDraft')}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-compact"
            disabled={saving}
            onClick={() => handleSave('active', true)}
          >
            {t('editor.publish')}
          </button>
        </div>
      </header>

      {(errorKey || runtimeError) && (
        <div className="notice-banner" style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)' }}>
          {errorKey ? t(errorKey as TranslationKey) : runtimeError}
        </div>
      )}

      <div className="workbench-split editor-split">
        {/* Left Column: Survey Settings & Question List */}
        <div className="workbench-primary">
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, borderBottom: '1px solid var(--border)' }}>
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
              <label htmlFor="srv-desc" className="field-label">{t('editor.descriptionLabel')}</label>
              <input
                id="srv-desc"
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('editor.descriptionPlaceholder')}
              />
            </div>

            <div className="field">
              <label htmlFor="srv-team" className="field-label">{t('editor.teamTagLabel')}</label>
              <input
                id="srv-team"
                className="input"
                value={teamTag}
                onChange={(e) => setTeamTag(e.target.value)}
                placeholder={t('editor.teamTagPlaceholder')}
              />
            </div>

            <div style={{ marginTop: 4 }}>
              <span className="section-label">{t('editor.privacyTitle')}</span>
              <label className="toggle-row">
                <span style={{ fontSize: 13 }}>{t('editor.allowIdentityChoice')}</span>
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={allowIdentityChoice}
                  onChange={(e) => setAllowIdentityChoice(e.target.checked)}
                />
              </label>
              <label className="toggle-row">
                <div>
                  <div style={{ fontSize: 13 }}>{t('editor.allowMultipleDevices')}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
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
          </div>

          <div className="section-bar">
            <span className="section-label">
              {t('editor.questionsTitle', { count: questions.length })}
            </span>
            <button
              type="button"
              className="btn btn-primary btn-compact"
              onClick={() => addQuestion('rating10')}
            >
              + {t('editor.addQuestion')}
            </button>
          </div>

          <div>
            {questions.map((q, idx) => {
              const isSelected = activeQuestion?.id === q.id;
              const preview = resolveLocalizedText(q.text, locale) || t('editor.questionTextPlaceholder');
              return (
                <div
                  key={q.id}
                  className={`hairline-row${isSelected ? ' active' : ''}`}
                  onClick={() => setActiveQuestionId(q.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="row-top">
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {idx + 1}. {preview}
                    </span>
                  </div>
                  <div className="row-meta">
                    <span className="badge">{t(`editor.type${capitalizeType(q.type)}` as TranslationKey)}</span>
                    <span>{q.required ? t('editor.required') : t('editor.optional')}</span>
                  </div>
                  <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-compact"
                      disabled={idx === 0}
                      onClick={() => moveQuestion(q.id, 'up')}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-compact"
                      disabled={idx === questions.length - 1}
                      onClick={() => moveQuestion(q.id, 'down')}
                    >
                      ↓
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
                      disabled={questions.length <= 1}
                      onClick={() => removeQuestion(q.id)}
                    >
                      {t('editor.removeQ')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Question Editor */}
        <div className="workbench-pane" style={{ background: 'var(--surface)' }}>
          {activeQuestion && (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field">
                <label className="field-label">{t('editor.questionType')}</label>
                <div className="chip-strip">
                  {(['emoji5', 'rating10', 'slider', 'text'] as QuestionType[]).map((qType) => (
                    <button
                      key={qType}
                      type="button"
                      className={`chip${activeQuestion.type === qType ? ' active' : ''}`}
                      onClick={() =>
                        updateActiveQuestion({
                          type: qType,
                          min: qType === 'slider' ? (activeQuestion.min ?? 1) : undefined,
                          max: qType === 'slider' ? (activeQuestion.max ?? 10) : undefined,
                        })
                      }
                    >
                      {t(`editor.type${capitalizeType(qType)}` as TranslationKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label htmlFor="q-text-et" className="field-label">{t('editor.questionTextEt')}</label>
                <textarea
                  id="q-text-et"
                  className="textarea"
                  value={activeQuestion.text.et}
                  onChange={(e) =>
                    updateActiveQuestion({ text: { ...activeQuestion.text, et: e.target.value } })
                  }
                  placeholder={t('editor.questionTextPlaceholder')}
                />
              </div>

              <div>
                <button
                  type="button"
                  className="btn btn-ghost btn-compact"
                  style={{ paddingLeft: 0 }}
                  onClick={() => setShowTranslations((v) => !v)}
                >
                  {showTranslations ? '▾' : '▸'} {t('editor.translationsToggle')}
                </button>

                {showTranslations && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
                    <div className="field">
                      <label htmlFor="q-text-en" className="field-label">{t('editor.questionTextEn')}</label>
                      <input
                        id="q-text-en"
                        className="input"
                        value={activeQuestion.text.en || ''}
                        onChange={(e) =>
                          updateActiveQuestion({
                            text: { ...activeQuestion.text, en: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="q-text-ru" className="field-label">{t('editor.questionTextRu')}</label>
                      <input
                        id="q-text-ru"
                        className="input"
                        value={activeQuestion.text.ru || ''}
                        onChange={(e) =>
                          updateActiveQuestion({
                            text: { ...activeQuestion.text, ru: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <label className="toggle-row">
                <span style={{ fontSize: 13 }}>{t('editor.required')}</span>
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={activeQuestion.required}
                  onChange={(e) => updateActiveQuestion({ required: e.target.checked })}
                />
              </label>

              {activeQuestion.type === 'text' && (
                <label className="toggle-row">
                  <span style={{ fontSize: 13 }}>{t('editor.multiline')}</span>
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={Boolean(activeQuestion.multiline)}
                    onChange={(e) => updateActiveQuestion({ multiline: e.target.checked })}
                  />
                </label>
              )}

              {activeQuestion.type === 'slider' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label htmlFor="sl-min" className="field-label">{t('editor.sliderMin')}</label>
                    <input
                      id="sl-min"
                      type="number"
                      className="input"
                      value={activeQuestion.min ?? 1}
                      onChange={(e) => updateActiveQuestion({ min: Number(e.target.value) })}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sl-max" className="field-label">{t('editor.sliderMax')}</label>
                    <input
                      id="sl-max"
                      type="number"
                      className="input"
                      value={activeQuestion.max ?? 10}
                      onChange={(e) => updateActiveQuestion({ max: Number(e.target.value) })}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sl-min-lbl" className="field-label">{t('editor.sliderMinLabel')}</label>
                    <input
                      id="sl-min-lbl"
                      className="input"
                      value={activeQuestion.minLabel?.et || ''}
                      onChange={(e) =>
                        updateActiveQuestion({
                          minLabel: { ...activeQuestion.minLabel, et: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sl-max-lbl" className="field-label">{t('editor.sliderMaxLabel')}</label>
                    <input
                      id="sl-max-lbl"
                      className="input"
                      value={activeQuestion.maxLabel?.et || ''}
                      onChange={(e) =>
                        updateActiveQuestion({
                          maxLabel: { ...activeQuestion.maxLabel, et: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
  return 'Emoji5';
}
