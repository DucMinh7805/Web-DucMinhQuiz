import { OutboxEvent } from '../_models/index.js';
import { callQuizSheet } from './quizSheetGateway.js';
import { scheduleBackgroundTask } from './backgroundTask.js';

async function sendN8n(event) {
  const url = String(process.env.N8N_CONTENT_WEBHOOK_URL || '').trim();
  if (!url) return { skipped: true };
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.N8N_WEBHOOK_SECRET ? { 'X-DiamondQuiz-Secret': process.env.N8N_WEBHOOK_SECRET } : {})
    },
    body: JSON.stringify({ eventId: String(event._id), type: event.type, occurredAt: event.createdAt, ...event.payload })
  });
  if (!response.ok) throw new Error(`n8n trả HTTP ${response.status}`);
  return { skipped: false };
}

export async function deliverOutboxEvent(eventId) {
  const event = await OutboxEvent.findById(eventId);
  if (!event || event.status === 'sent') return;
  try {
    const result = event.destination === 'sheet'
      ? await callQuizSheet(event.payload.action, event.payload.params || {})
      : await sendN8n(event);
    if (result?.skipped) return;
    event.status = 'sent';
    event.sentAt = new Date();
    event.lastError = '';
  } catch (error) {
    event.attempts += 1;
    event.status = event.attempts >= 5 ? 'failed' : 'pending';
    event.nextAttemptAt = new Date(Date.now() + Math.min(60 * 60 * 1000, 2 ** event.attempts * 60 * 1000));
    event.lastError = String(error?.message || error).slice(0, 500);
  }
  await event.save();
}

export async function enqueueOutboxEvent({ type, destination, dedupeKey = '', payload = {} }) {
  const event = await OutboxEvent.create({ type, destination, dedupeKey, payload });
  scheduleBackgroundTask(() => deliverOutboxEvent(event._id), `Outbox ${type}`);
  return event;
}

export async function enqueueN8nEvent(type, payload, dedupeKey = '') {
  if (!String(process.env.N8N_CONTENT_WEBHOOK_URL || '').trim()) return null;
  return enqueueOutboxEvent({ type, destination: 'n8n', dedupeKey, payload });
}
