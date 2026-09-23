const fs = require("fs");
const path = require("path");
const prompt = require("prompt-sync")({ sigint: true });

const dataPath = path.join(__dirname, "..", "public", "data.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const id = `local-${Date.now()}`;
const name = prompt("Server name: ");
const description = prompt("Description: ");
const mainchannel = prompt("Default channel: ") || "general";
const channelNames = (prompt("Channels (separated by ;): ") || "general")
    .split(";")
    .map((channel) => channel.trim())
    .filter(Boolean);

data.servers[id] = {
    config: { id, mainchannel },
    info: { name, description, icon: "", banner: "" },
    channels: channelNames.map((channel) => ({
        name: channel,
        type: "text",
        description: "",
    })),
};

fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Created local server ${name}.`);