import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { nanoid } from "nanoid";
import { db, initDb, readDb } from "./db.js";
import { seedIfEmpty } from "./seed.js";

const app = express();
const port = process.env.PORT || 4000;

const corsOrigin = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim());
app.use(
  cors(
    corsOrigin?.length
      ? {
          origin: corsOrigin,
          credentials: true
        }
      : {}
  )
);
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(express.json({ limit: "1mb" }));

await initDb();
await seedIfEmpty();
await readDb();

let patched = false;

const baseLat = 47.6062;
const baseLng = -122.3321;

db.data.users.forEach((user, index) => {
  if (user.lat == null || user.lng == null) {
    user.lat = baseLat + (index % 3) * 0.003 + index * 0.0006;
    user.lng = baseLng - (index % 2) * 0.002 - index * 0.0004;
    patched = true;
  }

  if (user.shareLocation == null) {
    user.shareLocation = true;
    patched = true;
  }
});

if (db.data.accounts.length === 0 && db.data.users.length > 0) {
  const passwordHash = bcrypt.hashSync("peepin123", 10);
  db.data.accounts = db.data.users.map((user) => ({
    id: `acct_${nanoid(6)}`,
    userId: user.id,
    email: `${user.handle.replace(/\./g, "")}@peepin.com`,
    passwordHash
  }));
  patched = true;
}

db.data.posts.forEach((post) => {
  if (!post.commentItems) {
    post.commentItems = [];
    patched = true;
  }
});

if (db.data.groups.length > 0 && !db.data.messages.some((msg) => msg.groupId)) {
  const group = db.data.groups[0];
  const firstMember = group.members?.[0] || db.data.users[0]?.id;
  const secondMember = group.members?.[1] || db.data.users[1]?.id;

  if (firstMember && secondMember) {
    db.data.messages.push(
      {
        id: `msg_${nanoid(6)}`,
        fromId: firstMember,
        groupId: group.id,
        body: "Welcome everyone. Dropping the first update here.",
        createdAt: new Date().toISOString()
      },
      {
        id: `msg_${nanoid(6)}`,
        fromId: secondMember,
        groupId: group.id,
        body: "Thanks for hosting. Excited to share updates.",
        createdAt: new Date().toISOString()
      }
    );
    patched = true;
  }
}

if (patched) {
  await db.write();
}

const getUserById = (id) => db.data.users.find((user) => user.id === id);
const hydratePost = (post) => ({
  ...post,
  commentItems: (post.commentItems || []).map((comment) => ({
    ...comment,
    author: getUserById(comment.authorId)
  })),
  author: getUserById(post.authorId)
});

const getAccountByEmail = (email) =>
  db.data.accounts.find((account) => account.email === email);

const jwtSecret = process.env.JWT_SECRET || "dev-secret";
const signToken = (userId) =>
  jwt.sign({ sub: userId }, jwtSecret, { expiresIn: "7d" });

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.userId = payload.sub;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const toRadians = (value) => (value * Math.PI) / 180;
const distanceInMeters = (a, b) => {
  if (!a || !b) return null;
  const R = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
};

app.get("/api/health", async (req, res) => {
  return res.json({ ok: true });
});

app.get("/api/modes", async (req, res) => {
  return res.json([
    { id: "pro", label: "Pro" },
    { id: "social", label: "Social" },
    { id: "private", label: "Private" }
  ]);
});

