'use client';

import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Clock, MessageSquare, Download } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import AlertBanner from '@/components/AlertBanner';
import { useToast } from '@/components/Toast';
import { downloadChargebacksCSV, downloadEvidenceFile } from '@/lib/download';
import type { Chargeback, ChargebackEvidence, DataTableColumn } from '@/types';

const initialChargebacks: Chargeback[] = [
  { id: 'cb_001', transactionId: 'txn_1001', amount: 1250.00, currency: 'USD', reason: 'Customer claims transaction not authorized', status: 'received', receivedDate: '2024-03-10T10:00:00Z', dueDate: '2024-04-09T10:00:00Z', evidence: [{ id: 'ev_001', fileName: 'transaction_receipt.pdf', fileType: 'pdf', uploadedAt: '2024-03-11T14:00:00Z', url: '/evidence/ev_001.pdf' }, { id: 'ev_002', fileName: 'customer_communication.txt', fileType: 'txt', uploadedAt: '2024-03-11T15:30:00Z', url: '/evidence/ev_002.txt' }], respondent: 'Merchant A', notes: 'Customer made purchase on 2024-03-08. Digital goods delivered.' },
  { id: 'cb_002', transactionId: 'txn_1005', amount: 89.99, currency: 'USD', reason: 'Product not received', status: 'under_review', receivedDate: '2024-03-08T08:30:00Z', dueDate: '2024-04-07T08:30:00Z', evidence: [{ id: 'ev_003', fileName: 'shipping_proof.pdf', fileType: 'pdf', uploadedAt: '2024-03-09T10:00:00Z', url: '/evidence/ev_003.pdf' }], respondent: 'Merchant B', notes: 'Tracking shows delivered. Awaiting customer confirmation.' },
  { id: 'cb_003', transactionId: 'txn_1008', amount: 67.25, currency: 'USD', reason: 'Duplicate charge', status: 'disputed', receivedDate: '2024-03-05T14:00:00Z', dueDate: '2024-04-04T14:00:00Z', evidence: [{ id: 'ev_004', fileName: 'bank_statement.pdf', fileType: 'pdf', uploadedAt: '2024-03-06T09:00:00Z', url: '/evidence/ev_004.pdf' }, { id: 'ev_005', fileName: 'transaction_logs.csv', fileType: 'csv', uploadedAt: '2024-03-06T09:30:00Z', url: '/evidence/ev_005.csv' }], respondent: 'Merchant C', notes: 'Evidence submitted showing single charge.' },
  { id: 'cb_004', transactionId: 'txn_1010', amount: 1290.00, currency: 'USD', reason: 'Service not as described', status: 'won', receivedDate: '2024-02-20T09:00:00Z', dueDate: '2024-03-21T09:00:00Z', resolvedDate: '2024-03-15T11:00:00Z', evidence: [{ id: 'ev_006', fileName: 'service_agreement.pdf', fileType: 'pdf', uploadedAt: '2024-02-21T10:00:00Z', url: '/evidence/ev_006.pdf' }], respondent: 'Merchant D', notes: 'Chargeback won - service was provided as agreed.' },
  { id: 'cb_005', transactionId: 'txn_1012', amount: 450.00, currency: 'EUR', reason: 'Credit not processed', status: 'lost', receivedDate: '2024-02-15T11:00:00Z', dueDate: '2024-03-16T11:00:00Z', resolvedDate: '2024-03-10T16:00:00Z', evidence: [], respondent: 'Merchant A', notes: 'Refund processed after deadline. Chargeback lost.' },
  { id: 'cb_006', transactionId: 'txn_1015', amount: 2100.00, currency: 'USD', reason: 'Fraudulent transaction', status: 'accepted', receivedDate: '2024-03-01T10:00:00Z', dueDate: '2024-03-31T10:00:00Z', resolvedDate: '2024-03-12T09:00:00Z', evidence: [{ id: 'ev_007', fileName: 'fraud_report.pdf', fileType: 'pdf', uploadedAt: '2024-03-02T14:00:00Z', url: '/evidence/ev_007.pdf' }], respondent: 'Merchant E', notes: 'Accepted liability - fraud confirmed.' },
];

