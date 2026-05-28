"use client";

import { CalendarDays, Check, Clock3, MapPin, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

function festivalStart(id: FestivalId) {
  const dates = acts.filter((act) => act.festivalId === id).map((act) => dateValue(act.date));
  return Math.min(...dates);
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

function PersonTags({ people, compact = false }: { people: string[]; compact?: boolean }) {
  if (!people.length) return <span className="truncate">Noch niemand</span>;

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

export default function Home() {
  const [festivalId, setFestivalId] = useState<FestivalId>("rock-am-ring-2026");
  const [day, setDay] = useState("");
  const [name, setName] = useState("");
  const [nameLoaded, setNameLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [votes, setVotes] = useState<VoteState>({});
  const [busyAct, setBusyAct] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/votes")
      .then((res) => res.json())
      .then(setVotes)
      .catch(() => setVotes({}));
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

  const sortedFestivals = [...festivals].sort((a, b) => festivalStart(a.id) - festivalStart(b.id));
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

  const stages = Array.from(new Set(visibleActs.map((act) => act.stage)));
  const timedActs = visibleActs.filter((act) => minutes(act.start) !== null && minutes(act.end) !== null);
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

  async function vote(actId: string) {
    if (!name.trim()) return;
    setBusyAct(actId);
    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actId, name }),
    });
    setVotes(await res.json());
    setBusyAct(null);
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

  return (
    <main
      className="min-h-screen bg-cover bg-fixed bg-center px-4 py-5 md:px-8"
      style={{ backgroundImage: `linear-gradient(180deg, rgba(6, 9, 12, 0.78), rgba(6, 9, 12, 0.9)), url(${backgroundImage})` }}
    >
      <section className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-[8px] border border-white/10 bg-black/30 p-4 shadow-2xl backdrop-blur md:p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-200">Timetable</p>
              <h1 className="mt-1 text-4xl font-black tracking-normal md:text-6xl">Festival-Abstimmung</h1>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-300">
                <span className="inline-flex items-center gap-2"><MapPin size={16} />{festival.place}</span>
                <span className="inline-flex items-center gap-2"><CalendarDays size={16} />{festival.dates}</span>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr] lg:w-[520px]">
              <label className="text-sm text-zinc-300">
                Dein Name
                <input value={name} onChange={(event) => handleNameChange(event.target.value)} placeholder="z.B. Logge" className="mt-1 w-full rounded-[8px] border border-white/10 bg-white px-3 py-3 text-zinc-950 outline-none ring-orange-400/0 transition focus:ring-4" />
              </label>
              <label className="text-sm text-zinc-300">
                Suche
                <span className="relative mt-1 block">
                  <Search className="pointer-events-none absolute left-3 top-3.5 text-zinc-500" size={18} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Band oder Stage" className="w-full rounded-[8px] border border-white/10 bg-white py-3 pl-10 pr-3 text-zinc-950 outline-none ring-orange-400/0 transition focus:ring-4" />
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {sortedFestivals.map((item) => (
              <button key={item.id} onClick={() => { setFestivalId(item.id); setDay(""); }} className={`rounded-[8px] px-4 py-2 text-sm font-bold transition ${item.id === festivalId ? "bg-orange-500 text-white" : "bg-white/10 text-zinc-200 hover:bg-white/15"}`}>
                {item.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {days.map((item) => {
              const [label, date] = item.split("|");
              return (
                <button key={item} onClick={() => setDay(item)} className={`rounded-[8px] border px-3 py-2 text-left text-sm transition ${item === selectedDay ? "border-orange-300 bg-orange-300/15 text-white" : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"}`}>
                  <span className="block font-bold">{label}</span>
                  <span className="text-xs text-zinc-400">{date}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">{dayName} <span className="text-zinc-400">{dayDate}</span></h2>
            <p className="text-sm text-zinc-400">{festival.note}</p>
          </div>
          <a href={festival.sourceUrl} target="_blank" className="text-sm font-semibold text-orange-200 underline underline-offset-4">Quelle ansehen</a>
        </div>

        {timedActs.length ? (
          <div className="overflow-x-auto pb-4">
            <div className="grid min-w-max gap-3" style={{ gridTemplateColumns: `72px repeat(${Math.max(stages.length, 1)}, minmax(245px, 1fr))` }}>
              <div className="sticky left-0 z-20 rounded-[8px] border border-white/10 bg-zinc-950/95 px-3 py-2 text-xs font-black uppercase text-zinc-400">
                Zeit
              </div>
              {stages.map((stage) => (
                <div key={stage} className="sticky top-0 z-10 rounded-[8px] border border-white/10 bg-zinc-950/90 px-3 py-2 backdrop-blur">
                  <h3 className="font-black">{stage}</h3>
                </div>
              ))}

              <div className="relative sticky left-0 z-10 rounded-[8px] border border-white/10 bg-zinc-950/80" style={{ height: timelineHeight }}>
                {hourTicks.map((tick) => (
                  <div key={tick} className="absolute right-2 text-xs font-bold text-zinc-500" style={{ top: (tick - timelineStart) * PIXELS_PER_MINUTE - 8 }}>
                    {formatTick(tick)}
                  </div>
                ))}
              </div>

              {stages.map((stage) => (
                <section key={stage} className="relative min-w-[245px] rounded-[8px] border border-white/10 bg-[rgba(15,23,27,0.82)]" style={{ height: timelineHeight }}>
                  {hourTicks.map((tick) => (
                    <div key={tick} className="pointer-events-none absolute left-0 right-0 border-t border-white/10" style={{ top: (tick - timelineStart) * PIXELS_PER_MINUTE }} />
                  ))}
                  {visibleActs.filter((act) => act.stage === stage).map((act) => {
                    const start = minutes(act.start);
                    const end = minutes(act.end);
                    const people = votes[act.id] ?? [];
                    const selected = people.includes(name.trim());
                    if (start === null || end === null) return null;

                    return (
                      <button
                        key={act.id}
                        onClick={() => vote(act.id)}
                        disabled={!name.trim() || busyAct === act.id}
                        className={`absolute left-2 right-2 z-[1] flex flex-col items-start gap-1.5 overflow-hidden rounded-[8px] border px-2.5 py-2 text-left shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "border-green-300 bg-green-300/20" : "border-white/10 bg-zinc-900/95 hover:border-orange-300/70 hover:bg-zinc-800/95"}`}
                        style={{ top: (start - timelineStart) * PIXELS_PER_MINUTE, height: duration(act) }}
                      >
                        <span className="flex w-full items-center justify-between gap-2 text-[11px] font-bold uppercase text-zinc-400">
                          <span className="inline-flex items-center gap-1"><Clock3 size={13} />{act.start} - {act.end}</span>
                          {selected && <Check size={17} className="shrink-0 text-green-300" />}
                        </span>
                        <span className="line-clamp-2 text-sm font-black leading-tight md:text-base">{act.artist}</span>
                        <span className="mt-auto flex min-h-5 max-w-full items-center gap-1 overflow-hidden text-[11px] text-zinc-300">
                          <Users size={13} />
                          <PersonTags people={people} compact />
                        </span>
                      </button>
                    );
                  })}
                </section>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 overflow-x-auto pb-4" style={{ gridTemplateColumns: `repeat(${Math.max(stages.length, 1)}, minmax(260px, 1fr))` }}>
            {stages.map((stage) => (
              <section key={stage} className="min-w-[260px] rounded-[8px] border border-white/10 bg-[rgba(15,23,27,0.82)] p-3">
                <div className="sticky top-0 z-10 mb-3 rounded-[8px] border border-white/10 bg-zinc-950/90 px-3 py-2 backdrop-blur">
                  <h3 className="font-black">{stage}</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {visibleActs.filter((act) => act.stage === stage).map((act) => {
                    const people = votes[act.id] ?? [];
                    const selected = people.includes(name.trim());
                    return (
                      <button key={act.id} onClick={() => vote(act.id)} disabled={!name.trim() || busyAct === act.id} className={`group flex w-full flex-col items-start gap-3 rounded-[8px] border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "border-green-300 bg-green-300/15" : "border-white/10 bg-white/[0.06] hover:border-orange-300/70 hover:bg-white/[0.1]"}`} style={{ minHeight: duration(act) }}>
                        <span className="flex w-full items-center justify-between gap-2 text-xs font-bold uppercase text-zinc-400">
                          <span className="inline-flex items-center gap-1"><Clock3 size={14} />TBA</span>
                          {selected && <Check size={18} className="text-green-300" />}
                        </span>
                        <span className="text-xl font-black leading-tight">{act.artist}</span>
                        <span className="mt-auto flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                          <Users size={14} />
                          <PersonTags people={people} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
