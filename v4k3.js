"use strict";

/* Momenter:
 * setCustomValidity på felt for startnummer og navn
 * Kontrollelement sin egenskap validitystate
 */

/**
 * Håndterer webside for innlesing av nye deltagere og visning av deltagere.
 */
class KonkurranseController {
    #tabellelement;

    /**
     * @param {HTMLFormElement} formelement
     * @param {HTMLTableElement} tabellelement
     */
    constructor(formelement, tabellelement) {
        formelement.addEventListener(
            'submit',
            event => this.#registrer(event)
        );

        this.#tabellelement = tabellelement;

        // Startnummer
        const startnummerInput = formelement.elements["startnummer"];

        startnummerInput.addEventListener(
            'input',
            event => this.#validerStartnummer(event.target)
        );

        // Navn
        const navnInput = formelement.elements["navn"];

        navnInput.addEventListener(
            'input',
            event => this.#validerNavn(event.target)
        );

        // Filter
        const filterform = document.forms["filter"];

        filterform.addEventListener(
            'submit',
            event => this.#aktiverFilter(event)
        );

        filterform.addEventListener(
            'reset',
            event => this.#tomFilter(event)
        );

        this.#fyllListe();
        this.#validerStartnummer(startnummerInput);
    }


    /**
     * Legger til ny deltager med data last fra form-skjema
     *
     * @param {SubmitEvent} event
     */
    #registrer(event) {
        event.preventDefault();

        const formData = new FormData(event.target);

        const deltager = {
            'startnummer': Number(formData.get('startnummer')),
            'navn': formData.get('navn')
        };

        this.#visDeltager(deltager);

