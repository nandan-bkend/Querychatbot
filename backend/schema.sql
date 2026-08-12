-- ==========================================================================
--  College Enquiry Chatbot — MySQL schema
--  SEA College of Engineering and Technology
--  Department of Information Science & Engineering
--
--  Usage:
--      mysql -u root -p < schema.sql
--
--  The table and column names match the objects the frontend already uses,
--  so the JavaScript data layer maps onto these tables one to one.
-- ==========================================================================

DROP DATABASE IF EXISTS college_chatbot;
CREATE DATABASE college_chatbot
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE college_chatbot;

-- --------------------------------------------------------------------------
--  categories — the six enquiry areas. Naive Bayes classifies a student's
--  question into one of these before the answer is selected.
-- --------------------------------------------------------------------------
CREATE TABLE categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(60)  NOT NULL UNIQUE,
  description VARCHAR(255) DEFAULT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------------------------
--  departments — used by faculty records and the department filter
-- --------------------------------------------------------------------------
CREATE TABLE departments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(80) NOT NULL UNIQUE,
  short_name VARCHAR(12) DEFAULT NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------------------------
--  questions — the chatbot knowledge base, maintained by the administrator
--  Only rows with status = 'Active' are answerable by the chatbot.
-- --------------------------------------------------------------------------
CREATE TABLE questions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(10)  NOT NULL UNIQUE,        -- Q001, Q002 …
  question    VARCHAR(255) NOT NULL,
  answer      TEXT         NOT NULL,
  category_id INT          NOT NULL,
  status      ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at  DATE         NOT NULL DEFAULT (CURRENT_DATE),
  updated_at  DATE         NOT NULL DEFAULT (CURRENT_DATE),
  CONSTRAINT fk_questions_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_questions_status   (status),
  INDEX idx_questions_category (category_id),
  FULLTEXT INDEX ft_questions  (question, answer)  -- for admin search
) ENGINE=InnoDB;

-- --------------------------------------------------------------------------
--  faculty — department-wise staff records
-- --------------------------------------------------------------------------
CREATE TABLE faculty (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(10)  NOT NULL UNIQUE,      -- F001, F002 …
  name          VARCHAR(80)  NOT NULL,
  department_id INT          NOT NULL,
  designation   VARCHAR(40)  NOT NULL,
  email         VARCHAR(120) NOT NULL,
  contact       VARCHAR(20)  NOT NULL,
  photo         VARCHAR(255) DEFAULT NULL,
  status        ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at    DATE         NOT NULL DEFAULT (CURRENT_DATE),
  updated_at    DATE         NOT NULL DEFAULT (CURRENT_DATE),
  CONSTRAINT fk_faculty_department
    FOREIGN KEY (department_id) REFERENCES departments(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_faculty_department (department_id),
  INDEX idx_faculty_status     (status)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------------
--  users — students and administrators
--  Passwords are stored as Werkzeug PBKDF2 hashes, never in plain text.
-- --------------------------------------------------------------------------
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  role          ENUM('student','admin') NOT NULL,
  name          VARCHAR(80)  NOT NULL,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  usn           VARCHAR(20)  DEFAULT NULL,         -- students only
  department_id INT          DEFAULT NULL,
  semester      VARCHAR(20)  DEFAULT NULL,
  status        ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_department
    FOREIGN KEY (department_id) REFERENCES departments(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------------
--  training_data — question phrasings used to train the Naive Bayes model.
--  Several phrasings map to the same stored question, which is what lets the
--  chatbot recognise a question that is not worded exactly as stored.
-- --------------------------------------------------------------------------
CREATE TABLE training_data (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  phrasing    VARCHAR(255) NOT NULL,
  question_id INT          NOT NULL,
  category_id INT          NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_training_question
    FOREIGN KEY (question_id) REFERENCES questions(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_training_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX idx_training_question (question_id),
  INDEX idx_training_category (category_id)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------------
--  chat_log — every question asked, with what the model decided.
--  Useful for the admin to see what students actually ask, and for retraining.
-- --------------------------------------------------------------------------
CREATE TABLE chat_log (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT          DEFAULT NULL,
  question_text     VARCHAR(255) NOT NULL,
  matched_question_id INT        DEFAULT NULL,
  predicted_category  VARCHAR(60) DEFAULT NULL,
  confidence        DECIMAL(5,4) DEFAULT NULL,
  answered          TINYINT(1)   NOT NULL DEFAULT 0,
  asked_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chatlog_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_chatlog_question
    FOREIGN KEY (matched_question_id) REFERENCES questions(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_chatlog_asked (asked_at)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------------
--  activity_log — administrative audit trail shown on the admin dashboard
-- --------------------------------------------------------------------------
CREATE TABLE activity_log (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  actor_id  INT          DEFAULT NULL,
  actor_name VARCHAR(80) NOT NULL,
  action    ENUM('added','updated','deleted') NOT NULL,
  entity    ENUM('question','faculty','user')  NOT NULL,
  entity_ref VARCHAR(10) DEFAULT NULL,
  label     VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_actor
    FOREIGN KEY (actor_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_activity_time (timestamp)
) ENGINE=InnoDB;
