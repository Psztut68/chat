import { useState, useEffect } from "react";
import styles from "./serverlist.module.css";

import {
    addServerChannel,
    addServerMember,
    createServer,
    getCurrentUser,
    getServer,
    getInfo,
    listServers,
    listUsers,
    moderateServerMember,
    removeServerChannel,
    setServerAdmin,
    subscribeData,
    updateServer,
} from "../../localstore.js";
import { useChat } from "../../chatcontext";

export function ServerList() {
    const { changeServer, changeChannel } = useChat();
    const [serverList, setServerList] = useState([]);
    const [infoDoc, setInfoDoc] = useState({});
    const [showCreate, setShowCreate] = useState(false);
    const [serverName, setServerName] = useState("");
    const [serverDescription, setServerDescription] = useState("");
    const [serverChannels, setServerChannels] = useState("general");
    const [serverError, setServerError] = useState("");
    const [manageServer, setManageServer] = useState(null);
    const [manageUsers, setManageUsers] = useState([]);
    const [manageChannel, setManageChannel] = useState("");
    const [manageChannelDescription, setManageChannelDescription] = useState("");
    const [manageMember, setManageMember] = useState("");
    const [manageName, setManageName] = useState("");
    const [manageDescription, setManageDescription] = useState("");
    const [manageIcon, setManageIcon] = useState("");
    const [manageBanner, setManageBanner] = useState("");
    const [inviteLink, setInviteLink] = useState("");

    const handleCreateServer = async (event) => {
        event.preventDefault();
        if (!serverName.trim()) return;

        try {
            const server = await createServer({
                name: serverName,
                description: serverDescription,
                mainchannel: serverChannels.split(";")[0] || "general",
                channels: serverChannels.split(";"),
                icon: "",
                banner: "",
            });
            setServerList((servers) => [...servers, server]);
            setShowCreate(false);
            setServerName("");
            setServerDescription("");
            setServerChannels("general");
            setServerError("");
        } catch (error) {
            setServerError(error.message);
        }
    };

    const closeServerSettings = () => {
        setManageServer(null);
        setManageUsers([]);
        setManageChannel("");
        setManageMember("");
    };

    const openServerSettings = async (serverId) => {
        const server = await getServer(serverId);
        if (!server) return;
        const [users, currentUser] = await Promise.all([listUsers(), getCurrentUser()]);
        const canManage = server.config.owner === currentUser?.account.uid || server.config.admins?.includes(currentUser?.account.uid);
        if (!canManage) {
            setServerError("Only the server owner or an admin can open settings.");
            return;
        }
        setManageUsers(users);
        setManageServer(server);
        setManageName(server.info.name);
        setManageDescription(server.info.description);
        setManageIcon(server.info.icon || "");
        setManageBanner(server.info.banner || "");
        setInviteLink(`${window.location.origin}/app?invite=${server.config.id}.${server.config.inviteCode}`);
    };

    const saveServerSettings = async (event) => {
        event.preventDefault();
        const server = await updateServer(manageServer.config.id, {
            info: { name: manageName, description: manageDescription, icon: manageIcon, banner: manageBanner },
        });
        setManageServer(server);
    };

    const addChannel = async (event) => {
        event.preventDefault();
        const server = await addServerChannel(manageServer.config.id, manageChannel, manageChannelDescription);
        setManageServer(server);
        setManageChannel("");
        setManageChannelDescription("");
    };

    const addMember = async (event) => {
        event.preventDefault();
        const member = manageUsers.find((item) => item.account.username === manageMember.trim().toLowerCase());
        if (!member) return;
        await addServerMember(manageServer.config.id, member.account.uid);
        setManageServer((server) => ({ ...server, config: { ...server.config, members: [...new Set([...(server.config.members || []), member.account.uid])] } }));
        setManageMember("");
    };

    const readServerImage = (field, event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (field === "icon") setManageIcon(String(reader.result));
            if (field === "banner") setManageBanner(String(reader.result));
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        const fetchData = async () => {
            const infoData = await getInfo();
            setInfoDoc(infoData);

            const [serverData, currentUser] = await Promise.all([listServers(), getCurrentUser()]);
            const userId = currentUser?.account.uid;
            setServerList(serverData.filter((server) =>
                server.config.owner === userId ||
                server.config.admins?.includes(userId) ||
                server.config.members?.includes(userId)
            ));
        };
        fetchData();
        const unsubscribe = subscribeData(fetchData);
        return unsubscribe;
    }, []);

    return (
        <div className={styles["server-sidebar"]} id="server-list">
            <div
                className={styles["server-sidebar-icon"]}
                key="dms"
                onClick={() => {
                    changeServer("dms");
                    changeChannel("");
                }}
            >
                <img src={infoDoc.appIcon} alt={`DMs`} />
            </div>
            {serverList.map((server) => (
                <div
                    className={styles["server-sidebar-icon"]}
                    key={server.config.id}
                    onClick={() => {
                        changeServer(server.config.id);
                        changeChannel(server.config.mainchannel);
                    }}
                    onContextMenu={(event) => {
                        event.preventDefault();
                        openServerSettings(server.config.id);
                    }}
                >
                    <img src={server.info.icon || infoDoc.appIcon} alt={server.info.name} />
                    <button
                        type="button"
                        className={styles["server-settings-trigger"]}
                        aria-label={`Settings for ${server.info.name}`}
                        onClick={(event) => {
                            event.stopPropagation();
                            openServerSettings(server.config.id);
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                    >
                        ⚙
                    </button>
                </div>
            ))}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 448 512"
                id="addServer"
                className={styles["server-sidebar-plus"]}
                onClick={() => setShowCreate(true)}
                role="button"
                tabIndex="0"
            >
                <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32v144H48c-17.7 0-32 14.3-32 32s14.3 32 32 32h144v144c0 17.7 14.3 32 32 32s32-14.3 32-32V288h144c17.7 0 32-14.3 32-32s-14.3-32-32-32H256z" />
            </svg>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                id="findServer"
                className={styles["server-sidebar-plus"]}
            >
                <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm50.7-186.9L162.4 380.6c-19.4 7.5-38.5-11.6-31-31l55.5-144.3c3.3-8.5 9.9-15.1 18.4-18.4l144.3-55.5c19.4-7.5 38.5 11.6 31 31L325.1 306.7c-3.2 8.5-9.9 15.1-18.4 18.4zM288 256a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z" />
            </svg>
            {showCreate ? (
                <div className={styles["server-modal-backdrop"]}>
                    <form className={styles["server-modal"]} onSubmit={handleCreateServer}>
                        <h2>Create a server</h2>
                        <input
                            placeholder="Server name"
                            value={serverName}
                            onChange={(event) => setServerName(event.target.value)}
                            required
                            autoFocus
                        />
                        <textarea
                            placeholder="Description"
                            value={serverDescription}
                            onChange={(event) => setServerDescription(event.target.value)}
                        />
                        <input
                            placeholder="Channels separated by ;"
                            value={serverChannels}
                            onChange={(event) => setServerChannels(event.target.value)}
                        />
                        {serverError ? <p className={styles["server-error"]}>{serverError}</p> : null}
                        <div className={styles["server-modal-actions"]}>
                            <button type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                            <button type="submit">Create</button>
                        </div>
                    </form>
                </div>
            ) : null}
            {manageServer ? (
                <div className={styles["server-modal-backdrop"]} onClick={closeServerSettings}>
                    <section className={styles["server-modal"]} onClick={(event) => event.stopPropagation()}>
                        <h2>Server settings</h2>
                        <div className={styles["invite-preview"]}>
                            <strong>Invite people</strong>
                            <span>Share this link to let someone join this server.</span>
                            <code>{inviteLink}</code>
                            <button type="button" onClick={() => navigator.clipboard?.writeText(inviteLink)}>Copy invite</button>
                        </div>
                        <form onSubmit={saveServerSettings}>
                            <input value={manageName} onChange={(event) => setManageName(event.target.value)} placeholder="Server name" />
                            <textarea value={manageDescription} onChange={(event) => setManageDescription(event.target.value)} placeholder="Description" />
                            <input value={manageIcon} onChange={(event) => setManageIcon(event.target.value)} placeholder="Icon URL or data URL" />
                            <input type="file" accept="image/*" onChange={(event) => readServerImage("icon", event)} />
                            <input value={manageBanner} onChange={(event) => setManageBanner(event.target.value)} placeholder="Banner URL or data URL" />
                            <input type="file" accept="image/*" onChange={(event) => readServerImage("banner", event)} />
                            <button type="submit">Save server</button>
                        </form>
                        <h3>Channels</h3>
                        {manageServer.channels.map((channel) => (
                            <div className={styles["manage-row"]} key={channel.name}>
                                <span>#{channel.name}</span>
                                <button type="button" onClick={() => removeServerChannel(manageServer.config.id, channel.name)}>Remove</button>
                            </div>
                        ))}
                        <form onSubmit={addChannel} className={styles["manage-form"]}>
                            <input value={manageChannel} onChange={(event) => setManageChannel(event.target.value)} placeholder="New channel" />
                            <input value={manageChannelDescription} onChange={(event) => setManageChannelDescription(event.target.value)} placeholder="Description" />
                            <button type="submit">Add channel</button>
                        </form>
                        <h3>Members and roles</h3>
                        {manageUsers.filter((member) => manageServer.config.members?.includes(member.account.uid)).map((member) => (
                            <div className={styles["manage-row"]} key={member.account.uid}>
                                <span>@{member.account.username} {manageServer.config.owner === member.account.uid ? "(owner)" : ""}</span>
                                {manageServer.config.owner !== member.account.uid ? (
                                    <span className={styles["manage-actions"]}>
                                        <button type="button" onClick={() => setServerAdmin(manageServer.config.id, member.account.uid, !manageServer.config.admins?.includes(member.account.uid))}>{manageServer.config.admins?.includes(member.account.uid) ? "Remove admin" : "Make admin"}</button>
                                        <button type="button" onClick={() => moderateServerMember(manageServer.config.id, member.account.uid, "kick")}>Kick</button>
                                        <button type="button" onClick={() => moderateServerMember(manageServer.config.id, member.account.uid, "ban")}>Ban</button>
                                        <button type="button" onClick={() => moderateServerMember(manageServer.config.id, member.account.uid, "timeout")}>Timeout</button>
                                    </span>
                                ) : null}
                            </div>
                        ))}
                        <form onSubmit={addMember} className={styles["manage-form"]}>
                            <input value={manageMember} onChange={(event) => setManageMember(event.target.value)} placeholder="Username to add" />
                            <button type="submit">Add member</button>
                        </form>
                        <button type="button" onClick={closeServerSettings}>Close</button>
                    </section>
                </div>
            ) : null}
        </div>
    );
}
