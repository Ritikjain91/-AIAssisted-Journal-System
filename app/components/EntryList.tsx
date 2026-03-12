'use client';

import { JSX, useState } from 'react';
import { journalApi, JournalEntry } from '@/app/lib/api';

interface EntryListProps {
  entries: JournalEntry[];
  loading: boolean;
  onEntryUpdated: () => void;
}

export default function EntryList({ entries, loading, onEntryUpdated }: EntryListProps): JSX.Element {
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);

  const handleAnalyze = async (entryId: number): Promise<void> => {
    setAnalyzingId(entryId);
    try {
      await journalApi.analyzeEntry(entryId);
      onEntryUpdated();
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzingId(null);
    }
  };

  const getEmotionClass = (emotion?: string): string => {
    if (!emotion) return 'emotion-neutral';
    return `emotion-${emotion.toLowerCase()}`;
  };

  if (loading) {
    return <div className="card">Loading entries...</div>;
  }

  if (entries.length === 0) {
    return <div className="card">No journal entries yet. Create your first entry!</div>;
  }

  return (
    <div className="card">
      <h2>📚 Your Journal Entries ({entries.length})</h2>
      {entries.map((entry) => (
        <div key={entry.id} className="entry-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
              {entry.ambience} Session
            </span>
            <span style={{ color: '#666', fontSize: '14px' }}>
              {new Date(entry.created_at).toLocaleDateString()}
            </span>
          </div>
          
          <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>{entry.text}</p>
          
          {entry.emotion ? (
            <div style={{ marginBottom: '12px' }}>
              <span className={`emotion-badge ${getEmotionClass(entry.emotion)}`}>
                {entry.emotion}
              </span>
              {entry.keywords?.map((kw: string) => (
                <span key={kw} className="keyword-tag">{kw}</span>
              ))}
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                {entry.summary}
              </p>
            </div>
          ) : (
            <button
              className="button"
              onClick={() => handleAnalyze(entry.id)}
              disabled={analyzingId === entry.id}
              style={{ fontSize: '14px', padding: '8px 16px' }}
            >
              {analyzingId === entry.id ? <span className="loading"></span> : '🔍 Analyze Emotion'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}