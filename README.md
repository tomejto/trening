# Mój Trening

Osobista aplikacja PWA do prowadzenia planu treningowego. Działa offline, a dane są zapisywane lokalnie na telefonie (IndexedDB). Nie ma backendu ani logowania.

## Uruchomienie lokalne

```bash
npm install
npm run dev        # serwer deweloperski (http://localhost:5173, dostępny też w sieci lokalnej)
npm test           # testy logiki
npm run build      # wersja produkcyjna w dist/
npm run preview    # podgląd wersji produkcyjnej z działającym service workerem
```

## Publikacja za darmo: GitHub Pages (zalecane)

Do instalacji na telefonie aplikacja potrzebuje adresu HTTPS. GitHub Pages zapewnia go za darmo, a gotowy workflow jest w `.github/workflows/deploy.yml`.

1. Załóż na GitHubie nowe repozytorium, np. `trening`. Może być prywatne, jeśli masz płatny plan. Na darmowym koncie GitHub Pages działa tylko z publicznym repozytorium, ale w kodzie nie ma żadnych Twoich danych, bo te są wyłącznie na telefonie.
2. Wypchnij kod:
   ```bash
   git add -A
   git commit -m "Mój Trening"
   git remote add origin https://github.com/TWOJ_LOGIN/trening.git
   git push -u origin main
   ```
3. W repozytorium wejdź w **Settings → Pages** i w polu **Source** wybierz **GitHub Actions**.
4. Poczekaj 1–2 minuty, aż w zakładce **Actions** zakończy się workflow „Publikacja na GitHub Pages”. Aplikacja będzie dostępna pod adresem `https://TWOJ_LOGIN.github.io/trening/`.
5. Każdy kolejny `git push` publikuje nową wersję automatycznie. Telefon pobierze ją przy następnym otwarciu aplikacji z dostępem do internetu.

### Alternatywa bez GitHuba: Netlify Drop

Uruchom `npm run build` i przeciągnij folder `dist` na stronę https://app.netlify.com/drop. Dostaniesz adres HTTPS od razu. Aktualizacja wymaga ponownego przeciągnięcia folderu.

## Instalacja na telefonie

- **iPhone (Safari):** otwórz adres, stuknij **Udostępnij → Do ekranu początkowego**.
- **Android (Chrome):** otwórz adres, stuknij **⋮ → Zainstaluj aplikację** (albo „Dodaj do ekranu głównego”).

Po pierwszym otwarciu aplikacja działa bez internetu.

## Ważne: dane i kopia zapasowa

- Dane są tylko na telefonie, w pamięci przeglądarki tej konkretnej domeny. Zmiana adresu, np. z GitHub Pages na Netlify, oznacza pustą aplikację. Przenieś wtedy dane eksportem i importem.
- Na iPhonie dane aplikacji zainstalowanej na ekranie głównym są trwałe. Nie usuwaj jednak ikony aplikacji, bo usuwa to jej dane.
- Co jakiś czas rób kopię: **Więcej → Kopia zapasowa → Udostępnij / zapisz w Plikach** (albo „Pobierz plik”). Import z pliku zastępuje wszystkie dane.

## Struktura kodu

- `src/db/`: model danych (`types.ts`), baza Dexie z migracjami (`db.ts`), plan startowy (`seed.ts`), opisy ćwiczeń (`descriptions.ts`).
- `src/logic/`: logika niezależna od interfejsu i jej testy: progresja i poprzednie wyniki (`workout.ts`), lżejszy tydzień i liczenie tygodni (`deload.ts`), statystyki (`stats.ts`), masa ciała (`bodyweight.ts`), kopia zapasowa (`backup.ts`).
- `src/screens/`: ekrany aplikacji. `src/components/`: wspólne elementy i wykresy SVG. `src/timer/`: timer przerwy.

Historia odwołuje się do ćwiczeń po stałym identyfikatorze. Każdy zapisany trening przechowuje kopię celu z dnia treningu, więc zmiana planu nie zmienia historii.
