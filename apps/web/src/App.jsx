import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

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

const formatLastSeen = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
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
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem("peepin_auth");
    return saved ? JSON.parse(saved) : null;
  });
  const [authView, setAuthView] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    handle: "",
    email: "",
    password: "",
    mode: "pro"
  });
  const [authError, setAuthError] = useState("");
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [precision, setPrecision] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [nearbyProfiles, setNearbyProfiles] = useState([]);
  const [tick, setTick] = useState(0);
  const composerRef = useRef(null);
  const toastTimer = useRef(null);

  const userId = auth?.user?.id;

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

  const apiFetch = useCallback(
    async (path, options = {}) => {
      const headers = {
        ...(options.headers || {})
      };

      if (!headers["Content-Type"] && options.body) {
        headers["Content-Type"] = "application/json";
      }

      if (auth?.token) {
        headers.Authorization = `Bearer ${auth.token}`;
      }

      const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers
      });

      if (res.status === 401) {
        setAuth(null);
        localStorage.removeItem("peepin_auth");
      }

      return res;
    },
    [auth]
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

  useEffect(() => {
    if (me?.shareLocation == null) return;
    setLocationEnabled(Boolean(me.shareLocation));
  }, [me?.shareLocation]);

  const visibilityRadius = precision ? 800 : 2500;

  useEffect(() => {
    if (!locationEnabled || !location || !userId) return;

    const sendLocation = async () => {
      await apiFetch("/api/location", {
        method: "POST",
        body: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          precision,
          share: locationEnabled
        })
      });
    };

    sendLocation();
    const interval = setInterval(sendLocation, 15000);
    return () => clearInterval(interval);
  }, [apiFetch, location, locationEnabled, precision, userId]);

  useEffect(() => {
    if (!locationEnabled || !location || !userId) {
      setNearbyProfiles([]);
      return;
    }

    const fetchNearby = async () => {
      const res = await apiFetch(
        `/api/nearby?radius=${visibilityRadius}&lat=${location.lat}&lng=${location.lng}`
      );
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      setNearbyProfiles(data);
    };

    fetchNearby();
    const interval = setInterval(fetchNearby, 10000);
    return () => clearInterval(interval);
  }, [apiFetch, location, locationEnabled, userId, visibilityRadius, tick]);

  const nearbyCount = useMemo(
    () => nearbyProfiles.filter((profile) => profile.status === "nearby").length,
    [nearbyProfiles]
  );

  const locationStatus = useMemo(() => {
    if (!locationEnabled) return "Location sharing off";
    if (locationError) return locationError;
    if (location?.accuracy) return `Accuracy ~${Math.round(location.accuracy)}m`;
    return "Locating...";
  }, [locationError, locationEnabled, location]);

  useEffect(() => {
    if (!auth?.token) return;

    const verify = async () => {
      const res = await apiFetch("/api/auth/me");
      if (!res.ok) return;
      const data = await res.json();
      setAuth((prev) => (prev ? { ...prev, user: data } : prev));
      setMe(data);
    };

    verify();
  }, [apiFetch, auth?.token]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!auth?.token) return;
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
          apiFetch(`/api/feed?mode=${mode}`),
          apiFetch("/api/auth/me"),
          apiFetch(`/api/users?mode=${mode}`),
          apiFetch("/api/connections"),
          apiFetch("/api/messages"),
          apiFetch("/api/stats"),
          apiFetch(`/api/stories?mode=${mode}`),
          apiFetch(`/api/reels?mode=${mode}`),
          apiFetch("/api/jobs"),
          apiFetch("/api/companies"),
          apiFetch("/api/notifications"),
          apiFetch(`/api/groups?mode=${mode}`),
          apiFetch(`/api/events?mode=${mode}`),
          apiFetch(`/api/skills?userId=${userId}`),
          apiFetch(`/api/endorsements?userId=${userId}`),
          apiFetch(`/api/recommendations?userId=${userId}`)
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
  }, [apiFetch, auth?.token, mode, userId]);

  const connectedIds = useMemo(
    () => new Set(connections.map((con) => con.toId)),
    [connections]
  );

  const suggestions = useMemo(
    () => users.filter((user) => user.id !== userId && !connectedIds.has(user.id)),
    [users, connectedIds, userId]
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
        const otherId = msg.fromId === userId ? msg.toId : msg.fromId;
        const otherUser = msg.fromId === userId ? msg.to : msg.from;
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
  }, [messages, userId]);

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
          ((msg.fromId === userId && msg.toId === activeThread.id) ||
            (msg.toId === userId && msg.fromId === activeThread.id))
      )
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [activeThread, messages, userId]);

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
      const res = await apiFetch("/api/posts", {
        method: "POST",
        body: JSON.stringify({
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
      const res = await apiFetch("/api/connections", {
        method: "POST",
        body: JSON.stringify({ toId: targetId })
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
        body: messageDraft
      };

      if (activeThread.type === "group") {
        payload.groupId = activeThread.id;
      } else {
        payload.toId = activeThread.id;
      }

      const res = await apiFetch("/api/messages", {
        method: "POST",
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
      const res = await apiFetch(`/api/posts/${postId}/react`, {
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
      const res = await apiFetch(`/api/posts/${postId}/save`, {
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
      const res = await apiFetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        body: JSON.stringify({ body: commentDraft })
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
      const res = await apiFetch(`/api/jobs/${jobId}/apply`, {
        method: "POST"
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
      const res = await apiFetch(`/api/companies/${companyId}/follow`, {
        method: "POST"
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
      const res = await apiFetch(`/api/groups/${groupId}/join`, {
        method: "POST"
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
      const res = await apiFetch(`/api/notifications/${noteId}/read`, {
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
        const res = await apiFetch("/api/invites", {
          method: "POST",
          body: JSON.stringify({
            target: modalForm.target
          })
        });
        await res.json();
        showToast("Invite sent");
      }

      if (modal === "group") {
        const res = await apiFetch("/api/groups", {
          method: "POST",
          body: JSON.stringify({
            name: modalForm.name,
            description: modalForm.description,
            mode: modalForm.mode
          })
        });
        const newGroup = await res.json();
        setGroups((prev) => [newGroup, ...prev]);
        showToast("Group created");
      }

      if (modal === "event") {
        const res = await apiFetch("/api/events", {
          method: "POST",
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
        const res = await apiFetch("/api/rooms", {
          method: "POST",
          body: JSON.stringify({
            title: modalForm.title,
            mode: modalForm.mode
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
      applied: job.appliedBy?.includes(userId) || job.applied
    }));
  }, [jobs, userId]);

  const companiesWithStatus = useMemo(() => {
    return companies.map((company) => ({
      ...company,
      following: company.followersBy?.includes(userId)
    }));
  }, [companies, userId]);

  const handleLogin = async () => {
    setAuthError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Login failed");
        return;
      }

      const nextAuth = { token: data.token, user: data.user };
      setAuth(nextAuth);
      localStorage.setItem("peepin_auth", JSON.stringify(nextAuth));
      setAuthForm({ name: "", handle: "", email: "", password: "", mode: "pro" });
    } catch (err) {
      setAuthError("Login failed");
    }
  };

  const handleRegister = async () => {
    setAuthError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authForm.name,
          handle: authForm.handle,
          email: authForm.email,
          password: authForm.password,
          mode: authForm.mode
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Registration failed");
        return;
      }

      const nextAuth = { token: data.token, user: data.user };
      setAuth(nextAuth);
      localStorage.setItem("peepin_auth", JSON.stringify(nextAuth));
      setAuthForm({ name: "", handle: "", email: "", password: "", mode: "pro" });
    } catch (err) {
      setAuthError("Registration failed");
    }
  };

  const handleLogout = async () => {
    if (locationEnabled) {
      await apiFetch("/api/location", {
        method: "POST",
        body: JSON.stringify({ share: false })
      });
    }
    setLocationEnabled(false);
    setAuth(null);
    localStorage.removeItem("peepin_auth");
  };

  const handleToggleLocation = async () => {
    if (locationEnabled) {
      setLocationEnabled(false);
      await apiFetch("/api/location", {
        method: "POST",
        body: JSON.stringify({ share: false })
      });
      return;
    }

    setLocationEnabled(true);
  };

  if (!auth?.token) {
    return (
      <div className="app auth-screen" style={themeStyle}>
        <div className="auth-card">
          <div className="logo">
            <span className="logo-mark">P</span>
            <div>
              <h1>peepin</h1>
              <p>three modes, one circle</p>
            </div>
          </div>
          <h2>Sign in to continue</h2>
          <p className="muted">
            Use the demo account or create a new profile.
          </p>
          <div className="auth-toggle">
            <button
              className={authView === "login" ? "solid" : "ghost"}
              onClick={() => setAuthView("login")}
            >
              Login
            </button>
            <button
              className={authView === "register" ? "solid" : "ghost"}
              onClick={() => setAuthView("register")}
            >
              Register
            </button>
          </div>
          {authView === "register" && (
            <div className="auth-fields">
              <input
                type="text"
                placeholder="Full name"
                value={authForm.name}
                onChange={(event) =>
                  setAuthForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                type="text"
                placeholder="Handle"
                value={authForm.handle}
                onChange={(event) =>
                  setAuthForm((prev) => ({ ...prev, handle: event.target.value }))
                }
              />
              <select
                value={authForm.mode}
                onChange={(event) =>
                  setAuthForm((prev) => ({ ...prev, mode: event.target.value }))
                }
              >
                <option value="pro">Pro</option>
                <option value="social">Social</option>
                <option value="private">Private</option>
              </select>
            </div>
          )}
          <div className="auth-fields">
            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(event) =>
                setAuthForm((prev) => ({ ...prev, email: event.target.value }))
              }
            />
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(event) =>
                setAuthForm((prev) => ({ ...prev, password: event.target.value }))
              }
            />
          </div>
          {authError ? <p className="error">{authError}</p> : null}
          <button
            className="solid"
            onClick={authView === "login" ? handleLogin : handleRegister}
          >
            {authView === "login" ? "Login" : "Create account"}
          </button>
          <p className="muted auth-note">
            Demo: avery@peepin.com, mila@peepin.com, rohan@peepin.com (password peepin123)
          </p>
        </div>
      </div>
    );
  }

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
          <button className="ghost" onClick={handleLogout}>Log out</button>
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
              onClick={() => handleShare(buildShareLink(`/profile/${userId}`))}
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
                const isMember = group.members?.includes(userId);
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
                        {precision ? "High precision" : "Standard"}
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
                        onClick={handleToggleLocation}
                      >
                        Share location {locationEnabled ? "On" : "Off"}
                      </button>
                      <button
                        className={precision ? "solid" : "ghost"}
                        onClick={() => setPrecision((value) => !value)}
                      >
                        High precision {precision ? "On" : "Off"}
                      </button>
                    </div>
                    <p className="muted status-line">{locationStatus}</p>
                    <p className="muted status-line">
                      High precision uses GPS and WiFi. Bluetooth beacons require a mobile app.
                    </p>
                    <p className="muted status-line">
                      Tip: use different accounts on each device to see each other.
                    </p>
                  </div>

                  <div className="card nearby-list">
                    <h3>Nearby people</h3>
                    {nearbyProfiles.length === 0 ? (
                      <p className="muted">
                        No one nearby yet. Turn on location sharing to surface profiles.
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
                            <span className={`status-pill ${profile.status}`}>
                              {profile.status === "nearby" ? "Live" : "Recent"}
                            </span>
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
                              className={msg.fromId === userId ? "bubble mine" : "bubble"}
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
