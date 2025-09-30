-- Création de la table users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    profile_image_url TEXT,
    phone TEXT,
    avatar TEXT,
    has_cin BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    neighborhood TEXT,
    joined_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    alerts_count TEXT DEFAULT '0',
    validations_count TEXT DEFAULT '0'
);

-- Création de la table alerts
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid(),
    reason TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    urgency TEXT NOT NULL DEFAULT 'medium',
    author_id VARCHAR(50) NOT NULL REFERENCES users(id),
    confirmed_count TEXT DEFAULT '0',
    rejected_count TEXT DEFAULT '0',
    media TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insertion des utilisateurs par défaut
INSERT INTO users (id, name, email, first_name, last_name, phone, has_cin, is_admin, neighborhood) VALUES
('usr_naina_001', 'Naina Razafy', 'naina@example.com', 'Naina', 'Razafy', '+261321234567', true, false, 'Antananarivo'),
('usr_hery_002', 'Hery Andriana', 'hery@example.com', 'Hery', 'Andriana', '+261331234568', true, false, 'Antsirabe'),
('usr_admin_001', 'Administrateur', 'admin@example.com', 'Admin', 'System', '+261341234569', true, true, 'Antananarivo')
ON CONFLICT (id) DO NOTHING;