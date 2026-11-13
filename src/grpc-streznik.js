const fs = require("node:fs");
const path = require("node:path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { XMLParser } = require("fast-xml-parser");

const protoPot = path.join(__dirname, "..", "proto", "izleti.proto");
const definicija = protoLoader.loadSync(protoPot, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const { IzletService } = grpc.loadPackageDefinition(definicija).izleti;

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});

function preberiXml(imeDatoteke) {
    const pot = path.join(__dirname, "..", "data", imeDatoteke);
    return xmlParser.parse(fs.readFileSync(pot, "utf8"));
}

const kraji = preberiXml("kraji.xml").kraji.kraj;
const izleti = preberiXml("izleti.xml").izleti.izlet;

function seznamKrajev(call, callback) {
    const odgovor = kraji.map(kraj => ({
        id: kraj["@_id"],
        ime: kraj.ime,
        regija: kraj.regija,
        latitude: Number(kraj.latitude),
        longitude: Number(kraj.longitude)
    }));

    callback(null, { kraji: odgovor });
}

function izletiZaKraj(call, callback) {
    const krajId = call.request.kraj_id;

    if (!kraji.some(kraj => kraj["@_id"] === krajId)) {
        callback({
            code: grpc.status.NOT_FOUND,
            details: `Kraj ${krajId} ne obstaja.`
        });
        return;
    }

    const odgovor = izleti
        .filter(izlet => izlet["@_krajId"] === krajId)
        .map(izlet => ({
            id: izlet["@_id"],
            kraj_id: izlet["@_krajId"],
            naziv: izlet.naziv,
            vrsta: izlet.vrsta,
            zahtevnost: izlet.zahtevnost,
            trajanje_ur: Number(izlet.trajanje),
            oprema: izlet.oprema
        }));

    callback(null, { izleti: odgovor });
}
function najdiKraj(krajId) {
    return kraji.find(kraj => kraj["@_id"] === krajId);
}

async function pridobiNapovedi(kraj) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");

    url.searchParams.set("latitude", String(kraj.latitude));
    url.searchParams.set("longitude", String(kraj.longitude));
    url.searchParams.set(
        "daily",
        "temperature_2m_max,precipitation_sum,wind_speed_10m_max"
    );
    url.searchParams.set("timezone", "Europe/Ljubljana");
    url.searchParams.set("forecast_days", "16");
    url.searchParams.set("wind_speed_unit", "kmh");

    const odgovor = await fetch(url);

    if (!odgovor.ok) {
        throw new Error(`Open-Meteo je vrnil HTTP ${odgovor.status}`);
    }

    const podatki = await odgovor.json();
    const dnevno = podatki.daily;

    if (!dnevno || !Array.isArray(dnevno.time)) {
        throw new Error("Open-Meteo ni vrnil dnevnih napovedi.");
    }

    return dnevno.time.map((datum, indeks) => {
        const temperatura = dnevno.temperature_2m_max[indeks];
        const padavine = dnevno.precipitation_sum[indeks];
        const veter = dnevno.wind_speed_10m_max[indeks];

        if (![temperatura, padavine, veter].every(Number.isFinite)) {
            throw new Error(`Nepopolna napoved za ${datum}.`);
        }

        return {
            kraj_id: kraj["@_id"],
            datum,
            temperatura_max: temperatura,
            padavine_mm: padavine,
            veter_kmh: veter
        };
    });
}

async function napovedZaDan(call, callback) {
    const kraj = najdiKraj(call.request.kraj_id);

    if (!kraj) {
        callback({
            code: grpc.status.NOT_FOUND,
            details: "Kraj ne obstaja."
        });
        return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(call.request.datum)) {
        callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: "Datum mora biti v obliki YYYY-MM-DD."
        });
        return;
    }

    try {
        const napovedi = await pridobiNapovedi(kraj);
        const napoved = napovedi.find(
            zapis => zapis.datum === call.request.datum
        );

        if (!napoved) {
            callback({
                code: grpc.status.NOT_FOUND,
                details: "Za ta datum napoved še ni na voljo."
            });
            return;
        }

        callback(null, napoved);
    } catch (napaka) {
        callback({
            code: grpc.status.UNAVAILABLE,
            details: napaka.message
        });
    }
}

async function pretakajNapovedi(call) {
    const kraj = najdiKraj(call.request.kraj_id);

    if (!kraj) {
        call.emit("error", {
            code: grpc.status.NOT_FOUND,
            details: "Kraj ne obstaja."
        });
        return;
    }

    try {
        const napovedi = await pridobiNapovedi(kraj);

        for (const napoved of napovedi) {
            if (call.cancelled) return;
            call.write(napoved);
        }

        call.end();
    } catch (napaka) {
        call.emit("error", {
            code: grpc.status.UNAVAILABLE,
            details: napaka.message
        });
    }
}
const streznik = new grpc.Server();

streznik.addService(IzletService.service, {
    SeznamKrajev: seznamKrajev,
    IzletiZaKraj: izletiZaKraj,
    NapovedZaDan: napovedZaDan,
    PretakajNapovedi: pretakajNapovedi
});

streznik.bindAsync(
    "127.0.0.1:50051",
    grpc.ServerCredentials.createInsecure(),
    (napaka, vrata) => {
        if (napaka) {
            console.error("Zagon gRPC strežnika ni uspel:", napaka);
            process.exitCode = 1;
            return;
        }

        console.log(`gRPC strežnik posluša na vratih ${vrata}`);
    }
);