import styles from "./settings.module.css";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { MenuBar } from "../../components/menubar/index.jsx";
import { SettingsContent } from "../../components/settingscontent/index.jsx";
import { useLocalAuth } from "../../useLocalAuth.jsx";

import loadingImage from "../../assets/icon.png";

export function Settings() {
    const navigate = useNavigate();
    const [user, loading] = useLocalAuth();

    useEffect(() => {
        if (!loading && !user) navigate("/signin", { replace: true });
    }, [loading, user, navigate]);

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
            <>
                <MenuBar />
                <SettingsContent />
            </>
        );
    }
}
