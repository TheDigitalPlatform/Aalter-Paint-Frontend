export interface OrderLine {
  id: string;
  raw: string;
  art: string;
  qty: number | null;
  unit: string;
  conf: number;
  why: string;
  want?: Record<string, string>;
  alts?: Array<{ art: string; conf: number; why: string }>;
  bonQty: string;
  confirmed: boolean;
  corrected: boolean;
  by: string;
}

export interface OrderItem {
  nr: string;
  klant: string;
  klantNr: string;
  klantConf: number;
  klantWhy: string;
  ref: string;
  day: string;
  time: string;
  min: number;
  mb: 'info' | 'bestel' | 'persoonlijk';
  from: string;
  subject: string;
  body: string;
  att: string;
  ocr: number | null;
  ocrKind: string;
  ocrWhy?: string;
  hand?: boolean;
  st: 'pending' | 'verwerking' | 'klaar' | 'aandacht' | 'goedgekeurd' | 'afgewezen' | 'gesync' | 'syncfout';
  lines: OrderLine[];
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectReason?: string;
  vo?: string;
  syncAt?: string;
  syncErr?: string;
  attempts?: number;
  fix?: string;
  fixWhy?: string;
  unknownCustomer?: boolean;
}

export interface KpiTile {
  nr: string;
  step: string;
  label: string;
  value: number;
  sub: string;
  who: string;
  whoBg: string;
  whoFg: string;
  barColor: string;
  w: number;
  d: number;
  bd: number;
  shown: number;
}

export interface WaitingOrder {
  nr: string;
  klant: string;
  klantNr: string;
  ref: string;
  firstWhy: string;
  avg: number | null;
  under: number;
  waitH: number;
  waitTxt: string;
  waitColor: string;
  st: string;
  d: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  sub: string;
  time: string;
  color: string;
  orderNr?: string;
}

