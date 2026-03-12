'use client';

import { Insights as InsightsType } from '@/app/lib/api';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';

interface InsightsProps {
  insights: InsightsType | null;
  loading: boolean;
}

const COLORS: string[] = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];

interface EmotionDataItem {
  name: string;
  value: number;
}

interface TrendDataItem {
  name: string;
  entries: number;
}

export default function InsightsView({ insights, loading }: InsightsProps) {
  if (loading) {
    return <div className="card">Loading insights...</div>;
  }

  if (!insights) {
    return <div className="card">No insights available yet. Create some entries first!</div>;
  }

  const emotionData: EmotionDataItem[] = insights.emotionDistribution.map(item => ({
    name: item.emotion,
    value: item.count
  }));

  const trendData: TrendDataItem[] = insights.weeklyTrend.map(week => ({
    name: week.week,
    entries: week.entries
  }));

  return (
    <div>
      <div className="grid">
        <div className="insight-card">
          <h3>📝 Total Entries</h3>
          <p style={{ fontSize: '48px', fontWeight: 'bold', margin: '8px 0' }}>
            {insights.totalEntries}
          </p>
        </div>
        
        <div className="insight-card">
          <h3>💭 Top Emotion</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0', textTransform: 'capitalize' }}>
            {insights.topEmotion}
          </p>
          <p>{insights.emotionCount} entries</p>
        </div>
        
        <div className="insight-card">
          <h3>🌲 Favorite Ambience</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0', textTransform: 'capitalize' }}>
            {insights.mostUsedAmbience}
          </p>
          <p>{insights.ambienceCount} sessions</p>
        </div>
      </div>

      <div className="card">
        <h3>🔑 Recent Keywords</h3>
        <div style={{ marginTop: '12px' }}>
          {insights.recentKeywords.map((kw: string) => (
            <span key={kw} className="keyword-tag" style={{ fontSize: '16px', padding: '8px 16px' }}>
              {kw}
            </span>
          ))}
        </div>
      </div>

      {emotionData.length > 0 && (
        <div className="card">
          <h3>📊 Emotion Distribution</h3>
          <div style={{ height: '300px', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={emotionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name ?? 'Unknown'} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {emotionData.map((entry: EmotionDataItem, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {trendData.length > 0 && (
        <div className="card">
          <h3>📈 Weekly Trend</h3>
          <div style={{ height: '300px', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="entries" fill="#667eea" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
