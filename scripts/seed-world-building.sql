-- Seed data for World-Building QA Testing
-- Run this in Supabase SQL Editor after creating a test project
-- Replace {PROJECT_ID} with your actual project ID
-- Replace {USER_ID} with your actual user ID (auth.uid())

-- You can get these values with:
-- SELECT auth.uid() as user_id;
-- SELECT id FROM projects WHERE user_id = auth.uid() LIMIT 1;

-- Sample Locations

-- 1. Settlement: Emberfall Citadel
INSERT INTO public.locations (
    user_id,
    project_id,
    name,
    category,
    summary,
    history,
    culture,
    climate,
    key_features,
    tags
) VALUES (
    auth.uid(), -- Will use current authenticated user
    '{PROJECT_ID}', -- Replace with your project ID
    'Emberfall Citadel',
    'settlement',
    'A fortified city built on volcanic rock, known for its master smiths and eternal forges powered by geothermal heat.',
    'Founded 400 years ago after the First Eruption, when refugees discovered the warming power of the volcanic vents. What began as a survival camp grew into the realm''s premier metalworking hub.',
    'A meritocratic society where skill at the forge determines social standing. Annual competitions draw smiths from across the realm. The city is governed by the Council of Master Smiths.',
    'Hot and dry year-round due to volcanic activity. Ash falls are common in winter. Natural hot springs provide fresh water.',
    ARRAY['Eternal Forges', 'Obsidian Walls', 'Grand Smithing Hall', 'Magma Channels', 'Council Tower'],
    ARRAY['dwarven influence', 'smithing', 'volcanic', 'fortified']
);

-- 2. Region: The Whispering Woods
INSERT INTO public.locations (
    user_id,
    project_id,
    name,
    category,
    summary,
    history,
    culture,
    climate,
    key_features,
    tags
) VALUES (
    auth.uid(),
    '{PROJECT_ID}',
    'The Whispering Woods',
    'region',
    'An ancient forest where the trees are said to whisper secrets to those who listen. Home to various fey creatures and mysterious ruins.',
    'Predates recorded history. Scholars believe it was once the heart of an elven empire that fell to unknown causes. The ruins scattered throughout suggest advanced magic was commonplace.',
    'Avoided by most settlers due to superstition. The few who live on the forest''s edge have learned to respect the old ways, leaving offerings at boundary stones.',
    'Temperate with heavy mists year-round. The canopy is so thick that sunlight rarely reaches the forest floor.',
    ARRAY['Ancient Ruins', 'Singing Streams', 'The Heart Tree', 'Fey Circles', 'Echo Caves'],
    ARRAY['mysterious', 'magical', 'elven', 'dangerous']
);

-- 3. Landmark: The Crystal Spire
INSERT INTO public.locations (
    user_id,
    project_id,
    name,
    category,
    summary,
    history,
    culture,
    climate,
    key_features,
    tags
) VALUES (
    auth.uid(),
    '{PROJECT_ID}',
    'The Crystal Spire',
    'landmark',
    'A massive crystalline tower that emerged from the ground overnight 50 years ago. It pulses with magical energy and defies all attempts at entry.',
    'Appeared suddenly during the Night of Falling Stars. Scholars, mages, and treasure hunters have been trying to understand or breach it ever since. Several expeditions have vanished.',
    'Has become a pilgrimage site for those seeking magical enlightenment. A small monastery was built nearby to study the phenomenon.',
    'Creates its own weather patterns - storms spiral around the spire, and aurora-like lights dance in the sky above it.',
    ARRAY['Impenetrable Walls', 'Pulsing Energy Core', 'Temporal Anomalies', 'Floating Debris Field'],
    ARRAY['mysterious', 'magical', 'recent', 'dangerous']
);

-- 4. Realm: The Shadowfell Rift
INSERT INTO public.locations (
    user_id,
    project_id,
    name,
    category,
    summary,
    history,
    culture,
    climate,
    key_features,
    tags
) VALUES (
    auth.uid(),
    '{PROJECT_ID}',
    'The Shadowfell Rift',
    'realm',
    'A tear between worlds where the Shadowfell bleeds into the material plane. Reality is unstable here, and shadows move with malevolent intent.',
    'Created 200 years ago during the Mage Wars when a forbidden ritual went catastrophically wrong. The rift has been slowly expanding ever since.',
    'Completely uninhabited by mortals. The Rift Watchers maintain a perimeter to prevent incursions from shadow creatures.',
    'No natural light. Perpetual twilight with cold winds that whisper of forgotten sorrows. Time moves differently here.',
    ARRAY['The Void Gate', 'Shadow Pools', 'Echoing Ruins', 'Memory Stones'],
    ARRAY['planar', 'dangerous', 'corrupted', 'magical']
);