export const INITIAL_ORDERS: OrderItem[] = [
  {
    nr: 'AP-26-04821',
    klant: 'Mazoe',
    klantNr: 'K-10289',
    klantConf: 97,
    klantWhy: 'Afzenderadres aankoop@mazoe.be hoort bij BC-klant K-10289',
    ref: 'MZ-2214',
    day: '08/10/2026',
    time: '16:22',
    min: 982,
    mb: 'bestel',
    from: 'aankoop@mazoe.be',
    subject: 'Bestelling week 42',
    body: 'Goedemiddag,\n\nIn bijlage onze bestelling voor week 42.\n\nMet vriendelijke groeten,\nAankoop Mazoe',
    att: 'Bestelbon_MZ-2214.pdf',
    ocr: null,
    ocrKind: 'Getypte PDF',
    st: 'verwerking',
    lines: []
  },
  {
    nr: 'AP-26-04820',
    klant: 'Hubo / Plafomat Sint-Niklaas',
    klantNr: 'K-10218',
    klantConf: 99,
    klantWhy: 'Afzender en btw-nummer op de bon komen overeen met BC-klant K-10218',
    ref: 'PO 4500128871',
    day: '08/10/2026',
    time: '15:47',
    min: 947,
    mb: 'bestel',
    from: 'inkoop.sintniklaas@plafomat.be',
    subject: 'PO 4500128871 Aalterpaint',
    body: 'Beste,\n\nGelieve in bijlage onze bestelling PO 4500128871 te vinden. Levering graag tegen dinsdag 13/10.\n\nVriendelijke groeten,\nAnn Verstraete\nInkoop Hubo / Plafomat Sint-Niklaas',
    att: 'PO_4500128871.pdf',
    ocr: 98,
    ocrKind: 'Getypte PDF',
    ocrWhy: 'Hoge score: digitale PDF met tekstlaag, alle velden leesbaar',
    st: 'pending',
    lines: [
      {
        id: 'AP-26-04820-1',
        raw: 'CLA05675-2.5L Aqualaq Mat basis A 2,5L',
        art: 'CLA05675-2.5L',
        qty: 12,
        unit: 'pot',
        conf: 99,
        why: 'Hoge score: artikelnummer CLA05675-2.5L staat letterlijk op de bon en komt overeen met eerdere orders van deze klant',
        want: { basis: 'A', pack: '2.5L' },
        bonQty: '12',
        confirmed: false,
        corrected: false,
        by: ''
      },
      {
        id: 'AP-26-04820-2',
        raw: 'CLA05676-10L Aqualaq Mat basis B 10L',
        art: 'CLA05676-10L',
        qty: 8,
        unit: 'emmer',
        conf: 98,
        why: 'Hoge score: artikelnummer CLA05676-10L staat letterlijk op de bon, basis en verpakking kloppen',
        want: { basis: 'B', pack: '10L' },
        bonQty: '8',
        confirmed: false,
        corrected: false,
        by: ''
      },
      {
        id: 'AP-26-04820-3',
        raw: 'Monoprim grijs 4L',
        art: 'MNP00430-4L',
        qty: 6,
        unit: 'blik',
        conf: 93,
        why: 'Hoge score: productnaam en verpakking eenduidig, deze klant bestelde dit artikel al 11 keer',
        want: { pack: '4L' },
        bonQty: '6',
        confirmed: false,
        corrected: false,
        by: ''
      },
      {
        id: 'AP-26-04820-4',
        raw: 'Thinner 20 4L',
        art: 'THN00020-4L',
        qty: 4,
        unit: 'blik',
        conf: 91,
        why: 'Hoge score: eenduidige productnaam, 4L is de enige verpakking van Thinner 20',
        want: { pack: '4L' },
        bonQty: '4',
        confirmed: false,
        corrected: false,
        by: ''
      }
    ]
  },
  {
    nr: 'AP-26-04819',
    klant: 'Uvin',
    klantNr: 'K-10145',
    klantConf: 96,
    klantWhy: 'Afzenderdomein uvin.be en leveradres komen overeen met BC-klant K-10145',
    ref: 'Werf Roeselare-Noord',
    day: '08/10/2026',
    time: '14:05',
    min: 845,
    mb: 'info',
    from: 'werven@uvin.be',
    subject: 'Bestelling werf Roeselare-Noord',
    body: 'Dag Aalterpaint,\n\nHierbij onze bestelling voor de werf Roeselare-Noord. Graag levering op de werf, liefst voor woensdag.\n\nGroeten,\nKoen Vanhee\nUvin',
    att: 'bestelbon_UV_0918.pdf',
    ocr: 91,
    ocrKind: 'Gescande getypte bon',
    ocrWhy: 'Hoge score: scan van een getypte bon, goed leesbaar',
    st: 'pending',
    lines: [
      {
        id: 'AP-26-04819-1',
        raw: 'muurverf mat basis B 10L',
        art: 'CLA05675-10L',
        qty: 6,
        unit: 'blik',
        conf: 58,
        why: 'Lage score: basis B op de bon, maar het voorgestelde artikel is basis A: controle mislukt. Deze klant bestelde de voorbije 3 maanden enkel basis A.',
        want: { basis: 'B', pack: '10L' },
        alts: [
          { art: 'CLA05676-10L', conf: 88, why: 'Basis B en 10L komen overeen met de bon' },
          { art: 'ACR02210-10L', conf: 61, why: 'Ook mat, basis B en 10L, maar gevelverf' },
          { art: 'CLA05677-10L', conf: 22, why: 'Basis C, controle zou mislukken' }
        ],
        bonQty: '6',
        confirmed: false,
        corrected: false,
        by: ''
      },
      {
        id: 'AP-26-04819-2',
        raw: '10 liter polyguard',
        art: 'PGD01120-KIT-10L',
        qty: 2,
        unit: 'kit',
        conf: 52,
        why: 'Lage score: omschrijving "10 liter polyguard" bevat geen eenduidige verpakkingsmaat (kit van 10L of los blik van 10L), twee kandidaten. RAL-code ontbreekt op de bon.',
        alts: [
          { art: 'PGD01120-10L', conf: 49, why: 'Basiscomponent 10L zonder verharder' },
          { art: 'PGD01180-KIT-10L', conf: 27, why: 'Kit 10L, maar in RAL 7016' }
        ],
        bonQty: '2',
        confirmed: false,
        corrected: false,
        by: ''
      },
      {
        id: 'AP-26-04819-3',
        raw: 'Cryltane DTS 40 RAL 9010 4L',
        art: 'CRY03310-4L',
        qty: 10,
        unit: 'blik',
        conf: 95,
        why: 'Hoge score: product, RAL-code en verpakking staan volledig op de bon',
        want: { ral: '9010', pack: '4L' },
        alts: [
          { art: 'CRY03310-1L', conf: 14, why: 'Zelfde kleur in 1L' }
        ],
        bonQty: '10',
        confirmed: false,
        corrected: false,
        by: ''
      },
      {
        id: 'AP-26-04819-4',
        raw: 'Thinner 20 4L',
        art: 'THN00020-4L',
        qty: 2,
        unit: 'blik',
        conf: 92,
        why: 'Hoge score: eenduidige productnaam en verpakking',
        want: { pack: '4L' },
        alts: [],
        bonQty: '2',
        confirmed: false,
        corrected: false,
        by: ''
      }
    ]
  },
  {
    nr: 'AP-26-04818',
    klant: 'Mazoe',
    klantNr: 'K-10289',
    klantConf: 84,
    klantWhy: 'Afzender jan@mazoe.be is een gekend contact van BC-klant K-10289. De bon zelf vermeldt geen klantnummer.',
    ref: 'Werf Deinze',
    day: '08/10/2026',
    time: '11:38',
    min: 698,
    mb: 'persoonlijk',
    from: 'jan@mazoe.be',
    subject: 'bestelling',
    body: 'Dag Pieter,\n\nZie bijlage, ik heb het vlug op papier gezet. Graag levering vrijdag.\n\nMvg\nJan',
    att: 'Scan_08102026_1134.pdf',
    ocr: 64,
    ocrKind: 'Handgeschreven bon (scan)',
    ocrWhy: 'Middelmatige score: handgeschreven bon, lage OCR-kwaliteit. Een hoeveelheid is niet leesbaar.',
    hand: true,
    st: 'pending',
    lines: [
      {
        id: 'AP-26-04818-1',
        raw: 'Durotop gloss 4L',
        art: 'DTP08590-4L',
        qty: 4,
        unit: 'blik',
        conf: 47,
        why: 'Lage score: RAL-code ontbreekt op de bon. Voorstel RAL 9005 op basis van de laatste order van deze klant.',
        want: { pack: '4L' },
        bonQty: '4',
        confirmed: false,
        corrected: false,
        by: ''
      },
      {
        id: 'AP-26-04818-2',
        raw: 'Monoprim grijs 20kg',
        art: 'MNP00430-20KG',
        qty: null,
        unit: 'emmer',
        conf: 66,
        why: 'Middelmatige score: handgeschreven bon, lage OCR-kwaliteit. De hoeveelheid is niet leesbaar.',
        want: { pack: '20KG' },
        bonQty: '?? (onleesbaar)',
        confirmed: false,
        corrected: false,
        by: ''
      },
      {
        id: 'AP-26-04818-3',
        raw: 'Polyzinc 20 kg',
        art: 'PZN00221-20KG',
        qty: 3,
        unit: 'emmer',
        conf: 74,
        why: 'Middelmatige score: handgeschreven bon, lage OCR-kwaliteit. Polyzinc 20KG wordt sinds september geleverd onder PZN00221-20KG (learning loop).',
        want: { pack: '20KG' },
        bonQty: '3',
        confirmed: false,
        corrected: false,
        by: ''
      }
    ]
  },
  {
    nr: 'AP-26-04817',
    klant: 'Delvano',
    klantNr: 'K-10312',
    klantConf: 98,
    klantWhy: 'Afzender aankoop@delvano.be en klantnummer op de bon komen overeen',
    ref: 'DV-2026-311',
    day: '08/10/2026',
    time: '10:52',
    min: 652,
    mb: 'bestel',
    from: 'aankoop@delvano.be',
    subject: 'Bestelling DV-2026-311',
    body: 'Hallo,\n\nBijgevoegd onze bestelling DV-2026-311.\n\nMet vriendelijke groet,\nDelvano aankoop',
    att: 'DV-2026-311.pdf',
    ocr: 97,
    ocrKind: 'Getypte PDF',
    ocrWhy: 'Hoge score: digitale PDF met tekstlaag',
    st: 'pending',
    lines: [
      {
        id: 'AP-26-04817-1',
        raw: 'ACR02210-10L Acrylon basis B 10L',
        art: 'ACR02210-10L',
        qty: 5,
        unit: 'emmer',
        conf: 97,
        why: 'Hoge score: artikelnummer staat letterlijk op de bon, basis en verpakking kloppen',
        want: { basis: 'B', pack: '10L' },
        bonQty: '5',
        confirmed: false,
        corrected: false,
        by: ''
      },
      {
        id: 'AP-26-04817-2',
        raw: 'HYD01005-10L Hydroprim 10L',
        art: 'HYD01005-10L',
        qty: 3,
        unit: 'emmer',
        conf: 96,
        why: 'Hoge score: artikelnummer staat letterlijk op de bon',
        want: { pack: '10L' },
        bonQty: '3',
        confirmed: false,
        corrected: false,
        by: ''
      },
      {
        id: 'AP-26-04817-3',
        raw: 'CLA05675-2.5L Aqualaq Mat A 2,5L',
        art: 'CLA05675-2.5L',
        qty: 10,
        unit: 'pot',
        conf: 99,
        why: 'Hoge score: artikelnummer CLA05675-2.5L staat letterlijk op de bon en komt overeen met eerdere orders van deze klant',
        want: { basis: 'A', pack: '2.5L' },
        bonQty: '10',
        confirmed: false,
        corrected: false,
        by: ''
      }
    ]
  },
  {
    nr: 'AP-26-04816',
    klant: 'Bellens-Beneens',
    klantNr: 'K-10056',
    klantConf: 95,
    klantWhy: 'Afzenderdomein en btw-nummer komen overeen met BC-klant K-10056',
    ref: 'BB/2026/1187',
    day: '08/10/2026',
    time: '09:20',
    min: 560,
    mb: 'info',
    from: 'orders@bellens-beneens.be',
    subject: 'Bestelling BB/2026/1187',
    body: 'Goedemorgen,\n\nIn bijlage bestelling BB/2026/1187.\n\nVriendelijke groeten,\nEls Beneens',
    att: 'BB-2026-1187.pdf',
    ocr: 89,
    ocrKind: 'Gescande getypte bon',
    ocrWhy: 'Hoge score: scan van een getypte bon, licht scheef ingescand',
    st: 'pending',
    lines: [
      {
        id: 'AP-26-04816-1',
        raw: 'Durofloor 2K grijs RAL 7040 kit',
        art: 'DFL04410-KIT-4L',
        qty: 2,
        unit: 'kit',
        conf: 94,
        why: 'Hoge score: product, RAL-code en verpakking staan op de bon',
        want: { ral: '7040', pack: 'KIT' },
        bonQty: '2',
        confirmed: false,
        corrected: false,
        by: ''
      },
      {
        id: 'AP-26-04816-2',
        raw: 'polyguard 7016 kit',
        art: 'PGD01180-KIT-10L',
        qty: 1,
        unit: 'kit',
        conf: 100,
        why: 'Volledige score: deze omschrijving werd op 06/10/2026 voor deze klant bevestigd door een beoordelaar (learning loop)',
        want: { ral: '7016', pack: 'KIT' },
        bonQty: '1',
        confirmed: false,
        corrected: false,
        by: ''
      },
      {
        id: 'AP-26-04816-3',
        raw: 'Cryltane DTS40 antraciet 4L',
        art: 'CRY03350-4L',
        qty: 6,
        unit: 'blik',
        conf: 62,
        why: 'Lage score: "antraciet" werd vertaald naar RAL 7016, maar deze klant bestelde vorige maand RAL 7021. Twee kandidaten.',
        want: { pack: '4L' },
        bonQty: '6',
        confirmed: false,
        corrected: false,
        by: ''
      }
    ]
  },
  {
    nr: 'AP-26-04815',
    klant: 'Hubo / Plafomat Aalter',
    klantNr: 'K-10221',
    klantConf: 99,
    klantWhy: 'Afzender en btw-nummer komen overeen met BC-klant K-10221',
    ref: 'PO 4500128790',
    day: '08/10/2026',
    time: '09:02',
    min: 542,
    mb: 'bestel',
    from: 'inkoop.aalter@plafomat.be',
    subject: 'PO 4500128790',
    body: 'Beste,\n\nIn bijlage PO 4500128790.\n\nGroeten,\nInkoop Aalter',
    att: 'PO_4500128790.pdf',
    ocr: 98,
    ocrKind: 'Getypte PDF',
    ocrWhy: 'Hoge score: digitale PDF met tekstlaag',
    st: 'gesync',
    approvedBy: 'Katrien Vermeulen',
    approvedAt: '08/10/2026 09:41',
    vo: 'VO-26-018738',
    syncAt: '08/10/2026 09:41',
    lines: [
      {
        id: 'AP-26-04815-1',
        raw: 'CLA05675-10L Aqualaq Mat A 10L',
        art: 'CLA05675-10L',
        qty: 10,
        unit: 'emmer',
        conf: 97,
        why: 'Hoge score: artikelnummer staat letterlijk op de bon',
        bonQty: '10',
        confirmed: true,
        corrected: false,
        by: 'Katrien Vermeulen'
      },
      {
        id: 'AP-26-04815-2',
        raw: 'Aqualaq mat B 2,5',
        art: 'CLA05676-2.5L',
        qty: 6,
        unit: 'pot',
        conf: 100,
        why: 'Gecorrigeerd door Katrien Vermeulen: CLA05675-2.5L vervangen door CLA05676-2.5L.',
        bonQty: '6',
        confirmed: true,
        corrected: true,
        by: 'Katrien Vermeulen'
      },
      {
        id: 'AP-26-04815-3',
        raw: 'Monoprim grijs 4L',
        art: 'MNP00430-4L',
        qty: 4,
        unit: 'blik',
        conf: 95,
        why: 'Hoge score: productnaam en verpakking eenduidig',
        bonQty: '4',
        confirmed: true,
        corrected: false,
        by: 'Katrien Vermeulen'
      }
    ]
  },
  {
    nr: 'AP-26-04814',
    klant: 'Mazoe',
    klantNr: 'K-10289',
    klantConf: 97,
    klantWhy: 'Afzenderadres hoort bij BC-klant K-10289',
    ref: 'MZ-2209',
    day: '08/10/2026',
    time: '08:40',
    min: 520,
    mb: 'info',
    from: 'aankoop@mazoe.be',
    subject: 'Bestelling MZ-2209',
    body: 'Goedemorgen,\n\nZie bijlage.\n\nAankoop Mazoe',
    att: 'Bestelbon_MZ-2209.pdf',
    ocr: 96,
    ocrKind: 'Getypte PDF',
    ocrWhy: 'Hoge score: digitale PDF met tekstlaag',
    st: 'gesync',
    approvedBy: 'Pieter De Smet',
    approvedAt: '08/10/2026 09:15',
    vo: 'VO-26-018737',
    syncAt: '08/10/2026 09:15',
    lines: [
      {
        id: 'AP-26-04814-1',
        raw: 'Cryltane DTS 40 RAL 9010 1L',
        art: 'CRY03310-1L',
        qty: 24,
        unit: 'blik',
        conf: 96,
        why: 'Hoge score: product, RAL-code en verpakking staan op de bon',
        bonQty: '24',
        confirmed: true,
        corrected: false,
        by: 'Pieter De Smet'
      },
      {
        id: 'AP-26-04814-2',
        raw: 'Thinner 1 1L',
        art: 'THN00001-1L',
        qty: 12,
        unit: 'blik',
        conf: 94,
        why: 'Hoge score: eenduidige productnaam en verpakking',
        bonQty: '12',
        confirmed: true,
        corrected: false,
        by: 'Pieter De Smet'
      }
    ]
  },
  {
    nr: 'AP-26-04813',
    klant: 'Fontaine Beauvois',
    klantNr: 'K-10077',
    klantConf: 96,
    klantWhy: 'Afzenderdomein komt overeen met BC-klant K-10077',
    ref: 'Werf Kortrijk',
    day: '08/10/2026',
    time: '08:15',
    min: 495,
    mb: 'info',
    from: 'commandes@fontaine-beauvois.be',
    subject: 'TR: bestelling werf Kortrijk',
    body: 'Doorgestuurd bericht\n\nBestelling werf Kortrijk, zie bijlage.',
    att: 'bestelbon_FB_0915.pdf',
    ocr: 92,
    ocrKind: 'Gescande getypte bon',
    ocrWhy: 'Hoge score: goed leesbare scan',
    st: 'afgewezen',
    rejectedBy: 'Katrien Vermeulen',
    rejectedAt: '08/10/2026 08:52',
    rejectReason: 'Dubbele bestelling: dezelfde bon kwam gisteren al binnen als AP-26-04808.',
    lines: [
      {
        id: 'AP-26-04813-1',
        raw: 'Acrylon basis A 10L',
        art: 'ACR02209-10L',
        qty: 4,
        unit: 'emmer',
        conf: 93,
        why: 'Hoge score: product, basis en verpakking staan op de bon',
        bonQty: '4',
        confirmed: false,
        corrected: false,
        by: ''
      }
    ]
  },
  {
    nr: 'AP-26-04812',
    klant: 'Bellens-Beneens',
    klantNr: 'K-10056',
    klantConf: 72,
    klantWhy: 'Middelmatige score: afzender gekend, maar het btw-nummer op de bon is nieuw',
    ref: 'BB/2026/1179',
    day: '07/10/2026',
    time: '16:48',
    min: -432,
    mb: 'bestel',
    from: 'orders@bellens-beneens.be',
    subject: 'Bestelling BB/2026/1179',
    body: 'Goedemiddag,\n\nIn bijlage onze bestelling. Let op: nieuw btw-nummer na de fusie.\n\nEls Beneens',
    att: 'BB-2026-1179.pdf',
    ocr: 95,
    ocrKind: 'Getypte PDF',
    ocrWhy: 'Hoge score: digitale PDF met tekstlaag',
    st: 'syncfout',
    approvedBy: 'Pieter De Smet',
    approvedAt: '07/10/2026 17:05',
    attempts: 2,
    unknownCustomer: true,
    syncErr: 'Klant niet gevonden: btw-nummer BE 0712.345.678 op de bon is aan geen klantfiche gekoppeld.',
    fix: 'Koppel btw-nummer BE 0712.345.678 aan BC-klant K-10056 Bellens-Beneens',
    fixWhy: 'Afzender, leveradres en contactpersoon komen overeen met K-10056. Het nieuwe btw-nummer wordt aan de klantfiche toegevoegd.',
    lines: [
      {
        id: 'AP-26-04812-1',
        raw: 'Durofloor 2K RAL 7040 kit',
        art: 'DFL04410-KIT-4L',
        qty: 3,
        unit: 'kit',
        conf: 95,
        why: 'Hoge score: product, RAL-code en verpakking staan op de bon',
        bonQty: '3',
        confirmed: true,
        corrected: false,
        by: 'Pieter De Smet'
      },
      {
        id: 'AP-26-04812-2',
        raw: 'Hydroprim 10L',
        art: 'HYD01005-10L',
        qty: 2,
        unit: 'emmer',
        conf: 92,
        why: 'Hoge score: eenduidige productnaam en verpakking',
        bonQty: '2',
        confirmed: true,
        corrected: false,
        by: 'Pieter De Smet'
      }
    ]
  },
  {
    nr: 'AP-26-04811',
    klant: 'Delvano',
    klantNr: 'K-10312',
    klantConf: 90,
    klantWhy: 'Afzender is een gekend contact van BC-klant K-10312',
    ref: 'Werf Destelbergen',
    day: '07/10/2026',
    time: '15:12',
    min: -528,
    mb: 'persoonlijk',
    from: 'jan@delvano.be',
    subject: 'bestelling Destelbergen',
    body: 'Dag Pieter,\n\nVoor Destelbergen.\n\nJan',
    att: 'Scan_07102026.pdf',
    ocr: 71,
    ocrKind: 'Handgeschreven bon (scan)',
    ocrWhy: 'Middelmatige score: handgeschreven bon',
    hand: true,
    st: 'syncfout',
    approvedBy: 'Katrien Vermeulen',
    approvedAt: '07/10/2026 15:40',
    attempts: 1,
    syncErr: 'Artikel PZN00220-20KG is geblokkeerd in Business Central.',
    fix: 'Vervang PZN00220-20KG door opvolgartikel PZN00221-20KG',
    fixWhy: 'PZN00221-20KG is sinds september het actieve artikel voor Polyzinc 20 kg. Prijs en verpakking zijn identiek.',
    lines: [
      {
        id: 'AP-26-04811-1',
        raw: 'Polyzinc 20kg',
        art: 'PZN00220-20KG',
        qty: 2,
        unit: 'emmer',
        conf: 81,
        why: 'Hoge score: productnaam en verpakking eenduidig',
        bonQty: '2',
        confirmed: true,
        corrected: false,
        by: 'Katrien Vermeulen'
      },
      {
        id: 'AP-26-04811-2',
        raw: 'Monoprim grijs 20kg',
        art: 'MNP00430-20KG',
        qty: 2,
        unit: 'emmer',
        conf: 78,
        why: 'Middelmatige score: handgeschreven bon',
        bonQty: '2',
        confirmed: true,
        corrected: false,
        by: 'Katrien Vermeulen'
      }
    ]
  },
  {
    nr: 'AP-26-04810',
    klant: 'Uvin',
    klantNr: 'K-10145',
    klantConf: 98,
    klantWhy: 'Afzender en klantnummer komen overeen',
    ref: 'UV-PO-77288',
    day: '07/10/2026',
    time: '11:30',
    min: -870,
    mb: 'bestel',
    from: 'purchase@uvin.be',
    subject: 'Order UV-PO-77288',
    body: 'Hallo,\n\nBijgevoegd order UV-PO-77288.\n\nUvin aankoop',
    att: 'UV-PO-77288.pdf',
    ocr: 97,
    ocrKind: 'Getypte PDF',
    ocrWhy: 'Hoge score: digitale PDF met tekstlaag',
    st: 'gesync',
    approvedBy: 'Pieter De Smet',
    approvedAt: '07/10/2026 11:58',
    vo: 'VO-26-018721',
    syncAt: '07/10/2026 11:58',
    lines: [
      {
        id: 'AP-26-04810-1',
        raw: 'CLA05677-10L Aqualaq Mat C 10L',
        art: 'CLA05677-10L',
        qty: 6,
        unit: 'emmer',
        conf: 98,
        why: 'Hoge score: artikelnummer staat letterlijk op de bon',
        bonQty: '6',
        confirmed: true,
        corrected: false,
        by: 'Pieter De Smet'
      }
    ]
  },
  {
    nr: 'AP-26-04809',
    klant: 'Hubo / Plafomat Sint-Niklaas',
    klantNr: 'K-10218',
    klantConf: 99,
    klantWhy: 'Afzender en btw-nummer komen overeen',
    ref: 'PO 4500128702',
    day: '07/10/2026',
    time: '09:05',
    min: -1015,
    mb: 'bestel',
    from: 'inkoop.sintniklaas@plafomat.be',
    subject: 'PO 4500128702',
    body: 'Beste,\n\nIn bijlage PO 4500128702.\n\nAnn Verstraete',
    att: 'PO_4500128702.pdf',
    ocr: 98,
    ocrKind: 'Getypte PDF',
    ocrWhy: 'Hoge score: digitale PDF met tekstlaag',
    st: 'gesync',
    approvedBy: 'Katrien Vermeulen',
    approvedAt: '07/10/2026 09:22',
    vo: 'VO-26-018715',
    syncAt: '07/10/2026 09:22',
    lines: [
      {
        id: 'AP-26-04809-1',
        raw: 'CLA05675-2.5L Aqualaq Mat A 2,5L',
        art: 'CLA05675-2.5L',
        qty: 18,
        unit: 'pot',
        conf: 99,
        why: 'Hoge score: artikelnummer staat letterlijk op de bon',
        bonQty: '18',
        confirmed: true,
        corrected: false,
        by: 'Katrien Vermeulen'
      },
      {
        id: 'AP-26-04809-2',
        raw: 'MNP00430-4L Monoprim grijs 4L',
        art: 'MNP00430-4L',
        qty: 8,
        unit: 'blik',
        conf: 98,
        why: 'Hoge score: artikelnummer staat letterlijk op de bon',
        bonQty: '8',
        confirmed: true,
        corrected: false,
        by: 'Katrien Vermeulen'
      }
    ]
  }
];

