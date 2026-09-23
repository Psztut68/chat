import { useState, useEffect } from "react";
import styles from "./newmessage.module.css";

import {
    addMessage,
    channelKey,
    getServer,
    getUser,
} from "../../localstore.js";
import { useLocalAuth } from "../../useLocalAuth.jsx";
import { logError } from "../../diagnostics.js";

import { useChat } from "../../chatcontext";
import { handleCommand } from "./commands";

export function NewMessage() {
    const [user] = useLocalAuth();
    const { currentServer, currentChannel } = useChat();
    const [message, setMessage] = useState("");
    const [pendingEmbed, setPendingEmbed] = useState(null);
    const [embedDraft, setEmbedDraft] = useState({ title: "", description: "", url: "", image: "", color: "#5865f2" });
    const [showEmbedEditor, setShowEmbedEditor] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [moreChannelInfo, setMoreChannelInfo] = useState({});

    const getMoreChannelInfo = async () => {
        if (!currentServer || !currentChannel) {
            return;
        }

        if (currentServer === "dms") {
            const usersData = await getUser(currentChannel);

            setMoreChannelInfo({ type: "user", data: usersData });
        } else {
            const serverData = await getServer(currentServer);

            setMoreChannelInfo({
                type: "channel",
                data: serverData.channels.find(
                    (c) => c.name === currentChannel
                ),
            });
        }
    };

    useEffect(() => {
        getMoreChannelInfo();
    }, [currentChannel, currentServer]);

    const sendMessage = async (e) => {
        e.preventDefault();

        if ((!message.trim() && !pendingEmbed) || !user || !currentChannel) {
            setMessage("");
            return
        }

        if (currentServer === "dms" && currentChannel === user.account.uid) {
            setMessage("");
            return;
        }

        let content = pendingEmbed;
        let bot = false;
        let embed = Boolean(pendingEmbed);
        let command;

        if (!pendingEmbed && message.startsWith("/")) {
            let getCommand = await handleCommand(message);
            bot = true;
            if (getCommand.type === "text") {
                content = getCommand.res;
            }
            if (getCommand.type === "embed") {
                embed = true;
                content = getCommand.res;
            }
            command = message;
        } else if (!pendingEmbed) {
            content = message;
        }

        setMessage("");
        setPendingEmbed(null);

        try {
            await addMessage(channelKey(currentServer, currentChannel, user.account.uid), {
                bot: Boolean(bot),
                message: {
                    command: bot ? command : null,
                    content: embed ? null : `${content}`,
                    embed: embed ? content : null,
                },
                uid: user.account.uid,
            });
        } catch (error) {
            logError("Could not send message", error.stack || error.message);
            setMessage(message);
        }
    };

    const chooseGif = () => {
        const url = window.prompt("Paste a GIF URL");
        if (!url?.trim()) return;
        setPendingEmbed({
            title: "GIF",
            url: url.trim(),
            image: url.trim(),
            color: "#5865f2",
        });
    };

    const chooseEmbed = () => {
        setEmbedDraft(pendingEmbed || { title: "", description: "", url: "", image: "", color: "#5865f2" });
        setShowEmbedEditor(true);
    };

    const handleAttachment = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setPendingEmbed({
            title: file.name,
            description: "Attachment",
            image: String(reader.result),
            color: "#5865f2",
        });
        reader.readAsDataURL(file);
    };

    const emojis = ["😀", "😂", "😍", "😎", "😢", "😡", "👍", "❤️", "🎉", "🔥"];

    return (
        <>
            {showEmbedEditor ? (
                <div className={styles["embed-editor-backdrop"]}>
                    <form className={styles["embed-editor"]} onSubmit={(event) => {
                        event.preventDefault();
                        setPendingEmbed(embedDraft);
                        setShowEmbedEditor(false);
                    }}>
                        <h2>Edit embed</h2>
                        <input placeholder="Title" value={embedDraft.title} onChange={(event) => setEmbedDraft({ ...embedDraft, title: event.target.value })} required />
                        <textarea placeholder="Description" value={embedDraft.description} onChange={(event) => setEmbedDraft({ ...embedDraft, description: event.target.value })} />
                        <input placeholder="Link URL" value={embedDraft.url} onChange={(event) => setEmbedDraft({ ...embedDraft, url: event.target.value })} />
                        <input placeholder="Image URL" value={embedDraft.image} onChange={(event) => setEmbedDraft({ ...embedDraft, image: event.target.value })} />
                        <input type="color" value={embedDraft.color} onChange={(event) => setEmbedDraft({ ...embedDraft, color: event.target.value })} />
                        <div className={styles["embed-editor-actions"]}>
                            <button type="button" onClick={() => setShowEmbedEditor(false)}>Cancel</button>
                            <button type="submit">Use embed</button>
                        </div>
                    </form>
                </div>
            ) : null}
            <form
                className={styles["create"]}
                onSubmit={sendMessage}
                autoComplete="off"
            >
            <div className={styles["typing-indicator"]}></div>
            <div className={styles["message-create-button"]} id="file-upload">
                <label htmlFor="fileUpload">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                        id="file-upload-icon"
                    >
                        <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM232 344V280H168c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V168c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H280v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z" />
                    </svg>
                </label>
                <input
                    type="file"
                    id="fileUpload"
                    style={{ display: "none" }}
                    accept="image/*"
                    onChange={handleAttachment}
                />
            </div>
            <input
                className={styles["message-create"]}
                id="created-message"
                placeholder={
                    currentChannel
                        ? moreChannelInfo != null
                            ? Object.keys(moreChannelInfo).length !== 0
                                ? moreChannelInfo.type == "user"
                                    ? "Message @" +
                                      moreChannelInfo.data.account.username
                                    : "Message #" + moreChannelInfo.data.name
                                : "Message nobody"
                            : "Message nobody"
                        : "Message nobody"
                }
                value={message}
                disabled={!user || !currentChannel}
                onChange={(event) => setMessage(event.target.value)}
                autoFocus
            />
            <button type="button" className={styles["message-create-button"]} id="gif-picker" onClick={chooseGif}>
                <span className={styles["button-label"]}>GIF</span>
            </button>
            <button type="button" className={styles["message-create-button"]} id="embed-picker" onClick={chooseEmbed}>
                <span className={styles["button-label"]}>Embed</span>
            </button>
            <div
                className={styles["message-create-button"]}
                id="emoji-picker"
                onClick={() => setShowEmojiPicker((visible) => !visible)}
            >
                <span className={styles["button-label"]}>😊</span>
                {showEmojiPicker ? (
                    <span className={styles["emoji-picker-div"]}>
                        {emojis.map((emoji) => (
                            <button
                                type="button"
                                key={emoji}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setMessage((value) => `${value}${emoji}`);
                                    setShowEmojiPicker(false);
                                }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </span>
                ) : null}
            </div>
            </form>
        </>
    );
}
