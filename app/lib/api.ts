// NO 'use server' directive - this is for client-side only
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api';  // Uses Next.js rewrites in development

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,  // 10 second timeout
});


// Types
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
  emotionDistribution: { emotion: string; count: number }[];
  weeklyTrend: WeeklyTrendItem[];
  generatedAt: string;
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

// API Functions
export const journalApi = {
  createEntry: async (data: CreateEntryRequest): Promise<ApiResponse<JournalEntry>> => {
    const response = await api.post<ApiResponse<JournalEntry>>('/journal', data);
    return response.data;
  },

  getEntries: async (userId: string, limit: number = 50, offset: number = 0): Promise<ApiResponse<JournalEntry[]>> => {
    const response = await api.get<ApiResponse<JournalEntry[]>>(`/journal/${userId}`, {
      params: { limit, offset },
    });
    return response.data;
  },

  analyzeText: async (data: AnalyzeRequest): Promise<ApiResponse<EmotionAnalysis>> => {
    const response = await api.post<ApiResponse<EmotionAnalysis>>('/journal/analyze', data);
    return response.data;
  },

  analyzeEntry: async (entryId: number): Promise<ApiResponse<{ entryId: number; analysis: EmotionAnalysis }>> => {
    const response = await api.post<ApiResponse<{ entryId: number; analysis: EmotionAnalysis }>>(`/journal/${entryId}/analyze`);
    return response.data;
  },

  getInsights: async (userId: string): Promise<ApiResponse<Insights>> => {
    const response = await api.get<ApiResponse<Insights>>(`/journal/insights/${userId}`);
    return response.data;
  },

  streamAnalyze: async (text: string, onChunk: (chunk: StreamChunk) => void): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/journal/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, stream: true }),
    });

    if (!response.body) {
      throw new Error('No response body available for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

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
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }
  },

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