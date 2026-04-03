/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { 
  Briefcase, 
  FileText, 
  AlertCircle, 
  Send, 
  Loader2, 
  Sparkles, 
  Target,
  PenTool,
  MessageSquare,
  ClipboardCheck,
  History,
  Trash2,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types ---

type AnalysisType = 'review' | 'cover-letter' | 'match' | 'interview';

interface AnalysisResult {
  id: string;
  type: AnalysisType;
  content: string;
  timestamp: number;
  title: string;
  isStreaming?: boolean;
}

// --- App Component ---

export default function App() {
  // Safe localStorage helper
  const getSafeStorage = (key: string, fallback: string) => {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (e) {
      return fallback;
    }
  };

  // Initialize state from localStorage
  const [resume, setResume] = useState(() => getSafeStorage('career_coach_resume', ''));
  const [jobDescription, setJobDescription] = useState(() => getSafeStorage('career_coach_jd', ''));
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>(() => {
    try {
      const saved = localStorage.getItem('career_coach_results');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [activeResultId, setActiveResultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeAnalysisType, setActiveAnalysisType] = useState<AnalysisType | null>(null);

  // Persist data to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('career_coach_resume', resume);
    } catch (e) { console.error("Storage error:", e); }
  }, [resume]);

  useEffect(() => {
    try {
      localStorage.setItem('career_coach_jd', jobDescription);
    } catch (e) { console.error("Storage error:", e); }
  }, [jobDescription]);

  useEffect(() => {
    try {
      // Don't persist streaming results
      localStorage.setItem('career_coach_results', JSON.stringify(results.filter(r => !r.isStreaming)));
    } catch (e) { console.error("Storage error:", e); }
  }, [results]);

  const runAnalysis = async (e: React.MouseEvent, type: AnalysisType) => {
    e.preventDefault(); // Strictly prevent any default button/form behavior
    
    if (!resume.trim()) {
      setError("Please provide your resume content first.");
      return;
    }
    if ((type === 'match' || type === 'cover-letter' || type === 'interview') && !jobDescription.trim()) {
      setError("Please provide a job description for this analysis.");
      return;
    }

    setLoading(true);
    setError(null);
    setActiveAnalysisType(type);

    const resultId = Math.random().toString(36).substring(7);
    let title = "";
    let prompt = "";

    switch (type) {
      case 'review':
        title = "Resume Review";
        prompt = `Analyze this resume concisely. Focus on: Impact, Achievements, ATS optimization, and 3 key improvements. Resume: ${resume}`;
        break;
      case 'cover-letter':
        title = "Draft Cover Letter";
        prompt = `Draft a concise, high-impact cover letter matching this resume to this job description. Keep it professional and tailored. Resume: ${resume} Job Description: ${jobDescription}`;
        break;
      case 'match':
        title = "Match Analysis";
        prompt = `Compare resume and JD. Provide: Match % score, 3 top matching skills, 3 key gaps, and quick advice. Resume: ${resume} Job Description: ${jobDescription}`;
        break;
      case 'interview':
        title = "Interview Prep";
        prompt = `Generate 5 targeted interview questions and brief STAR strategies for this role. Resume: ${resume} Job Description: ${jobDescription}`;
        break;
    }

    // Create placeholder result
    const placeholder: AnalysisResult = {
      id: resultId,
      type,
      content: "",
      timestamp: Date.now(),
      title,
      isStreaming: true
    };
    setResults(prev => [placeholder, ...prev]);
    setActiveResultId(resultId);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key is missing.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3.1-flash-lite-preview"; 

      const responseStream = await ai.models.generateContentStream({
        model: model,
        contents: prompt,
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          setResults(prev => prev.map(r => 
            r.id === resultId ? { ...r, content: fullText } : r
          ));
        }
      }

      // Mark as finished
      setResults(prev => prev.map(r => 
        r.id === resultId ? { ...r, isStreaming: false } : r
      ));

    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please check your connection and try again.");
      setResults(prev => prev.filter(r => r.id !== resultId));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearResults = () => {
    setResults([]);
    setActiveResultId(null);
    localStorage.removeItem('career_coach_results');
  };

  const resetInputs = () => {
    setResume('');
    setJobDescription('');
    localStorage.removeItem('career_coach_resume');
    localStorage.removeItem('career_coach_jd');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Sparkles size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Randy's CareerPath <span className="text-indigo-600">AI Coach</span></h1>
          </div>
          <button 
            type="button"
            onClick={resetInputs}
            className="text-xs font-medium text-slate-400 hover:text-red-600 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="text-indigo-600" size={20} />
                <h2 className="font-semibold text-slate-800">Your Resume</h2>
              </div>
              <textarea
                className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-sm leading-relaxed"
                placeholder="Paste your resume text here..."
                value={resume}
                onChange={(e) => setResume(e.target.value)}
              />
              <p className="mt-2 text-xs text-slate-400">Autosaved to your browser.</p>
            </section>

            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="text-indigo-600" size={20} />
                <h2 className="font-semibold text-slate-800">Job Description</h2>
              </div>
              <textarea
                className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-sm leading-relaxed"
                placeholder="Paste the job description..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </section>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-start gap-3"
              >
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <ActionButton 
                icon={<ClipboardCheck size={18} />}
                label="Review Resume"
                onClick={(e) => runAnalysis(e, 'review')}
                loading={loading}
                active={activeAnalysisType === 'review'}
              />
              <ActionButton 
                icon={<Target size={18} />}
                label="Match Analysis"
                onClick={(e) => runAnalysis(e, 'match')}
                loading={loading}
                active={activeAnalysisType === 'match'}
              />
              <ActionButton 
                icon={<PenTool size={18} />}
                label="Draft Cover Letter"
                onClick={(e) => runAnalysis(e, 'cover-letter')}
                loading={loading}
                active={activeAnalysisType === 'cover-letter'}
              />
              <ActionButton 
                icon={<MessageSquare size={18} />}
                label="Interview Prep"
                onClick={(e) => runAnalysis(e, 'interview')}
                loading={loading}
                active={activeAnalysisType === 'interview'}
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[600px] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <History size={18} className="text-slate-400" />
                  <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wider">Analysis History</h3>
                </div>
                {results.length > 0 && (
                  <button 
                    type="button"
                    onClick={clearResults}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    title="Clear history"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <AnimatePresence mode="popLayout">
                  {loading && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-20 text-slate-400"
                    >
                      <Loader2 className="animate-spin mb-4 text-indigo-600" size={40} />
                      <p className="text-sm font-medium animate-pulse">AI Coach is analyzing...</p>
                      <p className="text-xs mt-2 opacity-70 text-center max-w-[200px]">This may take a few seconds depending on complexity.</p>
                    </motion.div>
                  )}

                  {!loading && results.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-20 text-center"
                    >
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
                        <Send size={32} />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-700 mb-2">Ready to start?</h4>
                      <p className="text-slate-400 max-w-xs mx-auto text-sm">
                        Paste your resume and job description, then choose a tool.
                      </p>
                    </motion.div>
                  )}

                  {!loading && results.map((result) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "mb-8 last:mb-0 p-6 rounded-2xl border transition-all relative group",
                        activeResultId === result.id 
                          ? "bg-white border-indigo-100 shadow-md ring-1 ring-indigo-50" 
                          : "bg-slate-50/30 border-transparent opacity-60 hover:opacity-100"
                      )}
                      onClick={() => setActiveResultId(result.id)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                            {result.type.replace('-', ' ')}
                          </span>
                          <h4 className="font-bold text-slate-800">{result.title}</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(result.content, result.id);
                            }}
                            className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                          >
                            {copiedId === result.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                          </button>
                          <span className="text-xs text-slate-400">
                            {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="prose prose-slate prose-sm max-w-none prose-headings:text-slate-800 prose-strong:text-indigo-700 prose-ul:list-disc prose-li:marker:text-indigo-400">
                        <ReactMarkdown>{result.content}</ReactMarkdown>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Sparkles size={16} />
            <span className="text-sm font-medium">Powered by Gemini 3.1</span>
          </div>
          <div className="flex gap-8 text-sm font-medium text-slate-400">
            <span className="cursor-default">Professional Career Coach</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Helper Components ---

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  loading: boolean;
  active?: boolean;
}

function ActionButton({ icon, label, onClick, loading, active = false }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "flex items-center justify-center gap-2 p-4 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm",
        active 
          ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200" 
          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
      )}
    >
      {loading && active ? <Loader2 className="animate-spin" size={18} /> : icon}
      {label}
    </button>
  );
}