export const FLOW_TILES: KpiTile[] = [
  {
    nr: '01',
    step: 'Mail intake',
    label: 'Received',
    value: 9,
    sub: 'order emails from 3 mailboxes',
    who: 'System',
    whoBg: '#F2F2F2',
    whoFg: '#4D4D4D',
    barColor: '#E20714',
    w: 100,
    d: 60,
    bd: 250,
    shown: 9
  },
  {
    nr: '02',
    step: 'OCR and AI',
    label: 'Incorporated',
    value: 9,
    sub: '0 still in progress',
    who: 'Automatic',
    whoBg: '#FFF3B8',
    whoFg: '#5C4A00',
    barColor: '#E20714',
    w: 100,
    d: 130,
    bd: 340,
    shown: 9
  },
  {
    nr: '03',
    step: 'Validation',
    label: 'Awaiting inspection',
    value: 6,
    sub: 'with extra attention',
    who: 'Employee',
    whoBg: '#E7EEFC',
    whoFg: '#1D4FBF',
    barColor: '#E20714',
    w: 67,
    d: 200,
    bd: 430,
    shown: 6
  },
  {
    nr: '04',
    step: 'Validation',
    label: 'Approved',
    value: 2,
    sub: 'only then to Business Central',
    who: 'Employee',
    whoBg: '#E7EEFC',
    whoFg: '#1D4FBF',
    barColor: '#E20714',
    w: 22,
    d: 270,
    bd: 520,
    shown: 2
  },
  {
    nr: '05',
    step: 'Validation',
    label: 'Rejected',
    value: 1,
    sub: 'not sent to BC',
    who: 'Employee',
    whoBg: '#E7EEFC',
    whoFg: '#1D4FBF',
    barColor: '#9A9A9A',
    w: 11,
    d: 340,
    bd: 610,
    shown: 1
  },
  {
    nr: '06',
    step: 'Business Central',
    label: 'Synchronized with BC',
    value: 2,
    sub: 'created as sales order',
    who: 'System',
    whoBg: '#F2F2F2',
    whoFg: '#4D4D4D',
    barColor: '#E20714',
    w: 22,
    d: 410,
    bd: 700,
    shown: 2
  }
];