-- 5. Other: The Wandering Bazaar
INSERT INTO public.locations (
    user_id,
    project_id,
    name,
    category,
    summary,
    history,
    culture,
    climate,
    key_features,
    tags
) VALUES (
    auth.uid(),
    '{PROJECT_ID}',
    'The Wandering Bazaar',
    'other',
    'A massive mobile marketplace that appears in different locations following no predictable pattern. When it arrives, it stays for exactly three days.',
    'First recorded appearance was 300 years ago. Some claim it''s run by djinn, others say it''s a pocket dimension. The truth remains unknown.',
    'A melting pot of every culture and race. The only rules are: no violence, all debts must be paid, and what happens in the Bazaar stays in the Bazaar.',
    'Varies depending on where it manifests, but the interior is always comfortable with perfect lighting and pleasant breezes.',
    ARRAY['Infinite Stalls', 'The Golden Pavilion', 'Memory Merchants', 'Time-Locked Vaults'],
    ARRAY['mysterious', 'trading', 'magical', 'neutral']
);

-- Timeline Events

-- Events for Emberfall Citadel
DO $$
DECLARE
    citadel_id UUID;
    proj_id UUID := '{PROJECT_ID}';
BEGIN
    SELECT id INTO citadel_id FROM public.locations
    WHERE project_id = proj_id AND name = 'Emberfall Citadel';

    INSERT INTO public.location_events (user_id, project_id, location_id, title, occurs_at, description, importance, key_characters, tags) VALUES
    (auth.uid(), proj_id, citadel_id, 'The First Eruption', 'Year 0', 'The volcano awakens, destroying the old settlements but revealing the geothermal vents that would power the city.', 10, ARRAY['Elder Forge', 'First Survivors'], ARRAY['founding', 'disaster', 'discovery']),
    (auth.uid(), proj_id, citadel_id, 'Founding of the Council', 'Year 50', 'The first Council of Master Smiths is formed, establishing the meritocratic government that persists to this day.', 8, ARRAY['Ironheart the Wise', 'The Five Founders'], ARRAY['politics', 'founding', 'government']),
    (auth.uid(), proj_id, citadel_id, 'The Dragon Compact', 'Year 200', 'A red dragon agrees to protect the city in exchange for tribute of masterwork weapons. This alliance has held for 200 years.', 9, ARRAY['Emberscale', 'High Smith Thorin'], ARRAY['alliance', 'dragon', 'diplomacy']),
    (auth.uid(), proj_id, citadel_id, 'Siege of Shadows', 'Year 350', 'Shadow creatures from the newly formed Shadowfell Rift attack. The city holds thanks to its walls and the Dragon Compact.', 9, ARRAY['Emberscale', 'Shield-Captain Kara', 'The Council'], ARRAY['war', 'defense', 'shadows']);

    -- Events for The Whispering Woods
    SELECT id INTO citadel_id FROM public.locations
    WHERE project_id = proj_id AND name = 'The Whispering Woods';

    INSERT INTO public.location_events (user_id, project_id, location_id, title, occurs_at, description, importance, key_characters, tags) VALUES
    (auth.uid(), proj_id, citadel_id, 'Fall of the Elven Empire', 'Ancient Past', 'The elven civilization that built the ruins collapsed for reasons still unknown. Some say plague, others say civil war, a few whisper of darker things.', 10, ARRAY['Last Queen', 'Unknown'], ARRAY['mystery', 'elven', 'ancient']),
    (auth.uid(), proj_id, citadel_id, 'The Fey Awakening', 'Year 100', 'After centuries of dormancy, fey creatures begin appearing in the woods. They seem to be reclaiming what was once theirs.', 7, ARRAY['The Wild Hunt', 'Archfey of Twilight'], ARRAY['fey', 'awakening', 'reclamation']),
    (auth.uid(), proj_id, citadel_id, 'Discovery of the Heart Tree', 'Year 300', 'Explorers find a massive tree at the forest''s center that appears to be the source of the woods'' magic. It cannot be approached.', 8, ARRAY['Scholar Elara', 'Expedition Team Seven'], ARRAY['discovery', 'magic', 'mystery']);

    -- Events for The Crystal Spire
    SELECT id INTO citadel_id FROM public.locations
    WHERE project_id = proj_id AND name = 'The Crystal Spire';

    INSERT INTO public.location_events (user_id, project_id, location_id, title, occurs_at, description, importance, key_characters, tags) VALUES
    (auth.uid(), proj_id, citadel_id, 'Night of Falling Stars', 'Year 350', 'Meteors fall across the realm. Where the largest lands, the Crystal Spire emerges overnight, reshaping the landscape.', 10, ARRAY['Astronomer Guild', 'Local Farmers'], ARRAY['appearance', 'meteors', 'mystery']),
    (auth.uid(), proj_id, citadel_id, 'First Expedition Lost', 'Year 351', 'The Mages'' Guild sends a team of 20 to investigate. They enter the temporal anomaly field and are never seen again.', 7, ARRAY['Archmage Verin', 'Expedition Team'], ARRAY['disappearance', 'danger', 'investigation']),
    (auth.uid(), proj_id, citadel_id, 'Founding of the Spire Monastery', 'Year 360', 'Monks establish a permanent study site to observe and meditate upon the Spire''s mysteries.', 5, ARRAY['High Monk Seraph', 'The Seekers'], ARRAY['monastery', 'study', 'religion']);

    -- Events for The Shadowfell Rift
    SELECT id INTO citadel_id FROM public.locations
    WHERE project_id = proj_id AND name = 'The Shadowfell Rift';

    INSERT INTO public.location_events (user_id, project_id, location_id, title, occurs_at, description, importance, key_characters, tags) VALUES
    (auth.uid(), proj_id, citadel_id, 'The Forbidden Ritual', 'Year 200', 'Desperate mages attempt to end the Mage Wars with a ritual from an ancient grimoire. It tears reality instead of mending it.', 10, ARRAY['Mage Lord Corvus', 'The Circle of Five'], ARRAY['disaster', 'ritual', 'creation']),
    (auth.uid(), proj_id, citadel_id, 'Formation of the Rift Watchers', 'Year 201', 'Surviving mages and warriors form an order dedicated to containing the Rift and preventing further incursions.', 9, ARRAY['Commander Dusk', 'Survivor Mages'], ARRAY['founding', 'defense', 'order']),
    (auth.uid(), proj_id, citadel_id, 'The Shadow Surge', 'Year 350', 'The Rift expands suddenly, and shadow creatures pour out. Only the combined efforts of multiple kingdoms turn the tide.', 10, ARRAY['Rift Watchers', 'Allied Kingdoms', 'Shadow Lord'], ARRAY['war', 'expansion', 'crisis']);

    -- Events for The Wandering Bazaar
    SELECT id INTO citadel_id FROM public.locations
    WHERE project_id = proj_id AND name = 'The Wandering Bazaar';

    INSERT INTO public.location_events (user_id, project_id, location_id, title, occurs_at, description, importance, key_characters, tags) VALUES
    (auth.uid(), proj_id, citadel_id, 'First Recorded Appearance', 'Year 100', 'Historical records first mention the Wandering Bazaar appearing in the capital city. Chaos and wonder ensue.', 8, ARRAY['The Merchant Prince', 'Royal Court'], ARRAY['first appearance', 'mystery', 'trade']),
    (auth.uid(), proj_id, citadel_id, 'The Treaty of Merchants', 'Year 200', 'Major kingdoms agree to not attack the Bazaar and to honor all deals made within. The Bazaar''s masters enforce this strictly.', 7, ARRAY['The Seven Kings', 'Bazaar Masters'], ARRAY['treaty', 'politics', 'trade']),
    (auth.uid(), proj_id, citadel_id, 'The Impossible Purchase', 'Year 375', 'A hero buys their own death from the Memory Merchants, storing it in a time-locked vault. They become immortal until they retrieve it.', 6, ARRAY['The Hero', 'Memory Merchant'], ARRAY['magic', 'trade', 'mystery']);
END $$;

-- Verification query
SELECT
    l.name as location,
    l.category,
    COUNT(le.id) as event_count
FROM public.locations l
LEFT JOIN public.location_events le ON l.id = le.location_id
WHERE l.project_id = '{PROJECT_ID}'
GROUP BY l.id, l.name, l.category
ORDER BY l.category, l.name;
