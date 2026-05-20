'use client';

import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Search, Download } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import AlertBanner from '@/components/AlertBanner';
import { useToast } from '@/components/Toast';
import type { ReconciliationRecord, Discrepancy, DataTableColumn } from '@/types';

const mockRecords: ReconciliationRecord[] = [
  { id: 'rec_001', transactionId: 'txn_1001', bankReference: 'BNK-2024-001', amount: 1250.00, fee: 25.00, netAmount: 1225.00, transactionDate: '2024-03-15', settlementDate: '2024-03-16', status: 'matched' },
  { id: 'rec_002', transactionId: 'txn_1002', bankReference: 'BNK-2024-002', amount: 89.99, fee: 2.70, netAmount: 87.29, transactionDate: '2024-03-15', settlementDate: '2024-03-16', status: 'matched' },
  { id: 'rec_003', transactionId: 'txn_1003', bankReference: 'BNK-2024-003', amount: 450.00, fee: 9.00, netAmount: 441.00, transactionDate: '2024-03-14', settlementDate: '2024-03-15', status: 'mismatched', discrepancy: 'Amount mismatch: expected $450.00, received $445.00' },
  { id: 'rec_004', transactionId: 'txn_1004', bankReference: 'BNK-2024-004', amount: 2999.99, fee: 59.99, netAmount: 2940.00, transactionDate: '2024-03-14', settlementDate: '2024-03-15', status: 'unmatched' },
  { id: 'rec_005', transactionId: 'txn_1005', bankReference: 'BNK-2024-005', amount: 15.50, fee: 0.78, netAmount: 14.72, transactionDate: '2024-03-13', settlementDate: '2024-03-14', status: 'matched' },
  { id: 'rec_006', transactionId: 'txn_1006', bankReference: 'BNK-2024-006', amount: 780.00, fee: 15.60, netAmount: 764.40, transactionDate: '2024-03-13', settlementDate: '2024-03-14', status: 'pending' },
  { id: 'rec_007', transactionId: 'txn_1007', bankReference: 'BNK-2024-007', amount: 3200.00, fee: 64.00, netAmount: 3136.00, transactionDate: '2024-03-12', settlementDate: '2024-03-13', status: 'mismatched', discrepancy: 'Fee mismatch: expected $64.00, charged $70.00' },
  { id: 'rec_008', transactionId: 'txn_1008', bankReference: 'BNK-2024-008', amount: 67.25, fee: 2.02, netAmount: 65.23, transactionDate: '2024-03-12', settlementDate: '2024-03-13', status: 'matched' },
];

const mockDiscrepancies: Discrepancy[] = [
  { id: 'd_001', transactionId: 'txn_1003', expectedAmount: 450.00, actualAmount: 445.00, difference: 5.00, reason: 'Processing fee discrepancy', status: 'open', createdAt: '2024-03-15T10:30:00Z' },
  { id: 'd_002', transactionId: 'txn_1007', expectedAmount: 3200.00, actualAmount: 3194.00, difference: 6.00, reason: 'Currency conversion variance', status: 'investigating', createdAt: '2024-03-13T14:20:00Z' },
  { id: 'd_003', transactionId: 'txn_1010', expectedAmount: 550.00, actualAmount: 0.00, difference: 550.00, reason: 'Missing settlement', status: 'open', createdAt: '2024-03-12T09:15:00Z' },
];

