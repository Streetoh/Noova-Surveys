import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShareSurveyModal } from '../components/ShareSurveyModal.tsx';
import { createTranslator, type TranslationKey } from '../i18n/index.ts';
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
  subscribeTeams,
  updateSurvey,
} from '../services/surveysRepo.ts';
import { useAppStore } from '../store/useAppStore.ts';
import type { ChoiceOption, Question, QuestionType, Survey, SurveyStatus, Team } from '../types/survey.ts';
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

  const [openTranslations, setOpenTranslations] = useState<Record<string, boolean>>({});
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [sharedSurvey, setSharedSurvey] = useState<Survey | null>(null);
  const [previewSurvey, setPreviewSurvey] = useState<Survey | null>(null);

  useEffect(() => {
    const unsub = subscribeTeams((list) => setTeams(list));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isNew) return;
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
      setQuestions(found.questions.length > 0 ? found.questions : [createEmptyQuestion('emoji5')]);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [id, isNew, navigate]);

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

  function changeQuestionType(q: Question, nextType: QuestionType) {
    const updated: Question = {
      id: q.id,
      type: nextType,
      text: { ...q.text },
      required: q.required,
    };
    if (nextType === 'text') {
      updated.multiline = Boolean(q.multiline);
    } else if (nextType === 'slider') {
      updated.min = q.min ?? 0;
      updated.max = q.max ?? 10;
      updated.minLabel = q.minLabel ? { ...q.minLabel } : { et: '', en: '', ru: '', es: '' };
      updated.maxLabel = q.maxLabel ? { ...q.maxLabel } : { et: '', en: '', ru: '', es: '' };
    } else if (nextType === 'choice') {
      updated.multiSelect = Boolean(q.multiSelect);
      updated.options = q.options && q.options.length >= 2 ? q.options : createYesNoOptions();
    }
    setQuestions((prev) => prev.map((item) => (item.id === q.id ? updated : item)));
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

  function addQuestion(type: QuestionType) {
    const q = createEmptyQuestion(type);
    setQuestions((prev) => [...prev, q]);
    setLastAddedId(q.id);
    if (errorKey) setErrorKey(null);
  }

  function duplicateQuestion(q: Question) {
    const copy: Question = {
      ...q,
      id: generateId('q'),
      text: { ...q.text },
    };
    if (q.minLabel) copy.minLabel = { ...q.minLabel };
    if (q.maxLabel) copy.maxLabel = { ...q.maxLabel };
    if (q.options) {
      copy.options = q.options.map((o) => ({ id: generateId('opt'), label: { ...o.label } }));
    }
    const idx = questions.findIndex((item) => item.id === q.id);
    const next = [...questions];
    next.splice(idx + 1, 0, copy);
    setQuestions(next);
    setLastAddedId(copy.id);
  }

  function removeQuestion(qId: string) {
    if (questions.length <= 1) {
      setQuestions([createEmptyQuestion(questions[0].type)]);
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== qId));
    if (errorKey) setErrorKey(null);
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

  function toggleTranslations(qId: string) {
    setOpenTranslations((prev) => ({ ...prev, [qId]: !prev[qId] }));
  }

  function buildSurveyPayload(targetStatus: SurveyStatus, finalQuestions: Question[]): Omit<Survey, 'id'> {
    const now = Date.now();
    const linkedTeam = teams.find((tm) => tm.id === selectedTeamId);
    const closesAt = datetimeLocalToTimestamp(closesAtInput);

    const payload: Omit<Survey, 'id'> = {
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
    return payload;
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
    <section className="editor-single-wrap">
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost btn-compact" onClick={() => navigate('/coach')}>
            ← {t('editor.back')}
          </button>
          <h1 className="page-title">{isNew ? t('editor.newTitle') : t('editor.editTitle')}</h1>
          <span className={`badge badge-${status}`}>{t(`status.${status}`)}</span>
        </div>

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

      {/* Survey General Details */}
      <div className="surface-section" style={{ marginBottom: 20 }}>
        <div className="section-bar">
          <span className="section-label">{t('editor.detailsTitle')}</span>
        </div>
        <div className="editor-meta-grid">
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

          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="srv-desc" className="field-label">{t('editor.descriptionLabel')}</label>
            <input
              id="srv-desc"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('editor.descriptionPlaceholder')}
            />
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
      </div>

      {/* Direct Inline Questions List */}
      <div className="surface-section">
        <div className="section-bar">
          <span className="section-label">
            {t('editor.questionsTitle', { count: questions.length })}
          </span>
        </div>

        <div>
          {questions.map((q, idx) => {
            const translationsOpen = Boolean(openTranslations[q.id]);
            return (
              <article key={q.id} className="inline-question-block">
                <div className="inline-question-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span className="badge badge-accent">
                      {t('editor.questionNumber', { index: idx + 1 })}
                    </span>
                    <div className="chip-strip">
                      {(['emoji5', 'rating10', 'slider', 'choice', 'text'] as QuestionType[]).map(
                        (qType) => (
                          <button
                            key={qType}
                            type="button"
                            className={`chip${q.type === qType ? ' active' : ''}`}
                            onClick={() => changeQuestionType(q, qType)}
                          >
                            {t(`editor.type${capitalizeType(qType)}` as TranslationKey)}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-compact"
                      disabled={idx === 0}
                      onClick={() => moveQuestion(q.id, 'up')}
                      title={t('editor.moveUp')}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-compact"
                      disabled={idx === questions.length - 1}
                      onClick={() => moveQuestion(q.id, 'down')}
                      title={t('editor.moveDown')}
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
                      onClick={() => removeQuestion(q.id)}
                    >
                      {t('editor.removeQ')}
                    </button>
                  </div>
                </div>

                <input
                  className="input inline-question-input"
                  autoFocus={lastAddedId === q.id}
                  value={q.text.et}
                  onChange={(e) =>
                    updateQuestion(q.id, { text: { ...q.text, et: e.target.value } })
                  }
                  placeholder={t('editor.questionTextPlaceholder')}
                />

                {q.type === 'choice' && (
                  <div className="choice-editor-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-compact"
                        onClick={() => updateQuestion(q.id, { options: createYesNoOptions() })}
                      >
                        {t('editor.choicePresetYesNo')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-compact"
                        onClick={() => addChoiceOption(q)}
                      >
                        + {t('editor.choiceAddOption')}
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(q.options || []).map((opt, optIdx) => (
                        <div key={opt.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            className="input"
                            style={{ minHeight: 38 }}
                            value={opt.label.et}
                            onChange={(e) => updateChoiceOption(q, opt.id, 'et', e.target.value)}
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
                      ))}
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

                <div className="inline-question-footer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        className="toggle-input"
                        checked={q.required}
                        onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                      />
                      <span>{t('editor.required')}</span>
                    </label>

                    {q.type === 'text' && (
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
                        <input
                          type="checkbox"
                          className="toggle-input"
                          checked={Boolean(q.multiline)}
                          onChange={(e) => updateQuestion(q.id, { multiline: e.target.checked })}
                        />
                        <span>{t('editor.multiline')}</span>
                      </label>
                    )}

                    {q.type === 'choice' && (
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
                        <input
                          type="checkbox"
                          className="toggle-input"
                          checked={Boolean(q.multiSelect)}
                          onChange={(e) => updateQuestion(q.id, { multiSelect: e.target.checked })}
                        />
                        <span>{t('editor.choiceMultiSelect')}</span>
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

        {/* One-Click Quick Add Bar */}
        <div className="quick-add-bar">
          <span className="field-label">{t('editor.addBarLabel')}</span>
          <div className="chip-strip">
            <button type="button" className="btn btn-secondary btn-compact" onClick={() => addQuestion('emoji5')}>
              + {t('editor.typeEmoji5')}
            </button>
            <button type="button" className="btn btn-secondary btn-compact" onClick={() => addQuestion('rating10')}>
              + {t('editor.typeRating10')}
            </button>
            <button type="button" className="btn btn-secondary btn-compact" onClick={() => addQuestion('slider')}>
              + {t('editor.typeSlider')}
            </button>
            <button type="button" className="btn btn-secondary btn-compact" onClick={() => addQuestion('choice')}>
              + {t('editor.typeChoice')}
            </button>
            <button type="button" className="btn btn-secondary btn-compact" onClick={() => addQuestion('text')}>
              + {t('editor.typeText')}
            </button>
          </div>
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
  if (type === 'choice') return 'Choice';
  return 'Emoji5';
}
