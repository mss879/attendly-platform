"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventName: string;
  eventSlug: string;
}

export function ShareModal({ isOpen, onClose, eventName, eventSlug }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sharing, setSharing] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/events/${eventSlug}`
    : `https://www.attendly.buzz/events/${eventSlug}`;

  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== "undefined" && "share" in navigator) {
      setCanNativeShare(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link: ", err);
    }
  };



  const handleNativeShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await navigator.share({
        title: eventName,
        text: `Join me at ${eventName}!`,
        url: shareUrl,
      });
    } catch (err) {
      const errorName = (err as Error).name;
      // AbortError/NotAllowedError are thrown when the user cancels or dismisses the share sheet
      if (errorName !== "AbortError" && errorName !== "NotAllowedError") {
        console.error("Native share failed:", err);
      }
    } finally {
      setSharing(false);
    }
  };

  const textToShare = `Check out ${eventName} on Attendly!`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - dims and blurs the screen */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Container - raised above the backdrop with z-10 */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 text-left align-middle shadow-2xl border border-orange-100/50 flex flex-col gap-5 text-black">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-black">
              Share Event
            </h3>
            <p className="mt-1 text-sm text-black/60 font-sans">
              Invite friends to join you at {eventName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-black/40 hover:bg-black/5 hover:text-black transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Copy Link Input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-black/60 font-sans">Event Link</label>
          <div className="flex items-center gap-2 rounded-xl bg-black/[0.03] p-1.5 ring-1 ring-black/[0.08] focus-within:ring-orange-500/50 transition-shadow duration-200">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent px-2.5 py-1 text-sm text-black/80 focus:outline-hidden select-all cursor-text font-sans"
            />
            <button
              onClick={handleCopy}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold text-white transition-all cursor-pointer font-sans ${
                copied
                  ? "bg-emerald-600 shadow-sm"
                  : "bg-orange-600 hover:bg-orange-700 active:scale-95 shadow-xs"
              }`}
            >
              {copied ? (
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </span>
              ) : (
                "Copy"
              )}
            </button>
          </div>
        </div>

        {/* Social sharing links */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-black/60 font-sans">Share via</label>
          <div className="grid grid-cols-5 gap-3 mt-1 text-center">
            {/* WhatsApp */}
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${textToShare} ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 group cursor-pointer"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition group-hover:scale-105 group-hover:bg-emerald-100 ring-1 ring-emerald-600/10">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.18 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.858.002-2.634-1.02-5.11-2.884-6.974C16.527 1.809 14.058.788 11.43.788c-5.449 0-9.887 4.437-9.89 9.875-.001 1.77.476 3.498 1.381 5.03l-.995 3.637 3.732-.977zm11.567-5.64c-.29-.145-1.716-.847-1.978-.942-.262-.096-.453-.145-.644.14-.191.285-.741.942-.907 1.133-.166.19-.332.215-.623.07-.29-.145-1.228-.453-2.338-1.444-.864-.771-1.448-1.724-1.617-2.014-.169-.29-.018-.447.127-.591.13-.13.29-.338.435-.508.145-.17.194-.29.291-.483.097-.19.048-.36-.024-.505-.072-.145-.644-1.552-.882-2.126-.233-.559-.47-.482-.644-.492-.166-.01-.357-.01-.548-.01-.19 0-.501.071-.762.358-.262.287-1.002.977-1.002 2.384 0 1.407 1.023 2.77 1.166 2.96.143.19 2.013 3.074 4.877 4.31.681.295 1.213.47 1.628.602.684.218 1.307.187 1.8.114.549-.08 1.716-.701 1.959-1.378.243-.678.243-1.258.172-1.378-.071-.12-.263-.193-.554-.338z"/>
                </svg>
              </div>
              <span className="text-[10px] text-black/60 group-hover:text-black transition-colors font-medium block truncate font-sans">WhatsApp</span>
            </a>

            {/* Twitter/X */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(textToShare)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 group cursor-pointer"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-black transition group-hover:scale-105 group-hover:bg-black/10 ring-1 ring-black/10">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <span className="text-[10px] text-black/60 group-hover:text-black transition-colors font-medium block truncate font-sans">X</span>
            </a>

            {/* Telegram */}
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(textToShare)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 group cursor-pointer"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-sky-600 transition group-hover:scale-105 group-hover:bg-sky-100 ring-1 ring-sky-600/10">
                <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.18l-1.92 9.07c-.14.64-.52.8-.1.54l-2.93-2.16-1.41 1.36c-.16.16-.29.29-.6.29l.21-2.97 5.41-4.89c.23-.21-.05-.32-.36-.12L9.89 12.8 7 11.9c-.63-.2-.64-.63.13-.93l11.24-4.33c.52-.19.97.12.79.88z"/>
                </svg>
              </div>
              <span className="text-[10px] text-black/60 group-hover:text-black transition-colors font-medium block truncate font-sans">Telegram</span>
            </a>

            {/* Facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 group cursor-pointer"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition group-hover:scale-105 group-hover:bg-blue-100 ring-1 ring-blue-600/10">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <span className="text-[10px] text-black/60 group-hover:text-black transition-colors font-medium block truncate font-sans">Facebook</span>
            </a>

            {/* Email */}
            <a
              href={`mailto:?subject=${encodeURIComponent(`Don't miss ${eventName}!`)}&body=${encodeURIComponent(`Hey,\n\nI thought you might be interested in ${eventName}. Check it out here: ${shareUrl}`)}`}
              className="flex flex-col items-center gap-1 group cursor-pointer"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-600 transition group-hover:scale-105 group-hover:bg-slate-100 ring-1 ring-slate-600/10">
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <span className="text-[10px] text-black/60 group-hover:text-black transition-colors font-medium block truncate font-sans">Email</span>
            </a>
          </div>
        </div>

        {/* Native Share fallback option */}
        {canNativeShare && (
          <div className="border-t border-dashed border-orange-950/10 pt-4 flex justify-center">
            <button
              onClick={handleNativeShare}
              className="flex items-center gap-1.5 rounded-full bg-black/5 hover:bg-black/10 px-5 py-2.5 text-xs font-bold text-black transition active:scale-95 cursor-pointer font-sans"
            >
              <svg className="h-3.5 w-3.5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              More Options
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
