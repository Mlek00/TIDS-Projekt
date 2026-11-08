const { pripraviKontekst } = require("./kontekst");
const { Priporocilo } = require("./priporocilo");

async function ustvariPriporocilo(kraj, datum, zelje) {
    if (typeof zelje !== "string" || !zelje.trim() || zelje.length > 300) {
        throw new Error("Vnesi željo, dolgo največ 300 znakov.");
    }

    const kontekst = await pripraviKontekst(kraj, datum);

    if (kontekst.izleti.length === 0) {
        throw new Error("Za izbrani kraj ni vnesenih izletov.");
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    });

    const dovoljeniIdji = kontekst.izleti.map(izlet => izlet.id);

    const poziv = [
        "Si svetovalec za načrtovanje izletov v Sloveniji.",
        "Odgovori v slovenščini.",
        `Predlagaj od 1 do ${Math.min(3, dovoljeniIdji.length)} izletov.`,
        "Uporabi izključno izlete iz priloženih podatkov.",
        "Upoštevaj željo uporabnika in vremensko napoved.",
        "Napoved predstavi kot napoved, ne kot gotovo vreme.",
        "Ne izmišljaj si izletov ali njihovih lastnosti.",
        "Ne trdi ničesar o terminih, odpiralnem času ali dostopnosti, ker teh podatkov nimaš.",
        "Če izlet ne ustreza uporabnikovi želji, ga ne predlagaj.",
        "Pri vremenskih vrednostih uporabi enote iz kontekst.enote. Ne spreminjaj enot.",
        `Želja uporabnika: ${zelje.trim()}`,
        `Podatki projekta: ${JSON.stringify(kontekst)}`
    ].join("\n");

    const odgovor = await ai.interactions.create({
        model: "gemini-3.5-flash-lite",
        input: poziv,
        response_format: {
            type: "text",
            mime_type: "application/json",
            schema: {
                type: "object",
                properties: {
                    povzetek: { type: "string" },
                    predlogi: {
                        type: "array",
                        minItems: 1,
                        maxItems: Math.min(3, dovoljeniIdji.length),
                        items: {
                            type: "object",
                            properties: {
                                izletId: {
                                    type: "string",
                                    enum: dovoljeniIdji
                                },
                                razlog: { type: "string" },
                                nasvet: { type: "string" }
                            },
                            required: ["izletId", "razlog", "nasvet"],
                            additionalProperties: false
                        }
                    }
                },
                required: ["povzetek", "predlogi"],
                additionalProperties: false
            }
        }
    });

    if (!odgovor.output_text) {
        throw new Error("Gemini ni vrnil odgovora JSON.");
    }

    const priporocilo = Priporocilo.izJson(
        odgovor.output_text,
        dovoljeniIdji
    );

    return { kontekst, priporocilo };
}

module.exports = { ustvariPriporocilo };