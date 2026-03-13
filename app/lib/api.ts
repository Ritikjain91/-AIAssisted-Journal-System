'use client';

import axios, { AxiosError } from 'axios';

// ═════════════════════════════════════════════════════════════
// CONFIGURATION
// ═════════════════════════════════════════════════════════════

const getApiUrl = (): string => {
  // Next.js public env var (available in browser)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  
  // Fallback for production
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    return 'https://aiasistsystembackend.onrender.com';
  }
  
  // Local development
  return 'http://localhost:3001';
};

export const API_BASE_URL = getApiUrl();
console.log('🔌 API URL:', API_BASE_URL);

// ═════════════════════════════════════════════════════════════
// SERVER WAKE-UP HANDLER
// ═════════════════════════════════════════════════════════════

interface WakeState {
  ready: boolean;
  promise: Promise<void> | null;
  attempts: number;
}

const wakeState: WakeState = {
  ready: false,
  promise: null,
  attempts: 0,
};

export function resetWakeState(): void {
  wakeState.ready = false;
  wakeState.promise = null;
  wakeState.attempts = 0;
}

export async function wakeServer(maxWaitMs = 120000): Promise<void> {
  if (wakeState.ready) return;
  if (wakeState.promise) return wakeState.promise;

  wakeState.promise = (async () => {
    console.log('🌙 Waking up Render backend (30-60s on free tier)...');
    const deadline = Date.now() + maxWaitMs;
    
    while (Date.now() < deadline) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const res = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        });
        
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const data = await res.json();
          wakeState.ready = true;
          console.log('✅ Backend awake!', data);
          return;
        }
      } catch (e) {
        // Server still sleeping
      }
      
      wakeState.attempts++;
      if (wakeState.attempts % 3 === 0) {
        console.log(`⏳ Still waking... (${Math.floor((Date.now() - (deadline - maxWaitMs)) / 1000)}s)`);
      }
      
      await new Promise(r => setTimeout(r, 3000));
    }
    
    resetWakeState();
    throw new Error(
      '⏰ Backend failed to wake up.\n\n' +
      'Render free tier takes 30-60s to start.\n' +
      'Check: https://dashboard.render.com'
    );
  })();

  return wakeState.promise;
}

// Auto-warm on client load
if (typeof window !== 'undefined') {
  wakeServer().catch(() => {});
}

// ═════════════════════════════════════════════════════════════
// AXIOS INSTANCE
// ═════════════════════════════════════════════════════════════

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  if (!config.url?.includes('/health')) {
    await wakeServer();
  }
  console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

api.interceptors.response.use(
  (res) => {
    console.log(`✅ ${res.status} ${res.config.url}`);
    return res;
  },
  (err: AxiosError) => {
    if (!err.response) {
      console.error('❌ Network Error:', err.message);
      console.error('   Backend:', API_BASE_URL);
    }
    return Promise.reject(err);
  }
);

// ═════════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════════

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

export interface EmotionAnalysis {
  emotion: string;
  keywords: string[];
  summary: string;
  cached?: boolean;
  fallback?: boolean;
}

export interface Insights {
  totalEntries: number;
  topEmotion: string;
  emotionCount: number;
  mostUsedAmbience: string;
  ambienceCount: number;
  recentKeywords: string[];
  emotionDistribution: Array<{ emotion: string; count: number }>;
  weeklyTrend: Array<{ week: string; entries: number; emotions: Record<string, number> }>;
  generatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ═════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═════════════════════════════════════════════════════════════

export const journalApi = {
  // Health check
  health: async (): Promise<{ status: string; timestamp: string }> => {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  // Server status for UI
  getStatus: () => ({
    ready: wakeState.ready,
    attempts: wakeState.attempts,
  }),

  // Reconnect button
  reconnect: async (): Promise<void> => {
    resetWakeState();
    await wakeServer();
  },

  // Entries
  createEntry: async (data: { userId: string; ambience: string; text: string }): Promise<ApiResponse<JournalEntry>> => {
    const res = await api.post('/journal', data);
    return res.data;
  },

  getEntries: async (userId: string): Promise<ApiResponse<JournalEntry[]>> => {
    const res = await api.get(`/journal/${userId}`);
    return res.data;
  },

  // Analysis
  analyzeText: async (text: string, entryId?: number): Promise<ApiResponse<EmotionAnalysis>> => {
    const res = await api.post('/journal/analyze', { text, entryId });
    return res.data;
  },

  analyzeEntry: async (entryId: number): Promise<ApiResponse<{ entryId: number; analysis: EmotionAnalysis }>> => {
    const res = await api.post(`/journal/${entryId}/analyze`);
    return res.data;
  },

  // Insights
  getInsights: async (userId: string): Promise<ApiResponse<Insights>> => {
    const res = await api.get(`/journal/insights/${userId}`);
    return res.data;
  },

  // Cache management
  getCacheStats: async (): Promise<ApiResponse<{ keys: string[]; stats: { keys: number } }>> => {
    const res = await api.get('/journal/cache/stats');
    return res.data;
  },

  clearCache: async (): Promise<ApiResponse<{ cleared: boolean }>> => {
    const res = await api.post('/journal/cache/clear');
    return res.data;
  },
};

export default api;