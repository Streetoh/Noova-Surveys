import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { generateId } from '../lib/templates.ts';
import { stripUndefinedDeep } from '../lib/validation.ts';
import type { Survey, SurveyResponse, SurveyStatus, Team } from '../types/survey.ts';
import { COLLECTIONS, getDb, isFirebaseConfigured } from './firebase.ts';

const LOCAL_SURVEYS_KEY = 'pps_local_surveys_v1';
const LOCAL_RESPONSES_KEY = 'pps_local_responses_v1';
const LOCAL_TEAMS_KEY = 'pps_local_teams_v1';
const localListeners = new Set<() => void>();

function notifyLocal() {
  for (const fn of localListeners) fn();
}

function readLocal<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(key: string, items: T[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Ignore
  }
  notifyLocal();
}

/* --- Surveys --- */

export function subscribeSurveys(
  onData: (surveys: Survey[]) => void,
  onError?: (err: Error) => void
): () => void {
  const db = getDb();
  if (!db || !isFirebaseConfigured) {
    const emit = () => {
      const list = readLocal<Survey>(LOCAL_SURVEYS_KEY).sort((a, b) => b.updatedAt - a.updatedAt);
      onData(list);
    };
    emit();
    localListeners.add(emit);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_SURVEYS_KEY) emit();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      localListeners.delete(emit);
      window.removeEventListener('storage', onStorage);
    };
  }

  const q = query(collection(db, COLLECTIONS.SURVEYS), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Survey[] = snapshot.docs.map((d) => ({
        ...(d.data() as Omit<Survey, 'id'>),
        id: d.id,
      }));
      onData(list);
    },
    (err) => onError?.(err)
  );
}

export async function getSurveyById(surveyId: string): Promise<Survey | null> {
  const db = getDb();
  if (!db || !isFirebaseConfigured) {
    return readLocal<Survey>(LOCAL_SURVEYS_KEY).find((s) => s.id === surveyId) ?? null;
  }

  const snap = await getDoc(doc(db, COLLECTIONS.SURVEYS, surveyId));
  if (!snap.exists()) return null;
  return { ...(snap.data() as Omit<Survey, 'id'>), id: snap.id };
}

export function subscribeSurveyById(
  surveyId: string,
  onData: (survey: Survey | null) => void,
  onError?: (err: Error) => void
): () => void {
  const db = getDb();
  if (!db || !isFirebaseConfigured) {
    const emit = () => {
      const found = readLocal<Survey>(LOCAL_SURVEYS_KEY).find((s) => s.id === surveyId) ?? null;
      onData(found);
    };
    emit();
    localListeners.add(emit);
    return () => {
      localListeners.delete(emit);
    };
  }

  return onSnapshot(
    doc(db, COLLECTIONS.SURVEYS, surveyId),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData({ ...(snap.data() as Omit<Survey, 'id'>), id: snap.id });
    },
    (err) => onError?.(err)
  );
}

export async function createSurvey(data: Omit<Survey, 'id'>): Promise<string> {
  const cleanData = stripUndefinedDeep(data);
  const db = getDb();
  if (!db || !isFirebaseConfigured) {
    const id = generateId('srv');
    const existing = readLocal<Survey>(LOCAL_SURVEYS_KEY);
    writeLocal(LOCAL_SURVEYS_KEY, [{ ...cleanData, id }, ...existing]);
    return id;
  }

  const ref = await addDoc(collection(db, COLLECTIONS.SURVEYS), cleanData);
  return ref.id;
}

export async function updateSurvey(
  surveyId: string,
  patch: Partial<Omit<Survey, 'id'>>
): Promise<void> {
  const nextPatch = stripUndefinedDeep({ ...patch, updatedAt: Date.now() });
  const db = getDb();
  if (!db || !isFirebaseConfigured) {
    const existing = readLocal<Survey>(LOCAL_SURVEYS_KEY);
    writeLocal(
      LOCAL_SURVEYS_KEY,
      existing.map((s) => (s.id === surveyId ? { ...s, ...nextPatch } : s))
    );
    return;
  }

  await updateDoc(doc(db, COLLECTIONS.SURVEYS, surveyId), nextPatch);
}

export async function setSurveyStatus(surveyId: string, status: SurveyStatus): Promise<void> {
  await updateSurvey(surveyId, { status });
}

export async function deleteSurveyById(surveyId: string): Promise<void> {
  const db = getDb();
  if (!db || !isFirebaseConfigured) {
    const existing = readLocal<Survey>(LOCAL_SURVEYS_KEY);
    writeLocal(
      LOCAL_SURVEYS_KEY,
      existing.filter((s) => s.id !== surveyId)
    );
    return;
  }

  await deleteDoc(doc(db, COLLECTIONS.SURVEYS, surveyId));
}

/* --- Survey Responses --- */

export function subscribeSurveyResponses(
  surveyId: string,
  onData: (responses: SurveyResponse[]) => void,
  onError?: (err: Error) => void
): () => void {
  const db = getDb();
  if (!db || !isFirebaseConfigured) {
    const emit = () => {
      const list = readLocal<SurveyResponse>(LOCAL_RESPONSES_KEY)
        .filter((r) => r.surveyId === surveyId)
        .sort((a, b) => b.submittedAt - a.submittedAt);
      onData(list);
    };
    emit();
    localListeners.add(emit);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_RESPONSES_KEY) emit();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      localListeners.delete(emit);
      window.removeEventListener('storage', onStorage);
    };
  }

  const q = query(
    collection(db, COLLECTIONS.RESPONSES),
    where('surveyId', '==', surveyId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: SurveyResponse[] = snapshot.docs
        .map((d) => ({
          ...(d.data() as Omit<SurveyResponse, 'id'>),
          id: d.id,
        }))
        .sort((a, b) => b.submittedAt - a.submittedAt);
      onData(list);
    },
    (err) => onError?.(err)
  );
}

