import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const file = path.join(dataDir, "db.json");

const adapter = new JSONFile(file);

const defaultData = {
  users: [],
  posts: [],
  messages: [],
  connections: [],
  jobs: [],
  companies: [],
  stories: [],
  reels: [],
  notifications: [],
  groups: [],
  events: [],
  skills: [],
  endorsements: [],
  recommendations: [],
  rooms: [],
  invites: [],
  meta: {
    currentUserId: null
  }
};

export const db = new Low(adapter, defaultData);

export async function initDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  await db.read();
  db.data ||= structuredClone(defaultData);
  db.data.users ||= [];
  db.data.posts ||= [];
  db.data.messages ||= [];
  db.data.connections ||= [];
  db.data.jobs ||= [];
  db.data.companies ||= [];
  db.data.stories ||= [];
  db.data.reels ||= [];
  db.data.notifications ||= [];
  db.data.groups ||= [];
  db.data.events ||= [];
  db.data.skills ||= [];
  db.data.endorsements ||= [];
  db.data.recommendations ||= [];
  db.data.rooms ||= [];
  db.data.invites ||= [];
  db.data.meta ||= { currentUserId: null };
  await db.write();
}

export async function readDb() {
  await db.read();
  db.data ||= structuredClone(defaultData);
  db.data.users ||= [];
  db.data.posts ||= [];
  db.data.messages ||= [];
  db.data.connections ||= [];
  db.data.jobs ||= [];
  db.data.companies ||= [];
  db.data.stories ||= [];
  db.data.reels ||= [];
  db.data.notifications ||= [];
  db.data.groups ||= [];
  db.data.events ||= [];
  db.data.skills ||= [];
  db.data.endorsements ||= [];
  db.data.recommendations ||= [];
  db.data.rooms ||= [];
  db.data.invites ||= [];
  db.data.meta ||= { currentUserId: null };
}
