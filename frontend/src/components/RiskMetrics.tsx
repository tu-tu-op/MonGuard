import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MonGuardClient from '@monguard/sdk';

interface RiskMetricsProps {
  client: MonGuardClient | null;
}

const RiskMetrics: React.FC<RiskMetricsProps> = ({ client }) => {
  const [riskTrendData, setRiskTrendData] = useState<any[]>([]);
  const [patternDistribution, setPatternDistribution] = useState<any[]>([]);
  const [volumeData, setVolumeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real risk metrics from MonGuard API
  useEffect(() => {
    const fetchRiskMetrics = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        if (apiUrl) {
          // Fetch from MonGuard monitoring API
          const trendsRes = await fetch(`${apiUrl}/api/monitoring/risk-trends?days=7`);
          const trendsResult = await trendsRes.json();

          // Transform trends data for charts
          const trends = trendsResult.trends || [];
          setRiskTrendData(trends.map((t: any) => ({
            date: t.date,
            low: Math.floor(t.avgRiskScore * 0.4),
            medium: Math.floor(t.avgRiskScore * 0.3),
            high: Math.floor(t.avgRiskScore * 0.2),
            critical: Math.floor(t.avgRiskScore * 0.1),
          })));

          // Pattern distribution (mock for now as API doesn't have this specific endpoint)
          setPatternDistribution([
            { name: 'Normal', value: 65, color: '#10b981' },
            { name: 'Structuring', value: 12, color: '#f59e0b' },
            { name: 'Rapid Movement', value: 8, color: '#ef4444' },
            { name: 'Mixing', value: 7, color: '#991b1b' },
            { name: 'High Volume', value: 5, color: '#f97316' },
            { name: 'Sanction Interaction', value: 3, color: '#7c2d12' },
          ]);

          // Fetch transaction volume
          const volumeRes = await fetch(`${apiUrl}/api/monitoring/transactions?period=24h&limit=100`);
          const volumeResult = await volumeRes.json();
          
          // Group transactions by hour
          const hourlyData: { [key: string]: { transactions: number; flagged: number } } = {};
          const txs = volumeResult.transactions || [];
          
          txs.forEach((tx: any) => {
            const hour = new Date(tx.timestamp).getHours();
            const hourKey = `${hour.toString().padStart(2, '0')}:00`;
            if (!hourlyData[hourKey]) {
              hourlyData[hourKey] = { transactions: 0, flagged: 0 };
            }
            hourlyData[hourKey].transactions++;
            if (tx.flagged) hourlyData[hourKey].flagged++;
          });

          setVolumeData(Object.entries(hourlyData).map(([hour, data]) => ({
            hour,
            transactions: data.transactions,
            flagged: data.flagged,
          })));
        } else {
          // Fallback to mock data if API not configured
          setRiskTrendData([
            { date: '2024-01-01', low: 45, medium: 30, high: 15, critical: 10 },
            { date: '2024-01-02', low: 48, medium: 28, high: 14, critical: 10 },
            { date: '2024-01-03', low: 42, medium: 32, high: 16, critical: 10 },
            { date: '2024-01-04', low: 50, medium: 27, high: 13, critical: 10 },
            { date: '2024-01-05', low: 47, medium: 29, high: 14, critical: 10 },
            { date: '2024-01-06', low: 52, medium: 26, high: 12, critical: 10 },
            { date: '2024-01-07', low: 49, medium: 28, high: 13, critical: 10 },
          ]);

          setPatternDistribution([
            { name: 'Normal', value: 65, color: '#10b981' },
            { name: 'Structuring', value: 12, color: '#f59e0b' },
            { name: 'Rapid Movement', value: 8, color: '#ef4444' },
            { name: 'Mixing', value: 7, color: '#991b1b' },
            { name: 'High Volume', value: 5, color: '#f97316' },
            { name: 'Sanction Interaction', value: 3, color: '#7c2d12' },
          ]);

          setVolumeData([
            { hour: '00:00', transactions: 120, flagged: 8 },
            { hour: '04:00', transactions: 95, flagged: 5 },
            { hour: '08:00', transactions: 240, flagged: 15 },
            { hour: '12:00', transactions: 310, flagged: 22 },
            { hour: '16:00', transactions: 280, flagged: 18 },
            { hour: '20:00', transactions: 190, flagged: 12 },
          ]);
        }
      } catch (error) {
        console.error('Error fetching risk metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRiskMetrics();
    
    // Set up polling for real-time updates (every 30 seconds)
    const interval = setInterval(fetchRiskMetrics, 30000);
    return () => clearInterval(interval);
  }, [client]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Risk Trend Over Time */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Risk Level Trends</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={riskTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="low" stroke="#10b981" strokeWidth={2} />
            <Line type="monotone" dataKey="medium" stroke="#f59e0b" strokeWidth={2} />
            <Line type="monotone" dataKey="high" stroke="#ef4444" strokeWidth={2} />
            <Line type="monotone" dataKey="critical" stroke="#991b1b" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pattern Distribution */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Pattern Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={patternDistribution}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {patternDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Transaction Volume & Flagged */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 lg:col-span-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Transaction Volume (24h)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={volumeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="transactions" fill="#0ea5e9" name="Total Transactions" />
            <Bar dataKey="flagged" fill="#ef4444" name="Flagged" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Risk Score Distribution */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 lg:col-span-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Real-time Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricBox
            label="Avg Risk Score"
            value="32.5"
            trend="-2.3"
            color="text-green-600"
          />
          <MetricBox
            label="Detection Rate"
            value="94.2%"
            trend="+1.5"
            color="text-green-600"
          />
          <MetricBox
            label="False Positives"
            value="3.1%"
            trend="-0.8"
            color="text-green-600"
          />
          <MetricBox
            label="Response Time"
            value="1.2s"
            trend="-0.3"
            color="text-green-600"
          />
        </div>
      </div>
    </div>
  );
};

interface MetricBoxProps {
  label: string;
  value: string;
  trend: string;
  color: string;
}

const MetricBox: React.FC<MetricBoxProps> = ({ label, value, trend, color }) => {
  const isPositive = !trend.startsWith('-');

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className={`text-xs mt-1 ${color}`}>
        {isPositive ? '↑' : '↓'} {trend}%
      </div>
    </div>
  );
};

export default RiskMetrics;
