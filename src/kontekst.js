const fs = require("node:fs/promises");
const path = require("node:path");
const { XMLParser } = require("fast-xml-parser");

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});

async function pripraviKontekst(imeKraja, datum) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
        throw new Error("Datum mora biti v obliki YYYY-MM-DD.");
    }

    const mapaPodatkov = path.join(__dirname, "..", "data");

    const [krajiXml, izletiXml] = await Promise.all([
        fs.readFile(path.join(mapaPodatkov, "kraji.xml"), "utf8"),
        fs.readFile(path.join(mapaPodatkov, "izleti.xml"), "utf8")
    ]);

    const kraji = parser.parse(krajiXml).kraji.kraj;
    const izleti = parser.parse(izletiXml).izleti.izlet;

    const kraj = kraji.find(k => k.ime === imeKraja);

    if (!kraj) {
        throw new Error(`Kraj "${imeKraja}" ne obstaja.`);
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", kraj.latitude);
    url.searchParams.set("longitude", kraj.longitude);
    url.searchParams.set(
        "daily",
        "temperature_2m_max,precipitation_sum,wind_speed_10m_max"
    );
    url.searchParams.set("timezone", "Europe/Ljubljana");
    url.searchParams.set("forecast_days", "16");

    const odgovor = await fetch(url);

    if (!odgovor.ok) {
        throw new Error(`Napovedi ni bilo mogoče pridobiti: HTTP ${odgovor.status}`);
    }

    const podatki = await odgovor.json();
    const indeksDneva = podatki.daily.time.indexOf(datum);

    if (indeksDneva === -1) {
        throw new Error(`Za datum ${datum} vremenska napoved še ni na voljo.`);
    }

    const izbraniIzleti = izleti
        .filter(izlet => izlet["@_krajId"] === kraj["@_id"])
        .map(izlet => ({
            id: izlet["@_id"],
            naziv: izlet.naziv,
            vrsta: izlet.vrsta,
            zahtevnost: izlet.zahtevnost,
            trajanjeUr: izlet.trajanje,
            oprema: izlet.oprema
        }));

    return {
        kraj: kraj.ime,
        datum,
        vreme: {
            temperatura: podatki.daily.temperature_2m_max[indeksDneva],
            padavine: podatki.daily.precipitation_sum[indeksDneva],
            veter: podatki.daily.wind_speed_10m_max[indeksDneva]
        },
        enote: {
            temperatura: podatki.daily_units.temperature_2m_max,
            padavine: podatki.daily_units.precipitation_sum,
            veter: podatki.daily_units.wind_speed_10m_max
        },
        izleti: izbraniIzleti
    };
}

module.exports = { pripraviKontekst };