'use client';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

import { useState, useRef, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { printDocument } from '@/lib/printDoc';
import {
  Mic,
  MicOff,
  Camera,
  Sparkles,
  Save,
  Loader2,
  FileText,
  X,
  Plus,
  Edit3,
  Download,
  Trash2,
} from 'lucide-react';
import { RoleGuard } from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import { createProposal, getJobs } from '@/lib/firestore';
import { callGenAI } from '@/lib/genai';
import type { Job } from '@/lib/types';

export default function AIProposalGeneratorPage() {
  const { user, firebaseUser } = useAuth();
  const isOwner = user?.role === 'owner';
  const tenantId = user?.tenantId ?? '';
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectText, setProjectText] = useState('');
  const [photos, setPhotos] = useState<{ name: string; preview: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [generatedProposal, setGeneratedProposal] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableProposal, setEditableProposal] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const markdownRef = useRef<HTMLDivElement>(null);

  // ── Speech-to-text (Web Speech API) ──────────────────────────────────────
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false); // iOS Safari stops on silence — auto-restart when true
  const finalAccumRef = useRef('');       // keep accumulator in sync across restarts
  const [listeningTarget, setListeningTarget] = useState<'project' | null>(null);
  const isListening = listeningTarget !== null;
  const [interimText, setInterimText] = useState('');
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState('');

  // Must run client-side only — window is undefined during SSR
  useEffect(() => {
    setIsSpeechSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }, []);

  const startListening = (target: 'project') => {
    setSpeechError('');
    // Stop any active session before starting a new one
    if (recognitionRef.current) { shouldRestartRef.current = false; recognitionRef.current.stop(); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR: new () => any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSpeechError('Speech recognition not supported. Use Chrome or Edge.'); return; }
    // Seed the accumulator from the current value of the project textarea
    finalAccumRef.current = projectText;
    shouldRestartRef.current = true;

    const createAndStart = () => {
      const rec = new SR();
      recognitionRef.current = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e: any) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) {
            finalAccumRef.current += (finalAccumRef.current ? ' ' : '') + t.trim();
            setProjectText(finalAccumRef.current);
          } else {
            interim = t;
          }
        }
        setInterimText(interim);
      };
      rec.onerror = (e: any) => {
        if (e.error === 'not-allowed') {
          setSpeechError('Microphone access denied. Click the mic icon in your browser address bar to allow it.');
          shouldRestartRef.current = false;
          setListeningTarget(null);
        } else if (e.error === 'audio-capture') {
          setSpeechError('No microphone found or it is in use by another app. Check your audio settings and try again.');
          shouldRestartRef.current = false;
          setListeningTarget(null);
        } else if (e.error === 'no-speech') {
          // iOS fires no-speech when it times out — handled by onend restart below
        } else if (e.error === 'aborted') {
          // User or code stopped the session intentionally — no UI error needed
        } else {
          setSpeechError(`Microphone error: ${e.error}. Try reloading the page.`);
          shouldRestartRef.current = false;
          setListeningTarget(null);
        }
        setInterimText('');
      };
      rec.onend = () => {
        setInterimText('');
        if (shouldRestartRef.current) {
          // iOS Safari drops continuous mode on silence — immediately restart
          setTimeout(createAndStart, 150);
        } else {
          setListeningTarget(null);
        }
      };
      rec.start();
    };

    createAndStart();
    setListeningTarget(target);
  };

  const stopListening = () => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    setListeningTarget(null);
    setInterimText('');
  };

  const handleToggleListening = (target: 'project') => {
    if (listeningTarget === target) stopListening();
    else startListening(target);
  };

  // Cleanup on unmount
  useEffect(() => { return () => { recognitionRef.current?.stop(); }; }, []);

  // Load available jobs to link proposal to
  useEffect(() => {
    if (!tenantId) return;
    getJobs(tenantId).then(setJobs).catch(console.error);
  }, [tenantId]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos = Array.from(files).map((file) => ({
      name: file.name,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!firebaseUser) return;
    setIsProcessing(true);
    try {
      const token = await firebaseUser.getIdToken();
      const data = await callGenAI(token, {
        type: 'proposal',
        payload: {
          projectName,
          clientName,
          text: projectText,
          photos: photos.map((p) => p.name),
        },
      });
      setGeneratedProposal(data.markdown);
      setEditableProposal(data.markdown);
    } catch (err) {
      console.error('Failed to generate proposal:', err);
      alert('Failed to generate proposal. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const ref = await createProposal(tenantId, {
        jobId: selectedJobId || '',
        specsJson: { projectName, clientName, projectText },
        images: photos.map((p) => p.name),
        aiGeneratedText: isEditing ? editableProposal : (generatedProposal ?? ''),
        priceEstimate: 0,
        version: 1,
        status: 'draft',
      });
      setSavedId((ref as { id?: string }).id ?? 'saved');
    } catch (err) {
      console.error('Failed to save proposal:', err);
      alert('Failed to save proposal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const content = isEditing ? editableProposal : (generatedProposal || '');

  return (
    <RoleGuard allowedRoles={['owner', 'admin']}>
      <PageHeader
        title="AI Proposal Generator"
        description="Provide project details via voice, text, photos, or specs — AI generates a professional proposal."
        actions={
          generatedProposal ? (
            <div className="flex gap-2">
              {isOwner && (
                <Button
                  variant="secondary"
                  icon={<Download className="h-4 w-4" />}
                  onClick={() => printDocument(
                    projectName || 'Proposal',
                    markdownRef.current?.innerHTML ?? ''
                  )}
                >
                  Export PDF
                </Button>
              )}
              <Button
                variant="secondary"
                icon={<Edit3 className="h-4 w-4" />}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Preview' : 'Edit'}
              </Button>
              <Button icon={<Save className="h-4 w-4" />} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : savedId ? 'Saved ✓' : 'Save Proposal'}
              </Button>
            </div>
          ) : undefined
        }
      />

      {!generatedProposal ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Project Details */}
          <div className="space-y-6">
            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                {/* Link to existing job (optional) */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#374151]">
                    Link to Job <span className="text-[#9CA3AF] font-normal">(optional)</span>
                  </label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  >
                    <option value="">No job selected (save as standalone draft)</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>{j.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#374151]">Project Name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Electrical Panel Upgrade"
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#374151]">Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  />
                </div>
              </div>
            </Card>

            {/* Single consolidated project input (text + mic) */}
            <Card>
              <CardHeader>
                <CardTitle>Tell Us About the Project</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                {isSpeechSupported && (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleToggleListening('project')}
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-all ${
                        listeningTarget === 'project' ? 'bg-red-100 text-red-600 ring-4 ring-red-200 animate-pulse' : 'bg-teal-100 text-teal-600 hover:bg-teal-200'
                      }`}
                    >
                      {listeningTarget === 'project' ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      {listeningTarget === 'project' ? (
                        <p className="text-sm font-medium text-red-600">● Listening… speak now</p>
                      ) : projectText ? (
                        <p className="text-sm font-medium text-teal-700">✓ Transcript captured — tap mic to add more</p>
                      ) : (
                        <p className="text-sm text-[#6B7280]">Tap to dictate the project details</p>
                      )}
                      {listeningTarget === 'project' && interimText && (
                        <p className="mt-0.5 text-xs italic text-[#9CA3AF] truncate">{interimText}…</p>
                      )}
                    </div>
                    {projectText && (
                      <button
                        onClick={() => { stopListening(); setProjectText(''); setSpeechError(''); }}
                        className="shrink-0 text-[#9CA3AF] hover:text-red-500 transition-colors"
                        title="Clear"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
                {speechError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{speechError}</p>
                )}
                <textarea
                  value={projectText}
                  onChange={(e) => setProjectText(e.target.value)}
                  placeholder="Describe the project — scope, materials, site conditions, deadlines, constraints, or tap mic to dictate"
                  rows={8}
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>
            </Card>

            {/* Photo Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Site Photos</CardTitle>
              </CardHeader>
              <div
                className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-[#E5E7EB] p-8 hover:border-teal-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-10 w-10 text-[#9CA3AF]" />
                <p className="text-sm text-[#6B7280]">Upload site photos for AI context</p>
                <p className="text-xs text-[#9CA3AF]">PNG, JPG up to 10 MB each</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              {photos.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {photos.map((photo, i) => (
                    <div key={i} className="group relative rounded-lg overflow-hidden border border-[#E5E7EB]">
                      <img src={photo.preview} alt={photo.name} className="h-24 w-full object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                        className="absolute top-1 right-1 rounded-full bg-white/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isProcessing || (!projectName && !projectText && photos.length === 0)}
              className="w-full py-4 text-base"
              icon={isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            >
              {isProcessing ? 'Generating Proposal…' : 'Generate Proposal with AI'}
            </Button>
          </div>
        </div>
      ) : (
        /* Generated Proposal View */
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                {isEditing ? 'Editing Proposal' : 'Generated Proposal'}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setGeneratedProposal(null)}>
                  Start Over
                </Button>
              </div>
            </CardHeader>
            {isEditing ? (
              <textarea
                value={editableProposal}
                onChange={(e) => setEditableProposal(e.target.value)}
                rows={40}
                className="w-full rounded-lg border border-[#E5E7EB] bg-white p-4 font-mono text-sm text-[#111827] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
            ) : (
              <MarkdownRenderer
                ref={markdownRef}
                content={content}
                className="rounded-lg bg-gray-50 p-6"
              />
            )}
          </Card>
        </div>
      )}
    </RoleGuard>
  );
}
