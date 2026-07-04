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

async function fetchProject(project) {
    const mr = await get(
        `https://api.modrinth.com/v2/project/${project.modrinth}`
    );

    const cf = await get(
        `https://cflookup.com/${project.curseforge}.json`
    );

    let props = {};
    let name;
    let description;
    let icon;

    if (project.mod) {
        const gradle = await get(
            `https://raw.githubusercontent.com/PrincParshia/${project.github}/main/gradle.properties`,
            "text"
        );

        props = parseProperties(gradle);

        name = props.mod_name;
        description = props.description;
        icon = `https://raw.githubusercontent.com/PrincParshia/${project.github}/main/common/src/main/resources/${props.mod_id}.icon.png`;
    }

    if (project.resourcePack) {
        const mcmeta = await get(
            `https://raw.githubusercontent.com/PrincParshia/${project.github}/main/pack.mcmeta`
        );

        name = mr.title;

        description =
            typeof mcmeta.pack.description === "string"
                ? mcmeta.pack.description
                : mcmeta.pack.description.text ?? "";

        icon = `https://raw.githubusercontent.com/PrincParshia/${project.github}/main/pack.png`;
    }

    const output = {
        updated: new Date().toISOString(),

        name,
        description,
        icon,

        mod: project.mod,
        resourcePack: project.resourcePack,

        ...(project.mod && {
            loaders: mr.loaders
        }),

        environment: getEnvironment(
            mr.client_side,
            mr.server_side
        ),

        categories: [
            ...mr.categories,
            ...mr.additional_categories
        ],

        modrinthDownloads: mr.downloads,
        curseforgeDownloads: cf.downloadCount,
        totalDownloads: mr.downloads + cf.downloadCount
    };

    fs.writeFileSync(
        `data/projects/${project.id}.json`,
        JSON.stringify(output, null, 4)
    );
}

async function main() {
    fs.mkdirSync("data/projects", { recursive: true });

    const projects = JSON.parse(
        fs.readFileSync("projects.json", "utf8")
    );

    for (const project of projects) {
        try {
            await fetchProject(project);
            console.log(`✓ ${project.id}`);
        } catch (err) {
            console.error(`✗ ${project.id}`);
            console.error(err);
        }
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
