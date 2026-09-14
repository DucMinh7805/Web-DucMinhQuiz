const API_BASE = '/api';

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const error = new Error(body.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.details = body;
    throw error;
  }
  return res.json();
}

// ========== PUBLIC API ==========

export async function fetchLabValues() {
  return apiFetch(`${API_BASE}/lab-values`);
}

export async function fetchLabTest(id) {
  return apiFetch(`${API_BASE}/lab-values?id=${id}`);
}

export async function searchLabValues(q) {
  return apiFetch(`${API_BASE}/lab-values?q=${encodeURIComponent(q)}`);
}

// ========== ADMIN API ==========

export async function fetchAdminLabData(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`${API_BASE}/admin/lab-values?${qs}`);
}

export async function createLabEntity(type, data) {
  return apiFetch(`${API_BASE}/admin/lab-values`, {
    method: 'POST',
    body: JSON.stringify({ type, data })
  });
}

export async function updateLabEntity(type, id, data, reason = '') {
  return apiFetch(`${API_BASE}/admin/lab-values`, {
    method: 'PATCH',
    body: JSON.stringify({ type, id, data, reason })
  });
}

export async function saveLabTestWithInterpretations(id, data, interpretations) {
  return apiFetch(`${API_BASE}/admin/lab-values?resource=save-test`, {
    method: id ? 'PATCH' : 'POST',
    body: JSON.stringify({ id: id || undefined, data, interpretations })
  });
}

export async function deleteLabEntity(type, id) {
  return apiFetch(`${API_BASE}/admin/lab-values`, {
    method: 'DELETE',
    body: JSON.stringify({ type, id })
  });
}

export async function reorderLabEntities(type, items) {
  return apiFetch(`${API_BASE}/admin/lab-values?resource=reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ type, items })
  });
}

export async function fetchRevisions(targetType, targetId) {
  return apiFetch(`${API_BASE}/admin/lab-values?resource=revisions&targetType=${targetType}&targetId=${targetId}`);
}

export async function restoreRevision(revisionId) {
  return apiFetch(`${API_BASE}/admin/lab-values?resource=revisions&action=restore`, {
    method: 'POST',
    body: JSON.stringify({ revisionId })
  });
}

export async function previewMdImport(content, entries, filename) {
  return apiFetch(`${API_BASE}/admin/lab-values?resource=import-preview`, {
    method: 'POST',
    body: JSON.stringify({ content, entries, filename })
  });
}

export async function importMd(entries, filename) {
  return apiFetch(`${API_BASE}/admin/lab-values?resource=import`, {
    method: 'POST',
    body: JSON.stringify({ entries, filename })
  });
}

export async function publishLabValues(note = '', acknowledgedWarnings = []) {
  return apiFetch(`${API_BASE}/admin/lab-values?resource=publish`, {
    method: 'POST',
    body: JSON.stringify({ note, acknowledgedWarnings })
  });
}

export async function fetchPublishHistory() {
  return apiFetch(`${API_BASE}/admin/lab-values?resource=publish-history`);
}

export async function restorePublishSnapshot(version) {
  return apiFetch(`${API_BASE}/admin/lab-values?resource=publish-restore`, {
    method: 'POST',
    body: JSON.stringify({ version })
  });
}
