'use client';

import { useState } from 'react';
import { Plus, ToggleLeft, ToggleRight, Settings, Gavel, Route, ShieldCheck } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import AlertBanner from '@/components/AlertBanner';
import { useToast } from '@/components/Toast';
import type { BusinessRule, DataTableColumn } from '@/types';

const mockRules: BusinessRule[] = [
  { id: 'rule_001', name: 'High Amount Review', description: 'Flag transactions over $5,000 for manual review', category: 'risk', condition: 'amount > 5000', action: 'manual_review', enabled: true, priority: 1, createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-03-10T14:00:00Z' },
  { id: 'rule_002', name: 'Velocity Check', description: 'Block >5 transactions from same IP in 10 minutes', category: 'risk', condition: 'tx_count_by_ip > 5 AND time_window < 600', action: 'block', enabled: true, priority: 2, createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-03-01T09:00:00Z' },
  { id: 'rule_003', name: 'Round Robin Routing', description: 'Distribute transactions across acquirers evenly', category: 'routing', condition: 'active_acquirers > 1', action: 'round_robin', enabled: true, priority: 3, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2024-02-01T08:00:00Z' },
  { id: 'rule_004', name: 'Card BIN Blocklist', description: 'Block transactions from known fraudulent BIN ranges', category: 'processing', condition: 'bin IN blocklist', action: 'block', enabled: false, priority: 4, createdAt: '2024-02-10T12:00:00Z', updatedAt: '2024-03-12T16:30:00Z' },
  { id: 'rule_005', name: '3DS Required', description: 'Require 3DS authentication for high-risk transactions', category: 'compliance', condition: 'risk_score > 70', action: 'require_3ds', enabled: true, priority: 5, createdAt: '2024-01-20T09:00:00Z', updatedAt: '2024-03-05T11:00:00Z' },
  { id: 'rule_006', name: 'Country Block', description: 'Block transactions from restricted countries', category: 'compliance', condition: 'country IN restricted_list', action: 'block', enabled: true, priority: 6, createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-02-28T10:00:00Z' },
  { id: 'rule_007', name: 'Smart Retry', description: 'Retry failed transactions with alternative routing', category: 'processing', condition: 'gateway_error AND retry_count < 3', action: 'retry_alternate', enabled: false, priority: 7, createdAt: '2024-03-01T10:00:00Z', updatedAt: '2024-03-01T10:00:00Z' },
];

const categoryIcons: Record<string, React.ReactNode> = {
  risk: <ShieldCheck className="h-4 w-4" />,
  processing: <Settings className="h-4 w-4" />,
  routing: <Route className="h-4 w-4" />,
  compliance: <Gavel className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  risk: 'text-danger-400 bg-danger-500/10',
  processing: 'text-primary-400 bg-primary-500/10',
  routing: 'text-warning-400 bg-warning-500/10',
  compliance: 'text-success-400 bg-success-500/10',
};

let ruleCounter = 7;

export default function SettingsPage() {
  const { showToast } = useToast();
  const [rules, setRules] = useState<BusinessRule[]>(mockRules);
  const [showForm, setShowForm] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('risk');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleCondition, setNewRuleCondition] = useState('');
  const [newRuleAction, setNewRuleAction] = useState('block');
  const [newRulePriority, setNewRulePriority] = useState('1');

  const toggleRule = (id: string) => {
    setRules((prev) => {
      const updated = prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r);
      const rule = prev.find((r) => r.id === id);
      if (rule) {
        showToast(`${rule.name} ${rule.enabled ? 'disabled' : 'enabled'}`, 'success');
      }
      return updated;
    });
  };

  const handleCreateRule = () => {
    if (!newRuleName || !newRuleDesc) {
      showToast('Please fill in rule name and description', 'error');
      return;
    }
    ruleCounter++;
    const newRule: BusinessRule = {
      id: `rule_${String(ruleCounter).padStart(3, '0')}`,
      name: newRuleName,
      description: newRuleDesc,
      category: newRuleCategory as BusinessRule['category'],
      condition: newRuleCondition || '{}',
      action: newRuleAction as BusinessRule['action'],
      enabled: true,
      priority: parseInt(newRulePriority) || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRules((prev) => [...prev, newRule]);
    showToast(`Rule "${newRuleName}" created`, 'success');
    setShowForm(false);
    setNewRuleName('');
    setNewRuleCategory('risk');
    setNewRuleDesc('');
    setNewRuleCondition('');
    setNewRuleAction('block');
    setNewRulePriority('1');
  };

  const handleSaveConfig = () => {
    showToast('Configuration saved successfully', 'success');
  };

  const columns: DataTableColumn<BusinessRule>[] = [
    {
      key: 'enabled', header: '',
      render: (r) => (
        <button onClick={() => toggleRule(r.id)} className="text-gray-400 hover:text-gray-200 transition-colors">
          {r.enabled ? <ToggleRight className="h-5 w-5 text-success-400" /> : <ToggleLeft className="h-5 w-5" />}
        </button>
      ),
      width: '40px',
    },
    { key: 'name', header: 'Rule Name', sortable: true, render: (r) => <span className="font-medium text-gray-200">{r.name}</span> },
    { key: 'description', header: 'Description', render: (r) => <span className="text-sm text-gray-400">{r.description}</span> },
    {
      key: 'category', header: 'Category',
      render: (r) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[r.category]}`}>
          {categoryIcons[r.category]}
          {r.category.charAt(0).toUpperCase() + r.category.slice(1)}
        </span>
      ),
    },
    { key: 'priority', header: 'Priority', sortable: true, render: (r) => <span className="text-sm text-gray-400 font-mono">#{r.priority}</span> },
    {
      key: 'status', header: 'Status',
      render: (r) => <StatusBadge status={r.enabled ? 'active' : 'inactive'} />,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Business Rules</h1>
            <p className="text-gray-500 text-sm mt-1">Configure payment processing and risk management rules</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> {showForm ? 'Cancel' : 'New Rule'}
          </button>
        </div>

        {showForm && (
          <div className="card">
            <h2 className="font-semibold text-gray-100 mb-4">Create New Rule</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Rule Name</label>
                <input type="text" className="input-field" placeholder="e.g., High Amount Block" value={newRuleName} onChange={(e) => setNewRuleName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Category</label>
                <select className="select-field" value={newRuleCategory} onChange={(e) => setNewRuleCategory(e.target.value)}>
                  <option value="risk">Risk Management</option>
                  <option value="processing">Processing</option>
                  <option value="routing">Routing</option>
                  <option value="compliance">Compliance</option>
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm text-gray-400 mb-1.5">Description</label>
                <input type="text" className="input-field" placeholder="Describe what this rule does" value={newRuleDesc} onChange={(e) => setNewRuleDesc(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Condition (JSON)</label>
                <textarea className="input-field h-24 font-mono text-xs" placeholder='{"field": "amount", "operator": "gt", "value": 10000}' value={newRuleCondition} onChange={(e) => setNewRuleCondition(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Action</label>
                <select className="select-field" value={newRuleAction} onChange={(e) => setNewRuleAction(e.target.value)}>
                  <option value="block">Block Transaction</option>
                  <option value="manual_review">Manual Review</option>
                  <option value="require_3ds">Require 3DS</option>
                  <option value="retry_alternate">Retry Alternative</option>
                  <option value="round_robin">Round Robin Routing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Priority</label>
                <input type="number" className="input-field" placeholder="1" min="1" max="999" value={newRulePriority} onChange={(e) => setNewRulePriority(e.target.value)} />
              </div>
              <div className="flex items-end">
                <button onClick={handleCreateRule} className="btn-primary">Create Rule</button>
              </div>
            </div>
          </div>
        )}

        <AlertBanner
          type="info"
          title="Rules are evaluated in priority order. Higher priority rules are evaluated first."
          message="Changes take effect immediately for new transactions."
        />

        <div className="card p-0">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-gray-100">Processing Rules</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success-400" /> {rules.filter((r) => r.enabled).length} Active</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600" /> {rules.filter((r) => !r.enabled).length} Disabled</span>
            </div>
          </div>
          <DataTable columns={columns} data={rules} pageSize={10} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-100 mb-4">Configuration Summary</h3>
            <div className="space-y-3">
              {[
                { label: 'Risk Rules', value: rules.filter((r) => r.category === 'risk').length, active: rules.filter((r) => r.category === 'risk' && r.enabled).length },
                { label: 'Processing Rules', value: rules.filter((r) => r.category === 'processing').length, active: rules.filter((r) => r.category === 'processing' && r.enabled).length },
                { label: 'Routing Rules', value: rules.filter((r) => r.category === 'routing').length, active: rules.filter((r) => r.category === 'routing' && r.enabled).length },
                { label: 'Compliance Rules', value: rules.filter((r) => r.category === 'compliance').length, active: rules.filter((r) => r.category === 'compliance' && r.enabled).length },
              ].map((cat) => (
                <div key={cat.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{cat.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-300">{cat.active} / {cat.value} active</span>
                    <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${cat.value > 0 ? (cat.active / cat.value) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-100 mb-4">Processing Configuration</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-200">Max Retry Attempts</p>
                  <p className="text-xs text-gray-500">Maximum retry attempts for failed transactions</p>
                </div>
                <input type="number" className="input-field w-20 text-center" defaultValue={3} min={0} max={10} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-200">Transaction Timeout</p>
                  <p className="text-xs text-gray-500">Timeout in seconds per transaction</p>
                </div>
                <input type="number" className="input-field w-20 text-center" defaultValue={30} min={5} max={120} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-200">Batch Size</p>
                  <p className="text-xs text-gray-500">Transactions per settlement batch</p>
                </div>
                <input type="number" className="input-field w-20 text-center" defaultValue={500} min={10} max={5000} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-200">Auto-refund Period</p>
                  <p className="text-xs text-gray-500">Days before automatic refund processing</p>
                </div>
                <input type="number" className="input-field w-20 text-center" defaultValue={7} min={1} max={90} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <button onClick={handleSaveConfig} className="btn-primary text-sm">Save Configuration</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
