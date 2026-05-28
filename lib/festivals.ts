export type FestivalId = "rock-am-ring-2026" | "southside-2026" | "stagetopia-2026" | "highfield-2026";

export type Act = {
  id: string;
  festivalId: FestivalId;
  day: string;
  date: string;
  stage: string;
  artist: string;
  start?: string;
  end?: string;
  source: "official-timetable" | "official-lineup";
};

export type Festival = {
  id: FestivalId;
  name: string;
  place: string;
  dates: string;
  note: string;
  sourceUrl: string;
};

export const festivals: Festival[] = [
  {
    id: "rock-am-ring-2026",
    name: "Rock am Ring",
    place: "Nuerburgring",
    dates: "5.-7. Juni 2026",
    note: "Offizielle Zeiten von rock-am-ring.com, Stand 28.05.2026.",
    sourceUrl: "https://www.rock-am-ring.com/timetable",
  },
  {
    id: "southside-2026",
    name: "Southside",
    place: "Neuhausen ob Eck",
    dates: "18.-21. Juni 2026",
    note: "Offizielles Line-up nach Tagen; Uhrzeiten waren am 28.05.2026 noch nicht veroeffentlicht.",
    sourceUrl: "https://southside.de/line-up/",
  },
  {
    id: "stagetopia-2026",
    name: "Stagetopia",
    place: "Universitaet Saarbruecken",
    dates: "13. Juni 2026",
    note: "Line-up nach Festivalplaner; Uhrzeiten waren am 28.05.2026 noch nicht veroeffentlicht.",
    sourceUrl: "https://www.festivalplaner.de/festival/stagetopia-festival/",
  },
  {
    id: "highfield-2026",
    name: "Highfield",
    place: "Stoermthaler See, Grosspoesna",
    dates: "13.-16. August 2026",
    note: "Offizielles Line-up nach Tagen; Uhrzeiten waren am 28.05.2026 noch nicht veroeffentlicht.",
    sourceUrl: "https://highfield.de/line-up/",
  },
];

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const rarRows: [string, string, string, string, string, string, string][] = [
  ["fri", "Freitag", "05.06.2026", "Utopia Stage", "Mehnersmoos", "14:55", "15:50"],
  ["fri", "Freitag", "05.06.2026", "Utopia Stage", "Bush", "16:20", "17:20"],
  ["fri", "Freitag", "05.06.2026", "Utopia Stage", "The Hives", "17:50", "18:50"],
  ["fri", "Freitag", "05.06.2026", "Utopia Stage", "Architects", "19:20", "20:20"],
  ["fri", "Freitag", "05.06.2026", "Utopia Stage", "Papa Roach", "21:00", "22:15"],
  ["fri", "Freitag", "05.06.2026", "Utopia Stage", "Linkin Park", "23:00", "00:30"],
  ["fri", "Freitag", "05.06.2026", "Mandora Stage", "Loathe", "14:05", "14:50"],
  ["fri", "Freitag", "05.06.2026", "Mandora Stage", "We Came As Romans", "15:20", "16:05"],
  ["fri", "Freitag", "05.06.2026", "Mandora Stage", "Mastodon", "16:35", "17:25"],
  ["fri", "Freitag", "05.06.2026", "Mandora Stage", "The Plot In You", "17:55", "18:55"],
  ["fri", "Freitag", "05.06.2026", "Mandora Stage", "Within Temptation", "19:25", "20:25"],
  ["fri", "Freitag", "05.06.2026", "Mandora Stage", "Trivium", "20:55", "22:05"],
  ["fri", "Freitag", "05.06.2026", "Mandora Stage", "Babymetal", "22:45", "00:00"],
  ["fri", "Freitag", "05.06.2026", "Mandora Stage", "Limp Bizkit", "00:45", "02:00"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "Slay Squad", "14:55", "15:35"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "Ankor", "16:00", "16:40"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "Magnolia Park", "17:05", "17:45"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "TX2", "18:10", "18:50"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "Don Broco", "19:15", "20:00"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "DRAIN", "20:25", "21:10"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "Malevolence", "21:35", "22:25"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "The Funeral Portrait", "22:50", "23:50"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "Danko Jones", "00:20", "01:20"],
  ["fri", "Freitag", "05.06.2026", "Orbit Stage", "The Butcher Sisters", "01:50", "03:00"],
  ["sat", "Samstag", "06.06.2026", "Utopia Stage", "Ecca Vandal", "14:50", "15:35"],
  ["sat", "Samstag", "06.06.2026", "Utopia Stage", "The Pretty Reckless", "16:05", "17:05"],
  ["sat", "Samstag", "06.06.2026", "Utopia Stage", "Tom Morello", "17:35", "18:35"],
  ["sat", "Samstag", "06.06.2026", "Utopia Stage", "Three Days Grace", "19:05", "20:20"],
  ["sat", "Samstag", "06.06.2026", "Utopia Stage", "Electric Callboy", "21:00", "22:30"],
  ["sat", "Samstag", "06.06.2026", "Utopia Stage", "Volbeat", "23:15", "01:00"],
  ["sat", "Samstag", "06.06.2026", "Mandora Stage", "Paleface Swiss", "15:15", "15:50"],
  ["sat", "Samstag", "06.06.2026", "Mandora Stage", "Bilmuri", "16:10", "16:55"],
  ["sat", "Samstag", "06.06.2026", "Mandora Stage", "Bury Tomorrow", "17:20", "18:15"],
  ["sat", "Samstag", "06.06.2026", "Mandora Stage", "Landmvrks", "18:45", "19:45"],
  ["sat", "Samstag", "06.06.2026", "Mandora Stage", "Ice Nine Kills", "20:15", "21:25"],
  ["sat", "Samstag", "06.06.2026", "Mandora Stage", "Marteria", "22:05", "23:20"],
  ["sat", "Samstag", "06.06.2026", "Mandora Stage", "Bad Omens", "00:30", "02:00"],
  ["sun", "Sonntag", "07.06.2026", "Utopia Stage", "Bad Nerves", "12:55", "13:40"],
  ["sun", "Sonntag", "07.06.2026", "Utopia Stage", "Black Veil Brides", "14:10", "15:05"],
  ["sun", "Sonntag", "07.06.2026", "Utopia Stage", "Hollywood Undead", "15:35", "16:35"],
  ["sun", "Sonntag", "07.06.2026", "Utopia Stage", "Finch", "17:05", "18:15"],
  ["sun", "Sonntag", "07.06.2026", "Utopia Stage", "The Offspring", "19:00", "20:15"],
  ["sun", "Sonntag", "07.06.2026", "Utopia Stage", "Iron Maiden", "21:00", "23:20"],
  ["sun", "Sonntag", "07.06.2026", "Mandora Stage", "Return to Dust", "13:35", "14:05"],
  ["sun", "Sonntag", "07.06.2026", "Mandora Stage", "Blood Incantation", "14:25", "15:10"],
  ["sun", "Sonntag", "07.06.2026", "Mandora Stage", "Bloodywood", "15:35", "16:20"],
  ["sun", "Sonntag", "07.06.2026", "Mandora Stage", "Breaking Benjamin", "16:45", "17:40"],
  ["sun", "Sonntag", "07.06.2026", "Mandora Stage", "Social Distortion", "18:10", "19:10"],
  ["sun", "Sonntag", "07.06.2026", "Mandora Stage", "Alter Bridge", "19:40", "20:40"],
  ["sun", "Sonntag", "07.06.2026", "Mandora Stage", "A Perfect Circle", "21:20", "22:35"],
  ["sun", "Sonntag", "07.06.2026", "Mandora Stage", "Sabaton", "23:20", "01:00"],
];

