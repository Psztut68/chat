import { logError } from "./diagnostics.js";

const STORAGE_KEY = "chat-local-data";
const SESSION_KEY = "chat-local-session";
const authListeners = new Set();
const messageListeners = new Map();
const dataListeners = new Set();

const emptyData = {
    info: {},
    users: {},
    credentials: {},
    servers: {},
    online: { people: [] },
    messages: {},
};

let dataPromise;
let dataCache;
let pollTimer;

function createId(prefix) {
    const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    return `${prefix}-${suffix}`;
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function normalizeData(value) {
    const data = value && typeof value === "object" ? value : {};
    return {
        ...emptyData,
        ...data,
        info: { appIcon: "/src/assets/icon.png", ...(data.info || {}) },
        users: { ...(data.users || {}) },
        credentials: { ...(data.credentials || {}) },
        servers: { ...(data.servers || {}) },
        online: data.online || { people: [] },
        messages: { ...(data.messages || {}) },
    };
}

function mergeData(base, saved) {
    base = normalizeData(base);
    saved = normalizeData(saved);
    const data = normalizeData({
        ...base,
        ...saved,
        info: { ...base.info, ...saved.info },
        users: { ...base.users, ...saved.users },
        credentials: { ...base.credentials, ...saved.credentials },
        servers: { ...base.servers, ...saved.servers },
        online: saved.online || base.online,
        messages: { ...base.messages, ...saved.messages },
    });

    if (data.currentUserId) {
        Object.keys(data.messages)
            .filter((key) => key.startsWith("dms/") && key.endsWith("-"))
            .forEach((legacyKey) => {
                const otherUserId = legacyKey.slice(4, -1);
                const migratedKey = channelKey("dms", otherUserId, data.currentUserId);
                data.messages[migratedKey] = {
                    ...(data.messages[migratedKey] || {}),
                    ...data.messages[legacyKey],
                };
                delete data.messages[legacyKey];
            });
    }

    const sessionId = localStorage.getItem(SESSION_KEY) || data.currentUserId;
    Object.values(data.servers).forEach((server) => {
        server.config ||= {};
        server.config.admins ||= [];
        server.config.members ||= [];
        server.config.bans ||= [];
        server.config.timeouts ||= {};
        if (!server.config.owner && sessionId) server.config.owner = sessionId;
        server.config.inviteCode ||= createId("invite");
    });

    return data;
}

function removeDemoUsers(data) {
    data = normalizeData(data);
    ["local-demo", "local-friend"].forEach((uid) => {
        delete data.users[uid];
        delete data.credentials[uid];
    });
    return data;
}

function notifyData() {
    dataListeners.forEach((listener) => listener());
    authListeners.forEach(async (listener) => listener(await getCurrentUser()));
    messageListeners.forEach((listeners, key) => {
        listMessages(key).then((messages) =>
            listeners.forEach((listener) => listener(messages))
        );
    });
}

function startPolling() {
    if (pollTimer) return;
    pollTimer = window.setInterval(async () => {
        try {
            const response = await fetch(`${import.meta.env.BASE_URL}receive`, {
                cache: "no-store",
            });
            if (!response.ok) return;
            const next = removeDemoUsers(await response.json());
            if (JSON.stringify(next) !== JSON.stringify(dataCache)) {
                dataCache = next;
                dataPromise = Promise.resolve(dataCache);
                notifyData();
            }
        } catch (error) {
            logError("Could not poll local data", error.message);
        }
    }, 2000);
}

async function loadData() {
    if (!dataPromise) {
        const readJson = async (url) => {
            const response = await fetch(url, { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return JSON.parse(await response.text());
        };

        dataPromise = readJson(`${import.meta.env.BASE_URL}receive`)
            .then((base) => ({ base, remote: true }))
            .catch((error) => {
                logError("Could not receive local data", error.stack || error.message);
                try {
                    return {
                        base: JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || emptyData,
                        remote: false,
                    };
                } catch {
                    return { base: emptyData, remote: false };
                }
            })
            .then(({ base, remote }) => {
                let saved = null;
                try {
                    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
                } catch {
                    logError("Local storage contained invalid JSON");
                    localStorage.removeItem(STORAGE_KEY);
                }
                dataCache = removeDemoUsers(remote ? normalizeData(base) : mergeData(base, saved || {}));
                if (!localStorage.getItem(SESSION_KEY) && dataCache.currentUserId) {
                    localStorage.setItem(SESSION_KEY, dataCache.currentUserId);
                    delete dataCache.currentUserId;
                }
                startPolling();
                return dataCache;
            });
    }

    return dataPromise;
}

async function saveData(data) {
    const serverData = clone(data);
    delete serverData.currentUserId;
    try {
        const response = await fetch(`${import.meta.env.BASE_URL}post`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(serverData),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        dataCache = serverData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverData));
    } catch (error) {
        logError("Could not post local data; using browser fallback", error.stack || error.message);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverData));
    }
    notifyData();
}

