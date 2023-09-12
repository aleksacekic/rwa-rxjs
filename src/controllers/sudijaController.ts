import { Observable, Subject, catchError, debounceTime, from, fromEvent, map, of, reduce, startWith, switchMap, take, takeUntil, tap, zip } from "rxjs";
import { Sudija } from "../models/sudija";
import { environments } from "../environments";

export function fetchSveSudije(): Observable<Sudija[]> {
  return from(
    fetch(environments.URL)
      .then(response => {
        if (!response.ok) {
          throw new Error("Sudije nisu pronadjene!");
        }
        return response.json();
      })
      .catch(error => {
        console.error(error);
        return [];
      })
  );
}


export async function fetchAndProcessSudije(container: HTMLElement): Promise<void> {
  try {
    const sudije = await fetchSveSudije().toPromise(); 

    let ukupanBrUtakmica: HTMLElement = container.querySelector(".ukupanBrUtakmica");
    if (!ukupanBrUtakmica) {
      ukupanBrUtakmica = document.createElement("div");
      ukupanBrUtakmica.className = "ukupanBrUtakmica";
      container.appendChild(ukupanBrUtakmica);
    }

    const ukupnoUtakmica = izracunajUkupnoUtakmica(sudije);
    ukupanBrUtakmica.innerHTML = `Ukupan broj odsuđenih utakmica svih sudija našeg saveza: ${ukupnoUtakmica}`;

    prikaziSudije(sudije, "svi");
  } catch (error) {
    console.error(error);
  }
}

function izracunajUkupnoUtakmica(sudije: Sudija[]): number {
  return sudije.map((sudija) => sudija.odsudjeneUtakmice).reduce((acc, utakmice) => acc + utakmice, 0);
}


function izracunajProsecnuOcenu(sudija: Sudija): Sudija {
  const prosecnaOcena = sudija.statistika.oceneKlubova.reduce((acc, ocena) => acc + ocena, 0) / sudija.statistika.oceneKlubova.length;
  return {
    ...sudija,
    statistika: {
      ...sudija.statistika,
      prosecnaOcena: prosecnaOcena,
    }
  };
}


