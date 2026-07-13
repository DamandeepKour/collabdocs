/**
 * In-memory realtime presence hub (single-process).
 * For multi-instance production, swap with Redis / Socket.IO adapter.
 */

export type PresenceUser = {
  userId: string;
  name: string;
  color: string;
  cursor?: { from: number; to: number } | null;
  typing?: boolean;
  updatedAt: number;
};

type Room = Map<string, PresenceUser>;

const rooms = new Map<string, Room>();
const COLORS = ["#e11d48", "#2563eb", "#059669", "#d97706", "#7c3aed", "#0891b2"];

function colorFor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash + userId.charCodeAt(i) * 17) % COLORS.length;
  return COLORS[hash]!;
}

export const presenceHub = {
  join(documentId: string, user: { userId: string; name: string }) {
    let room = rooms.get(documentId);
    if (!room) {
      room = new Map();
      rooms.set(documentId, room);
    }
    const existing = room.get(user.userId);
    const entry: PresenceUser = {
      userId: user.userId,
      name: user.name,
      color: existing?.color ?? colorFor(user.userId),
      cursor: existing?.cursor ?? null,
      typing: false,
      updatedAt: Date.now(),
    };
    room.set(user.userId, entry);
    return entry;
  },

  leave(documentId: string, userId: string) {
    rooms.get(documentId)?.delete(userId);
  },

  update(
    documentId: string,
    userId: string,
    patch: Partial<Pick<PresenceUser, "cursor" | "typing">>,
  ) {
    const room = rooms.get(documentId);
    const user = room?.get(userId);
    if (!user) return null;
    Object.assign(user, patch, { updatedAt: Date.now() });
    return user;
  },

  list(documentId: string): PresenceUser[] {
    const room = rooms.get(documentId);
    if (!room) return [];
    const now = Date.now();
    // Drop stale (>45s)
    for (const [id, u] of room) {
      if (now - u.updatedAt > 45_000) room.delete(id);
    }
    return [...room.values()];
  },
};
