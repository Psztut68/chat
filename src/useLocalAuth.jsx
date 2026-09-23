import { useEffect, useState } from "react";

import { getCurrentUser, subscribeAuth } from "./localstore.js";

export function useLocalAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        getCurrentUser().then((currentUser) => {
            if (active) {
                setUser(currentUser);
                setLoading(false);
            }
        });

        const unsubscribe = subscribeAuth((currentUser) => {
            if (active) setUser(currentUser);
        });

        return () => {
            active = false;
            unsubscribe();
        };
    }, []);

    return [user, loading, null];
}
