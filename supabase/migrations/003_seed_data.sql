-- ============================================================================
-- Seed Data for Testing
-- ============================================================================

-- Note: In production, you would use a separate seeding script
-- or Supabase CLI for seeding data

-- ============================================================================
-- SAMPLE PARTS
-- ============================================================================

INSERT INTO parts (part_number, name, description, category, condition, price, stock, brand, oem_number, images) VALUES
-- Engine Parts
('ENG-001', 'Oil Filter', 'High-efficiency oil filter for superior engine protection', 'engine', 'new', 12.99, 150, 'Bosch', 'BOS-0451105061', '{}'),
('ENG-002', 'Spark Plug Set', '4-pack iridium spark plugs for improved combustion', 'engine', 'new', 24.99, 85, 'NGK', 'NGK-ILTR5G-6G', '{}'),
('ENG-003', 'Timing Belt', 'Durable timing belt for precise engine timing', 'engine', 'oem', 45.00, 32, 'Gates', 'GAT-T095B', '{}'),
('ENG-004', 'Water Pump', 'Reliable water pump for efficient cooling system operation', 'engine', 'new', 89.99, 25, 'Aisin', 'AIS-WPT-028', '{}'),

-- Transmission Parts
('TRN-001', 'Transmission Filter', 'Filter kit for automatic transmission fluid filtration', 'transmission', 'new', 18.50, 60, 'Mann-Filter', 'MANN-W719/45', '{}'),
('TRN-002', 'Clutch Kit', 'Complete clutch kit with pressure plate, disc, and release bearing', 'transmission', 'new', 189.99, 12, 'LuK', 'LUK-15-067-10', '{}'),

-- Brake Parts
('BRK-001', 'Brake Pads (Front)', 'Ceramic brake pads for smooth, quiet stopping', 'brakes', 'new', 42.99, 95, 'Brembo', 'BRE-P85-089', '{}'),
('BRK-002', 'Brake Rotor (Front)', 'Vented brake rotor for improved heat dissipation', 'brakes', 'new', 59.99, 70, 'Brembo', 'BRE-R09-125', '{}'),
('BRK-003', 'Brake Caliper', 'Remanufactured brake caliper with new seals', 'brakes', 'refurbished', 85.00, 18, 'Centric', 'CEN-CAL-124', '{}'),

-- Suspension Parts
('SUS-001', 'Shock Absorber', 'Gas-charged shock absorber for smooth ride', 'suspension', 'new', 67.50, 45, 'Monroe', 'MON-171657', '{}'),
('SUS-002', 'Control Arm', 'Front lower control arm with ball joint', 'suspension', 'oem', 78.00, 22, 'Moog', 'MOO-K90138', '{}'),
('SUS-003', 'Sway Bar Link', 'Front sway bar end link for improved handling', 'suspension', 'new', 15.99, 110, 'Dorman', 'DOR-927-100', '{}'),

-- Electrical Parts
('ELEC-001', 'Alternator', 'High-output alternator for reliable charging', 'electrical', 'refurbished', 145.00, 8, 'Bosch', 'BOS-AL0464X', '{}'),
('ELEC-002', 'Starter Motor', 'Remanufactured starter motor', 'electrical', 'refurbished', 120.00, 14, 'Denso', 'DEN-2800113', '{}'),
('ELEC-003', 'Battery', '12V AGM battery with 800 CCA', 'electrical', 'new', 189.99, 30, 'Optima', 'OPT-8001', '{}'),

-- Body Parts
('BDY-001', 'Headlight Assembly', 'Driver side halogen headlight', 'body', 'new', 89.99, 25, 'Depo', 'DEP-333-1155', '{}'),
('BDY-002', 'Side Mirror', 'Passenger side painted mirror', 'body', 'new', 65.00, 18, 'Burco', 'BUR-3800', '{}'),
('BDY-003', 'Fender', 'Front driver side fender', 'body', 'oem', 210.00, 5, 'OEM', 'OEM-FDR-001', '{}'),

