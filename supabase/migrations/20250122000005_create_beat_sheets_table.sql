-- TICKET-TMPL-005: Beat Sheet Structures (5 SP) - P1 ⭐
-- Create beat_sheets table to store beat sheet structures
-- Supports: Save the Cat, Hero's Journey, Dan Harmon Story Circle, John Truby 22-Step

-- Create beat_sheets table
CREATE TABLE IF NOT EXISTS beat_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Beat sheet metadata
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  creator TEXT NOT NULL,
  total_beats INTEGER NOT NULL CHECK (total_beats > 0),
  estimated_page_count INTEGER NOT NULL DEFAULT 110,

  -- Beat sheet type identifier
  structure_id TEXT NOT NULL UNIQUE,

  -- Complete beat structure in JSONB
  beats JSONB NOT NULL,

  -- Usage and genre information
  usage TEXT NOT NULL,
  strengths TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  common_genres TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- System fields
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_beat_sheets_structure_id ON beat_sheets(structure_id);
CREATE INDEX idx_beat_sheets_created_by ON beat_sheets(created_by);
CREATE INDEX idx_beat_sheets_is_public ON beat_sheets(is_public);
CREATE INDEX idx_beat_sheets_common_genres ON beat_sheets USING GIN(common_genres);

-- Add RLS policies
ALTER TABLE beat_sheets ENABLE ROW LEVEL SECURITY;

-- Public beat sheets are readable by everyone
CREATE POLICY "Public beat sheets are readable by everyone"
  ON beat_sheets
  FOR SELECT
  USING (is_public = true);

-- Authenticated users can read all their own beat sheets
CREATE POLICY "Users can read their own beat sheets"
  ON beat_sheets
  FOR SELECT
  USING (auth.uid() = created_by);

-- Authenticated users can create beat sheets
CREATE POLICY "Authenticated users can create beat sheets"
  ON beat_sheets
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own beat sheets
CREATE POLICY "Users can update their own beat sheets"
  ON beat_sheets
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Users can delete their own beat sheets
CREATE POLICY "Users can delete their own beat sheets"
  ON beat_sheets
  FOR DELETE
  USING (auth.uid() = created_by);

-- Create updated_at trigger
CREATE TRIGGER update_beat_sheets_updated_at
  BEFORE UPDATE ON beat_sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create project_beat_sheets junction table for associating beat sheets with projects
CREATE TABLE IF NOT EXISTS project_beat_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  beat_sheet_id UUID NOT NULL REFERENCES beat_sheets(id) ON DELETE CASCADE,

  -- User-filled beat data
  beat_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Progress tracking
  completed_beats INTEGER NOT NULL DEFAULT 0,
  total_beats INTEGER NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one beat sheet per project
  UNIQUE(project_id, beat_sheet_id)
);

-- Add indexes for project_beat_sheets
CREATE INDEX idx_project_beat_sheets_project_id ON project_beat_sheets(project_id);
CREATE INDEX idx_project_beat_sheets_beat_sheet_id ON project_beat_sheets(beat_sheet_id);

-- Add RLS policies for project_beat_sheets
ALTER TABLE project_beat_sheets ENABLE ROW LEVEL SECURITY;

-- Users can read beat sheets for their projects
CREATE POLICY "Users can read beat sheets for their projects"
  ON project_beat_sheets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_beat_sheets.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can insert beat sheets for their projects
CREATE POLICY "Users can insert beat sheets for their projects"
  ON project_beat_sheets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_beat_sheets.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can update beat sheets for their projects
CREATE POLICY "Users can update beat sheets for their projects"
  ON project_beat_sheets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_beat_sheets.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can delete beat sheets for their projects
CREATE POLICY "Users can delete beat sheets for their projects"
  ON project_beat_sheets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_beat_sheets.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create updated_at trigger for project_beat_sheets
CREATE TRIGGER update_project_beat_sheets_updated_at
  BEFORE UPDATE ON project_beat_sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed the 4 system beat sheet structures
