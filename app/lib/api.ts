'use client';

import axios, { AxiosError } from 'axios';

const API_BASE_URL = 'https://aiasistsystembackend.onrender.com/api';

console.log('🔌 API Base URL:', API_BASE_URL);

// ─────────────────────────────────────────────────────────────
// Server wake-up
// Key fix: store a single shared Promise so multiple callers
// all wait on the SAME poll — no duplicate concurrent requests
// ─────────────────────────────────────────────────────────────
let _wakePromise: Promise<void> | null = null;
let serverReady = false;

export function waitForServer(timeoutMs = 60_000): Promise<void> {
  if (serverReady) return Promise.resolve();

  // Return the in-flight promise if one already exists
  if (_wakePromise) return _wakePromise;

  _wakePromise = (async () => {
    console.log('⏳ Waking server (Render cold start)…');
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      try {
        // Use no-cors so the health ping works even before CORS is confirmed
        const res = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          cache: 'no-store',
        });
        if (res.ok || res.status === 0 /* no-cors response */) {
          serverReady = true;
          console.log('✅ Server is awake!');
          return;
        }
      } catch {
        // still sleeping — keep polling
      }
      await new Promise((r) => setTimeout(r, 3_000));
    }

    _wakePromise = null; // allow retry next time
    throw new Error('Server did not wake up in time. Please try again.');
  })();

  return _wakePromise;
}

// Kick off wake-up immediately when this module is imported
// so the server is ready by the time the user clicks anything
if (typeof window !== 'undefined') {
  waitForServer().catch(() => {
    // Silent — errors surface when the user actually makes a request
  });
}

// ─────────────────────────────────────────────────────────────
// Axios instance — 60 s timeout to survive cold starts
// ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000,
});

// Attach auth token + log every outgoing request
api.interceptors.request.use(async (config) => {
  // ✅ KEY FIX: Every request waits for the server to be ready BEFORE sending
  await waitForServer();

  console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;
});

// Normalise errors with actionable hints
api.interceptors.response.use(
  (response) => {
    console.log(`📥 ${response.status} ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`;

    if (!error.response) {
      console.error('❌ Network Error — possible causes:');
      console.error('   1. CORS not configured correctly on backend');
      console.error('   2. Render service is suspended — check dashboard');
      console.error('   3. Backend crashed — check Render logs');
      console.error(`   URL: ${url}`);
    } else {
      console.error(`❌ API Error [${status}]: ${error.message} — ${url}`);
    }

    const message =
      (error.response?.data as { message?: string })?.message ??
      error.message ??
      'An unknown error occurred';

    return Promise.reject(new Error(message));
  }
);

// ─────────────────────────────────────────────────────────────
// Retry wrapper — on Network Error resets the wake state and
// retries ONCE (covers rare race where server restarted mid-session)
// ─────────────────────────────────────────────────────────────
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const isNetworkErr =
      err instanceof Error && err.message.toLowerCase().includes('network');

    if (isNetworkErr) {
      console.warn('🔄 Network error — resetting wake state and retrying…');
      serverReady = false;
      _wakePromise = null;
      await waitForServer();
      return fn();
    }

    throw err;
  }
}

// ==================== TYPES ====================

export interface JournalEntry {
  id: number;
  userId: string;
  ambience: string;
  text: string;
  emotion?: string;
  keywords?: string[];
  summary?: string;
  created_at: string;
}

export interface CreateEntryRequest {
  userId: string;
  ambience: string;
  text: string;
}

export interface EmotionAnalysis {
  emotion: string;
  keywords: string[];
  summary: string;
  cached?: boolean;
  fallback?: boolean;
  model?: string;
}

export interface AnalyzeRequest {
  text: string;
  entryId?: number;
}

export interface Insights {
  totalEntries: number;
  topEmotion: string;
  emotionCount: number;
  mostUsedAmbience: string;
  ambienceCount: number;
  recentKeywords: string[];
  emotionDistribution: EmotionDistributionItem[];
  weeklyTrend: WeeklyTrendItem[];
  generatedAt: string;
}

export interface EmotionDistributionItem {
  emotion: string;
  count: number;
}

export interface WeeklyTrendItem {
  week: string;
  entries: number;
  emotions: Record<string, number>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface StreamChunk {
  content?: string;
  full?: string;
  done: boolean;
  result?: EmotionAnalysis;
  error?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  ksize: number;
  vsize: number;
}

export interface ApiHealth {
  status: string;
  timestamp: string;
  env?: string;
}

// ==================== API FUNCTIONS ====================

export const journalApi = {
  healthCheck: async (): Promise<ApiHealth> => {
    const response = await api.get<ApiHealth>('/health');
    return response.data;
  },

  createEntry: async (
    data: CreateEntryRequest
  ): Promise<ApiResponse<JournalEntry>> =>
    withRetry(async () => {
      const response = await api.post<ApiResponse<JournalEntry>>('/journal', data);
      return response.data;
    }),

  getEntries: async (
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<ApiResponse<JournalEntry[]>> =>
    withRetry(async () => {
      const response = await api.get<ApiResponse<JournalEntry[]>>(
        `/journal/${userId}`,
        { params: { limit, offset } }
      );
      return response.data;
    }),

  analyzeText: async (
    data: AnalyzeRequest
  ): Promise<ApiResponse<EmotionAnalysis>> =>
    withRetry(async () => {
      const response = await api.post<ApiResponse<EmotionAnalysis>>(
        '/journal/analyze',
        data
      );
      return response.data;
    }),

  analyzeEntry: async (
    entryId: number
  ): Promise<ApiResponse<{ entryId: number; analysis: EmotionAnalysis }>> =>
    withRetry(async () => {
      const response = await api.post<
        ApiResponse<{ entryId: number; analysis: EmotionAnalysis }>
      >(`/journal/${entryId}/analyze`);
      return response.data;
    }),

  getInsights: async (userId: string): Promise<ApiResponse<Insights>> =>
    withRetry(async () => {
      const response = await api.get<ApiResponse<Insights>>(
        `/journal/insights/${userId}`
      );
      return response.data;
    }),

  streamAnalyze: async (
    text: string,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<void> => {
    await waitForServer();

    const response = await fetch(`${API_BASE_URL}/journal/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, stream: true }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Stream request failed [${response.status}]: ${errorText || response.statusText}`
      );
    }

    if (!response.body) throw new Error('No response body available for streaming');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;

          try {
            const parsed: StreamChunk = JSON.parse(data);
            onChunk(parsed);
            if (parsed.error) throw new Error(`Stream error: ${parsed.error}`);
          } catch (e) {
            if (e instanceof SyntaxError) {
              console.warn('⚠️ Could not parse SSE chunk:', data);
            } else {
              throw e;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  getCacheStats: async (): Promise<
    ApiResponse<{ keys: string[]; stats: CacheStats }>
  > => {
    const response = await api.get<ApiResponse<{ keys: string[]; stats: CacheStats }>>(
      '/journal/cache/stats'
    );
    return response.data;
  },

  clearCache: async (): Promise<ApiResponse<{ cleared: boolean }>> => {
    const response = await api.post<ApiResponse<{ cleared: boolean }>>(
      '/journal/cache/clear'
    );
    return response.data;
  },
};

export default api;