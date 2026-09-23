import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./settingscontent.module.css";

import {
    addFriend,
    getCurrentUser,
    listUsers,
    removeFriend,
    signOut,
    subscribeData,
    updateUser,
} from "../../localstore.js";

import { ProfilePicture } from "../profilepicture";

export function SettingsContent() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState();
    const [displayname, setDisplayname] = useState("");
    const [color, setColor] = useState("#5865f2");
    const [status, setStatus] = useState("");
    const [description, setDescription] = useState("");
    const [avatar, setAvatar] = useState("");
    const [saved, setSaved] = useState(false);
    const [friendUsername, setFriendUsername] = useState("");
    const [users, setUsers] = useState([]);
    const [friendError, setFriendError] = useState("");

    const getUserInfo = async () => {
        const user = await getCurrentUser();
        setCurrentUser(user);
        setDisplayname(user?.profile.displayname || "");
        setColor(user?.profile.color || "#5865f2");
        setStatus(user?.profile.status || "");
        setDescription(user?.profile.description || "");
        setAvatar(user?.profile.avatar || "");
        setUsers(await listUsers());
    };

    const saveProfile = async (event) => {
        event.preventDefault();
        if (!currentUser || !displayname.trim()) return;

        const user = await updateUser(currentUser.account.uid, {
            displayname: displayname.trim(),
            color,
            status: status.trim(),
            description: description.trim(),
            avatar,
        });
        setCurrentUser(user);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2000);
    };

    const handleAvatar = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setAvatar(String(reader.result));
        reader.readAsDataURL(file);
    };

    const handleSignOut = async () => {
        await signOut();
    };

    const handleAddFriend = async (event) => {
        event.preventDefault();
        try {
            await addFriend(friendUsername);
            setFriendUsername("");
            setFriendError("");
            await getUserInfo();
        } catch (error) {
            setFriendError(error.message);
        }
    };

    useEffect(() => {
        getUserInfo();
        const unsubscribe = subscribeData(getUserInfo);
        return unsubscribe;
    }, []);

    return (
        <div className={styles["settings"]}>
            <div className={styles["settings-sidebar"]}>
                <div className={styles["settings-sidebar-items"]}>
                    <div className={styles["settings-sidebar-title"]}>
                        User Settings
                    </div>
                    <div className={styles["settings-sidebar-item"]}>
                        My Account
                    </div>
                    <div className={styles["settings-sidebar-item"]}>
                        Security
                    </div>
                </div>
                <div className={styles["settings-friends"]}>
                    <h2>Friends</h2>
                    <form onSubmit={handleAddFriend}>
                        <input
                            placeholder="Username"
                            value={friendUsername}
                            onChange={(event) => setFriendUsername(event.target.value)}
                        />
                        <button type="submit">Add friend</button>
                    </form>
                    {friendError ? <p className={styles["friend-error"]}>{friendError}</p> : null}
                    {(currentUser?.account.friends || []).map((friendId) => {
                        const friend = users.find((item) => item.account.uid === friendId);
                        if (!friend) return null;
                        return (
                            <div className={styles["friend-row"]} key={friendId}>
                                <span>{friend.profile.displayname} @{friend.account.username}</span>
                                <button type="button" onClick={() => removeFriend(friendId).then(getUserInfo)}>
                                    Remove
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className={styles["settings-main"]}>
                <div className={styles["settings-main-card"]}>
                    <div className={styles["settings-main-card-title"]}>
                        {currentUser ? (
                            <ProfilePicture
                                name={currentUser.profile.displayname}
                                color={currentUser.profile.color}
                                avatar={avatar}
                                size="80px"
                            />
                        ) : null}
                        <h1>
                            @{currentUser ? currentUser.account.username : null}
                        </h1>
                    </div>
                    <form
                        className={styles["settings-main-card-content"]}
                        onSubmit={saveProfile}
                    >
                        <label>
                            Profile image
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/gif,image/webp"
                                onChange={handleAvatar}
                            />
                        </label>
                        <label>
                            Display name
                            <input
                                value={displayname}
                                onChange={(event) =>
                                    setDisplayname(event.target.value)
                                }
                                required
                            />
                        </label>
                        <label>
                            Status
                            <input
                                value={status}
                                onChange={(event) => setStatus(event.target.value)}
                            />
                        </label>
                        <label>
                            About me
                            <textarea
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                rows="3"
                                maxLength="240"
                            />
                        </label>
                        <label>
                            Color
                            <input
                                type="color"
                                value={color}
                                onChange={(event) => setColor(event.target.value)}
                            />
                        </label>
                        <button type="submit">
                            {saved ? "Saved" : "Save changes"}
                        </button>
                        <button type="button" onClick={handleSignOut}>
                            Sign out
                        </button>
                        <button type="button" onClick={() => navigate("/app")}>
                            Return to app
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
