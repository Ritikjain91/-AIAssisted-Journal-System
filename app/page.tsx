'use client';

import { useState, useEffect } from 'react';
import { journalApi, JournalEntry, EmotionAnalysis, Insights, wakeServer } from '@/app/lib/api';

export default function Home() {
  const [userId, setUserId] = useState('user-123');
  const [ambience, setAmbience] = useState('forest');
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'waking' | 'ready' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [quickAnalysis, setQuickAnalysis] = useState<EmotionAnalysis | null>(null);

  const updateStatus = (state: typeof status, message: string) => {
    setStatus(state);
    setStatusMessage(message);
  };

  const loadData = async () => {
    try {
      updateStatus('waking', 'Connecting to backend...');
      await wakeServer();
      updateStatus('ready', 'Loading your journal...');
      
      const [entriesRes, insightsRes] = await Promise.all([
        journalApi.getEntries(userId),
        journalApi.getInsights(userId),
      ]);
      
      setEntries(entriesRes.data || []);
      setInsights(insightsRes.data);
      updateStatus('ready', `Loaded ${entriesRes.data?.length || 0} entries`);
    } catch (err: any) {
      updateStatus('error', err.message);
    }
  };

  const createEntry = async () => {
    if (!text.trim()) return;
    
    setLoading(true);
    updateStatus('waking', 'Saving entry...');
    
    try {
      await journalApi.createEntry({ userId, ambience, text });
      setText('');
      setQuickAnalysis(null);
      await loadData();
    } catch (err: any) {
      updateStatus('error', err.message);
    }
    
    setLoading(false);
  };

  const analyzeNow = async () => {
    if (!text.trim()) return;
    
    setLoading(true);
    updateStatus('waking', 'Analyzing emotions...');
    
    try {
      const res = await journalApi.analyzeText(text);
      setQuickAnalysis(res.data);
      updateStatus('ready', `Detected: ${res.data.emotion}`);
    } catch (err: any) {
      updateStatus('error', err.message);
    }
    
    setLoading(false);
  };

  const analyzeEntry = async (entry: JournalEntry) => {
    setAnalyzingId(entry.id);
    updateStatus('waking', `Analyzing entry #${entry.id}...`);
    
    try {
      await journalApi.analyzeEntry(entry.id);
      await loadData();
    } catch (err: any) {
      updateStatus('error', err.message);
    }
    
    setAnalyzingId(null);
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const getStatusColor = () => {
    switch (status) {
      case 'ready': return '#4caf50';
      case 'waking': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: 32 }}>🌿 ArvyaX Journal</h1>
        <p style={{ margin: 0, color: '#666' }}>AI-Assisted Emotion Tracking</p>
      </div>

      {/* Status Bar */}
      <div style={{ 
        padding: 12, 
        background: getStatusColor() + '15', 
        borderLeft: `4px solid ${getStatusColor()}`,
        borderRadius: 4,
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>
          <span style={{ 
            display: 'inline-block', 
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            background: getStatusColor(),
            marginRight: 8 
          }} />
          {statusMessage}
        </span>
        {status === 'error' && (
          <button 
            onClick={loadData}
            style={{ padding: '6px 12px', fontSize: 12, border: 'none', borderRadius: 4, background: '#333', color: 'white' }}
          >
            🔄 Retry
          </button>
        )}
      </div>

      {/* New Entry Form */}
      <div style={{ background: 'white', padding: 24, borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, marginBottom: 20 }}>✍️ New Journal Entry</h2>
        
        <div style={{ display: 'grid', gap: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>User ID</label>
              <input 
                type="text" 
                value={userId} 
                onChange={e => setUserId(e.target.value)}
                style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, width: 150 }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Ambience</label>
              <select 
                value={ambience} 
                onChange={e => setAmbience(e.target.value)}
                style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, width: 150 }}
              >
                <option value="forest">🌲 Forest</option>
                <option value="ocean">🌊 Ocean</option>
                <option value="mountain">⛰️ Mountain</option>
                <option value="rain">🌧️ Rain</option>
                <option value="night">🌙 Night Sky</option>
              </select>
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Your Thoughts</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="How are you feeling right now? Describe your emotions, thoughts, and experience..."
              rows={4}
              style={{ 
                width: '100%', 
                padding: 12, 
                border: '1px solid #ddd', 
                borderRadius: 6,
                fontSize: 14,
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* Quick Analysis Result */}
        {quickAnalysis && (
          <div style={{ 
            padding: 16, 
            background: '#e3f2fd', 
            borderRadius: 8, 
            marginBottom: 16,
            borderLeft: '4px solid #2196f3'
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>😊 {quickAnalysis.emotion}</div>
            <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>{quickAnalysis.summary}</div>
            <div style={{ fontSize: 12, color: '#777' }}>
              Keywords: {quickAnalysis.keywords?.join(', ')}
              {quickAnalysis.cached && <span style={{ color: '#4caf50', marginLeft: 8 }}>(cached)</span>}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={createEntry}
            disabled={loading || !text.trim()}
            style={{
              padding: '12px 24px',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500
            }}
          >
            {loading ? '⏳ Saving...' : '📝 Save Entry'}
          </button>
          
          <button
            onClick={analyzeNow}
            disabled={loading || !text.trim()}
            style={{
              padding: '12px 24px',
              background: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500
            }}
          >
            {loading ? '⏳ Analyzing...' : '🔍 Analyze Now'}
          </button>
        </div>
      </div>

      {/* Insights Panel */}
      {insights && insights.totalEntries > 0 && (
        <div style={{ background: 'white', padding: 24, borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginTop: 0, marginBottom: 20 }}>📊 Your Insights</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#4caf50' }}>{insights.totalEntries}</div>
              <div style={{ fontSize: 12, color: '#666' }}>Total Entries</div>
            </div>
            
            <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#2196f3', textTransform: 'capitalize' }}>
                {insights.topEmotion || '—'}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                Top Emotion ({insights.emotionCount}x)
              </div>
            </div>
            
            <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff9800', textTransform: 'capitalize' }}>
                {insights.mostUsedAmbience || '—'}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                Favorite Scene ({insights.ambienceCount}x)
              </div>
            </div>
          </div>

          {insights.recentKeywords.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Recent Themes</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {insights.recentKeywords.map((keyword, i) => (
                  <span 
                    key={i}
                    style={{ 
                      padding: '6px 12px', 
                      background: '#e8f5e9', 
                      color: '#2e7d32',
                      borderRadius: 16,
                      fontSize: 12
                    }}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Entries List */}
      <div>
        <h2 style={{ marginBottom: 16 }}>📚 Previous Entries</h2>
        
        {entries.length === 0 ? (
          <div style={{ 
            padding: 40, 
            textAlign: 'center', 
            background: 'white', 
            borderRadius: 12,
            color: '#999'
          }}>
            No entries yet. Write your first journal entry above! ✍️
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {entries.map((entry) => (
              <div 
                key={entry.id}
                style={{ 
                  background: 'white', 
                  padding: 20, 
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  borderLeft: entry.emotion ? `4px solid ${getEmotionColor(entry.emotion)}` : '4px solid #ddd'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: 12 
                }}>
                  <div>
                    <span style={{ 
                      padding: '4px 12px', 
                      background: '#f0f0f0', 
                      borderRadius: 12,
                      fontSize: 12,
                      textTransform: 'capitalize',
                      marginRight: 8
                    }}>
                      {entry.ambience === 'forest' && '🌲'}
                      {entry.ambience === 'ocean' && '🌊'}
                      {entry.ambience === 'mountain' && '⛰️'}
                      {entry.ambience === 'rain' && '🌧️'}
                      {entry.ambience === 'night' && '🌙'}
                      {' '}{entry.ambience}
                    </span>
                    <span style={{ fontSize: 12, color: '#999' }}>
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  {!entry.emotion && (
                    <button
                      onClick={() => analyzeEntry(entry)}
                      disabled={analyzingId === entry.id}
                      style={{
                        padding: '8px 16px',
                        background: '#2196f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12
                      }}
                    >
                      {analyzingId === entry.id ? '⏳' : '🔍 Analyze'}
                    </button>
                  )}
                </div>

                <p style={{ margin: '0 0 12px 0', lineHeight: 1.6, fontSize: 15 }}>{entry.text}</p>

                {entry.emotion && (
                  <div style={{ 
                    padding: 12, 
                    background: '#f5f5f5', 
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}>
                    <span style={{ fontSize: 28 }}>{getEmotionEmoji(entry.emotion)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: 600, 
                        textTransform: 'capitalize',
                        color: getEmotionColor(entry.emotion)
                      }}>
                        {entry.emotion}
                      </div>
                      <div style={{ fontSize: 13, color: '#666' }}>{entry.summary}</div>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                        {entry.keywords?.join(', ')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getEmotionColor(emotion: string): string {
  const colors: Record<string, string> = {
    calm: '#4caf50',
    happy: '#ffeb3b',
    sad: '#2196f3',
    anxious: '#ff9800',
    angry: '#f44336',
    focused: '#9c27b0',
    neutral: '#9e9e9e'
  };
  return colors[emotion] || '#9e9e9e';
}

function getEmotionEmoji(emotion: string): string {
  const emojis: Record<string, string> = {
    calm: '😌',
    happy: '😊',
    sad: '😢',
    anxious: '😰',
    angry: '😠',
    focused: '🎯',
    neutral: '😐'
  };
  return emojis[emotion] || '😐';
}