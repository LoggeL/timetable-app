import fs from "node:fs/promises";
import path from "node:path";

export type VoteState = Record<string, string[]>;

const dataDir = path.join(process.cwd(), "data");
const votesPath = path.join(dataDir, "votes.json");

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(votesPath);
  } catch {
    await fs.writeFile(votesPath, JSON.stringify({}, null, 2));
  }
}

export async function readVotes(): Promise<VoteState> {
  await ensureStore();
  const raw = await fs.readFile(votesPath, "utf8");
  return JSON.parse(raw) as VoteState;
}

export async function toggleVote(actId: string, name: string): Promise<VoteState> {
  const cleanName = name.trim().slice(0, 40);
  if (!cleanName) return readVotes();

  const votes = await readVotes();
  const current = new Set(votes[actId] ?? []);
  if (current.has(cleanName)) {
    current.delete(cleanName);
  } else {
    current.add(cleanName);
  }
  votes[actId] = Array.from(current).sort((a, b) => a.localeCompare(b, "de"));
  await fs.writeFile(votesPath, JSON.stringify(votes, null, 2));
  return votes;
}
