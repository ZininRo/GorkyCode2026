ALTER TABLE discovery_items DROP CONSTRAINT discovery_items_category_check;
ALTER TABLE discovery_items ADD CONSTRAINT discovery_items_category_check
    CHECK (category IN ('PLACES', 'EVENTS', 'FESTIVALS', 'CONCERTS', 'TOURS', 'EXCURSIONS', 'ENTERTAINMENT'));

ALTER TABLE discovery_items
    ADD COLUMN source_system varchar(40) NOT NULL DEFAULT 'DEMO',
    ADD COLUMN source_id varchar(160),
    ADD CONSTRAINT uq_discovery_source UNIQUE (source_system, source_id);
ALTER TABLE discovery_items ALTER COLUMN source_system DROP DEFAULT;

INSERT INTO discovery_items (id, category, title_ru, title_en, description_ru, description_en, image_url,
                             external_url, is_demo, source_system, sort_order)
VALUES
    ('demo-kremlin', 'PLACES', 'Нижегородский кремль', 'Nizhny Novgorod Kremlin',
     'Демонстрационная карточка культурного объекта. По ссылке открывается туристический справочник региона.',
     'Demo landmark card. The link opens the regional tourism guide.',
     '/demo/place-kremlin.svg', 'https://visitnn.ru/dostoprimechatelnosti/', true, 'DEMO', 81),
    ('demo-arsenal', 'PLACES', 'Арсенал', 'Arsenal',
     'Демонстрационная карточка выставочного пространства. Программа и условия посещения публикуются на сайте площадки.',
     'Demo exhibition venue card. The venue publishes its programme and visitor information on its website.',
     '/demo/ev04.svg', 'https://arsenal-museum.art/', true, 'DEMO', 82),
    ('demo-concert', 'CONCERTS', 'Вечер симфонической музыки', 'An evening of symphonic music',
     'Пример карточки концерта без даты. Внешняя ссылка ведёт на афишу филармонии.',
     'Sample concert without a scheduled date. The external link opens the Philharmonic programme.',
     '/demo/ev03.svg', 'https://music-nn.ru/', true, 'DEMO', 83),
    ('demo-city-tour', 'TOURS', 'Прогулка по историческому центру', 'A walk through the historic centre',
     'Пример карточки тура. За действующими предложениями перейдите в туристический справочник.',
     'Sample tour card. See the regional tourism guide for current offers.',
     '/demo/ev02.svg', 'https://visitnn.ru/', true, 'DEMO', 84);