export const WAITING_ORDERS_DATA: WaitingOrder[] = [
  {
    nr: 'AP-26-04816',
    klant: 'Bellens-Beleens',
    klantNr: 'K-10056',
    ref: 'BB/2026/1187',
    firstWhy: 'Rule 3: "Anthracite" was translated to RAL 7016, but this customer ordered RAL 7021 last month. Two candidates.',
    avg: 85,
    under: 1,
    waitH: 7.2,
    waitTxt: '7.2 hours',
    waitColor: '#A61B1B',
    st: 'aandacht',
    d: 120
  },
  {
    nr: 'AP-26-04818',
    klant: 'Mazoe',
    klantNr: 'K-10289',
    ref: 'Werf Deinze',
    firstWhy: 'Line 1: RAL code missing on the order form. Proposal RAL 9005 based on this customer\'s last order.',
    avg: 62,
    under: 1,
    waitH: 4.9,
    waitTxt: '4.9 hours',
    waitColor: '#A61B1B',
    st: 'aandacht',
    d: 190
  },
  {
    nr: 'AP-26-04819',
    klant: 'Uvin',
    klantNr: 'K-10145',
    ref: 'Werf Roeselare-Noord',
    firstWhy: 'Line 1: Base B on the order form, but proposed article is base A: check failed.',
    avg: 75,
    under: 2,
    waitH: 2.4,
    waitTxt: '2.4 hours',
    waitColor: '#4D4D4D',
    st: 'aandacht',
    d: 260
  },
  {
    nr: 'AP-26-04817',
    klant: 'Delvano',
    klantNr: 'K-10312',
    ref: 'DV-2026-311',
    firstWhy: 'All lines above threshold, standard inspection required.',
    avg: 97,
    under: 0,
    waitH: 5.6,
    waitTxt: '5.6 hours',
    waitColor: '#A61B1B',
    st: 'klaar',
    d: 330
  },
  {
    nr: 'AP-26-04820',
    klant: 'Hubo / Plafomat Sint-Niklaas',
    klantNr: 'K-10218',
    ref: 'PO 4500128871',
    firstWhy: 'All lines above threshold, standard inspection required.',
    avg: 95,
    under: 0,
    waitH: 0.7,
    waitTxt: '43 min',
    waitColor: '#4D4D4D',
    st: 'klaar',
    d: 400
  },
  {
    nr: 'AP-26-04821',
    klant: 'Mazoe',
    klantNr: 'K-10289',
    ref: 'MZ-2214',
    firstWhy: 'OCR and AI matching in progress',
    avg: null,
    under: 0,
    waitH: 0.1,
    waitTxt: '8 min',
    waitColor: '#4D4D4D',
    st: 'verwerking',
    d: 470
  }
];

