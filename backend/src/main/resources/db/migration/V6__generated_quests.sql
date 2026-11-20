CREATE TABLE quest_places (
    id varchar(40) PRIMARY KEY,
    kind varchar(20) NOT NULL CHECK (kind IN ('CULTURE', 'RESTAURANT', 'MUSEUM', 'EXHIBITION', 'ARCHITECTURE', 'LANDMARK')),
    rank_score integer NOT NULL CHECK (rank_score BETWEEN 1 AND 100),
    lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
    title_ru varchar(160) NOT NULL,
    title_en varchar(160) NOT NULL,
    fact_ru text NOT NULL,
    fact_en text NOT NULL,
    image_url varchar(500),
    source_system varchar(40) NOT NULL DEFAULT 'DEMO',
    source_id varchar(160),
    UNIQUE (source_system, source_id)
);

CREATE INDEX ix_quest_places_bounds ON quest_places (lat, lng);

CREATE TABLE quest_templates (
    id varchar(40) PRIMARY KEY,
    title_ru varchar(160) NOT NULL,
    title_en varchar(160) NOT NULL,
    description_ru text NOT NULL,
    description_en text NOT NULL,
    thread_ru text NOT NULL,
    thread_en text NOT NULL,
    start_place_id varchar(40) NOT NULL REFERENCES quest_places (id),
    final_place_id varchar(40) NOT NULL REFERENCES quest_places (id),
    required_score integer NOT NULL CHECK (required_score >= 0),
    sort_order integer NOT NULL,
    CHECK (start_place_id <> final_place_id)
);

CREATE TABLE quest_runs (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    template_id varchar(40) NOT NULL REFERENCES quest_templates (id),
    generator varchar(40) NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    UNIQUE (user_id, template_id)
);

CREATE INDEX ix_quest_runs_user_recent ON quest_runs (user_id, updated_at DESC);

CREATE TABLE quest_run_steps (
    run_id uuid NOT NULL REFERENCES quest_runs (id) ON DELETE CASCADE,
    position integer NOT NULL CHECK (position > 0),
    place_id varchar(40) NOT NULL REFERENCES quest_places (id),
    title_ru varchar(160) NOT NULL,
    title_en varchar(160) NOT NULL,
    lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
    clue_ru text NOT NULL,
    clue_en text NOT NULL,
    fact_ru text NOT NULL,
    fact_en text NOT NULL,
    image_url varchar(500),
    points integer NOT NULL CHECK (points > 0),
    visited_at timestamptz,
    reaction varchar(20) CHECK (reaction IN ('LOVE', 'INTERESTING', 'OKAY', 'WANT_MORE')),
    PRIMARY KEY (run_id, position),
    UNIQUE (run_id, place_id),
    CHECK (reaction IS NULL OR visited_at IS NOT NULL)
);

