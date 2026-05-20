export function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadReportFile(type: string, format: string, startDate: string, endDate: string) {
  const ext = format === 'pdf' ? 'pdf' : format === 'excel' ? 'xlsx' : 'csv';
  const mime = format === 'pdf' ? 'application/pdf' : format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv';
  const content = `Simulated ${format.toUpperCase()} report: ${type}\nDate Range: ${startDate} - ${endDate}\nGenerated: ${new Date().toISOString()}\nStatus: completed\n`;
  downloadBlob(content, `report_${type}_${startDate}.${ext}`, mime);
}

export function downloadChargebacksCSV(data: any[]) {
  const header = 'ID,Transaction,Amount,Currency,Reason,Status,Due Date\n';
  const rows = data.map((c: any) =>
    `${c.id},${c.transactionId},${c.amount},${c.currency},"${c.reason}",${c.status},${c.dueDate}`
  ).join('\n');
  downloadBlob(header + rows, `chargebacks_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
}

export function downloadEvidenceFile(name: string) {
  const content = `Evidence file: ${name}\nDownloaded: ${new Date().toISOString()}\n\nThis is a simulated evidence file for demonstration purposes.`;
  downloadBlob(content, name, 'application/octet-stream');
}