const rar: Act[] = rarRows.map(([dayKey, day, date, stage, artist, start, end], index) => ({
  id: `rar-${dayKey}-${index}`,
  festivalId: "rock-am-ring-2026",
  day,
  date,
  stage,
  artist,
  start,
  end,
  source: "official-timetable",
}));

const southsideByDay: Record<string, string[]> = {
  "Donnerstag|18.06.2026": ["MOOP MAMA", "MAJAN", "MOLA", "HI! SPENCER", "BRASSPALAST"],
  "Freitag|19.06.2026": ["BILLY TALENT", "HALSEY", "PROVINZ", "EMPIRE OF THE SUN", "A DAY TO REMEMBER", "CLUESO", "BHZ", "THE BUTCHER SISTERS", "LEVIN LIAM", "LEONY", "FILOW", "RITTER LEAN", "SKINDRED", "SPRINTS", "PA69", "RØRY", "TORS", "VICKY", "DAVINA MICHELLE", "DELILAH BON", "UNPEOPLE", "JUST MUSTARD", "BLACKGOLD", "MODESELEKTOR", "BOYS NOIZE"],
  "Samstag|20.06.2026": ["KRAFTKLUB", "YUNGBLUD", "THE OFFSPRING", "ROY BIANCO & DIE ABBRUNZATI BOYS", "DONOTS", "BOSSE", "SONDASCHULE", "ROYEL OTIS", "DRUNKEN MASTERS", "PENNYWISE", "THE BEACHES", "GRANDSON", "ZEBRAHEAD", "PRESIDENT", "BETTEROV", "BASEMENT", "ESTHER GRAF", "KAYLA SHYX", "RIKAS", "ROSMARIN", "THE ATARIS", "ECCA VANDAL", "ANDA MORTS", "MILITARIE GUN", "PAULA ENGELS", "RAYNOR", "LEILA LAMB", "TUSKER", "MODESTEP (LIVE)", "ROYA", "LISKA"],
  "Sonntag|21.06.2026": ["TWENTY ONE PILOTS", "FLORENCE + THE MACHINE", "PAPA ROACH", "FINCH", "NOTHING BUT THIEVES", "WOLF ALICE", "SSIO", "ALEXISONFIRE", "ALL TIME LOW", "KAFFKIEZ", "NATASHA BEDINGFIELD", "EDWIN ROSEN", "OG KEEMO", "ORVILLE PECK", "KASI", "DESTROY BOYS", "KINGFISHR", "DREI METER FELDWEG", "SCENE QUEEN", "FLORENCE ROAD", "THE SOPHS", "YONAKA", "PICTURE PARLOUR", "DAVID PUENTEZ", "TINLICKER"],
};

