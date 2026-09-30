import { memo, useState, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { PetMascot } from "./PetMascot";
import { PetChatBubble } from "./PetChatBubble";
import { PetSpotlight } from "./PetSpotlight";
import type { PetMood, PetMessage, PetTargetCoordinate, PetAction } from "./types";
import { processPetMessage } from "./petBrain";
import {
  playRobotBeep,
  playRobotJump,
  playRobotSuccess,
  playPuppyBark,
  isPetSoundEnabled,
  setPetSoundEnabled,
} from "./petSound";
import type { User } from "../../types";

interface PetCompanionProps {
  user: User;
}

export const PetCompanion = memo(function PetCompanion({ user }: PetCompanionProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [mood, setMood] = useState<PetMood>("idle");
  const [soundOn, setSoundOn] = useState(isPetSoundEnabled());
  const [spotlightTarget, setSpotlightTarget] = useState<PetTargetCoordinate | null>(null);
  const [quickSpeech, setQuickSpeech] = useState<string | null>("Woof! 🐶 Click me to navigate!");

  // Messages in conversation
  const [messages, setMessages] = useState<PetMessage[]>([
    {
      id: "initial-1",
      sender: "pet",
      text: `Woof! 🐶 BEEP! Hello ${user.name || "friend"}! I'm Sparky the Robo-Pup. Ask me where any option or button is and I'll jump right to it!`,
      timestamp: Date.now(),
    },
  ]);

  const pendingActionRef = useRef<PetAction | null>(null);

  // Clear quick greeting speech after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuickSpeech(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setPetSoundEnabled(next);
  }, [soundOn]);

  // Find a target DOM element on page
  const locateElement = useCallback((selector?: string): Element | null => {
    if (!selector) return null;
    const selectors = selector.split(",").map((s) => s.trim());
    for (const sel of selectors) {
      try {
        if (sel.includes(":has-text(")) {
          // Custom text matching: button:has-text('Add Product')
          const match = sel.match(/(.*?):has-text\(['"](.*?)['"]\)/);
          if (match) {
            const tag = match[1] || "button";
            const text = match[2].toLowerCase();
            const elements = Array.from(document.querySelectorAll(tag));
            const found = elements.find((el) => el.textContent?.toLowerCase().includes(text));
            if (found) return found;
          }
        } else {
          const el = document.querySelector(sel);
          if (el) return el;
        }
      } catch {
        // Fallback
      }
    }
    return null;
  }, []);

  // Jump to element and spotlight it
  const jumpToElement = useCallback(
    (action: PetAction) => {
      setMood("jumping");
      playRobotJump();

      // Give time for layout/DOM to stabilize
      setTimeout(() => {
        let el = locateElement(action.targetSelector);
        if (!el && action.route) {
          // Try finding sidebar link as fallback
          el = document.querySelector(`a[href*='${action.route}']`);
        }

        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          const rect = el.getBoundingClientRect();
          setSpotlightTarget({
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
            explanation: action.explanation || "Here it is! Click this button to proceed.",
            targetSelector: action.targetSelector || "",
            route: action.route,
          });
          setMood("pointing");
          playRobotSuccess();
        } else {
          setMood("happy");
          setQuickSpeech("Arrived! The option is right here on this page.");
          setTimeout(() => setMood("idle"), 2000);
        }
      }, 450);
    },
    [locateElement]
  );

  // When route changes, check if there's a pending jump action
  useEffect(() => {
    if (pendingActionRef.current) {
      const act = pendingActionRef.current;
      pendingActionRef.current = null;
      // Wait for page to render
      const timer = setTimeout(() => {
        jumpToElement(act);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, jumpToElement]);

  const handleExecuteAction = useCallback(
    (message: PetMessage) => {
      if (!message.action) return;
      const action = message.action;

      // Close the chat window so user can see the walk & jump
      setIsOpen(false);

      if (action.type === "tour") {
        startTour();
        return;
      }

      if (action.route && location.pathname !== action.route) {
        pendingActionRef.current = action;
        setMood("walking");
        playRobotBeep();
        navigate(action.route);
      } else {
        jumpToElement(action);
      }
    },
    [location.pathname, navigate, jumpToElement]
  );

  // Interactive Tour
  const startTour = useCallback(() => {
    setIsOpen(false);
    setMood("jumping");
    playRobotJump();

    const steps = [
      {
        sel: "aside, [data-guide='sidebar']",
        text: "Here is your main navigation sidebar! Use it to switch between Products, Add-ons, Orders, and Settings.",
      },
      {
        sel: "input[type='search'], [data-guide='search']",
        text: "Here is the search & filter bar! You can quickly find items, filter by status, or search codes.",
      },
      {
        sel: "button:has-text('Add'), button:has-text('Create'), [data-guide='header-action']",
        text: "Here is the primary action button to create or add new items!",
      },
    ];

    let current = 0;
    const runNextStep = () => {
      if (current >= steps.length) {
        setMood("happy");
        playRobotSuccess();
        setSpotlightTarget(null);
        setQuickSpeech("Tour complete! Ask me anytime you need help navigating.");
        setTimeout(() => {
          setMood("idle");
          setQuickSpeech(null);
        }, 4000);
        return;
      }

      const s = steps[current];
      const el = locateElement(s.sel);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const rect = el.getBoundingClientRect();
        setSpotlightTarget({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          explanation: s.text,
          targetSelector: s.sel,
        });
        setMood("pointing");
        playRobotBeep();
      }
      current++;
    };

    runNextStep();
  }, [locateElement]);

  const handleSendMessage = useCallback(
    (text: string) => {
      const userMsg: PetMessage = {
        id: `user-${Date.now()}`,
        sender: "user",
        text,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setMood("thinking");
      playRobotBeep();

      setTimeout(() => {
        const response = processPetMessage(text, user);
        const botMsg: PetMessage = {
          id: `bot-${Date.now()}`,
          sender: "pet",
          text: response.speech,
          action: response.action,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, botMsg]);
        setMood("happy");
        playRobotSuccess();
        setTimeout(() => setMood("idle"), 2500);
      }, 350);
    },
    [user]
  );

  const handleSpotlightAutoClick = useCallback(() => {
    if (!spotlightTarget?.targetSelector) return;
    const el = locateElement(spotlightTarget.targetSelector);
    if (el && "click" in el) {
      (el as HTMLElement).click();
      setSpotlightTarget(null);
      setMood("happy");
      playRobotSuccess();
    }
  }, [spotlightTarget, locateElement]);

  return (
    <>
      {/* Target Spotlight Highlight */}
      {spotlightTarget && (
        <PetSpotlight
          target={spotlightTarget}
          onDismiss={() => {
            setSpotlightTarget(null);
            setMood("idle");
          }}
          onAutoClick={handleSpotlightAutoClick}
        />
      )}

      {/* Floating Pet Mascot Button (Docked Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
        {/* Quick Speech Bubble */}
        {quickSpeech && !isOpen && !spotlightTarget && (
          <div className="mb-2 mr-2 bg-surface/95 dark:bg-surface-elevated/95 backdrop-blur-md border border-primary/30 text-text-heading px-3 py-1.5 rounded-2xl shadow-xl text-xs font-semibold max-w-[200px] animate-in fade-in slide-in-from-bottom-2">
            <p>{quickSpeech}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setMood(isOpen ? "idle" : "happy");
            playPuppyBark();
          }}
          className="relative group p-1 rounded-full hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none"
          title="Talk to Sparky (Robo-Pup Guide)"
          aria-label="Sparky Robo-Pup Assistant"
        >
          {/* Glowing Aura Ring */}
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-md group-hover:bg-primary/30 animate-pulse transition-all" />

          {/* Mascot */}
          <div className="relative">
            <PetMascot mood={mood} size="md" />

            {/* Online Indicator Badge */}
            <span className="absolute bottom-1 right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-surface" />
            </span>
          </div>
        </button>
      </div>

      {/* Pet Chat Window */}
      {isOpen && (
        <PetChatBubble
          messages={messages}
          onSendMessage={handleSendMessage}
          onExecuteAction={handleExecuteAction}
          onClose={() => setIsOpen(false)}
          soundEnabled={soundOn}
          onToggleSound={handleToggleSound}
        />
      )}
    </>
  );
});
