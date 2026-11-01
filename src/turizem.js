const fs = require("node:fs");
const { XMLParser } = require("fast-xml-parser");
const Px = require("px");
const url =
    "https://pxweb.stat.si/SiStatData/Resources/PX/Databases/Data/2164525S.PX";

async function pridobiStatistiko() {
    const odgovor = await fetch(url);

    if (!odgovor.ok) {
        throw new Error(`Prenos ni uspel: HTTP ${odgovor.status}`);
    }

    const bytes = Buffer.from(await odgovor.arrayBuffer());

    const besedilo = new TextDecoder("windows-1250").decode(bytes);
    const tabela = new Px(besedilo);

    console.log("Naslov:", tabela.title());
    console.log("Dimenzije:", tabela.variables());

    for (const dimenzija of tabela.variables()) {
        console.log(dimenzija, "– primeri:", tabela.values(dimenzija).slice(0, 5));
    }
    const zapisi = tabela.entries();

    const celje = zapisi.filter(zapis =>
        zapis["OBČINE"] === "Celje" &&
        zapis["MERITVE"] === "Prihodi turistov" &&
        zapis["DRŽAVA"] !== "Država - SKUPAJ"
    );

    console.log("Število zapisov za Celje:", celje.length);
    console.log("Prvih šest zapisov:", celje.slice(0, 6));

    const xml = fs.readFileSync("data/kraji.xml", "utf8");
    const xmlParser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });
    const kraji = xmlParser.parse(xml).kraji.kraj;
    const obcine = new Set(tabela.values("OBČINE"));

    console.log("\nUjemanje krajev z občinami:");
    for (const kraj of kraji) {
        console.log(kraj.ime, obcine.has(kraj.ime) ? "DA" : "NE");
    }
    const imeObcine = {
    Koper: "Koper/Capodistria"
    };

    const statistika = kraji.flatMap(kraj => {
        const obcina = imeObcine[kraj.ime] || kraj.ime;

        return zapisi
            .filter(zapis =>
                zapis["OBČINE"] === obcina &&
                ["Domači", "Tuji"].includes(zapis["DRŽAVA"])
            )
            .map(zapis => {
                const surovaVrednost = zapis.num.trim();

                return {
                    krajId: kraj["@_id"],
                    kraj: kraj.ime,
                    leto: Number(zapis["LETO"]),
                    vrstaTurista: zapis["DRŽAVA"],
                    meritev: zapis["MERITVE"],
                    vrednost: /^\d+$/.test(surovaVrednost)
                        ? Number(surovaVrednost)
                        : null
                };
            });
    });

    console.log("Število zapisov za naše kraje:", statistika.length);
    console.log("Primeri za Koper:", statistika.filter(z => z.kraj === "Koper").slice(0, 2));
    console.log("Manjkajoče vrednosti:", statistika.filter(z => z.vrednost === null).length);
    console.table(statistika.filter(zapis => zapis.vrednost === null));

    return statistika;
}

if (require.main === module) {
    pridobiStatistiko()
        .then(statistika => console.log("Pripravljenih zapisov:", statistika.length))
        .catch(console.error);
}

module.exports = { pridobiStatistiko };