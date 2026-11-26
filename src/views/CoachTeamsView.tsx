import { useEffect, useState, type FormEvent } from 'react';
import { ConfirmModal } from '../components/ConfirmModal.tsx';
import { createTranslator } from '../i18n/index.ts';
import { parseAndMergePlayers, sortPlayersAlphabetically } from '../lib/roster.ts';
import {
  createTeam,
  deleteTeamById,
  getTeamsOnce,
  updateTeam,
} from '../services/surveysRepo.ts';
import { useAppStore } from '../store/useAppStore.ts';
import type { Team } from '../types/survey.ts';

export function CoachTeamsView() {
  const locale = useAppStore((s) => s.locale);
  const showToast = useAppStore((s) => s.showToast);
  const t = createTranslator(locale);

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  const [newTeamName, setNewTeamName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const [bulkInput, setBulkInput] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);

  useEffect(() => {
    let mounted = true;
    getTeamsOnce()
      .then((list) => {
        if (!mounted) return;
        setTeams(list);
        setLoading(false);
        setActiveTeamId((prev) => (prev && list.some((x) => x.id === prev) ? prev : list[0]?.id || null));
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const activeTeam = teams.find((item) => item.id === activeTeamId) || teams[0] || null;

  async function handleCreateTeam(e: FormEvent) {
    e.preventDefault();
    const trimmed = newTeamName.trim();
    if (!trimmed) {
      setNameError(t('teams.nameRequired'));
      return;
    }
    const now = Date.now();
    const payload = {
      name: trimmed,
      players: [],
      createdAt: now,
      updatedAt: now,
    };
    const id = await createTeam(payload);
    setTeams((prev) => [...prev, { ...payload, id }].sort((a, b) => a.name.localeCompare(b.name)));
    setNewTeamName('');
    setNameError(null);
    setActiveTeamId(id);
    showToast(t('teams.savedToast'));
  }

  async function handleRenameTeam(nextName: string) {
    if (!activeTeam) return;
    const teamId = activeTeam.id;
    setTeams((prev) => prev.map((tm) => (tm.id === teamId ? { ...tm, name: nextName } : tm)));
    await updateTeam(teamId, { name: nextName });
  }

  async function handleAddPlayers(e: FormEvent) {
    e.preventDefault();
    if (!activeTeam || !bulkInput.trim()) return;
    const teamId = activeTeam.id;
    const merged = parseAndMergePlayers(activeTeam.players, bulkInput, locale);
    setTeams((prev) => prev.map((tm) => (tm.id === teamId ? { ...tm, players: merged } : tm)));
    await updateTeam(teamId, { players: merged });
    setBulkInput('');
    showToast(t('teams.savedToast'));
  }

  async function handleSaveEditedPlayer(idx: number) {
    if (!activeTeam) return;
    const teamId = activeTeam.id;
    const trimmed = editingValue.trim();
    const nextList = [...activeTeam.players];
    if (!trimmed) {
      nextList.splice(idx, 1);
    } else {
      nextList[idx] = trimmed;
    }
    const sorted = sortPlayersAlphabetically(nextList, locale);
    setTeams((prev) => prev.map((tm) => (tm.id === teamId ? { ...tm, players: sorted } : tm)));
    await updateTeam(teamId, { players: sorted });
    setEditingIndex(null);
    setEditingValue('');
  }

  async function handleRemovePlayer(idx: number) {
    if (!activeTeam) return;
    const teamId = activeTeam.id;
    const nextList = activeTeam.players.filter((_, i) => i !== idx);
    setTeams((prev) => prev.map((tm) => (tm.id === teamId ? { ...tm, players: nextList } : tm)));
    await updateTeam(teamId, { players: nextList });
  }

  async function handleConfirmDeleteTeam() {
    if (!deletingTeam) return;
    const deletedId = deletingTeam.id;
    await deleteTeamById(deletedId);
    setTeams((prev) => {
      const remaining = prev.filter((tm) => tm.id !== deletedId);
      setActiveTeamId(remaining[0]?.id || null);
      return remaining;
    });
    setDeletingTeam(null);
    showToast(t('teams.deletedToast'));
  }

  return (
    <section>
      <header className="page-header">
        <h1 className="page-title">{t('teams.title')}</h1>
      </header>

      <form
        className="surface-section"
        style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}
        onSubmit={handleCreateTeam}
      >
        <input
          className="input"
          style={{ flex: 1, minWidth: 220 }}
          value={newTeamName}
          onChange={(e) => {
            setNewTeamName(e.target.value);
            if (nameError) setNameError(null);
          }}
          placeholder={t('teams.namePlaceholder')}
          aria-label={t('teams.nameLabel')}
        />
        <button type="submit" className="btn btn-primary btn-compact">
          + {t('teams.newTeam')}
        </button>
        {nameError && <p className="field-error" style={{ width: '100%' }}>{nameError}</p>}
      </form>

      {loading ? (
        <div className="empty-state"><p>{t('common.loading')}</p></div>
      ) : teams.length === 0 ? (
        <div className="surface-section">
          <div className="empty-state">
            <h3>{t('teams.emptyTitle')}</h3>
            <p>{t('teams.emptyBody')}</p>
          </div>
        </div>
      ) : (
        <div className="workbench-split editor-split">
          {/* Left Column: Teams List */}
          <div className="workbench-primary">
            {teams.map((team) => {
              const isSelected = activeTeam?.id === team.id;
              return (
                <button
                  key={team.id}
                  type="button"
                  className={`hairline-row${isSelected ? ' active' : ''}`}
                  style={{ width: '100%', textAlign: 'left' }}
                  onClick={() => {
                    setActiveTeamId(team.id);
                    setEditingIndex(null);
                  }}
                >
                  <div className="row-top">
                    <strong style={{ fontSize: 14.5 }}>{team.name}</strong>
                    <span className="badge badge-accent">
                      {t('teams.playersCount', { count: team.players.length })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Active Team Roster Editor */}
          {activeTeam && (
            <div className="workbench-pane" style={{ background: 'var(--surface)' }}>
              <div className="section-bar">
                <input
                  className="input"
                  style={{ maxWidth: 260, minHeight: 36, fontWeight: 600 }}
                  value={activeTeam.name}
                  onChange={(e) => handleRenameTeam(e.target.value)}
                  aria-label={t('teams.nameLabel')}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-compact"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => setDeletingTeam(activeTeam)}
                >
                  {t('teams.deleteTeam')}
                </button>
              </div>

              <form
                onSubmit={handleAddPlayers}
                style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <label htmlFor="bulk-players" className="field-label">
                  {t('teams.addPlayersLabel')}
                </label>
                <textarea
                  id="bulk-players"
                  className="textarea"
                  style={{ minHeight: 84 }}
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder={t('teams.addPlayersPlaceholder')}
                />
                <div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-compact"
                    disabled={!bulkInput.trim()}
                  >
                    + {t('teams.addPlayersAction')}
                  </button>
                </div>
              </form>

              {activeTeam.players.length === 0 ? (
                <div className="empty-state">
                  <p>{t('teams.noPlayersYet')}</p>
                </div>
              ) : (
                <div>
                  {activeTeam.players.map((player, idx) => (
                    <div
                      key={`${player}-${idx}`}
                      className="hairline-row"
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px' }}
                    >
                      {editingIndex === idx ? (
                        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                          <input
                            className="input"
                            style={{ minHeight: 36 }}
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditedPlayer(idx);
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn btn-primary btn-compact"
                            onClick={() => handleSaveEditedPlayer(idx)}
                          >
                            {t('teams.saveAction')}
                          </button>
                        </div>
                      ) : (
                        <>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{player}</span>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn btn-ghost btn-compact"
                              onClick={() => {
                                setEditingIndex(idx);
                                setEditingValue(player);
                              }}
                            >
                              {t('teams.editAction')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-compact"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleRemovePlayer(idx)}
                            >
                              ✕
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {deletingTeam && (
        <ConfirmModal
          title={t('teams.deleteConfirmTitle')}
          body={t('teams.deleteConfirmBody', { name: deletingTeam.name })}
          confirmLabel={t('teams.deleteTeam')}
          cancelLabel={t('common.cancel')}
          danger
          onConfirm={handleConfirmDeleteTeam}
          onCancel={() => setDeletingTeam(null)}
        />
      )}
    </section>
  );
}
