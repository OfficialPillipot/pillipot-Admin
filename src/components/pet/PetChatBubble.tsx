import { memo, useState, useRef, useEffect } from "react";
import type { PetMessage } from "./types";
import {
  XMarkIcon,
  PaperAirplaneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

interface PetChatBubbleProps {
  messages: PetMessage[];
  onSendMessage: (text: string) => void;
  onExecuteAction: (message: PetMessage) => void;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  quickSuggestions?: string[];
}

export const PetChatBubble = memo(function PetChatBubble({
  messages,
  onSendMessage,
  onExecuteAction,
  onClose,
  soundEnabled,
  onToggleSound,
  quickSuggestions = [
    "Where are Add-ons?",
    "Add a product",
    "Show my orders",
    "Take a tour",
  ],
}: PetChatBubbleProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 max-h-[540px] flex flex-col bg-surface/95 dark:bg-surface-elevated/95 backdrop-blur-xl border border-border rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-gradient-to-r from-primary/10 via-surface to-primary/5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center h-8 w-8 rounded-full bg-primary/20 text-primary">
            <SparklesIcon className="h-4 w-4" />
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-surface" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-text-heading flex items-center gap-1.5">
              <span>Sparky</span>
              <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                Robo-Pup 🐶
              </span>
            </h4>
            <p className="text-[11px] text-text-muted font-medium">Your playful navigator dog</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSound}
            className="p-1.5 text-text-muted hover:text-text-heading rounded-lg hover:bg-surface-muted transition-colors cursor-pointer"
            title={soundEnabled ? "Mute robot sound" : "Enable robot sound"}
          >
            {soundEnabled ? (
              <SpeakerWaveIcon className="h-4 w-4 text-primary" />
            ) : (
              <SpeakerXMarkIcon className="h-4 w-4 text-text-muted/60" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-heading rounded-lg hover:bg-surface-muted transition-colors cursor-pointer"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[340px] text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 shadow-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-primary text-white rounded-br-none"
                  : "bg-surface-muted/60 border border-border text-text-heading rounded-bl-none"
              }`}
            >
              <p>{msg.text}</p>
            </div>

            {/* Action button if present */}
            {msg.action && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onExecuteAction(msg)}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-bold text-xs py-1.5 px-3.5 rounded-xl shadow-md shadow-primary/20 transition-all transform hover:scale-[1.02] cursor-pointer"
                >
                  <SparklesIcon className="h-3.5 w-3.5 animate-spin" />
                  <span>{msg.action.label || "Walk & Show Me"}</span>
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {quickSuggestions.length > 0 && (
        <div className="px-3 py-2 border-t border-border/40 bg-surface/50 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {quickSuggestions.map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => onSendMessage(sug)}
              className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium bg-surface-muted hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-border rounded-lg text-text-muted transition-colors cursor-pointer"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-surface flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask me: 'Where is add-on?'..."
          className="flex-1 px-3 py-2 text-xs bg-surface-muted/50 border border-border rounded-xl text-text-heading placeholder:text-text-muted/60 focus:outline-none focus:border-primary font-medium"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
});
