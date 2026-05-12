export const API_BASE = 'http://192.168.86.250:5001';

export async function fetchOutfit({ location, tempSensitivity, date, timeStart, timeEnd, eventType }) {
  const runs_cold = tempSensitivity < 0;
  const body = { location, runs_cold, event_type: eventType || 'casual' };
  if (date) body.date = date;
  if (timeStart != null) body.time_start = timeStart;
  if (timeEnd != null) body.time_end = timeEnd;

  const res = await fetch(`${API_BASE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export async function fetchTrip({ location, startDate, endDate, tempSensitivity, tripType }) {
  const res = await fetch(`${API_BASE}/trip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      start_date: startDate,
      end_date: endDate,
      runs_cold: tempSensitivity < 0,
      trip_type: tripType || 'leisure',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}
