import styles from "./app.module.css";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { MenuBar } from "../../components/menubar/index.jsx";
import { ServerList } from "../../components/serverlist/index.jsx";
import { ChannelList } from "../../components/channellist/index.jsx";
import { UserArea } from "../../components/userarea/index.jsx";
import { Messages } from "../../components/messages/index.jsx";
import { NewMessage } from "../../components/newmessage/index.jsx";
import { Online } from "../../components/online/index.jsx";

import { useLocalAuth } from "../../useLocalAuth.jsx";
import { joinServerByInvite } from "../../localstore.js";
import { ChatProvider } from "../../chatcontext.jsx";

import loadingImage from "../../assets/icon.png";

export function App() {
    const navigate = useNavigate();
    const [user, loading] = useLocalAuth();

    useEffect(() => {
        if (!loading && !user) navigate("/signin", { replace: true });
    }, [loading, user, navigate]);

    useEffect(() => {
        if (!user) return;
        const invite = new URLSearchParams(window.location.search).get("invite");
        if (!invite) return;
        const separator = invite.indexOf(".");
        if (separator === -1) return;
        joinServerByInvite(invite.slice(0, separator), invite.slice(separator + 1))
            .then(() => window.history.replaceState({}, "", "/app"))
            .catch(() => {});
    }, [user]);

    if (loading) {
        return (
            <>
                <MenuBar />
                <div className={styles["loading"]}>
                    <img src={loadingImage} />
                </div>
            </>
        );
    }

    if (!user) {
        return null;
    } else {
        return (
            <ChatProvider>
                <>
                    <MenuBar />
                    <div className={styles["content"]}>
                        <div className={styles["sidebar"]}>
                            <ServerList />
                            <ChannelList />
                            <UserArea />
                        </div>
                        <div className={styles["main"]}>
                            <Messages />
                            <NewMessage />
                        </div>
                        <Online />
                    </div>
                </>
            </ChatProvider>
        );
    }
}
