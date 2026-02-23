'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormFields';
import {
  Mic,
  MicOff,
  Camera,
  Sparkles,
  Save,
  Loader2,
  Trash2,
  FileText,
  X,
  Download,
  CheckCircle,
} from 'lucide-react';
import { RoleGuard } from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import {
  createIncidentReport,
  updateIncidentReport,
  getJobsByOperator,
  getJobs,
} from '@/lib/firestore';
import type { IncidentSeverity, Job } from '@/lib/types';

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AIIncidentReportPage() {
  const { user, firebaseUser } = useAuth();
  const tenantId = user?.tenantId ?? '';
  const isOwner = user?.role === 'owner';
  const isOperator = user?.role === 'operator';

  // ── Jobs ──────────────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');

  const loadJobs = useCallback(async () => {
    if (!tenantId) return;
    try {
      const fetched =
        isOperator && user?.uid
          ? await getJobsByOperator(tenantId, user.uid)
          : await getJobs(tenantId);
      setJobs(fetched);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  }, [tenantId, isOperator, user?.uid]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const jobOptions = [
    { value: '', label: 'Select a job (optional)…' },
    ...jobs.map((j) => ({ value: j.id, label: j.title })),
  ];

  // ── Text / severity ───────────────────────────────────────────────────────
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('medium');

  // ── Photos ────────────────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<{ name: string; preview: string; size: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos = Array.from(files).map((file) => ({
      name: file.name,
      preview: URL.createObjectURL(file),
      size: file.size,
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ── Speech-to-text (Web Speech API) ──────────────────────────────────────
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false); // iOS Safari stops on silence — auto-restart when true
  const finalAccumRef = useRef('');       // keep accumulator in sync across restarts
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [interimText, setInterimText] = useState('');

  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  useEffect(() => {
    setIsSpeechSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }, []);

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR: new () => SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { console.warn('[Speech] SpeechRecognition not supported in this browser'); return; }
    // Seed the accumulator from whatever is already in the description box
    finalAccumRef.current = description;
    shouldRestartRef.current = true;

    const createAndStart = () => {
      const rec = new SR();
      recognitionRef.current = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            finalAccumRef.current += (finalAccumRef.current ? ' ' : '') + t.trim();
            setDescription(finalAccumRef.current);
            setVoiceTranscript(finalAccumRef.current);
          } else {
            interim = t;
          }
        }
        setInterimText(interim);
      };
      rec.onerror = (e) => {
        console.error('[Speech] Error:', e.error);
        if (e.error !== 'no-speech') {
          // no-speech is expected on iOS timeout — handled by onend restart
          shouldRestartRef.current = false;
          setIsListening(false);
        }
        setInterimText('');
      };
      rec.onend = () => {
        setInterimText('');
        if (shouldRestartRef.current) {
          // iOS Safari drops continuous mode on silence — immediately restart
          setTimeout(createAndStart, 150);
        } else {
          setIsListening(false);
        }
      };
      rec.start();
    };

    createAndStart();
    setIsListening(true);
  };

  const stopListening = () => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText('');
  };

  const handleToggleListening = () => { if (isListening) stopListening(); else startListening(); };

  // ── Firestore ─────────────────────────────────────────────────────────────
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Owner approval ─────────────────────────────────────────────────────────
  const [ownerApprovalNote, setOwnerApprovalNote] = useState('');
  const [ownerApproved, setOwnerApproved] = useState(false);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      recognitionRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Generate: save draft to Firestore → render placeholder report ─────────
  const handleGenerate = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const jobTitle = jobs.find((j) => j.id === selectedJobId)?.title;
      const docRef = await createIncidentReport(tenantId, {
        jobId: selectedJobId || '__unassigned__',
        jobTitle,
        operatorId: user?.uid ?? '',
        severity,
        description,
        photos: photos.map((p) => p.name),
        voiceTranscript: voiceTranscript || undefined,
        aiGeneratedReport: undefined,
        resolutionStatus: 'open',
      });
      setSavedDocId(docRef.id);

      const token = await firebaseUser!.getIdToken();
      const res = await fetch(
        'https://us-central1-field-pilot-tech.cloudfunctions.net/genai',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: 'incident',
            payload: {
              jobTitle: jobTitle ?? null,
              operatorName: user?.displayName ?? null,
              date: new Date().toISOString().split('T')[0],
              time: new Date().toTimeString().slice(0, 5),
              severity,
              description,
              photos: photos.map((p) => p.name),
              transcription: voiceTranscript || null,
              location: null,
              witnesses: [],
            },
          }),
        }
      );
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setGeneratedReport(data.markdown);
    } catch (err) {
      console.error('Failed to save incident draft:', err);
      alert('Failed to save incident to Firestore. Check your connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Save final report to Firestore ─────────────────────────────────────────
  const handleSave = async () => {
    if (!savedDocId || !tenantId || isSaving) return;
    setIsSaving(true);
    try {
      await updateIncidentReport(tenantId, savedDocId, {
        aiGeneratedReport: generatedReport ?? '',
        resolutionStatus: ownerApproved ? 'investigating' : 'open',
      });
      setSaveSuccess(true);
    } catch (err) {
      console.error('Failed to save report:', err);
      alert('Failed to update report in Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['owner', 'admin', 'operator']}>
      <PageHeader
        title="AI Incident Report"
        description="Describe the incident using voice, text, or photos — AI generates a structured report."
        actions={
          generatedReport ? (
            <div className="flex gap-2">
              {isOwner && (
                <Button
                  variant="secondary"
                  icon={<Download className="h-4 w-4" />}
                  onClick={() => alert('PDF export — connect PDF generation service')}
                >
                  Export PDF
                </Button>
              )}
              <Button
                icon={
                  isSaving
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : saveSuccess
                    ? <CheckCircle className="h-4 w-4" />
                    : <Save className="h-4 w-4" />
                }
                onClick={handleSave}
                disabled={isSaving || saveSuccess}
              >
                {isSaving ? 'Saving…' : saveSuccess ? 'Saved to Firestore' : 'Save Report'}
              </Button>
            </div>
          ) : undefined
        }
      />

      {!generatedReport ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ── Left panel ── */}
          <div className="space-y-6">

            {/* Job selector */}
            <Card>
              <CardHeader><CardTitle>Linked Job</CardTitle></CardHeader>
              <Select
                label=""
                id="incidentJob"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                options={jobOptions}
              />
            </Card>

            {/* Incident Description */}
            <Card>
              <CardHeader><CardTitle>Incident Description</CardTitle></CardHeader>
              <div className="space-y-4">
                {isSpeechSupported && (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleToggleListening}
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-all ${
                        isListening
                          ? 'bg-red-100 text-red-600 ring-4 ring-red-200 animate-pulse'
                          : 'bg-teal-100 text-teal-600 hover:bg-teal-200'
                      }`}
                    >
                      {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      {isListening ? (
                        <p className="text-sm font-medium text-red-600">● Listening… speak now</p>
                      ) : description ? (
                        <p className="text-sm font-medium text-teal-700">✓ Captured — tap mic to add more</p>
                      ) : (
                        <p className="text-sm text-[#6B7280]">Tap to dictate the incident</p>
                      )}
                      {interimText && (
                        <p className="mt-0.5 text-xs italic text-[#9CA3AF] truncate">{interimText}…</p>
                      )}
                    </div>
                    {description && (
                      <button
                        onClick={() => { stopListening(); setDescription(''); setVoiceTranscript(''); }}
                        className="shrink-0 text-[#9CA3AF] hover:text-red-500 transition-colors"
                        title="Clear"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the incident — what happened, where, when, any injuries or damage… (or tap mic to dictate)"
                  rows={5}
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>
            </Card>

            {/* Severity */}
            <Card>
              <CardHeader><CardTitle>Severity</CardTitle></CardHeader>
              <div className="flex gap-2">
                {(['low', 'medium', 'high', 'critical'] as IncidentSeverity[]).map((level) => (
                  <button key={level} onClick={() => setSeverity(level)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium capitalize transition-colors ${
                      severity === level
                        ? level === 'critical' ? 'border-red-600 bg-red-50 text-red-700'
                          : level === 'high' ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : level === 'medium' ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-green-500 bg-green-50 text-green-700'
                        : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#D1D5DB]'
                    }`}
                  >{level}</button>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Right panel ── */}
          <div className="space-y-6">
            {/* Photo Upload */}
            <Card>
              <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
              <div
                className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-[#E5E7EB] p-8 hover:border-teal-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-10 w-10 text-[#9CA3AF]" />
                <p className="text-sm text-[#6B7280]">Click to upload or capture photos</p>
                <p className="text-xs text-[#9CA3AF]">PNG, JPG up to 10 MB each</p>
                <input ref={fileInputRef} type="file" accept="image/*" multiple capture="environment"
                  className="hidden" onChange={handlePhotoUpload} />
              </div>
              {photos.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {photos.map((photo, i) => (
                    <div key={i} className="group relative rounded-lg overflow-hidden border border-[#E5E7EB]">
                      <img src={photo.preview} alt={photo.name} className="h-24 w-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1 py-0.5 text-[10px] text-white truncate">{formatBytes(photo.size)}</div>
                      <button onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 rounded-full bg-white/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Button
              onClick={handleGenerate}
              disabled={isProcessing || (!description && photos.length === 0 && !voiceTranscript)}
              className="w-full py-4 text-base"
              icon={isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            >
              {isProcessing ? 'Saving & Generating…' : 'Generate Incident Report'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Report saved to Firestore (doc: {savedDocId})
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                Generated Report
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setGeneratedReport(null); setSaveSuccess(false); setSavedDocId(null); }}>
                  Edit Inputs
                </Button>
              </div>
            </CardHeader>
            <div className="prose prose-sm max-w-none rounded-lg bg-gray-50 p-6 text-[#111827]">
              {generatedReport.split('\n').map((line, i) => {
                if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-[#111827] mb-3">{line.replace('# ', '')}</h1>;
                if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold text-[#111827] mt-5 mb-2">{line.replace('## ', '')}</h2>;
                if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-[#111827]">{line.replace(/\*\*/g, '')}</p>;
                if (line.startsWith('- [') || line.startsWith('- ') || line.match(/^\d+\./)) return <p key={i} className="ml-4 text-sm text-[#374151]">{line}</p>;
                if (line.startsWith('---')) return <hr key={i} className="my-4 border-[#E5E7EB]" />;
                if (line.startsWith('*')) return <p key={i} className="text-xs text-[#9CA3AF] italic">{line.replace(/\*/g, '')}</p>;
                if (line.trim() === '') return <br key={i} />;
                return <p key={i} className="text-sm text-[#374151]">{line}</p>;
              })}
            </div>
          </Card>

          {isOwner && (
            <div className="rounded-lg border border-[#E5E7EB] bg-gray-50 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-teal-600" />
                <h3 className="font-semibold text-[#111827]">Owner Review &amp; Approval</h3>
              </div>
              {ownerApproved && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  Report approved on {new Date().toLocaleDateString()}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">Approval Notes</label>
                <textarea value={ownerApprovalNote} onChange={(e) => setOwnerApprovalNote(e.target.value)}
                  placeholder="Add corrective actions, reviewer notes, or comments before finalizing…" rows={4}
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200" />
              </div>
              <Button onClick={() => setOwnerApproved(true)} icon={<CheckCircle className="h-4 w-4" />} disabled={ownerApproved}>
                Approve &amp; Finalize Report
              </Button>
            </div>
          )}
        </div>
      )}
    </RoleGuard>
  );
}
