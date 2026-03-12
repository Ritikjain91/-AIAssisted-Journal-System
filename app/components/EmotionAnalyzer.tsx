'use client';

import { useState } from 'react';
import { journalApi, EmotionAnalysis, StreamChunk } from '@/app/lib/api';

export default function EmotionAnalyzer() {
  const [text, setText] = useState<string>('');
  const [analysis, setAnalysis] = useState<EmotionAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [streaming, setStreaming] = useState<boolean>(false);
  const [streamContent, setStreamContent] = useState<string>('');

  const handleAnalyze = async (): Promise<void> => {
    if (!text.trim()) return;
    
    setLoading(true);
    setAnalysis(null);
    
    try {
      const response = await journalApi.analyzeText({ text });
      setAnalysis(response.data);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStreamAnalyze = async (): Promise<void> => {
    if (!text.trim()) return;
    
    setStreaming(true);
    setStreamContent('');
    setAnalysis(null);
    
    try {
      await journalApi.streamAnalyze(text, (chunk: StreamChunk) => {
        setStreamContent(chunk.full || '');
        if (chunk.done && chunk.result) {
          setAnalysis(chunk.result);
        }
      });
    } catch (error) {
      console.error('Streaming failed:', error);
    } finally {
      setStreaming(false);
    }
  };

  const getEmotionClass = (emotion?: string): string => {
    if (!emotion) return 'emotion-neutral';
    return `emotion-${emotion.toLowerCase()}`;
  };

  return (
    <div className="card">
      <h2>🔮 Emotion Analyzer</h2>
      <p style={{ marginBottom: '16px', color: '#666' }}>
        Test the AI analysis with any text (no need to save to journal)
      </p>
      
      <textarea
        className="textarea"
        placeholder="Enter text to analyze emotions..."
        value={text}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
      />
      
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <button 
          className="button" 
          onClick={handleAnalyze}
          disabled={loading || !text.trim()}
        >
          {loading ? <span className="loading"></span> : 'Analyze (Normal)'}
        </button>
        
        <button 
          className="button" 
          onClick={handleStreamAnalyze}
          disabled={streaming || !text.trim()}
          style={{ background: '#764ba2' }}
        >
          {streaming ? <span className="loading"></span> : 'Analyze (Stream)'}
        </button>
      </div>

      {streaming && streamContent && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#f0f0f0', borderRadius: '8px' }}>
          <strong>Streaming:</strong>
          <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {streamContent}
          </pre>
        </div>
      )}
      
      {analysis && (
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <div style={{ marginBottom: '16px' }}>
            <strong>Detected Emotion:</strong>{' '}
            <span className={`emotion-badge ${getEmotionClass(analysis.emotion)}`}>
              {analysis.emotion}
            </span>
            {analysis.cached && <span className="keyword-tag">📦 Cached</span>}
            {analysis.fallback && <span className="keyword-tag">⚡ Fallback</span>}
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <strong>Keywords:</strong>
            <div style={{ marginTop: '8px' }}>
              {analysis.keywords.map((kw: string) => (
                <span key={kw} className="keyword-tag">{kw}</span>
              ))}
            </div>
          </div>
          
          <div>
            <strong>Summary:</strong>
            <p style={{ marginTop: '8px', fontStyle: 'italic', color: '#555' }}>
              {analysis.summary}
            </p>
          </div>
          
          {analysis.model && (
            <p style={{ marginTop: '16px', fontSize: '12px', color: '#999' }}>
              Model: {analysis.model}
            </p>
          )}
        </div>
      )}
    </div>
  );
}