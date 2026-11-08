import type { ExerciseDescription } from './types';

/** Opisy techniki ćwiczeń startowych (klucz = identyfikator ćwiczenia). */
export const DESCRIPTIONS: Record<string, ExerciseDescription> = {
  'hammer-chest-press': {
    muscles: 'Piersiowy większy (głównie część mostkowa), przednie aktony mięśni naramiennych, trójgłowy ramienia.',
    setup:
      'Ustaw siedzisko tak, żeby uchwyty były na wysokości środka klatki (mniej więcej linia sutków), wyraźnie poniżej barków. Ściągnij łopatki do siebie i w dół, zrób lekki łuk w odcinku piersiowym, stopy płasko na podłodze.',
    steps: [
      'Chwyć uchwyty. Łokcie ustaw pod kątem ok. 45–60° do tułowia, nie w linii barków.',
      'Wypchnij uchwyty do przodu do prawie pełnego wyprostu, bez blokowania łokci. Wydech przy wypychaniu.',
      'Wracaj powoli (2–3 s), aż poczujesz rozciągnięcie klatki. Łopatki przez cały czas zostają ściągnięte.',
      'Bez odbijania na dole – płynnie zacznij kolejne powtórzenie.',
    ],
    mistakes: [
      'Wypychanie barków do przodu na końcu ruchu (łopatki odrywają się od oparcia).',
      'Siedzisko za wysoko – ruch przenosi się na barki.',
      'Łokcie szeroko w bok (90°) – niepotrzebnie obciąża staw barkowy.',
      'Skrócony zakres i „odbijanie” ciężaru w pozycji rozciągnięcia.',
    ],
    tips: [
      'Hammer ma niezależne ramiona – pilnuj, żeby obie ręce pracowały równo.',
      'Zapisz ustawienie siedziska w notatkach poniżej, żeby nie szukać go co tydzień.',
    ],
  },

  'machine-row-neutral': {
    muscles:
      'Najszerszy grzbietu, równoległoboczne, środkowa część czworobocznego, tylne aktony naramiennych; pomocniczo dwugłowy ramienia i ramienno-promieniowy.',
    setup:
      'Oprzyj klatkę o podporę (jeśli maszyna ją ma). Siedzisko ustaw tak, żeby uchwyty były na wysokości dolnej części klatki. Chwyt neutralny (dłonie do siebie), wąski. W pozycji startowej ręce proste, łopatki lekko wysunięte do przodu.',
    steps: [
      'Zacznij ruch od ściągnięcia łopatek, a dopiero potem ugnij łokcie.',
      'Ciągnij łokcie blisko tułowia w kierunku bioder / dolnych żeber.',
      'Zatrzymaj się na chwilę w pełnym ściągnięciu.',
      'Wracaj powoli do pełnego wyprostu rąk, pozwalając łopatkom wysunąć się do przodu (rozciągnięcie pleców).',
    ],
    mistakes: [
      'Odchylanie i bujanie tułowiem – ruch ma robić grzbiet, nie bezwładność.',
      'Ciągnięcie samymi rękami (dominuje biceps).',
      'Unoszenie barków do uszu.',
      'Niepełny zakres – brak wyprostu albo brak ściągnięcia łopatek.',
    ],
    tips: [
      'Traktuj dłonie jak haki – ciągniesz łokciami.',
      'Wąski chwyt neutralny i łokcie przy ciele mocniej angażują najszerszy grzbietu.',
    ],
  },

  'db-shoulder-press': {
    muscles: 'Mięsień naramienny (przednie i boczne aktony), trójgłowy ramienia, górna część piersiowego; stabilizują czworoboczny i zębaty przedni.',
    setup:
      'Oparcie ławki prawie pionowo (ok. 75–85°). Połóż hantle na udach, usiądź i „podrzuć” je kolanami do wysokości barków. Przedramiona pionowo, łokcie lekko przed tułowiem (ok. 20–30° do przodu).',
    steps: [
      'Napnij brzuch, plecy i głowa przy oparciu.',
      'Wyciśnij hantle w górę, lekko zbliżając je nad głową (bez stukania).',
      'Zatrzymaj tuż przed pełnym zablokowaniem łokci.',
      'Opuszczaj kontrolowanie do wysokości mniej więcej uszu/brody.',
    ],
    mistakes: [
      'Duży łuk w odcinku lędźwiowym i odpychanie się od oparcia.',
      'Łokcie całkowicie w bok, w linii barków.',
      'Zbyt płytkie opuszczanie.',
      'Upuszczanie hantli z góry po serii.',
    ],
    tips: [
      'Po ostatnim powtórzeniu opuść hantle na uda, a dopiero potem na podłogę.',
      'Jeśli bark protestuje, skróć dolną część ruchu i obróć dłonie półneutralnie.',
      'Ciężar w aplikacji = ciężar jednej hantli.',
    ],
  },

  'pull-up': {
    muscles: 'Najszerszy grzbietu, obły większy, dwugłowy ramienia, ramienno-promieniowy, dolna część czworobocznego, równoległoboczne; brzuch stabilizuje.',
    setup:
      'Chwyć drążek nachwytem nieco szerzej niż barki (albo neutralnie, jeśli są takie uchwyty). Zwis na prostych rękach, nogi razem, lekko przed sobą, napięty brzuch i pośladki.',
    steps: [
      'Zacznij od ściągnięcia łopatek w dół – ciało lekko się uniesie bez zginania rąk.',
      'Ciągnij łokcie w dół i do tyłu, prowadząc klatkę w stronę drążka.',
      'Skończ, gdy broda jest nad drążkiem.',
      'Opuszczaj się kontrolowanie do pełnego zwisu.',
    ],
    mistakes: [
      'Bujanie i wymachy nogami (kipping).',
      'Półpowtórzenia – brak pełnego zwisu na dole.',
      'Wyciąganie brody do drążka zamiast ciągnięcia łokciami.',
      'Barki przy uszach w górnej pozycji.',
    ],
    tips: [
      'Ciężar = obciążenie dodatkowe (np. pas z talerzem). Bez obciążenia wpisuj 0.',
      'Przy asyście (maszyna, guma) wpisz wartość ujemną, np. −20. Progresja wtedy zmniejsza asystę.',
    ],
  },

  'lat-pulldown': {
    muscles: 'Najszerszy grzbietu, obły większy, dwugłowy ramienia, ramienno-promieniowy, dolna i środkowa część czworobocznego, równoległoboczne.',
    setup:
      'Ustaw wałki tak, żeby mocno dociskały uda. Chwyć drążek nachwytem nieco szerzej niż barki. Usiądź z lekkim odchyleniem tułowia (10–20°), klatka wypchnięta do przodu.',
    steps: [
      'Ściągnij łopatki w dół.',
      'Ciągnij drążek do górnej części klatki, prowadząc łokcie w dół i lekko do tyłu.',
      'Krótka pauza w dolnej pozycji.',
      'Powoli oddaj drążek w górę do pełnego wyprostu rąk, czując rozciągnięcie pleców.',
    ],
    mistakes: [
      'Ściąganie drążka za głowę.',
      'Mocne odchylanie się i bujanie tułowiem.',
      'Ciągnięcie drążka do brzucha.',
      'Puszczanie ciężaru – szybki, niekontrolowany powrót.',
    ],
    tips: [
      'Myśl o „wbijaniu łokci w tylne kieszenie spodni”.',
      'Kciuk obok palców (chwyt bez oplatania) zmniejsza udział przedramion.',
    ],
  },

  'db-curl': {
    muscles: 'Dwugłowy ramienia, ramienny, ramienno-promieniowy.',
    setup:
      'Stań prosto (albo usiądź), hantle w dłoniach wzdłuż tułowia, dłonie zwrócone do ud. Łokcie przy bokach, barki opuszczone.',
    steps: [
      'Uginaj łokcie, unosząc hantle, i w trakcie obracaj dłonie na zewnątrz (supinacja), tak by u góry były zwrócone do barków.',
      'Łokcie zostają przy bokach – nie wędrują do przodu.',
      'Krótka pauza w górze, mocne napięcie bicepsa.',
      'Opuszczaj powoli (2–3 s) do pełnego wyprostu.',
    ],
    mistakes: [
      'Bujanie tułowiem i „zarzucanie” ciężaru.',
      'Łokcie uciekające do przodu – część pracy przejmuje bark.',
      'Brak pełnego wyprostu na dole.',
      'Szybkie opuszczanie.',
    ],
    tips: ['Możesz robić naprzemiennie.', 'W superserii z prostowaniem na wyciągu oszczędzasz czas – mięśnie odpoczywają na zmianę.'],
  },

  'triceps-pushdown-bar': {
    muscles: 'Trójgłowy ramienia (wszystkie głowy, szczególnie boczna i przyśrodkowa).',
    setup:
      'Wyciąg górny z prostym lub łamanym drążkiem. Nachwyt na szerokość barków. Stań blisko wyciągu, lekko pochylony do przodu, łokcie przy bokach.',
    steps: [
      'Z łokciami ugiętymi ok. 90° wyprostuj ręce w dół do pełnego wyprostu.',
      'Na dole mocno dociśnij tricepsy.',
      'Wracaj powoli do kąta ok. 90°, nie unosząc łokci.',
    ],
    mistakes: [
      'Odrywanie łokci od tułowia – ruch przechodzi w barki.',
      'Pochylanie się nad drążkiem i dociskanie go ciężarem ciała.',
      'Zbyt mały zakres ruchu.',
    ],
    tips: ['Łokcie pracują jak zawiasy przyklejone do boków.'],
  },

  'incline-machine-press': {
    muscles: 'Górna (obojczykowa) część piersiowego, przednie aktony naramiennych, trójgłowy ramienia.',
    setup:
      'Siedzisko ustaw tak, żeby uchwyty były na wysokości górnej części klatki (tuż pod obojczykami). Łopatki ściągnięte, plecy przy oparciu, stopy płasko.',
    steps: [
      'Wypchnij uchwyty w górę i do przodu po torze maszyny.',
      'Nie blokuj łokci w końcowej fazie.',
      'Wracaj powoli do wyraźnego rozciągnięcia klatki.',
    ],
    mistakes: [
      'Wypychanie barków do przodu – łopatki odrywają się od oparcia.',
      'Siedzisko za nisko – ruch zaczyna przypominać wyciskanie nad głowę.',
      'Odrywanie pośladków od siedziska.',
    ],
    tips: ['To dzień objętościowy – wybierz ciężar, przy którym zostają 1–2 powtórzenia zapasu.'],
  },

  'machine-row-wide': {
    muscles: 'Górna i środkowa część pleców: tylne aktony naramiennych, środkowa część czworobocznego, równoległoboczne, obły większy; najszerszy w mniejszym stopniu.',
    setup:
      'Szerokie uchwyty, nachwyt. Siedzisko tak, żeby ręce były na wysokości środka klatki. Klatka oparta o podporę.',
    steps: [
      'Ściągnij łopatki.',
      'Ciągnij łokcie szeroko (ok. 60–75° od tułowia) do tyłu, aż dłonie znajdą się na wysokości klatki.',
      'Pauza w pełnym ściągnięciu.',
      'Powoli wróć, pozwalając łopatkom wysunąć się do przodu.',
    ],
    mistakes: ['Odrywanie klatki od podpory.', 'Unoszenie barków do uszu.', 'Szarpanie ciężaru.'],
    tips: ['Inny bodziec niż poniedziałkowy chwyt neutralny – dlatego to osobne ćwiczenie z własną historią.'],
  },

  'cable-fly': {
    muscles: 'Piersiowy większy, przednie aktony naramiennych; dwugłowy ramienia stabilizuje łokieć.',
    setup:
      'Bloczki na wysokości barków lub nieco wyżej. Zrób krok do przodu, lekko pochyl tułów, jedna stopa przed drugą. Łokcie lekko ugięte – ten kąt utrzymujesz przez całe ćwiczenie.',
    steps: [
      'Zacznij z rękami rozłożonymi na boki, czując rozciągnięcie klatki.',
      'Prowadź dłonie łukiem do przodu i do siebie, na wysokość dolnej części klatki.',
      'Ściśnij klatkę na sekundę.',
      'Wracaj powoli tym samym łukiem.',
    ],
    mistakes: [
      'Zmiana kąta w łokciach – rozpiętki zamieniają się w wyciskanie.',
      'Zbyt daleki ruch do tyłu, który przeciąga przód barku.',
      'Wypychanie barków do przodu.',
    ],
    tips: ['Mały ciężar, liczy się czucie mięśnia.', 'W superserii z odwróconym butterfly – przód i tył barku na zmianę.'],
  },

  'reverse-fly': {
    muscles: 'Tylne aktony naramiennych, środkowa część czworobocznego, równoległoboczne, podgrzebieniowy.',
    setup:
      'Maszyna butterfly ustawiona w trybie odwróconym. Usiądź przodem do oparcia, klatka przy oparciu. Uchwyty na wysokości barków, chwyt neutralny lub nachwyt, ręce prawie proste.',
    steps: [
      'Prowadź ręce łukiem w bok i do tyłu, aż znajdą się w linii tułowia.',
      'Krótka pauza.',
      'Powoli wróć do przodu.',
    ],
    mistakes: [
      'Ruch robiony głównie ściąganiem łopatek zamiast pracą tylnych aktonów barku.',
      'Unoszenie barków do uszu.',
      'Za duży ciężar i szarpanie.',
    ],
    tips: ['Myśl o „rozpychaniu rąk na boki”, a nie o ciągnięciu do tyłu.'],
  },

  'db-lateral-raise': {
    muscles: 'Boczne aktony naramiennych; pomocniczo nadgrzebieniowy i górna część czworobocznego.',
    setup: 'Stań prosto, hantle przy udach, lekkie pochylenie do przodu, łokcie minimalnie ugięte.',
    steps: [
      'Unoś ręce w bok i lekko do przodu (ok. 20–30°) do wysokości barków.',
      'Łokieć prowadzi ruch, nadgarstek nie wyżej niż łokieć.',
      'Opuszczaj powoli.',
    ],
    mistakes: [
      'Bujanie tułowiem.',
      'Unoszenie barków do uszu – pracuje czworoboczny zamiast naramiennego.',
      'Unoszenie wyraźnie powyżej linii barków.',
      'Za duży ciężar kosztem techniki.',
    ],
    tips: ['Skoki ciężaru hantli są tu duże w stosunku do siły – rozważ krok progresji 1–2 kg (ustawienia poniżej).'],
  },

  'triceps-pushdown-rope': {
    muscles: 'Trójgłowy ramienia (rozchylenie liny na dole mocniej angażuje głowę boczną).',
    setup: 'Wyciąg górny z liną. Chwyt neutralny tuż przy kulkach liny. Łokcie przy bokach, lekkie pochylenie.',
    steps: [
      'Wyprostuj ręce w dół.',
      'Na końcu ruchu rozchyl końce liny na boki i dociśnij tricepsy.',
      'Wróć powoli do kąta ok. 90° w łokciach.',
    ],
    mistakes: ['Odrywanie łokci od tułowia.', 'Zginanie nadgarstków.', 'Dociskanie ciężarem ciała.'],
    tips: ['Lina pozwala na pełniejszy wyprost niż drążek – wykorzystaj to.'],
  },

  'bulgarian-split-squat': {
    muscles: 'Czworogłowy uda, pośladkowy wielki i średni, przywodziciele; kulszowo-goleniowe i mięśnie tułowia stabilizują.',
    setup:
      'Ławka za tobą, mniej więcej na wysokości kolana. Grzbiet stopy (albo palce) tylnej nogi na ławce. Przednia stopa ok. 60–90 cm przed ławką. Hantle w dłoniach wzdłuż tułowia.',
    steps: [
      'Opuszczaj się pionowo, zginając przednie kolano, aż udo przedniej nogi będzie prawie równoległe do podłogi, a tylne kolano blisko podłogi.',
      'Ciężar na całej stopie przedniej nogi, kolano w linii palców.',
      'Wypchnij się w górę przez środek stopy / piętę.',
      'Zrób wszystkie powtórzenia na jedną nogę, potem zmień nogę.',
    ],
    mistakes: [
      'Kolano przedniej nogi uciekające do środka.',
      'Za krótki krok – pięta przedniej nogi odrywa się od podłogi.',
      'Odpychanie się tylną nogą – ona tylko utrzymuje równowagę.',
      'Szybkie „opadanie” w dół.',
    ],
    tips: [
      'Dłuższy krok i lekkie pochylenie tułowia = więcej pośladków. Krótszy krok i pionowy tułów = więcej czworogłowych.',
      'Zaczynaj od słabszej nogi.',
      'Powtórzenia i ciężar wpisuj na jedną nogę; ciężar = jedna hantla.',
    ],
  },

  'walking-lunge': {
    muscles: 'Czworogłowy uda, pośladkowe, przywodziciele; łydki i tułów stabilizują.',
    setup: 'Hantle wzdłuż tułowia, wolny odcinek 10–15 m. Tułów wyprostowany, wzrok przed siebie.',
    steps: [
      'Zrób długi krok do przodu.',
      'Opuść tylne kolano blisko podłogi, przednie udo prawie równolegle do podłogi.',
      'Odepchnij się przednią nogą i przenieś tylną nogę do kolejnego kroku.',
      'Licz powtórzenia na każdą nogę.',
    ],
    mistakes: [
      'Za krótki krok – kolano wysuwa się daleko przed palce, a pięta się odrywa.',
      'Kolano uciekające do środka.',
      'Uderzanie kolanem o podłogę.',
      'Stopy w jednej linii („na linie”) – utrata równowagi.',
    ],
    tips: ['Stopy na szerokość bioder, jak po torach.', 'Gdy brakuje miejsca, rób wykroki w przód naprzemiennie w miejscu.'],
  },

  'seated-leg-curl': {
    muscles: 'Kulszowo-goleniowe (dwugłowy uda, półścięgnisty, półbłoniasty); pomocniczo brzuchaty łydki.',
    setup:
      'Oś obrotu maszyny na wysokości stawu kolanowego. Wałek nad piętami (na ścięgnie Achillesa), wałek udowy dociśnięty tuż nad kolanami. Plecy przy oparciu.',
    steps: [
      'Uginaj nogi, ciągnąc pięty w dół i pod siedzisko, do pełnego zgięcia.',
      'Krótka pauza.',
      'Wracaj powoli (2–3 s) do prawie pełnego wyprostu.',
    ],
    mistakes: ['Unoszenie bioder z siedziska.', 'Szybki, niekontrolowany powrót.', 'Niepełny zakres ruchu.'],
    tips: [
      'Lekkie pochylenie tułowia do przodu zwiększa rozciągnięcie mięśni dwugłowych uda.',
      'Zapisz w notatkach ustawienie oparcia i wałków.',
    ],
  },

  'leg-extension': {
    muscles: 'Czworogłowy uda (w tym mięsień prosty uda).',
    setup:
      'Oparcie ustaw tak, żeby oś obrotu maszyny była na linii stawu kolanowego. Wałek na dole piszczeli, tuż nad kostką. Trzymaj uchwyty przy siedzisku.',
    steps: ['Prostuj nogi do pełnego wyprostu.', 'Zatrzymaj na sekundę z napiętym udem.', 'Opuszczaj powoli.'],
    mistakes: [
      'Wyrzucanie ciężaru i odrywanie pośladków od siedziska.',
      'Szybki powrót.',
      'Złe ustawienie osi obrotu – może powodować ból kolana.',
    ],
    tips: ['Jeśli czujesz dyskomfort w kolanie, zmniejsz zakres w dolnej części ruchu.'],
  },

  'back-extension': {
    muscles: 'Prostownik grzbietu, pośladkowy wielki, kulszowo-goleniowe.',
    setup:
      'Ławka rzymska 45°. Wałek pod biodrami, tuż poniżej linii pasa, tak żeby tułów mógł swobodnie zgiąć się w biodrach. Stopy dociśnięte. Obciążenie (talerz lub hantel) trzymaj przy klatce.',
    steps: [
      'Zegnij się w biodrach i opuść tułów, kręgosłup neutralny.',
      'Wróć do linii prostej z nogami, napinając pośladki.',
      'Nie przechodź w przeprost w odcinku lędźwiowym.',
    ],
    mistakes: [
      'Przeprost lędźwi w górnej pozycji.',
      'Wyraźne zaokrąglanie pleców pod obciążeniem.',
      'Szarpanie i bujanie.',
      'Wałek za wysoko – blokuje zgięcie w biodrach.',
    ],
    tips: ['W piątek (Dół B) lżej i więcej powtórzeń niż we wtorek.', 'Stopy lekko na zewnątrz i lekko zaokrąglony górny odcinek pleców przenoszą akcent na pośladki.'],
  },

  'hip-adduction': {
    muscles: 'Przywodziciele uda (wielki, długi, krótki), smukły, grzebieniowy.',
    setup:
      'Usiądź, plecy przy oparciu. Wałki po wewnętrznej stronie kolan. Rozstaw ustaw tak, żeby czuć rozciągnięcie, ale bez bólu.',
    steps: ['Ściągnij nogi do siebie.', 'Krótka pauza.', 'Powoli wróć do rozciągnięcia.'],
    mistakes: ['Zbyt szeroki rozstaw na starcie.', 'Odbijanie ciężaru.', 'Szybki powrót.'],
    tips: ['Silne przywodziciele pomagają stabilizować kolana w przysiadach i wykrokach.'],
  },

  'hip-abduction': {
    muscles: 'Pośladkowy średni i mały, napinacz powięzi szerokiej, górne włókna pośladkowego wielkiego.',
    setup: 'Wałki po zewnętrznej stronie kolan. Plecy przy oparciu albo lekko pochylony do przodu (więcej pośladków).',
    steps: ['Rozsuwaj nogi na boki.', 'Pauza w pełnym rozsunięciu.', 'Wracaj powoli, bez uderzania ciężarem.'],
    mistakes: ['Bujanie tułowiem.', 'Zbyt szybkie tempo.', 'Niepełny zakres.'],
    tips: ['W superserii z przywodzeniem – często to ta sama maszyna z przełączanym trybem.'],
  },

  'standing-calf-raise': {
    muscles: 'Brzuchaty łydki (głównie), płaszczkowaty.',
    setup:
      'Maszyna do wspięć stojąc (albo suwnica Smitha). Pałąki na barkach. Śródstopie na krawędzi podestu, pięty swobodnie w powietrzu. Kolana proste, ale nie zablokowane.',
    steps: [
      'Opuść pięty maksymalnie w dół i zatrzymaj się na 1–2 s w rozciągnięciu.',
      'Wspnij się jak najwyżej na palce.',
      'Pauza 1 s w górze.',
      'Powoli w dół.',
    ],
    mistakes: ['Sprężynowanie bez pauz.', 'Uginanie kolan – mniej pracy brzuchatego.', 'Niepełny zakres.'],
    tips: ['Łydki dobrze reagują na pełny zakres i pauzę w rozciągnięciu.'],
  },

  'seated-calf-raise': {
    muscles: 'Płaszczkowaty (główny przy zgiętych kolanach), brzuchaty łydki w mniejszym stopniu.',
    setup: 'Usiądź, wałek na udach tuż nad kolanami. Śródstopie na podeście, kolana zgięte ok. 90°.',
    steps: [
      'Opuść pięty maksymalnie w dół, pauza 1–2 s.',
      'Wspnij się jak najwyżej na palce.',
      'Pauza 1 s w górze.',
      'Powoli w dół.',
    ],
    mistakes: ['Sprężynowanie i odbijanie.', 'Za krótki zakres ruchu.'],
    tips: ['15 powtórzeń z pauzą w rozciągnięciu potrafi dobrze zmęczyć – nie spiesz się.'],
  },
};
