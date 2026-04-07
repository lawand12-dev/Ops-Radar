const AUDIT_ACCESS_STORAGE_PREFIX = 'opsradar_audit_access'

export function getAuditAccessStorageKey(auditId: string | null): string {
  return auditId ? `${AUDIT_ACCESS_STORAGE_PREFIX}:${auditId}` : AUDIT_ACCESS_STORAGE_PREFIX
}

export function getStoredAuditAccessToken(auditId: string | null): string {
  if (!auditId || typeof window === 'undefined') {
    return ''
  }

  return (window.localStorage.getItem(getAuditAccessStorageKey(auditId)) ?? '')
    .trim()
    .slice(0, 2048)
}

export function storeAuditAccessToken(auditId: string, token: string): void {
  if (!auditId || typeof window === 'undefined') {
    return
  }

  const normalizedToken = token.trim().slice(0, 2048)
  if (!normalizedToken) {
    return
  }

  window.localStorage.setItem(getAuditAccessStorageKey(auditId), normalizedToken)
}

export function clearStoredAuditAccessToken(auditId: string | null): void {
  if (!auditId || typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(getAuditAccessStorageKey(auditId))
}
