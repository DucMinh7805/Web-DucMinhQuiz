function normalizeItemType(itemType) {
  return String(itemType || '').trim().toLowerCase() === 'book' ? 'book' : 'subject';
}

/** Mã ngắn, ổn định để đối chiếu giao dịch mà không làm mất ID dài. */
export function makePaymentCode(itemType, itemId) {
  const type = normalizeItemType(itemType);
  const id = String(itemId || '').trim();
  const source = `${type}:${id}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  const typeCode = type === 'book' ? 'TL' : 'MON';
  const hint = id.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 10) || 'NOID';
  const checksum = (hash >>> 0).toString(36).toUpperCase().padStart(7, '0').slice(-7);
  return `${typeCode}-${hint}-${checksum}`;
}

export function buildTransferContent(phone, itemType, itemId) {
  const normalizedPhone = String(phone || '').replace(/\D/g, '').slice(-11) || 'SDT';
  return `DQ ${normalizedPhone} ${makePaymentCode(itemType, itemId)}`;
}
