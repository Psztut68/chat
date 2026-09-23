export function ProfilePicture(args) {
    const size = args.size || "32px";
    const initials = (args.name || "?")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    const image = args.avatar || null;

    const commonStyle = {
        cursor: args.onClick ? "pointer" : undefined,
    };

    if (!image) {
        return (
            <span
                aria-label={args.name}
                style={{
                    alignItems: "center",
                    backgroundColor: args.color || "#5865f2",
                    borderRadius: "50%",
                    display: "inline-flex",
                    height: size,
                    justifyContent: "center",
                    minHeight: size,
                    minWidth: size,
                    overflow: "hidden",
                    width: size,
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 700,
                    ...commonStyle,
                }}
                onClick={args.onClick}
            >
                {initials}
            </span>
        );
    }

    return (
        <img
            src={image}
            alt={args.name}
            style={{
                borderRadius: "50%",
                display: "block",
                flexShrink: 0,
                height: size,
                objectFit: "cover",
                width: size,
                ...commonStyle,
            }}
            onClick={args.onClick}
        />
    );
}