const southside: Act[] = Object.entries(southsideByDay).flatMap(([key, artists]) => {
  const [day, date] = key.split("|");
  return artists.map((artist, index) => ({
    id: `southside-${date}-${index}`,
    festivalId: "southside-2026",
    day,
    date,
    stage: artist.includes("NOIZE") || artist.includes("MODESELEKTOR") || artist.includes("PUENTEZ") || artist.includes("TINLICKER") || artist.includes("MODESTEP") || artist === "ROYA" ? "Electric Wave X White Stage" : "TBA",
    artist,
    source: "official-lineup",
  }));
});

const stagetopiaArtists = [
  "Mehnersmoos",
  "Kaffkiez",
  "Pa69",
  "Deine Cousine",
  "Raum27",
  "Sampagne",
  "Lostboi Lino",
  "Kwam.E",
  "6euroneunzig",
  "Fjaak B2B Elli Acula",
  "Daria Kolosova",
  "Dirty Doering",
  "Disko Rapid",
  "Formel Trance",
  "Niconé",
  "Björn del Togno",
  "Lea Lindner",
  "LMD",
  "Bababass3000",
  "WizardLF",
  "Flo.Von",
  "Kyng Elly",
  "Raf",
  "Tony Mejeh",
  "DJ Wasserfall B2B DJ Jamba Sparabo",
];

const stagetopia: Act[] = stagetopiaArtists.map((artist) => ({
  id: `stagetopia-2026-${slugify(artist)}`,
  festivalId: "stagetopia-2026",
  day: "Samstag",
  date: "13.06.2026",
  stage: "TBA",
  artist,
  source: "official-lineup",
}));

const highfieldByDay: Record<string, { concert: string[]; electric?: string[] }> = {
  "Donnerstag|13.08.2026": {
    concert: ["DRUNKEN MASTERS", "BIERBABES", "DENNIS CONCORDE"],
    electric: ["THE IRONIX", "MIAMI LENZ", "RUTGER LIVE"],
  },
  "Freitag|14.08.2026": {
    concert: ["SDP", "BHZ", "GIANT ROOKS", "SONDASCHULE", "LEVIN LIAM", "PA69", "ITCHY", "ADAM ANGST", "HI! SPENCER", "DENNIS CONCORDE"],
    electric: ["JOSI MILLER", "CRUX PISTOLS"],
  },
  "Samstag|15.08.2026": {
    concert: ["KRAFTKLUB", "01099", "DROPKICK MURPHYS", "ZARTMANN", "QUERBEAT", "DAS LUMPENPACK", "RITTER LEAN", "RAUM27", "ZSK", "VICKY", "YUNG PEPP", "DENNIS CONCORDE"],
    electric: ["DJ SPORTSCHUH", "CLARA B2B FLAVIUS"],
  },
  "Sonntag|16.08.2026": {
    concert: ["BEATSTEAKS", "MARTERIA", "FEINE SAHNE FISCHFILET", "$OHO BANI", "DILLA", "DEINE COUSINE", "NURA", "MONTREAL", "KAFVKA", "ANAIS"],
  },
};

const highfield: Act[] = Object.entries(highfieldByDay).flatMap(([key, groups]) => {
  const [day, date] = key.split("|");
  return [
    ...groups.concert.map((artist, index) => ({
      id: `highfield-${date}-concert-${index}`,
      festivalId: "highfield-2026" as const,
      day,
      date,
      stage: "Concert",
      artist,
      source: "official-lineup" as const,
    })),
    ...(groups.electric ?? []).map((artist, index) => ({
      id: `highfield-${date}-electric-${index}`,
      festivalId: "highfield-2026" as const,
      day,
      date,
      stage: "Electric Beach",
      artist,
      source: "official-lineup" as const,
    })),
  ];
});

export const acts: Act[] = [...rar, ...southside, ...stagetopia, ...highfield];

export function getFestival(id: FestivalId) {
  return festivals.find((festival) => festival.id === id) ?? festivals[0];
}