function notifyAuth(user) {
    authListeners.forEach((listener) => listener(user));
}

function notifyMessages(channelKey, messages) {
    (messageListeners.get(channelKey) || []).forEach((listener) =>
        listener(clone(messages))
    );
}

export async function getCurrentUser() {
    const data = await loadData();
    return data.users[localStorage.getItem(SESSION_KEY)] || null;
}

export function subscribeData(listener) {
    dataListeners.add(listener);
    listener();
    return () => dataListeners.delete(listener);
}

export function subscribeAuth(listener) {
    getCurrentUser().then(listener);
    authListeners.add(listener);
    return () => authListeners.delete(listener);
}

export async function signIn(username, password) {
    const data = await loadData();
    const normalizedUsername = username.trim().toLowerCase();
    let user = Object.values(data.users).find(
        (candidate) => candidate.account.username.toLowerCase() === normalizedUsername
    );

    if (user && data.credentials[user.account.uid] !== password) {
        const error = new Error("Incorrect username or password");
        logError("Sign-in failed", error.message);
        throw error;
    }

    if (!user) {
        const uid = createId("local");
        user = {
            account: {
                uid,
                username: normalizedUsername,
                admin: false,
                banned: false,
                friends: [],
                friendRequests: { incoming: [], outgoing: [] },
            },
            profile: {
                color: "#5865f2",
                displayname: username.trim(),
                verified: false,
                status: "Available locally",
            },
            servers: [],
        };
        data.users[uid] = user;
        data.credentials[uid] = password;
    }

    if (user.account.banned) {
        throw new Error("This user is banned");
    }

    localStorage.setItem(SESSION_KEY, user.account.uid);
    await saveData(data);
    notifyAuth(clone(user));
    return clone(user);
}

export async function signOut() {
    localStorage.removeItem(SESSION_KEY);
    notifyAuth(null);
}

export async function getInfo() {
    return clone((await loadData()).info);
}

export async function listUsers() {
    return clone(Object.values((await loadData()).users));
}

export async function getUser(uid) {
    return clone((await loadData()).users[uid] || null);
}

function prepareFriendData(user) {
    if (!user) return null;
    user.account.friends ||= [];
    user.account.friendRequests ||= { incoming: [], outgoing: [] };
    return user;
}

