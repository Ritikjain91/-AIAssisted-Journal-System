'use client';

import { useState, useEffect, useCallback,JSX } from 'react';
import { journalApi, JournalEntry, Insights } from '@/app/lib/api';
import JournalEntryForm from './JournalEntryForm';  // Changed import
import EntryList from './EntryList';
import EmotionAnalyzer from './EmotionAnalyzer';
import InsightsView from './Insights';

type Tab = 'entries' | 'analyze' | 'insights';

export default function JournalDashboard(): JSX.Element {
  const [userId, setUserId] = useState<string>('user-123');
  const [activeTab, setActiveTab] = useState<Tab>('entries');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchEntries = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await journalApi.getEntries(userId);
      setEntries(response.data);
    } catch (error) {
      console.error('Failed to fetch entries:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchInsights = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await journalApi.getInsights(userId);
      setInsights(response.data);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'entries') {
      fetchEntries();
    } else if (activeTab === 'insights') {
      fetchInsights();
    }
  }, [activeTab, fetchEntries, fetchInsights]);

  return (
    <div className="container">
      <header style={{ marginBottom: '32px', textAlign: 'center', color: 'white' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '8px' }}>🌿 ArvyaX Journal</h1>
        <p style={{ fontSize: '18px', opacity: 0.9 }}>
          AI-Assisted Journal System for Nature Sessions
        </p>
      </header>

      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <input
          type="text"
          value={userId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserId(e.target.value)}
          placeholder="Enter User ID"
          className="input"
          style={{ maxWidth: '300px', display: 'inline-block' }}
        />
      </div>

      <div className="tabs" style={{ justifyContent: 'center' }}>
        <button
          className={`tab ${activeTab === 'entries' ? 'active' : ''}`}
          onClick={() => setActiveTab('entries')}
        >
          📝 Journal Entries
        </button>
        <button
          className={`tab ${activeTab === 'analyze' ? 'active' : ''}`}
          onClick={() => setActiveTab('analyze')}
        >
          🔮 Emotion Analyzer
        </button>
        <button
          className={`tab ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          📊 Insights
        </button>
      </div>

      {activeTab === 'entries' && (
        <>
          <JournalEntryForm userId={userId} onEntryCreated={fetchEntries} />  {/* Changed component name */}
          <EntryList 
            entries={entries} 
            loading={loading} 
            onEntryUpdated={fetchEntries} 
          />
        </>
      )}

      {activeTab === 'analyze' && <EmotionAnalyzer />}

      {activeTab === 'insights' && <InsightsView insights={insights} loading={loading} />}
    </div>
  );
}