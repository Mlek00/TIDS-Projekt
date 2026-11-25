const net = require("node:net");

const POT_CEVI = String.raw`\\.\pipe\tids-analiza-izletov`;

function posljiEnkrat(zahteva) {
    return new Promise((resolve, reject) => {
        const socket = net.createConnection({ path: POT_CEVI });
        let odgovor = "";
        let zakljuceno = false;

        function zakljuci(napaka, rezultat) {
            if (zakljuceno) return;

            zakljuceno = true;
            socket.destroy();

            if (napaka) reject(napaka);
            else resolve(rezultat);
        }

        socket.setEncoding("utf8");
        socket.setTimeout(12000);

        socket.on("connect", () => {
            socket.write(JSON.stringify(zahteva) + "\n");
        });

        socket.on("data", del => {
            odgovor += del;

            if (Buffer.byteLength(odgovor, "utf8") > 65536) {
                zakljuci(new Error("Odgovor procesa je predolg."));
                return;
            }

            const konecVrstice = odgovor.indexOf("\n");
            if (konecVrstice === -1) return;

            try {
                const sporocilo = JSON.parse(
                    odgovor.slice(0, konecVrstice)
                );

                if (!sporocilo.ok) {
                    zakljuci(new Error(
                        sporocilo.napaka || "Ocenjevanje ni uspelo."
                    ));
                    return;
                }

                zakljuci(null, sporocilo.rezultat);
            } catch (napaka) {
                zakljuci(napaka);
            }
        });

        socket.on("timeout", () => {
            const napaka = new Error(
                "Proces za ocenjevanje se ni pravočasno odzval."
            );
            napaka.code = "ETIMEDOUT";
            zakljuci(napaka);
        });

        socket.on("error", napaka => zakljuci(napaka));

        socket.on("close", () => {
            if (!zakljuceno) {
                zakljuci(new Error(
                    "Cev se je zaprla pred prejemom odgovora."
                ));
            }
        });
    });
}

async function oceniIzletePrekCevi(kraj, datum, najvecUr) {
    const zahteva = {
        tip: "oceniIzlete",
        kraj,
        datum,
        najvecUr
    };

    for (let poskus = 1; poskus <= 5; poskus++) {
        try {
            return await posljiEnkrat(zahteva);
        } catch (napaka) {
            const zacasnaNedosegljivost =
                ["ENOENT", "ECONNREFUSED", "EPIPE", "EBUSY"]
                    .includes(napaka.code);

            if (!zacasnaNedosegljivost) throw napaka;

            if (poskus === 5) {
                const koncnaNapaka = new Error(
                    "Proces za ocenjevanje trenutno ni na voljo."
                );
                koncnaNapaka.code = "CEV_NEDOSEGLJIVA";
                throw koncnaNapaka;
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

if (require.main === module) {
    const kraj = process.argv[2];
    const datum = process.argv[3];
    const najvecUr = Number(process.argv[4] ?? 4);

    if (
        !kraj ||
        !datum ||
        !Number.isInteger(najvecUr) ||
        najvecUr < 1 ||
        najvecUr > 12
    ) {
        console.error(
            'Uporaba: node src/cev-odjemalec.js Celje 2026-11-25 3'
        );
        process.exitCode = 1;
    } else {
        oceniIzletePrekCevi(kraj, datum, najvecUr)
            .then(rezultat => console.dir(rezultat, { depth: null }))
            .catch(napaka => {
                console.error("Napaka:", napaka.message);
                process.exitCode = 1;
            });
    }
}

module.exports = { oceniIzletePrekCevi };