export async function submitSurveyResponse(
  response: Omit<SurveyResponse, 'id'>
): Promise<string> {
  const cleanResponse = stripUndefinedDeep(response);
  const db = getDb();
  if (!db || !isFirebaseConfigured) {
    const id = generateId('resp');
    const existingResponses = readLocal<SurveyResponse>(LOCAL_RESPONSES_KEY);
    writeLocal(LOCAL_RESPONSES_KEY, [{ ...cleanResponse, id }, ...existingResponses]);
    const existingSurveys = readLocal<Survey>(LOCAL_SURVEYS_KEY);
    writeLocal(
      LOCAL_SURVEYS_KEY,
      existingSurveys.map((s) =>
        s.id === cleanResponse.surveyId ? { ...s, responseCount: (s.responseCount || 0) + 1 } : s
      )
    );
    return id;
  }

  const ref = await addDoc(collection(db, COLLECTIONS.RESPONSES), cleanResponse);
  await updateDoc(doc(db, COLLECTIONS.SURVEYS, cleanResponse.surveyId), {
    responseCount: increment(1),
  }).catch(() => {
    // Non-fatal if rules restrict player updates to survey counter
  });
  return ref.id;
}

export async function deleteSurveyResponseById(
  responseId: string,
  surveyId: string
): Promise<void> {
  const db = getDb();
  if (!db || !isFirebaseConfigured) {
    const existingResponses = readLocal<SurveyResponse>(LOCAL_RESPONSES_KEY);
    const nextResponses = existingResponses.filter((r) => r.id !== responseId);
    writeLocal(LOCAL_RESPONSES_KEY, nextResponses);
    const countForSurvey = nextResponses.filter((r) => r.surveyId === surveyId).length;
    const existingSurveys = readLocal<Survey>(LOCAL_SURVEYS_KEY);
    writeLocal(
      LOCAL_SURVEYS_KEY,
      existingSurveys.map((s) => (s.id === surveyId ? { ...s, responseCount: countForSurvey } : s))
    );
    return;
  }

  await deleteDoc(doc(db, COLLECTIONS.RESPONSES, responseId));
  await updateDoc(doc(db, COLLECTIONS.SURVEYS, surveyId), {
    responseCount: increment(-1),
  }).catch(() => {
    // Non-fatal
  });
}

/* --- Teams / Rosters (`survey_teams`) --- */

export function subscribeTeams(
  onData: (teams: Team[]) => void,
  onError?: (err: Error) => void
): () => void {
  const db = getDb();
  if (!db || !isFirebaseConfigured) {
    const emit = () => {
      const list = readLocal<Team>(LOCAL_TEAMS_KEY).sort((a, b) => a.name.localeCompare(b.name));
      onData(list);
    };
    emit();
    localListeners.add(emit);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_TEAMS_KEY) emit();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      localListeners.delete(emit);
      window.removeEventListener('storage', onStorage);
    };
  }

  const q = query(collection(db, COLLECTIONS.TEAMS), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Team[] = snapshot.docs.map((d) => ({
        ...(d.data() as Omit<Team, 'id'>),
        id: d.id,
      }));
      onData(list);
    },
    (err) => onError?.(err)
  );
}

export async function createTeam(data: Omit<Team, 'id'>): Promise<string> {
  const cleanData = stripUndefinedDeep(data);
  const db = getDb();
  if (!db || !isFirebaseConfigured) {
    const id = generateId('team');
    const existing = readLocal<Team>(LOCAL_TEAMS_KEY);
    writeLocal(LOCAL_TEAMS_KEY, [...existing, { ...cleanData, id }]);
    return id;
  }

  const ref = await addDoc(collection(db, COLLECTIONS.TEAMS), cleanData);
  return ref.id;
}

export async function updateTeam(
  teamId: string,
  patch: Partial<Omit<Team, 'id'>>
): Promise<void> {
  const nextPatch = stripUndefinedDeep({ ...patch, updatedAt: Date.now() });
  const db = getDb();
  if (!db || !isFirebaseConfigured) {
    const existing = readLocal<Team>(LOCAL_TEAMS_KEY);
    writeLocal(
      LOCAL_TEAMS_KEY,
      existing.map((t) => (t.id === teamId ? { ...t, ...nextPatch } : t))
    );
    return;
  }

  await updateDoc(doc(db, COLLECTIONS.TEAMS, teamId), nextPatch);
}

export async function deleteTeamById(teamId: string): Promise<void> {
  const db = getDb();
  if (!db || !isFirebaseConfigured) {
    const existing = readLocal<Team>(LOCAL_TEAMS_KEY);
    writeLocal(
      LOCAL_TEAMS_KEY,
      existing.filter((t) => t.id !== teamId)
    );
    return;
  }

  await deleteDoc(doc(db, COLLECTIONS.TEAMS, teamId));
}
