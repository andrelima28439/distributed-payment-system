'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  Activity,
  TrendingUp,
  ShieldCheck,
  Zap,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import KPICard from '@/components/KPICard';
import TransactionChart from '@/components/TransactionChart';
import StatusBadge from '@/components/StatusBadge';
import type { Transaction } from '@/types';

const mockTransactions: Transaction[] = [
  { id: 'txn_001', amount: 1250.00, currency: 'USD', status: 'approved', merchantId: 'm_001', customerEmail: 'alice@example.com', paymentMethod: 'visa', timestamp: new Date().toISOString(), riskScore: 12, country: 'US' },
  { id: 'txn_002', amount: 89.99, currency: 'USD', status: 'approved', merchantId: 'm_002', customerEmail: 'bob@example.com', paymentMethod: 'mastercard', timestamp: new Date().toISOString(), riskScore: 5, country: 'GB' },
  { id: 'txn_003', amount: 450.00, currency: 'EUR', status: 'declined', merchantId: 'm_001', customerEmail: 'charlie@example.com', paymentMethod: 'visa', timestamp: new Date().toISOString(), riskScore: 78, country: 'DE' },
  { id: 'txn_004', amount: 2999.99, currency: 'USD', status: 'approved', merchantId: 'm_003', customerEmail: 'dave@example.com', paymentMethod: 'amex', timestamp: new Date().toISOString(), riskScore: 35, country: 'US' },
  { id: 'txn_005', amount: 15.50, currency: 'USD', status: 'failed', merchantId: 'm_002', customerEmail: 'eve@example.com', paymentMethod: 'debit', timestamp: new Date().toISOString(), riskScore: 2, country: 'CA' },
  { id: 'txn_006', amount: 780.00, currency: 'GBP', status: 'approved', merchantId: 'm_004', customerEmail: 'frank@example.com', paymentMethod: 'mastercard', timestamp: new Date().toISOString(), riskScore: 18, country: 'GB' },
  { id: 'txn_007', amount: 3200.00, currency: 'USD', status: 'pending', merchantId: 'm_001', customerEmail: 'grace@example.com', paymentMethod: 'visa', timestamp: new Date().toISOString(), riskScore: 55, country: 'US' },
  { id: 'txn_008', amount: 67.25, currency: 'USD', status: 'approved', merchantId: 'm_003', customerEmail: 'henry@example.com', paymentMethod: 'paypal', timestamp: new Date().toISOString(), riskScore: 8, country: 'FR' },
];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    transactionsPerSecond: 0,
    totalVolume: 0,
    averageValue: 0,
    successRate: 0,
    activeMerchants: 0,
    pendingReconciliation: 0,
    fraudAlerts: 0,
  });
  const [recentTxns, setRecentTxns] = useState<Transaction[]>(mockTransactions);

  useEffect(() => {
    setMetrics({
      transactionsPerSecond: 247,
      totalVolume: 1584290.50,
      averageValue: 142.35,
      successRate: 97.8,
      activeMerchants: 42,
      pendingReconciliation: 18,
      fraudAlerts: 7,
    });

    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        transactionsPerSecond: 230 + Math.floor(Math.random() * 40),
        totalVolume: prev.totalVolume + Math.floor(Math.random() * 5000),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Real-time payment monitoring</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-success-500/10 border border-success-500/20 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success-400" />
            </span>
            <span className="text-xs font-medium text-success-400">System Operational</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Transactions/sec"
            value={metrics.transactionsPerSecond}
            subtitle="Current throughput"
            trend="up"
            trendValue="+12.5%"
            icon={<Zap className="h-5 w-5" />}
          />
          <KPICard
            title="Total Volume"
            value={`$${metrics.totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtitle="Today"
            trend="up"
            trendValue="+8.3%"
            icon={<DollarSign className="h-5 w-5" />}
          />
          <KPICard
            title="Avg Transaction"
            value={`$${metrics.averageValue.toFixed(2)}`}
            subtitle="Per transaction"
            trend="down"
            trendValue="-2.1%"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KPICard
            title="Success Rate"
            value={`${metrics.successRate}%`}
            subtitle="Last 24 hours"
            trend="up"
            trendValue="+0.4%"
            icon={<ShieldCheck className="h-5 w-5" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-100">Transaction Throughput</h2>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-success-400" />
                  Approved
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-danger-400" />
                  Declined
                </span>
              </div>
            </div>
            <TransactionChart height={320} />
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-100">Recent Transactions</h2>
              <span className="text-xs text-gray-500">Live</span>
            </div>
            <div className="space-y-3">
              {recentTxns.slice(0, 5).map((txn) => (
                <div key={txn.id} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{txn.customerEmail}</p>
                    <p className="text-xs text-gray-500">{txn.id}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${txn.status === 'declined' || txn.status === 'failed' ? 'text-danger-400' : 'text-gray-200'}`}>
                      ${txn.amount.toFixed(2)}
                    </p>
                    <StatusBadge status={txn.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">Geographic Distribution</h2>
            <span className="text-xs text-gray-500">Real-time</span>
          </div>
          <div className="h-64 bg-gray-800/50 rounded-xl flex items-center justify-center border border-gray-800">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Transaction map visualization</p>
              <p className="text-gray-600 text-xs mt-1">Integrated with geographic data service</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-500/10">
              <Activity className="h-6 w-6 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{metrics.activeMerchants}</p>
              <p className="text-sm text-gray-500">Active Merchants</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning-500/10">
              <ArrowUpRight className="h-6 w-6 text-warning-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{metrics.pendingReconciliation}</p>
              <p className="text-sm text-gray-500">Pending Reconciliation</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-danger-500/10">
              <ArrowDownRight className="h-6 w-6 text-danger-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{metrics.fraudAlerts}</p>
              <p className="text-sm text-gray-500">Fraud Alerts</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
