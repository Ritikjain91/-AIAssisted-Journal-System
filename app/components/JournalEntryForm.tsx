'use client';

import { useState,JSX} from 'react';
import axios from 'axios';
import { journalApi, CreateEntryRequest } from '@/app/lib/api';

interface JournalEntryFormProps {
  userId: string;
  onEntryCreated: () => void;
}

export default function JournalEntryForm({ userId, onEntryCreated }: JournalEntryFormProps): JSX.Element {
  const [ambience, setAmbience] = useState<string>('forest');
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const data: CreateEntryRequest = { userId, ambience, text };
      await journalApi.createEntry(data);
      setMessage('✅ Entry created successfully!');
      setText('');
      onEntryCreated();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
      } else {
        setMessage('❌ An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>📝 New Journal Entry</h2>
      <form onSubmit={handleSubmit}>
        <select
          className="select"
          value={ambience}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAmbience(e.target.value)}
        >
          <option value="forest">🌲 Forest</option>
          <option value="ocean">🌊 Ocean</option>
          <option value="mountain">⛰️ Mountain</option>
          <option value="rain">🌧️ Rain</option>
          <option value="desert">🏜️ Desert</option>
          <option value="meadow">🌻 Meadow</option>
        </select>

        <textarea
          className="textarea"
          placeholder="How was your nature session? Describe your feelings and experience..."
          value={text}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
          required
        />

        <button 
          type="submit" 
          className="button" 
          disabled={loading || !text.trim()}
        >
          {loading ? <span className="loading"></span> : 'Save Entry'}
        </button>

        {message && <p style={{ marginTop: '12px' }}>{message}</p>}
      </form>
    </div>
  );
}