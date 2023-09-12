import { Utakmica } from "./utakmica";

export interface Sudija {
  id: number;
  ime: string;
  prezime: string;
  kategorija: string;
  godinaRodjenja: number;
  godineIskustva: number;
  odsudjeneUtakmice: number;
  statistika: Statistika;
  utakmice: Utakmica[];
}