-- Interior Parts
('INT-001', 'Floor Mats', '4-piece all-weather floor mat set', 'interior', 'new', 45.99, 60, 'Husky', 'HUS-1000', '{}'),
('INT-002', 'Seat Cover', 'Pair of front seat covers', 'interior', 'new', 34.99, 40, 'Coverking', 'CK-SC-200', '{}');

-- ============================================================================
-- SAMPLE COMPATIBILITY DATA
-- ============================================================================

-- Oil Filter compatibility (fits many cars)
INSERT INTO compatibility (part_id, make, model, year_start, year_end, notes) VALUES
((SELECT id FROM parts WHERE part_number = 'ENG-001'), 'Toyota', 'Camry', 2018, NULL, '2.5L 4-cylinder'),
((SELECT id FROM parts WHERE part_number = 'ENG-001'), 'Honda', 'Accord', 2018, NULL, '2.0L & 2.4L 4-cylinder'),
((SELECT id FROM parts WHERE part_number = 'ENG-001'), 'Ford', 'Fusion', 2017, 2020, '2.5L 4-cylinder'),
((SELECT id FROM parts WHERE part_number = 'ENG-001'), 'Nissan', 'Altima', 2019, NULL, '2.5L 4-cylinder');

-- Spark Plug compatibility
INSERT INTO compatibility (part_id, make, model, year_start, year_end, notes) VALUES
((SELECT id FROM parts WHERE part_number = 'ENG-002'), 'Toyota', 'Camry', 2018, 2022, '2.5L 4-cylinder'),
((SELECT id FROM parts WHERE part_number = 'ENG-002'), 'Honda', 'Accord', 2018, 2022, '2.0L 4-cylinder'),
((SELECT id FROM parts WHERE part_number = 'ENG-002'), 'Subaru', 'Impreza', 2017, 2021, '2.0L 4-cylinder');

-- Brake Pads compatibility
INSERT INTO compatibility (part_id, make, model, year_start, year_end, notes) VALUES
((SELECT id FROM parts WHERE part_number = 'BRK-001'), 'Toyota', 'Camry', 2018, NULL, 'Front'),
((SELECT id FROM parts WHERE part_number = 'BRK-001'), 'Honda', 'Accord', 2018, NULL, 'Front'),
((SELECT id FROM parts WHERE part_number = 'BRK-001'), 'Ford', 'Fusion', 2017, 2020, 'Front');

-- Brake Rotor compatibility
INSERT INTO compatibility (part_id, make, model, year_start, year_end, notes) VALUES
((SELECT id FROM parts WHERE part_number = 'BRK-002'), 'Toyota', 'Camry', 2018, NULL, 'Front'),
((SELECT id FROM parts WHERE part_number = 'BRK-002'), 'Honda', 'Accord', 2018, NULL, 'Front'),
((SELECT id FROM parts WHERE part_number = 'BRK-002'), 'Nissan', 'Altima', 2019, NULL, 'Front');

-- Shock Absorber compatibility
INSERT INTO compatibility (part_id, make, model, year_start, year_end, notes) VALUES
((SELECT id FROM parts WHERE part_number = 'SUS-001'), 'Toyota', 'Camry', 2018, NULL, 'Rear'),
((SELECT id FROM parts WHERE part_number = 'SUS-001'), 'Honda', 'Accord', 2018, NULL, 'Rear'),
((SELECT id FROM parts WHERE part_number = 'SUS-001'), 'Ford', 'Fusion', 2017, 2020, 'Rear');

-- Headlight compatibility
INSERT INTO compatibility (part_id, make, model, year_start, year_end, notes) VALUES
((SELECT id FROM parts WHERE part_number = 'BDY-001'), 'Toyota', 'Camry', 2018, 2021, 'Driver side'),
((SELECT id FROM parts WHERE part_number = 'BDY-001'), 'Honda', 'Accord', 2018, 2021, 'Driver side');

-- Alternator compatibility
INSERT INTO compatibility (part_id, make, model, year_start, year_end, notes) VALUES
((SELECT id FROM parts WHERE part_number = 'ELEC-001'), 'Toyota', 'Camry', 2018, NULL, '2.5L 4-cylinder'),
((SELECT id FROM parts WHERE part_number = 'ELEC-001'), 'Honda', 'Accord', 2018, NULL, '2.0L 4-cylinder');
