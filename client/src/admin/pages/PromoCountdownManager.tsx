import { useEffect, useRef, useState } from 'react';
import { Save, RefreshCw, Timer, Clock, Calendar } from 'lucide-react';
import { API_URL } from '../../config/api';

interface PromoCountdown {
  endAt: string;
  code: string;
  title: string;
  subtitle: string;
  enabled: boolean;
}

interface Duration {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const DEFAULT_CONFIG: PromoCountdown = {
  endAt: new Date(Date.now() + 361810 * 1000).toISOString(),
  code: 'OXLYN-10',
  title: 'Discount Started',
  subtitle: 'The 10% discount is now valid on all scripts.',
  enabled: true,
};

function diffToDuration(endMs: number, nowMs: number): Duration & { expired: boolean } {
  const diff = endMs - nowMs;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const total = Math.floor(diff / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    expired: false,
  };
}

function durationToMs(d: Duration): number {
  return ((d.days * 24 + d.hours) * 60 + d.minutes) * 60 * 1000 + d.seconds * 1000;
}

export default function PromoCountdownManager() {
  const [config, setConfig] = useState<PromoCountdown>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<PromoCountdown>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [duration, setDuration] = useState<Duration>({ days: 4, hours: 4, minutes: 30, seconds: 10 });
  const [, force] = useState(0);
  const tickRef = useRef<number | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetch(`${API_URL}/promo-countdown`).then((r) => r.json());
      setConfig(data);
      setOriginalConfig(data);
    } catch {
      showToast('error', 'Erro ao carregar countdown.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // 1Hz tick so the live preview at the top reflows even when nothing else
  // changes. Re-renders only this page — cheap.
  useEffect(() => {
    tickRef.current = window.setInterval(() => force((n) => n + 1), 1000);
    return () => {
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const r = await fetch(`${API_URL}/admin/promo-countdown`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      if (!r.ok) throw new Error();
      const fresh = await r.json();
      setConfig(fresh);
      setOriginalConfig(fresh);
      showToast('success', 'Countdown guardado.');
    } catch {
      showToast('error', 'Erro ao guardar countdown.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  // Extend the existing end_at by a fixed delta (server-authoritative endAt
  // is the source of truth — we shift it forward).
  const extendBy = (ms: number) => {
    const current = new Date(config.endAt).getTime();
    const base = Number.isNaN(current) || current < Date.now() ? Date.now() : current;
    setConfig({ ...config, endAt: new Date(base + ms).toISOString() });
  };

  // Replace end_at with NOW + the duration in the inputs. Resets the timer.
  const setFromDuration = () => {
    const ms = durationToMs(duration);
    if (ms <= 0) {
      showToast('error', 'Duração tem de ser superior a zero.');
      return;
    }
    setConfig({ ...config, endAt: new Date(Date.now() + ms).toISOString() });
  };

  // Apply one of the saved presets — quick-set for common discount windows.
  const applyPreset = (d: Duration) => {
    setDuration(d);
    setConfig({ ...config, endAt: new Date(Date.now() + durationToMs(d)).toISOString() });
  };

  const live = diffToDuration(new Date(config.endAt).getTime(), Date.now());

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/20 border border-red-500/30 text-red-300'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0f0f0f] via-[#0f0f0f] to-[#1a0a0d]">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/30 blur-xl rounded-2xl" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-red-500/20 to-red-700/10 border border-red-500/20 rounded-2xl flex items-center justify-center">
                <Timer className="text-red-400" size={26} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Countdown da Promoção</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Cronómetro acima da navbar · sincronizado para todos os visitantes
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{saving ? 'A guardar…' : 'Guardar alterações'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
          <RefreshCw size={18} className="animate-spin mr-2" />
          A carregar…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* === Live preview === */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock size={14} className="text-red-400" /> Tempo restante (ao vivo)
            </h2>

            <div className="grid grid-cols-4 gap-2">
              <CountBlock value={live.days} label="DIAS" expired={live.expired} />
              <CountBlock value={live.hours} label="HORAS" expired={live.expired} />
              <CountBlock value={live.minutes} label="MINUTOS" expired={live.expired} />
              <CountBlock value={live.seconds} label="SEGUNDOS" expired={live.expired} />
            </div>

            {live.expired && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                Countdown expirado · a barra não aparece no site até definires uma nova duração.
              </p>
            )}

            <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs text-gray-400">
              <span className="text-gray-500">Termina em </span>
              <span className="text-white font-mono">
                {new Date(config.endAt).toLocaleString('pt-PT', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Estender</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <ExtendBtn label="+1 hora" onClick={() => extendBy(60 * 60 * 1000)} />
                <ExtendBtn label="+12 horas" onClick={() => extendBy(12 * 60 * 60 * 1000)} />
                <ExtendBtn label="+1 dia" onClick={() => extendBy(24 * 60 * 60 * 1000)} />
                <ExtendBtn label="+7 dias" onClick={() => extendBy(7 * 24 * 60 * 60 * 1000)} />
              </div>
            </div>
          </div>

          {/* === Set duration === */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar size={14} className="text-red-400" /> Definir duração a partir de agora
            </h2>

            <div className="grid grid-cols-4 gap-2">
              <DurationInput
                label="Dias"
                value={duration.days}
                onChange={(v) => setDuration({ ...duration, days: v })}
                max={365}
              />
              <DurationInput
                label="Horas"
                value={duration.hours}
                onChange={(v) => setDuration({ ...duration, hours: v })}
                max={23}
              />
              <DurationInput
                label="Min"
                value={duration.minutes}
                onChange={(v) => setDuration({ ...duration, minutes: v })}
                max={59}
              />
              <DurationInput
                label="Seg"
                value={duration.seconds}
                onChange={(v) => setDuration({ ...duration, seconds: v })}
                max={59}
              />
            </div>

            <button
              onClick={setFromDuration}
              className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white font-semibold transition"
            >
              Começar a contar agora
            </button>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Predefinições</p>
              <div className="grid grid-cols-2 gap-2">
                <ExtendBtn label="4d 4h 30m 10s" onClick={() => applyPreset({ days: 4, hours: 4, minutes: 30, seconds: 10 })} />
                <ExtendBtn label="3 dias" onClick={() => applyPreset({ days: 3, hours: 0, minutes: 0, seconds: 0 })} />
                <ExtendBtn label="7 dias" onClick={() => applyPreset({ days: 7, hours: 0, minutes: 0, seconds: 0 })} />
                <ExtendBtn label="30 dias" onClick={() => applyPreset({ days: 30, hours: 0, minutes: 0, seconds: 0 })} />
              </div>
            </div>
          </div>

          {/* === Texto + toggle === */}
          <div className="lg:col-span-2 bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Texto da barra</h2>
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="accent-red-500"
                />
                <span>Barra visível no site</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Código do cupão</label>
                <input
                  type="text"
                  value={config.code}
                  onChange={(e) => setConfig({ ...config, code: e.target.value })}
                  placeholder="OXLYN-10"
                  maxLength={64}
                  className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">Título</label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  placeholder="Discount Started"
                  maxLength={160}
                  className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Subtítulo</label>
              <input
                type="text"
                value={config.subtitle}
                onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                placeholder="The 10% discount is now valid on all scripts."
                maxLength={255}
                className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CountBlock({ value, label, expired }: { value: number; label: string; expired: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-3 text-center ${
      expired
        ? 'bg-red-500/5 border-red-500/15 text-red-400/70'
        : 'bg-gradient-to-b from-red-500/10 to-red-500/5 border-red-500/20 text-white'
    }`}>
      <div className="text-2xl font-bold font-mono tabular-nums">
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-[9px] font-semibold tracking-[0.18em] text-gray-500 mt-1">
        {label}
      </div>
    </div>
  );
}

function ExtendBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-red-500/15 border border-white/8 hover:border-red-500/30 text-xs text-white font-semibold transition"
    >
      {label}
    </button>
  );
}

function DurationInput({
  label, value, onChange, max,
}: { label: string; value: number; onChange: (v: number) => void; max: number }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.18em] text-gray-500 mb-1">{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, parseInt(e.target.value || '0', 10) || 0)))}
        className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-3 py-2 text-center text-sm font-mono text-white focus:outline-none focus:border-red-500/50 transition"
      />
    </label>
  );
}
