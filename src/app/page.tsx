import Link from 'next/link';
import Image from 'next/image';
import logo from '@/assets/images/fieldpilotlogo.png';
import {
  HardHat,
  Briefcase,
  FileText,
  Clock,
  Shield,
  ChevronRight,
  Users,
  Zap,
  BarChart3,
} from 'lucide-react';

const features = [
  {
    icon: <Briefcase className="h-6 w-6" />,
    title: 'Job Lifecycle Management',
    description: 'Track every job from lead to invoice. Full status pipeline with real-time updates.',
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: 'AI-Powered Proposals',
    description: 'Generate professional proposals with AI. Scope, pricing, risk analysis — all automated.',
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: 'Work Session Tracking',
    description: 'Operators log hours, upload photos, and add notes. Automatic labor cost calculations.',
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Client Portal',
    description: 'Clients view projects, approve proposals, and track progress — all self-service.',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Multi-Tenant Security',
    description: 'Complete data isolation per tenant. Firestore-level security rules enforce boundaries.',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Analytics & Insights',
    description: 'Revenue pipeline, operator performance, burn rate prediction, and incident tracking.',
  },
];

const steps = [
  { step: '01', title: 'Create Your Workspace', description: 'Sign up and set up your company tenant in seconds.' },
  { step: '02', title: 'Add Your Team', description: 'Invite admins, operators, and clients with role-based access.' },
  { step: '03', title: 'Start Managing', description: 'Create jobs, generate proposals, and track work sessions.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-teal-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 items-center justify-center">
            <Image src={logo} alt="Field Pilot" height={34} width={160} className="object-contain" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-20 text-center lg:px-12 lg:pt-32">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-sm text-teal-300">
          <Zap className="h-4 w-4" />
          AI-Powered Field Engineering Platform
        </div>
        <h1 className="text-5xl font-bold leading-tight tracking-tight lg:text-7xl">
          From Lead to Invoice,
          <br />
          <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            One Platform.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 lg:text-xl">
          The multi-tenant SaaS platform that unifies proposals, job tracking,
          operator sessions, and client management for field engineering companies.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/20 hover:bg-teal-500 transition-all"
          >
            Start Free Trial
            <ChevronRight className="h-5 w-5" />
          </Link>
          <Link
            href="#features"
            className="rounded-lg border border-gray-700 px-8 py-3.5 text-base font-medium text-gray-300 hover:border-gray-600 hover:text-white transition-all"
          >
            Book a Demo
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24 lg:px-12">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold lg:text-4xl">
            Everything your field team needs
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Purpose-built for field engineering and contracting companies.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={i}
              className="group rounded-xl border border-gray-800 bg-gray-900/50 p-6 transition-all hover:border-teal-500/50 hover:bg-gray-900"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20">
                {f.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-4xl px-6 py-24 lg:px-12">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold lg:text-4xl">How It Works</h2>
          <p className="mt-4 text-lg text-gray-400">
            Get up and running in three simple steps.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600/20 text-xl font-bold text-teal-400">
                {s.step}
              </div>
              <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
              <p className="text-sm text-gray-400">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center lg:px-12">
        <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-teal-500/10 to-emerald-500/10 px-8 py-16">
          <h2 className="text-3xl font-bold lg:text-4xl">
            Ready to streamline your field operations?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
            Join field engineering companies using Field Pilot to manage their
            entire operation from one platform.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/20 hover:bg-teal-500 transition-all"
          >
            Get Started Free
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-12 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 items-center justify-center">
              <Image src={logo} alt="Field Pilot" height={28} width={140} className="object-contain" />
            </div>
          </div>
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Field Pilot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
