import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  X,
  TrendingUp,
  AlertCircle,
  BedDouble,
  Receipt
} from 'lucide-react';
import { saasApi } from '../../services/saasApi';
import { Button } from '../ui/Button';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  insights?: string[];
  timestamp: string;
}

export const AIAssistantModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: 'Hello! I am your Urban Nest AI Business Assistant. Ask me about vacancies, rent collection, open maintenance tickets, or leads.',
      insights: [
        'Ask: "Which rooms are vacant right now?"',
        'Ask: "What is our total outstanding rent?"',
        'Ask: "Are there any urgent maintenance requests?"',
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  if (!isOpen) return null;

  const handleSend = async (qText?: string) => {
    const textToSend = qText || query;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await saasApi.askAIAssistant(textToSend);
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.data.answer,
        insights: res.data.insights,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: 'I could not retrieve live data for this query. Please verify your connection or rephrase.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-xs">
      <div className="w-full sm:w-[500px] h-[580px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/60 flex items-center justify-center border border-emerald-500/40">
              <Sparkles className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">Urban Nest AI Assistant</p>
              <p className="text-[10px] text-emerald-200">Executive Real-time Business Intelligence</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-emerald-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FBFBFA]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-emerald-800 text-white rounded-tr-xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-2xs'
                }`}
              >
                <p className="font-medium">{m.text}</p>

                {m.insights && m.insights.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                    {m.insights.map((ins, i) => (
                      <p key={i} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {ins}
                      </p>
                    ))}
                  </div>
                )}

                <span
                  className={`block text-[9px] mt-1 ${
                    m.sender === 'user' ? 'text-emerald-200 text-right' : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 italic">
              <Bot className="w-4 h-4 text-emerald-600 animate-spin" /> Analyzing property data...
            </div>
          )}
        </div>

        {/* Preset Prompt Suggestions */}
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex gap-1.5 overflow-x-auto text-[11px]">
          <button
            onClick={() => handleSend('Which rooms are vacant right now?')}
            className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 whitespace-nowrap hover:border-emerald-500 hover:text-emerald-700"
          >
            Vacant Rooms
          </button>
          <button
            onClick={() => handleSend('What is our total outstanding rent?')}
            className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 whitespace-nowrap hover:border-emerald-500 hover:text-emerald-700"
          >
            Outstanding Rent
          </button>
          <button
            onClick={() => handleSend('Are there any open maintenance tickets?')}
            className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 whitespace-nowrap hover:border-emerald-500 hover:text-emerald-700"
          >
            Open Tickets
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex gap-2">
          <input
            type="text"
            placeholder="Ask about occupancy, rent, leads..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
          />
          <Button
            size="sm"
            onClick={() => handleSend()}
            disabled={loading || !query.trim()}
            className="bg-emerald-800 hover:bg-emerald-900 text-white px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