export default function ReconciliationPage() {
  const { showToast } = useToast();
  const [records] = useState<ReconciliationRecord[]>(mockRecords);
  const [discrepancies] = useState<Discrepancy[]>(mockDiscrepancies);
  const [activeTab, setActiveTab] = useState<'records' | 'discrepancies' | 'upload'>('records');
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      showToast(`File "${files[0].name}" uploaded and processing`, 'success');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      showToast(`File "${e.target.files[0].name}" uploaded and processing`, 'success');
    }
  };

  const handleDownloadUpload = (name: string) => {
    const content = `Upload Report: ${name}\nExported: ${new Date().toISOString()}\n\nThis is a simulated reconciliation file.`;
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${name}`, 'success');
  };

  const filteredRecords = searchQuery
    ? records.filter((r) =>
        r.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.bankReference?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : records;

  const columns: DataTableColumn<ReconciliationRecord>[] = [
    { key: 'transactionId', header: 'Transaction', sortable: true },
    {
      key: 'amount', header: 'Amount', sortable: true,
      render: (r) => <span className="font-medium">${r.amount.toFixed(2)}</span>,
    },
    {
      key: 'fee', header: 'Fee', sortable: true,
      render: (r) => <span className="text-gray-400">${r.fee.toFixed(2)}</span>,
    },
    {
      key: 'netAmount', header: 'Net', sortable: true,
      render: (r) => <span className="font-medium text-success-400">${r.netAmount.toFixed(2)}</span>,
    },
    { key: 'transactionDate', header: 'Date', sortable: true },
    {
      key: 'status', header: 'Status',
      render: (r) => <StatusBadge status={r.status} pulse={r.status === 'pending'} />,
    },
  ];

  const discrepancyColumns: DataTableColumn<Discrepancy>[] = [
    { key: 'transactionId', header: 'Transaction', sortable: true },
    {
      key: 'expectedAmount', header: 'Expected', sortable: true,
      render: (d) => <span className="font-medium">${d.expectedAmount.toFixed(2)}</span>,
    },
    {
      key: 'actualAmount', header: 'Actual', sortable: true,
      render: (d) => <span className="text-danger-400">${d.actualAmount.toFixed(2)}</span>,
    },
    {
      key: 'difference', header: 'Difference', sortable: true,
      render: (d) => <span className={`font-medium ${d.difference > 0 ? 'text-danger-400' : 'text-success-400'}`}>${d.difference.toFixed(2)}</span>,
    },
    { key: 'reason', header: 'Reason' },
    {
      key: 'status', header: 'Status',
      render: (d) => <StatusBadge status={d.status} />,
    },
  ];

  const summaryStats = {
    total: records.length,
    matched: records.filter((r) => r.status === 'matched').length,
    mismatched: records.filter((r) => r.status === 'mismatched').length,
    unmatched: records.filter((r) => r.status === 'unmatched').length,
    pending: records.filter((r) => r.status === 'pending').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Bank Reconciliation</h1>
          <p className="text-gray-500 text-sm mt-1">Match transactions with bank statements</p>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total', value: summaryStats.total, color: 'text-gray-100' },
            { label: 'Matched', value: summaryStats.matched, color: 'text-success-400' },
            { label: 'Mismatched', value: summaryStats.mismatched, color: 'text-danger-400' },
            { label: 'Unmatched', value: summaryStats.unmatched, color: 'text-warning-400' },
            { label: 'Pending', value: summaryStats.pending, color: 'text-primary-400' },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 border-b border-gray-800">
          {([
            { key: 'records', label: 'Reconciliation Records', icon: FileText },
            { key: 'discrepancies', label: 'Discrepancies', icon: AlertCircle },
            { key: 'upload', label: 'Upload Statement', icon: Upload },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'records' && (
          <div className="card p-0">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold text-gray-100">All Records</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    className="input-field pl-10 py-1.5 text-sm w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>
            </div>
            <DataTable columns={columns} data={filteredRecords} pageSize={8} />
          </div>
        )}

        {activeTab === 'discrepancies' && (
          <div className="space-y-4">
            <AlertBanner
              type="warning"
              title={`${discrepancies.length} discrepancies found requiring attention`}
              message="Unmatched amounts may indicate processing errors or bank fee variations."
              dismissible
            />
            <div className="card p-0">
              <div className="p-4 border-b border-gray-800">
                <h2 className="font-semibold text-gray-100">Discrepancy Details</h2>
              </div>
              <DataTable columns={discrepancyColumns} data={discrepancies} pageSize={10} />
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-6">
            <AlertBanner
              type="info"
              title="Supported formats: CSV, Excel (.xlsx, .xls), and BAI2 files"
              message="Files are processed securely and matched against transaction records."
            />

            <div
              className={`card border-2 border-dashed transition-colors ${
                dragOver ? 'border-primary-500 bg-primary-500/5' : 'border-gray-700 hover:border-gray-600'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
            >
              <div className="text-center py-12">
                <Upload className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-300 font-medium mb-2">
                  {dragOver ? 'Drop your file here' : 'Drag & drop bank statement here'}
                </p>
                <p className="text-gray-500 text-sm mb-4">or</p>
                <label className="btn-primary cursor-pointer inline-flex">
                  <input type="file" className="hidden" accept=".csv,.xlsx,.xls,.bai2" onChange={handleFileSelect} />
                  <FileText className="h-4 w-4 mr-2" />
                  Browse Files
                </label>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-100 mb-4">Recent Uploads</h3>
              {[
                { name: 'bank_statement_2024_03_15.xlsx', date: '2024-03-15 14:30', status: 'completed', records: 1250 },
                { name: 'bank_statement_2024_03_14.csv', date: '2024-03-14 09:15', status: 'completed', records: 980 },
                { name: 'bank_statement_2024_03_13.xlsx', date: '2024-03-13 16:45', status: 'processing', records: 0 },
              ].map((upload, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-gray-800/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-200">{upload.name}</p>
                      <p className="text-xs text-gray-500">{upload.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {upload.status === 'completed' && (
                      <span className="text-xs text-gray-500">{upload.records} records</span>
                    )}
                    <StatusBadge status={upload.status} />
                    {upload.status === 'completed' && (
                      <button onClick={() => handleDownloadUpload(upload.name)} className="text-gray-500 hover:text-gray-300">
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
