import type {
  LoanApp,
  PredictResponse,
  LeaderboardResponse,
  Persona,
} from '@/types';

const BASE = import.meta.env.VITE_API_BASE ?? '';

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function fetchPersonas(): Promise<Persona[]> {
  return json<Persona[]>('/api/personas');
}

export async function fetchLeaderboard(): Promise<LeaderboardResponse> {
  return json<LeaderboardResponse>('/api/leaderboard');
}

export async function predictRisk(app: LoanApp): Promise<PredictResponse> {
  return json<PredictResponse>('/api/predict-risk', {
    method: 'POST',
    body: JSON.stringify(app),
  });
}