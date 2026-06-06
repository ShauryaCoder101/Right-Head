import api from './api';

function downloadBlob(data, filename, mime) {
  const blob = new Blob([data], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function exportCsv(jdId) {
  const { data } = await api.get(`/export/csv/${jdId}`, { responseType: 'blob' });
  downloadBlob(data, `shortlist_${jdId}.csv`, 'text/csv');
}

export async function exportPdf(jdId) {
  const { data } = await api.get(`/export/pdf/${jdId}`, { responseType: 'blob' });
  downloadBlob(data, `shortlist_${jdId}.pdf`, 'application/pdf');
}

export async function exportCandidatePdf(candidateId, jdId) {
  const { data } = await api.get(`/export/candidate/${candidateId}`, {
    params: { jdId },
    responseType: 'blob',
  });
  downloadBlob(data, `candidate_${candidateId}.pdf`, 'application/pdf');
}