export const NOTIFICATIONS_DATA: NotificationItem[] = [
  {
    id: 'n1',
    title: 'AP-26-04816 has been waiting 7.2 hours for validation',
    sub: 'Bellens-Beleens · Needs attention',
    time: '09:20',
    color: '#A61B1B',
    orderNr: 'AP-26-04816'
  },
  {
    id: 'n2',
    title: 'AP-26-04818 has been waiting 4.9 hours for validation',
    sub: 'Mazoe · Needs attention',
    time: '11:38',
    color: '#A61B1B',
    orderNr: 'AP-26-04818'
  },
  {
    id: 'n3',
    title: 'AP-26-04817 has been waiting 5.6 hours for validation',
    sub: 'Delvano · Ready for review',
    time: '10:52',
    color: '#A61B1B',
    orderNr: 'AP-26-04817'
  },
  {
    id: 'n4',
    title: 'BC-sync failed for AP-26-04812',
    sub: 'Customer not found: VAT number BE 0712.345.678 not linked',
    time: '17:05',
    color: '#A61B1B',
    orderNr: 'AP-26-04812'
  },
  {
    id: 'n5',
    title: 'BC-sync failed for AP-26-04811',
    sub: 'Article PZN00220-20KG is blocked in Business Central',
    time: '15:40',
    color: '#A61B1B',
    orderNr: 'AP-26-04811'
  },
  {
    id: 'n6',
    title: 'AP-26-04819 requires extra attention',
    sub: 'Uvin',
    time: '14:05',
    color: '#E8590C',
    orderNr: 'AP-26-04819'
  },
  {
    id: 'n7',
    title: 'AP-26-04820 is ready for review',
    sub: 'Hubo / Plafomat Sint-Niklaas',
    time: '15:47',
    color: '#2F6FEB',
    orderNr: 'AP-26-04820'
  },
  {
    id: 'n8',
    title: 'New order email in bestel@aalterpaint.be',
    sub: 'Mazoe · being processed',
    time: '16:22',
    color: '#9A9A9A',
    orderNr: 'AP-26-04821'
  }
];