export default function ChargebacksPage() {
  const { showToast } = useToast();
  const [chargebacks, setChargebacks] = useState<Chargeback[]>(initialChargebacks);
  const [selected, setSelected] = useState<Chargeback | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [responseNotes, setResponseNotes] = useState('');
  const [showResponseForm, setShowResponseForm] = useState(false);

  const handleExport = () => {
    downloadChargebacksCSV(chargebacks);
    showToast('Chargeback data exported', 'success');
  };

  const handleSubmitResponse = (cb?: Chargeback) => {
    if (!cb) return;
    if (uploadedFiles.length === 0 && cb.evidence.length === 0) {
      showToast('Upload at least one evidence file before submitting', 'error');
      return;
    }
    if (!responseNotes.trim()) {
      showToast('Write a response explaining why the chargeback should be overturned', 'error');
      return;
    }
    setChargebacks((prev) => prev.map((c) => c.id === cb.id ? { ...c, status: 'disputed' as const, notes: responseNotes } : c));
    setSelected((prev) => prev ? { ...prev, status: 'disputed', notes: responseNotes } : null);
    showToast('Response submitted for ' + cb.transactionId + ' \u2014 waiting for bank decision', 'success');
    setShowResponseForm(false);
    setResponseNotes('');
  };

  const handleAcceptLiability = () => {
    if (selected) {
      setChargebacks((prev) => prev.map((c) => c.id === selected.id ? { ...c, status: 'accepted' as const, resolvedDate: new Date().toISOString() } : c));
      setSelected((prev) => prev ? { ...prev, status: 'accepted', resolvedDate: new Date().toISOString() } : null);
      showToast('Liability accepted \u2014 chargeback closed', 'info');
    }
  };

  const handleRequestExtension = () => {
    showToast('Extension requested \u2014 new due date will be provided within 48h', 'info');
  };

  const handleDownloadEvidence = (ev: ChargebackEvidence) => {
    downloadEvidenceFile(ev.fileName);
    showToast('Downloading ' + ev.fileName + '...', 'success');
  };

  const handleUploadEvidence = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const names = files.map((f) => f.name);
    setUploadedFiles((prev) => [...prev, ...names]);
    showToast(names.length + ' file(s) uploaded \u2014 include them in your response', 'success');
  };

  const columns: DataTableColumn<Chargeback>[] = [
    { key: 'transactionId', header: 'Transaction', sortable: true, render: (c) => <code className="text-xs font-mono text-gray-300">{c.transactionId}</code> },
    { key: 'amount', header: 'Amount', sortable: true, render: (c) => <span className="font-medium">{c.amount.toFixed(2)} <span className="text-gray-500 text-xs">{c.currency}</span></span> },
    { key: 'reason', header: 'Reason', render: (c) => <span className="text-sm text-gray-400 truncate max-w-[200px] block">{c.reason}</span> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} pulse={c.status === 'received' || c.status === 'under_review'} /> },
    {
      key: 'dueDate', header: 'Response Due', sortable: true,
      render: (c) => {
        const due = new Date(c.dueDate);
        const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{due.toLocaleDateString()}</span>
            {daysLeft > 0 && daysLeft <= 7 && c.status !== 'won' && c.status !== 'lost' && c.status !== 'accepted' ? (
              <span className="text-xs text-danger-400 font-medium">{daysLeft}d left</span>
            ) : null}
          </div>
        );
      },
    },
    { key: 'evidence', header: 'Files', render: (c) => <span className="text-xs text-gray-500">{c.evidence.length} file{c.evidence.length !== 1 ? 's' : ''}</span> },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Chargeback Management</h1>
            <p className="text-gray-500 text-sm mt-1">Manage disputes and respond to chargebacks</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="btn-secondary flex items-center gap-2"><Download className="h-4 w-4" /> Export</button>
            <button onClick={() => { if (selected) { setShowResponseForm(true); } else { showToast('Select a chargeback from the list first', 'error'); } }} className="btn-primary flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Submit Response</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Chargebacks', value: chargebacks.length, color: 'text-gray-100' },
            { label: 'Pending Response', value: chargebacks.filter((c) => c.status === 'received' || c.status === 'under_review').length, color: 'text-warning-400' },
            { label: 'Disputed', value: chargebacks.filter((c) => c.status === 'disputed').length, color: 'text-primary-400' },
            { label: 'Won / Lost', value: chargebacks.filter((c) => c.status === 'won').length + 'W / ' + chargebacks.filter((c) => c.status === 'lost').length + 'L', color: 'text-success-400' },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <p className={'text-2xl font-bold ' + stat.color}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <AlertBanner type="warning" title={chargebacks.filter((c) => c.status === 'received' || c.status === 'under_review').length + ' chargebacks require action'} message="Responses must be submitted before the due date to avoid automatic loss." />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-0">
            <div className="p-4 border-b border-gray-800">
              <h2 className="font-semibold text-gray-100">Chargeback List</h2>
            </div>
            <DataTable columns={columns} data={chargebacks} pageSize={10} onRowClick={(item) => setSelected(item as Chargeback)} />
          </div>

          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-100 mb-4">Status Workflow</h3>
              <div className="space-y-2">
                {[
                  { status: 'received', label: 'Received', desc: 'Chargeback filed by issuer' },
                  { status: 'under_review', label: 'Under Review', desc: 'Evidence being gathered' },
                  { status: 'disputed', label: 'Disputed', desc: 'Formal response submitted' },
                  { status: 'won', label: 'Won', desc: 'Resolved in your favor' },
                  { status: 'lost', label: 'Lost', desc: 'Liability accepted' },
                  { status: 'accepted', label: 'Accepted', desc: 'Liability accepted' },
                ].map((step) => (
                  <div key={step.status} className="flex items-center gap-3 py-2 border-b border-gray-800/50 last:border-0">
                    <div className={'w-3 h-3 rounded-full border-2 ' + (chargebacks.filter((c) => c.status === step.status).length > 0 ? 'border-primary-500 bg-primary-500/20' : 'border-gray-700')} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-200">{step.label}</p>
                      <p className="text-xs text-gray-500">{step.desc}</p>
                    </div>
                    <span className="text-xs font-medium text-gray-400">{chargebacks.filter((c) => c.status === step.status).length}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-100 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Total Amount at Risk</span>
                  <span className="text-sm font-medium text-danger-400">{chargebacks.filter((c) => c.status !== 'won').reduce((s, c) => s + c.amount, 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Win Rate</span>
                  <span className="text-sm font-medium text-success-400">
                    {chargebacks.filter((c) => c.status === 'won' || c.status === 'lost').length > 0
                      ? Math.round((chargebacks.filter((c) => c.status === 'won').length / chargebacks.filter((c) => c.status === 'won' || c.status === 'lost').length) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Avg Response Time</span>
                  <span className="text-sm font-medium text-gray-200">4.2 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selected && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-100">Chargeback Detail</h2>
                <StatusBadge status={selected.status} pulse />
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-300 text-sm">Close</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Chargeback Info</p>
                  <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between"><span className="text-gray-400 text-sm">Transaction:</span><code className="text-xs font-mono text-gray-200">{selected.transactionId}</code></div>
                    <div className="flex justify-between"><span className="text-gray-400 text-sm">Amount:</span><span className="text-sm font-medium text-gray-200">{selected.amount.toFixed(2)} {selected.currency}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400 text-sm">Reason:</span><span className="text-sm text-gray-200">{selected.reason}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400 text-sm">Received:</span><span className="text-sm text-gray-200">{new Date(selected.receivedDate).toLocaleDateString()}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400 text-sm">Due:</span><span className="text-sm text-gray-200">{new Date(selected.dueDate).toLocaleDateString()}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400 text-sm">Respondent:</span><span className="text-sm text-gray-200">{selected.respondent}</span></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Notes</p>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-300">{selected.notes}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Evidence ({selected.evidence.length + uploadedFiles.length} files)</p>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    {selected.evidence.length > 0 || uploadedFiles.length > 0 ? (
                      <div className="space-y-2">
                        {selected.evidence.map((ev) => (
                          <div key={ev.id} className="flex items-center justify-between py-2 px-3 bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-sm text-gray-200">{ev.fileName}</p>
                                <p className="text-xs text-gray-500">{new Date(ev.uploadedAt).toLocaleString()}</p>
                              </div>
                            </div>
                            <button onClick={() => handleDownloadEvidence(ev)} className="p-1.5 text-gray-500 hover:text-gray-300">
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {uploadedFiles.map((name, i) => (
                          <div key={'up_' + i} className="flex items-center justify-between py-2 px-3 bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <p className="text-sm text-gray-200">{name}</p>
                            </div>
                            <button onClick={() => handleDownloadEvidence({ id: 'up_' + i, fileName: name, fileType: name.split('.').pop() || 'file', uploadedAt: new Date().toISOString(), url: '' })} className="p-1.5 text-gray-500 hover:text-gray-300">
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No evidence uploaded yet</p>
                    )}
                  </div>
                </div>

                <div className="card border-2 border-dashed border-gray-700">
                  <div className="text-center py-6">
                    <Upload className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Upload new evidence</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, images, or documents</p>
                    <label className="btn-primary text-xs mt-3 cursor-pointer inline-flex">
                      <input type="file" className="hidden" multiple onChange={handleUploadEvidence} />
                      <Upload className="h-3 w-3 mr-1" /> Upload Files
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-800 flex items-center gap-3">
              {(selected.status === 'received' || selected.status === 'under_review') && (
                <>
                  <button onClick={() => setShowResponseForm(!showResponseForm)} className="btn-primary flex items-center gap-2"><MessageSquare className="h-4 w-4" /> {showResponseForm ? 'Cancel' : 'Submit Response'}</button>
                  <button onClick={handleAcceptLiability} className="btn-secondary flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Accept Liability</button>
                  <button onClick={handleRequestExtension} className="btn-ghost flex items-center gap-2"><Clock className="h-4 w-4" /> Request Extension</button>
                </>
              )}
              {selected.status === 'won' && (
                <span className="flex items-center gap-2 text-sm text-success-400"><CheckCircle className="h-4 w-4" /> Resolved in your favor</span>
              )}
              {selected.status === 'lost' && (
                <span className="flex items-center gap-2 text-sm text-danger-400"><AlertCircle className="h-4 w-4" /> Liability accepted</span>
              )}
              {selected.status === 'accepted' && (
                <span className="flex items-center gap-2 text-sm text-warning-400"><AlertCircle className="h-4 w-4" /> Liability accepted</span>
              )}
            </div>

            {showResponseForm && (
              <div className="mt-4 card bg-gray-800/50 border-primary-500/20">
                <h3 className="font-semibold text-gray-100 mb-3">Submit Chargeback Response</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Response Notes</label>
                    <textarea className="input-field h-24" placeholder="Explain why this chargeback should be overturned. Reference the evidence you've uploaded." value={responseNotes} onChange={(e) => setResponseNotes(e.target.value)} />
                    <p className="text-xs text-gray-500 mt-1">Describe how each evidence file supports your case</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Evidence ({uploadedFiles.length + selected.evidence.length} files attached)</p>
                    {uploadedFiles.length === 0 && selected.evidence.length === 0 ? (
                      <p className="text-xs text-warning-400">No evidence attached \u2014 upload files above before submitting</p>
                    ) : (
                      <p className="text-xs text-success-400">Evidence ready for submission</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSubmitResponse(selected)} className="btn-primary flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Confirm & Submit</button>
                    <button onClick={() => setShowResponseForm(false)} className="btn-ghost">Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
