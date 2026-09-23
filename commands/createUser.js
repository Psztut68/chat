const fs = require("fs");
const path = require("path");
const prompt = require("prompt-sync")({ sigint: true });

const dataPath = path.join(__dirname, "..", "public", "data.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const username = prompt("Username: ").trim().toLowerCase();
const password = prompt("Password: ");
const admin = prompt("Admin (y/n): ").toLowerCase() === "y";
const uid = `local-${Date.now()}`;

data.users[uid] = {
    account: { uid, username, admin, banned: false },
    profile: {
        color: "#5865f2",
        displayname: username,
        verified: false,
        status: "",
    },
    servers: [],
};
data.credentials[uid] = password;
fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Created local user @${username}.`);