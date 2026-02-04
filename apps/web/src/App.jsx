import React, { useEffect, useMemo, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const CURRENT_USER_ID = "user_1";

const themes = {
  pro: {
    label: "Pro",
    description: "Thoughtful networking, real-world momentum.",
    accent: "#1b7f79",
    accentStrong: "#0f4c5c",
    surface: "#fef6e4",
    surfaceAlt: "#f1e7d0",
    text: "#1e1a16",
    muted: "#6b5f55",
    glow: "#c8f2d0",
    hero: "linear-gradient(135deg, #d6f5e3 0%, #fef6e4 55%, #ffe2c6 100%)"
  },
  social: {
    label: "Social",
    description: "Vibrant sharing, bold expression.",
    accent: "#ff6b35",
    accentStrong: "#c44536",
    surface: "#fff1e6",
    surfaceAlt: "#ffe3cf",
    text: "#22110a",
    muted: "#7b4b3a",
    glow: "#ffd6a5",
    hero: "linear-gradient(135deg, #ffe8d1 0%, #ffd6a5 50%, #ffb5a7 100%)"
  },
  private: {
    label: "Private",
    description: "Close friends, quieter energy.",
    accent: "#3a5a40",
    accentStrong: "#1b4332",
    surface: "#f1f5ee",
    surfaceAlt: "#dde5d7",
    text: "#1c241f",
    muted: "#4a5a52",
    glow: "#b7d3b0",
    hero: "linear-gradient(135deg, #e9f5db 0%, #cfe1b9 50%, #b5c99a 100%)"
  }
};

const navItems = [
  { id: "home", label: "Home" },
  { id: "explore", label: "Explore" },
  { id: "nearby", label: "NearMe" },
  { id: "jobs", label: "Jobs" },
  { id: "messages", label: "Messages" },
  { id: "profile", label: "Profile" },
  { id: "notifications", label: "Notifications" }
];

const demoLocations = [
  { label: "Downtown", lat: 47.6062, lng: -122.3321 },
  { label: "Capitol Hill", lat: 47.6231, lng: -122.3206 },
  { label: "Airport", lat: 47.4489, lng: -122.3094 }
];

const modePrompts = {
  pro: "Share a launch, a lesson, or a role you are hiring for",
  social: "Drop a moment, a photo, or a vibe update",
  private: "Send a note to your inner circle"
};

const tagsByMode = {
  pro: ["Open Roles", "Hiring", "Product", "Design Systems", "Founders"],
  social: ["Studio", "Shoots", "Weekend", "Food", "Color"],
  private: ["Plans", "Favorites", "Small Wins", "Weekly", "Close Friends"]
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

const formatLastSeen = (timestamp) => {
  const diff = Date.now() - timestamp;
  if (diff < 60000) {
    const seconds = Math.max(1, Math.floor(diff / 1000));
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(diff / 60000);
  return `${minutes}m ago`;
};

const buildShareLink = (path = "") => {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${path}`;
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

const hashCode = (value) =>
  value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

const getRadarPosition = (id, distance, maxDistance, radius) => {
  const angle = (hashCode(id) % 360) * (Math.PI / 180);
  const clamped = Math.min(distance / maxDistance, 1);
  const r = clamped * radius;
  return {
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r
  };
};

export default function App() {
  const [mode, setMode] = useState("pro");
  const [view, setView] = useState("home");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feed, setFeed] = useState([]);
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [messages, setMessages] = useState([]);
  const [stories, setStories] = useState([]);
  const [reels, setReels] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [groups, setGroups] = useState([]);
  const [events, setEvents] = useState([]);
  const [skills, setSkills] = useState([]);
  const [endorsements, setEndorsements] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [stats, setStats] = useState(null);
  const [composer, setComposer] = useState({ content: "", link: "", image: "" });
  const [messageDraft, setMessageDraft] = useState("");
  const [activeThread, setActiveThread] = useState(null);
  const [commentPostId, setCommentPostId] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [modal, setModal] = useState(null);
  const [modalForm, setModalForm] = useState({});
  const [toast, setToast] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [useDemoLocation, setUseDemoLocation] = useState(true);
  const [precision, setPrecision] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [demoIndex, setDemoIndex] = useState(0);
  const [nearbyProfiles, setNearbyProfiles] = useState([]);
  const [tick, setTick] = useState(0);
  const proximityRef = useRef(new Map());
  const composerRef = useRef(null);
  const toastTimer = useRef(null);

  const theme = themes[mode];

  const themeStyle = useMemo(
    () => ({
      "--accent": theme.accent,
      "--accent-strong": theme.accentStrong,
      "--surface": theme.surface,
      "--surface-alt": theme.surfaceAlt,
      "--text": theme.text,
      "--muted": theme.muted,
      "--glow": theme.glow,
      "--hero": theme.hero
    }),
    [theme]
  );

  const showToast = (message) => {
    setToast(message);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  const openModal = (type) => {
    setModal(type);
    if (type === "invite") {
      setModalForm({ target: "" });
    } else if (type === "group") {
      setModalForm({ name: "", description: "", mode });
    } else if (type === "event") {
      setModalForm({ title: "", detail: "", mode });
    } else if (type === "room") {
      setModalForm({ title: "", mode });
    }
  };

  const closeModal = () => {
    setModal(null);
    setModalForm({});
  };

  const goToComposer = () => {
    setView("home");
    setTimeout(() => composerRef.current?.focus(), 200);
  };

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!locationEnabled) return;

    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported in this browser.");
      return;
    }

    setLocationError("");

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
      },
      (err) => {
        setLocationError(err.message || "Location access denied.");
      },
      {
        enableHighAccuracy: precision,
        maximumAge: 10000,
        timeout: 10000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [locationEnabled, precision]);

  const demoLocation = demoLocations[demoIndex];

  const baseLocation = useMemo(() => {
    if (useDemoLocation || !location) return demoLocation;
    return location;
  }, [useDemoLocation, location, demoLocation]);

  const effectiveLocation = useMemo(() => {
    if (!baseLocation) return null;
    if (precision) return baseLocation;

    const jitter = useDemoLocation ? 0.004 : 0.002;
    return {
      ...baseLocation,
      lat: baseLocation.lat + (Math.random() - 0.5) * jitter,
      lng: baseLocation.lng + (Math.random() - 0.5) * jitter
    };
  }, [baseLocation, precision, useDemoLocation, tick]);

  const visibilityRadius = precision ? 2000 : 4500;

  useEffect(() => {
    if (!effectiveLocation || users.length === 0) {
      setNearbyProfiles([]);
      return;
    }

    const now = Date.now();
    const nextMap = new Map(proximityRef.current);
    const validIds = new Set();

    users.forEach((user) => {
      if (user.id === CURRENT_USER_ID || user.lat == null || user.lng == null) return;
      validIds.add(user.id);

      const distance = distanceInMeters(effectiveLocation, {
        lat: user.lat,
        lng: user.lng
      });

      if (distance == null) return;

      const within = distance <= visibilityRadius;
      const existing = nextMap.get(user.id);

      if (within) {
        nextMap.set(user.id, {
          user,
          distance,
          lastSeen: now,
          status: "nearby"
        });
      } else if (existing && now - existing.lastSeen < 60000) {
        nextMap.set(user.id, {
          ...existing,
          distance,
          status: "recent"
        });
      } else {
        nextMap.delete(user.id);
      }
    });

    Array.from(nextMap.keys()).forEach((id) => {
      if (!validIds.has(id)) {
        nextMap.delete(id);
      }
    });

    proximityRef.current = nextMap;
    const sorted = Array.from(nextMap.values()).sort((a, b) => {
      if (a.status === b.status) {
        return a.distance - b.distance;
      }
      return a.status === "nearby" ? -1 : 1;
    });

    setNearbyProfiles(sorted);
  }, [users, effectiveLocation, visibilityRadius, tick]);

  const nearbyCount = useMemo(
    () => nearbyProfiles.filter((profile) => profile.status === "nearby").length,
    [nearbyProfiles]
  );

  const locationStatus = useMemo(() => {
    if (locationError) return locationError;
    if (useDemoLocation) return `Demo: ${demoLocation.label}`;
    if (!locationEnabled) return "Location off";
    if (location?.accuracy) return `Accuracy ~${Math.round(location.accuracy)}m`;
    return "Locating...";
  }, [locationError, useDemoLocation, demoLocation, locationEnabled, location]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [
          feedRes,
          meRes,
          usersRes,
          connectionsRes,
          messagesRes,
          statsRes,
          storiesRes,
          reelsRes,
          jobsRes,
          companiesRes,
          notificationsRes,
          groupsRes,
          eventsRes,
          skillsRes,
          endorsementsRes,
          recommendationsRes
        ] = await Promise.all([
          fetch(`${API_URL}/api/feed?mode=${mode}`),
          fetch(`${API_URL}/api/me`),
          fetch(`${API_URL}/api/users?mode=${mode}`),
          fetch(`${API_URL}/api/connections?userId=${CURRENT_USER_ID}`),
          fetch(`${API_URL}/api/messages?userId=${CURRENT_USER_ID}`),
          fetch(`${API_URL}/api/stats`),
          fetch(`${API_URL}/api/stories?mode=${mode}`),
          fetch(`${API_URL}/api/reels?mode=${mode}`),
          fetch(`${API_URL}/api/jobs`),
          fetch(`${API_URL}/api/companies`),
          fetch(`${API_URL}/api/notifications?userId=${CURRENT_USER_ID}`),
          fetch(`${API_URL}/api/groups?mode=${mode}`),
          fetch(`${API_URL}/api/events?mode=${mode}`),
          fetch(`${API_URL}/api/skills?userId=${CURRENT_USER_ID}`),
          fetch(`${API_URL}/api/endorsements?userId=${CURRENT_USER_ID}`),
          fetch(`${API_URL}/api/recommendations?userId=${CURRENT_USER_ID}`)
        ]);

        if (!active) return;

        const [
          feedData,
          meData,
          usersData,
          connectionsData,
          messagesData,
          statsData,
          storiesData,
          reelsData,
          jobsData,
          companiesData,
          notificationsData,
          groupsData,
          eventsData,
          skillsData,
          endorsementsData,
          recommendationsData
        ] = await Promise.all([
          feedRes.json(),
          meRes.json(),
          usersRes.json(),
          connectionsRes.json(),
          messagesRes.json(),
          statsRes.json(),
          storiesRes.json(),
          reelsRes.json(),
          jobsRes.json(),
          companiesRes.json(),
          notificationsRes.json(),
          groupsRes.json(),
          eventsRes.json(),
          skillsRes.json(),
          endorsementsRes.json(),
          recommendationsRes.json()
        ]);

        setFeed(feedData);
        setMe(meData);
        setUsers(usersData);
        setConnections(connectionsData);
        setMessages(messagesData);
        setStats(statsData);
        setStories(storiesData);
        setReels(reelsData);
        setJobs(jobsData);
        setCompanies(companiesData);
        setNotifications(notificationsData);
        setGroups(groupsData);
        setEvents(eventsData);
        setSkills(skillsData);
        setEndorsements(endorsementsData);
        setRecommendations(recommendationsData);
      } catch (err) {
        if (active) {
          setError("Could not load the experience. Make sure the API is running.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [mode]);

  const connectedIds = useMemo(
    () => new Set(connections.map((con) => con.toId)),
    [connections]
  );

  const suggestions = useMemo(
    () =>
      users.filter((user) => user.id !== CURRENT_USER_ID && !connectedIds.has(user.id)),
    [users, connectedIds]
  );

  const endorsementCounts = useMemo(() => {
    const counts = {};
    endorsements.forEach((endorse) => {
      counts[endorse.skill] = (counts[endorse.skill] || 0) + 1;
    });
    return counts;
  }, [endorsements]);

  const directThreads = useMemo(() => {
    const map = new Map();

    messages
      .filter((msg) => !msg.groupId)
      .forEach((msg) => {
        const otherId = msg.fromId === CURRENT_USER_ID ? msg.toId : msg.fromId;
        const otherUser = msg.fromId === CURRENT_USER_ID ? msg.to : msg.from;
        if (!otherId || !otherUser) return;

        const existing = map.get(otherId);
        if (!existing || new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)) {
          map.set(otherId, {
            id: otherId,
            type: "direct",
            title: otherUser.name,
            avatar: otherUser.avatar,
            subtitle: otherUser.title,
            lastMessage: msg
          });
        }
      });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );
  }, [messages]);

  const groupThreads = useMemo(() => {
    return groups.map((group) => {
      const lastMessage = messages
        .filter((msg) => msg.groupId === group.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      return {
        id: group.id,
        type: "group",
        title: group.name,
        avatar: group.avatar,
        subtitle: group.description,
        lastMessage
      };
    });
  }, [groups, messages]);

  const threadMessages = useMemo(() => {
    if (!activeThread) return [];

    if (activeThread.type === "group") {
      return messages
        .filter((msg) => msg.groupId === activeThread.id)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    return messages
      .filter(
        (msg) =>
          !msg.groupId &&
          ((msg.fromId === CURRENT_USER_ID && msg.toId === activeThread.id) ||
            (msg.toId === CURRENT_USER_ID && msg.fromId === activeThread.id))
      )
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [activeThread, messages]);

  useEffect(() => {
    if (!activeThread) {
      if (directThreads.length > 0) {
        setActiveThread(directThreads[0]);
      } else if (groupThreads.length > 0) {
        setActiveThread(groupThreads[0]);
      }
    }
  }, [activeThread, directThreads, groupThreads]);

  const updatePostInFeed = (updatedPost) => {
    setFeed((prev) => prev.map((post) => (post.id === updatedPost.id ? updatedPost : post)));
  };

  const handlePost = async () => {
    if (!composer.content.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: CURRENT_USER_ID,
          mode,
          content: composer.content,
          link: composer.link,
          image: composer.image
        })
      });

      const newPost = await res.json();
      setFeed((prev) => [newPost, ...prev]);
      setComposer({ content: "", link: "", image: "" });
      showToast("Post shared");
    } catch (err) {
      setError("Posting failed. Try again.");
    }
  };

  const handleConnect = async (targetId) => {
    try {
      const res = await fetch(`${API_URL}/api/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId: CURRENT_USER_ID, toId: targetId })
      });

      const newConnection = await res.json();
      setConnections((prev) => [newConnection, ...prev]);
      showToast("Connection sent");
    } catch (err) {
      setError("Could not connect right now.");
    }
  };

  const handleSendMessage = async () => {
    if (!messageDraft.trim() || !activeThread) return;

    try {
      const payload = {
        fromId: CURRENT_USER_ID,
        body: messageDraft
      };

      if (activeThread.type === "group") {
        payload.groupId = activeThread.id;
      } else {
        payload.toId = activeThread.id;
      }

      const res = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const newMessage = await res.json();
      setMessages((prev) => [newMessage, ...prev]);
      setMessageDraft("");
    } catch (err) {
      setError("Message failed to send.");
    }
  };

  const handleReaction = async (postId) => {
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/react`, {
        method: "POST"
      });
      const updated = await res.json();
      updatePostInFeed(updated);
    } catch (err) {
      setError("Could not react right now.");
    }
  };

  const handleSave = async (postId) => {
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/save`, {
        method: "POST"
      });
      const updated = await res.json();
      updatePostInFeed(updated);
      showToast("Saved to your list");
    } catch (err) {
      setError("Could not save right now.");
    }
  };

  const handleCommentSubmit = async (postId) => {
    if (!commentDraft.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorId: CURRENT_USER_ID, body: commentDraft })
      });
      const updated = await res.json();
      updatePostInFeed(updated);
      setCommentDraft("");
      setCommentPostId(null);
      showToast("Comment posted");
    } catch (err) {
      setError("Could not comment right now.");
    }
  };

  const handleShare = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        showToast("Link copied to clipboard");
      } else {
        showToast("Link ready: " + text);
      }
    } catch (err) {
      showToast("Copy failed. Try again.");
    }
  };

  const handleApply = async (jobId) => {
    try {
      const res = await fetch(`${API_URL}/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: CURRENT_USER_ID })
      });
      const updatedJob = await res.json();
      setJobs((prev) => prev.map((job) => (job.id === jobId ? updatedJob : job)));
      showToast("Application sent");
    } catch (err) {
      setError("Could not apply right now.");
    }
  };

  const handleFollowCompany = async (companyId) => {
    try {
      const res = await fetch(`${API_URL}/api/companies/${companyId}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: CURRENT_USER_ID })
      });
      const updatedCompany = await res.json();
      setCompanies((prev) =>
        prev.map((company) => (company.id === companyId ? updatedCompany : company))
      );
      showToast("Following this company");
    } catch (err) {
      setError("Could not follow right now.");
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      const res = await fetch(`${API_URL}/api/groups/${groupId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: CURRENT_USER_ID })
      });
      const updatedGroup = await res.json();
      setGroups((prev) => prev.map((group) => (group.id === groupId ? updatedGroup : group)));
      showToast("Joined the group");
    } catch (err) {
      setError("Could not join right now.");
    }
  };

  const handleNotificationRead = async (noteId) => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/${noteId}/read`, {
        method: "POST"
      });
      const updated = await res.json();
      setNotifications((prev) => prev.map((note) => (note.id === noteId ? updated : note)));
    } catch (err) {
      setError("Could not update notification.");
    }
  };

  const handleModalSubmit = async () => {
    if (modal === "invite" && !modalForm.target?.trim()) {
      showToast("Add someone to invite");
      return;
    }

    if (modal === "group" && !modalForm.name?.trim()) {
      showToast("Add a group name");
      return;
    }

    if (modal === "event" && (!modalForm.title?.trim() || !modalForm.detail?.trim())) {
      showToast("Add an event title and time");
      return;
    }

    if (modal === "room" && !modalForm.title?.trim()) {
      showToast("Add a room title");
      return;
    }

    try {
      if (modal === "invite") {
        const res = await fetch(`${API_URL}/api/invites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromId: CURRENT_USER_ID,
            target: modalForm.target
          })
        });
        await res.json();
        showToast("Invite sent");
      }

      if (modal === "group") {
        const res = await fetch(`${API_URL}/api/groups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: modalForm.name,
            description: modalForm.description,
            mode: modalForm.mode,
            creatorId: CURRENT_USER_ID
          })
        });
        const newGroup = await res.json();
        setGroups((prev) => [newGroup, ...prev]);
        showToast("Group created");
      }

      if (modal === "event") {
        const res = await fetch(`${API_URL}/api/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: modalForm.title,
            detail: modalForm.detail,
            mode: modalForm.mode
          })
        });
        const newEvent = await res.json();
        setEvents((prev) => [newEvent, ...prev]);
        showToast("Event scheduled");
      }

      if (modal === "room") {
        const res = await fetch(`${API_URL}/api/rooms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: modalForm.title,
            mode: modalForm.mode,
            hostId: CURRENT_USER_ID
          })
        });
        const newRoom = await res.json();
        showToast(`Room live: ${newRoom.title}`);
      }

      closeModal();
    } catch (err) {
      setError("Action failed. Try again.");
    }
  };

  const jobsWithStatus = useMemo(() => {
    return jobs.map((job) => ({
      ...job,
      applied: job.appliedBy?.includes(CURRENT_USER_ID) || job.applied
    }));
  }, [jobs]);

  const companiesWithStatus = useMemo(() => {
    return companies.map((company) => ({
      ...company,
      following: company.followersBy?.includes(CURRENT_USER_ID)
    }));
  }, [companies]);

  return (
    <div className="app" style={themeStyle} data-mode={mode}>
      <header className="topbar">
        <div className="logo">
          <span className="logo-mark">P</span>
          <div>
            <h1>peepin</h1>
            <p>three modes, one circle</p>
          </div>
        </div>
        <div className="search">
          <input type="text" placeholder="Search people, jobs, groups" />
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => setView(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <button className="ghost" onClick={() => openModal("invite")}>Invite</button>
          <button className="solid" onClick={goToComposer}>New post</button>
        </div>
      </header>

      <section className="hero">
        <div>
          <h2>One app, three social realities.</h2>
          <p>
            Keep your professional momentum, your public energy, and your private
            circle in sync without splitting your identity.
          </p>
          <div className="hero-actions">
            <button className="solid" onClick={goToComposer}>Create a post</button>
            <button
              className="ghost"
              onClick={() => handleShare(buildShareLink(`/profile/${CURRENT_USER_ID}`))}
            >
              Share your profile
            </button>
          </div>
        </div>
        <div className="hero-card">
          <div className="stat">
            <span>Live posts</span>
            <strong>{stats ? stats.posts : "--"}</strong>
            <p>updates across the network</p>
          </div>
          <div className="stat">
            <span>Active people</span>
            <strong>{stats ? stats.users : "--"}</strong>
            <p>profiles connected</p>
          </div>
          <div className="stat">
            <span>Chats</span>
            <strong>{stats ? stats.messages : "--"}</strong>
            <p>threads in motion</p>
          </div>
        </div>
      </section>

      <main className="layout">
        <aside className="sidebar">
          <div className="card profile">
            <div className="profile-cover"></div>
            <div className="profile-body">
              <img
                src={me?.avatar}
                alt={me?.name || "Profile"}
                className="avatar"
              />
              <h3>{me?.name || ""}</h3>
              <p>{me?.title}</p>
              <span className="badge">{theme.label} mode</span>
              <div className="profile-stats">
                <div>
                  <strong>{stats ? stats.connections : "--"}</strong>
                  <span>connections</span>
                </div>
                <div>
                  <strong>{stats ? stats.posts : "--"}</strong>
                  <span>posts</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card mode-switch">
            <h4>Modes</h4>
            <div className="mode-buttons">
              {Object.entries(themes).map(([key, value]) => (
                <button
                  key={key}
                  className={key === mode ? "active" : ""}
                  onClick={() => setMode(key)}
                  type="button"
                >
                  <span>{value.label}</span>
                  <small>{value.description}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="card quick">
            <h4>Quick actions</h4>
            <button className="ghost" onClick={() => openModal("room")}>Start a room</button>
            <button className="ghost" onClick={() => openModal("group")}>Create a group</button>
            <button className="ghost" onClick={() => openModal("event")}>Schedule a drop</button>
          </div>

          <div className="card groups">
            <h4>Your groups</h4>
            {groups.length === 0 ? (
              <p className="muted">No groups yet.</p>
            ) : (
              groups.map((group) => {
                const isMember = group.members?.includes(CURRENT_USER_ID);
                return (
                  <div className="group-row" key={group.id}>
                    <img src={group.avatar} alt={group.name} />
                    <div>
                      <strong>{group.name}</strong>
                      <span>{group.description}</span>
                    </div>
                    {isMember ? (
                      <span className="pill">Joined</span>
                    ) : (
                      <button className="ghost" onClick={() => handleJoinGroup(group.id)}>
                        Join
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="card events">
            <h4>Upcoming</h4>
            {events.map((event) => (
              <div className="event" key={event.id}>
                <strong>{event.title}</strong>
                <span>{event.detail}</span>
              </div>
            ))}
          </div>
        </aside>

        <section className="content">
          {error ? <div className="error">{error}</div> : null}

          {loading ? (
            <div className="card loading">Loading the network...</div>
          ) : (
            <>
              {view === "home" && (
                <>
                  <div className="card story-row">
                    {stories.map((story) => (
                      <button
                        className="story-card"
                        key={story.id}
                        type="button"
                        onClick={() => showToast(`Viewing ${story.author?.name}'s story`)}
                      >
                        <img src={story.image} alt={story.caption} />
                        <div>
                          <strong>{story.author?.name}</strong>
                          <span>{story.caption}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="card composer">
                    <div className="composer-header">
                      <img
                        src={me?.avatar}
                        alt={me?.name || "Profile"}
                        className="avatar"
                      />
                      <div>
                        <h4>{me?.name || ""}</h4>
                        <p>{modePrompts[mode]}</p>
                      </div>
                    </div>
                    <textarea
                      ref={composerRef}
                      placeholder={modePrompts[mode]}
                      value={composer.content}
                      onChange={(event) =>
                        setComposer((prev) => ({
                          ...prev,
                          content: event.target.value
                        }))
                      }
                    />
                    <div className="composer-row">
                      <input
                        type="text"
                        placeholder="Add a link"
                        value={composer.link}
                        onChange={(event) =>
                          setComposer((prev) => ({
                            ...prev,
                            link: event.target.value
                          }))
                        }
                      />
                      <input
                        type="text"
                        placeholder="Image URL"
                        value={composer.image}
                        onChange={(event) =>
                          setComposer((prev) => ({
                            ...prev,
                            image: event.target.value
                          }))
                        }
                      />
                      <button className="solid" onClick={handlePost} type="button">
                        Post
                      </button>
                    </div>
                  </div>

                  {feed.map((post) => (
                    <article className="card post" key={post.id}>
                      <header>
                        <img
                          src={post.author?.avatar}
                          alt={post.author?.name}
                          className="avatar"
                        />
                        <div>
                          <h4>{post.author?.name}</h4>
                          <p>
                            {post.author?.title} - {formatDate(post.createdAt)}
                          </p>
                        </div>
                        <span className="chip">{theme.label}</span>
                      </header>
                      <p className="content-text">{post.content}</p>
                      {post.image ? (
                        <div className="image-wrap">
                          <img src={post.image} alt="Post" />
                        </div>
                      ) : null}
                      {post.link ? (
                        <a
                          className="link"
                          href={post.link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {post.link}
                        </a>
                      ) : null}
                      <div className="post-actions">
                        <button className="ghost" onClick={() => handleReaction(post.id)}>
                          Like {post.reactions}
                        </button>
                        <button
                          className="ghost"
                          onClick={() =>
                            setCommentPostId((prev) => (prev === post.id ? null : post.id))
                          }
                        >
                          Comment {post.comments}
                        </button>
                        <button className="ghost" onClick={() => handleSave(post.id)}>
                          Save {post.saves}
                        </button>
                        <button
                          className="ghost"
                          onClick={() =>
                            handleShare(buildShareLink(`/post/${post.id}`))
                          }
                        >
                          Share
                        </button>
                      </div>
                      {post.commentItems?.length ? (
                        <div className="comment-list">
                          {post.commentItems.slice(-2).map((comment) => (
                            <div className="comment" key={comment.id}>
                              <strong>{comment.author?.name}</strong>
                              <span>{comment.body}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {commentPostId === post.id ? (
                        <div className="comment-box">
                          <input
                            type="text"
                            placeholder="Write a comment"
                            value={commentDraft}
                            onChange={(event) => setCommentDraft(event.target.value)}
                          />
                          <button
                            className="solid"
                            onClick={() => handleCommentSubmit(post.id)}
                          >
                            Send
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </>
              )}

              {view === "explore" && (
                <>
                  <div className="card explore-hero">
                    <h3>Explore the vibe</h3>
                    <p>Stories, reels, and trending tags by mode.</p>
                    <div className="tag-list">
                      {tagsByMode[mode].map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                  </div>

                  <div className="card story-row">
                    {stories.map((story) => (
                      <button
                        className="story-card"
                        key={story.id}
                        type="button"
                        onClick={() => showToast(`Viewing ${story.author?.name}'s story`)}
                      >
                        <img src={story.image} alt={story.caption} />
                        <div>
                          <strong>{story.author?.name}</strong>
                          <span>{story.caption}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="reel-grid">
                    {reels.map((reel) => (
                      <button
                        className="card reel"
                        key={reel.id}
                        type="button"
                        onClick={() => showToast(`Playing ${reel.title}`)}
                      >
                        <img src={reel.cover} alt={reel.title} />
                        <div className="reel-meta">
                          <strong>{reel.title}</strong>
                          <span>{reel.views} views</span>
                          <span>by {reel.author?.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {view === "nearby" && (
                <div className="nearby-layout">
                  <div className="card radar-card">
                    <div className="radar-header">
                      <h3>NearMe radar</h3>
                      <span className="status-pill">
                        {precision ? "Bluetooth precision" : "GPS"}
                      </span>
                    </div>
                    <div className="radar">
                      <div className="radar-ring"></div>
                      <div className="radar-ring small"></div>
                      <div className="radar-center"></div>
                      {nearbyProfiles.map((profile) => {
                        const pos = getRadarPosition(
                          profile.user.id,
                          profile.distance,
                          visibilityRadius,
                          90
                        );
                        return (
                          <button
                            key={profile.user.id}
                            className={`radar-dot ${profile.status}`}
                            style={{
                              transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`
                            }}
                            type="button"
                            onClick={() =>
                              showToast(
                                `${profile.user.name} is about ${Math.round(
                                  profile.distance
                                )}m away`
                              )
                            }
                          >
                            <img src={profile.user.avatar} alt={profile.user.name} />
                          </button>
                        );
                      })}
                    </div>
                    <div className="radar-meta">
                      <span>Range {(visibilityRadius / 1000).toFixed(1)} km</span>
                      <span>
                        {nearbyCount} nearby, {nearbyProfiles.length - nearbyCount} recent
                      </span>
                    </div>
                    <div className="control-row">
                      <button
                        className={locationEnabled ? "solid" : "ghost"}
                        onClick={() => setLocationEnabled((value) => !value)}
                      >
                        GPS {locationEnabled ? "On" : "Off"}
                      </button>
                      <button
                        className={precision ? "solid" : "ghost"}
                        onClick={() => setPrecision((value) => !value)}
                      >
                        Bluetooth {precision ? "On" : "Off"}
                      </button>
                      <button
                        className={useDemoLocation ? "solid" : "ghost"}
                        onClick={() => setUseDemoLocation((value) => !value)}
                      >
                        Demo {useDemoLocation ? "On" : "Off"}
                      </button>
                    </div>
                    <div className="control-row">
                      <button
                        className="ghost"
                        onClick={() => setDemoIndex((value) => (value + 1) % demoLocations.length)}
                      >
                        Switch spot
                      </button>
                      <button className="ghost" onClick={() => setTick((value) => value + 1)}>
                        Ping now
                      </button>
                    </div>
                    <p className="muted status-line">{locationStatus}</p>
                  </div>

                  <div className="card nearby-list">
                    <h3>Nearby people</h3>
                    {nearbyProfiles.length === 0 ? (
                      <p className="muted">
                        No one nearby. Toggle demo mode or enable GPS to see nearby profiles.
                      </p>
                    ) : (
                      nearbyProfiles.map((profile) => (
                        <div className="nearby-item" key={profile.user.id}>
                          <img src={profile.user.avatar} alt={profile.user.name} />
                          <div>
                            <strong>{profile.user.name}</strong>
                            <span>{profile.user.title}</span>
                            <span>
                              {profile.status === "nearby"
                                ? "Nearby now"
                                : `Seen ${formatLastSeen(profile.lastSeen)}`}
                            </span>
                          </div>
                          <div className="nearby-meta">
                            <span className={`status-pill ${profile.status}`}>{
                              profile.status === "nearby" ? "Live" : "Recent"
                            }</span>
                            <strong>{(profile.distance / 1000).toFixed(1)} km</strong>
                            <button
                              className="ghost"
                              onClick={() => handleConnect(profile.user.id)}
                            >
                              Connect
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {view === "jobs" && (
                <>
                  <div className="card jobs-hero">
                    <h3>Open roles</h3>
                    <p>Curated opportunities from teams in your network.</p>
                  </div>
                  <div className="jobs-list">
                    {jobsWithStatus.map((job) => (
                      <div className="card job" key={job.id}>
                        <div>
                          <h4>{job.title}</h4>
                          <p>
                            {job.company?.name} - {job.location}
                          </p>
                          <span>{job.type}</span>
                          <span>{job.level}</span>
                          <span>{job.salary}</span>
                        </div>
                        <div>
                          <p className="muted">{job.description}</p>
                          <div className="tag-list">
                            {job.skills.map((skill) => (
                              <span key={skill}>{skill}</span>
                            ))}
                          </div>
                        </div>
                        <button
                          className={job.applied ? "ghost" : "solid"}
                          onClick={() => handleApply(job.id)}
                          disabled={job.applied}
                        >
                          {job.applied ? "Applied" : "Apply"}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="company-grid">
                    {companiesWithStatus.map((company) => (
                      <div className="card company" key={company.id}>
                        <img src={company.logo} alt={company.name} />
                        <div>
                          <strong>{company.name}</strong>
                          <span>{company.industry}</span>
                          <span>{company.followers} followers</span>
                        </div>
                        <button
                          className={company.following ? "ghost" : "solid"}
                          onClick={() => handleFollowCompany(company.id)}
                          disabled={company.following}
                        >
                          {company.following ? "Following" : "Follow"}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {view === "messages" && (
                <div className="chat-layout">
                  <div className="card thread-list">
                    <h4>Direct</h4>
                    {directThreads.map((thread) => (
                      <button
                        key={thread.id}
                        className={
                          activeThread?.id === thread.id &&
                          activeThread?.type === thread.type
                            ? "thread active"
                            : "thread"
                        }
                        onClick={() => setActiveThread(thread)}
                        type="button"
                      >
                        <img src={thread.avatar} alt={thread.title} />
                        <div>
                          <strong>{thread.title}</strong>
                          <span>{thread.lastMessage?.body}</span>
                        </div>
                      </button>
                    ))}
                    <h4>Groups</h4>
                    {groupThreads.map((thread) => (
                      <button
                        key={thread.id}
                        className={
                          activeThread?.id === thread.id &&
                          activeThread?.type === thread.type
                            ? "thread active"
                            : "thread"
                        }
                        onClick={() => setActiveThread(thread)}
                        type="button"
                      >
                        <img src={thread.avatar} alt={thread.title} />
                        <div>
                          <strong>{thread.title}</strong>
                          <span>{thread.lastMessage?.body || "Start the chat"}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="card chat-window">
                    {activeThread ? (
                      <>
                        <header>
                          <div>
                            <strong>{activeThread.title}</strong>
                            <span>{activeThread.subtitle}</span>
                          </div>
                          <button className="ghost" onClick={() => openModal("room")}>
                            Call
                          </button>
                        </header>
                        <div className="chat-messages">
                          {threadMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={
                                msg.fromId === CURRENT_USER_ID ? "bubble mine" : "bubble"
                              }
                            >
                              <p>{msg.body}</p>
                              <small>{formatDateTime(msg.createdAt)}</small>
                            </div>
                          ))}
                        </div>
                        <div className="chat-input">
                          <input
                            type="text"
                            placeholder="Write a message"
                            value={messageDraft}
                            onChange={(event) => setMessageDraft(event.target.value)}
                          />
                          <button className="solid" onClick={handleSendMessage}>
                            Send
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="muted">Pick a thread to start chatting.</p>
                    )}
                  </div>
                </div>
              )}

              {view === "profile" && (
                <div className="profile-grid">
                  <div className="card">
                    <h3>About</h3>
                    <p>{me?.bio}</p>
                    <div className="profile-meta">
                      <span>{me?.location}</span>
                      <span>@{me?.handle}</span>
                    </div>
                  </div>
                  <div className="card">
                    <h3>Skills</h3>
                    <div className="tag-list">
                      {skills.map((skill) => (
                        <span key={skill.id}>
                          {skill.name} ({endorsementCounts[skill.name] || 0})
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <h3>Recommendations</h3>
                    {recommendations.map((rec) => (
                      <div className="recommendation" key={rec.id}>
                        <strong>{rec.from?.name}</strong>
                        <p>{rec.text}</p>
                        <small>{formatDate(rec.createdAt)}</small>
                      </div>
                    ))}
                  </div>
                  <div className="card">
                    <h3>Endorsements</h3>
                    {endorsements.map((endorse) => (
                      <div className="endorsement" key={endorse.id}>
                        <strong>{endorse.from?.name}</strong>
                        <span>{endorse.skill}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === "notifications" && (
                <div className="card notifications">
                  <h3>Notifications</h3>
                  {notifications.map((note) => (
                    <button
                      className={note.read ? "notification" : "notification unread"}
                      key={note.id}
                      type="button"
                      onClick={() => handleNotificationRead(note.id)}
                    >
                      <div>
                        <strong>{note.type}</strong>
                        <p>{note.message}</p>
                      </div>
                      <span>{formatDateTime(note.createdAt)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <aside className="sidebar right">
          <div className="card spotlight">
            <h4>Spotlight</h4>
            <p>
              {mode === "pro"
                ? "Pitch your latest launch in 60 seconds."
                : mode === "social"
                ? "Show the story behind your best frame."
                : "Drop a voice note to your inner circle."}
            </p>
            <button className="solid" onClick={() => openModal("room")}>
              Go live
            </button>
          </div>

          <div className="card suggestions">
            <h4>People to connect</h4>
            {suggestions.length === 0 ? (
              <p className="muted">You are caught up.</p>
            ) : (
              suggestions.slice(0, 3).map((user) => (
                <div className="person" key={user.id}>
                  <img src={user.avatar} alt={user.name} className="avatar" />
                  <div>
                    <strong>{user.name}</strong>
                    <span>{user.title}</span>
                  </div>
                  <button className="ghost" onClick={() => handleConnect(user.id)}>
                    Connect
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="card notifications-preview">
            <h4>Latest alerts</h4>
            {notifications.slice(0, 3).map((note) => (
              <div className="notification mini" key={note.id}>
                <p>{note.message}</p>
                <span>{formatDateTime(note.createdAt)}</span>
              </div>
            ))}
          </div>

          <div className="card jobs-preview">
            <h4>Hiring now</h4>
            {jobs.slice(0, 3).map((job) => (
              <div className="job-mini" key={job.id}>
                <strong>{job.title}</strong>
                <span>{job.company?.name}</span>
                <span>{job.location}</span>
              </div>
            ))}
          </div>
        </aside>
      </main>

      {modal ? (
        <div className="modal">
          <div className="modal-card">
            <header>
              <h3>
                {modal === "invite"
                  ? "Invite someone"
                  : modal === "group"
                  ? "Create a group"
                  : modal === "event"
                  ? "Schedule a drop"
                  : "Start a room"}
              </h3>
              <button className="ghost" onClick={closeModal}>
                Close
              </button>
            </header>
            <div className="modal-body">
              {modal === "invite" && (
                <label>
                  Person to invite
                  <input
                    type="text"
                    placeholder="Email or handle"
                    value={modalForm.target || ""}
                    onChange={(event) =>
                      setModalForm((prev) => ({ ...prev, target: event.target.value }))
                    }
                  />
                </label>
              )}

              {modal === "group" && (
                <>
                  <label>
                    Group name
                    <input
                      type="text"
                      placeholder="Group name"
                      value={modalForm.name || ""}
                      onChange={(event) =>
                        setModalForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Description
                    <input
                      type="text"
                      placeholder="What is this group about?"
                      value={modalForm.description || ""}
                      onChange={(event) =>
                        setModalForm((prev) => ({
                          ...prev,
                          description: event.target.value
                        }))
                      }
                    />
                  </label>
                  <label>
                    Mode
                    <select
                      value={modalForm.mode || mode}
                      onChange={(event) =>
                        setModalForm((prev) => ({ ...prev, mode: event.target.value }))
                      }
                    >
                      <option value="pro">Pro</option>
                      <option value="social">Social</option>
                      <option value="private">Private</option>
                    </select>
                  </label>
                </>
              )}

              {modal === "event" && (
                <>
                  <label>
                    Event title
                    <input
                      type="text"
                      placeholder="Event title"
                      value={modalForm.title || ""}
                      onChange={(event) =>
                        setModalForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Time or detail
                    <input
                      type="text"
                      placeholder="Fri 8:00 PM"
                      value={modalForm.detail || ""}
                      onChange={(event) =>
                        setModalForm((prev) => ({ ...prev, detail: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Mode
                    <select
                      value={modalForm.mode || mode}
                      onChange={(event) =>
                        setModalForm((prev) => ({ ...prev, mode: event.target.value }))
                      }
                    >
                      <option value="pro">Pro</option>
                      <option value="social">Social</option>
                      <option value="private">Private</option>
                    </select>
                  </label>
                </>
              )}

              {modal === "room" && (
                <>
                  <label>
                    Room title
                    <input
                      type="text"
                      placeholder="Room title"
                      value={modalForm.title || ""}
                      onChange={(event) =>
                        setModalForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Mode
                    <select
                      value={modalForm.mode || mode}
                      onChange={(event) =>
                        setModalForm((prev) => ({ ...prev, mode: event.target.value }))
                      }
                    >
                      <option value="pro">Pro</option>
                      <option value="social">Social</option>
                      <option value="private">Private</option>
                    </select>
                  </label>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button className="ghost" onClick={closeModal}>
                Cancel
              </button>
              <button className="solid" onClick={handleModalSubmit}>
                {modal === "invite"
                  ? "Send invite"
                  : modal === "group"
                  ? "Create"
                  : modal === "event"
                  ? "Schedule"
                  : "Go live"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
