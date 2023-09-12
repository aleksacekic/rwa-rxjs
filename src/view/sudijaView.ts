import { debounceTime, fromEvent, map, switchMap } from "rxjs";
import {  fetchAndProcessSudije, fetchSveSudije, nadjiSudijuPoImenu, prikaziSudije } from "../controllers/sudijaController";

export function drawHeader(): HTMLDivElement {
  const header = document.createElement("div");
  header.className = "header";
  
  const headertext = document.createElement("label");
  headertext.innerHTML = "Fudbalske sudije grada Niša";
  
  header.appendChild(headertext);
  document.body.appendChild(header);

  return header;
}

export function drawMain(): HTMLDivElement {
  const mainContainer = document.createElement("div");
  mainContainer.className = "main";

  const iznadKartica = document.createElement("div");
  iznadKartica.className = "iznadKartica";
  mainContainer.appendChild(iznadKartica);

  fetchAndProcessSudije(iznadKartica);

  const radioContainer = document.createElement('div');
  radioContainer.className = "radioKontejner"
  
  const radioOptions = [
    { label: "Sve sudije", value: "svi", checked: true },
    { label: "Glavne sudije", value: "glavni" },
    { label: "Pomoćne sudije", value: "pomocnici" }
  ];

  radioOptions.forEach(option => {
    const radioInput = document.createElement('input');
    radioInput.type = 'radio';
    radioInput.name = 'filter';
    radioInput.value = option.value;
    radioInput.checked = option.checked;

    const label = document.createElement("label");
    label.className = option.value;
    label.innerHTML = option.label;

    radioContainer.appendChild(radioInput);
    radioContainer.appendChild(label);
  });

  mainContainer.appendChild(radioContainer);

  const pretragaLabel = document.createElement("label");
  pretragaLabel.className = "pretragaLabel";
  pretragaLabel.innerHTML = `Pretraži po imenu/prezimenu: `;
  radioContainer.appendChild(pretragaLabel);

  const pretragaImePrezime = document.createElement('input');
  pretragaImePrezime.className = "pretragaImePrezime";
  radioContainer.appendChild(pretragaImePrezime);
  
  nadjiSudijuPoImenu(pretragaImePrezime);
  
  const stranica = document.createElement("div"); // ovo je main
  stranica.className = "stranica";
  mainContainer.appendChild(stranica);

  document.body.appendChild(mainContainer);

  const inputElements = document.querySelectorAll('input[type="radio"]');
  fromEvent(inputElements, 'change')
  .pipe( //change - tip dogadjaja koji pratimo
    debounceTime(100),
    map(event => (event.target as HTMLInputElement).value),
    switchMap(filter => fetchSveSudije()
      .pipe(
        map(sudije => prikaziSudije(sudije, filter))
  ))
  ).subscribe();
  
  return mainContainer;
  
}




