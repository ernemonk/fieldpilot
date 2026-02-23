'use client';

import Link from 'next/link';
import Image from 'next/image';
import logo from '@/assets/images/fieldpilotlogo.png';
import { useAuth } from '@/context/AuthContext';
import {
  Briefcase,
  Clock,
  ChevronRight,
  Users,
  Zap,
  BarChart3,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

/* ──────────────────────────── Features ──────────────────────────── */
const features = [
  {
    icon: <Briefcase className="h-6 w-6" />,
    title: 'Job Lifecycle Management',
    description: 'Track every job from lead to invoice. Full status pipeline with real-time updates.',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    borderHover: 'hover:border-blue-500/40',
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: 'AI-Powered Proposals',
    description: 'Generate professional proposals with AI. Scope, pricing, risk analysis — all automated.',
    iconBg: 'bg-teal-500/10',
    iconColor: 'text-teal-400',
    borderHover: 'hover:border-teal-500/40',
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: 'Work Session Tracking',
    description: 'Operators log hours, upload photos, and add notes. Automatic labor cost calculations.',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    borderHover: 'hover:border-amber-500/40',
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Client Portal',
    description: 'Clients view projects, approve proposals, and track progress — all self-service.',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
    borderHover: 'hover:border-violet-500/40',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'AI Incident Reports',
    description: 'Voice or text — AI generates structured incident reports with severity classification.',
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
    borderHover: 'hover:border-rose-500/40',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Analytics & Insights',
    description: 'Revenue pipeline, operator performance, burn rate prediction, and incident tracking.',
    iconBg: 'bg-sky-500/10',
    iconColor: 'text-sky-400',
    borderHover: 'hover:border-sky-500/40',
  },
];

/* ──────────────────────────── Steps ──────────────────────────── */
const steps = [
  { step: '01', title: 'Create Your Workspace', description: 'Sign up and set up your company tenant in seconds.', gradient: 'from-teal-500 to-emerald-500' },
  { step: '02', title: 'Add Your Team', description: 'Invite admins, operators, and clients with role-based access.', gradient: 'from-blue-500 to-violet-500' },
  { step: '03', title: 'Start Managing', description: 'Create jobs, generate AI proposals, and track sessions.', gradient: 'from-amber-500 to-orange-500' },
];

/* ──────────────────────────── Pricing ──────────────────────────── */
const plans = [
  {
    name: 'Standard',
    price: 100,
    description: 'Everything you need to manage your field operations.',
    popular: false,
    color: 'border-gray-700',
    buttonClass: 'border border-gray-600 text-gray-300 hover:bg-gray-800',
    included: [
      'Unlimited jobs & clients',
      'Work session tracking',
      'Client portal access',
      'Operator dashboards',
      'Incident reporting (manual)',
      'Analytics & insights',
      'Multi-tenant data isolation',
      'Email support',
    ],
    excluded: [
      'AI Proposal Generator',
      'AI Incident Reports',
      'Voice-to-text input',
      'AI severity classification',
      'Priority support',
    ],
  },
  {
    name: 'Pro',
    price: 149,
    description: 'Standard features plus the full AI engine for proposals & incidents.',
    popular: true,
    color: 'border-teal-500',
    buttonClass: 'bg-teal-600 text-white hover:bg-teal-500 shadow-lg shadow-teal-500/20',
    included: [
      'Unlimited jobs & clients',
      'Work session tracking',
      'Client portal access',
      'Operator dashboards',
      'Incident reporting (manual & AI)',
      'Analytics & insights',
      'Multi-tenant data isolation',
      'AI Proposal Generator',
      'AI Incident Reports',
      'Voice-to-text input',
      'AI severity classification',
      'Priority support',
    ],
    excluded: [],
  },
];

/* ──────────────────────────── Blog ──────────────────────────── */
const blogPosts = [
  {
    title: 'How AI Is Transforming Field Engineering Proposals',
    excerpt: 'Learn how AI-generated proposals save contractors 10+ hours per week while improving accuracy and winning more bids.',
    date: 'Feb 18, 2026',
    tag: 'AI',
    tagColor: 'bg-teal-500/10 text-teal-400',
    gradient: 'from-teal-500/20 to-emerald-500/20',
  },
  {
    title: '5 Common Incident Reporting Mistakes (And How to Avoid Them)',
    excerpt: "Field incident reports are critical for compliance and safety. Here's how to eliminate the most common errors.",
    date: 'Feb 10, 2026',
    tag: 'Safety',
    tagColor: 'bg-rose-500/10 text-rose-400',
    gradient: 'from-rose-500/20 to-orange-500/20',
  },
  {
    title: 'The Multi-Tenant Advantage: Why Data Isolation Matters',
    excerpt: 'Understanding how tenant-level data isolation protects your company and your clients in a shared SaaS environment.',
    date: 'Feb 3, 2026',
    tag: 'Security',
    tagColor: 'bg-violet-500/10 text-violet-400',
    gradient: 'from-violet-500/20 to-purple-500/20',
  },
];

/* ──────────────────────────── Page ──────────────────────────── */
export default function LandingPage() {
  const { firebaseUser } = useAuth();
  const isLoggedIn = !!firebaseUser;
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-teal-950 text-white">
      {/* ── Nav ── */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 lg:px-12">
        <Image src={logo} alt="Field Pilot" height={34} width={160} className="object-contain" />

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
          <a href="#blog" className="text-sm text-gray-400 hover:text-white transition-colors">Blog</a>
          {isLoggedIn ? (
            <Link href="/dashboard" className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-500 transition-colors shadow-md shadow-teal-500/20">
              Go to Portal
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Sign In</Link>
              <Link href="/signup" className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-500 transition-colors shadow-md shadow-teal-500/20">
                Start Free Trial
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden rounded-lg p-2 text-gray-400 hover:text-white">
          {mobileNav ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {mobileNav && (
          <div className="absolute left-0 right-0 top-full z-50 border-t border-gray-800 bg-gray-950/98 backdrop-blur-xl px-6 py-6 md:hidden">
            <div className="flex flex-col gap-4">
              <a href="#features" onClick={() => setMobileNav(false)} className="text-base text-gray-300 hover:text-white">Features</a>
              <a href="#pricing" onClick={() => setMobileNav(false)} className="text-base text-gray-300 hover:text-white">Pricing</a>
              <a href="#blog" onClick={() => setMobileNav(false)} className="text-base text-gray-300 hover:text-white">Blog</a>
              <hr className="border-gray-800" />
              {isLoggedIn ? (
                <Link href="/dashboard" className="rounded-xl bg-teal-600 px-5 py-3 text-center text-sm font-semibold text-white">Go to Portal</Link>
              ) : (
                <>
                  <Link href="/login" className="text-base text-gray-300 hover:text-white">Sign In</Link>
                  <Link href="/signup" className="rounded-xl bg-teal-600 px-5 py-3 text-center text-sm font-semibold text-white">Start Free Trial</Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative mx-auto max-w-5xl px-6 pb-24 pt-16 text-center lg:px-12 lg:pt-28">
        <div className="pointer-events-none absolute inset-0 mx-auto max-w-lg -translate-y-1/4 rounded-full bg-teal-500/10 blur-[120px]" />
        <div className="relative">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-sm text-teal-300">
            <Zap className="h-4 w-4" /> AI-Powered Field Engineering Platform
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-7xl">
            From Lead to Invoice,<br />
            <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">One Platform.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-gray-400 sm:text-lg lg:text-xl">
            The multi-tenant SaaS platform that unifies proposals, job tracking,
            operator sessions, and client management for field engineering companies.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {isLoggedIn ? (
              <Link href="/dashboard" className="flex items-center gap-2 rounded-xl bg-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/25 hover:bg-teal-500 transition-all">
                Open Dashboard <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <>
                <Link href="/signup" className="flex items-center gap-2 rounded-xl bg-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/25 hover:bg-teal-500 transition-all">
                  Start Free Trial <ChevronRight className="h-5 w-5" />
                </Link>
                <Link href="#features" className="rounded-xl border border-gray-700 px-8 py-3.5 text-base font-medium text-gray-300 hover:border-gray-500 hover:text-white transition-all">
                  Book a Demo
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24 lg:px-12">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal-400">Features</p>
          <h2 className="text-3xl font-bold lg:text-4xl">Everything your field team needs</h2>
          <p className="mt-4 text-lg text-gray-400">Purpose-built for field engineering and contracting companies.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div key={i} className={`group rounded-2xl border border-gray-800 bg-gray-900/50 p-6 transition-all ${f.borderHover} hover:bg-gray-900`}>
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${f.iconBg} ${f.iconColor}`}>{f.icon}</div>
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="mx-auto max-w-4xl px-6 py-24 lg:px-12">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal-400">Getting Started</p>
          <h2 className="text-3xl font-bold lg:text-4xl">Up and running in minutes</h2>
          <p className="mt-4 text-lg text-gray-400">Three simple steps to transform your field operations.</p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={i} className="relative text-center">
              {i < steps.length - 1 && <div className="absolute right-0 top-7 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-gray-700 to-transparent md:block" />}
              <div className={`relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${s.gradient} text-xl font-bold text-white shadow-lg`}>{s.step}</div>
              <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
              <p className="text-sm text-gray-400">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-24 lg:px-12">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal-400">Pricing</p>
          <h2 className="text-3xl font-bold lg:text-4xl">Simple, transparent pricing</h2>
          <p className="mt-4 text-lg text-gray-400">No hidden fees. Cancel anytime.</p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative rounded-2xl border ${plan.color} bg-gray-900/60 p-8 transition-all hover:bg-gray-900 ${plan.popular ? 'ring-1 ring-teal-500/50' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-1 text-xs font-bold text-white shadow-lg">Most Popular</div>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm text-gray-400">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight">${plan.price}</span>
                <span className="text-lg text-gray-500">/mo</span>
              </div>
              <Link href="/signup" className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${plan.buttonClass}`}>
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <ul className="mt-8 space-y-3">
                {plan.included.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" /> {f}
                  </li>
                ))}
                {plan.excluded.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-gray-600 line-through">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-gray-700" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Blog ── */}
      <section id="blog" className="mx-auto max-w-6xl px-6 py-24 lg:px-12">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal-400">Blog</p>
          <h2 className="text-3xl font-bold lg:text-4xl">Latest from the field</h2>
          <p className="mt-4 text-lg text-gray-400">Insights, tips, and updates for field engineering teams.</p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post, i) => (
            <article key={i} className="group overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/50 transition-all hover:border-gray-700 hover:bg-gray-900">
              <div className={`h-36 bg-gradient-to-br ${post.gradient} flex items-end p-5`}>
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${post.tagColor}`}>{post.tag}</span>
              </div>
              <div className="p-5">
                <p className="mb-2 text-xs text-gray-500">{post.date}</p>
                <h3 className="mb-2 text-base font-semibold leading-snug group-hover:text-teal-300 transition-colors">{post.title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{post.excerpt}</p>
                <button className="mt-4 flex items-center gap-1 text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors">
                  Read more <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center lg:px-12">
        <div className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gradient-to-br from-teal-500/10 via-emerald-500/10 to-cyan-500/10 px-8 py-16">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-emerald-500/5" />
          <div className="relative">
            <h2 className="text-3xl font-bold lg:text-4xl">Ready to streamline your field operations?</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
              Join field engineering companies using Field Pilot to manage their entire operation from one platform.
            </p>
            {isLoggedIn ? (
              <Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/20 hover:bg-teal-500 transition-all">
                Go to Dashboard <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <Link href="/signup" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/20 hover:bg-teal-500 transition-all">
                Get Started Free <ChevronRight className="h-5 w-5" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800 px-6 py-12 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <Image src={logo} alt="Field Pilot" height={28} width={140} className="object-contain" />
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-300 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-gray-300 transition-colors">Pricing</a>
            <a href="#blog" className="hover:text-gray-300 transition-colors">Blog</a>
          </div>
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Field Pilot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
