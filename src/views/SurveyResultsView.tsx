import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BodyMapSvg } from '../components/BodyMapSvg.tsx';
import { ConfirmModal } from '../components/ConfirmModal.tsx';
import { ShareSurveyModal } from '../components/ShareSurveyModal.tsx';
import { createTranslator, type TranslationKey } from '../i18n/index.ts';
import {
  computeQuestionStats,
  exportSurveyResultsToCsv,
  exportSurveyResultsToJson,
  formatAnswerForDisplay,
} from '../lib/analytics.ts';
import { getNormalizedRatio, getPolarityColor } from '../lib/dial.ts';
import { computeRosterParticipation } from '../lib/roster.ts';
import { isSurveyEffectivelyClosed, isSurveyExpired, resolveLocalizedText } from '../lib/validation.ts';
import {
  deleteSurveyResponseById,
  getSurveyById,
  getSurveyResponsesOnce,
  subscribeActiveSurveyResponses,
  updateSurvey,
} from '../services/surveysRepo.ts';
import { useAppStore } from '../store/useAppStore.ts';
import type { BodyZoneId, Survey, SurveyResponse } from '../types/survey.ts';

const EMOJI_FACES: Record<number, string> = {
  1: '😣',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
};

const TYPE_KEY_MAP = {
  text: 'editor.typeText',
  slider: 'editor.typeSlider',
  rating10: 'editor.typeRating10',
  emoji5: 'editor.typeEmoji5',
  choice: 'editor.typeChoice',
  bodymap: 'editor.typeBodymap',
} as const satisfies Record<string, TranslationKey>;

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
  const [rosterExpanded, setRosterExpanded] = useState(false);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [deletingResponse, setDeletingResponse] = useState<SurveyResponse | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Interactive drill-down selections per question
  const [focusedBucket, setFocusedBucket] = useState<Record<string, number | null>>({});
  const [focusedChoice, setFocusedChoice] = useState<Record<string, string | null>>({});
  const [focusedZone, setFocusedZone] = useState<Record<string, BodyZoneId | 'allClear' | null>>({});

  // 1. One-shot read of the survey document (no onSnapshot on surveys or survey_teams)
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    getSurveyById(id)
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
  }, [id]);

  // 2. Scoped real-time listener ONLY when survey is active and not expired;
  //    otherwise one-shot getDocs read with zero active listeners.
  const isClosed = survey ? isSurveyEffectivelyClosed(survey) : true;
  useEffect(() => {
    if (!id || !survey) return;
    if (isClosed) {
      let mounted = true;
      getSurveyResponsesOnce(id).then((list) => {
        if (mounted) setResponses(list);
      });
      return () => {
        mounted = false;
      };
    }

    const unsubscribe = subscribeActiveSurveyResponses(id, (list) => {
      setResponses(list);
    });
    return () => {
      unsubscribe();
    };
  }, [id, survey?.id, isClosed]);

  const effectiveRoster = useMemo(() => {
    if (!survey) return [];
    return Array.isArray(survey.teamRosterSnapshot) ? survey.teamRosterSnapshot : [];
  }, [survey]);

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
        const nextClosesAt = isSurveyExpired(survey) ? null : survey.closesAt;
        await updateSurvey(survey.id, {
          status: 'active',
          closesAt: nextClosesAt,
        });
        setSurvey((prev) => (prev ? { ...prev, status: 'active', closesAt: nextClosesAt } : prev));
        showToast(t('results.reopenedToast'));
      } else {
        await updateSurvey(survey.id, { status: 'closed' });
        setSurvey((prev) => (prev ? { ...prev, status: 'closed' } : prev));
        showToast(t('results.closedToast'));
      }
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleConfirmDeleteResponse() {
    if (!deletingResponse || !survey) return;
    const deletedId = deletingResponse.id;
    await deleteSurveyResponseById(deletedId, survey.id);
    setResponses((prev) => prev.filter((r) => r.id !== deletedId));
    setSurvey((prev) =>
      prev ? { ...prev, responseCount: Math.max(0, (prev.responseCount || 0) - 1) } : prev
    );
    if (selectedResponseId === deletedId) {
      setSelectedResponseId(null);
    }
    setDeletingResponse(null);
    showToast(t('results.responseDeletedToast'));
  }

  function handleExportCsv() {
    if (!survey) return;
    const csv = exportSurveyResultsToCsv(survey, responses, locale, (k) => t(k as TranslationKey));
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
    return (
      <div className="empty-state">
        <p>{t('common.loading')}</p>
      </div>
    );
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

  // Build ordered numeric KPI cards (highlighted questions first, never a global average)
  const numericQuestions = survey.questions
    .filter((q) => q.type === 'rating10' || q.type === 'slider' || q.type === 'emoji5')
    .sort((a, b) => (a.highlightInSummary === b.highlightInSummary ? 0 : a.highlightInSummary ? -1 : 1));

  // Ring geometry for top-left Bento card
  const ringRadius = 40;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const totalRoster = effectiveRoster.length;
  const answeredRosterCount = participation ? participation.answeredRoster.length : responses.length;
  const ringFraction =
    totalRoster > 0
      ? Math.min(1, answeredRosterCount / totalRoster)
      : responses.length > 0
        ? 1
        : 0;
  const ringDashOffset = ringCircumference * (1 - ringFraction);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Action & status strip */}
      <div className="surface-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="row-between">
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 750 }}>{survey.title}</h2>
              {survey.teamTag && <span className="pill">{survey.teamTag}</span>}
              {!effectivelyClosed ? (
                <span className="pill status-active">● {t('results.liveBadge')}</span>
              ) : expired ? (
                <span className="pill status-closed">{t('results.autoClosedBadge')}</span>
              ) : (
                <span className="pill status-closed">{t('status.closed')}</span>
              )}
            </div>
            {survey.description && (
              <span className="muted" style={{ fontSize: 13 }}>
                {survey.description}
              </span>
            )}
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="btn btn-secondary btn-compact"
              onClick={() => setShowShare(true)}
            >
              {t('dashboard.share')}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-compact"
              onClick={handleToggleStatus}
              disabled={togglingStatus}
            >
              {effectivelyClosed ? t('results.reopenSurvey') : t('results.closeSurvey')}
            </button>
            <button type="button" className="btn btn-ghost btn-compact" onClick={handleExportCsv}>
              CSV
            </button>
            <button type="button" className="btn btn-ghost btn-compact" onClick={handleExportJson}>
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Bento Summary Grid */}
      <div className="bento-grid">
        <button
          type="button"
          className="bento-ring-card"
          onClick={() => participation && setRosterExpanded((v) => !v)}
          style={{ cursor: participation ? 'pointer' : 'default' }}
        >
          <svg width="104" height="104" viewBox="0 0 100 100" aria-hidden="true">
            <circle
              cx="50"
              cy="50"
              r={ringRadius}
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth="9"
            />
            <circle
              cx="50"
              cy="50"
              r={ringRadius}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringDashOffset}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 0.35s ease' }}
            />
            <text
              x="50"
              y="54"
              textAnchor="middle"
              fill="var(--text-primary)"
              fontSize={totalRoster > 0 ? '17' : '22'}
              fontWeight="800"
            >
              {totalRoster > 0 ? `${answeredRosterCount}/${totalRoster}` : responses.length}
            </text>
          </svg>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
            {totalRoster > 0
              ? t('results.participationTitle', {
                  answered: answeredRosterCount,
                  total: totalRoster,
                })
              : t('results.answered', { count: responses.length })}
          </div>
          {participation && (
            <div className="muted" style={{ fontSize: 11.5 }}>
              {t('results.tapRingHint')} {rosterExpanded ? '▴' : '▾'}
            </div>
          )}
        </button>

        <div className="bento-kpis-grid">
          {numericQuestions.length > 0 ? (
            numericQuestions.map((q, kpiIdx) => {
              const st = computeQuestionStats(q, responses, locale);
              if (st.type !== 'rating10' && st.type !== 'slider' && st.type !== 'emoji5') return null;
              const ratio =
                st.average !== null ? getNormalizedRatio(st.average, st.min, st.max) : 0.5;
              const color =
                st.average !== null ? getPolarityColor(ratio, q.polarity) : 'var(--text-muted)';
              const titleText = resolveLocalizedText(q.text, locale) || t('editor.questionNumber', { index: kpiIdx + 1 });
              return (
                <div
                  key={q.id}
                  className={`kpi-mini-card${q.highlightInSummary ? ' highlighted' : ''}`}
                >
                  <div className="row-between">
                    <span className="kpi-mini-val" style={{ color }}>
                      {st.average !== null ? st.average.toFixed(1) : '—'}
                      {q.type === 'emoji5' && st.average !== null
                        ? ` ${EMOJI_FACES[Math.round(st.average)] || ''}`
                        : ''}
                    </span>
                    {q.highlightInSummary && (
                      <span style={{ color: 'var(--accent)', fontSize: 14 }} aria-label={t('editor.highlightInSummary')}>
                        ★
                      </span>
                    )}
                  </div>
                  <div className="kpi-mini-title">{titleText}</div>
                </div>
              );
            })
          ) : (
            <div className="kpi-mini-card">
              <div className="kpi-mini-val" style={{ color: 'var(--accent)' }}>
                {survey.questions.length}
              </div>
              <div className="kpi-mini-title">{t('editor.questionsTitle', { count: survey.questions.length })}</div>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Roster Participation Drawer */}
      {participation && rosterExpanded && (
        <div className="surface-card">
          <div className="participation-grid">
            <div className="participation-col">
              <span className="field-label" style={{ color: 'var(--accent)' }}>
                {t('results.answeredPlayers', { count: participation.answeredRoster.length })}
              </span>
              <div className="voter-wrap">
                {participation.answeredRoster.map((name) => (
                  <span key={name} className="voter-pill answered">
                    ✓ {name}
                  </span>
                ))}
                {participation.answeredRoster.length === 0 && (
                  <span className="muted" style={{ fontSize: 13 }}>
                    —
                  </span>
                )}
              </div>
            </div>

            <div className="participation-col">
              <span className="field-label" style={{ color: 'var(--warning)' }}>
                {t('results.missingPlayers', { count: participation.missingRoster.length })}
              </span>
              {participation.missingRoster.length === 0 ? (
                <span style={{ fontSize: 13, color: 'var(--accent)' }}>
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
                <span className="field-label">
                  {t('results.extraPlayers', { count: participation.extraRespondents.length })}
                </span>
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

      {/* Results View Tabs */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn${tab === 'questions' ? ' active' : ''}`}
          onClick={() => setTab('questions')}
        >
          {t('results.tabByQuestion')}
        </button>
        <button
          type="button"
          className={`tab-btn${tab === 'individual' ? ' active' : ''}`}
          onClick={() => setTab('individual')}
        >
          {t('results.tabIndividual')} ({responses.length})
        </button>
      </div>

      {responses.length === 0 ? (
        <div className="empty-state">
          <h3>{t('results.noResponsesTitle')}</h3>
          <p>{t('results.noResponsesBody')}</p>
        </div>
      ) : tab === 'questions' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {survey.questions.map((q, idx) => {
            const stats = computeQuestionStats(q, responses, locale);
            const qTitle = resolveLocalizedText(q.text, locale) || t('editor.questionNumber', { index: idx + 1 });

            return (
              <article
                key={q.id}
                className="surface-card"
                style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <div className="row-between">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span className="muted" style={{ fontSize: 11.5, fontWeight: 700 }}>
                      #{idx + 1} · {t(TYPE_KEY_MAP[q.type])}
                    </span>
                    <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>{qTitle}</h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {(stats.type === 'rating10' || stats.type === 'slider' || stats.type === 'emoji5') &&
                      stats.average !== null && (
                        <span
                          className="pill"
                          style={{
                            borderColor: getPolarityColor(
                              getNormalizedRatio(stats.average, stats.min, stats.max),
                              q.polarity
                            ),
                            color: getPolarityColor(
                              getNormalizedRatio(stats.average, stats.min, stats.max),
                              q.polarity
                            ),
                            fontWeight: 700,
                          }}
                        >
                          {t('results.average')}: {stats.average}
                        </span>
                      )}
                    <span className="pill">{t('results.answered', { count: stats.answeredCount })}</span>
                  </div>
                </div>

                {/* Numeric: Compact Vertical Histogram */}
                {(stats.type === 'rating10' || stats.type === 'slider' || stats.type === 'emoji5') && (() => {
                  const maxCount = Math.max(1, ...stats.buckets.map((b) => b.count));
                  const activeBucketValue = focusedBucket[q.id] ?? null;
                  const activeBucket = stats.buckets.find((b) => b.value === activeBucketValue) || null;

                  return (
                    <>
                      <div className="histogram-cols">
                        {stats.buckets.map((b) => {
                          const barPx = b.count > 0 ? Math.max(8, Math.round((b.count / maxCount) * 74)) : 4;
                          const ratio = getNormalizedRatio(b.value, stats.min, stats.max);
                          const barColor =
                            b.count > 0 ? getPolarityColor(ratio, q.polarity) : 'var(--border-strong)';
                          const isFocused = activeBucketValue === b.value;
                          return (
                            <button
                              key={b.value}
                              type="button"
                              className={`hist-col-btn${isFocused ? ' focused' : ''}`}
                              onClick={() =>
                                setFocusedBucket((prev) => ({
                                  ...prev,
                                  [q.id]: prev[q.id] === b.value ? null : b.value,
                                }))
                              }
                            >
                              <div className="hist-bar-area">
                                {b.count > 0 && <span className="hist-count-lbl">{b.count}</span>}
                                <div
                                  className="hist-bar"
                                  style={{ height: `${barPx}px`, background: barColor }}
                                />
                              </div>
                              <span className="hist-x-lbl">
                                {q.type === 'emoji5' ? EMOJI_FACES[b.value] || b.label : b.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {activeBucket ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span className="muted" style={{ fontSize: 12 }}>
                            {q.type === 'emoji5'
                              ? `${EMOJI_FACES[activeBucket.value] || ''} ${activeBucket.label}`
                              : activeBucket.label}{' '}
                            · {t('results.playersCount', { count: activeBucket.voters.length })}
                          </span>
                          <div className="voter-wrap">
                            {activeBucket.voters.length > 0 ? (
                              activeBucket.voters.map((name, i) => (
                                <span key={`${name}-${i}`} className="voter-pill">
                                  {name}
                                </span>
                              ))
                            ) : (
                              <span className="muted" style={{ fontSize: 12.5 }}>
                                —
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>
                          {t('results.tapBarHint')}
                        </span>
                      )}
                    </>
                  );
                })()}

                {/* Choice: Full-width Horizontal Bars */}
                {stats.type === 'choice' && (() => {
                  const activeOptionId = focusedChoice[q.id] ?? null;
                  return (
                    <>
                      <div className="choice-bars">
                        {stats.buckets.map((b) => {
                          const isFocused = activeOptionId === b.optionId;
                          return (
                            <button
                              key={b.optionId}
                              type="button"
                              className={`choice-bar-btn${isFocused ? ' focused' : ''}`}
                              onClick={() =>
                                setFocusedChoice((prev) => ({
                                  ...prev,
                                  [q.id]: prev[q.id] === b.optionId ? null : b.optionId,
                                }))
                              }
                            >
                              <div className="choice-bar-head">
                                <span>{b.label}</span>
                                <span className="muted">
                                  {b.count} ({b.percentage}%)
                                </span>
                              </div>
                              <div className="dist-track">
                                <div className="dist-fill" style={{ width: `${b.percentage}%` }} />
                              </div>
                              {isFocused && (
                                <div className="voter-wrap" style={{ marginTop: 4 }}>
                                  {b.voters.length > 0 ? (
                                    b.voters.map((name, i) => (
                                      <span key={`${name}-${i}`} className="voter-pill">
                                        {name}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="muted" style={{ fontSize: 12 }}>
                                      —
                                    </span>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {!activeOptionId && (
                        <span className="muted" style={{ fontSize: 12 }}>
                          {t('results.tapBarHint')}
                        </span>
                      )}
                    </>
                  );
                })()}

                {/* Body Map: Team Heatmap + Descending Zone List */}
                {stats.type === 'bodymap' && (() => {
                  const activeZone = focusedZone[q.id] ?? null;
                  const activeStat =
                    activeZone && activeZone !== 'allClear'
                      ? stats.zones.find((z) => z.zoneId === activeZone) || null
                      : null;

                  return (
                    <div className="heatmap-layout">
                      <BodyMapSvg
                        mode="heatmap"
                        heatmapZones={stats.zones}
                        focusedZoneId={activeZone && activeZone !== 'allClear' ? activeZone : null}
                        frontLabel={t('body.front')}
                        backLabel={t('body.backView')}
                        sideRightLabel={t('body.sideRight')}
                        sideLeftLabel={t('body.sideLeft')}
                        getZoneLabel={(z) => t(`body.${z}`)}
                        onToggleZone={(z) =>
                          setFocusedZone((prev) => ({
                            ...prev,
                            [q.id]: prev[q.id] === z ? null : z,
                          }))
                        }
                      />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button
                          type="button"
                          className={`choice-bar-btn${activeZone === 'allClear' ? ' focused' : ''}`}
                          onClick={() =>
                            setFocusedZone((prev) => ({
                              ...prev,
                              [q.id]: prev[q.id] === 'allClear' ? null : 'allClear',
                            }))
                          }
                        >
                          <div className="choice-bar-head">
                            <span style={{ color: 'var(--accent)' }}>
                              ✓ {t('results.allClearCount', { count: stats.allClearCount })}
                            </span>
                          </div>
                          {activeZone === 'allClear' && stats.allClearVoters.length > 0 && (
                            <div className="voter-wrap" style={{ marginTop: 4 }}>
                              {stats.allClearVoters.map((name, i) => (
                                <span key={`${name}-${i}`} className="voter-pill answered">
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>

                        <span className="field-label">{t('results.reportedZonesTitle')}</span>

                        {stats.reportedZones.length === 0 ? (
                          <span className="muted" style={{ fontSize: 13 }}>
                            {t('body.noDiscomfortReported')}
                          </span>
                        ) : (
                          <div className="choice-bars">
                            {stats.reportedZones.map((z) => {
                              const isFocused = activeZone === z.zoneId;
                              return (
                                <button
                                  key={z.zoneId}
                                  type="button"
                                  className={`choice-bar-btn${isFocused ? ' focused' : ''}`}
                                  onClick={() =>
                                    setFocusedZone((prev) => ({
                                      ...prev,
                                      [q.id]: prev[q.id] === z.zoneId ? null : z.zoneId,
                                    }))
                                  }
                                >
                                  <div className="choice-bar-head">
                                    <span>{t(`body.${z.zoneId}`)}</span>
                                    <span style={{ color: 'var(--danger)' }}>
                                      {t('results.playersCount', { count: z.count })}
                                    </span>
                                  </div>
                                  <div className="dist-track">
                                    <div
                                      className="dist-fill"
                                      style={{ width: `${z.percentage}%`, background: 'var(--danger)' }}
                                    />
                                  </div>
                                  {isFocused && (
                                    <div className="voter-wrap" style={{ marginTop: 4 }}>
                                      {z.voters.map((name, i) => (
                                        <span key={`${name}-${i}`} className="voter-pill">
                                          {name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {activeStat && (
                          <div className="muted" style={{ fontSize: 12 }}>
                            {t(`body.${activeStat.zoneId}`)}:{' '}
                            {activeStat.voters.length > 0 ? activeStat.voters.join(', ') : '—'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Text */}
                {stats.type === 'text' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stats.entries.length === 0 ? (
                      <span className="muted" style={{ fontSize: 13 }}>
                        {t('results.noTextAnswers')}
                      </span>
                    ) : (
                      stats.entries.map((entry) => (
                        <div
                          key={entry.responseId}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                          }}
                        >
                          <div className="row-between">
                            <span className="voter-pill">{entry.respondentName}</span>
                            <span className="muted" style={{ fontSize: 11.5 }}>
                              {formatTime(entry.submittedAt)}
                            </span>
                          </div>
                          <div style={{ fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{entry.text}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="surface-card">
          {responses.map((r) => {
            const expanded = selectedResponseId === r.id;
            return (
              <div
                key={r.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div className="row-between">
                  <button
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      textAlign: 'left',
                      flex: 1,
                    }}
                    onClick={() => setSelectedResponseId(expanded ? null : r.id)}
                  >
                    <strong style={{ fontSize: 14 }}>{r.respondentName}</strong>
                    <span className="pill">{r.locale.toUpperCase()}</span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {formatTime(r.submittedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-compact"
                    aria-label={t('results.deleteResponseAction')}
                    onClick={() => setDeletingResponse(r)}
                  >
                    🗑
                  </button>
                </div>

                {expanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                    {survey.questions.map((q) => (
                      <div
                        key={q.id}
                        style={{
                          padding: '8px 10px',
                          background: 'var(--bg)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                        }}
                      >
                        <span className="muted" style={{ fontSize: 11.5 }}>
                          {resolveLocalizedText(q.text, locale)}
                        </span>
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                          {formatAnswerForDisplay(q, r.answers[q.id], locale, (k) =>
                            t(k as TranslationKey)
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
