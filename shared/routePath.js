export function safelyDecodeURIComponent(value) {
  const text = String(value || '');
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
