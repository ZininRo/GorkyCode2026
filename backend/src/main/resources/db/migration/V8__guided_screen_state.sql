-- Progress for the existing guided frontend screens. Independent from generated quest runs.
CREATE TABLE guided_routes (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_id varchar(32) NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, quest_id)
);
CREATE TABLE guided_visits (
    user_id uuid NOT NULL,
    quest_id varchar(32) NOT NULL,
    position integer NOT NULL CHECK (position >= 0),
    visited_at timestamptz NOT NULL DEFAULT now(),
    reaction varchar(16),
    PRIMARY KEY (user_id, quest_id, position),
    FOREIGN KEY (user_id, quest_id) REFERENCES guided_routes(user_id, quest_id) ON DELETE CASCADE
);
CREATE TABLE guided_bookmarks (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id varchar(64) NOT NULL,
    PRIMARY KEY (user_id, item_id)
);
