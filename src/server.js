const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const { pridobiStatistiko } = require("./turizem");
const { ustvariPriporocilo } = require("./llm");

const server = http.createServer(async (zahtevek, odgovor) => {
    const pot = new URL(zahtevek.url, "http://localhost").pathname;

    if (pot === "/") {
    try {
        const html = await fs.readFile(
            path.join(__dirname, "..", "public", "index.html"),
            "utf8"
        );

        odgovor.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8"
        });
        odgovor.end(html);
    }   catch (napaka) {
        console.error(napaka);
        odgovor.writeHead(500);
        odgovor.end("Strani ni bilo mogoče odpreti.");
    }
        return;
    }
    if (pot === "/api/priporocila" && zahtevek.method === "POST") {
    try {
        let telo = "";

        for await (const del of zahtevek) {
            telo += del.toString("utf8");
        }

        const { kraj, datum, zelje } = JSON.parse(telo);

        if (typeof kraj !== "string" ||
            typeof datum !== "string" ||
            typeof zelje !== "string") {
            throw new TypeError("Manjkajo vhodni podatki.");
        }

        const rezultat = await ustvariPriporocilo(kraj, datum, zelje);

        odgovor.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
        });
        odgovor.end(JSON.stringify(rezultat));
    } catch (napaka) {
        console.error(napaka);

        const status = napaka instanceof SyntaxError ||
            napaka instanceof TypeError ? 400 : 502;

        odgovor.writeHead(status, {
            "Content-Type": "application/json; charset=utf-8"
        });
        odgovor.end(JSON.stringify({
            napaka: status === 400
                ? "Neveljavni vhodni podatki."
                : "Priporočila ni bilo mogoče pripraviti."
        }));
    }

        return;
    }
    if (pot !== "/api/turizem") {
        odgovor.writeHead(404);
        odgovor.end("Stran ne obstaja");
        return;
    }

    try {
        const statistika = await pridobiStatistiko();

        odgovor.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
        });
        odgovor.end(JSON.stringify({
            vir: "SURS / OPSI, tabela 2164525S",
            pridobljeno: new Date().toISOString(),
            statistika
        }));
    } catch (napaka) {
        console.error(napaka);
        odgovor.writeHead(502, {
            "Content-Type": "application/json; charset=utf-8"
        });
        odgovor.end(JSON.stringify({ napaka: "Podatkov ni bilo mogoče pridobiti." }));
    }
});

server.listen(3000, () => {
    console.log("Strežnik teče na http://localhost:3000");
});