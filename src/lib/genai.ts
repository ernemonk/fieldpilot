export async function callGenAI(token: string, body: unknown) {
  const res = await fetch('https://us-central1-field-pilot-tech.cloudfunctions.net/genai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`genai API error ${res.status}: ${text}`);
  }
  return res.json();
}
