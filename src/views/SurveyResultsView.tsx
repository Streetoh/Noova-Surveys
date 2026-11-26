import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShareSurveyModal } from '../components/ShareSurveyModal.tsx';
import { createTranslator } from '../i18n/index.ts';
import {
  computeQuestionStats,
  exportSurveyResultsToCsv,
  exportSurveyResultsToJson,
} from '../lib/analytics.ts';
import { resolveLocalizedText } from '../lib/validation.ts';
import {
  setSurveyStatus,
  subscribeSurveyById,
  subscribeSurveyResponses,
} from '../services/surveysRepo.ts';
import { useAppStore } from '../store/useAppStore.ts';
import type { Survey, SurveyResponse } from '../types/survey.ts';

const EMOJI_FACES: Record<number, string> = {
  1: '😣',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
};

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
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'questions' | 'individual'>('questions');
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
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
    return () => {
      unsubSurvey();
      unsubResponses();
    };
  }, [id]);

  async function handleToggleStatus() {
    if (!survey || togglingStatus) return;
    setTogglingStatus(true);
    try {
      const nextStatus = survey.status === 'closed' ? 'active' : 'closed';
      await setSurveyStatus(survey.id, nextStatus);
      showToast(nextStatus === 'closed' ? t('results.closedToast') : t('results.reopenedToast'));
    } finally {
      setTogglingStatus(false);
    }
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
          <span className={`badge badge-${survey.status}`}>
            {survey.status === 'active' && <span className="live-dot" />}
            {t(`status.${survey.status}`)}
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
            {survey.status === 'closed' ? t('results.reopenSurvey') : t('results.closeSurvey')}
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
            const stats = computeQuestionStats(question, responses);
            const qTitle = resolveLocalizedText(question.text, locale);
            return (
              <article key={question.id} className="hairline-row" style={{ gap: 12, padding: 18 }}>
                <div className="row-top">
                  <h2 className="row-title">
                    {idx + 1}. {qTitle}
                  </h2>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {stats.type !== 'text' && stats.average !== null && (
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
                            <strong>{entry.respondentName}</strong>
                            <span>·</span>
                            <span>
                              {entry.identityMode === 'name'
                                ? t('results.identityName')
                                : t('results.identityPseudonym')}
                            </span>
                            <span>·</span>
                            <span>{formatTime(entry.submittedAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="dist-list">
                    {stats.buckets.map((b) => (
                      <div key={b.label} className="dist-row">
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {question.type === 'emoji5' ? `${EMOJI_FACES[b.value] || ''} ${b.label}` : b.label}
                        </span>
                        <div className="dist-track">
                          <div className="dist-fill" style={{ width: `${b.percentage}%` }} />
                        </div>
                        <span style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {b.count} ({b.percentage}%)
                        </span>
                      </div>
                    ))}
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
                <button
                  key={resp.id}
                  type="button"
                  className={`hairline-row${isSelected ? ' active' : ''}`}
                  style={{ width: '100%', textAlign: 'left' }}
                  onClick={() => setSelectedResponseId(resp.id)}
                >
                  <div className="row-top">
                    <strong style={{ fontSize: 14 }}>{resp.respondentName}</strong>
                    <span className="badge">
                      {resp.identityMode === 'name'
                        ? t('results.identityName')
                        : t('results.identityPseudonym')}
                    </span>
                  </div>
                  <div className="row-meta">
                    <span>{formatTime(resp.submittedAt)}</span>
                    <span>·</span>
                    <span>{resp.locale.toUpperCase()}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="workbench-pane" style={{ background: 'var(--surface)' }}>
            {activeResponse && (
              <div>
                <div className="section-bar">
                  <strong style={{ fontSize: 14 }}>{activeResponse.respondentName}</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatTime(activeResponse.submittedAt)}
                  </span>
                </div>
                {survey.questions.map((q, idx) => {
                  const ans = activeResponse.answers[q.id];
                  const display =
                    ans === undefined || ans === ''
                      ? '—'
                      : q.type === 'emoji5'
                        ? `${EMOJI_FACES[Number(ans)] || ''} ${ans}/5`
                        : String(ans);
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
    </section>
  );
}
