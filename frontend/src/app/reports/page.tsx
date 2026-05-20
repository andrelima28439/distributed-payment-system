'use client';

import { useState, useCallback } from 'react';
import { Download, FileText, FileSpreadsheet, FileBarChart, Calendar, RefreshCw, Clock, XCircle } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { downloadReportFile } from '@/lib/download';
import type { Report, DataTableColumn } from '@/types';

let reportCounter = 6;

const initialReports: Report[] = [
  { id: 'rpt_001', type: 'daily_summary', format: 'pdf', status: 'completed', dateRange: { start: '2024-03-14', end: '2024-03-14' }, createdAt: '2024-03-15T01:00:00Z', completedAt: '2024-03-15T01:02:30Z', url: '/reports/daily_2024-03-14.pdf' },
  { id: 'rpt_002', type: 'monthly_statement', format: 'excel', status: 'completed', dateRange: { start: '2024-02-01', end: '2024-02-29' }, createdAt: '2024-03-01T00:00:00Z', completedAt: '2024-03-01T00:05:00Z', url: '/reports/monthly_2024-02.xlsx' },
  { id: 'rpt_003', type: 'transaction_log', format: 'csv', status: 'generating', dateRange: { start: '2024-03-01', end: '2024-03-15' }, createdAt: '2024-03-15T10:00:00Z' },
  { id: 'rpt_004', type: 'settlement_report', format: 'pdf', status: 'pending', dateRange: { start: '2024-03-10', end: '2024-03-15' }, createdAt: '2024-03-15T09:30:00Z' },
  { id: 'rpt_005', type: 'fraud_analysis', format: 'excel', status: 'failed', dateRange: { start: '2024-03-01', end: '2024-03-14' }, createdAt: '2024-03-15T08:00:00Z', errorMessage: 'Data export timeout' },
  { id: 'rpt_006', type: 'daily_summary', format: 'csv', status: 'completed', dateRange: { start: '2024-03-13', end: '2024-03-13' }, createdAt: '2024-03-14T01:00:00Z', completedAt: '2024-03-14T01:01:45Z', url: '/reports/daily_2024-03-13.csv' },
];

const reportTypeLabels: Record<string, string> = {
  daily_summary: 'Daily Summary',
  monthly_statement: 'Monthly Statement',
  transaction_log: 'Transaction Log',
  settlement_report: 'Settlement Report',
  fraud_analysis: 'Fraud Analysis',
};

const formatIcons: Record<string, React.ReactNode> = {
  csv: <FileText className="h-4 w-4" />,
  excel: <FileSpreadsheet className="h-4 w-4" />,
  pdf: <FileBarChart className="h-4 w-4" />,
};

