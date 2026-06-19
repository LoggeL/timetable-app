"use client";

import { CalendarDays, Check, CircleOff, Clock3, Download, MapPin, Search, SearchX, Share, Smartphone, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { acts, festivals, type Act, type FestivalId } from "@/lib/festivals";
import type { VoteState } from "@/lib/votes";

function minutes(time?: string) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return (h < 8 ? h + 24 : h) * 60 + m;
}

function dateValue(date: string) {
  const [day, month, year] = date.split(".").map(Number);
  return new Date(year, month - 1, day).getTime();
}

function dateKey(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

function festivalDateKey(date: Date) {
  const adjusted = new Date(date);
  if (adjusted.getHours() < 8) adjusted.setDate(adjusted.getDate() - 1);
  return dateKey(adjusted);
}

function currentFestivalMinutes(date: Date) {
  const hour = date.getHours();
  return (hour < 8 ? hour + 24 : hour) * 60 + date.getMinutes();
}

function festivalStart(id: FestivalId) {
  const dates = acts.filter((act) => act.festivalId === id).map((act) => dateValue(act.date));
  return Math.min(...dates);
}

function orderedStages(stageNames: string[], preferredOrder: string[]) {
  const existing = new Set(stageNames);
  const ordered = preferredOrder.filter((stage) => existing.has(stage));
  const extra = stageNames.filter((stage) => !preferredOrder.includes(stage)).sort((a, b) => a.localeCompare(b));
  return [...ordered, ...extra];
}

const festivalBackgrounds: Record<FestivalId, string> = {
  "rock-am-ring-2026": "/images/rock-am-ring-bg.png",
  "stagetopia-2026": "/images/stagetopia-bg.png",
  "southside-2026": "/images/southside-bg.png",
  "highfield-2026": "/images/highfield-bg.png",
};

function duration(act: Act) {
  const start = minutes(act.start);
  const end = minutes(act.end);
  if (start === null || end === null) return 72;
  return Math.max(92, (end - start) * PIXELS_PER_MINUTE);
}

const PIXELS_PER_MINUTE = 1.8;
const HOUR = 60;
const TIMELINE_MARGIN_MINUTES = 30;
const NAME_STORAGE_KEY = "timetable-person-name";
const VOTES_STORAGE_KEY = "timetable-votes-cache";
const VOTE_QUEUE_STORAGE_KEY = "timetable-vote-queue";
const OFFLINE_EVENT_NAME = "timetable:offline-cache-ready";

type QueuedVote = {
  id: string;
  actId: string;
  name: string;
  createdAt: number;
};

type ServiceWorkerRegistrationWithSync = ServiceWorkerRegistration & {
  sync?: {
    register: (tag: string) => Promise<void>;
  };
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function readQueuedVotes() {
  if (typeof window === "undefined") return [] as QueuedVote[];
  try {
    return JSON.parse(window.localStorage.getItem(VOTE_QUEUE_STORAGE_KEY) ?? "[]") as QueuedVote[];
  } catch {
    window.localStorage.removeItem(VOTE_QUEUE_STORAGE_KEY);
    return [] as QueuedVote[];
  }
}

function writeQueuedVotes(queue: QueuedVote[]) {
  window.localStorage.setItem(VOTE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

function queueVote(actId: string, name: string) {
  const queue = readQueuedVotes();
  const queuedVote = { id: `${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`, actId, name, createdAt: Date.now() };
  writeQueuedVotes([...queue, queuedVote]);
  return queuedVote;
}

function formatTick(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60) % 24;
  return `${String(hour).padStart(2, "0")}:00`;
}

function colorForName(name: string) {
  const hash = [...name.trim().toLowerCase()].reduce((current, char) => {
    return (current * 33 + char.charCodeAt(0)) >>> 0;
  }, 5381);
  const hue = hash % 360;
  return {
    bg: `hsla(${hue}, 78%, 52%, 0.2)`,
    border: `hsla(${hue}, 82%, 64%, 0.78)`,
    text: `hsl(${hue}, 88%, 86%)`,
  };
}

function togglePerson(people: string[], name: string) {
  const current = new Set(people);
  if (current.has(name)) {
    current.delete(name);
  } else {
    current.add(name);
  }
  return Array.from(current).sort((a, b) => a.localeCompare(b, "de"));
}

function applyQueuedVotes(serverVotes: VoteState, queuedVotes: QueuedVote[]) {
  return queuedVotes.reduce<VoteState>((currentVotes, queuedVote) => {
    return {
      ...currentVotes,
      [queuedVote.actId]: togglePerson(currentVotes[queuedVote.actId] ?? [], queuedVote.name),
    };
  }, serverVotes);
}

function PersonTags({ people, compact = false }: { people: string[]; compact?: boolean }) {
  if (!people.length) return <span className="truncate text-zinc-500">Noch niemand</span>;

  return (
    <>
      {people.map((person) => {
        const color = colorForName(person);
        return (
          <span
            key={person}
            className={`max-w-full truncate rounded-full border font-bold ${compact ? "px-1.5 py-0.5" : "px-2 py-1"}`}
            style={{ backgroundColor: color.bg, borderColor: color.border, color: color.text }}
            title={person}
          >
            {person}
          </span>
        );
      })}
    </>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-red-300 ring-1 ring-red-400/50">
      <span className="animate-live-glow inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
      LIVE
    </span>
  );
}

function CancelledBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-600/25 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-red-100 ring-1 ring-red-300/60">
      <CircleOff size={12} />
      ENTFÄLLT
    </span>
  );
}

export default function Home() {
  const [festivalId, setFestivalId] = useState<FestivalId>("southside-2026");
  const [day, setDay] = useState("");
  const [name, setName] = useState("");
  const [nameLoaded, setNameLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [votes, setVotes] = useState<VoteState>({});
  const [busyAct, setBusyAct] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [pendingVoteCount, setPendingVoteCount] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const nowLineRef = useRef<HTMLDivElement | null>(null);
  const autoSelectedCurrentDayRef = useRef(false);
  const autoScrolledRef = useRef("");

  useEffect(() => {
    const cachedVotes = window.localStorage.getItem(VOTES_STORAGE_KEY);
    if (cachedVotes) {
      try {
        setVotes(JSON.parse(cachedVotes) as VoteState);
      } catch {
        window.localStorage.removeItem(VOTES_STORAGE_KEY);
      }
    }
    setPendingVoteCount(readQueuedVotes().length);

    const refreshVotes = async () => {
      try {
        const res = await fetch("/api/votes");
        const nextVotes = (await res.json()) as VoteState;
        const mergedVotes = applyQueuedVotes(nextVotes, readQueuedVotes());
        setVotes(mergedVotes);
        window.localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(mergedVotes));
      } catch {
        if (!cachedVotes) setVotes({});
      }
    };

    refreshVotes();
  }, []);

  useEffect(() => {
    const updateOfflineReady = async () => {
      if (!("serviceWorker" in navigator) || !("caches" in window)) return;
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      const cacheNames = await caches.keys().catch(() => []);
      setIsOfflineReady(Boolean(registration && cacheNames.some((name) => name.startsWith("timetable-offline-"))));
    };

    updateOfflineReady();
    window.addEventListener(OFFLINE_EVENT_NAME, updateOfflineReady);
    return () => window.removeEventListener(OFFLINE_EVENT_NAME, updateOfflineReady);
  }, []);

  useEffect(() => {
    const syncQueuedVotes = async () => {
      navigator.serviceWorker?.controller?.postMessage({ type: "SYNC_VOTES" });
      if (!navigator.onLine) return;
      const queue = readQueuedVotes();
      if (!queue.length) {
        setPendingVoteCount(0);
        return;
      }

      let remaining = [...queue];
      for (const queuedVote of queue) {
        try {
          const res = await fetch("/api/votes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ actId: queuedVote.actId, name: queuedVote.name }),
          });
          if (!res.ok) throw new Error(`Vote sync failed: ${res.status}`);
          const nextVotes = (await res.json()) as VoteState;
          remaining = remaining.filter((item) => item.id !== queuedVote.id);
          writeQueuedVotes(remaining);
          setPendingVoteCount(remaining.length);
          setVotes(applyQueuedVotes(nextVotes, remaining));
          window.localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(applyQueuedVotes(nextVotes, remaining)));
        } catch {
          break;
        }
      }
    };

    syncQueuedVotes();
    window.addEventListener("online", syncQueuedVotes);
    document.addEventListener("visibilitychange", syncQueuedVotes);
    return () => {
      window.removeEventListener("online", syncQueuedVotes);
      document.removeEventListener("visibilitychange", syncQueuedVotes);
    };
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsStandalone(standalone);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  useEffect(() => {
    const storedName = window.localStorage.getItem(NAME_STORAGE_KEY);
    if (storedName) setName(storedName);
    setNameLoaded(true);
  }, []);

  useEffect(() => {
    if (!nameLoaded) return;
    const cleanName = name.trim();
    if (cleanName) {
      window.localStorage.setItem(NAME_STORAGE_KEY, cleanName);
    } else {
      window.localStorage.removeItem(NAME_STORAGE_KEY);
    }
  }, [name, nameLoaded]);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setIncludeArchived(new URLSearchParams(window.location.search).get("archive") === "1");
  }, []);

  const sortedFestivals = festivals
    .filter((item) => includeArchived || !item.archived)
    .sort((a, b) => festivalStart(a.id) - festivalStart(b.id));
  const festival = sortedFestivals.find((item) => item.id === festivalId) ?? sortedFestivals[0];
  const backgroundImage = festivalBackgrounds[festival.id];
  const festivalActs = acts.filter((act) => act.festivalId === festivalId);
  const days = Array.from(new Set(festivalActs.map((act) => `${act.day}|${act.date}`))).sort(
    (a, b) => dateValue(a.split("|")[1]) - dateValue(b.split("|")[1]),
  );
  const selectedDay = day || days[0] || "";
  const [dayName, dayDate] = selectedDay.split("|");

  const visibleActs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return festivalActs
      .filter((act) => `${act.day}|${act.date}` === selectedDay)
      .filter((act) => !q || act.artist.toLowerCase().includes(q) || act.stage.toLowerCase().includes(q))
      .sort((a, b) => (minutes(a.start) ?? 0) - (minutes(b.start) ?? 0) || a.stage.localeCompare(b.stage));
  }, [festivalActs, selectedDay, query]);

  const timedActs = visibleActs.filter((act) => minutes(act.start) !== null && minutes(act.end) !== null);
  const untimedActs = visibleActs.filter((act) => minutes(act.start) === null || minutes(act.end) === null);
  const stages = orderedStages(Array.from(new Set((timedActs.length ? timedActs : visibleActs).map((act) => act.stage))), festival.stageOrder);
  const untimedStages = orderedStages(Array.from(new Set(untimedActs.map((act) => act.stage))), festival.stageOrder);
  const firstActStart = timedActs.length ? Math.min(...timedActs.map((act) => minutes(act.start) ?? 0)) : 0;
  const lastActEnd = timedActs.length ? Math.max(...timedActs.map((act) => minutes(act.end) ?? 0)) : 0;
  const timelineStart = timedActs.length ? firstActStart - TIMELINE_MARGIN_MINUTES : 0;
  const timelineEnd = timedActs.length ? lastActEnd + TIMELINE_MARGIN_MINUTES : 0;
  const timelineHeight = Math.max(360, (timelineEnd - timelineStart) * PIXELS_PER_MINUTE);
  const firstHourTick = timedActs.length ? Math.ceil(timelineStart / HOUR) * HOUR : 0;
  const hourTicks = Array.from(
    { length: timedActs.length ? Math.floor((timelineEnd - firstHourTick) / HOUR) + 1 : 0 },
    (_, index) => firstHourTick + index * HOUR,
  );
  const currentDayDate = now ? festivalDateKey(now) : "";
  const currentMinutes = now ? currentFestivalMinutes(now) : null;
  const isCurrentSelectedDay = dayDate === currentDayDate;
  const nowTop =
    isCurrentSelectedDay && currentMinutes !== null && currentMinutes >= timelineStart && currentMinutes <= timelineEnd
      ? (currentMinutes - timelineStart) * PIXELS_PER_MINUTE
      : null;
  const currentActIds =
    isCurrentSelectedDay && currentMinutes !== null
      ? new Set(
          timedActs
            .filter((act) => {
              const start = minutes(act.start);
              const end = minutes(act.end);
              return start !== null && end !== null && currentMinutes >= start && currentMinutes < end;
            })
            .map((act) => act.id),
        )
      : new Set<string>();
  const pastActIds =
    isCurrentSelectedDay && currentMinutes !== null
      ? new Set(
          timedActs
            .filter((act) => {
              const end = minutes(act.end);
              return end !== null && currentMinutes >= end;
            })
            .map((act) => act.id),
        )
      : new Set<string>();

  useEffect(() => {
    if (!now || autoSelectedCurrentDayRef.current) return;
    const currentDate = festivalDateKey(now);
    const currentFestival = sortedFestivals.find((item) => acts.some((act) => act.festivalId === item.id && act.date === currentDate));
    const currentDay = currentFestival
      ? Array.from(new Set(acts.filter((act) => act.festivalId === currentFestival.id && act.date === currentDate).map((act) => `${act.day}|${act.date}`))).sort(
          (a, b) => dateValue(a.split("|")[1]) - dateValue(b.split("|")[1]),
        )[0]
      : "";
    autoSelectedCurrentDayRef.current = true;
    if (!currentFestival || !currentDay) return;
    setFestivalId(currentFestival.id);
    setDay(currentDay);
  }, [now, sortedFestivals]);

  useEffect(() => {
    if (nowTop === null || !nowLineRef.current || !selectedDay) return;
    const scrollKey = `${festivalId}|${selectedDay}`;
    if (autoScrolledRef.current === scrollKey) return;
    autoScrolledRef.current = scrollKey;
    window.setTimeout(() => {
      nowLineRef.current?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    }, 80);
  }, [festivalId, nowTop, selectedDay]);

  async function vote(actId: string) {
    const cleanName = name.trim();
    if (!cleanName) return;
    setBusyAct(actId);

    const optimisticVotes: VoteState = {
      ...votes,
      [actId]: togglePerson(votes[actId] ?? [], cleanName),
    };
    setVotes(optimisticVotes);
    window.localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(optimisticVotes));

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actId, name: cleanName }),
      });
      if (!res.ok) throw new Error(`Vote failed: ${res.status}`);
      const nextVotes = (await res.json()) as VoteState;
      const mergedVotes = applyQueuedVotes(nextVotes, readQueuedVotes());
      setVotes(mergedVotes);
      window.localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(mergedVotes));
    } catch {
      queueVote(actId, cleanName);
      setPendingVoteCount(readQueuedVotes().length);
      void navigator.serviceWorker?.ready
        .then((registration) => (registration as ServiceWorkerRegistrationWithSync).sync?.register("sync-votes"))
        .catch(() => undefined);
    } finally {
      setBusyAct(null);
    }
  }

  function handleNameChange(value: string) {
    setName(value);
    const cleanName = value.trim();
    if (cleanName) {
      window.localStorage.setItem(NAME_STORAGE_KEY, cleanName);
    } else {
      window.localStorage.removeItem(NAME_STORAGE_KEY);
    }
  }

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") setInstallPrompt(null);
      return;
    }

    setShowInstallHelp((current) => !current);
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-white/10 bg-zinc-900/70 px-3 py-3 text-zinc-50 placeholder:text-zinc-500 outline-none backdrop-blur transition-all duration-200 focus:border-orange-400/60 focus:bg-zinc-900/90 focus:ring-4 focus:ring-orange-400/20";

  return (
    <main
      className="min-h-screen bg-cover bg-fixed bg-center px-4 py-5 transition-[background-image] duration-500 md:px-8"
      style={{ backgroundImage: `linear-gradient(180deg, rgba(6, 9, 12, 0.78), rgba(6, 9, 12, 0.9)), url(${backgroundImage})` }}
    >
      <section className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="animate-fade-in-up flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 shadow-2xl backdrop-blur-md md:p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300">Timetable</p>
              <h1 className="mt-1 bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-4xl font-black tracking-tight text-transparent md:text-6xl">
                Festival-Abstimmung
              </h1>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-300">
                <span className="inline-flex items-center gap-2"><MapPin size={16} className="text-orange-300/80" />{festival.place}</span>
                <span className="inline-flex items-center gap-2"><CalendarDays size={16} className="text-orange-300/80" />{festival.dates}</span>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr] lg:w-[520px]">
              <label className="text-sm text-zinc-300">
                Dein Name
                <input value={name} onChange={(event) => handleNameChange(event.target.value)} placeholder="z.B. Logge" className={inputClass} />
              </label>
              <label className="text-sm text-zinc-300">
                Suche
                <span className="relative mt-1 block">
                  <Search className="pointer-events-none absolute left-3 top-3.5 z-10 text-zinc-500" size={18} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Band oder Stage" className={`${inputClass} mt-0 pl-10`} />
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1.5 text-xs font-black ${
                isOfflineReady ? "border-green-300/50 bg-green-400/10 text-green-200" : "border-orange-300/40 bg-orange-400/10 text-orange-200"
              }`}
              title="Die App speichert Zeitplan, Assets und lokale Stimmen auf diesem Gerät."
            >
              {isOfflineReady ? "Offline bereit" : "Offline wird vorbereitet"}
            </span>
            {!isStandalone && (
              <button
                type="button"
                onClick={installApp}
                className="tab-btn inline-flex items-center gap-2 rounded-xl border border-orange-300/40 bg-orange-400/15 px-4 py-2 text-sm font-black text-orange-100 shadow-lg shadow-orange-950/30 hover:bg-orange-400/25"
              >
                {installPrompt ? <Download size={16} /> : <Smartphone size={16} />}
                App installieren
              </button>
            )}
            {pendingVoteCount > 0 && (
              <span className="rounded-full border border-sky-300/40 bg-sky-400/10 px-3 py-1.5 text-xs font-black text-sky-200">
                {pendingVoteCount} Stimme{pendingVoteCount === 1 ? "" : "n"} wartet/warten auf Sync
              </span>
            )}
            {showInstallHelp && !isStandalone && !installPrompt && (
              <div className="basis-full rounded-2xl border border-white/10 bg-zinc-950/75 p-3 text-sm text-zinc-200 shadow-xl">
                <p className="font-black text-white">Installieren auf dem Handy</p>
                <p className="mt-1 text-zinc-300">
                  iPhone/Safari: <Share className="inline-block align-[-2px]" size={15} /> Teilen öffnen → <strong>Zum Home-Bildschirm</strong>.
                  Android/Chrome: Browser-Menü öffnen → <strong>App installieren</strong> oder <strong>Zum Startbildschirm hinzufügen</strong>.
                </p>
              </div>
            )}
            {sortedFestivals.map((item) => (
              <button
                key={item.id}
                onClick={() => { setFestivalId(item.id); setDay(""); }}
                className={`tab-btn rounded-xl px-4 py-2 text-sm font-bold ${
                  item.id === festivalId
                    ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-950/50"
                    : "bg-white/10 text-zinc-200 hover:bg-white/15"
                }`}
              >
                {item.name}{item.archived ? " (Archiv)" : ""}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                const nextIncludeArchived = !includeArchived;
                setIncludeArchived(nextIncludeArchived);
                window.history.replaceState(null, "", nextIncludeArchived ? "?archive=1" : "/");
                if (!nextIncludeArchived && festival.archived) {
                  setFestivalId("southside-2026");
                  setDay("");
                }
              }}
              className="tab-btn rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            >
              {includeArchived ? "Archiv ausblenden" : "Archiv anzeigen"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {days.map((item) => {
              const [label, date] = item.split("|");
              const isToday = now && date === currentDayDate;
              return (
                <button
                  key={item}
                  onClick={() => setDay(item)}
                  className={`tab-btn rounded-xl border px-3 py-2 text-left text-sm ${
                    item === selectedDay
                      ? "border-orange-300/80 bg-orange-400/15 text-white shadow-lg shadow-orange-950/30 ring-1 ring-orange-300/30"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    {label}
                    {isToday && <span className="animate-live-glow inline-block h-1.5 w-1.5 rounded-full bg-orange-400" title="Heute" />}
                  </span>
                  <span className={`text-xs ${item === selectedDay ? "text-orange-200/80" : "text-zinc-500"}`}>{date}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div key={`${festivalId}|${selectedDay}`} className="contents">
          <div className="animate-fade-in flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">{dayName} <span className="font-bold text-zinc-400">{dayDate}</span></h2>
              <p className="text-sm text-zinc-400">{festival.note}</p>
            </div>
            <a
              href={festival.sourceUrl}
              target="_blank"
              className="text-sm font-semibold text-orange-300 underline decoration-orange-300/40 underline-offset-4 transition-colors hover:text-orange-200 hover:decoration-orange-200"
            >
              Quelle ansehen
            </a>
          </div>

          {visibleActs.length === 0 && query.trim() ? (
            <div className="animate-fade-in-up flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-6 py-16 text-center backdrop-blur">
              <SearchX size={36} className="text-zinc-500" />
              <p className="text-lg font-bold text-zinc-300">Nichts gefunden</p>
              <p className="text-sm text-zinc-500">Keine Treffer für „{query.trim()}" an diesem Tag.</p>
              <button onClick={() => setQuery("")} className="tab-btn mt-1 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-white/15">
                Suche zurücksetzen
              </button>
            </div>
          ) : timedActs.length ? (
            <>
              <div className="overflow-x-auto pb-4">
                <div className="grid min-w-max gap-3" style={{ gridTemplateColumns: `72px repeat(${Math.max(stages.length, 1)}, minmax(245px, 1fr))` }}>
                  <div className="sticky left-0 z-20 rounded-xl border border-white/10 bg-zinc-950/95 px-3 py-2 text-xs font-black uppercase tracking-wider text-zinc-400">
                    Zeit
                  </div>
                  {stages.map((stage, stageIndex) => (
                    <div
                      key={stage}
                      className="animate-fade-in-up sticky top-0 z-10 rounded-xl border border-white/10 bg-zinc-950/90 px-3 py-2 backdrop-blur"
                      style={{ animationDelay: `${stageIndex * 50}ms` }}
                    >
                      <h3 className="font-black"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-orange-400/80" />{stage}</h3>
                    </div>
                  ))}

                  <div className="relative sticky left-0 z-10 rounded-xl border border-white/10 bg-zinc-950/80" style={{ height: timelineHeight }}>
                    {hourTicks.map((tick) => (
                      <div key={tick} className="absolute right-2 text-xs font-bold tabular-nums text-zinc-500" style={{ top: (tick - timelineStart) * PIXELS_PER_MINUTE - 8 }}>
                        {formatTick(tick)}
                      </div>
                    ))}
                    {nowTop !== null && (
                      <div ref={nowLineRef} className="pointer-events-none absolute left-0 right-0 z-20" style={{ top: nowTop }}>
                        <span className="absolute right-2 -translate-y-1/2 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-black text-white shadow-lg shadow-red-950/40">
                          Jetzt
                        </span>
                      </div>
                    )}
                  </div>

                  {stages.map((stage, stageIndex) => (
                    <section
                      key={stage}
                      className="animate-fade-in relative min-w-[245px] rounded-xl border border-white/10 bg-[rgba(15,23,27,0.82)]"
                      style={{ height: timelineHeight, animationDelay: `${stageIndex * 50}ms` }}
                    >
                      {hourTicks.map((tick) => (
                        <div key={tick} className="pointer-events-none absolute left-0 right-0 border-t border-white/[0.07]" style={{ top: (tick - timelineStart) * PIXELS_PER_MINUTE }} />
                      ))}
                      {nowTop !== null && (
                        <div className="pointer-events-none absolute left-0 right-0 z-20 border-t-2 border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.75)]" style={{ top: nowTop }}>
                          <span className="animate-pulse-dot absolute left-2 top-0 h-2 w-2 -translate-y-1/2 rounded-full bg-red-400" />
                        </div>
                      )}
                      {timedActs.filter((act) => act.stage === stage).map((act, actIndex) => {
                        const start = minutes(act.start);
                        const end = minutes(act.end);
                        const people = votes[act.id] ?? [];
                        const selected = people.includes(name.trim());
                        const isCancelled = act.status === "cancelled";
                        const isLive = !isCancelled && currentActIds.has(act.id);
                        const isPast = pastActIds.has(act.id);
                        if (start === null || end === null) return null;

                        return (
                          <button
                            key={act.id}
                            onClick={() => vote(act.id)}
                            disabled={isCancelled || !name.trim() || busyAct === act.id}
                            title={isCancelled ? act.note : !name.trim() ? "Erst Namen eingeben, dann abstimmen" : undefined}
                            className={`act-card animate-fade-in-up absolute left-2 right-2 z-[1] flex flex-col items-start gap-1.5 overflow-hidden rounded-xl border px-2.5 py-2 text-left shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${
                              isLive ? "ring-2 ring-red-400/80" : ""
                            } ${
                              selected
                                ? "border-green-300/80 bg-gradient-to-br from-green-300/25 to-green-400/10 shadow-[0_0_20px_rgba(97,211,148,0.18)]"
                                : isCancelled
                                  ? "border-red-300/70 bg-red-950/60 text-zinc-300"
                                  : "border-white/10 bg-zinc-900/95 hover:border-orange-300/70 hover:bg-zinc-800/95"
                            } ${isCancelled || (isPast && !isLive) ? "opacity-60 saturate-50" : ""}`}
                            style={{
                              top: (start - timelineStart) * PIXELS_PER_MINUTE,
                              height: duration(act),
                              animationDelay: `${Math.min(stageIndex * 50 + actIndex * 35, 600)}ms`,
                            }}
                          >
                            <span className="flex w-full items-center justify-between gap-2 text-[11px] font-bold uppercase text-zinc-400">
                              <span className="inline-flex items-center gap-1 tabular-nums"><Clock3 size={13} />{act.start} - {act.end}</span>
                              <span className="inline-flex items-center gap-1.5">
                                {isCancelled && <CancelledBadge />}
                                {isLive && <LiveBadge />}
                                {selected && !isCancelled && <Check size={17} className="animate-scale-in shrink-0 text-green-300" />}
                              </span>
                            </span>
                            <span className={isCancelled ? "line-clamp-2 text-sm font-black leading-tight line-through decoration-red-300/80 decoration-2 md:text-base" : "line-clamp-2 text-sm font-black leading-tight md:text-base"}>{act.artist}</span>
                            {isCancelled && <span className="text-[11px] font-bold text-red-100/90">{act.note}</span>}
                            <span className="mt-auto flex min-h-5 max-w-full items-center gap-1 overflow-hidden text-[11px] text-zinc-300">
                              <Users size={13} className="shrink-0" />
                              <PersonTags people={people} compact />
                            </span>
                          </button>
                        );
                      })}
                    </section>
                  ))}
                </div>
              </div>
              {untimedActs.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-black uppercase tracking-[0.16em] text-zinc-400">Noch ohne Zeit</h3>
                  <ActGrid stages={untimedStages} visibleActs={untimedActs} votes={votes} name={name} busyAct={busyAct} vote={vote} />
                </div>
              )}
            </>
          ) : (
            <ActGrid stages={stages} visibleActs={visibleActs} votes={votes} name={name} busyAct={busyAct} vote={vote} />
          )}
        </div>
      </section>
    </main>
  );
}

