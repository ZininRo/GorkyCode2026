ALTER TABLE game_checkpoints
    ADD COLUMN map_description_ru VARCHAR(500),
    ADD COLUMN map_description_en VARCHAR(500);

CREATE INDEX ix_game_checkpoints_map_bounds ON game_checkpoints (lng, lat);

UPDATE game_checkpoints AS c
SET map_description_ru = preview.ru, map_description_en = preview.en
FROM (VALUES
    ('cp_y01', 'Прогуляйтесь по пешеходной улице исторического центра.',
               'Visit the pedestrian street in the historic centre.'),
    ('cp_y02', 'Загляните на площадь рядом с Нижегородским кремлём.',
               'Visit the square beside the Nizhny Novgorod Kremlin.'),
    ('cp_g01', 'Найдите кристалл у кремля над слиянием Оки и Волги.',
               'Find a crystal at the Kremlin above the meeting of the Oka and Volga.'),
    ('cp_y03', 'Ищите точку у лестницы, ведущей к волжской набережной.',
               'Look for this stop by the staircase to the Volga embankment.'),
    ('cp_g02', 'Найдите церковь на Рождественской улице.',
               'Find the church on Rozhdestvenskaya Street.'),
    ('cp_y04', 'Загляните к дому, связанному с детством Максима Горького.',
               'Visit a house associated with Maxim Gorky’s childhood.')
) AS preview(id, ru, en)
WHERE c.id = preview.id
  AND c.map_description_ru IS NULL AND c.map_description_en IS NULL;
