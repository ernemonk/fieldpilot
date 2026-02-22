'use client';

import { useState, useRef, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
} from 'lucide-react';
import { RoleGuard } from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import { createProposal, getJobs } from '@/lib/firestore';
import type { Job } from '@/lib/types';

export default function AIProposalGeneratorPage() {
  const { user, firebaseUser } = useAuth();
  const isOwner = user?.role === 'owner';
  const tenantId = user?.tenantId ?? '';
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [specs, setSpecs] = useState('');
  const [isRecording, setIsRecording] = useState(false);
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

  // Load available jobs to link proposal to
  useEffect(() => {
    if (!tenantId) return;
    getJobs(tenantId).then(setJobs).catch(console.error);
  }, [tenantId]);

  const handleToggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: integrate Web Speech API for voice capture
  };

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
      const res = await fetch(
        'https://us-central1-field-pilot-tech.cloudfunctions.net/genai',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: 'proposal',
            payload: {
              projectName,
              clientName,
              description,
              specs,
              photos: photos.map((p) => p.name),
              budgetRange: null,
              preferredTimeline: null,
              siteConstraints: null,
              additionalNotes: null,
            },
          }),
        }
      );
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
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
        specsJson: { projectName, clientName, description, specs },
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
                  onClick={() => alert('PDF export — connect to PDF generation service')}
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

            {/* Voice Recording */}
            <Card>
              <CardHeader>
                <CardTitle>Voice Description</CardTitle>
              </CardHeader>
              <div className="flex flex-col items-center gap-4 py-6">
                <button
                  onClick={handleToggleRecording}
                  className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${
                    isRecording
                      ? 'bg-red-100 text-red-600 ring-4 ring-red-200 animate-pulse'
                      : 'bg-teal-100 text-teal-600 hover:bg-teal-200'
                  }`}
                >
                  {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                </button>
                <p className="text-sm text-[#6B7280]">
                  {isRecording ? 'Recording… tap to stop' : 'Describe the project scope verbally'}
                </p>
              </div>
            </Card>

            {/* Text Description */}
            <Card>
              <CardHeader>
                <CardTitle>Project Description</CardTitle>
              </CardHeader>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the project — scope, goals, site conditions, special requirements…"
                rows={4}
                className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
            </Card>
          </div>

          {/* Right: Specs, Photos, Generate */}
          <div className="space-y-6">
            {/* Technical Specs */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Specifications</CardTitle>
              </CardHeader>
              <textarea
                value={specs}
                onChange={(e) => setSpecs(e.target.value)}
                placeholder="Panel size, circuit requirements, conduit type, voltage, code references…"
                rows={4}
                className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
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
              disabled={isProcessing || (!projectName && !description && photos.length === 0)}
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
              <div className="prose prose-sm max-w-none rounded-lg bg-gray-50 p-6 text-[#111827]">
                {content.split('\n').map((line, i) => {
                  if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-[#111827] mb-3">{line.replace('# ', '')}</h1>;
                  if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold text-[#111827] mt-5 mb-2">{line.replace('## ', '')}</h2>;
                  if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-[#111827] mt-4 mb-1">{line.replace('### ', '')}</h3>;
                  if (line.startsWith('| ')) {
                    const cells = line.split('|').filter(Boolean).map((c) => c.trim());
                    if (cells.every((c) => c.match(/^[-]+$/))) return null;
                    return (
                      <div key={i} className="flex gap-4 py-1 text-sm text-[#374151]">
                        {cells.map((cell, j) => (
                          <span key={j} className={`flex-1 ${cell.startsWith('**') ? 'font-semibold text-[#111827]' : ''}`}>
                            {cell.replace(/\*\*/g, '')}
                          </span>
                        ))}
                      </div>
                    );
                  }
                  if (line.startsWith('- ')) return <p key={i} className="ml-4 text-sm text-[#374151]">{line}</p>;
                  if (line.startsWith('---')) return <hr key={i} className="my-4 border-[#E5E7EB]" />;
                  if (line.startsWith('*') && line.endsWith('*')) return <p key={i} className="text-xs text-[#9CA3AF] italic">{line.replace(/\*/g, '')}</p>;
                  if (line.trim() === '') return <br key={i} />;
                  return <p key={i} className="text-sm text-[#374151]">{line.replace(/\*\*/g, '')}</p>;
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </RoleGuard>
  );
}
