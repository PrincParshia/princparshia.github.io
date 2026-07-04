const fs = require("fs");

async function get(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${url}`);
    }

    return response.json();
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

    const output = {
        updated: new Date().toISOString(),

        name: mr.title,
        description: mr.description,
        icon: mr.icon_url,

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