app.post("/api/auth/register", async (req, res) => {
  const { name, handle, email, password, mode } = req.body;

  if (!name || !handle || !email || !password) {
    return res
      .status(400)
      .json({ error: "name, handle, email, and password are required" });
  }

  await readDb();

  if (getAccountByEmail(email)) {
    return res.status(409).json({ error: "Email already in use" });
  }

  if (db.data.users.some((user) => user.handle === handle)) {
    return res.status(409).json({ error: "Handle already in use" });
  }

  const userId = `user_${nanoid(6)}`;
  const newUser = {
    id: userId,
    name,
    handle,
    title: "",
    bio: "",
    mode: mode || "pro",
    avatar: "https://i.pravatar.cc/150?img=16",
    location: "",
    lat: null,
    lng: null,
    shareLocation: false
  };

  const newAccount = {
    id: `acct_${nanoid(6)}`,
    userId,
    email,
    passwordHash: bcrypt.hashSync(password, 10)
  };

  db.data.users.push(newUser);
  db.data.accounts.push(newAccount);
  await db.write();

  const token = signToken(userId);
  return res.status(201).json({ token, user: newUser });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  await readDb();
  const account = getAccountByEmail(email);

  if (!account || !bcrypt.compareSync(password, account.passwordHash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = getUserById(account.userId);
  const token = signToken(account.userId);
  return res.json({ token, user });
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  await readDb();
  const user = getUserById(req.userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json(user);
});

app.get("/api/me", authMiddleware, async (req, res) => {
  await readDb();
  const currentUser = getUserById(db.data.meta.currentUserId);
  return res.json(currentUser);
});

app.post("/api/me", authMiddleware, async (req, res) => {
  const { userId } = req.body;
  await readDb();
  const user = getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  db.data.meta.currentUserId = userId;
  await db.write();
  return res.json(user);
});

app.get("/api/users", authMiddleware, async (req, res) => {
  await readDb();
  const { mode, q } = req.query;
  let users = db.data.users;

  if (mode) {
    users = users.filter((user) => user.mode === mode);
  }

  if (q) {
    const query = q.toLowerCase();
    users = users.filter((user) =>
      [user.name, user.handle, user.title, user.bio].some((field) =>
        field?.toLowerCase().includes(query)
      )
    );
  }

  return res.json(users);
});

app.get("/api/companies", authMiddleware, async (req, res) => {
  await readDb();
  return res.json(db.data.companies);
});

app.post("/api/companies/:id/follow", authMiddleware, async (req, res) => {
  const { id } = req.params;

  await readDb();
  const company = db.data.companies.find((item) => item.id === id);

  if (!company) {
    return res.status(404).json({ error: "Company not found" });
  }

  const userId = req.userId;
  company.followersBy ||= [];
  if (!company.followersBy.includes(userId)) {
    company.followersBy.push(userId);
    company.followers = (company.followers || 0) + 1;
  }

  await db.write();
  return res.json(company);
});

app.get("/api/jobs", authMiddleware, async (req, res) => {
  await readDb();
  const { companyId, q } = req.query;
  let jobs = db.data.jobs;

  if (companyId) {
    jobs = jobs.filter((job) => job.companyId === companyId);
  }

  if (q) {
    const query = q.toLowerCase();
    jobs = jobs.filter((job) =>
      [job.title, job.location, job.description].some((field) =>
        field?.toLowerCase().includes(query)
      )
    );
  }

  jobs = jobs.map((job) => ({
    ...job,
    company: db.data.companies.find((company) => company.id === job.companyId)
  }));

  return res.json(jobs);
});

app.post("/api/jobs/:id/apply", authMiddleware, async (req, res) => {
  const { id } = req.params;

  await readDb();
  const job = db.data.jobs.find((item) => item.id === id);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  const userId = req.userId;
  job.appliedBy ||= [];
  if (!job.appliedBy.includes(userId)) {
    job.appliedBy.push(userId);
  }

  await db.write();
  return res.json({
    ...job,
    applied: true,
    company: db.data.companies.find((company) => company.id === job.companyId)
  });
});

app.get("/api/stories", authMiddleware, async (req, res) => {
  await readDb();
  const { mode } = req.query;
  let stories = db.data.stories;

  if (mode) {
    stories = stories.filter((story) => story.mode === mode);
  }

  stories = stories.map((story) => ({
    ...story,
    author: getUserById(story.authorId)
  }));

  return res.json(stories);
});

app.get("/api/reels", authMiddleware, async (req, res) => {
  await readDb();
  const { mode } = req.query;
  let reels = db.data.reels;

  if (mode) {
    reels = reels.filter((reel) => reel.mode === mode);
  }

  reels = reels.map((reel) => ({
    ...reel,
    author: getUserById(reel.authorId)
  }));

  return res.json(reels);
});

app.get("/api/notifications", authMiddleware, async (req, res) => {
  await readDb();
  const userId = req.userId;
  let notes = db.data.notifications;

  notes = notes.filter((note) => note.userId === userId);

  notes = notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json(notes);
});

app.post("/api/notifications/:id/read", authMiddleware, async (req, res) => {
  const { id } = req.params;
  await readDb();
  const note = db.data.notifications.find((item) => item.id === id);

  if (!note) {
    return res.status(404).json({ error: "Notification not found" });
  }

  note.read = true;
  await db.write();
  return res.json(note);
});

app.get("/api/groups", authMiddleware, async (req, res) => {
  await readDb();
  const { mode, userId } = req.query;
  let groups = db.data.groups;

  if (mode) {
    groups = groups.filter((group) => group.mode === mode);
  }

  if (userId) {
    groups = groups.filter((group) => group.members?.includes(userId));
  }

  groups = groups.map((group) => ({
    ...group,
    memberProfiles: group.members?.map((id) => getUserById(id))
  }));

  return res.json(groups);
});

app.post("/api/groups", authMiddleware, async (req, res) => {
  const { name, description, mode } = req.body;

  if (!name || !mode) {
    return res
      .status(400)
      .json({ error: "name and mode are required" });
  }

  await readDb();
  const creatorId = req.userId;

  const newGroup = {
    id: `group_${nanoid(6)}`,
    name,
    description: description || "",
    mode,
    members: [creatorId],
    avatar:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=200&auto=format&fit=crop"
  };

  db.data.groups.push(newGroup);
  await db.write();

  return res.status(201).json(newGroup);
});

app.post("/api/groups/:id/join", authMiddleware, async (req, res) => {
  const { id } = req.params;

  await readDb();
  const group = db.data.groups.find((item) => item.id === id);

  if (!group) {
    return res.status(404).json({ error: "Group not found" });
  }

  const userId = req.userId;
  group.members ||= [];
  if (!group.members.includes(userId)) {
    group.members.push(userId);
  }

  await db.write();
  return res.json(group);
});

app.get("/api/events", authMiddleware, async (req, res) => {
  await readDb();
  const { mode } = req.query;
  let events = db.data.events;

  if (mode) {
    events = events.filter((event) => event.mode === mode);
  }

  return res.json(events);
});

app.post("/api/events", authMiddleware, async (req, res) => {
  const { title, detail, mode } = req.body;

  if (!title || !detail || !mode) {
    return res.status(400).json({ error: "title, detail, and mode are required" });
  }

  await readDb();
  const newEvent = {
    id: `event_${nanoid(6)}`,
    title,
    detail,
    mode
  };

  db.data.events.push(newEvent);
  await db.write();

  return res.status(201).json(newEvent);
});

app.get("/api/skills", authMiddleware, async (req, res) => {
  await readDb();
  const { userId } = req.query;
  let skills = db.data.skills;

  if (userId) {
    skills = skills.filter((skill) => skill.userId === userId);
  }

  return res.json(skills);
});

app.get("/api/endorsements", authMiddleware, async (req, res) => {
  await readDb();
  const { userId } = req.query;
  let endorsements = db.data.endorsements;

  if (userId) {
    endorsements = endorsements.filter((endorse) => endorse.toId === userId);
  }

  endorsements = endorsements.map((endorse) => ({
    ...endorse,
    from: getUserById(endorse.fromId)
  }));

  return res.json(endorsements);
});

app.get("/api/recommendations", authMiddleware, async (req, res) => {
  await readDb();
  const { userId } = req.query;
  let recommendations = db.data.recommendations;

  if (userId) {
    recommendations = recommendations.filter((rec) => rec.toId === userId);
  }

  recommendations = recommendations.map((rec) => ({
    ...rec,
    from: getUserById(rec.fromId)
  }));

  return res.json(recommendations);
});

app.post("/api/users", authMiddleware, async (req, res) => {
  const { name, handle, title, bio, mode, avatar, location } = req.body;

  if (!name || !handle || !mode) {
    return res.status(400).json({ error: "name, handle, and mode are required" });
  }

  await readDb();

  const newUser = {
    id: `user_${nanoid(6)}`,
    name,
    handle,
    title: title || "",
    bio: bio || "",
    mode,
    avatar: avatar || "https://i.pravatar.cc/150?img=16",
    location: location || ""
  };

  db.data.users.push(newUser);
  await db.write();

  return res.status(201).json(newUser);
});

app.get("/api/feed", authMiddleware, async (req, res) => {
  await readDb();
  const { mode } = req.query;

  let posts = db.data.posts;

  if (mode) {
    posts = posts.filter((post) => post.mode === mode);
  }

  posts = posts
    .map((post) => hydratePost(post))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json(posts);
});

app.post("/api/posts", authMiddleware, async (req, res) => {
  const { mode, content, link, image } = req.body;

  if (!mode || !content) {
    return res.status(400).json({ error: "mode and content are required" });
  }

  await readDb();
  const authorId = req.userId;

  const newPost = {
    id: `post_${nanoid(6)}`,
    authorId,
    mode,
    content,
    link: link || "",
    image: image || "",
    createdAt: new Date().toISOString(),
    reactions: 0,
    comments: 0,
    saves: 0,
    commentItems: []
  };

  db.data.posts.push(newPost);
  await db.write();

  return res.status(201).json(hydratePost(newPost));
});

app.post("/api/posts/:id/react", authMiddleware, async (req, res) => {
  const { id } = req.params;
  await readDb();
  const post = db.data.posts.find((item) => item.id === id);

  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  post.reactions = (post.reactions || 0) + 1;
  await db.write();
  return res.json(hydratePost(post));
});

app.post("/api/posts/:id/save", authMiddleware, async (req, res) => {
  const { id } = req.params;
  await readDb();
  const post = db.data.posts.find((item) => item.id === id);

  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  post.saves = (post.saves || 0) + 1;
  await db.write();
  return res.json(hydratePost(post));
});

app.post("/api/posts/:id/comment", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { body } = req.body;

  if (!body) {
    return res.status(400).json({ error: "body is required" });
  }

  await readDb();
  const post = db.data.posts.find((item) => item.id === id);

  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  post.commentItems ||= [];
  post.commentItems.push({
    id: `c_${nanoid(6)}`,
    authorId: req.userId,
    body,
    createdAt: new Date().toISOString()
  });
  post.comments = (post.comments || 0) + 1;
  await db.write();
  return res.json(hydratePost(post));
});

app.get("/api/connections", authMiddleware, async (req, res) => {
  await readDb();
  const userId = req.userId;
  let connections = db.data.connections;

  connections = connections.filter((con) => con.fromId === userId);

  const result = connections.map((con) => ({
    ...con,
    user: getUserById(con.toId)
  }));

  return res.json(result);
});

app.post("/api/connections", authMiddleware, async (req, res) => {
  const { toId, status } = req.body;

  if (!toId) {
    return res.status(400).json({ error: "toId is required" });
  }

  await readDb();
  const fromId = req.userId;

  const existing = db.data.connections.find(
    (con) => con.fromId === fromId && con.toId === toId
  );

  if (existing) {
    return res.json(existing);
  }

  const newConnection = {
    id: `con_${nanoid(6)}`,
    fromId,
    toId,
    status: status || "connected"
  };

  db.data.connections.push(newConnection);
  await db.write();

  return res.status(201).json(newConnection);
});

app.get("/api/messages", authMiddleware, async (req, res) => {
  await readDb();
  const { groupId } = req.query;
  const userId = req.userId;
  let messages = db.data.messages;

  if (groupId) {
    const group = db.data.groups.find((item) => item.id === groupId);
    if (!group || !group.members?.includes(userId)) {
      return res.status(403).json({ error: "Not a member of this group" });
    }
    messages = messages.filter((msg) => msg.groupId === groupId);
  } else if (userId) {
    const memberGroupIds = db.data.groups
      .filter((group) => group.members?.includes(userId))
      .map((group) => group.id);

    messages = messages.filter(
      (msg) =>
        msg.fromId === userId ||
        msg.toId === userId ||
        (msg.groupId && memberGroupIds.includes(msg.groupId))
    );
  }

  messages = messages
    .map((msg) => ({
      ...msg,
      from: getUserById(msg.fromId),
      to: msg.toId ? getUserById(msg.toId) : null,
      group: msg.groupId
        ? db.data.groups.find((group) => group.id === msg.groupId)
        : null
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json(messages);
});

app.post("/api/messages", authMiddleware, async (req, res) => {
  const { toId, groupId, body } = req.body;

  if (!body || (!toId && !groupId)) {
    return res
      .status(400)
      .json({ error: "body and toId or groupId are required" });
  }

  await readDb();
  const fromId = req.userId;

  if (groupId) {
    const group = db.data.groups.find((item) => item.id === groupId);
    if (!group || !group.members?.includes(fromId)) {
      return res.status(403).json({ error: "Not a member of this group" });
    }
  }

  const newMessage = {
    id: `msg_${nanoid(6)}`,
    fromId,
    toId: toId || null,
    groupId: groupId || null,
    body,
    createdAt: new Date().toISOString()
  };

  db.data.messages.push(newMessage);
  await db.write();

  return res.status(201).json({
    ...newMessage,
    from: getUserById(fromId),
    to: toId ? getUserById(toId) : null,
    group: groupId
      ? db.data.groups.find((group) => group.id === groupId)
      : null
  });
});

app.post("/api/location", authMiddleware, async (req, res) => {
  const { lat, lng, accuracy, precision, share } = req.body;

  await readDb();
  const user = getUserById(req.userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (share === false) {
    user.shareLocation = false;
    db.data.locations = db.data.locations.filter((loc) => loc.userId !== req.userId);
    await db.write();
    return res.json({ ok: true, disabled: true });
  }

  if (lat == null || lng == null) {
    return res.status(400).json({ error: "lat and lng are required" });
  }

  if (typeof share === "boolean") {
    user.shareLocation = share;
  } else {
    user.shareLocation = true;
  }

  const updatedAt = new Date().toISOString();
  const existing = db.data.locations.find((loc) => loc.userId === req.userId);

  if (existing) {
    existing.lat = Number(lat);
    existing.lng = Number(lng);
    existing.accuracy = accuracy ?? null;
    existing.precision = Boolean(precision);
    existing.updatedAt = updatedAt;
  } else {
    db.data.locations.push({
      userId: req.userId,
      lat: Number(lat),
      lng: Number(lng),
      accuracy: accuracy ?? null,
      precision: Boolean(precision),
      updatedAt
    });
  }

  await db.write();
  return res.json({ ok: true, updatedAt });
});

app.get("/api/nearby", authMiddleware, async (req, res) => {
  await readDb();
  const userId = req.userId;
  const radius = Number(req.query.radius) || 2000;
  const now = Date.now();

  db.data.locations = db.data.locations.filter(
    (loc) => now - new Date(loc.updatedAt).getTime() < 10 * 60 * 1000
  );

  const baseLat = req.query.lat ? Number(req.query.lat) : null;
  const baseLng = req.query.lng ? Number(req.query.lng) : null;
  const base =
    baseLat != null && baseLng != null
      ? { lat: baseLat, lng: baseLng }
      : db.data.locations.find((loc) => loc.userId === userId);

  if (!base) {
    return res.status(400).json({ error: "Location unavailable" });
  }

  const results = db.data.locations
    .filter((loc) => loc.userId !== userId)
    .map((loc) => {
      const user = getUserById(loc.userId);
      if (!user || !user.shareLocation) return null;

      const distance = distanceInMeters(base, { lat: loc.lat, lng: loc.lng });
      if (distance == null) return null;

      const lastSeen = new Date(loc.updatedAt).getTime();
      const isRecent = now - lastSeen < 60 * 1000;
      const status = distance <= radius ? "nearby" : isRecent ? "recent" : null;

      if (!status) return null;

      return {
        user,
        distance,
        status,
        lastSeen: loc.updatedAt
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.status === b.status) {
        return a.distance - b.distance;
      }
      return a.status === "nearby" ? -1 : 1;
    });

  await db.write();
  return res.json(results);
});

app.post("/api/rooms", authMiddleware, async (req, res) => {
  const { title, mode } = req.body;

  if (!title || !mode) {
    return res.status(400).json({ error: "title and mode are required" });
  }

  await readDb();
  const newRoom = {
    id: `room_${nanoid(6)}`,
    title,
    mode,
    hostId: req.userId,
    createdAt: new Date().toISOString()
  };

  db.data.rooms.push(newRoom);
  await db.write();

  return res.status(201).json(newRoom);
});

app.post("/api/invites", authMiddleware, async (req, res) => {
  const { target } = req.body;

  if (!target) {
    return res.status(400).json({ error: "target is required" });
  }

  await readDb();
  const invite = {
    id: `invite_${nanoid(6)}`,
    fromId: req.userId,
    target,
    code: nanoid(8),
    createdAt: new Date().toISOString()
  };

  db.data.invites.push(invite);
  await db.write();

  return res.status(201).json(invite);
});

app.get("/api/stats", authMiddleware, async (req, res) => {
  await readDb();
  return res.json({
    users: db.data.users.length,
    posts: db.data.posts.length,
    connections: db.data.connections.length,
    messages: db.data.messages.length,
    jobs: db.data.jobs.length,
    stories: db.data.stories.length,
    reels: db.data.reels.length,
    groups: db.data.groups.length
  });
});

app.listen(port, () => {
  console.log(`Peepin API running on http://localhost:${port}`);
});