export async function addFriend(username) {
    const data = await loadData();
    const currentUser = prepareFriendData(data.users[localStorage.getItem(SESSION_KEY)]);
    const target = Object.values(data.users).find(
        (user) => user.account.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (!currentUser || !target) throw new Error("User not found");
    prepareFriendData(target);
    if (target.account.uid === currentUser.account.uid) throw new Error("You cannot add yourself");
    if (currentUser.account.friends.includes(target.account.uid)) throw new Error("Already friends");
    if (!currentUser.account.friendRequests.outgoing.includes(target.account.uid)) {
        currentUser.account.friendRequests.outgoing.push(target.account.uid);
        target.account.friendRequests.incoming.push(currentUser.account.uid);
    }
    await saveData(data);
}

export async function acceptFriend(requesterId) {
    const data = await loadData();
    const currentUser = prepareFriendData(data.users[localStorage.getItem(SESSION_KEY)]);
    const requester = prepareFriendData(data.users[requesterId]);
    if (!currentUser || !requester) throw new Error("User not found");
    currentUser.account.friendRequests.incoming = currentUser.account.friendRequests.incoming.filter((id) => id !== requesterId);
    requester.account.friendRequests.outgoing = requester.account.friendRequests.outgoing.filter((id) => id !== currentUser.account.uid);
    if (!currentUser.account.friends.includes(requesterId)) currentUser.account.friends.push(requesterId);
    if (!requester.account.friends.includes(currentUser.account.uid)) requester.account.friends.push(currentUser.account.uid);
    await saveData(data);
}

export async function removeFriend(friendId) {
    const data = await loadData();
    const currentUser = prepareFriendData(data.users[localStorage.getItem(SESSION_KEY)]);
    const friend = prepareFriendData(data.users[friendId]);
    if (!currentUser || !friend) throw new Error("User not found");
    currentUser.account.friends = currentUser.account.friends.filter((id) => id !== friendId);
    friend.account.friends = friend.account.friends.filter((id) => id !== currentUser.account.uid);
    await saveData(data);
}

export async function updateUser(uid, profileChanges) {
    const data = await loadData();
    const user = data.users[uid];
    if (!user) throw new Error("User not found");

    user.profile = { ...user.profile, ...profileChanges };
    await saveData(data);
    notifyAuth(clone(user));
    return clone(user);
}

function getSessionId() {
    return localStorage.getItem(SESSION_KEY);
}

function canManageServer(server, uid) {
    return server?.config.owner === uid || server?.config.admins?.includes(uid);
}

export async function updateServer(serverId, changes) {
    const data = await loadData();
    const server = data.servers[serverId];
    if (!canManageServer(server, getSessionId())) throw new Error("You cannot manage this server");
    server.info = { ...server.info, ...(changes.info || {}) };
    server.config = { ...server.config, ...(changes.config || {}) };
    await saveData(data);
    return clone(server);
}

export async function addServerChannel(serverId, name, description = "") {
    const data = await loadData();
    const server = data.servers[serverId];
    if (!canManageServer(server, getSessionId())) throw new Error("You cannot manage this server");
    const channelName = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (!channelName || server.channels.some((channel) => channel.name === channelName)) {
        throw new Error("Channel already exists");
    }
    server.channels.push({ name: channelName, type: "text", description: description.trim() });
    await saveData(data);
    return clone(server);
}

export async function removeServerChannel(serverId, channelName) {
    const data = await loadData();
    const server = data.servers[serverId];
    if (!canManageServer(server, getSessionId())) throw new Error("You cannot manage this server");
    if (server.config.mainchannel === channelName || server.channels.length <= 1) {
        throw new Error("The main or last channel cannot be removed");
    }
    server.channels = server.channels.filter((channel) => channel.name !== channelName);
    await saveData(data);
}

export async function setServerAdmin(serverId, userId, enabled) {
    const data = await loadData();
    const server = data.servers[serverId];
    if (server?.config.owner !== getSessionId()) throw new Error("Only the owner can change roles");
    server.config.admins ||= [];
    server.config.admins = enabled
        ? [...new Set([...server.config.admins, userId])]
        : server.config.admins.filter((id) => id !== userId);
    await saveData(data);
}

export async function addServerMember(serverId, userId) {
    const data = await loadData();
    const server = data.servers[serverId];
    if (!canManageServer(server, getSessionId())) throw new Error("You cannot manage this server");
    server.config.members ||= [];
    if (!server.config.members.includes(userId)) server.config.members.push(userId);
    await saveData(data);
}

export async function moderateServerMember(serverId, userId, action, duration = 600000) {
    const data = await loadData();
    const server = data.servers[serverId];
    const actorId = getSessionId();
    if (!canManageServer(server, actorId) || userId === server.config.owner) {
        throw new Error("You cannot moderate this member");
    }
    server.config.members ||= [];
    server.config.bans ||= [];
    server.config.timeouts ||= {};
    if (action === "kick") {
        server.config.members = server.config.members.filter((id) => id !== userId);
    } else if (action === "ban") {
        server.config.members = server.config.members.filter((id) => id !== userId);
        if (!server.config.bans.includes(userId)) server.config.bans.push(userId);
    } else if (action === "timeout") {
        server.config.timeouts[userId] = Date.now() + duration;
    }
    await saveData(data);
}

export async function createServer({ name, description, mainchannel, channels, icon, banner }) {
    const data = await loadData();
    const id = createId("server");
    const channelList = channels
        .map((channel) => channel.trim())
        .filter(Boolean);
    const defaultChannel = mainchannel.trim() || channelList[0] || "general";

    if (!channelList.includes(defaultChannel)) channelList.unshift(defaultChannel);

    const server = {
        config: {
            id,
            mainchannel: defaultChannel,
            owner: getSessionId(),
            admins: [],
            members: getSessionId() ? [getSessionId()] : [],
            bans: [],
            timeouts: {},
            inviteCode: createId("invite"),
        },
        info: {
            name: name.trim(),
            description: description.trim(),
            icon: icon.trim(),
            banner: banner.trim(),
        },
        channels: channelList.map((channel) => ({
            name: channel,
            type: "text",
            description: "",
        })),
    };

    data.servers[id] = server;
    await saveData(data);
    return clone(server);
}

export async function joinServerByInvite(serverId, inviteCode) {
    const data = await loadData();
    const server = data.servers[serverId];
    const userId = getSessionId();
    if (!server || server.config.inviteCode !== inviteCode) throw new Error("Invalid invite link");
    if (!userId) throw new Error("Sign in before joining a server");
    if (server.config.bans?.includes(userId)) throw new Error("You are banned from this server");
    server.config.members ||= [];
    if (!server.config.members.includes(userId)) server.config.members.push(userId);
    await saveData(data);
    return clone(server);
}

export async function listServers() {
    return clone(Object.values((await loadData()).servers));
}

export async function getServer(serverId) {
    return clone((await loadData()).servers[serverId] || null);
}

export async function getOnline() {
    return clone((await loadData()).online);
}

export function channelKey(server, channel, userId) {
    if (server === "dms") {
        return `dms/${[userId, channel].sort().join("-")}`;
    }
    return `${server}/channels/${channel}`;
}

export async function listMessages(key) {
    const data = await loadData();
    const messages = data.messages[key] || {};
    return Object.fromEntries(
        Object.entries(messages).sort(
            ([, first], [, second]) => second.timestamp - first.timestamp
        )
    );
}

export function subscribeMessages(key, listener) {
    if (!messageListeners.has(key)) messageListeners.set(key, []);
    messageListeners.get(key).push(listener);
    listMessages(key).then(listener);

    return () => {
        const listeners = messageListeners.get(key) || [];
        messageListeners.set(key, listeners.filter((item) => item !== listener));
    };
}

export async function addMessage(key, message) {
    const data = await loadData();
    if (key.includes("/channels/")) {
        const serverId = key.split("/channels/")[0];
        const server = data.servers[serverId];
        const userId = message.uid;
        if (server?.config.members && !server.config.members.includes(userId)) {
            throw new Error("You are not a member of this server");
        }
        if (server?.config.bans?.includes(userId)) {
            throw new Error("You are banned from this server");
        }
        if (server?.config.timeouts?.[userId] > Date.now()) {
            throw new Error("You are timed out in this server");
        }
    }
    if (!data.messages[key]) data.messages[key] = {};
    const id = createId("message");
    data.messages[key][id] = {
        ...message,
        timestamp: Math.floor(Date.now() / 1000),
    };
    await saveData(data);
    notifyMessages(key, await listMessages(key));
}