export interface InsightAttentionItem {
  id: string;
  value: number | string;
  title: string;
  text: string;
  cta: string;
  color: string;
  d: number;
}

export interface QualityStatItem {
  v: string;
  l: string;
  s: string;
  d: number;
}

export const INSIGHTS_ATTENTION_DATA: InsightAttentionItem[] = [
  {
    id: 'att-1',
    value: 3,
    title: 'Uncertain article matches',
    text: 'below the threshold of 70%, spread over 3 orders',
    cta: 'SHOW THESE ORDERS',
    color: '#8A3405',
    d: 80,
  },
  {
    id: 'att-2',
    value: 1,
    title: 'Missing quantity or unit',
    text: 'in AP-26-04818',
    cta: 'OPEN THE ORDER',
    color: '#A61B1B',
    d: 150,
  },
  {
    id: 'att-3',
    value: 3,
    title: 'Orders waiting longer than 4 hours',
    text: 'longest waiting: AP-26-04816 (7.2 hours)',
    cta: 'SHOW THESE ORDERS',
    color: '#A61B1B',
    d: 220,
  },
  {
    id: 'att-4',
    value: 2,
    title: 'Failed BC synchronizations',
    text: 'AP-26-04812, AP-26-04811 waiting for follow-up',
    cta: 'TO EXCEPTIONS',
    color: '#A61B1B',
    d: 290,
  },
  {
    id: 'att-5',
    value: 2,
    title: 'Customers with low match quality',
    text: 'Mazoe 74% · Bellens-Beneens 79% (today)',
    cta: 'SHOW ORDERS',
    color: '#8A3405',
    d: 360,
  },
];

