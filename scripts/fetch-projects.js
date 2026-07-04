const fs = require("fs");

async function get(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`${url}: ${response.status}`);
    }

    return response.json();
}

async function main() {
    const modrinth = await get(
        "https://api.modrinth.com/v2/project/anemos"
    );

    const curseforge = await get(
        "https://cflookup.com/1249202.json"
    );

    const output = {
        updated: new Date().toISOString(),

        modrinth: {
            title: modrinth.title,
            description: modrinth.description,
            downloads: modrinth.downloads,
            followers: modrinth.followers,
            icon: modrinth.icon_url
        },

        curseforge: {
            title: curseforge.name,
            description: curseforge.summary,
            downloads: curseforge.downloadCount,
            icon: curseforge.logo.url
        },

        totalDownloads:
            modrinth.downloads + curseforge.downloadCount
    };

    fs.mkdirSync("data", { recursive: true });

    fs.writeFileSync(
        "data/project.json",
        JSON.stringify(output, null, 4)
    );

    console.log("Done.");
}

main();
