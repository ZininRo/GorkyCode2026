-- Owner: Юля (game/ + events/). MVP quest + discovery feed.
-- Additive migration: does not touch users/refresh_tokens/cities (registration stays as is).
-- Coordinates are APPROXIMATE demo values: verify every point on a map before a public launch.

CREATE TABLE game_routes (
    id             VARCHAR(32) PRIMARY KEY,
    title_ru       VARCHAR(120) NOT NULL,
    title_en       VARCHAR(120) NOT NULL,
    description_ru VARCHAR(500) NOT NULL,
    description_en VARCHAR(500) NOT NULL,
    required_score INTEGER      NOT NULL CHECK (required_score >= 0),
    sort_order     INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE game_checkpoints (
    id                   VARCHAR(32) PRIMARY KEY,
    route_id             VARCHAR(32)      NOT NULL REFERENCES game_routes (id),
    type                 VARCHAR(10)      NOT NULL CHECK (type IN ('YELLOW', 'GREEN')),
    points               INTEGER          NOT NULL CHECK (points > 0),
    lat                  DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lng                  DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
    title_ru             VARCHAR(160)     NOT NULL,
    title_en             VARCHAR(160)     NOT NULL,
    hint_ru              VARCHAR(1000)    NOT NULL,
    hint_en              VARCHAR(1000)    NOT NULL,
    -- Place card: only for GREEN checkpoints.
    place_title_ru       VARCHAR(160),
    place_title_en       VARCHAR(160),
    place_description_ru VARCHAR(2000),
    place_description_en VARCHAR(2000),
    place_image_url      VARCHAR(500),
    sort_order           INTEGER          NOT NULL DEFAULT 0,
    CONSTRAINT ck_game_checkpoints_green_card CHECK (
        type <> 'GREEN' OR (place_title_ru IS NOT NULL AND place_title_en IS NOT NULL
            AND place_description_ru IS NOT NULL AND place_description_en IS NOT NULL)
    )
);
CREATE INDEX ix_game_checkpoints_route ON game_checkpoints (route_id);

-- Only the fact of a visit and its time are stored, no GPS track.
CREATE TABLE game_collections (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    checkpoint_id  VARCHAR(32) NOT NULL REFERENCES game_checkpoints (id),
    points_awarded INTEGER     NOT NULL CHECK (points_awarded >= 0),
    collected_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_game_collections_user_checkpoint UNIQUE (user_id, checkpoint_id)
);
CREATE INDEX ix_game_collections_user ON game_collections (user_id);

CREATE TABLE discovery_items (
    id             VARCHAR(32) PRIMARY KEY,
    category       VARCHAR(20)   NOT NULL CHECK (category IN ('EXCURSIONS', 'EVENTS', 'FESTIVALS', 'ENTERTAINMENT')),
    title_ru       VARCHAR(160)  NOT NULL,
    title_en       VARCHAR(160)  NOT NULL,
    description_ru VARCHAR(1000) NOT NULL,
    description_en VARCHAR(1000) NOT NULL,
    image_url      VARCHAR(500)  NOT NULL,
    external_url   VARCHAR(500),
    is_demo        BOOLEAN       NOT NULL DEFAULT TRUE,
    sort_order     INTEGER       NOT NULL DEFAULT 0
);
CREATE INDEX ix_discovery_items_category ON discovery_items (category, sort_order);

-- ---------------------------------------------------------------- seed: routes
INSERT INTO game_routes (id, title_ru, title_en, description_ru, description_en, required_score, sort_order) VALUES
('main', 'Главные символы', 'Main symbols',
 'Базовый маршрут по самым узнаваемым местам исторического центра.',
 'The starter route through the best-known places of the historic centre.', 0, 10),
('hidden', 'За пределами открыток', 'Beyond the postcards',
 'Менее известные места, которые открываются исследователям города.',
 'Lesser-known places unlocked for city explorers.', 60, 20);

-- ---------------------------------------------------------------- seed: checkpoints
-- Base route: 10 + 10 + 30 + 10 = 60 points -> unlocks "hidden".
INSERT INTO game_checkpoints (id, route_id, type, points, lat, lng, title_ru, title_en, hint_ru, hint_en,
                              place_title_ru, place_title_en, place_description_ru, place_description_en,
                              place_image_url, sort_order) VALUES
('cp_y01', 'main', 'YELLOW', 10, 56.32370, 44.00200,
 'Большая Покровская', 'Bolshaya Pokrovskaya Street',
 'В советское время эта улица носила имя Свердлова; историческое название ей вернули в начале 1990-х. Иди туда, где улица упирается в крепостные стены.',
 'In Soviet times this street was named after Sverdlov; its historic name returned in the early 1990s. Walk on to where the street meets the fortress walls.',
 NULL, NULL, NULL, NULL, NULL, 10),
('cp_y02', 'main', 'YELLOW', 10, 56.32680, 44.00740,
 'Площадь Минина и Пожарского', 'Minin and Pozharsky Square',
 'Осенью 1611 года Кузьма Минин призвал нижегородцев собрать народное ополчение, которое в 1612 году освободило Москву. Крепость, что за твоей спиной, хранит ещё больше историй.',
 'In autumn 1611 Kuzma Minin called on the townspeople to raise the militia that freed Moscow in 1612. The fortress behind you keeps even more stories.',
 NULL, NULL, NULL, NULL, NULL, 20),
('cp_g01', 'main', 'GREEN', 30, 56.32930, 44.00460,
 'Нижегородский кремль', 'Nizhny Novgorod Kremlin',
 'Эту крепость ни разу не взяли штурмом. С её стен видно место, где Ока впадает в Волгу, — а рядом начинается лестница, ведущая к реке.',
 'This fortress was never taken by storm. From its walls you can see where the Oka flows into the Volga, and a staircase down to the river starts nearby.',
 'Нижегородский кремль', 'Nizhny Novgorod Kremlin',
 'Каменный кремль построен в начале XVI века (1508–1515). Стены длиной около двух километров и 13 башен поднимаются по склону Дятловых гор над слиянием Оки и Волги.',
 'The stone kremlin was built in the early 16th century (1508–1515). Its walls, about two kilometres long, and 13 towers climb the slope of the Dyatlovy Hills above the confluence of the Oka and the Volga.',
 '/demo/place-kremlin.svg', 30),
('cp_y03', 'main', 'YELLOW', 10, 56.33050, 44.00800,
 'Чкаловская лестница', 'Chkalov Staircase',
 'Лестница в плане похожа на восьмёрку и ведёт от памятника лётчику Валерию Чкалову к Волге. Её открыли в 1949 году. Теперь город готов показать то, чего нет на открытках.',
 'Seen from above, the staircase forms a figure eight and leads from the monument to aviator Valery Chkalov down to the Volga. It opened in 1949. Now the city is ready to show what postcards leave out.',
 NULL, NULL, NULL, NULL, NULL, 40);

-- Hidden route: opens at 60 points.
INSERT INTO game_checkpoints (id, route_id, type, points, lat, lng, title_ru, title_en, hint_ru, hint_en,
                              place_title_ru, place_title_en, place_description_ru, place_description_en,
                              place_image_url, sort_order) VALUES
('cp_g02', 'hidden', 'GREEN', 30, 56.32940, 43.99380,
 'Строгановская церковь', 'Stroganov Church',
 'Эту церковь на Рождественской улице строили больше двадцати лет на деньги одного из самых богатых купеческих родов России. Неподалёку прошло детство будущего писателя.',
 'This church on Rozhdestvenskaya Street took over twenty years to build, funded by one of Russia''s richest merchant families. A future writer spent his childhood nearby.',
 'Рождественская (Строгановская) церковь', 'Church of the Nativity (Stroganov Church)',
 'Церковь построена в 1696–1719 годах на средства Григория Строганова и считается образцом «строгановского барокко» с богатым белокаменным резным декором.',
 'Built in 1696–1719 with funds from Grigory Stroganov, the church is a landmark of the "Stroganov Baroque" style with rich white-stone carving.',
 '/demo/place-stroganov.svg', 50),
('cp_y04', 'hidden', 'YELLOW', 10, 56.32700, 43.99900,
 'Домик Каширина', 'Kashirin House',
 'В доме деда, красильщика Василия Каширина, прошли детские годы Алексея Пешкова — будущего Максима Горького. Его повесть «Детство» описывает именно эти места.',
 'Alexei Peshkov, the future Maxim Gorky, spent his childhood in the house of his grandfather, the dyer Vasily Kashirin. His novella "My Childhood" describes these very places.',
 NULL, NULL, NULL, NULL, NULL, 60);

-- ---------------------------------------------------------------- seed: discovery feed
-- Demo catalogue: no dates and no ticket promises. Images are placeholders served by the frontend.
INSERT INTO discovery_items (id, category, title_ru, title_en, description_ru, description_en, image_url, external_url, is_demo, sort_order) VALUES
('ev01', 'EXCURSIONS', 'Прогулка по кремлю', 'Kremlin walk',
 'Маршрут вдоль крепостных стен с видом на слияние Оки и Волги. Демонстрационная карточка.',
 'A walk along the fortress walls with a view of the Oka and Volga confluence. Demo card.',
 '/demo/ev01.svg', 'https://ru.wikipedia.org/wiki/Нижегородский_кремль', TRUE, 10),
('ev02', 'EXCURSIONS', 'Обзорная по Покровке', 'Pokrovka sightseeing walk',
 'Пешая прогулка по главной улице города: купеческие особняки, театр и уличные скульптуры.',
 'A stroll down the main street: merchant mansions, the theatre and street sculptures.',
 '/demo/ev02.svg', NULL, TRUE, 20),
('ev03', 'EVENTS', 'Вечер на набережной', 'Evening on the embankment',
 'Демонстрационное событие: музыка и закат над Волгой на Нижневолжской набережной.',
 'Demo event: music and a Volga sunset on the Nizhnevolzhskaya embankment.',
 '/demo/ev03.svg', NULL, TRUE, 30),
('ev04', 'EVENTS', 'Лекция о купеческом Нижнем', 'Talk: merchant Nizhny',
 'Демонстрационное событие: рассказ о ярмарке и купеческих династиях города.',
 'Demo event: a talk about the fair and the merchant dynasties of the city.',
 '/demo/ev04.svg', NULL, TRUE, 40),
('ev05', 'FESTIVALS', 'Фестиваль уличной еды', 'Street food festival',
 'Демонстрационный фестиваль: локальная кухня и волжские рецепты.',
 'Demo festival: local cuisine and Volga recipes.',
 '/demo/ev05.svg', NULL, TRUE, 50),
('ev06', 'FESTIVALS', 'Фестиваль света', 'Festival of light',
 'Демонстрационный фестиваль: световые инсталляции в историческом центре.',
 'Demo festival: light installations in the historic centre.',
 '/demo/ev06.svg', NULL, TRUE, 60),
('ev07', 'ENTERTAINMENT', 'Канатная дорога через Волгу', 'Cable car over the Volga',
 'Канатная дорога соединяет Нижний Новгород и Бор и проходит над Волгой. Демонстрационная карточка.',
 'The cable car links Nizhny Novgorod and Bor, crossing high above the Volga. Demo card.',
 '/demo/ev07.svg', 'https://ru.wikipedia.org/wiki/Нижегородская_канатная_дорога', TRUE, 70),
('ev08', 'ENTERTAINMENT', 'Прогулка на теплоходе', 'River boat trip',
 'Демонстрационная карточка: речная прогулка с видом на кремль и Стрелку.',
 'Demo card: a river trip with views of the kremlin and the Strelka.',
 '/demo/ev08.svg', NULL, TRUE, 80);
