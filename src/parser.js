const fs = require("node:fs");
const { XMLParser } = require("fast-xml-parser");

const xml = fs.readFileSync("data/kraji.xml", "utf8");
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});

const kraji = parser.parse(xml).kraji.kraj;

const url = new URL("https://api.open-meteo.com/v1/forecast");
url.searchParams.set(
    "latitude",
    kraji.map(kraj => kraj.latitude).join(",")
);
url.searchParams.set(
    "longitude",
    kraji.map(kraj => kraj.longitude).join(",")
);
url.searchParams.set(
    "daily",
    "temperature_2m_max,precipitation_sum,wind_speed_10m_max"
);
url.searchParams.set("timezone", "Europe/Ljubljana");

async function main() {
    const odgovor = await fetch(url);

    if (!odgovor.ok) {
        throw new Error(`Napaka pri zahtevku: HTTP ${odgovor.status}`);
    }

    const podatki = await odgovor.json();

    if(!Array.isArray(podatki) || podatki.length !== kraji.length) {
        throw new Error("število odgovorov se ne ujema s številom krajev");
    }

    const napovedi = kraji.flatMap((kraj, indeksKraja) => {
        const dnevno = podatki[indeksKraja].daily;

        return dnevno.time.map((datum, indeksDneva) => ({
            krajId: kraj["@_id"],
            datum: datum,
            temperatura: dnevno.temperature_2m_max[indeksDneva],
            padavine: dnevno.precipitation_sum[indeksDneva],
            veter: dnevno.wind_speed_10m_max[indeksDneva]
        }));
    });

    const rezultat = {
        vir: "Open-Meteo",
        pridobljeno: new Date().toISOString(),
        napovedi: napovedi
    };
    fs.writeFileSync(
        "data/napovedi-openmeteo.json",
        JSON.stringify(rezultat, null, 2),
        "utf8"
    );


    console.log("Število zapisov:", napovedi.length);
    console.log("Prvi trije zapisi:", napovedi.slice(0,3));
    console.log("Napovedi so shranjene v data/napovedi-openmeteo.json");
}

main().catch(console.error);