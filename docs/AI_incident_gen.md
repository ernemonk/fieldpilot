# AI Incident Report — Feature Spec

Purpose
- Provide operators/owners/admins a quick way to capture incidents using voice, text, and photos and have the app generate a structured incident report (Markdown) using AI.

Who can use
- Roles: `owner`, `admin`, `operator` (enforced by the component RoleGuard)

Inputs collected in the UI
- Linked Job (optional)
- Voice description (client-side audio recording; currently stored in state, not uploaded)
- Text description
- Photos (client-side previews; filenames are saved until Storage upload is wired)
- Severity: one of `low`, `medium`, `high`, `critical`

Basic UI flow
- User fills any of the inputs (text, photos, or voice) and clicks **Generate Incident Report**.
- The current implementation saves a draft document to Firestore via `createIncidentReport` and then displays a placeholder AI-generated Markdown report.
- Owner users can add approval notes and finalize the report; saving writes `aiGeneratedReport` back to Firestore via `updateIncidentReport`.

Where to find the implementation
- UI and logic: [src/app/(app)/ai/incident/page.tsx](src/app/(app)/ai/incident/page.tsx#L1-L120)
- Firestore helpers: [src/lib/firestore.ts](src/lib/firestore.ts#L240-L320)
- Types: [src/lib/types.ts](src/lib/types.ts#L120-L180)

Firestore data model (fields used by this feature)
- Collection path: `tenants/{tenantId}/incidentReports`
- Key `IncidentReport` fields (from types):
	- `jobId: string`
	- `jobTitle?: string`
	- `operatorId: string`
	- `severity: 'low'|'medium'|'high'|'critical'`
	- `description: string`
	- `photos: string[]` (filenames / placeholder until storage is implemented)
	- `voiceNoteRecorded: boolean`
	- `aiGeneratedReport?: string` (Markdown output saved after owner saves)
	- `resolutionStatus: 'open'|'investigating'|'resolved'|'closed'`

Generated report template (current placeholder produced by the UI)
```md
# Incident Report

## Summary
${description || 'Field incident captured via AI Incident Report.'}

## Severity
**${severity.toUpperCase()}**

## Details
- **Date:** ${new Date().toLocaleDateString()}
- **Time:** ${new Date().toLocaleTimeString()}
- **Job:** ${jobTitle ?? 'Unspecified'}
- **Operator:** ${user?.displayName ?? 'Unknown'}
- **Photos Attached:** ${photos.length}
- **Voice Note:** ${audioBlob ? `Yes` : 'No'}

## AI Analysis
*[AI endpoint placeholder — Gemini integration pending]*

Based on submitted inputs, this incident has been classified as **${severity}** severity.
${photos.length > 0 ? `${photos.length} photo(s) were captured at the scene.` : ''}
${audioBlob ? 'A voice note was recorded and will be transcribed when the AI endpoint is connected.' : ''}

1. ${severity === 'critical' || severity === 'high' ? '**Immediate supervisor notification required**' : 'Notify supervisor within 24 hours'}
2. Document the area and secure the site
3. Schedule follow-up inspection
4. Complete corrective action report within ${severity === 'critical' ? '2 hours' : severity === 'high' ? '24 hours' : '72 hours'}

## Corrective Actions
- [ ] Isolate / secure affected area
- [ ] Notify site supervisor
- [ ] Document with additional photos if safe
- [ ] Schedule certified review
- [ ] Follow up within ${severity === 'critical' ? '2 hours' : severity === 'high' ? '24 hours' : '72 hours'}

---
*Draft saved to Firestore (doc: ${docRef.id}) — AI processing pending • ${new Date().toLocaleString()}*
```

Integration notes & next steps to connect real AI
- Current behavior: placeholder generation is simulated client-side (`handleGenerate` uses a timeout and inserts the Markdown string into state). Voice is recorded to a Blob in memory but not uploaded; photos are only saved as filenames.
- To integrate a real AI endpoint (Gemini, OpenAI, etc.):
	1. Implement a server-side API route to call the chosen LLM (avoid exposing keys to client).
	2. In `handleGenerate`, upload photos to Firebase Storage (if you want URLs), upload the voice note (or run transcription), then pass the text, photo URLs, and transcription to the server AI endpoint.
	3. Replace the placeholder string with the AI response (Markdown) and call `updateIncidentReport` to persist `aiGeneratedReport`.
	4. Optionally add status tracking (e.g., `aiProcessing: boolean`) to the incident report document.

Developer pointers
- Edit generation flow: [src/app/(app)/ai/incident/page.tsx](src/app/(app)/ai/incident/page.tsx#L160-L210)
- Persisted fields: see `IncidentReport` in [src/lib/types.ts](src/lib/types.ts#L120-L180)
- Firestore create/update helpers: [src/lib/firestore.ts](src/lib/firestore.ts#L260-L310)

**Canonical LLM Prompt (Incident Report)**

System:
- You are an expert incident analyst and technical writer. Produce concise, factual, and non-judgmental reports. Never invent facts — if information is missing, mark it as [ASSUMED] and explain why. Prioritize operator safety and clear next steps.

User (input JSON):
- Provide exactly these keys (missing keys may be null/empty):
  - `jobTitle` (string)
  - `operatorName` (string)
  - `date` (ISO date string)
  - `time` (HH:MM or ISO time)
  - `severity` (one of: "low","medium","high","critical" — may be null)
  - `description` (free text describing what happened)
  - `photos` (array of strings — captions or URLs; may be empty)
  - `transcription` (string — optional voice note transcription)
  - `location` (string — optional)
  - `witnesses` (array of names — optional)

Task:
1. Produce a Markdown incident report with these sections:
	- Title line: `# Incident Report`
	- `## Summary` — 1–2 sentence neutral summary combining `description` and `transcription`.
	- `## Severity` — one-line normalized severity (UPPERCASE) and 1–2 sentence rationale tying to evidence.
	- `## Details` — bullet list of Date, Time, Job, Operator, Location, Witnesses, Photo count (list captions), Voice note presence.
	- `## AI Analysis` — 3–5 concise bullet points: likely root cause(s), immediate risks, and risk classification (Low/Medium/High/Critical) with supporting evidence from inputs.
	- `## Immediate Actions` — numbered, prioritized steps to secure safety and evidence (what to do in next 0–2 hours).
	- `## Corrective Actions` — checklist items (`- [ ]`) for medium-term fixes and investigations.
	- `## Notifications` — list suggested recipients (roles/positions, e.g., "Site Supervisor", "Safety Officer") and suggested urgency (e.g., "immediate", "within 24 hours").
	- `## Follow-up` — suggested timeline for follow-ups (dates/hours) and who should own them.
	- `## Notes & Assumptions` — any assumptions or missing data that were used; mark explicitly with `[ASSUMED]`.
	- Footer: one-line timestamp and `*Confidence: 0.x*` where confidence is a decimal 0.0–1.0 reflecting how well inputs support conclusions.

2. Also output a compact JSON object after the Markdown (separated by a line with `---json---`) with keys:
	- `severityNormalized` ("low"|"medium"|"high"|"critical")
	- `riskLevel` ("low"|"medium"|"high"|"critical")
	- `notify` (array of strings)
	- `estimatedFollowUpHours` (number)
	- `tags` (array of short strings)

Formatting & constraints:
- Output only Markdown followed by the JSON block separator `---json---` and the JSON; do not add extra commentary.
- Keep the Markdown length under ~800 words.
- If `severity` is missing, infer from `description`/`transcription` and label the inference in `Notes & Assumptions`.
- Do not hallucinate technical specifics — use placeholders labelled `[ASSUMED]` when needed.

Example (input → high-level expected output):
- Input: `{ "jobTitle":"Main Street Retrofit", "operatorName":"Alex R.", "date":"2026-02-20","time":"14:12","severity":null,"description":"Worker slipped on wet floor, hit head; bleeding controlled with bandage","photos":["floor_wet.jpg"],"transcription":"" }`
- Output: Markdown with Summary referencing slipped on wet floor, Severity inferred as HIGH with rationale, Immediate Actions including call emergency services if head injury signs, Corrective Actions checklist, Notifications to Site Supervisor & Safety Officer, then JSON with severityNormalized:"high", notify:["Site Supervisor","Safety Officer"], estimatedFollowUpHours:24.

