'use client';

import axios, { AxiosError } from 'axios';

// ==================== CONFIGURATION ====================

// Fix: Always append /api to the base URL
const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE_URL = `${rawUrl.replace(/\/$/, '')}/api`;

const ENABLE_STREAMING = process.env.NEXT_PUBLIC_ENABLE_STREAMING === 'true';

console.log('🔌 API Base URL:', API_BASE_URL);
console.log('⚡ Streaming Enabled:', ENABLE_STREAMING);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor for debugging
api.interceptors.request.use((config) => {
  console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`📥 ${response.status} ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    return Promise.reject(error);
  }
);

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
  stream?: boolean;
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
  // Health check
  healthCheck: async (): Promise<ApiHealth> => {
    const response = await api.get<ApiHealth>('/health');
    return response.data;
  },

  // Create a new journal entry
  createEntry: async (data: CreateEntryRequest): Promise<ApiResponse<JournalEntry>> => {
    const response = await api.post<ApiResponse<JournalEntry>>('/journal', data);
    return response.data;
  },

  // Get all entries for a user
  getEntries: async (userId: string, limit: number = 50, offset: number = 0): Promise<ApiResponse<JournalEntry[]>> => {
    const response = await api.get<ApiResponse<JournalEntry[]>>(`/journal/${userId}`, {
      params: { limit, offset },
    });
    return response.data;
  },

  // Analyze text for emotions
  analyzeText: async (data: AnalyzeRequest): Promise<ApiResponse<EmotionAnalysis>> => {
    const response = await api.post<ApiResponse<EmotionAnalysis>>('/journal/analyze', data);
    return response.data;
  },

  // Analyze existing entry by ID
  analyzeEntry: async (entryId: number): Promise<ApiResponse<{ entryId: number; analysis: EmotionAnalysis }>> => {
    const response = await api.post<ApiResponse<{ entryId: number; analysis: EmotionAnalysis }>>(`/journal/${entryId}/analyze`);
    return response.data;
  },

  // Get insights for a user
  getInsights: async (userId: string): Promise<ApiResponse<Insights>> => {
    const response = await api.get<ApiResponse<Insights>>(`/journal/insights/${userId}`);
    return response.data;
  },

  // Stream analysis (for real-time updates)
  streamAnalyze: async (text: string, onChunk: (chunk: StreamChunk) => void): Promise<void> => {
    if (!ENABLE_STREAMING) {
      throw new Error('Streaming is disabled');
    }

    const response = await fetch(`${API_BASE_URL}/journal/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body available for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            
            try {
              const parsed: StreamChunk = JSON.parse(data);
              onChunk(parsed);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              if (e instanceof Error && e.message !== 'Failed to parse final result') {
                console.warn('Parse error:', e);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  // Cache management (for debugging/admin)
  getCacheStats: async (): Promise<ApiResponse<{ keys: string[]; stats: CacheStats }>> => {
    const response = await api.get<ApiResponse<{ keys: string[]; stats: CacheStats }>>('/journal/cache/stats');
    return response.data;
  },

  clearCache: async (): Promise<ApiResponse<{ cleared: boolean }>> => {
    const response = await api.post<ApiResponse<{ cleared: boolean }>>('/journal/cache/clear');
    return response.data;
  },
};

export default api;