SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS tasks (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    done        BOOLEAN      NOT NULL DEFAULT FALSE,
    priority    ENUM('basse', 'moyenne', 'haute') NOT NULL DEFAULT 'moyenne',
    due_date    DATE         NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tasks (title, done, priority, due_date) VALUES
    ('Configurer la base de données', TRUE,  'haute',   CURDATE() - INTERVAL 1 DAY),
    ('Brancher l''API',               FALSE, 'moyenne', CURDATE() - INTERVAL 1 DAY),
    ('Déployer en Val puis en Prod',  FALSE, 'haute',   CURDATE() + INTERVAL 2 DAY);