export default function ReportsPage() {
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [startDate, setStartDate] = useState('2024-03-01');
  const [endDate, setEndDate] = useState('2024-03-15');
  const [reportType, setReportType] = useState('daily_summary');
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('pdf');

  const handleDownload = useCallback((report: Report) => {
    const label = reportTypeLabels[report.type];
    downloadReportFile(label, report.format, report.dateRange.start, report.dateRange.end);
    showToast(`Downloaded ${label}`, 'success');
  }, [showToast]);

  const handleRetry = useCallback((report: Report) => {
    setReports((prev) =>
      prev.map((r) => r.id === report.id ? { ...r, status: 'generating' as const } : r)
    );
    showToast(`Retrying ${reportTypeLabels[report.type]}...`, 'info');
    setTimeout(() => {
      setReports((prev) =>
        prev.map((r) => r.id === report.id ? { ...r, status: 'completed' as const, completedAt: new Date().toISOString() } : r)
      );
      showToast(`${reportTypeLabels[report.type]} generated successfully`, 'success');
    }, 2000);
  }, [showToast]);

  const handleExportAll = useCallback(() => {
    const completed = reports.filter((r) => r.status === 'completed');
    if (completed.length === 0) {
      showToast('No completed reports to export', 'error');
      return;
    }
    const csv = completed.map((r) =>
      `${r.id},${reportTypeLabels[r.type]},${r.format},${r.dateRange.start},${r.dateRange.end}`
    ).join('\n');
    downloadReportFile('all_reports', 'csv', '', '');
    showToast(`Exported ${completed.length} reports`, 'success');
  }, [reports, showToast]);

  const handleRefresh = useCallback(() => {
    showToast('Report list refreshed', 'info');
  }, [showToast]);

  const handleRetryAll = useCallback(() => {
    const failed = reports.filter((r) => r.status === 'failed');
    failed.forEach((r) => handleRetry(r));
  }, [reports, handleRetry, showToast]);

  const handleGenerate = useCallback(() => {
    reportCounter++;
    const newReport: Report = {
      id: `rpt_${String(reportCounter).padStart(3, '0')}`,
      type: reportType as Report['type'],
      format,
      status: 'generating',
      dateRange: { start: startDate, end: endDate },
      createdAt: new Date().toISOString(),
    };
    setReports((prev) => [newReport, ...prev]);
    showToast(`Generating ${reportTypeLabels[reportType]}...`, 'info');
    setTimeout(() => {
      setReports((prev) =>
        prev.map((r) => r.id === newReport.id ? { ...r, status: 'completed' as const, completedAt: new Date().toISOString() } : r)
      );
      showToast(`${reportTypeLabels[reportType]} ready`, 'success');
    }, 2000);
  }, [reportType, format, startDate, endDate, showToast]);

  const columns: DataTableColumn<Report>[] = [
    {
      key: 'type', header: 'Report Type',
      render: (r) => (
        <div className="flex items-center gap-2">
          {formatIcons[r.format]}
          <span className="text-sm text-gray-200">{reportTypeLabels[r.type]}</span>
        </div>
      ),
    },
    {
      key: 'format', header: 'Format',
      render: (r) => <code className="text-xs font-mono text-gray-400 uppercase">{r.format}</code>,
    },
    {
      key: 'dateRange', header: 'Date Range',
      render: (r) => <span className="text-xs text-gray-400">{r.dateRange.start} to {r.dateRange.end}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (r) => <StatusBadge status={r.status} pulse={r.status === 'generating' || r.status === 'pending'} />,
    },
    {
      key: 'createdAt', header: 'Requested',
      render: (r) => <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</span>,
    },
    {
      key: 'actions', header: '',
      render: (r) => (
        r.status === 'completed' ? (
          <button onClick={() => handleDownload(r)} className="p-1.5 text-primary-400 hover:text-primary-300 rounded-lg hover:bg-primary-500/10" title="Download">
            <Download className="h-4 w-4" />
          </button>
        ) : r.status === 'failed' ? (
          <button onClick={() => handleRetry(r)} className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800" title="Retry">
            <RefreshCw className="h-4 w-4" />
          </button>
        ) : (
          <Clock className="h-4 w-4 text-gray-600" />
        )
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Financial Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Generate and download financial reports</p>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-100 mb-4">Generate New Report</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Report Type</label>
              <select className="select-field" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="daily_summary">Daily Summary</option>
                <option value="monthly_statement">Monthly Statement</option>
                <option value="transaction_log">Transaction Log</option>
                <option value="settlement_report">Settlement Report</option>
                <option value="fraud_analysis">Fraud Analysis</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Format</label>
              <div className="flex gap-2">
                {(['csv', 'excel', 'pdf'] as const).map((fmt) => (
                  <button key={fmt} onClick={() => setFormat(fmt)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${format === fmt ? 'bg-primary-600/10 border-primary-500/30 text-primary-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input type="date" className="input-field pl-10" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input type="date" className="input-field pl-10" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex items-end">
              <button onClick={handleGenerate} className="btn-primary w-full flex items-center justify-center gap-2">
                <FileBarChart className="h-4 w-4" /> Generate
              </button>
            </div>
          </div>
        </div>

        <div className="card p-0">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-gray-100">Generated Reports</h2>
            <div className="flex items-center gap-2">
              <button onClick={handleRefresh} className="btn-ghost text-xs flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Refresh</button>
              <button onClick={handleExportAll} className="btn-ghost text-xs flex items-center gap-1"><Download className="h-3 w-3" /> Export All</button>
            </div>
          </div>
          <DataTable columns={columns} data={reports} pageSize={10} />
        </div>

        {reports.filter((r) => r.status === 'failed').length > 0 && (
          <div className="card bg-danger-500/5 border-danger-500/20">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-danger-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-danger-300">Recent Report Failures</p>
                {reports.filter((r) => r.status === 'failed').map((r) => (
                  <p key={r.id} className="text-xs text-gray-400 mt-1">{reportTypeLabels[r.type]} - {r.errorMessage}</p>
                ))}
              </div>
              <button onClick={handleRetryAll} className="btn-secondary text-xs ml-auto">Retry All</button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
