'use client';

import { useState } from 'react';
import { ShieldAlert, AlertTriangle, Search, Filter, Eye, Ban, CheckCircle, Gauge, Activity, Globe } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import AlertBanner from '@/components/AlertBanner';
import { useToast } from '@/components/Toast';
import type { FraudAlert, DataTableColumn } from '@/types';

const mockFraudAlerts: FraudAlert[] = [
  { id: 'fa_001', transactionId: 'txn_1003', severity: 'critical', ruleName: 'Velocity Check', description: 'Multiple transactions from same IP in 5 minutes', timestamp: '2024-03-15T10:32:00Z', status: 'open', riskScore: 92, transaction: { id: 'txn_1003', amount: 450.00, currency: 'EUR', status: 'declined', merchantId: 'm_001', customerEmail: 'charlie@example.com', paymentMethod: 'visa', timestamp: '2024-03-15T10:30:00Z', riskScore: 92, country: 'DE' } },
  { id: 'fa_002', transactionId: 'txn_1007', severity: 'high', ruleName: 'Amount Threshold', description: 'Transaction exceeds $3,000 threshold', timestamp: '2024-03-15T09:15:00Z', status: 'investigating', riskScore: 78, transaction: { id: 'txn_1007', amount: 3200.00, currency: 'USD', status: 'pending', merchantId: 'm_001', customerEmail: 'grace@example.com', paymentMethod: 'visa', timestamp: '2024-03-15T09:14:00Z', riskScore: 78, country: 'US' } },
  { id: 'fa_003', transactionId: 'txn_1010', severity: 'medium', ruleName: 'Geo Anomaly', description: 'Transaction from high-risk country (NG)', timestamp: '2024-03-15T08:45:00Z', status: 'open', riskScore: 65, transaction: { id: 'txn_1010', amount: 1290.00, currency: 'USD', status: 'pending', merchantId: 'm_005', customerEmail: 'unknown@example.com', paymentMethod: 'mastercard', timestamp: '2024-03-15T08:44:00Z', riskScore: 65, country: 'NG' } },
  { id: 'fa_004', transactionId: 'txn_1012', severity: 'low', ruleName: 'Card BIN Check', description: 'BIN associated with recent fraud reports', timestamp: '2024-03-14T22:10:00Z', status: 'resolved', riskScore: 35, transaction: { id: 'txn_1012', amount: 89.99, currency: 'USD', status: 'declined', merchantId: 'm_002', customerEmail: 'test@example.com', paymentMethod: 'visa', timestamp: '2024-03-14T22:09:00Z', riskScore: 35, country: 'US' } },
  { id: 'fa_005', transactionId: 'txn_1015', severity: 'high', ruleName: 'New Account Fraud', description: 'Account created <1 hour ago making large purchase', timestamp: '2024-03-14T18:30:00Z', status: 'investigating', riskScore: 85, transaction: { id: 'txn_1015', amount: 2100.00, currency: 'USD', status: 'pending', merchantId: 'm_003', customerEmail: 'newuser@example.com', paymentMethod: 'amex', timestamp: '2024-03-14T18:29:00Z', riskScore: 85, country: 'US' } },
  { id: 'fa_006', transactionId: 'txn_1018', severity: 'medium', ruleName: 'Device Fingerprint', description: 'Known fraud device ID detected', timestamp: '2024-03-14T15:00:00Z', status: 'open', riskScore: 72, transaction: { id: 'txn_1018', amount: 560.00, currency: 'GBP', status: 'declined', merchantId: 'm_004', customerEmail: 'fraud@example.com', paymentMethod: 'mastercard', timestamp: '2024-03-14T14:59:00Z', riskScore: 72, country: 'GB' } },
];

