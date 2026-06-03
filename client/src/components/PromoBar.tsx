import { useEffect, useState } from 'react';
import { BadgePercent, Copy, Check, Calendar, Clock, Hourglass, Timer } from 'lucide-react';
import { API_URL } from '../config/api';

interface PromoCountdown {
  endAt: string;
  code: string;
  title: string;
  subtitle: string;
  enabled: boolean;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function computeRemaining(endMs: number, nowMs: number): Remaining {
  const diff = endMs - nowMs;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, expired: false };
}

// Cached snapshot of the last server response. Used as the initial render
// state on subsequent visits so the bar slot is reserved BEFORE the fetch
// completes — that's the single biggest CLS contributor on the landing.
const CACHE_KEY = '__oxlyn_promo_v1';
function loadCached(): PromoCountdown | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as PromoCountdown) : null;
  } catch {
    return null;
  }
}
function saveCached(value: PromoCountdown | null) {
  try {
    if (value) localStorage.setItem(CACHE_KEY, JSON.stringify(value));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    /* private mode — silently ignore */
  }
}

export default function PromoBar() {
  // Optimistic initial state: previous visit's config (if any) so the bar
  // height is allocated immediately. Server response either confirms or
  // overrides — either way no layout shift on return visits.
  const cached = typeof window !== 'undefined' ? loadCached() : null;
  const [config, setConfig] = useState<PromoCountdown | null>(cached);
  const [remaining, setRemaining] = useState<Remaining>(() => {
    if (!cached) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: false };
    const endMs = new Date(cached.endAt).getTime();
    return Number.isNaN(endMs)
      ? { days: 0, hours: 0, minutes: 0, seconds: 0, expired: false }
      : computeRemaining(endMs, Date.now());
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/promo-countdown`)
      .then((r) => r.json())
      .then((data: PromoCountdown) => {
        if (cancelled) return;
        setConfig(data);
        saveCached(data?.enabled ? data : null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!config) return;
    const endMs = new Date(config.endAt).getTime();
    if (Number.isNaN(endMs)) return;

    setRemaining(computeRemaining(endMs, Date.now()));
    const id = setInterval(() => {
      setRemaining(computeRemaining(endMs, Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [config]);

  const copyCode = () => {
    if (!config) return;
    navigator.clipboard?.writeText(config.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!config || !config.enabled || remaining.expired) return null;

  return (
    <div className="promo-bar">
      <div className="promo-bar-inner">
        <div className="promo-bar-message">
          <div className="promo-bar-icon-badge">
            <BadgePercent className="promo-bar-icon" strokeWidth={2.2} />
          </div>
          <div className="promo-bar-text">
            <span className="promo-bar-title">{config.title}</span>
            <span className="promo-bar-subtitle">{config.subtitle}</span>
          </div>
        </div>

        <div className="promo-bar-actions">
          <button onClick={copyCode} className="promo-bar-code" aria-label="Copy promo code">
            <span className="promo-bar-code-label">CODE</span>
            <span className="promo-bar-code-value">{config.code}</span>
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>

          <div className="promo-bar-countdown">
            <CountdownBlock value={remaining.days}    label="Days"    Icon={Calendar} />
            <CountdownBlock value={remaining.hours}   label="Hours"   Icon={Clock} />
            <CountdownBlock value={remaining.minutes} label="Minutes" Icon={Hourglass} />
            <CountdownBlock value={remaining.seconds} label="Seconds" Icon={Timer} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CountdownBlock({
  value,
  label,
  Icon,
}: {
  value: number;
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="promo-bar-block">
      <Icon className="promo-bar-block-icon" strokeWidth={2} />
      <div className="promo-bar-block-stack">
        <span className="promo-bar-block-value">{String(value).padStart(2, '0')}</span>
        <span className="promo-bar-block-label">{label}</span>
      </div>
    </div>
  );
}
