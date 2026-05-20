'use client';

import { useState } from 'react';
import { Search, Filter, Calendar, ChevronRight } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import type { AuditLogEntry, DataTableColumn } from '@/types';

const mockAuditLogs: AuditLogEntry[] = [
  { id: 'aud_001', timestamp: '2024-03-15T10:32:00Z', action: 'update', entityType: 'transaction', entityId: 'txn_1003', userId: 'usr_001', userName: 'System', changes: { status: { old: 'pending', new: 'declined' } }, ipAddress: '10.0.1.100', userAgent: 'PaymentProcessor/1.0' },
  { id: 'aud_002', timestamp: '2024-03-15T10:30:00Z', action: 'create', entityType: 'transaction', entityId: 'txn_1003', userId: 'usr_001', userName: 'System', changes: { amount: { old: null, new: 450 }, currency: { old: null, new: 'EUR' } }, ipAddress: '10.0.1.100', userAgent: 'PaymentProcessor/1.0' },
  { id: 'aud_003', timestamp: '2024-03-15T09:15:00Z', action: 'approve', entityType: 'fraud_alert', entityId: 'fa_002', userId: 'usr_002', userName: 'Alice Smith', changes: { status: { old: 'open', new: 'investigating' } }, ipAddress: '192.168.1.50', userAgent: 'Mozilla/5.0 Chrome/122.0' },
  { id: 'aud_004', timestamp: '2024-03-15T08:45:00Z', action: 'create', entityType: 'webhook', entityId: 'wh_004', userId: 'usr_002', userName: 'Alice Smith', changes: { url: { old: null, new: 'https://sandbox.merchant.com/hooks' } }, ipAddress: '192.168.1.50', userAgent: 'Mozilla/5.0 Chrome/122.0' },
  { id: 'aud_005', timestamp: '2024-03-14T22:10:00Z', action: 'update', entityType: 'rule', entityId: 'rule_004', userId: 'usr_003', userName: 'Bob Johnson', changes: { enabled: { old: true, new: false } }, ipAddress: '192.168.1.100', userAgent: 'Mozilla/5.0 Firefox/123.0' },
  { id: 'aud_006', timestamp: '2024-03-14T18:30:00Z', action: 'delete', entityType: 'webhook', entityId: 'wh_005', userId: 'usr_002', userName: 'Alice Smith', changes: {}, ipAddress: '192.168.1.50', userAgent: 'Mozilla/5.0 Chrome/122.0' },
  { id: 'aud_007', timestamp: '2024-03-14T16:00:00Z', action: 'view', entityType: 'report', entityId: 'rpt_002', userId: 'usr_004', userName: 'Carol Davis', changes: {}, ipAddress: '10.0.2.200', userAgent: 'Python-urllib/3.11' },
  { id: 'aud_008', timestamp: '2024-03-14T14:20:00Z', action: 'reject', entityType: 'chargeback', entityId: 'cb_002', userId: 'usr_003', userName: 'Bob Johnson', changes: { status: { old: 'under_review', new: 'lost' } }, ipAddress: '192.168.1.100', userAgent: 'Mozilla/5.0 Firefox/123.0' },
  { id: 'aud_009', timestamp: '2024-03-14T12:00:00Z', action: 'create', entityType: 'merchant', entityId: 'm_006', userId: 'usr_002', userName: 'Alice Smith', changes: { name: { old: null, new: 'NewStore Inc' } }, ipAddress: '192.168.1.50', userAgent: 'Mozilla/5.0 Chrome/122.0' },
  { id: 'aud_010', timestamp: '2024-03-14T10:30:00Z', action: 'update', entityType: 'transaction', entityId: 'txn_1001', userId: 'usr_001', userName: 'System', changes: { status: { old: 'pending', new: 'approved' } }, ipAddress: '10.0.1.100', userAgent: 'PaymentProcessor/1.0' },
  { id: 'aud_011', timestamp: '2024-03-14T09:00:00Z', action: 'approve', entityType: 'payout', entityId: 'p_005', userId: 'usr_003', userName: 'Bob Johnson', changes: { amount: { old: 5000, new: 5000 } }, ipAddress: '192.168.1.100', userAgent: 'Mozilla/5.0 Firefox/123.0' },
  { id: 'aud_012', timestamp: '2024-03-14T08:15:00Z', action: 'create', entityType: 'fraud_alert', entityId: 'fa_006', userId: 'usr_001', userName: 'System', changes: { severity: { old: null, new: 'medium' } }, ipAddress: '10.0.1.100', userAgent: 'FraudEngine/2.0' },
];

