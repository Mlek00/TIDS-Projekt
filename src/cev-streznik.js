const net = require("node:net");
const { pripraviKontekst } = require("./kontekst");

const POT_CEVI = String.raw`\\.\pipe\tids-analiza-izletov`;

function oceniIzlet(izlet, vreme) {
    let ocena = 100;
    const razlogi = [];
    const naProstem = izlet.vrsta !== "Notranja aktivnost";

    if (naProstem && vreme.padavine >= 5) {
        ocena -= 35;
        razlogi.push("Napovedana je večja količina padavin.");
    } else if (naProstem && vreme.padavine >= 1) {
        ocena -= 15;
        razlogi.push("Možne so padavine.");
    }

    if (naProstem && vreme.veter >= 40) {
        ocena -= 30;
        razlogi.push("Napovedan je močnejši veter.");
    } else if (naProstem && vreme.veter >= 25) {
        ocena -= 10;
        razlogi.push("Napovedan je veter.");
    }

    if (naProstem && vreme.temperatura < 5) {
        ocena -= 15;
        razlogi.push("Napovedana je nizka temperatura.");
    }

    if (izlet.zahtevnost !== "Lahka" && vreme.padavine >= 1) {
        ocena -= 15;
        razlogi.push("Zahtevnejši izlet ob padavinah.");
    }

    if (Number(izlet.trajanjeUr) >= 4 && vreme.temperatura < 10) {
        ocena -= 10;
        razlogi.push("Daljši izlet v hladnejšem vremenu.");
    }

    if (razlogi.length === 0) {
        razlogi.push("Po izbranih pravilih ni večjih vremenskih omejitev.");
    }

    return {
        id: izlet.id,
        naziv: izlet.naziv,
        vrsta: izlet.vrsta,
        trajanjeUr: Number(izlet.trajanjeUr),
        ocena: Math.max(0, ocena),
        razlogi
    };
}

async function obdelajZahtevo(zahteva) {
    if (
        !zahteva ||
        zahteva.tip !== "oceniIzlete" ||
        typeof zahteva.kraj !== "string" ||
        typeof zahteva.datum !== "string" ||
        !Number.isInteger(zahteva.najvecUr) ||
        zahteva.najvecUr < 1 ||
        zahteva.najvecUr > 12
    ) {
        throw new Error("Neveljavna zahteva za ocenjevanje izletov.");
    }

    const kontekst = await pripraviKontekst(
        zahteva.kraj,
        zahteva.datum
    );

    if (!Object.values(kontekst.vreme).every(Number.isFinite)) {
        throw new Error("Vremenska napoved ni popolna.");
    }

    const izleti = kontekst.izleti
        .filter(izlet => Number(izlet.trajanjeUr) <= zahteva.najvecUr)
        .map(izlet => oceniIzlet(izlet, kontekst.vreme))
        .sort((a, b) =>
            b.ocena - a.ocena || a.trajanjeUr - b.trajanjeUr
        );

    return {
        kraj: kontekst.kraj,
        datum: kontekst.datum,
        vreme: kontekst.vreme,
        enote: kontekst.enote,
        najvecUr: zahteva.najvecUr,
        izleti
    };
}

const streznik = net.createServer(socket => {
    socket.setEncoding("utf8");
    socket.setTimeout(15000, () => socket.destroy());

    let vnos = "";
    let obdelano = false;

    socket.on("data", async del => {
        if (obdelano) return;

        vnos += del;

        if (Buffer.byteLength(vnos, "utf8") > 4096) {
            obdelano = true;
            socket.end(JSON.stringify({
                ok: false,
                napaka: "Zahteva je predolga."
            }) + "\n");
            return;
        }

        const konecVrstice = vnos.indexOf("\n");
        if (konecVrstice === -1) return;

        obdelano = true;

        try {
            const zahteva = JSON.parse(vnos.slice(0, konecVrstice));
            const rezultat = await obdelajZahtevo(zahteva);

            if (!socket.destroyed) {
                socket.end(JSON.stringify({
                    ok: true,
                    rezultat
                }) + "\n");
            }
        } catch (napaka) {
            if (!socket.destroyed) {
                socket.end(JSON.stringify({
                    ok: false,
                    napaka: napaka.message
                }) + "\n");
            }
        }
    });

    socket.on("error", napaka => {
        console.error("Napaka povezave s cevjo:", napaka.message);
    });
});

streznik.on("error", napaka => {
    console.error("Poimenovane cevi ni bilo mogoče zagnati:", napaka);
    process.exitCode = 1;
});

streznik.listen(POT_CEVI, () => {
    console.log(`Proces za ocenjevanje posluša na ${POT_CEVI}`);
});