export const QUALITY_STATS_DATA: QualityStatItem[] = [
  {
    d: 100,
    v: '86,1%',
    l: 'precision of proposals',
    s: 'POC baseline across 467 orders, with Business Central as ground truth',
  },
  {
    d: 170,
    v: '66,6%',
    l: 'of order lines above threshold',
    s: 'proposals with confidence of 70% or more (POC)',
  },
  {
    d: 240,
    v: '80,4%',
    l: 'lines already known for regular customers',
    s: 'learning curve starting from 50 orders of the same customer (POC)',
  },
];

export interface CatProduct {
  d: string;
  fam: string;
  basis?: string;
  pack: string;
  unit: string;
  ral?: string;
  blocked?: boolean;
}

export const CAT: Record<string, CatProduct> = {
  'CLA05675-2.5L': { d: 'Aqualaq Mat muurverf basis A', fam: 'CLA', basis: 'A', pack: '2.5L', unit: 'blik' },
  'CLA05675-10L': { d: 'Aqualaq Mat muurverf basis A', fam: 'CLA', basis: 'A', pack: '10L', unit: 'blik' },
  'CLA05676-2.5L': { d: 'Aqualaq Mat muurverf basis B', fam: 'CLA', basis: 'B', pack: '2.5L', unit: 'blik' },
  'CLA05676-10L': { d: 'Aqualaq Mat muurverf basis B', fam: 'CLA', basis: 'B', pack: '10L', unit: 'blik' },
  'CLA05677-10L': { d: 'Aqualaq Mat muurverf basis C', fam: 'CLA', basis: 'C', pack: '10L', unit: 'blik' },
  'ACR02209-10L': { d: 'Acrylon gevelverf mat basis A', fam: 'ACR', basis: 'A', pack: '10L', unit: 'blik' },
  'ACR02210-10L': { d: 'Acrylon gevelverf mat basis B', fam: 'ACR', basis: 'B', pack: '10L', unit: 'blik' },
  'HYD01005-10L': { d: 'Hydroprim hechtprimer wit', fam: 'HYD', pack: '10L', unit: 'blik' },
  'MNP00430-4L': { d: 'Monoprim grondverf grijs', fam: 'MNP', pack: '4L', unit: 'blik' },
  'MNP00430-20KG': { d: 'Monoprim grondverf grijs', fam: 'MNP', pack: '20KG', unit: 'emmer' },
  'PGD01120-KIT-10L': { d: 'Polyguard 2K epoxy RAL 7035, kit 10L', fam: 'PGD', ral: '7035', pack: 'KIT', unit: 'kit' },
  'PGD01120-10L': { d: 'Polyguard 2K epoxy RAL 7035, basiscomponent 10L', fam: 'PGD', ral: '7035', pack: '10L', unit: 'blik' },
  'PGD01180-KIT-10L': { d: 'Polyguard 2K epoxy RAL 7016, kit 10L', fam: 'PGD', ral: '7016', pack: 'KIT', unit: 'kit' },
  'CRY03310-1L': { d: 'Cryltane DTS 40 RAL 9010', fam: 'CRY', ral: '9010', pack: '1L', unit: 'blik' },
  'CRY03310-4L': { d: 'Cryltane DTS 40 RAL 9010', fam: 'CRY', ral: '9010', pack: '4L', unit: 'blik' },
  'CRY03350-4L': { d: 'Cryltane DTS 40 RAL 7016', fam: 'CRY', ral: '7016', pack: '4L', unit: 'blik' },
  'CRY03360-4L': { d: 'Cryltane DTS 40 RAL 7021', fam: 'CRY', ral: '7021', pack: '4L', unit: 'blik' },
  'DTP08510-4L': { d: 'Durotop AC 85 Gloss RAL 5010', fam: 'DTP', ral: '5010', pack: '4L', unit: 'blik' },
  'DTP08516-4L': { d: 'Durotop AC 85 Gloss RAL 9016', fam: 'DTP', ral: '9016', pack: '4L', unit: 'blik' },
  'DTP08590-4L': { d: 'Durotop AC 85 Gloss RAL 9005', fam: 'DTP', ral: '9005', pack: '4L', unit: 'blik' },
  'DFL04410-KIT-4L': { d: 'Durofloor 2K vloercoating RAL 7040, kit 4L', fam: 'DFL', ral: '7040', pack: 'KIT', unit: 'kit' },
  'PZN00220-20KG': { d: 'Polyzinc zinkstofprimer (geblokkeerd)', fam: 'PZN', pack: '20KG', unit: 'emmer', blocked: true },
  'PZN00221-20KG': { d: 'Polyzinc zinkstofprimer', fam: 'PZN', pack: '20KG', unit: 'emmer' },
  'THN00001-1L': { d: 'Thinner 1', fam: 'THN', pack: '1L', unit: 'blik' },
  'THN00020-4L': { d: 'Thinner 20', fam: 'THN', pack: '4L', unit: 'blik' }
};