-- Demonstration rankings and approximate coordinates. Provider imports use source_system and source_id.
INSERT INTO quest_places (id, kind, rank_score, lat, lng, title_ru, title_en, fact_ru, fact_en) VALUES
    ('gorky-square', 'LANDMARK', 86, 56.31590, 43.99480, 'Площадь Горького', 'Gorky Square', 'Памятник Максиму Горькому напоминает о связи писателя с родным городом.', 'The monument to Maxim Gorky recalls the writer''s connection to his home city.'),
    ('chkalov', 'LANDMARK', 98, 56.33048, 44.00948, 'Чкаловская лестница', 'Chkalov Staircase', 'Монументальная лестница связывает верхнюю часть города с волжской набережной.', 'The monumental staircase connects the upper city with the Volga embankment.'),
    ('kremlin', 'ARCHITECTURE', 100, 56.32813, 44.00458, 'Нижегородский кремль', 'Nizhny Novgorod Kremlin', 'С высокого берега у кремлёвских стен открывается вид на слияние Оки и Волги.', 'From the high bank by the Kremlin walls, you can look towards the meeting of the Oka and the Volga.'),
    ('stroganov', 'ARCHITECTURE', 95, 56.32819, 43.99090, 'Строгановская церковь', 'Stroganov Church', 'На фасаде церкви на Рождественской улице можно рассмотреть белокаменный декор.', 'Look for the white stone decoration on the facade of the church on Rozhdestvenskaya Street.'),
    ('pokrovka', 'LANDMARK', 93, 56.32292, 44.00100, 'Большая Покровская', 'Bolshaya Pokrovskaya', 'Улица соединяет площадь Горького с районом кремля и стала узнаваемым прогулочным маршрутом.', 'The street connects Gorky Square to the Kremlin area and is a well-known walking route.'),
    ('drama', 'CULTURE', 94, 56.32446, 44.00213, 'Театр драмы имени Горького', 'Gorky Drama Theatre', 'Нижегородский театр драмы, носящий имя Горького, ведёт свою историю с 1798 года.', 'The Drama Theatre, named for Gorky, traces its history to 1798.'),
    ('art-pokrovka', 'EXHIBITION', 78, 56.32530, 44.00345, 'Выставочный зал «Покровка, 8»', 'Pokrovka 8 Exhibition Hall', 'Выставочный зал на Большой Покровской знакомит с искусством прямо на главной прогулочной улице.', 'The exhibition hall brings art to the city''s main walking street.'),
    ('technical', 'MUSEUM', 77, 56.32004, 43.99691, 'Технический музей', 'Technical Museum', 'Технический музей на Большой Покровской даёт взглянуть на приборы и машины прошлых поколений.', 'The Technical Museum on Bolshaya Pokrovskaya offers a look at instruments and machines from earlier generations.'),
    ('crafts', 'MUSEUM', 72, 56.32020, 43.99679, 'Музей истории художественных промыслов', 'Museum of Arts and Crafts', 'В одном здании на Покровской соседствуют технический музей и музей художественных промыслов.', 'The technical museum and the arts and crafts museum share a building on Pokrovskaya.'),
    ('toys', 'MUSEUM', 72, 56.32522, 44.00337, 'Игрушечный музей', 'Toy Museum', 'Музей игрушек находится на Большой Покровской, по соседству с выставочным залом.', 'The toy museum is on Bolshaya Pokrovskaya next to an exhibition hall.'),
    ('minin-square', 'LANDMARK', 89, 56.32764, 44.00669, 'Площадь Минина и Пожарского', 'Minin and Pozharsky Square', 'Большая Покровская подходит к площади, расположенной у кремлёвских стен.', 'Bolshaya Pokrovskaya reaches this square beside the Kremlin walls.'),
    ('arsenal', 'EXHIBITION', 89, 56.32716, 44.00417, 'Арсенал', 'Arsenal', 'В здании кремлёвского Арсенала работает площадка искусства, связанная с Пушкинским музеем. Название музея само по себе не говорит о визите поэта сюда.', 'The Kremlin Arsenal houses an art venue associated with the Pushkin Museum. The museum''s name alone does not imply that the poet visited this building.'),
    ('governor', 'MUSEUM', 83, 56.32922, 44.00593, 'Дом военного губернатора', 'Military Governor''s House', 'В доме военного губернатора размещается коллекция русского искусства НГХМ.', 'The Museum of Art''s Russian art collection is housed in the Military Governor''s House.'),
    ('manege', 'EXHIBITION', 77, 56.32729, 44.00362, 'Кремлёвский Манеж', 'Kremlin Manege', 'В Манеж можно заглянуть на выставку Нижегородского государственного художественного музея.', 'The Manege is an exhibition venue of the Nizhny Novgorod State Art Museum.'),
    ('sirotkin', 'MUSEUM', 88, 56.32890, 44.00910, 'Дом Сироткина', 'Sirotkin House', 'В доме Сироткина показывают зарубежное искусство из собрания НГХМ.', 'Sirotkin House displays foreign art from the State Art Museum''s collection.'),
    ('twentieth', 'MUSEUM', 80, 56.32791, 44.00888, 'НГХМ Искусство XX века', 'Art Museum of the Twentieth Century', 'Филиал художественного музея на площади Минина и Пожарского посвящён искусству XX века.', 'The museum branch by Minin and Pozharsky Square is devoted to twentieth-century art.'),
    ('chkalov-monument', 'LANDMARK', 83, 56.33010, 44.00899, 'Памятник Валерию Чкалову', 'Valery Chkalov Monument', 'Памятник увековечивает имя лётчика-испытателя Валерия Чкалова.', 'The monument commemorates test pilot Valery Chkalov.'),
    ('kashirin', 'MUSEUM', 83, 56.32473, 43.99066, 'Домик Каширина', 'Kashirin House', 'Домик Каширина знакомит с детством Максима Горького.', 'Kashirin House tells the story of Maxim Gorky''s childhood.'),
    ('gorky-flat', 'MUSEUM', 78, 56.32391, 44.01216, 'Музей-квартира Горького', 'Gorky Apartment Museum', 'На улице Семашко музей сохраняет память о нижегородском периоде жизни писателя.', 'The museum on Semashko Street preserves memories of the writer''s years in Nizhny Novgorod.'),
    ('literature-museum', 'MUSEUM', 81, 56.32663, 44.01567, 'Литературный музей Горького', 'Gorky Literature Museum', 'На улице Минина расположен литературный музей, названный в честь Максима Горького.', 'Minin Street is home to a literary museum named for Maxim Gorky.'),
    ('blinov', 'ARCHITECTURE', 86, 56.32822, 43.99247, 'Блиновский пассаж', 'Blinov Passage', 'Блиновский пассаж строился как крупный торговый центр купеческого Нижнего.', 'Blinov Passage was built as a major trading centre in merchant-era Nizhny.'),
    ('futuro', 'EXHIBITION', 80, 56.32916, 43.99710, 'Галерея Futuro', 'Futuro Gallery', 'На Рождественской улице современное искусство соседствует с исторической застройкой.', 'Contemporary art sits alongside historic buildings on Rozhdestvenskaya Street.'),
    ('bezukhov', 'RESTAURANT', 73, 56.32910, 43.99703, 'Литературное кафе «Безухов»', 'Bezukhov Literary Cafe', 'Название кафе отсылает к герою Толстого, а этажом выше находится галерея Futuro.', 'The cafe''s name recalls a Tolstoy character, and the Futuro Gallery is upstairs.'),
    ('rozhdestvenskaya', 'LANDMARK', 84, 56.32875, 43.99496, 'Рождественская улица', 'Rozhdestvenskaya Street', 'На Рождественской сохранились доходные дома и здания бывших банков купеческого города.', 'Rozhdestvenskaya retains apartment houses and former banks of the merchant city.'),
    ('markin', 'LANDMARK', 78, 56.32902, 43.99426, 'Площадь Маркина', 'Markin Square', 'Площадь лежит между прогулочными участками у Рождественской улицы и реки.', 'The square sits between pedestrian areas near Rozhdestvenskaya Street and the river.'),
    ('unity', 'LANDMARK', 90, 56.32951, 44.00020, 'Площадь Народного единства', 'National Unity Square', 'На площади стоит нижегородский памятник Минину и Пожарскому.', 'Nizhny Novgorod''s monument to Minin and Pozharsky stands on this square.'),
    ('ivan-tower', 'ARCHITECTURE', 88, 56.33002, 44.00126, 'Ивановская башня', 'Ivanovskaya Tower', 'Башня относится к нижнему участку стен Нижегородского кремля.', 'The tower belongs to the lower section of the Kremlin walls.'),
    ('dmitry-tower', 'ARCHITECTURE', 92, 56.32669, 44.00546, 'Дмитриевская башня', 'Dmitrievskaya Tower', 'Башня встречает посетителей со стороны площади Минина и Пожарского.', 'The tower faces visitors coming from Minin and Pozharsky Square.'),
    ('koromyslova', 'ARCHITECTURE', 81, 56.32751, 44.00086, 'Коромыслова башня', 'Koromyslova Tower', 'Коромыслова башня входит в оборонительный ряд кремлёвских башен.', 'The Koromyslova Tower is part of the Kremlin''s defensive line.'),
    ('nicol-tower', 'ARCHITECTURE', 77, 56.32681, 44.00232, 'Никольская башня', 'Nikolskaya Tower', 'Никольская башня является частью южного участка кремлёвской стены.', 'The Nikolskaya Tower is part of the southern Kremlin wall.'),
    ('theatre-square', 'LANDMARK', 81, 56.32469, 44.00256, 'Театральная площадь', 'Theatre Square', 'Площадь примыкает к фасаду театра драмы на Большой Покровской.', 'The square borders the drama theatre on Bolshaya Pokrovskaya.'),
    ('puppet', 'CULTURE', 77, 56.31943, 43.99655, 'Нижегородский театр кукол', 'Nizhny Novgorod Puppet Theatre', 'Театр кукол добавляет к сценической истории Покровской свой жанр.', 'The puppet theatre adds its own genre to Pokrovskaya''s stage history.'),
    ('state-bank', 'ARCHITECTURE', 91, 56.32283, 43.99998, 'Историческое здание Госбанка', 'Historic State Bank Building', 'Фасад здания на Покровской можно рассматривать как отдельный архитектурный объект городской прогулки.', 'The facade on Pokrovskaya is an architectural stop in its own right.'),
    ('philarmonic', 'CULTURE', 84, 56.32800, 44.00509, 'Нижегородская филармония', 'Nizhny Novgorod Philharmonic', 'Филармония делает кремль концертной площадкой современной жизни города.', 'The Philharmonic makes the Kremlin a venue for the city''s concert life.'),
    ('cathedral', 'ARCHITECTURE', 91, 56.33445, 43.97031, 'Собор Александра Невского', 'Alexander Nevsky Cathedral', 'Собор Александра Невского — один из узнаваемых объектов Стрелки.', 'Alexander Nevsky Cathedral is one of the landmarks of the Strelka.'),
    ('warehouses', 'EXHIBITION', 87, 56.33520, 43.96903, 'Пакгаузы на Стрелке', 'Strelka Warehouses', 'В одном из Пакгаузов на Стрелке работает выставочная площадка НГХМ.', 'One of the Strelka warehouses houses a State Art Museum exhibition venue.'),
    ('strelka', 'LANDMARK', 95, 56.33731, 43.97246, 'Стрелка', 'Strelka', 'На Стрелке сходятся Ока и Волга.', 'The Strelka marks the meeting of the Oka and the Volga.'),
    ('fair', 'ARCHITECTURE', 90, 56.32792, 43.96207, 'Главный ярмарочный дом', 'Main Fair House', 'Здание напоминает о торговой истории Нижегородской ярмарки.', 'The building recalls the commercial history of the Nizhny Novgorod Fair.');

