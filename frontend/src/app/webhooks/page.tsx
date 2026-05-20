'use client';

import { useState } from 'react';
import { Plus, Webhook, Copy, Check, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import AlertBanner from '@/components/AlertBanner';
import { useToast } from '@/components/Toast';
import type { WebhookEndpoint, WebhookDelivery, DataTableColumn } from '@/types';

let webhookCounter = 4;

const initialEndpoints: WebhookEndpoint[] = [
  { id: 'wh_001', url: 'https://api.merchant.com/webhooks/payments', events: ['transaction.created', 'transaction.updated'], status: 'active', secret: 'whsec_abc123...', createdAt: '2024-03-01T10:00:00Z', lastDelivery: '2024-03-15T10:32:00Z' },
  { id: 'wh_002', url: 'https://webhook.site/payflow-callback', events: ['transaction.failed', 'chargeback.opened'], status: 'active', secret: 'whsec_def456...', createdAt: '2024-02-15T08:30:00Z', lastDelivery: '2024-03-15T09:15:00Z' },
  { id: 'wh_003', url: 'https://internal-alerts.company.com/payments', events: ['fraud.detected', 'transaction.failed'], status: 'inactive', secret: 'whsec_ghi789...', createdAt: '2024-01-20T14:00:00Z' },
  { id: 'wh_004', url: 'https://sandbox.merchant.com/hooks', events: ['transaction.created'], status: 'errored', secret: 'whsec_jkl012...', createdAt: '2024-03-10T16:45:00Z', lastDelivery: '2024-03-14T22:10:00Z' },
];

const mockDeliveries: WebhookDelivery[] = [
  { id: 'del_001', endpointId: 'wh_001', event: 'transaction.created', payload: { transactionId: 'txn_1003', amount: 450 }, status: 'success', attemptCount: 1, lastAttempt: '2024-03-15T10:32:00Z', responseCode: 200 },
  { id: 'del_002', endpointId: 'wh_001', event: 'transaction.updated', payload: { transactionId: 'txn_1003', status: 'declined' }, status: 'success', attemptCount: 1, lastAttempt: '2024-03-15T10:32:05Z', responseCode: 200 },
  { id: 'del_003', endpointId: 'wh_002', event: 'chargeback.opened', payload: { chargebackId: 'cb_001', amount: 1250 }, status: 'failed', attemptCount: 3, lastAttempt: '2024-03-15T09:15:00Z', responseCode: 500, responseBody: 'Internal Server Error' },
  { id: 'del_004', endpointId: 'wh_002', event: 'transaction.failed', payload: { transactionId: 'txn_1005', reason: 'insufficient_funds' }, status: 'retrying', attemptCount: 2, lastAttempt: '2024-03-15T08:45:00Z' },
  { id: 'del_005', endpointId: 'wh_004', event: 'transaction.created', payload: { transactionId: 'txn_1010', amount: 1290 }, status: 'success', attemptCount: 1, lastAttempt: '2024-03-14T22:10:00Z', responseCode: 200 },
];

export default function WebhooksPage() {
  const { showToast } = useToast();
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>(initialEndpoints);
  const [deliveries] = useState<WebhookDelivery[]>(mockDeliveries);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const handleTestWebhook = (endpoint: WebhookEndpoint) => {
    showToast(`Test payload sent to ${endpoint.url}`, 'info');
  };

  const handleDeleteWebhook = (endpoint: WebhookEndpoint) => {
    setEndpoints((prev) => prev.filter((e) => e.id !== endpoint.id));
    showToast(`Webhook endpoint ${endpoint.id} deleted`, 'success');
  };

  const handleCreateWebhook = () => {
    if (!newUrl) {
      showToast('Please enter an endpoint URL', 'error');
      return;
    }
    if (selectedEvents.length === 0) {
      showToast('Select at least one event', 'error');
      return;
    }
    webhookCounter++;
    const secret = newSecret || `whsec_${Math.random().toString(36).slice(2, 14)}`;
    const newEndpoint: WebhookEndpoint = {
      id: `wh_${String(webhookCounter).padStart(3, '0')}`,
      url: newUrl,
      events: selectedEvents as WebhookEndpoint['events'],
      status: 'active',
      secret,
      createdAt: new Date().toISOString(),
    };
    setEndpoints((prev) => [newEndpoint, ...prev]);
    showToast(`Webhook created for ${newUrl}`, 'success');
    setShowForm(false);
    setNewUrl('');
    setNewSecret('');
    setSelectedEvents([]);
  };

  const toggleEvent = (ev: string) => {
    setSelectedEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  };

  const endpointColumns: DataTableColumn<WebhookEndpoint>[] = [
    {
      key: 'url', header: 'URL',
      render: (e) => (
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-gray-500 shrink-0" />
          <code className="text-xs font-mono text-gray-300 truncate max-w-[300px]">{e.url}</code>
          {e.status === 'active' && e.lastDelivery && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success-400" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'events', header: 'Events',
      render: (e) => (
        <div className="flex flex-wrap gap-1">
          {e.events.map((ev) => (
            <span key={ev} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400 font-mono">{ev}</span>
          ))}
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (e) => <StatusBadge status={e.status} pulse={e.status === 'active'} />,
    },
    {
      key: 'createdAt', header: 'Created',
      render: (e) => <span className="text-xs text-gray-500">{new Date(e.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions', header: '',
      render: (e) => (
        <div className="flex items-center gap-1">
          <button className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800"
            onClick={() => { navigator.clipboard.writeText(e.secret); setCopied(e.id); setTimeout(() => setCopied(null), 2000); }}
            title="Copy secret">
            {copied === e.id ? <Check className="h-4 w-4 text-success-400" /> : <Copy className="h-4 w-4" />}
          </button>
          <button onClick={() => handleTestWebhook(e)} className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800" title="Test webhook">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => handleDeleteWebhook(e)} className="p-1.5 text-gray-500 hover:text-danger-400 rounded-lg hover:bg-gray-800" title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const deliveryColumns: DataTableColumn<WebhookDelivery>[] = [
    { key: 'event', header: 'Event', render: (d) => <code className="text-xs font-mono text-gray-300">{d.event}</code> },
    { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} pulse={d.status === 'retrying'} /> },
    { key: 'attemptCount', header: 'Attempts', sortable: true },
    { key: 'lastAttempt', header: 'Last Attempt', render: (d) => <span className="text-xs text-gray-500">{new Date(d.lastAttempt).toLocaleString()}</span> },
    { key: 'responseCode', header: 'Response', render: (d) => d.responseCode ? <span className={`text-xs font-mono ${d.responseCode >= 400 ? 'text-danger-400' : 'text-success-400'}`}>{d.responseCode}</span> : <span className="text-gray-600">-</span> },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Webhook Management</h1>
            <p className="text-gray-500 text-sm mt-1">Manage outgoing webhook endpoints and monitor deliveries</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> {showForm ? 'Cancel' : 'Add Webhook'}
          </button>
        </div>

        {showForm && (
          <div className="card">
            <h2 className="font-semibold text-gray-100 mb-4">Register New Webhook</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Endpoint URL</label>
                <input type="url" className="input-field" placeholder="https://api.example.com/webhooks" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Events</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['transaction.created', 'transaction.updated', 'transaction.failed', 'chargeback.opened', 'fraud.detected'] as const).map((ev) => (
                    <label key={ev} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-600 bg-gray-800 text-primary-500 focus:ring-primary-500" checked={selectedEvents.includes(ev)} onChange={() => toggleEvent(ev)} />
                      {ev}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Secret (optional)</label>
                <input type="text" className="input-field" placeholder="Leave blank to auto-generate" value={newSecret} onChange={(e) => setNewSecret(e.target.value)} />
              </div>
              <div className="flex items-end">
                <button onClick={handleCreateWebhook} className="btn-primary">Create Webhook</button>
              </div>
            </div>
          </div>
        )}

        <AlertBanner type="info" title="Webhook signatures are verified using HMAC-SHA256" message="All payloads include a signature header for verification." />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Endpoints', value: endpoints.length, color: 'text-gray-100' },
            { label: 'Active', value: endpoints.filter((e) => e.status === 'active').length, color: 'text-success-400' },
            { label: 'Failed Deliveries (24h)', value: deliveries.filter((d) => d.status === 'failed').length, color: 'text-danger-400' },
            { label: 'Retrying', value: deliveries.filter((d) => d.status === 'retrying').length, color: 'text-warning-400' },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="card p-0">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-semibold text-gray-100">Webhook Endpoints</h2>
          </div>
          <DataTable columns={endpointColumns} data={endpoints} pageSize={10} />
        </div>

        <div className="card p-0">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-semibold text-gray-100">Recent Deliveries</h2>
          </div>
          <DataTable columns={deliveryColumns} data={deliveries} pageSize={10} />
        </div>

        {deliveries.filter((d) => d.status === 'failed').length > 0 && (
          <AlertBanner type="error" title={`${deliveries.filter((d) => d.status === 'failed').length} failed deliveries detected`} message="Check endpoint availability and webhook secret configuration." dismissible />
        )}
      </div>
    </DashboardLayout>
  );
}