function ActGrid({
  stages,
  visibleActs,
  votes,
  name,
  busyAct,
  vote,
}: {
  stages: string[];
  visibleActs: Act[];
  votes: VoteState;
  name: string;
  busyAct: string | null;
  vote: (actId: string) => void;
}) {
  return (
    <div className="grid gap-3 overflow-x-auto pb-4" style={{ gridTemplateColumns: `repeat(${Math.max(stages.length, 1)}, minmax(260px, 1fr))` }}>
      {stages.map((stage, stageIndex) => (
        <section
          key={stage}
          className="animate-fade-in-up min-w-[260px] rounded-xl border border-white/10 bg-[rgba(15,23,27,0.82)] p-3"
          style={{ animationDelay: `${stageIndex * 60}ms` }}
        >
          <div className="sticky top-0 z-10 mb-3 rounded-xl border border-white/10 bg-zinc-950/90 px-3 py-2 backdrop-blur">
            <h3 className="font-black"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-orange-400/80" />{stage}</h3>
          </div>
          <div className="flex flex-col gap-3">
            {visibleActs.filter((act) => act.stage === stage).map((act, actIndex) => {
              const people = votes[act.id] ?? [];
              const selected = people.includes(name.trim());
              const isCancelled = act.status === "cancelled";
              return (
                <button
                  key={act.id}
                  onClick={() => vote(act.id)}
                  disabled={isCancelled || !name.trim() || busyAct === act.id}
                  title={isCancelled ? act.note : !name.trim() ? "Erst Namen eingeben, dann abstimmen" : undefined}
                  className={`act-card animate-fade-in-up group flex w-full flex-col items-start gap-3 rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
                    selected
                      ? "border-green-300/80 bg-gradient-to-br from-green-300/20 to-green-400/5 shadow-[0_0_20px_rgba(97,211,148,0.15)]"
                      : isCancelled
                        ? "border-red-300/70 bg-red-950/50 text-zinc-300 opacity-60 saturate-50"
                        : "border-white/10 bg-white/[0.06] hover:border-orange-300/70 hover:bg-white/[0.1]"
                  }`}
                  style={{ minHeight: duration(act), animationDelay: `${Math.min(stageIndex * 60 + actIndex * 40, 600)}ms` }}
                >
                  <span className="flex w-full items-center justify-between gap-2 text-xs font-bold uppercase text-zinc-400">
                    <span className="inline-flex items-center gap-1"><Clock3 size={14} />TBA</span>
                    {isCancelled && <CancelledBadge />}
                    {selected && !isCancelled && <Check size={18} className="animate-scale-in text-green-300" />}
                  </span>
                  <span className={isCancelled ? "text-xl font-black leading-tight line-through decoration-red-300/80 decoration-2" : "text-xl font-black leading-tight"}>{act.artist}</span>
                  {isCancelled && <span className="text-xs font-bold text-red-100/90">{act.note}</span>}
                  <span className="mt-auto flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                    <Users size={14} className="shrink-0" />
                    <PersonTags people={people} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
