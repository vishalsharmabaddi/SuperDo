CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255),
    role VARCHAR(32) NOT NULL DEFAULT 'USER',
    auth_provider VARCHAR(32) NOT NULL DEFAULT 'LOCAL',
    google_subject VARCHAR(255) UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tags VARCHAR(255),
    reminder_date DATE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rent_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    tenant_name VARCHAR(255),
    landlord_name VARCHAR(255),
    payer_party_id BIGINT,
    receiver_party_id BIGINT,
    rent_amount NUMERIC(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    payment_status VARCHAR(64) NOT NULL,
    notes TEXT,
    month_key VARCHAR(7) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_rent_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rent_parties (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    linked_user_id BIGINT,
    party_type VARCHAR(20) NOT NULL,
    preferred_role VARCHAR(20) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    contact_phone VARCHAR(32),
    contact_email VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_rent_party_owner FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rent_party_linked_user FOREIGN KEY (linked_user_id) REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE rent_records
    ADD COLUMN IF NOT EXISTS payer_party_id BIGINT;

ALTER TABLE rent_records
    ADD COLUMN IF NOT EXISTS receiver_party_id BIGINT;

CREATE TABLE IF NOT EXISTS marriage_planner (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    event_name VARCHAR(255),
    guest_name VARCHAR(255),
    vendor_type VARCHAR(255),
    vendor_name VARCHAR(255),
    vendor_contact VARCHAR(200),
    venue VARCHAR(255),
    guest_count INTEGER,
    status VARCHAR(32),
    budget_amount NUMERIC(12, 2),
    expense_amount NUMERIC(12, 2),
    event_date DATE,
    timeline_note TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_marriage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE marriage_planner
    ADD COLUMN IF NOT EXISTS vendor_contact VARCHAR(200);

ALTER TABLE marriage_planner
    ADD COLUMN IF NOT EXISTS venue VARCHAR(255);

ALTER TABLE marriage_planner
    ADD COLUMN IF NOT EXISTS guest_count INTEGER;

ALTER TABLE marriage_planner
    ADD COLUMN IF NOT EXISTS status VARCHAR(32);

CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(32) NOT NULL,
    category VARCHAR(120) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    txn_date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_expense_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_sections (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    schema_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_custom_sections_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_section_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    section_id BIGINT NOT NULL,
    data_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_custom_entries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_custom_entries_section FOREIGN KEY (section_id) REFERENCES custom_sections(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Indexes for common user-scoped query patterns
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notes_user_updated_at
    ON notes(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_user_txn_date
    ON expenses(user_id, txn_date DESC);

CREATE INDEX IF NOT EXISTS idx_rent_records_user_due_date
    ON rent_records(user_id, due_date ASC);

CREATE INDEX IF NOT EXISTS idx_rent_parties_user_role_name
    ON rent_parties(user_id, preferred_role, display_name ASC);

CREATE INDEX IF NOT EXISTS idx_marriage_planner_user_event_date
    ON marriage_planner(user_id, event_date ASC);

CREATE INDEX IF NOT EXISTS idx_custom_sections_user_updated_at
    ON custom_sections(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_custom_entries_user_section_updated_at
    ON custom_section_entries(user_id, section_id, updated_at DESC);