export default function AuditPage() {
  const { showToast } = useToast();
  const [logs] = useState<AuditLogEntry[]>(mockAuditLogs);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleApplyFilters = () => {
    showToast('Filters applied', 'success');
  };

  const actionColors: Record<string, string> = {
    create: 'badge-success',
    update: 'badge-info',
    delete: 'badge-danger',
    view: 'badge-neutral',
    approve: 'badge-success',
    reject: 'badge-danger',
  };

  const columns: DataTableColumn<AuditLogEntry>[] = [
    {
      key: 'timestamp', header: 'Timestamp', sortable: true,
      render: (e) => <span className="text-xs text-gray-400">{new Date(e.timestamp).toLocaleString()}</span>,
    },
    {
      key: 'action', header: 'Action',
      render: (e) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionColors[e.action] || 'badge-neutral'}`}>
          {e.action.toUpperCase()}
        </span>
      ),
    },
    { key: 'entityType', header: 'Entity', sortable: true, render: (e) => <span className="text-sm text-gray-300 capitalize">{e.entityType.replace(/_/g, ' ')}</span> },
    { key: 'entityId', header: 'Entity ID', render: (e) => <code className="text-xs font-mono text-gray-400">{e.entityId}</code> },
    { key: 'userName', header: 'User', sortable: true, render: (e) => <span className="text-sm text-gray-200">{e.userName}</span> },
  ];

  const filtered = logs.filter((l) => {
    if (filterAction !== 'all' && l.action !== filterAction) return false;
    if (filterEntity !== 'all' && l.entityType !== filterEntity) return false;
    if (searchQuery && !l.entityId.toLowerCase().includes(searchQuery.toLowerCase()) && !l.userName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Transaction Audit</h1>
          <p className="text-gray-500 text-sm mt-1">Complete audit trail of all system activities</p>
        </div>

        <div className="card">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by entity ID or user..."
                className="input-field pl-10 py-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <select className="select-field pl-10 py-2" value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
                <option value="all">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="view">View</option>
                <option value="approve">Approve</option>
                <option value="reject">Reject</option>
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <select className="select-field pl-10 py-2" value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)}>
                <option value="all">All Entities</option>
                <option value="transaction">Transaction</option>
                <option value="fraud_alert">Fraud Alert</option>
                <option value="webhook">Webhook</option>
                <option value="rule">Rule</option>
                <option value="chargeback">Chargeback</option>
                <option value="merchant">Merchant</option>
                <option value="report">Report</option>
                <option value="payout">Payout</option>
              </select>
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input type="date" className="input-field pl-10 py-2" defaultValue="2024-03-14" />
            </div>
            <button onClick={handleApplyFilters} className="btn-secondary text-sm">Apply Filters</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-0">
            <div className="p-4 border-b border-gray-800">
              <h2 className="font-semibold text-gray-100">Audit Log</h2>
            </div>
            <DataTable
              columns={columns}
              data={filtered}
              pageSize={12}
              onRowClick={(item) => setSelectedLog(item as AuditLogEntry)}
            />
          </div>

          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-100 mb-4">Activity Summary</h3>
              {[
                { label: 'Total Entries', value: logs.length },
                { label: 'Today', value: logs.filter((l) => new Date(l.timestamp).toDateString() === new Date().toDateString()).length },
                { label: 'System Actions', value: logs.filter((l) => l.userName === 'System').length },
                { label: 'User Actions', value: logs.filter((l) => l.userName !== 'System').length },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                  <span className="text-sm text-gray-400">{stat.label}</span>
                  <span className="text-sm font-medium text-gray-200">{stat.value}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-100 mb-4">Recent Activity</h3>
              {logs.slice(0, 4).map((l) => (
                <div key={l.id} className="flex items-start gap-3 py-2 border-b border-gray-800/50 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${l.action === 'create' || l.action === 'approve' ? 'bg-success-400' : l.action === 'delete' || l.action === 'reject' ? 'bg-danger-400' : l.action === 'update' ? 'bg-primary-400' : 'bg-gray-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">{l.userName} {l.action}d {l.entityType}</p>
                    <p className="text-[10px] text-gray-500">{new Date(l.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {selectedLog && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-100">Transaction Detail</h2>
              <button onClick={() => setSelectedLog(null)} className="text-gray-500 hover:text-gray-300 text-sm">Close</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Event Info</p>
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between"><span className="text-gray-400 text-sm">Action:</span><StatusBadge status={selectedLog.action} label={selectedLog.action.toUpperCase()} /></div>
                  <div className="flex justify-between"><span className="text-gray-400 text-sm">Entity:</span><span className="text-sm capitalize text-gray-200">{selectedLog.entityType.replace(/_/g, ' ')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400 text-sm">Entity ID:</span><code className="text-xs font-mono text-gray-200">{selectedLog.entityId}</code></div>
                  <div className="flex justify-between"><span className="text-gray-400 text-sm">Time:</span><span className="text-sm text-gray-200">{new Date(selectedLog.timestamp).toLocaleString()}</span></div>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">User Info</p>
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between"><span className="text-gray-400 text-sm">User:</span><span className="text-sm text-gray-200">{selectedLog.userName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400 text-sm">User ID:</span><code className="text-xs font-mono text-gray-200">{selectedLog.userId}</code></div>
                  <div className="flex justify-between"><span className="text-gray-400 text-sm">IP:</span><code className="text-xs font-mono text-gray-200">{selectedLog.ipAddress}</code></div>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Changes</p>
                <div className="bg-gray-800/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {Object.keys(selectedLog.changes).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(selectedLog.changes).map(([field, change]) => (
                        <div key={field} className="text-sm">
                          <p className="text-gray-400 text-xs mb-1">{field}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-danger-400 line-through text-xs">{String(change.old ?? 'null')}</span>
                            <ChevronRight className="h-3 w-3 text-gray-600" />
                            <span className="text-success-400 text-xs">{String(change.new ?? 'null')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">View action, no changes recorded</p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <code className="text-xs text-gray-500 font-mono">{selectedLog.userAgent}</code>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