        event.target.reset();
    }


    /**
     * Validerer verdi i INPUT felt for startnummer for ny deltager
     *
     * @param {HTMLInputElement} target
     */
    #validerStartnummer(target) {
        let errormessage = "";

        // Hvis startnummer allerede finnes
        if (this.#startnummerFinnes(target.valueAsNumber)) {
            errormessage = "Startnummer er i bruk";

        // Hvis felt inneholder data som ikke er heltall større eller lik 1
        } else if (
            target.validity.badInput ||
            target.rangeUnderflow ||
            target.validity.stepMismatch
        ) {
            errormessage =
                "Startnummer må være eit heiltall større eller lik 1";

        // Hvis feltet er tomt
        } else if (target.validity.valueMissing) {
            errormessage = "Startnummer er påkrevd";
        }

        target.setCustomValidity(errormessage);
        target.title = errormessage;
    }


    /**
     * Validerer verdi i INPUT felt for navn for ny deltager
     *
     * @param {HTMLInputElement} target
     */
    #validerNavn(target) {
        let errormessage = "";

        if (target.validity.patternMismatch) {
            errormessage =
                "Navn må bestå av ett eller flere delnavn skilt av mellomrom eller bindestrek og hvert delnavn må starte med stor forbokstav etterfulgt av kun små bokstaver";

        } else if (target.validity.valueMissing) {
            errormessage = "Navn mangler";
        }

        target.setCustomValidity(errormessage);
        target.title = errormessage;
    }


    /**
     * Viser deltager i deltagerlisten plassert mhp. startnummer stigende
     *
     * @param {Object} deltager
     */
    #visDeltager(deltager) {
        const tbody = this.#tabellelement.tBodies[0];

        const HTMLTbodyRowsAsArray = Array.from(tbody.rows);

        const dennenummer = deltager.startnummer;

        const indeks = HTMLTbodyRowsAsArray.findIndex(
            rekke => {
                const trnummer = Number(rekke.cells[0].textContent);
                return dennenummer < trnummer;
            }
        );

        const newRow = tbody.insertRow(indeks);

        newRow.dataset.startnummer = deltager.startnummer;

        // Startnummer
        newRow.insertCell(-1).textContent = deltager.startnummer;

        // Navn
        newRow.insertCell(-1).textContent = deltager.navn;

        // Start-tid
        const startcell = newRow.insertCell(-1);

        const startInput = document.createElement("input");
        startInput.type = "time";
        startInput.step = "1";

        startcell.appendChild(startInput);

        // Slutt-tid
        const sluttcell = newRow.insertCell(-1);

        const sluttInput = document.createElement("input");
        sluttInput.type = "time";
        sluttInput.step = "1";

        sluttcell.appendChild(sluttInput);

        // Løpstid
        const lopstidCell = newRow.insertCell(-1);

        // Når starttid endres
        startInput.addEventListener("input", () => {
            this.#validerTid(startInput, sluttInput);
            this.#beregnLopstid(
                startInput,
                sluttInput,
                lopstidCell
            );
        });

        // Når sluttid endres
        sluttInput.addEventListener("input", () => {
            this.#validerTid(startInput, sluttInput);
            this.#beregnLopstid(
                startInput,
                sluttInput,
                lopstidCell
            );
        });

        this.#tabellelement.classList.remove("hidden");
    }


    /**
     * Validerer at sluttid kommer etter starttid.
     *
     * @param {HTMLInputElement} startInput
     * @param {HTMLInputElement} sluttInput
     */
    #validerTid(startInput, sluttInput) {
        sluttInput.setCustomValidity("");
        sluttInput.title = "";

        // Mangler en av tidene, er det lovlig
        if (!startInput.value || !sluttInput.value) {
            return;
        }

        const start = this.#tidTilSekunder(startInput.value);
        const slutt = this.#tidTilSekunder(sluttInput.value);

        if (slutt <= start) {
            sluttInput.setCustomValidity(
                "Sluttid må være etter starttid"
            );

            sluttInput.title =
                "Sluttid må være etter starttid";
        }
    }


    /**
     * Beregner løpetid.
     *
     * @param {HTMLInputElement} startInput
     * @param {HTMLInputElement} sluttInput
     * @param {HTMLTableCellElement} lopstidCell
     */
    #beregnLopstid(startInput, sluttInput, lopstidCell) {
        if (!startInput.value || !sluttInput.value) {
            lopstidCell.textContent = "";
            return;
        }

        const start = this.#tidTilSekunder(startInput.value);
        const slutt = this.#tidTilSekunder(sluttInput.value);

        // Ikke beregn dersom sluttid er ugyldig
        if (slutt <= start) {
            lopstidCell.textContent = "";
            return;
        }

        const sekunder = slutt - start;

        const timer = Math.floor(sekunder / 3600);
        const minutter = Math.floor(
            (sekunder % 3600) / 60
        );
        const sek = sekunder % 60;

        lopstidCell.textContent =
            `${String(timer).padStart(2, "0")}:` +
            `${String(minutter).padStart(2, "0")}:` +
            `${String(sek).padStart(2, "0")}`;
    }


    /**
     * Gjør om en tid til antall sekunder.
     *
     * @param {string} tid
     * @returns {number}
     */
    #tidTilSekunder(tid) {
        const [
            timer,
            minutter,
            sekunder = 0
        ] = tid.split(":").map(Number);

        return timer * 3600 + minutter * 60 + sekunder;
    }


    /**
     * Aktiverer filteret på deltagerlisten.
     *
     * @param {SubmitEvent} event
     */
    #aktiverFilter(event) {
        event.preventDefault();

        const form = event.target;

        const mønster =
            form.elements["filtertekst"].value;

        const felt =
            Number(form.elements["felt"].value);

        let regex;

        // Sjekker om mønsteret er et gyldig regulært uttrykk
        try {
            regex = new RegExp(mønster);
        } catch {
            return;
        }

        const tbody = this.#tabellelement.tBodies[0];

        // Gå gjennom alle deltagere
        for (const rad of tbody.rows) {

            // Hent enten startnummer eller navn
            const verdi =
                rad.cells[felt].textContent;

            // Vis rad hvis den passer med regex
            if (regex.test(verdi)) {
                rad.classList.remove("hidden");
            } else {
                rad.classList.add("hidden");
            }
        }

        // Vis aktivt filter
        const aktivtFilter =
            document.getElementById("aktivtFilter");

        aktivtFilter.textContent = mønster;
    }


    /**
     * Fjerner filteret og viser alle deltagere.
     *
     * @param {Event} event
     */
    #tomFilter(event) {
        const tbody = this.#tabellelement.tBodies[0];

        // Vis alle deltagere
        for (const rad of tbody.rows) {
            rad.classList.remove("hidden");
        }

        // Sett aktivt filter tilbake til "Ingen"
        const aktivtFilter =
            document.getElementById("aktivtFilter");

        aktivtFilter.textContent = "Ingen";
    }


    /**
     * Sjekker om input-parameter startnummer allerede finnes
     * i deltagerlisten.
     *
     * @param {number} startnummer
     * @returns {boolean}
     */
    #startnummerFinnes(startnummer) {
        const tbody = this.#tabellelement.tBodies[0];

        const element = tbody.querySelector(
            `tr[data-startnummer="${startnummer}"]`
        );

        return element !== null;
    }


    /**
     * Hjelpemetode som kan fjernes i endelig løsning.
     * Fyller inn data å arbeide under utvikling av applikasjonen.
     */
    #fyllListe() {
        this.#tabellelement.classList.remove("hidden");

        const liste = [
            {
                'startnummer': 567,
                'navn': 'Per Persen'
            },
            {
                'startnummer': 127,
                'navn': 'Anne Annesen'
            },
            {
                'startnummer': 838,
                'navn': 'Jo Josen'
            },
            {
                'startnummer': 57,
                'navn': 'Gro Grosen'
            },
            {
                'startnummer': 9,
                'navn': 'Hanne Hannesen'
            },
            {
                'startnummer': 65,
                'navn': 'Jo Josen'
            },
            {
                'startnummer': 7476,
                'navn': 'Mette Metteson'
            }
        ];

        for (const deltager of liste) {
            if (!this.#startnummerFinnes(deltager.startnummer)) {
                this.#visDeltager(deltager);
            }
        }
    }
}


// Hent skjema og tabell
const formelement = document.forms["nydeltager"];
const tabellelement = document.getElementById("deltagere");

// Start controller
new KonkurranseController(formelement, tabellelement);