export const CONTACT_DATA: Record<string, { name: string; role: string; phone: string }> = {
  'Mazoe': { name: 'Jan Mortier', role: 'Werfleider', phone: '+32 9 386 12 40' },
  'Hubo / Plafomat Sint-Niklaas': { name: 'Ann Verstraete', role: 'Inkoop', phone: '+32 3 776 55 10' },
  'Hubo / Plafomat Aalter': { name: 'Tom De Clercq', role: 'Inkoop', phone: '+32 9 374 21 90' },
  'Fontaine Beauvois': { name: 'Marc Fontaine', role: 'Zaakvoerder', phone: '+32 56 33 18 27' },
  'Delvano': { name: 'Lien De Wilde', role: 'Aankoop', phone: '+32 9 355 61 02' },
  'Uvin': { name: 'Koen Vanhee', role: 'Werfcoördinator', phone: '+32 51 20 44 18' },
  'Bellens-Beneens': { name: 'Els Beneens', role: 'Orderadministratie', phone: '+32 14 58 90 33' }
};

export const ADRES_DATA: Record<string, string> = {
  'Mazoe': 'Industrieweg 12, 9800 Deinze',
  'Hubo / Plafomat Sint-Niklaas': 'Parklaan 87, 9100 Sint-Niklaas',
  'Hubo / Plafomat Aalter': 'Lostraat 21, 9880 Aalter',
  'Fontaine Beauvois': 'Rue de la Station 4, 7700 Moeskroen',
  'Delvano': 'Koning Albertlaan 140, 9080 Lochristi',
  'Uvin': 'Brugsesteenweg 302, 8800 Roeselare',
  'Bellens-Beneens': 'Ambachtenstraat 9, 2440 Geel'
};