export function prikaziSudije(sudije: Sudija[], filter: string) {
  const stranica = document.querySelector(".stranica");
  stranica.innerHTML = "";

  sudije
    .map(izracunajProsecnuOcenu)
    .filter(sudija =>
      filter === "svi" ||
      (filter === "glavni" && sudija.kategorija === "Glavni sudija") ||
      (filter === "pomocnici" && sudija.kategorija === "Pomocni sudija")
    )
    .forEach(sudija => {
      const karticaSudija = document.createElement("div");
      karticaSudija.className = "karticaSudija";
      const idSudije = sudija.id;

      const elements = [
        { label: "Ime", value: sudija.ime },
        { label: "Prezime", value: sudija.prezime },
        { label: "Kategorija", value: sudija.kategorija },
        { label: "Godina rođenja", value: sudija.godinaRodjenja },
        { label: "Ocene klubova", value: sudija.statistika.oceneKlubova },
        { label: "Prosečna ocena", value: sudija.statistika.prosecnaOcena },
      ];

      elements.forEach(element => {
        const label = document.createElement("label");
        label.className = element.label.toLowerCase();
        label.innerHTML = `${element.label}: ${element.value}`;
        karticaSudija.appendChild(label);
      });

      let dost: string = "🟩";

      const zakaziSudiju = document.createElement("label");
      zakaziSudiju.className = "zakaziSudiju";
      zakaziSudiju.innerHTML = `Zakazi sudiju: `;

      const dugmePlus = document.createElement("button");
      dugmePlus.innerHTML = "+";

      const dostupnost = document.createElement("label");
      dostupnost.className = "dostupnost";
      dostupnost.innerHTML = `Dostupnost: ${dost}`;

      const oceniSudiju = document.createElement("button");
      oceniSudiju.className = "oceniSudiju";
      oceniSudiju.innerHTML = `Oceni sudiju`;
      oceniSudiju.disabled = true;
      const dugmeOceniSudiju = oceniSudiju;

      const karticaOceni = document.createElement("div");
      karticaOceni.className = "karticaOceni";
      karticaOceni.innerHTML = `Utakmica: `;
      karticaOceni.style.display = "none";

      const tim1 = document.createElement('input');
      tim1.className = "tim1";
      karticaOceni.appendChild(tim1);
      tim1.placeholder = "Tim 1: "

      const tim2 = document.createElement('input');
      tim2.className = "tim2";
      karticaOceni.appendChild(tim2);
      tim2.placeholder = "Tim 2: "

      const ocenaSudije = document.createElement('input');
      ocenaSudije.className = "ocenaSudije";
      karticaOceni.appendChild(ocenaSudije);
      ocenaSudije.placeholder = "Ocena sudije: (1-5)"

      const elementiZaKarticu = [
        zakaziSudiju, dugmePlus, dostupnost, oceniSudiju, karticaOceni
      ];

      elementiZaKarticu.forEach(element => karticaSudija.appendChild(element));

      stranica.appendChild(karticaSudija);

      izracunajStatistiku(sudija).subscribe(({ totalUtakmice, ocenePoKategoriji }) => {
        const container = document.createElement('div');
        container.style.maxWidth = '600px';
        container.style.margin = '0 auto';

        for (let ocena = 1; ocena <= 5; ocena++) {
          const linija = document.createElement('div');
          linija.className = 'linija';

          const procentualnaVrednost = (ocenePoKategoriji[ocena] / totalUtakmice) * 100; // da dobijemo %
          linija.innerHTML = `<div class="popunjena" style="height: ${procentualnaVrednost}%;"></div>`;

          container.appendChild(linija);
        }

        karticaSudija.appendChild(container);
      });

      oceniSudiju.addEventListener("click", () => {


        const prviTim$ = fromEvent(tim1, "input").pipe(
          debounceTime(1000),
          map((event) => {
            const target = event.target as HTMLInputElement;
            return target.value;
          })
        );

        const drugiTim$ = fromEvent(tim2, "input").pipe(
          debounceTime(1000),
          map((event) => {
            const target = event.target as HTMLInputElement;
            return target.value;
          })
        );

        const ocenaSudije$ = fromEvent(ocenaSudije, "input").pipe(
          debounceTime(500),
          map((event) => {
            const target = event.target as HTMLInputElement;
            let inputValue = target.value.trim();
            const parsedValue = parseInt(inputValue, 10);
            
            if (parsedValue < 1) {
              inputValue = "1";
            }
            
            if (parsedValue > 5) {
              inputValue = "5";
            }
        
            return inputValue;
          })
        );

        zip(prviTim$, drugiTim$, ocenaSudije$).subscribe(([prviTim, drugiTim, ocenaSudije]) => {
          dodajUtakmicu(prviTim, drugiTim, ocenaSudije, idSudije);
        })
      });

      const oceniSudijuClick$ = fromEvent(oceniSudiju, "click");

      oceniSudijuClick$
        .pipe(
          tap(() => {
            if (karticaOceni.style.display === "none") {
              karticaOceni.style.display = "block";
            } else {
              karticaOceni.style.display = "none";
            }
          })
        )
        .subscribe();

      fromEvent(dugmePlus, "click").pipe(
        take(1),
        tap(() => {
          console.log(`Sudija ${sudija.ime} ${sudija.prezime} sudi utakmicu!`);
          dostupnost.innerHTML = `Dostupnost: 🟥`;
          setTimeout(() => {
            dugmeOceniSudiju.disabled = false;
          }, 3000); 
        }),

      ).subscribe();
    });
}

function izracunajStatistiku(sudija: Sudija): Observable<{ totalUtakmice: number; ocenePoKategoriji: number[] }> {
  const brojUtakmicaObs = of(sudija.odsudjeneUtakmice);
  const oceneObs = of(...sudija.statistika.oceneKlubova).pipe(
    reduce((ocenePoKategoriji: number[], ocena: number) => {
      if (ocenePoKategoriji[ocena]) {
        ocenePoKategoriji[ocena]++; //ako smo je vec imali - uvecavamo je
      } else {
        ocenePoKategoriji[ocena] = 1; // ako je nismo imali - dajemo joj vrednost 1
      }
      return ocenePoKategoriji;
    }, [] as number[])
  );

  return zip(brojUtakmicaObs, oceneObs).pipe(
    map(([totalUtakmice, ocenePoKategoriji]) => ({ totalUtakmice, ocenePoKategoriji }))
  );
}