UPDATE quest_places SET image_url = '/demo/place-kremlin.svg' WHERE id = 'kremlin';
UPDATE quest_places SET image_url = '/demo/place-stroganov.svg' WHERE id = 'stroganov';

INSERT INTO quest_templates (id, title_ru, title_en, description_ru, description_en, thread_ru, thread_en,
                             start_place_id, final_place_id, required_score, sort_order)
VALUES
    ('whispering-ghosts', 'Призраки шепчут', 'Ghosts Whisper',
     'Прогулка о людях, названиях и культурной памяти исторического центра.',
     'A walk about people, names and the cultural memory of the historic centre.',
     'У каждой остановки своя история. Постепенно город выведет нас к Волге.',
     'Each stop has its own story. The city will gradually lead us to the Volga.',
     'gorky-square', 'chkalov', 0, 10),
    ('kremlin-secrets', 'Тайны Кремля', 'Secrets of the Kremlin',
     'Пройдите через исторический центр к крепости над двумя реками.',
     'Cross the historic centre towards the fortress above two rivers.',
     'Присмотрись к архитектуре города: старые стены уже близко.',
     'Look closely at the architecture: the old walls are getting closer.',
     'gorky-square', 'kremlin', 0, 20),
    ('merchant-stories', 'Купеческие истории', 'Merchant Stories',
     'Маршрут исследователя вдоль исторических кварталов к памятнику зодчества.',
     'An explorer route through historic neighbourhoods towards an architectural landmark.',
     'Вглядывайся в фасады: в финале пригодится внимание к деталям.',
     'Pay attention to facades: details will matter at the final stop.',
     'chkalov', 'stroganov', 60, 30);