INSERT INTO beat_sheets (
  name,
  description,
  creator,
  total_beats,
  estimated_page_count,
  structure_id,
  beats,
  usage,
  strengths,
  common_genres,
  is_public,
  created_by
) VALUES
(
  'Save the Cat',
  E'Blake Snyder\'s 15-beat structure for commercial screenwriting',
  'Blake Snyder',
  15,
  110,
  'save-the-cat',
  '[
    {
      "id": "stc-01-opening-image",
      "number": 1,
      "name": "Opening Image",
      "description": "A visual snapshot of the hero''s life before the adventure begins. The \"before\" picture that will contrast with the \"after\" in the Final Image.",
      "pageRange": "1",
      "percentage": "0-1%",
      "questions": [
        "What does your hero''s world look like before change?",
        "What visual establishes their status quo?",
        "What tone does this set for the story?"
      ],
      "examples": [
        "Star Wars: Luke gazing at twin sunsets, yearning for adventure",
        "The Matrix: Neo asleep at his computer, living a double life"
      ]
    },
    {
      "id": "stc-02-theme-stated",
      "number": 2,
      "name": "Theme Stated",
      "description": "Someone (usually not the hero) states the theme of the movie. The hero doesn''t understand it yet, but will by the end.",
      "pageRange": "5",
      "percentage": "5%",
      "questions": [
        "What is your story really about?",
        "Who states the lesson the hero needs to learn?",
        "How is this theme introduced subtly?"
      ],
      "examples": [
        "Star Wars: \"Your eyes can deceive you, don''t trust them\" (theme: trust the Force)",
        "The Incredibles: \"Everyone''s special, Dash.\" \"Which is another way of saying no one is.\""
      ]
    },
    {
      "id": "stc-03-setup",
      "number": 3,
      "name": "Set-Up",
      "description": "Introduce the hero''s world, supporting characters, and the hero''s \"need\" (what''s missing in their life). Show the status quo that will soon be disrupted.",
      "pageRange": "1-10",
      "percentage": "1-10%",
      "questions": [
        "Who are the important people in the hero''s life?",
        "What is missing or broken in the hero''s world?",
        "What routines define their current existence?",
        "What do they think they want vs. what they actually need?"
      ],
      "examples": [
        "Star Wars: Luke''s daily life on Tatooine, yearning to leave",
        "The Matrix: Neo''s mundane job by day, hacker by night"
      ]
    },
    {
      "id": "stc-04-catalyst",
      "number": 4,
      "name": "Catalyst",
      "description": "The inciting incident. Life as the hero knows it is over. Something happens that sets the story in motion.",
      "pageRange": "12",
      "percentage": "10%",
      "questions": [
        "What event disrupts the hero''s status quo?",
        "What opportunity or problem presents itself?",
        "How does this event relate to the theme?"
      ],
      "examples": [
        "Star Wars: Discovering Leia''s hologram message",
        "The Matrix: Trinity''s message, \"The Matrix has you\""
      ]
    },
    {
      "id": "stc-05-debate",
      "number": 5,
      "name": "Debate",
      "description": "The hero hesitates, doubts, or debates whether to take action. Should I go? Do I dare? This makes the hero relatable and human.",
      "pageRange": "12-25",
      "percentage": "10-20%",
      "questions": [
        "Why would the hero refuse the call?",
        "What fears or obligations hold them back?",
        "What internal conflict do they face?",
        "Who or what tries to convince them to go/not go?"
      ],
      "examples": [
        "Star Wars: Luke refuses to join Obi-Wan, must help with harvest",
        "The Matrix: Neo freaks out on the ledge, chooses not to escape agents"
      ]
    },
    {
      "id": "stc-06-break-into-two",
      "number": 6,
      "name": "Break into Two",
      "description": "The hero makes a choice and enters Act II. They leave the old world behind and enter a new, upside-down world.",
      "pageRange": "25",
      "percentage": "20%",
      "questions": [
        "What decision does the hero actively make?",
        "What forces them to commit to the journey?",
        "How does their world change as they cross this threshold?"
      ],
      "examples": [
        "Star Wars: Luke finds his aunt and uncle dead, decides to join Obi-Wan",
        "The Matrix: Neo takes the red pill"
      ]
    },
    {
      "id": "stc-07-b-story",
      "number": 7,
      "name": "B Story",
      "description": "The love story or relationship story begins. This is where the hero meets someone who will help them learn the theme.",
      "pageRange": "30",
      "percentage": "22-30%",
      "questions": [
        "Who is the relationship character (love interest, mentor, friend)?",
        "How does this relationship help the hero grow?",
        "What does this character represent thematically?"
      ],
      "examples": [
        "Star Wars: Luke bonds with Han and Leia",
        "The Matrix: Neo''s relationship with Morpheus and Trinity deepens"
      ]
    },
    {
      "id": "stc-08-fun-and-games",
      "number": 8,
      "name": "Fun and Games",
      "description": "The \"promise of the premise.\" This is what the movie poster advertises. The hero explores the new world, has adventures, but doesn''t confront the main problem yet.",
      "pageRange": "30-55",
      "percentage": "30-50%",
      "questions": [
        "What is the fun part of your premise?",
        "What set pieces showcase your concept?",
        "How does the hero react to this new world?",
        "What skills do they begin to develop?"
      ],
      "examples": [
        "Star Wars: Lightsaber training, escaping Death Star trash compactor",
        "The Matrix: Learning kung fu, dodging bullets, bending spoons"
      ]
    },
    {
      "id": "stc-09-midpoint",
      "number": 9,
      "name": "Midpoint",
      "description": "Either a false victory (got what they wanted) or false defeat (lost what they needed). Time clock starts ticking. Stakes are raised.",
      "pageRange": "55",
      "percentage": "50%",
      "questions": [
        "Does the hero experience a high or a low?",
        "What do they think they''ve achieved or lost?",
        "What new information changes everything?",
        "What time pressure or deadline is introduced?"
      ],
      "examples": [
        "Star Wars: Death Star plans obtained, but Obi-Wan dies (false victory + real loss)",
        "The Matrix: Neo believes he''s not The One (false defeat)"
      ]
    },
    {
      "id": "stc-10-bad-guys-close-in",
      "number": 10,
      "name": "Bad Guys Close In",
      "description": "If Midpoint was a false victory, now things get worse. If it was a false defeat, now enemies regroup. Internal and external pressure mounts.",
      "pageRange": "55-75",
      "percentage": "50-75%",
      "questions": [
        "How do external forces press in on the hero?",
        "What internal doubts or team conflicts arise?",
        "How do the stakes continue to rise?",
        "What mistakes does the hero make?"
      ],
      "examples": [
        "Star Wars: Empire tracks them to Rebel base, preparing to destroy it",
        "The Matrix: Cypher betrays the crew, team members die"
      ]
    },
    {
      "id": "stc-11-all-is-lost",
      "number": 11,
      "name": "All Is Lost",
      "description": "The lowest point. The opposite of the Midpoint. False defeat becomes real defeat. Someone or something dies (literally or figuratively).",
      "pageRange": "75",
      "percentage": "75%",
      "questions": [
        "What is the hero''s darkest moment?",
        "What death occurs (person, dream, old self)?",
        "Why does it seem impossible to succeed now?",
        "What has the hero lost?"
      ],
      "examples": [
        "Star Wars: Death Star approaches, Rebel attack seems futile",
        "The Matrix: Morpheus captured, Neo must rescue him or humanity loses"
      ]
    },
    {
      "id": "stc-12-dark-night-of-soul",
      "number": 12,
      "name": "Dark Night of the Soul",
      "description": "The hero processes the loss. The \"beat of death.\" Wallowing in hopelessness before finding the internal solution.",
      "pageRange": "75-85",
      "percentage": "75-80%",
      "questions": [
        "How does the hero react to their loss?",
        "What do they realize about themselves?",
        "What internal shift begins to happen?",
        "How do they begin to understand the theme?"
      ],
      "examples": [
        "Star Wars: Pilots doubting success, Luke must trust the Force",
        "The Matrix: Neo doesn''t believe in himself yet"
      ]
    },
    {
      "id": "stc-13-break-into-three",
      "number": 13,
      "name": "Break into Three",
      "description": "Thanks to the B Story character and the internal revelation, the hero discovers the solution. They get their \"aha!\" moment and enter Act III.",
      "pageRange": "85",
      "percentage": "80%",
      "questions": [
        "What does the hero finally understand?",
        "How does the B Story help them realize the solution?",
        "What active choice do they make to move forward?",
        "How have they synthesized lessons from A and B stories?"
      ],
      "examples": [
        "Star Wars: \"Use the Force, Luke\" - Obi-Wan''s voice guides him",
        "The Matrix: Oracle''s words make sense, Morpheus''s belief empowers him"
      ]
    },
    {
      "id": "stc-14-finale",
      "number": 14,
      "name": "Finale",
      "description": "Act III. The hero applies what they''ve learned and defeats the villain/problem. The world is synthesized - old world + new lessons = better world.",
      "pageRange": "85-110",
      "percentage": "80-99%",
      "questions": [
        "How does the hero use their new knowledge?",
        "What is the final confrontation?",
        "How do A Story and B Story threads resolve?",
        "What does the hero sacrifice or risk?"
      ],
      "examples": [
        "Star Wars: Trench run, Luke turns off targeting computer, uses Force",
        "The Matrix: Neo believes, stops bullets, enters Agent Smith, destroys him"
      ]
    },
    {
      "id": "stc-15-final-image",
      "number": 15,
      "name": "Final Image",
      "description": "The opposite of the Opening Image. Visual proof that change has occurred. The \"after\" picture showing the hero''s transformation.",
      "pageRange": "110",
      "percentage": "100%",
      "questions": [
        "How is this image the opposite of the Opening Image?",
        "What visual shows the hero has changed?",
        "What does the new status quo look like?"
      ],
      "examples": [
        "Star Wars: Luke receives medal, part of Rebel Alliance, found his place",
        "The Matrix: Neo flies, fully embracing his power as The One"
      ]
    }
  ]'::jsonb,
  'Ideal for commercial genre films, action-adventures, comedies, and stories with clear protagonist arcs',
  ARRAY['Very specific page counts for 110-page screenplay', 'Commercial proven structure', 'Clear emotional beats', 'Emphasis on theme', 'Easy to understand and apply']::TEXT[],
  ARRAY['Action', 'Comedy', 'Romance', 'Thriller', 'Adventure']::TEXT[],
  true,
  NULL
),
(
  'Hero''s Journey',
  E'Christopher Vogler\'s adaptation of Joseph Campbell\'s monomyth - the universal story structure',
  'Christopher Vogler (based on Joseph Campbell)',
  12,
  110,
  'heros-journey',
  '[
    {"id":"hj-01-ordinary-world","number":1,"name":"Ordinary World","description":"The hero''s normal life before the adventure begins. Establishes what''s at stake and what will be lost if the hero doesn''t return.","pageRange":"1-10","percentage":"0-10%","questions":["What is the hero''s everyday life like?","What comfort zone will they leave behind?","What do they take for granted?","What is their relationship to their community?"],"examples":["The Wizard of Oz: Dorothy on the farm in Kansas","Harry Potter: Living in the cupboard under the stairs","The Lord of the Rings: Frodo''s peaceful life in the Shire"]},
    {"id":"hj-02-call-to-adventure","number":2,"name":"Call to Adventure","description":"The hero is presented with a problem, challenge, or adventure. The status quo is disrupted.","pageRange":"10-12","percentage":"10%","questions":["What disrupts the ordinary world?","What quest or problem presents itself?","What opportunity appears?","What danger threatens?"],"examples":["The Wizard of Oz: Tornado strikes","Harry Potter: Letter from Hogwarts arrives","The Lord of the Rings: Gandalf reveals the Ring''s true nature"]},
    {"id":"hj-03-refusal-of-call","number":3,"name":"Refusal of the Call","description":"The hero hesitates or refuses the adventure due to fear, obligation, or reluctance to change.","pageRange":"12-17","percentage":"10-15%","questions":["Why does the hero resist?","What fears hold them back?","What obligations or loyalties conflict with the call?","What do they think they have to lose?"],"examples":["The Wizard of Oz: Dorothy tries to get home immediately","Harry Potter: \"I''m just Harry\" - doubts he''s special","The Lord of the Rings: Frodo wishes it hadn''t happened"]},
    {"id":"hj-04-meeting-mentor","number":4,"name":"Meeting the Mentor","description":"The hero encounters someone who gives them training, equipment, advice, or confidence needed to begin the journey.","pageRange":"17-22","percentage":"15-20%","questions":["Who prepares the hero for the journey?","What gifts (physical or wisdom) does the mentor provide?","What does the hero need to learn?","How does the mentor inspire confidence?"],"examples":["The Wizard of Oz: Glinda the Good Witch gives ruby slippers","Harry Potter: Hagrid reveals Harry''s true identity","Star Wars: Obi-Wan teaches Luke about the Force"]},
    {"id":"hj-05-crossing-threshold","number":5,"name":"Crossing the Threshold","description":"The hero commits to the adventure and crosses into the Special World. There''s no turning back.","pageRange":"22-25","percentage":"20-25%","questions":["What is the point of no return?","What gateway does the hero pass through?","What guardian must they pass?","How does the world change once they cross?"],"examples":["The Wizard of Oz: Following the Yellow Brick Road into unknown territory","Harry Potter: Passing through Platform 9¾","The Matrix: Taking the red pill"]},
    {"id":"hj-06-tests-allies-enemies","number":6,"name":"Tests, Allies, and Enemies","description":"The hero faces trials, meets allies, and confronts enemies. They learn the rules of the Special World.","pageRange":"25-55","percentage":"25-50%","questions":["What challenges test the hero?","Who becomes an ally?","Who reveals themselves as an enemy?","What are the rules of this new world?","What skills does the hero develop?"],"examples":["The Wizard of Oz: Meeting Scarecrow, Tin Man, Lion; evading Wicked Witch","Harry Potter: Making friends, learning magic, discovering Quirrell","Star Wars: Mos Eisley Cantina, meeting Han and Chewie"]},
    {"id":"hj-07-approach-inmost-cave","number":7,"name":"Approach to the Inmost Cave","description":"The hero and allies prepare for the major challenge. They approach the dangerous place where the ultimate goal resides.","pageRange":"55-60","percentage":"50-55%","questions":["Where is the most dangerous place?","What preparations are needed?","What do they fear most?","What strategy do they devise?"],"examples":["The Wizard of Oz: Approaching the Witch''s castle","Harry Potter: Heading to third floor corridor where Fluffy guards the Stone","Star Wars: Infiltrating the Death Star"]},
    {"id":"hj-08-ordeal","number":8,"name":"Ordeal","description":"The hero faces their greatest fear, confronts death (literal or symbolic). This is the crisis moment where everything is at stake.","pageRange":"60-75","percentage":"55-65%","questions":["What is the hero''s greatest fear?","What death (real or symbolic) do they face?","What is the darkest moment?","What sacrifice is required?"],"examples":["The Wizard of Oz: Witch captures Dorothy, hourglass running out","Harry Potter: Confronting Quirrell/Voldemort in final chamber","Star Wars: Obi-Wan''s death, Luke''s despair"]},
    {"id":"hj-09-reward","number":9,"name":"Reward (Seizing the Sword)","description":"The hero survives the Ordeal and claims the treasure - knowledge, item, reconciliation, or power needed to return home.","pageRange":"75-80","percentage":"65-75%","questions":["What does the hero gain from surviving?","What treasure or knowledge do they claim?","What new power or understanding emerges?","What has their sacrifice earned?"],"examples":["The Wizard of Oz: Witch melts, broomstick obtained","Harry Potter: Philosopher''s Stone secured, Voldemort thwarted","Star Wars: Death Star plans obtained"]},
    {"id":"hj-10-road-back","number":10,"name":"The Road Back","description":"The hero must return to the Ordinary World. Often involves pursuit or consequences. The adventure isn''t over yet.","pageRange":"80-90","percentage":"75-85%","questions":["What drives the hero back?","What forces pursue them?","What unfinished business remains?","What consequences follow their actions?"],"examples":["The Wizard of Oz: Returning to Wizard for the promised reward","Harry Potter: Recovering in hospital wing, year ending","Star Wars: Racing to Rebel base before Death Star arrives"]},
    {"id":"hj-11-resurrection","number":11,"name":"Resurrection","description":"The hero faces one final test using everything learned. A final death-and-rebirth moment. The hero is transformed.","pageRange":"90-105","percentage":"85-95%","questions":["What is the final, ultimate test?","How does the hero use everything they''ve learned?","What final transformation occurs?","How do they prove they''ve changed?"],"examples":["The Wizard of Oz: Revealing the Wizard''s deception, finding own power","Harry Potter: Sacrifice protection from mother''s love defeats Voldemort","Star Wars: Luke trusts Force, makes impossible shot"]},
    {"id":"hj-12-return-with-elixir","number":12,"name":"Return with the Elixir","description":"The hero returns home transformed, bringing something (knowledge, treasure, wisdom) that benefits the Ordinary World.","pageRange":"105-110","percentage":"95-100%","questions":["What does the hero bring back?","How has the hero changed?","How does the Ordinary World benefit?","What wisdom can the hero now share?"],"examples":["The Wizard of Oz: \"There''s no place like home\" - appreciates what she had","Harry Potter: Returns to Dursleys knowing his true identity and worth","Star Wars: Luke is a hero, part of Rebel Alliance, found his purpose"]}
  ]'::jsonb,
  'Best for mythic journeys, fantasy, science fiction, coming-of-age stories, and character transformation arcs',
  ARRAY['Universal mythological pattern', 'Strong character arc focus', 'Works across all cultures and time periods', 'Emphasizes transformation', 'Archetypes provide clear character roles']::TEXT[],
  ARRAY['Fantasy', 'Science Fiction', 'Adventure', 'Coming-of-Age', 'Epic']::TEXT[],
  true,
  NULL
);

-- Note: Due to SQL statement size limits, inserting Story Circle and Truby 22-Step in separate INSERT statements
