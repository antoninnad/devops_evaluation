SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
    id    INT AUTO_INCREMENT PRIMARY KEY,
    name  VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tasks (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(255) NOT NULL,
    done         BOOLEAN      NOT NULL DEFAULT FALSE,
    priority     ENUM('basse', 'moyenne', 'haute') NOT NULL DEFAULT 'moyenne',
    due_date     DATE         NULL,
    category_id  INT          NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tasks_category FOREIGN KEY (category_id)
        REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO categories (name) VALUES
    ('Base de données'), ('API'), ('Déploiement');

INSERT INTO tasks (title, done, priority, due_date, category_id) VALUES
    ('Configurer la base de données', TRUE,  'haute',   CURDATE() - INTERVAL 1 DAY, 1),
    ('Brancher l''API',               FALSE, 'moyenne', CURDATE() - INTERVAL 1 DAY, 2),
    ('Déployer en Val puis en Prod',  FALSE, 'haute',   CURDATE() + INTERVAL 2 DAY, 3);
