import { useState, useEffect } from "react";
import styles from "./online.module.css";

import { listUsers, subscribeData } from "../../localstore.js";

import { ProfilePicture } from "../profilepicture";

export function Online() {
    const [onlineUsers, setOnlineUsers] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const users = await listUsers();
            setOnlineUsers(users.map((user) => ({
                id: user.account.uid,
                name: user.profile.displayname,
                color: user.profile.color,
                avatar: user.profile.avatar,
                verified: user.profile.verified,
                status: user.profile.status || "Online",
            })));
        };
        fetchData();
        const unsubscribe = subscribeData(fetchData);
        return unsubscribe;
    }, []);

    return (
        <div className={styles["online-sidebar"]}>
            <span className={styles["online-title"]} id="online-title">
                Online - {onlineUsers.length}
            </span>
            <div className={styles["online-list"]} id="online-list">
                {onlineUsers.map((user) => (
                        <div key={user.id} className={styles["online-user"]}>
                            <ProfilePicture name={user.name} color={user.color} avatar={user.avatar} size="32px" />
                            <div>
                                <p
                                    style={{
                                        color: user.color,
                                    }}
                                >
                                    {user.name}
                                    {user.verified ? (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            style={{ fill: user.color }}
                                            className={
                                                styles["online-user-verified"]
                                            }
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                                        </svg>
                                    ) : (
                                        ""
                                    )}
                                </p>
                                <p
                                    style={{
                                        fontSize: "14px",
                                        fontWeight: "normal",
                                    }}
                                >
                                    {user.status}
                                </p>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}
