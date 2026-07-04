const fs = require("fs");

async function get(url, type = "json") {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${url}`);
    }

    return type === "text"
        ? response.text()
        : response.json();
}

function parseProperties(text) {
    const props = {};

    text.split(/\r?\n/).forEach(line => {
        line = line.trim();

        if (!line || line.startsWith("#")) return;

        const i = line.indexOf("=");

        if (i === -1) return;

        props[line.substring(0, i).trim()] =
            line.substring(i + 1).trim();
    });

    return props;
}

function getEnvironment(clientSide, serverSide) {
    const client = clientSide !== "unsupported";
    const server = serverSide !== "unsupported";

    if (client && server) return "Client or Server";
    if (client) return "Client";
    if (server) return "Server";

    return "Unknown";
}

async function main() {
    const gradle = await get(
        "https://raw.githubusercontent.com/PrincParshia/Anemos/main/gradle.properties",
        "text"
    );

    const props = parseProperties(gradle);

    const mr = await get(
        "https://api.modrinth.com/v2/project/anemos"
    );

    const cf = await get(
        "https://cflookup.com/1249202.json"
    );

    const output = {
        updated: new Date().toISOString(),

        name: props.mod_name,
        description: props.description,
        icon: "https://raw.githubusercontent.com/PrincParshia/Anemos/main/common/src/main/resources/anemos.icon.png",

        categories: [
            ...mr.categories,
            ...mr.additional_categories
        ],

        loaders: mr.loaders,

        environment: getEnvironment(
            mr.client_side,
            mr.server_side
        ),

        modrinthDownloads: mr.downloads,
        curseforgeDownloads: cf.downloadCount,
        totalDownloads: mr.downloads + cf.downloadCount
    };

    fs.mkdirSync("data/projects", { recursive: true });

    fs.writeFileSync(
        `data/projects/${props.mod_id}.json`,
        JSON.stringify(output, null, 4)
    );
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
