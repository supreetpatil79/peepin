import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { nanoid } from "nanoid";
import { db, initDb, readDb } from "./db.js";
import { seedIfEmpty } from "./seed.js";

const app = express();
const port = process.env.PORT || 4000;

const corsOrigin = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim());
app.use(
  corsOrigin?.length
    ? {
        origin: corsOrigin,
        credentials: true
      }
    : {}
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
});

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

app.get("/api/me", async (req, res) => {
  await readDb();
  const currentUser = getUserById(db.data.meta.currentUserId);
  return res.json(currentUser);
});

app.post("/api/me", async (req, res) => {
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

app.get("/api/users", async (req, res) => {
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

app.get("/api/companies", async (req, res) => {
  await readDb();
  return res.json(db.data.companies);
});

app.post("/api/companies/:id/follow", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  await readDb();
  const company = db.data.companies.find((item) => item.id === id);

  if (!company) {
    return res.status(404).json({ error: "Company not found" });
  }

  company.followersBy ||= [];
  if (!company.followersBy.includes(userId)) {
    company.followersBy.push(userId);
    company.followers = (company.followers || 0) + 1;
  }

  await db.write();
  return res.json(company);
});

app.get("/api/jobs", async (req, res) => {
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

app.post("/api/jobs/:id/apply", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  await readDb();
  const job = db.data.jobs.find((item) => item.id === id);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

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

app.get("/api/stories", async (req, res) => {
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

app.get("/api/reels", async (req, res) => {
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

app.get("/api/notifications", async (req, res) => {
  await readDb();
  const { userId } = req.query;
  let notes = db.data.notifications;

  if (userId) {
    notes = notes.filter((note) => note.userId === userId);
  }

  notes = notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json(notes);
});

app.post("/api/notifications/:id/read", async (req, res) => {
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

app.get("/api/groups", async (req, res) => {
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

app.post("/api/groups", async (req, res) => {
  const { name, description, mode, creatorId } = req.body;

  if (!name || !mode || !creatorId) {
    return res
      .status(400)
      .json({ error: "name, mode, and creatorId are required" });
  }

  await readDb();

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

app.post("/api/groups/:id/join", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  await readDb();
  const group = db.data.groups.find((item) => item.id === id);

  if (!group) {
    return res.status(404).json({ error: "Group not found" });
  }

  group.members ||= [];
  if (!group.members.includes(userId)) {
    group.members.push(userId);
  }

  await db.write();
  return res.json(group);
});

app.get("/api/events", async (req, res) => {
  await readDb();
  const { mode } = req.query;
  let events = db.data.events;

  if (mode) {
    events = events.filter((event) => event.mode === mode);
  }

  return res.json(events);
});

app.post("/api/events", async (req, res) => {
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

app.get("/api/skills", async (req, res) => {
  await readDb();
  const { userId } = req.query;
  let skills = db.data.skills;

  if (userId) {
    skills = skills.filter((skill) => skill.userId === userId);
  }

  return res.json(skills);
});

app.get("/api/endorsements", async (req, res) => {
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

app.get("/api/recommendations", async (req, res) => {
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

app.post("/api/users", async (req, res) => {
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

app.get("/api/feed", async (req, res) => {
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

app.post("/api/posts", async (req, res) => {
  const { authorId, mode, content, link, image } = req.body;

  if (!authorId || !mode || !content) {
    return res
      .status(400)
      .json({ error: "authorId, mode, and content are required" });
  }

  await readDb();

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

app.post("/api/posts/:id/react", async (req, res) => {
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

app.post("/api/posts/:id/save", async (req, res) => {
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

app.post("/api/posts/:id/comment", async (req, res) => {
  const { id } = req.params;
  const { authorId, body } = req.body;

  if (!authorId || !body) {
    return res.status(400).json({ error: "authorId and body are required" });
  }

  await readDb();
  const post = db.data.posts.find((item) => item.id === id);

  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  post.commentItems ||= [];
  post.commentItems.push({
    id: `c_${nanoid(6)}`,
    authorId,
    body,
    createdAt: new Date().toISOString()
  });
  post.comments = (post.comments || 0) + 1;
  await db.write();
  return res.json(hydratePost(post));
});

app.get("/api/connections", async (req, res) => {
  await readDb();
  const { userId } = req.query;
  let connections = db.data.connections;

  if (userId) {
    connections = connections.filter((con) => con.fromId === userId);
  }

  const result = connections.map((con) => ({
    ...con,
    user: getUserById(con.toId)
  }));

  return res.json(result);
});

app.post("/api/connections", async (req, res) => {
  const { fromId, toId, status } = req.body;

  if (!fromId || !toId) {
    return res.status(400).json({ error: "fromId and toId are required" });
  }

  await readDb();

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

app.get("/api/messages", async (req, res) => {
  await readDb();
  const { userId, groupId } = req.query;
  let messages = db.data.messages;

  if (groupId) {
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

app.post("/api/messages", async (req, res) => {
  const { fromId, toId, groupId, body } = req.body;

  if (!fromId || !body || (!toId && !groupId)) {
    return res
      .status(400)
      .json({ error: "fromId, body, and toId or groupId are required" });
  }

  await readDb();

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

app.post("/api/rooms", async (req, res) => {
  const { title, mode, hostId } = req.body;

  if (!title || !mode || !hostId) {
    return res.status(400).json({ error: "title, mode, and hostId are required" });
  }

  await readDb();
  const newRoom = {
    id: `room_${nanoid(6)}`,
    title,
    mode,
    hostId,
    createdAt: new Date().toISOString()
  };

  db.data.rooms.push(newRoom);
  await db.write();

  return res.status(201).json(newRoom);
});

app.post("/api/invites", async (req, res) => {
  const { fromId, target } = req.body;

  if (!fromId || !target) {
    return res.status(400).json({ error: "fromId and target are required" });
  }

  await readDb();
  const invite = {
    id: `invite_${nanoid(6)}`,
    fromId,
    target,
    code: nanoid(8),
    createdAt: new Date().toISOString()
  };

  db.data.invites.push(invite);
  await db.write();

  return res.status(201).json(invite);
});

app.get("/api/stats", async (req, res) => {
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
