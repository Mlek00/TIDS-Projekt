const { ustvariOdjemalca } = require("./grpc-odjemalec");

const krajId = process.argv[2];
const datum = process.argv[3];

if (!krajId || !datum) {
    console.error("Uporaba: node src/grpc-vreme-test.js K01 2026-11-14");
    process.exit(1);
}

const odjemalec = ustvariOdjemalca();

odjemalec.NapovedZaDan(
    { kraj_id: krajId, datum },
    (napaka, napoved) => {
        if (napaka) {
            console.error("NapovedZaDan:", napaka.details);
            odjemalec.close();
            return;
        }

        console.log("Napoved za izbrani datum:", napoved);
        console.log("\nPretakanje napovedi:");

        const tok = odjemalec.PretakajNapovedi({ kraj_id: krajId });
        let steviloNapovedi = 0;

        tok.on("data", zapis => {
            steviloNapovedi++;
            console.log(
                `${zapis.datum}: ${zapis.temperatura_max} °C, ` +
                `${zapis.padavine_mm} mm, ${zapis.veter_kmh} km/h`
            );
        });

        tok.on("end", () => {
            console.log("Prejetih napovedi:", steviloNapovedi);
            odjemalec.close();
        });

        tok.on("error", napaka => {
            console.error("PretakajNapovedi:", napaka.details);
            odjemalec.close();
        });
    }
);