function dodajUtakmicu(prviTim: string, drugiTim: string, ocenaSudije: string, idSudije: number) {
  from(fetch(`${environments.URL}/${idSudije}`))
    .pipe(
      switchMap(response => response.json()),
      map((sudija: any) => {
        if (sudija) {
          const ocenaS = parseInt(ocenaSudije);
          sudija.statistika.oceneKlubova.push(ocenaS);
          const novaUtakmica = { tim1: prviTim, tim2: drugiTim, ocenaSudije: ocenaS }
          if (sudija && Array.isArray(sudija.utakmice)) {
            sudija.utakmice.push(novaUtakmica);
          }

          const prosecnaOcena = sudija.statistika.oceneKlubova.reduce((sum: number, ocena: number) => sum + ocena, 0) / sudija.statistika.oceneKlubova.length;
          sudija.statistika.prosecnaOcena = prosecnaOcena;
          sudija.odsudjeneUtakmice = sudija.statistika.oceneKlubova.length;

          return from(fetch(`${environments.URL}/${idSudije}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(sudija)
          }));
        } else {
          throw new Error(`Sudija nije pronadjen.`);
        }
      }),
      catchError(error => {
        console.error('greska kod dodavanja ocene sudiji:', error);
        return [];
      }),
    )
    .subscribe(response => {
      azurirajPrikaz();
      console.log('ccena uspesno dodata sudiji.');
    });
}

function azurirajPrikaz() {
  let container: HTMLElement | null = document.querySelector(".iznadKartica");
  console.log(container);
  if (container) {
    fetchSveSudije().subscribe(sudije => {
      prikaziSudije(sudije, "svi");
      fetchAndProcessSudije(container);
    });

  } else {
    console.error("Container nije pronadjen.");
  }
}

function vratiSudijuPoImenu(ime: string): Observable<Sudija[]> {
  const promise = fetch(environments.URLIME + ime)
    .then(
      response => {
        if (!response.ok) {
          throw new Error("Sudija nije pronadjen!");
        } else {
          return response.json();
        }
      }
    ).then((sudije: Sudija[]) => {
      return sudije;
    })
    .catch(err => {
      console.error(err);
      return [];
    });

  return from(promise);
}

function vratiSudijuPoPrezimenu(prezime: string): Observable<Sudija[]> {
  const promise = fetch(environments.URLPREZIME + prezime)
    .then(
      response => {
        if (!response.ok) {
          throw new Error("Sudija nije pronadjen!");
        } else {
          return response.json();
        }
      }
    ).then((sudije: Sudija[]) => {
      return sudije;
    })
    .catch(err => {
      console.error(err);
      return [];
    });

  return from(promise);
}

export function nadjiSudijuPoImenu(pretragaImePrezime: HTMLInputElement) {
  fromEvent(pretragaImePrezime, 'input')
    .pipe(
      debounceTime(500),
      map((ev: Event) => (ev.target as HTMLInputElement).value),
      startWith(''), // prazan string kao pocetna vrednost
      switchMap(imePrezime => {
        const ime = imePrezime.split(' ')[0];
        const prezime = imePrezime.split(' ')[1];

        if (!ime && !prezime) {
          console.log(fetchSveSudije());
          return fetchSveSudije();
        }

        const sudijePoImenu$ = vratiSudijuPoImenu(ime);

        return sudijePoImenu$.pipe(
          switchMap(sudijeImena => {
            if (sudijeImena.length > 0) {
              return of(sudijeImena);
            } else {
              return vratiSudijuPoPrezimenu(ime);
            }
          }),
          catchError(error => {
            console.error(error);
            return of([]);
          })
        );
      })
    )
    .subscribe(sudije => {
      console.log(sudije);
      prikaziSudije(sudije, "svi");
    });
}
