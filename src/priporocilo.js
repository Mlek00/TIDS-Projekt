class Priporocilo {
    constructor(podatki, dovoljeniIdji) {
        if (typeof podatki?.povzetek !== "string" ||
            !podatki.povzetek.trim()) {
            throw new Error("Odgovor nima veljavnega povzetka.");
        }

        if (!Array.isArray(podatki.predlogi) ||
            podatki.predlogi.length < 1 ||
            podatki.predlogi.length > 3) {
            throw new Error("Odgovor mora vsebovati od 1 do 3 predloge.");
        }

        const dovoljeni = new Set(dovoljeniIdji);
        const uporabljeni = new Set();

        this.povzetek = podatki.povzetek.trim();
        this.predlogi = podatki.predlogi.map(predlog => {
            if (!dovoljeni.has(predlog.izletId) ||
                uporabljeni.has(predlog.izletId)) {
                throw new Error("Odgovor vsebuje neznan ali podvojen izlet.");
            }

            if (typeof predlog.razlog !== "string" ||
                !predlog.razlog.trim() ||
                typeof predlog.nasvet !== "string" ||
                !predlog.nasvet.trim()) {
                throw new Error("Predlog nima veljavnega razloga ali nasveta.");
            }

            uporabljeni.add(predlog.izletId);

            return {
                izletId: predlog.izletId,
                razlog: predlog.razlog.trim(),
                nasvet: predlog.nasvet.trim()
            };
        });
    }

    static izJson(besedilo, dovoljeniIdji) {
        return new Priporocilo(JSON.parse(besedilo), dovoljeniIdji);
    }
}

module.exports = { Priporocilo };