import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal.tsx';
import { ShareSurveyModal } from '../components/ShareSurveyModal.tsx';
import { createTranslator } from '../i18n/index.ts';
import { STARTER_TEMPLATES, cloneSurveyAsNew } from '../lib/templates.ts';
import { isFirebaseConfigured } from '../services/firebase.ts';
import { createSurvey, deleteSurveyById, subscribeSurveys } from '../services/surveysRepo.ts';
import { useAppStore } from '../store/useAppStore.ts';
import type { Survey, SurveyStatus } from '../types/survey.ts';

export function CoachDashboardView() {
  const navigate = useNavigate();
  const locale = useAppStore((s) => s.locale);
  const showToast = useAppStore((s) => s.showToast);
  const t = createTranslator(locale);

  const [allItems, setAllItems] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | SurveyStatus>('all');
  const [sharingSurvey, setSharingSurvey] = useState<Survey | null>(null);
  const [deletingSurvey, setDeletingSurvey] = useState<Survey | null>(null);

  useEffect(() => {
    const unsub = subscribeSurveys(
      (list) => {
        setAllItems(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const surveys = useMemo(
    () =>
      allItems.filter(
        (s) => !s.isTemplate && (statusFilter === 'all' || s.status === statusFilter)
      ),
    [allItems, statusFilter]
  );

  const savedTemplates = useMemo(() => allItems.filter((s) => s.isTemplate), [allItems]);

  async function handleUseTemplate(
    template: Omit<Survey, 'id' | 'createdAt' | 'updatedAt' | 'responseCount'>
  ) {
    const newId = await createSurvey(cloneSurveyAsNew(template, { isTemplate: false }));
    navigate(`/coach/edit/${newId}`);
  }

  async function handleDuplicate(survey: Survey) {
    await createSurvey(cloneSurveyAsNew(survey, { isTemplate: false, titleSuffix: '(2)' }));
    showToast(t('dashboard.duplicatedToast'));
  }

  async function handleSaveAsTemplate(survey: Survey) {
    await createSurvey(cloneSurveyAsNew(survey, { isTemplate: true }));
    showToast(t('dashboard.templateSavedToast'));
  }

  async function handleConfirmDelete() {
    if (!deletingSurvey) return;
    await deleteSurveyById(deletingSurvey.id);
    showToast(t('dashboard.deletedToast'));
    setDeletingSurvey(null);
  }

  function formatDate(ts: number) {
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(ts));
  }

  return (
    <section>
      <header className="page-header">
        <h1 className="page-title">{t('dashboard.title')}</h1>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary btn-compact"
            onClick={() => navigate('/coach/edit/new')}
          >
            + {t('dashboard.newSurvey')}
          </button>
        </div>
      </header>

      {!isFirebaseConfigured && (
        <div className="notice-banner">{t('dashboard.localModeBanner')}</div>
      )}

      <div className="workbench-split">
        {/* Left Column: Surveys List */}
        <div className="workbench-primary">
          <div className="section-bar">
            <div className="chip-strip">
              {(['all', 'active', 'draft', 'closed'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`chip${statusFilter === status ? ' active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? t('dashboard.filterAll') : t(`status.${status}`)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              <p>{t('common.loading')}</p>
            </div>
          ) : surveys.length === 0 ? (
            <div className="empty-state">
              <h3>{t('dashboard.emptyTitle')}</h3>
              <p>{t('dashboard.emptyBody')}</p>
              <button
                type="button"
                className="btn btn-primary btn-compact"
                onClick={() => navigate('/coach/edit/new')}
              >
                + {t('dashboard.newSurvey')}
              </button>
            </div>
          ) : (
            <div>
              {surveys.map((survey) => (
                <article key={survey.id} className="hairline-row">
                  <div className="row-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h2 className="row-title">{survey.title}</h2>
                      <span className={`badge badge-${survey.status}`}>
                        {survey.status === 'active' && <span className="live-dot" />}
                        {t(`status.${survey.status}`)}
                      </span>
                      {survey.teamTag && <span className="badge">{survey.teamTag}</span>}
                    </div>
                    <span className="badge badge-accent">
                      {t('dashboard.responsesCount', { count: survey.responseCount || 0 })}
                    </span>
                  </div>

                  <div className="row-meta">
                    <span>{t('dashboard.questionsCount', { count: survey.questions.length })}</span>
                    <span>·</span>
                    <span>{formatDate(survey.updatedAt)}</span>
                    {survey.description && (
                      <>
                        <span>·</span>
                        <span>{survey.description}</span>
                      </>
                    )}
                  </div>

                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-compact"
                      onClick={() => navigate(`/coach/results/${survey.id}`)}
                    >
                      {t('dashboard.results')}
                    </button>
                    {survey.status === 'active' && (
                      <button
                        type="button"
                        className="btn btn-primary btn-compact"
                        onClick={() => setSharingSurvey(survey)}
                      >
                        {t('dashboard.share')}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-compact"
                      onClick={() => navigate(`/coach/edit/${survey.id}`)}
                    >
                      {t('dashboard.edit')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-compact"
                      onClick={() => handleDuplicate(survey)}
                    >
                      {t('dashboard.duplicate')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-compact"
                      onClick={() => handleSaveAsTemplate(survey)}
                    >
                      {t('dashboard.saveTemplate')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-compact"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => setDeletingSurvey(survey)}
                    >
                      {t('dashboard.delete')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Starter & Saved Templates */}
        <aside className="workbench-pane">
          <div className="section-bar">
            <span className="section-label">{t('dashboard.starterTemplates')}</span>
          </div>
          <div>
            {STARTER_TEMPLATES.map((tpl, idx) => (
              <div key={idx} className="hairline-row" style={{ background: 'transparent' }}>
                <div className="row-top">
                  <strong style={{ fontSize: 13.5 }}>{tpl.title}</strong>
                  {tpl.teamTag && <span className="badge">{tpl.teamTag}</span>}
                </div>
                <div className="row-meta">
                  <span>{t('dashboard.questionsCount', { count: tpl.questions.length })}</span>
                  {tpl.description && <span>· {tpl.description}</span>}
                </div>
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-compact"
                    onClick={() => handleUseTemplate(tpl)}
                  >
                    {t('dashboard.useTemplate')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {savedTemplates.length > 0 && (
            <>
              <div className="section-bar" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="section-label">{t('dashboard.savedTemplates')}</span>
              </div>
              <div>
                {savedTemplates.map((tpl) => (
                  <div key={tpl.id} className="hairline-row" style={{ background: 'transparent' }}>
                    <div className="row-top">
                      <strong style={{ fontSize: 13.5 }}>{tpl.title}</strong>
                      {tpl.teamTag && <span className="badge">{tpl.teamTag}</span>}
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-compact"
                        onClick={() => handleUseTemplate(tpl)}
                      >
                        {t('dashboard.useTemplate')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-compact"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => setDeletingSurvey(tpl)}
                      >
                        {t('dashboard.delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>

      {sharingSurvey && (
        <ShareSurveyModal survey={sharingSurvey} onClose={() => setSharingSurvey(null)} />
      )}

      {deletingSurvey && (
        <ConfirmModal
          title={t('dashboard.deleteConfirmTitle')}
          body={t('dashboard.deleteConfirmBody', { title: deletingSurvey.title })}
          confirmLabel={t('dashboard.delete')}
          cancelLabel={t('common.cancel')}
          danger
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingSurvey(null)}
        />
      )}
    </section>
  );
}
