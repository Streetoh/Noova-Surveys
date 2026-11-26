import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal.tsx';
import { ShareSurveyModal } from '../components/ShareSurveyModal.tsx';
import { createTranslator } from '../i18n/index.ts';
import {
  computeQuestionStats,
  exportSurveyResultsToCsv,
  exportSurveyResultsToJson,
  formatAnswerForDisplay,
} from '../lib/analytics.ts';
import { computeRosterParticipation } from '../lib/roster.ts';
import { isSurveyEffectivelyClosed, isSurveyExpired, resolveLocalizedText } from '../lib/validation.ts';
import {
  deleteSurveyResponseById,
  subscribeSurveyById,
  subscribeSurveyResponses,
  subscribeTeams,
  updateSurvey,
} from '../services/surveysRepo.ts';
import { useAppStore } from '../store/useAppStore.ts';
import type { Survey, SurveyResponse, Team } from '../types/survey.ts';

const EMOJI_FACES: Record<number, string> = {
  1: '😣',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
};

function getBarSpectrumColor(value: number, min: number, max: number): string {
  const ratio = max > min ? (value - min) / (max - min) : 0.5;
  const clamped = Math.max(0, Math.min(1, ratio));
  const hue = clamped <= 0.5 ? clamped * 2 * 46 : 46 + (clamped - 0.5) * 2 * 96;
  return `hsl(${Math.round(hue)}, 80%, 52%)`;
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SurveyResultsView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const locale = useAppStore((s) => s.locale);
  const showToast = useAppStore((s) => s.showToast);
  const t = createTranslator(locale);

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'questions' | 'individual'>('questions');
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [deletingResponse, setDeletingResponse] = useState<SurveyResponse | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubSurvey = subscribeSurveyById(id, (s) => {
      setSurvey(s);
      setLoading(false);
    });
    const unsubResponses = subscribeSurveyResponses(id, (list) => {
      setResponses(list);
    });
    const unsubTeams = subscribeTeams((list) => {
      setTeams(list);
    });
    return () => {
      unsubSurvey();
      unsubResponses();
      unsubTeams();
    };
  }, [id]);

  const effectiveRoster = useMemo(() => {
    if (!survey) return [];
    if (survey.teamId) {
      const liveTeam = teams.find((tm) => tm.id === survey.teamId);
      if (liveTeam && liveTeam.players.length > 0) return liveTeam.players;
    }
    return Array.isArray(survey.teamRosterSnapshot) ? survey.teamRosterSnapshot : [];
  }, [survey, teams]);

  const participation = useMemo(
    () =>
      effectiveRoster.length > 0
        ? computeRosterParticipation(effectiveRoster, responses, locale)
        : null,
    [effectiveRoster, responses, locale]
  );

  async function handleToggleStatus() {
    if (!survey || togglingStatus) return;
    setTogglingStatus(true);
    try {
      const currentlyClosed = isSurveyEffectivelyClosed(survey);
      if (currentlyClosed) {
        // Reopen and clear any past deadline
        await updateSurvey(survey.id, {
          status: 'active',
          closesAt: isSurveyExpired(survey) ? null : survey.closesAt,
        });
        showToast(t('results.reopenedToast'));
      } else {
        await updateSurvey(survey.id, { status: 'closed' });
        showToast(t('results.closedToast'));
      }
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleConfirmDeleteResponse() {
    if (!deletingResponse || !survey) return;
    await deleteSurveyResponseById(deletingResponse.id, survey.id);
    if (selectedResponseId === deletingResponse.id) {
      setSelectedResponseId(null);
    }
    setDeletingResponse(null);
    showToast(t('results.responseDeletedToast'));
  }

  function handleExportCsv() {
    if (!survey) return;
    const csv = exportSurveyResultsToCsv(survey, responses, locale);
    triggerDownload(csv, `${survey.id}-results.csv`, 'text/csv;charset=utf-8;');
  }

  function handleExportJson() {
    if (!survey) return;
    const json = exportSurveyResultsToJson(survey, responses);
    triggerDownload(json, `${survey.id}-results.json`, 'application/json;charset=utf-8;');
  }

  function formatTime(ts: number) {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    }).format(new Date(ts));
  }

  if (loading) {
    return <div className="empty-state"><p>{t('common.loading')}</p></div>;
  }

  if (!survey) {
    return (
      <div className="empty-state">
        <h3>{t('player.notFoundTitle')}</h3>
        <button type="button" className="btn btn-secondary btn-compact" onClick={() => navigate('/coach')}>
          {t('editor.back')}
        </button>
      </div>
    );
  }

  const expired = isSurveyExpired(survey);
  const effectivelyClosed = isSurveyEffectivelyClosed(survey);
  const activeResponse =
    responses.find((r) => r.id === selectedResponseId) || responses[0] || null;

  return (
    <section>
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost btn-compact" onClick={() => navigate('/coach')}>
            ← {t('editor.back')}
          </button>
          <h1 className="page-title">{survey.title}</h1>
          <span className={`badge badge-${effectivelyClosed ? 'closed' : survey.status}`}>
            {!effectivelyClosed && <span className="live-dot" />}
            {expired ? t('results.autoClosedBadge') : t(`status.${survey.status}`)}
          </span>
          <span className="badge badge-accent">
            <span className="live-dot" />
            {t('results.liveBadge')} · {responses.length}
          </span>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            disabled={togglingStatus}
            onClick={handleToggleStatus}
          >
            {effectivelyClosed ? t('results.reopenSurvey') : t('results.closeSurvey')}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            onClick={() => setShowShare(true)}
          >
            {t('dashboard.share')}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-compact"
            disabled={responses.length === 0}
            onClick={handleExportCsv}
          >
            {t('results.exportCsv')}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-compact"
            disabled={responses.length === 0}
            onClick={handleExportJson}
          >
            {t('results.exportJson')}
          </button>
        </div>
      </header>

      {/* Roster Participation Tracker ("Who answered" vs "Who is missing") */}
      {participation && (
        <div className="surface-section" style={{ marginBottom: 18 }}>
          <div className="section-bar">
            <span className="section-label">
              {t('results.participationTitle', {
                answered: participation.answeredRoster.length,
                total: effectiveRoster.length,
              })}
            </span>
          </div>
          <div className="participation-grid">
            <div className="participation-col">
              <div className="field-label" style={{ color: 'var(--success)' }}>
                ✓ {t('results.answeredPlayers', { count: participation.answeredRoster.length })}
              </div>
              <div className="voter-wrap">
                {participation.answeredRoster.map((name) => (
                  <span key={name} className="voter-pill answered">
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <div className="participation-col">
              <div className="field-label" style={{ color: 'var(--warning)' }}>
                ⏳ {t('results.missingPlayers', { count: participation.missingRoster.length })}
              </div>
              {participation.missingRoster.length === 0 ? (
                <span style={{ fontSize: 12.5, color: 'var(--success)' }}>
                  {t('results.allAnswered')}
                </span>
              ) : (
                <div className="voter-wrap">
                  {participation.missingRoster.map((name) => (
                    <span key={name} className="voter-pill missing">
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {participation.extraRespondents.length > 0 && (
              <div className="participation-col" style={{ gridColumn: '1 / -1' }}>
                <div className="field-label">
                  {t('results.extraPlayers', { count: participation.extraRespondents.length })}
                </div>
                <div className="voter-wrap">
                  {participation.extraRespondents.map((name) => (
                    <span key={name} className="voter-pill">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="chip-strip" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`chip${tab === 'questions' ? ' active' : ''}`}
          onClick={() => setTab('questions')}
        >
          {t('results.tabByQuestion')}
        </button>
        <button
          type="button"
          className={`chip${tab === 'individual' ? ' active' : ''}`}
          onClick={() => setTab('individual')}
        >
          {t('results.tabIndividual')} ({responses.length})
        </button>
      </div>

      {responses.length === 0 ? (
        <div className="surface-section">
          <div className="empty-state">
            <h3>{t('results.noResponsesTitle')}</h3>
            <p>{t('results.noResponsesBody')}</p>
            <button
              type="button"
              className="btn btn-primary btn-compact"
              onClick={() => setShowShare(true)}
            >
              {t('dashboard.share')}
            </button>
          </div>
        </div>
      ) : tab === 'questions' ? (
        <div className="surface-section">
          {survey.questions.map((question, idx) => {
            const stats = computeQuestionStats(question, responses, locale);
            const qTitle = resolveLocalizedText(question.text, locale);
            return (
              <article key={question.id} className="hairline-row" style={{ gap: 14, padding: 20 }}>
                <div className="row-top">
                  <h2 className="row-title">
                    {idx + 1}. {qTitle}
                  </h2>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {stats.type !== 'text' &&
                      stats.type !== 'choice' &&
                      stats.average !== null && (
                        <span className="badge badge-accent">
                          {t('results.average')}: {stats.average}
                        </span>
                      )}
                    <span className="badge">
                      {t('results.answered', { count: stats.answeredCount })}
                    </span>
                  </div>
                </div>

                {stats.type === 'text' ? (
                  stats.entries.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                      {t('results.noTextAnswers')}
                    </p>
                  ) : (
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      {stats.entries.map((entry) => (
                        <div
                          key={entry.responseId}
                          style={{
                            padding: '10px 0',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                          }}
                        >
                          <div style={{ fontSize: 14 }}>{entry.text}</div>
                          <div className="row-meta">
                            <span className="voter-pill">{entry.respondentName}</span>
                            <span>{formatTime(entry.submittedAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : stats.type === 'choice' ? (
                  <div className="dist-list">
                    {stats.buckets.map((b) => (
                      <div key={b.optionId} className="dist-bucket-block">
                        <div className="dist-row choice-dist-row">
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            {b.label}
                          </span>
                          <div className="dist-track">
                            <div
                              className="dist-fill"
                              style={{ width: `${b.percentage}%` }}
                            />
                          </div>
                          <span style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                            {b.count} ({b.percentage}%)
                          </span>
                        </div>
                        {b.voters.length > 0 && (
                          <div className="dist-voters choice-voters">
                            {b.voters.map((voter, vIdx) => (
                              <span key={`${voter}-${vIdx}`} className="voter-pill">
                                {voter}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dist-list">
                    {stats.buckets.map((b) => {
                      const barColor = getBarSpectrumColor(b.value, stats.min, stats.max);
                      return (
                        <div key={b.label} className="dist-bucket-block">
                          <div className="dist-row">
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                              {question.type === 'emoji5'
                                ? `${EMOJI_FACES[b.value] || ''} ${b.label}`
                                : b.label}
                            </span>
                            <div className="dist-track">
                              <div
                                className="dist-fill"
                                style={{ width: `${b.percentage}%`, backgroundColor: barColor }}
                              />
                            </div>
                            <span style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                              {b.count} ({b.percentage}%)
                            </span>
                          </div>
                          {b.voters.length > 0 && (
                            <div className="dist-voters">
                              {b.voters.map((voter, vIdx) => (
                                <span key={`${voter}-${vIdx}`} className="voter-pill">
                                  {voter}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="workbench-split editor-split">
          <div className="workbench-primary">
            {responses.map((resp) => {
              const isSelected = activeResponse?.id === resp.id;
              return (
                <div
                  key={resp.id}
                  className={`hairline-row${isSelected ? ' active' : ''}`}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                >
                  <button
                    type="button"
                    style={{ flex: 1, textAlign: 'left', padding: 0 }}
                    onClick={() => setSelectedResponseId(resp.id)}
                  >
                    <div className="row-top">
                      <strong style={{ fontSize: 14 }}>{resp.respondentName}</strong>
                      <span className="badge">{resp.locale.toUpperCase()}</span>
                    </div>
                    <div className="row-meta" style={{ marginTop: 4 }}>
                      <span>{formatTime(resp.submittedAt)}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost btn-compact"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => setDeletingResponse(resp)}
                    aria-label={t('results.deleteResponseAction')}
                    title={t('results.deleteResponseAction')}
                  >
                    🗑
                  </button>
                </div>
              );
            })}
          </div>

          <div className="workbench-pane" style={{ background: 'var(--surface)' }}>
            {activeResponse && (
              <div>
                <div className="section-bar">
                  <div>
                    <strong style={{ fontSize: 14 }}>{activeResponse.respondentName}</strong>
                    <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatTime(activeResponse.submittedAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-compact"
                    onClick={() => setDeletingResponse(activeResponse)}
                  >
                    🗑 {t('results.deleteResponseAction')}
                  </button>
                </div>
                {survey.questions.map((q, idx) => {
                  const ans = activeResponse.answers[q.id];
                  const display =
                    ans === undefined || ans === ''
                      ? '—'
                      : q.type === 'emoji5'
                        ? `${EMOJI_FACES[Number(ans)] || ''} ${ans}/5`
                        : formatAnswerForDisplay(q, ans, locale);
                  return (
                    <div key={q.id} className="hairline-row">
                      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                        {idx + 1}. {resolveLocalizedText(q.text, locale)}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{display}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showShare && <ShareSurveyModal survey={survey} onClose={() => setShowShare(false)} />}

      {deletingResponse && (
        <ConfirmModal
          title={t('results.deleteResponseTitle')}
          body={t('results.deleteResponseBody', { name: deletingResponse.respondentName })}
          confirmLabel={t('results.deleteResponseAction')}
          cancelLabel={t('common.cancel')}
          danger
          onConfirm={handleConfirmDeleteResponse}
          onCancel={() => setDeletingResponse(null)}
        />
      )}
    </section>
  );
}
