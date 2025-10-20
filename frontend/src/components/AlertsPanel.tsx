import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import MonGuardClient from '@monguard/sdk';

enum AlertSeverity {
  INFO = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

enum PatternType {
  NORMAL = 0,
  STRUCTURING = 1,
  RAPID_MOVEMENT = 2,
  MIXING = 3,
  HIGH_VOLUME = 4,
  SANCTION_INTERACTION = 5,
}

interface Alert {
  id: string;
  severity: AlertSeverity;
  pattern: PatternType;
  address: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
  anomalyScore: number;
}

interface AlertsPanelProps {
  client: MonGuardClient | null;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ client }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'critical'>('unresolved');
  const [loading, setLoading] = useState(true);

  // Fetch real alerts from MonGuard API
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        if (apiUrl) {
          // Fetch from MonGuard monitoring API
          const response = await fetch(`${apiUrl}/api/monitoring/alerts?limit=20`);
          const result = await response.json();
          
          const apiAlerts = result.alerts || [];
          
          setAlerts(apiAlerts.map((alert: any) => ({
            id: alert.id,
            severity: AlertSeverity[alert.severity as keyof typeof AlertSeverity] || AlertSeverity.INFO,
            pattern: PatternType[alert.pattern as keyof typeof PatternType] || PatternType.NORMAL,
            address: alert.address,
            description: alert.description,
            timestamp: new Date(alert.timestamp),
            resolved: alert.status === 'resolved',
            anomalyScore: alert.anomalyScore || 0,
          })));
        } else {
          // Fallback to mock data if API not configured
          const mockAlerts: Alert[] = [
            {
              id: '1',
              severity: AlertSeverity.CRITICAL,
              pattern: PatternType.SANCTION_INTERACTION,
              address: '0x1234...5678',
              description: 'Transaction with sanctioned address detected',
              timestamp: new Date(Date.now() - 300000),
              resolved: false,
              anomalyScore: 95,
            },
            {
              id: '2',
              severity: AlertSeverity.HIGH,
              pattern: PatternType.MIXING,
              address: '0x2345...6789',
              description: 'Potential mixing service usage detected',
              timestamp: new Date(Date.now() - 600000),
              resolved: false,
              anomalyScore: 82,
            },
            {
              id: '3',
              severity: AlertSeverity.MEDIUM,
              pattern: PatternType.RAPID_MOVEMENT,
              address: '0x3456...7890',
              description: 'Rapid fund movement across multiple wallets',
              timestamp: new Date(Date.now() - 900000),
              resolved: false,
              anomalyScore: 68,
            },
            {
              id: '4',
              severity: AlertSeverity.HIGH,
              pattern: PatternType.STRUCTURING,
              address: '0x4567...8901',
              description: 'Structured transactions to avoid detection',
              timestamp: new Date(Date.now() - 1200000),
              resolved: true,
              anomalyScore: 75,
            },
            {
              id: '5',
              severity: AlertSeverity.LOW,
              pattern: PatternType.HIGH_VOLUME,
              address: '0x5678...9012',
              description: 'Unusually high transaction volume',
              timestamp: new Date(Date.now() - 1800000),
              resolved: false,
              anomalyScore: 45,
            },
          ];
          setAlerts(mockAlerts);
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    
    // Set up polling for real-time updates (every 5 seconds)
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, [client]);

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unresolved') return !alert.resolved;
    if (filter === 'critical') return alert.severity === AlertSeverity.CRITICAL;
    return true;
  });

  const getSeverityColor = (severity: AlertSeverity): string => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'bg-red-100 text-red-800 border-red-300';
      case AlertSeverity.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case AlertSeverity.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case AlertSeverity.LOW:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityLabel = (severity: AlertSeverity): string => {
    return AlertSeverity[severity];
  };

  const getPatternLabel = (pattern: PatternType): string => {
    return PatternType[pattern].replace('_', ' ');
  };

  const getSeverityIcon = (severity: AlertSeverity): string => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return '🚨';
      case AlertSeverity.HIGH:
        return '⚠️';
      case AlertSeverity.MEDIUM:
        return '⚡';
      case AlertSeverity.LOW:
        return 'ℹ️';
      default:
        return '📋';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-2 text-sm font-medium ${
            filter === 'all'
              ? 'border-b-2 border-primary-500 text-primary-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          All ({alerts.length})
        </button>
        <button
          onClick={() => setFilter('unresolved')}
          className={`px-3 py-2 text-sm font-medium ${
            filter === 'unresolved'
              ? 'border-b-2 border-primary-500 text-primary-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Unresolved ({alerts.filter(a => !a.resolved).length})
        </button>
        <button
          onClick={() => setFilter('critical')}
          className={`px-3 py-2 text-sm font-medium ${
            filter === 'critical'
              ? 'border-b-2 border-primary-500 text-primary-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Critical ({alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length})
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">✅</div>
            <p>No alerts to display</p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)} ${
                alert.resolved ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2 flex-1">
                  <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-semibold uppercase">
                        {getSeverityLabel(alert.severity)}
                      </span>
                      <span className="text-xs text-gray-600">•</span>
                      <span className="text-xs text-gray-600">
                        {getPatternLabel(alert.pattern)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {alert.description}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <span className="font-mono">{alert.address}</span>
                      <span>•</span>
                      <span>Score: {alert.anomalyScore}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(alert.timestamp, { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>

                {!alert.resolved && (
                  <button className="ml-2 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50">
                    Resolve
                  </button>
                )}
              </div>

              {/* Anomaly Score Bar */}
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      alert.anomalyScore >= 90
                        ? 'bg-red-600'
                        : alert.anomalyScore >= 70
                        ? 'bg-orange-500'
                        : alert.anomalyScore >= 50
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${alert.anomalyScore}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <div className="pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-xs text-gray-600">Active Alerts</div>
            <div className="text-lg font-bold text-gray-900">
              {alerts.filter(a => !a.resolved).length}
            </div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-xs text-gray-600">Avg Score</div>
            <div className="text-lg font-bold text-gray-900">
              {(alerts.reduce((sum, a) => sum + a.anomalyScore, 0) / alerts.length).toFixed(0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertsPanel;