export default function FraudAnalysisPage() {
  const { showToast } = useToast();
  const [alerts, setAlerts] = useState<FraudAlert[]>(mockFraudAlerts);
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const handleInvestigate = () => {
    if (selectedAlert) {
      setAlerts((prev) => prev.map((a) => a.id === selectedAlert.id ? { ...a, status: 'investigating' as const } : a));
      setSelectedAlert((prev) => prev ? { ...prev, status: 'investigating' } : null);
      showToast(`Investigating alert ${selectedAlert.id}`, 'info');
    }
  };

  const handleDeclineTransaction = () => {
    if (selectedAlert) {
      setAlerts((prev) => prev.map((a) => a.id === selectedAlert.id ? { ...a, status: 'resolved' as const } : a));
      setSelectedAlert((prev) => prev ? { ...prev, status: 'resolved' } : null);
      showToast('Transaction declined and alert resolved', 'success');
    }
  };

  const handleMarkFalsePositive = () => {
    if (selectedAlert) {
      setAlerts((prev) => prev.map((a) => a.id === selectedAlert.id ? { ...a, status: 'resolved' as const } : a));
      setSelectedAlert((prev) => prev ? { ...prev, status: 'resolved' } : null);
      showToast('Marked as false positive', 'info');
    }
  };

  const columns: DataTableColumn<FraudAlert>[] = [
    {
      key: 'severity', header: 'Severity',
      render: (a) => <StatusBadge status={a.severity === 'critical' ? 'danger' : a.severity === 'high' ? 'warning' : a.severity === 'medium' ? 'info' : 'neutral'} label={a.severity.toUpperCase()} pulse={a.severity === 'critical'} />,
    },
    { key: 'ruleName', header: 'Rule', sortable: true },
    { key: 'description', header: 'Description' },
    {
      key: 'riskScore', header: 'Risk Score', sortable: true,
      render: (a) => (
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${a.riskScore >= 80 ? 'bg-danger-500' : a.riskScore >= 60 ? 'bg-warning-500' : a.riskScore >= 40 ? 'bg-primary-500' : 'bg-success-500'}`} style={{ width: `${a.riskScore}%` }} />
          </div>
          <span className="text-xs font-medium">{a.riskScore}</span>
        </div>
      ),
    },
    { key: 'timestamp', header: 'Detected', sortable: true, render: (a) => <span className="text-gray-400 text-xs">{new Date(a.timestamp).toLocaleString()}</span> },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
  ];

  const filteredAlerts = filterSeverity === 'all' ? alerts : alerts.filter((a) => a.severity === filterSeverity);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Fraud Analysis</h1>
            <p className="text-gray-500 text-sm mt-1">Real-time fraud detection and investigation</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-danger-500" />
            </span>
            <span className="text-sm font-medium text-danger-400">{alerts.filter((a) => a.status === 'open').length} Active Alerts</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {[
            { label: 'Critical', value: alerts.filter((a) => a.severity === 'critical').length, icon: AlertTriangle, color: 'text-danger-400', bg: 'bg-danger-500/10' },
            { label: 'High', value: alerts.filter((a) => a.severity === 'high').length, icon: ShieldAlert, color: 'text-warning-400', bg: 'bg-warning-500/10' },
            { label: 'Medium', value: alerts.filter((a) => a.severity === 'medium').length, icon: Activity, color: 'text-primary-400', bg: 'bg-primary-500/10' },
            { label: 'Resolved', value: alerts.filter((a) => a.status === 'resolved').length, icon: CheckCircle, color: 'text-success-400', bg: 'bg-success-500/10' },
          ].map((stat) => (
            <div key={stat.label} className="card">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-100">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-0">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold text-gray-100">Fraud Alerts</h2>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <select className="select-field pl-10 py-1.5 text-sm w-40" value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <DataTable columns={columns} data={filteredAlerts} pageSize={10} onRowClick={(item) => setSelectedAlert(item as FraudAlert)} />
          </div>

          <div className="space-y-4">
            <div className="card">
              <h2 className="font-semibold text-gray-100 mb-4">Risk Score Distribution</h2>
              <div className="flex items-center justify-center py-6">
                <div className="relative">
                  <Gauge className="h-32 w-32 text-gray-800" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-gray-100">{Math.round(alerts.reduce((s, a) => s + a.riskScore, 0) / alerts.length)}</p>
                      <p className="text-xs text-gray-500">Avg Risk</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: '0-30 Low', value: alerts.filter((a) => a.riskScore < 30).length, color: 'bg-success-500' },
                  { label: '31-60 Medium', value: alerts.filter((a) => a.riskScore >= 30 && a.riskScore < 60).length, color: 'bg-warning-500' },
                  { label: '61-80 High', value: alerts.filter((a) => a.riskScore >= 60 && a.riskScore < 80).length, color: 'bg-danger-500' },
                  { label: '81-100 Critical', value: alerts.filter((a) => a.riskScore >= 80).length, color: 'bg-danger-600' },
                ].map((bucket) => (
                  <div key={bucket.label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{bucket.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${bucket.color}`} style={{ width: `${(bucket.value / Math.max(...[alerts.filter(a => a.riskScore < 30).length, alerts.filter(a => a.riskScore >= 30 && a.riskScore < 60).length, alerts.filter(a => a.riskScore >= 60 && a.riskScore < 80).length, alerts.filter(a => a.riskScore >= 80).length], 1)) * 100}%` }} />
                      </div>
                      <span className="text-gray-300 font-medium w-6 text-right">{bucket.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold text-gray-100 mb-4">Pattern Detection</h2>
              <div className="space-y-3">
                {[
                  { pattern: 'Velocity Attack', count: 12, severity: 'high' },
                  { pattern: 'Card Testing', count: 8, severity: 'high' },
                  { pattern: 'Geo Anomaly', count: 5, severity: 'medium' },
                  { pattern: 'Amount Clustering', count: 3, severity: 'low' },
                ].map((p) => (
                  <div key={p.pattern} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-300">{p.pattern}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-100">{p.count}</span>
                      <StatusBadge status={p.severity} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {selectedAlert && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-100">Transaction Review</h2>
              <button onClick={() => setSelectedAlert(null)} className="text-gray-500 hover:text-gray-300 text-sm">Close</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Alert Details</p>
                  <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between"><span className="text-gray-400 text-sm">Rule:</span><span className="text-sm font-medium text-gray-200">{selectedAlert.ruleName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400 text-sm">Description:</span><span className="text-sm text-gray-200">{selectedAlert.description}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400 text-sm">Risk Score:</span><span className="text-sm font-medium text-gray-200">{selectedAlert.riskScore}/100</span></div>
                    <div className="flex justify-between"><span className="text-gray-400 text-sm">Status:</span><StatusBadge status={selectedAlert.status} /></div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Transaction Details</p>
                  {selectedAlert.transaction && (
                    <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between"><span className="text-gray-400 text-sm">ID:</span><span className="text-sm font-mono text-gray-200">{selectedAlert.transaction.id}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400 text-sm">Amount:</span><span className="text-sm font-medium text-gray-200">${selectedAlert.transaction.amount.toFixed(2)} {selectedAlert.transaction.currency}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400 text-sm">Customer:</span><span className="text-sm text-gray-200">{selectedAlert.transaction.customerEmail}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400 text-sm">Payment:</span><span className="text-sm text-gray-200">{selectedAlert.transaction.paymentMethod}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400 text-sm">Country:</span><span className="text-sm text-gray-200">{selectedAlert.transaction.country}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400 text-sm">Status:</span><StatusBadge status={selectedAlert.transaction.status} /></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-800">
              <button onClick={handleInvestigate} className="btn-primary flex items-center gap-2"><Eye className="h-4 w-4" /> Investigate</button>
              <button onClick={handleDeclineTransaction} className="btn-secondary flex items-center gap-2"><Ban className="h-4 w-4" /> Decline Transaction</button>
              <button onClick={handleMarkFalsePositive} className="btn-ghost flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Mark as False Positive</button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
