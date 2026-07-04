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

async function fetchProject(project, type) {
    const mr = await get(
        `https://api.modrinth.com/v2/project/${project.modrinth}`
    );

    const cf = await get(
        `https://cflookup.com/${project.curseforge}.json`
    );

    const output = {
        type,

        updated: new Date().toISOString(),

        name: mr.title,
        description: mr.description,
        icon: mr.icon_url,

        ...(type === "mod" && {
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
        `data/projects/${project.slug}.json`,
        JSON.stringify(output, null, 4)
    );
}

async function main() {
    fs.mkdirSync("data/projects", { recursive: true });

    const projects = JSON.parse(
        fs.readFileSync("projects.json", "utf8")
    );

    for (const project of projects.mods) {
        try {
            await fetchProject(project, "mod");
            console.log(`✓ ${project.slug}`);
        } catch (err) {
            console.error(`✗ ${project.slug}`);
            console.error(err);
        }
    }

    for (const project of projects.resourcePacks) {
        try {
            await fetchProject(project, "resourcePack");
            console.log(`✓ ${project.slug}`);
        } catch (err) {
            console.error(`✗ ${project.slug}`);
            console.error(err);
        }
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
