import { nanoid } from "nanoid";
import { db, readDb } from "./db.js";

const now = () => new Date().toISOString();

export async function seedIfEmpty() {
  await readDb();

  if (db.data.users.length > 0) {
    return;
  }

  const users = [
    {
      id: "user_1",
      name: "Avery Chen",
      handle: "avery.chen",
      title: "Product Lead at Flowline",
      bio: "Building calm social spaces for real life.",
      mode: "pro",
      avatar: "https://i.pravatar.cc/150?img=32",
      location: "Seattle",
      lat: 47.6062,
      lng: -122.3321
    },
    {
      id: "user_2",
      name: "Mila Ortiz",
      handle: "mila.ortiz",
      title: "Creative Director",
      bio: "Color, motion, and a little mischief.",
      mode: "social",
      avatar: "https://i.pravatar.cc/150?img=45",
      location: "Miami",
      lat: 47.6095,
      lng: -122.3362
    },
    {
      id: "user_3",
      name: "Rohan Patel",
      handle: "rohan.patel",
      title: "Backend Engineer",
      bio: "Shipping clean APIs and clean interiors.",
      mode: "pro",
      avatar: "https://i.pravatar.cc/150?img=12",
      location: "Austin",
      lat: 47.6048,
      lng: -122.329
    },
    {
      id: "user_4",
      name: "Skylar Nguyen",
      handle: "sky.nguyen",
      title: "Photographer",
      bio: "Daily light studies and long walks.",
      mode: "social",
      avatar: "https://i.pravatar.cc/150?img=5",
      location: "Portland",
      lat: 47.6136,
      lng: -122.341
    },
    {
      id: "user_5",
      name: "Lena Park",
      handle: "lena.park",
      title: "Close Friends Only",
      bio: "Small circle, big energy.",
      mode: "private",
      avatar: "https://i.pravatar.cc/150?img=21",
      location: "Brooklyn",
      lat: 47.5944,
      lng: -122.32
    }
  ];

  const posts = [
    {
      id: `post_${nanoid(6)}`,
      authorId: "user_1",
      mode: "pro",
      content: "We just shipped a zero-noise onboarding. The key was a single call-to-action with progressive disclosure. Happy to share the template if anyone wants it.",
      link: "https://example.com",
      image: "https://images.unsplash.com/photo-1454165205744-3b78555e5572?q=80&w=1200&auto=format&fit=crop",
      createdAt: now(),
      reactions: 128,
      comments: 24,
      saves: 12,
      commentItems: [
        {
          id: `c_${nanoid(6)}`,
          authorId: "user_2",
          body: "This is so crisp. Would love that template.",
          createdAt: now()
        },
        {
          id: `c_${nanoid(6)}`,
          authorId: "user_3",
          body: "The CTA focus really shows. Nice work.",
          createdAt: now()
        }
      ]
    },
    {
      id: `post_${nanoid(6)}`,
      authorId: "user_3",
      mode: "pro",
      content: "Hiring for a platform engineer who loves observability and devex. Remote US. DM if you're into clean pipelines.",
      link: "",
      image: "",
      createdAt: now(),
      reactions: 64,
      comments: 18,
      saves: 9,
      commentItems: []
    },
    {
      id: `post_${nanoid(6)}`,
      authorId: "user_2",
      mode: "social",
      content: "Studio day: kinetic typography and citrus palettes. This week is pure motion.",
      link: "",
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
      createdAt: now(),
      reactions: 402,
      comments: 88,
      saves: 52,
      commentItems: [
        {
          id: `c_${nanoid(6)}`,
          authorId: "user_4",
          body: "The palette is incredible.",
          createdAt: now()
        }
      ]
    },
    {
      id: `post_${nanoid(6)}`,
      authorId: "user_4",
      mode: "social",
      content: "Golden hour walk. The sky was doing that soft orange gradient thing again.",
      link: "",
      image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1200&auto=format&fit=crop",
      createdAt: now(),
      reactions: 257,
      comments: 31,
      saves: 33,
      commentItems: []
    },
    {
      id: `post_${nanoid(6)}`,
      authorId: "user_5",
      mode: "private",
      content: "Movie night at 9. I made too many snacks again.",
      link: "",
      image: "https://images.unsplash.com/photo-1481391032119-d89fee407e44?q=80&w=1200&auto=format&fit=crop",
      createdAt: now(),
      reactions: 19,
      comments: 7,
      saves: 3,
      commentItems: []
    }
  ];

  const groupIds = {
    pro: "group_1",
    social: "group_2",
    private: "group_3"
  };

  const connections = [
    { id: `con_${nanoid(6)}`, fromId: "user_1", toId: "user_3", status: "connected" },
    { id: `con_${nanoid(6)}`, fromId: "user_1", toId: "user_2", status: "following" }
  ];

  const companies = [
    {
      id: "comp_1",
      name: "Flowline",
      industry: "Product Design",
      location: "Remote",
      logo: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=200&auto=format&fit=crop",
      followers: 12400
    },
    {
      id: "comp_2",
      name: "Pulse Studio",
      industry: "Creative Agency",
      location: "Los Angeles",
      logo: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?q=80&w=200&auto=format&fit=crop",
      followers: 8200
    },
    {
      id: "comp_3",
      name: "Greenhouse Labs",
      industry: "Climate Tech",
      location: "San Francisco",
      logo: "https://images.unsplash.com/photo-1521790945508-bf2a36314e85?q=80&w=200&auto=format&fit=crop",
      followers: 15800
    }
  ];

  const jobs = [
    {
      id: `job_${nanoid(6)}`,
      companyId: "comp_1",
      title: "Senior Product Designer",
      location: "Remote - US",
      type: "Full-time",
      level: "Senior",
      salary: "$140k-$175k",
      postedAt: now(),
      description:
        "Own onboarding, new team rituals, and the new user journey for a fast-moving product studio.",
      skills: ["Product Design", "User Research", "Design Systems"]
    },
    {
      id: `job_${nanoid(6)}`,
      companyId: "comp_3",
      title: "Platform Engineer",
      location: "San Francisco",
      type: "Full-time",
      level: "Mid",
      salary: "$155k-$190k",
      postedAt: now(),
      description:
        "Build reliable data pipelines and internal tooling for climate intelligence.",
      skills: ["Node.js", "Postgres", "Observability"]
    },
    {
      id: `job_${nanoid(6)}`,
      companyId: "comp_2",
      title: "Creative Technologist",
      location: "Los Angeles",
      type: "Contract",
      level: "Mid",
      salary: "$90-$120/hr",
      postedAt: now(),
      description:
        "Prototype interactive experiences and translate visual ideas into code.",
      skills: ["WebGL", "Motion", "Creative Coding"]
    }
  ];

  const stories = [
    {
      id: `story_${nanoid(6)}`,
      authorId: "user_2",
      mode: "social",
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=600&auto=format&fit=crop",
      caption: "New studio wall, new energy.",
      createdAt: now()
    },
    {
      id: `story_${nanoid(6)}`,
      authorId: "user_4",
      mode: "social",
      image: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=600&auto=format&fit=crop",
      caption: "Morning light studies.",
      createdAt: now()
    },
    {
      id: `story_${nanoid(6)}`,
      authorId: "user_5",
      mode: "private",
      image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=600&auto=format&fit=crop",
      caption: "Quiet cafe catch-up.",
      createdAt: now()
    }
  ];

  const reels = [
    {
      id: `reel_${nanoid(6)}`,
      authorId: "user_2",
      mode: "social",
      title: "Color drop",
      cover: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=600&auto=format&fit=crop",
      views: 12800,
      likes: 2100
    },
    {
      id: `reel_${nanoid(6)}`,
      authorId: "user_4",
      mode: "social",
      title: "Golden hour walk",
      cover: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=600&auto=format&fit=crop",
      views: 9800,
      likes: 1750
    }
  ];

  const notifications = [
    {
      id: `note_${nanoid(6)}`,
      userId: "user_1",
      type: "reaction",
      message: "Mila reacted to your onboarding post.",
      createdAt: now(),
      read: false
    },
    {
      id: `note_${nanoid(6)}`,
      userId: "user_1",
      type: "connection",
      message: "Rohan accepted your connection request.",
      createdAt: now(),
      read: true
    },
    {
      id: `note_${nanoid(6)}`,
      userId: "user_1",
      type: "message",
      message: "Skylar sent you a photo set.",
      createdAt: now(),
      read: false
    }
  ];

  const groups = [
    {
      id: groupIds.pro,
      name: "Product Rituals",
      description: "Weekly patterns for healthy product teams.",
      mode: "pro",
      members: ["user_1", "user_3"],
      avatar: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=200&auto=format&fit=crop"
    },
    {
      id: groupIds.social,
      name: "Studio Friends",
      description: "Creative check-ins and WIP drops.",
      mode: "social",
      members: ["user_2", "user_4"],
      avatar: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?q=80&w=200&auto=format&fit=crop"
    },
    {
      id: groupIds.private,
      name: "Inner Circle",
      description: "Private notes and weekend plans.",
      mode: "private",
      members: ["user_1", "user_5"],
      avatar: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=200&auto=format&fit=crop"
    }
  ];

  const events = [
    { id: `event_${nanoid(6)}`, mode: "pro", title: "Founder Roundtable", detail: "Thu 6:00 PM" },
    { id: `event_${nanoid(6)}`, mode: "pro", title: "Design Ops AMA", detail: "Fri 1:00 PM" },
    { id: `event_${nanoid(6)}`, mode: "social", title: "Photo Walk", detail: "Sat 9:00 AM" },
    { id: `event_${nanoid(6)}`, mode: "social", title: "Neon Night", detail: "Sun 8:00 PM" },
    { id: `event_${nanoid(6)}`, mode: "private", title: "Game Night", detail: "Fri 8:00 PM" },
    { id: `event_${nanoid(6)}`, mode: "private", title: "Hike and Brunch", detail: "Sat 10:30 AM" }
  ];

  const skills = [
    { id: `skill_${nanoid(6)}`, userId: "user_1", name: "Product Strategy" },
    { id: `skill_${nanoid(6)}`, userId: "user_1", name: "Growth Ops" },
    { id: `skill_${nanoid(6)}`, userId: "user_3", name: "API Design" },
    { id: `skill_${nanoid(6)}`, userId: "user_2", name: "Creative Direction" }
  ];

  const endorsements = [
    { id: `end_${nanoid(6)}`, fromId: "user_3", toId: "user_1", skill: "Product Strategy" },
    { id: `end_${nanoid(6)}`, fromId: "user_2", toId: "user_1", skill: "Growth Ops" }
  ];

  const recommendations = [
    {
      id: `rec_${nanoid(6)}`,
      fromId: "user_3",
      toId: "user_1",
      text:
        "Avery brings calm structure to fast teams and ships with clarity. The best partner for messy projects.",
      createdAt: now()
    },
    {
      id: `rec_${nanoid(6)}`,
      fromId: "user_2",
      toId: "user_1",
      text:
        "Avery sees the signal before anyone else and knows how to rally a team around it.",
      createdAt: now()
    }
  ];

  const messages = [
    {
      id: `msg_${nanoid(6)}`,
      fromId: "user_2",
      toId: "user_1",
      body: "Loved your onboarding post. Can I borrow the checklist?",
      createdAt: now()
    },
    {
      id: `msg_${nanoid(6)}`,
      fromId: "user_1",
      toId: "user_2",
      body: "Totally. Sending it over.",
      createdAt: now()
    },
    {
      id: `msg_${nanoid(6)}`,
      fromId: "user_1",
      groupId: groupIds.pro,
      body: "Sharing the new ritual doc. Thoughts?",
      createdAt: now()
    },
    {
      id: `msg_${nanoid(6)}`,
      fromId: "user_3",
      groupId: groupIds.pro,
      body: "Love it. The check-in template is solid.",
      createdAt: now()
    }
  ];

  db.data.users = users;
  db.data.posts = posts;
  db.data.connections = connections;
  db.data.messages = messages;
  db.data.jobs = jobs;
  db.data.companies = companies;
  db.data.stories = stories;
  db.data.reels = reels;
  db.data.notifications = notifications;
  db.data.groups = groups;
  db.data.events = events;
  db.data.skills = skills;
  db.data.endorsements = endorsements;
  db.data.recommendations = recommendations;
  db.data.meta.currentUserId = "user_1";

  await db.write();
}
