import { useEffect, useState } from "react";

import { clearLogs, getLogs, subscribeLogs } from "../../diagnostics.js";
import { MenuBar } from "../../components/menubar/index.jsx";
import styles from "./console.module.css";

export function ConsolePage() {
    const [logs, setLogs] = useState(getLogs);

    useEffect(() => subscribeLogs(setLogs), []);

    return (
        <>
            <MenuBar />
            <main className={styles.console}>
                <header className={styles.header}>
                    <div>
                        <p className={styles.eyebrow}>Diagnostics</p>
                        <h1>Application console</h1>
                        <p className={styles.description}>
                            Runtime errors and local data-layer events are stored here.
                        </p>
                    </div>
                    <button type="button" onClick={clearLogs}>
                        Clear logs
                    </button>
                </header>
                <section className={styles.logList} aria-live="polite">
                    {logs.length === 0 ? (
                        <p className={styles.empty}>No issues recorded.</p>
                    ) : (
                        logs
                            .slice()
                            .reverse()
                            .map((log) => (
                                <article
                                    className={`${styles.log} ${styles[log.level]}`}
                                    key={log.id}
                                >
                                    <div className={styles.logMeta}>
                                        <strong>{log.level}</strong>
                                        <time dateTime={log.time}>
                                            {new Date(log.time).toLocaleString()}
                                        </time>
                                    </div>
                                    <p>{log.message}</p>
                                    {log.details ? <pre>{log.details}</pre> : null}
                                </article>
                            ))
                    )}
                </section>
            </main>
        </>
    );
}
