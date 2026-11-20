export const categories = ['Все', 'Места', 'События', 'Фестивали', 'Концерты', 'Туры'] as const;
export type Category = typeof categories[number];
export type Coordinates = readonly [lat: number, lon: number];

export const places = {
  kremlin: {
    title: 'Нижегородский кремль', district: 'Площадь Минина и Пожарского', coordinates: [56.32694, 44.00582],
    fact: 'Дмитриевская башня — один из символов Нижнего. Она выходит на площадь Минина и Пожарского. Всего в каменной крепости 13 башен.',
    hint: 'Ищи башню с зелёной крышей со стороны площади Минина и Пожарского. Подойди к проходу с площади.',
  },
  stairs: {
    title: 'Чкаловская лестница', district: 'Верхневолжская набережная', coordinates: [56.33047, 44.00944],
    fact: 'Сверху хорошо видно, как марши лестницы образуют восьмёрку. Лестница соединяет Верхневолжскую и Нижневолжскую набережные.',
    hint: 'От кремля иди к памятнику Валерию Чкалову. У верхней площадки открывается вид на Волгу.',
  },
  street: {
    title: 'Рождественская улица', district: 'Улица Рождественская, 34А', coordinates: [56.32872, 43.98975],
    fact: 'Строгановская церковь на Рождественской улице узнаваема по красным стенам и белокаменной резьбе. Её построили на средства Григория Строганова.',
    hint: 'Прогуляйся вдоль Волги к Речному вокзалу, затем выйди на Рождественскую. Ищи красный храм с цветными куполами.',
  },
  strelka: {
    title: 'Стрелка', district: 'Мыс у слияния Оки и Волги', coordinates: [56.33451, 43.97702],
    fact: 'На Стрелке Ока впадает в Волгу. С этого берега видны Нижегородский кремль и склоны исторического центра.',
    hint: 'Перейди Оку по пешеходной стороне Канавинского моста и держись улицы Стрелка. Точка у смотровой площадки.',
  },
  cathedral: {
    title: 'Собор Александра Невского', district: 'Улица Стрелка, 3А', coordinates: [56.33340, 43.97203],
    fact: 'Жёлтый Новоярмарочный собор построен во второй половине XIX века. Его высокие шатры хорошо видны с противоположного берега Оки.',
    hint: 'На улице Стрелка ищи жёлтый храм с тёмными шатрами. Остановись на подходе к собору со стороны улицы.',
  },
  stadium: {
    title: 'Стадион «Нижний Новгород»', district: 'Район Стрелки', coordinates: [56.33639, 43.96660],
    fact: 'Стадион построили к чемпионату мира по футболу 2018 года. Его легко узнать по кольцу белых колонн.',
    hint: 'От Стрелки двигайся мимо пакгаузов к белым колоннам. Точка на внешней площадке у стадиона.',
  },
} satisfies Record<string, { title: string; district: string; coordinates: Coordinates; fact: string; hint: string }>;

export type PlaceId = keyof typeof places;
export const placeOrder: PlaceId[] = ['kremlin', 'stairs', 'strelka', 'cathedral', 'stadium', 'street'];

export interface Quest {
  id: string;
  title: string;
  description: string;
  intro: string;
  stops: PlaceId[];
  required: number;
  minutes: string;
}
export const quests: Quest[] = [
  { id: 'ghosts', title: 'Призраки шепчут', description: 'От стен старой крепости к купеческой улице. Истории города подскажут, где искать финал.', intro: 'Начнём у крепости. Найди башню, которая встречает гостей со стороны главной площади.', stops: ['kremlin', 'stairs', 'street', 'strelka'], required: 0, minutes: '1–1,5 часа' },
  { id: 'spit', title: 'Прогулка по Стрелке', description: 'Изучи район, где сходятся две реки, от ярмарочного собора до стадиона.', intro: 'Ищи на Стрелке высокий жёлтый собор. Он виден с другого берега Оки.', stops: ['cathedral', 'strelka', 'stadium'], required: 0, minutes: '30–45 минут' },
  { id: 'merchants', title: 'Купеческие истории', description: 'Начни со Строгановской церкви и посмотри, как город жил у реки и за крепостными стенами.', intro: 'Начни там, где красный фасад украшен белокаменной резьбой.', stops: ['street', 'kremlin', 'stairs'], required: 60, minutes: '40–60 минут' },
];

export const events = [
  { id: 'music', title: 'Концерт на Стрелке', category: 'Концерты', place: 'strelka', when: '18 июля, 19:00 · пример', description: 'Летний концерт под открытым небом у слияния Оки и Волги.', url: 'https://www.afisha.ru/nnovgorod/concerts/' },
  { id: 'evening', title: 'Вечер на набережной', category: 'События', place: 'stairs', when: '19 июля, 18:00 · пример', description: 'Вечерняя встреча на волжской набережной и прогулка в сторону Чкаловской лестницы.', url: 'https://www.afisha.ru/nnovgorod/' },
  { id: 'festival', title: 'Фестиваль у двух рек', category: 'Фестивали', place: 'strelka', when: '25 июля, 15:00 · пример', description: 'Фестиваль с локальной кухней и музыкой на Стрелке.', url: 'https://www.afisha.ru/nnovgorod/' },
  { id: 'tour', title: 'Прогулка по кремлю', category: 'Туры', place: 'kremlin', when: 'По расписанию организатора', description: 'Пешеходная прогулка по территории кремля с рассказом о его башнях.', url: 'https://www.afisha.ru/nnovgorod/' },
] satisfies { id: string; title: string; category: Category; place: PlaceId; when: string; description: string; url: string }[];

export const art = (name: string) => '/art/' + name + '.webp';
export const osm = ([lat, lng]: Coordinates) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
export const walk = ([lat,lng]: Coordinates) => `https://yandex.ru/maps/47/nizhny-novgorod/?rtext=~${lat}%2C${lng}&rtt=pd`;
export const POINTS = 20;
