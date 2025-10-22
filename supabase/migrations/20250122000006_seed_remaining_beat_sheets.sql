-- TICKET-TMPL-005: Beat Sheet Structures (5 SP) - P1 ⭐
-- Insert remaining beat sheet structures: Dan Harmon Story Circle and John Truby 22-Step

-- Insert Dan Harmon Story Circle (8 beats)
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
  'Dan Harmon Story Circle',
  E'Simplified Hero\'s Journey in 8 steps, visualized as a circle from comfort to unknown and back',
  'Dan Harmon',
  8,
  110,
  'story-circle',
  '[
    {"id":"sc-01-you","number":1,"name":"You","description":"A character is in a zone of comfort. Establish the hero in their ordinary world.","pageRange":"1-14","percentage":"0-12%","questions":["Who is the protagonist?","What is their comfortable status quo?","What is their routine?","What do they believe about themselves and their world?"],"examples":["Rick and Morty: Morty''s normal school day","Community: Jeff''s comfortable life as a lawyer (before)","Breaking Bad: Walter''s mundane life as chemistry teacher"]},
    {"id":"sc-02-need","number":2,"name":"Need","description":"But they want something. The hero desires something or recognizes a lack.","pageRange":"14-27","percentage":"12-25%","questions":["What does the hero want?","What is missing from their life?","What desire motivates them?","What do they think will make them happy?"],"examples":["Rick and Morty: Morty wants to impress Jessica","Community: Jeff wants to get close to Britta","Breaking Bad: Walter wants to provide for his family"]},
    {"id":"sc-03-go","number":3,"name":"Go","description":"They enter an unfamiliar situation. The hero crosses the threshold into a new world or situation.","pageRange":"27-41","percentage":"25-37%","questions":["What event propels the hero forward?","What unfamiliar situation do they enter?","What threshold do they cross?","How does their world change?"],"examples":["Rick and Morty: Gets pulled into Rick''s crazy adventure","Community: Jeff enters study group","Breaking Bad: Walter enters the criminal underworld"]},
    {"id":"sc-04-search","number":4,"name":"Search","description":"They adapt to the new situation. The hero pursues their goal, facing challenges.","pageRange":"41-55","percentage":"37-50%","questions":["How does the hero pursue their goal?","What obstacles do they encounter?","Who do they meet?","What do they learn about this new world?"],"examples":["Rick and Morty: Navigating alien worlds, solving problems","Community: Navigating group dynamics, classes","Breaking Bad: Learning the drug trade, adapting to violence"]},
    {"id":"sc-05-find","number":5,"name":"Find","description":"They get what they wanted. The hero achieves their goal or desire.","pageRange":"55-68","percentage":"50-62%","questions":["Does the hero achieve their desire?","What do they find or obtain?","What does success look like?","Is this what they expected?"],"examples":["Rick and Morty: Solves the problem, impresses Jessica","Community: Gets close to Britta/group accepts him","Breaking Bad: Makes money, becomes powerful"]},
    {"id":"sc-06-take","number":6,"name":"Take","description":"They pay a heavy price for it. Getting what they wanted comes at a cost.","pageRange":"68-82","percentage":"62-75%","questions":["What is the cost of success?","What do they lose or sacrifice?","What goes wrong?","What unexpected consequences arise?"],"examples":["Rick and Morty: Reality falls apart, relationships damaged","Community: Realizes he''s become vulnerable, exposed","Breaking Bad: Family relationships destroyed, violence escalates"]},
    {"id":"sc-07-return","number":7,"name":"Return","description":"They return to their familiar situation. The hero goes back to where they started.","pageRange":"82-96","percentage":"75-87%","questions":["How does the hero return to the ordinary world?","What do they bring back?","How is the return different from the departure?","What has been lost or gained?"],"examples":["Rick and Morty: Back home, reality restored (mostly)","Community: Returns to being a student, but changed","Breaking Bad: Tries to return to family life"]},
    {"id":"sc-08-change","number":8,"name":"Change","description":"Having changed. The hero is different because of the journey.","pageRange":"96-110","percentage":"87-100%","questions":["How has the hero changed?","What have they learned?","What do they now understand?","How is their status quo different from the beginning?"],"examples":["Rick and Morty: Morty grows more confident/damaged each episode","Community: Jeff learns value of community over self-interest","Breaking Bad: Walter fully transforms into Heisenberg"]}
  ]'::jsonb,
  'Excellent for episodic TV, short stories, video games, and any repeatable story structure',
  ARRAY['Simple and easy to remember (just 8 beats)', 'Visual circular structure is intuitive', 'Works for any length (episode, film, novel)', 'Perfect for episodic content', 'Emphasizes character change', 'Very flexible and adaptable']::TEXT[],
  ARRAY['TV Series', 'Comedy', 'Drama', 'Animation', 'Video Games']::TEXT[],
  true,
  NULL
);

-- Insert John Truby 22-Step (comprehensive structure)
-- Note: Splitting into smaller beat chunks due to JSONB size
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
  'John Truby 22-Step',
  E'Comprehensive story structure from "The Anatomy of Story" focusing on organic character-driven narratives',
  'John Truby',
  22,
  120,
  'truby-22-step',
  '[
    {"id":"truby-01-self-revelation","number":1,"name":"Self-Revelation, Need, and Desire","description":"What the hero learns about themselves by the end (work backwards from this). What psychological and moral need must they fulfill? What goal do they consciously desire?","pageRange":"Throughout","percentage":"Thematic","questions":["What does the hero learn about themselves by the end?","What psychological need drives them?","What is their conscious desire/goal?","What is the gap between what they want and what they need?"],"examples":[]},
    {"id":"truby-02-ghost","number":2,"name":"Ghost and Story World","description":"An event from the past that haunts the hero and affects their current life. The story world reflects the hero''s state of mind.","pageRange":"1-15","percentage":"0-12%","questions":["What past event haunts the hero?","How does this ghost shape who they are?","What world does the hero inhabit?","How does the world reflect their inner state?"],"examples":["The Sixth Sense: Cole''s encounter with ghosts","Batman: Parents'' murder","Vertigo: Scottie''s fear of heights from failed rescue"]},
    {"id":"truby-03-weakness-need","number":3,"name":"Weakness and Need","description":"Show the hero''s psychological and moral weakness. This creates the need that will drive the story arc.","pageRange":"1-15","percentage":"0-12%","questions":["What is the hero''s fatal flaw?","What moral weakness do they have?","What do they need to overcome?","How does this weakness affect relationships?"],"examples":["The Godfather: Michael''s belief he can stay out of family business","A Christmas Carol: Scrooge''s greed and isolation","Tootsie: Michael''s chauvinism and manipulation"]},
    {"id":"truby-04-inciting-event","number":4,"name":"Inciting Event","description":"The event that starts the hero on their journey. Someone or something disrupts the status quo.","pageRange":"15-18","percentage":"12-15%","questions":["What event disrupts the hero''s life?","Who or what initiates the action?","What opportunity or problem presents itself?","How is the status quo broken?"],"examples":["Star Wars: Discovering Leia''s message","Jaws: Shark attacks swimmer","Die Hard: Terrorists take hostage"]},
    {"id":"truby-05-desire","number":5,"name":"Desire","description":"The hero''s goal - what they consciously want to achieve. This drives the plot forward.","pageRange":"18-25","percentage":"15-20%","questions":["What specific goal does the hero pursue?","Why do they want this?","What will achieving this goal mean to them?","Is this what they truly need?"],"examples":["The Wizard of Oz: Get back to Kansas","Finding Nemo: Find Nemo","Casablanca: Get exit visas"]},
    {"id":"truby-06-ally","number":6,"name":"Ally or Allies","description":"The hero gains a companion who helps them pursue their goal and often represents an alternative approach.","pageRange":"25-30","percentage":"20-25%","questions":["Who helps the hero?","What does the ally provide (skills, knowledge, support)?","How is the ally similar to or different from the hero?","What do they learn from each other?"],"examples":["Star Wars: Han Solo, Obi-Wan","The Lord of the Rings: Fellowship members","Lethal Weapon: Riggs and Murtaugh partnership"]},
    {"id":"truby-07-opponent","number":7,"name":"Opponent and/or Mystery","description":"The main antagonist who wants the same goal as the hero or wants to stop the hero. Should be the best opponent for forcing the hero to change.","pageRange":"25-35","percentage":"20-30%","questions":["Who is the main opponent?","What do they want?","Why are they the perfect opponent for this hero?","What makes them a worthy challenge?","What values do they represent?"],"examples":["Star Wars: Darth Vader (power vs. spirituality)","The Dark Knight: Joker (chaos vs. order)","The Silence of the Lambs: Hannibal and Buffalo Bill"]},
    {"id":"truby-08-fake-ally-opponent","number":8,"name":"Fake-Ally Opponent","description":"Someone who appears to be an ally but is actually an opponent, or vice versa. Creates surprise and forces hero to see clearly.","pageRange":"30-60","percentage":"25-50%","questions":["Who isn''t what they seem?","When is their true nature revealed?","How does this betrayal/revelation affect the hero?","What does the hero learn from being deceived?"],"examples":["The Sixth Sense: Malcolm is dead","The Usual Suspects: Verbal Kint is Keyser Söze","Harry Potter: Snape (appears enemy, actually protects Harry)"]},
    {"id":"truby-09-first-revelation","number":9,"name":"First Revelation and Decision","description":"The hero learns important information about opponents, allies, or themselves. Makes a new decision about strategy.","pageRange":"35-45","percentage":"30-40%","questions":["What new information does the hero learn?","How does this change their understanding?","What decision do they make based on this?","How does their strategy shift?"],"examples":[]},
    {"id":"truby-10-plan","number":10,"name":"Plan","description":"The hero devises a strategy to overcome the opponent and achieve their desire.","pageRange":"45-55","percentage":"40-45%","questions":["What is the hero''s strategy?","How will they achieve their goal?","What resources do they gather?","What''s their approach?"],"examples":["Ocean''s Eleven: Detailed heist plan","The Sting: Elaborate con strategy","Mission Impossible: Each mission plan"]},
    {"id":"truby-11-opponent-plan","number":11,"name":"Opponent''s Plan","description":"Reveal the opponent''s counterplan, showing they are a formidable challenge.","pageRange":"45-55","percentage":"40-50%","questions":["What is the opponent''s strategy?","How do they counter the hero?","What makes them a worthy adversary?","What are their strengths?"],"examples":[]},
    {"id":"truby-12-drive","number":12,"name":"Drive","description":"The hero executes their plan. A series of actions, complications, and obstacles as hero and opponent maneuver.","pageRange":"55-75","percentage":"45-65%","questions":["How does the hero pursue their goal?","What obstacles arise?","How do they adapt their plan?","What complications occur?"],"examples":[]},
    {"id":"truby-13-attack-counterattack","number":13,"name":"Attack by Ally","description":"An ally criticizes the hero, usually for moral weaknesses. This attack comes from love and forces self-examination.","pageRange":"55-70","percentage":"45-60%","questions":["How does an ally confront the hero?","What moral weakness is exposed?","Why does this attack come from care?","How does the hero react?"],"examples":["As Good As It Gets: Carol challenges Melvin''s behavior","Jerry Maguire: Dorothy calls out Jerry''s shallowness"]},
    {"id":"truby-14-apparent-defeat","number":14,"name":"Apparent Defeat","description":"The hero''s plan appears to fail. This is often the lowest point, where all seems lost.","pageRange":"70-80","percentage":"60-70%","questions":["What is the hero''s lowest moment?","How does the plan fail?","What loss occurs?","Why does success seem impossible?"],"examples":["Star Wars: Obi-Wan dies, seems hopeless","The Empire Strikes Back: Han frozen, Luke loses hand","Rocky: Gets beaten badly in early rounds"]},
    {"id":"truby-15-second-revelation","number":15,"name":"Second Revelation and Decision","description":"The hero learns a crucial piece of information (often about themselves) that leads to a breakthrough.","pageRange":"75-85","percentage":"65-75%","questions":["What crucial truth does the hero realize?","What do they understand now that they didn''t before?","How does this change everything?","What new approach does this reveal?"],"examples":["The Sixth Sense: Cole learns to help ghosts","The Matrix: Neo learns he is The One","Tootsie: Michael realizes he''s become a better man as Dorothy"]},
    {"id":"truby-16-audience-revelation","number":16,"name":"Audience Revelation","description":"The audience learns a crucial piece of information that the hero may or may not know yet. Changes how we see the story.","pageRange":"Variable","percentage":"Variable","questions":["What does the audience discover?","How does this recontextualize the story?","Does the hero know this yet?","How does this create dramatic irony or surprise?"],"examples":["The Sixth Sense: Malcolm is dead","Fight Club: Tyler is the narrator","Planet of the Apes: It was Earth all along"]},
    {"id":"truby-17-third-revelation","number":17,"name":"Third Revelation and Decision","description":"Additional revelation that provides final piece of puzzle or understanding needed for resolution.","pageRange":"80-90","percentage":"70-80%","questions":["What final understanding emerges?","What last piece of the puzzle appears?","How does this complete the hero''s transformation?"],"examples":[]},
    {"id":"truby-18-gate-gauntlet","number":18,"name":"Gate, Gauntlet, Visit to Death","description":"The hero must pass through a final barrier or face a symbolic death before the final battle. A point of no return.","pageRange":"85-90","percentage":"75-80%","questions":["What final barrier must the hero cross?","What symbolic death do they face?","What must they sacrifice?","What is the point of no return?"],"examples":["Star Wars: Luke turns off targeting computer (abandons logic for faith)","The Lord of the Rings: Frodo at Mount Doom","The Matrix: Neo allows Agent Smith to kill him"]},
    {"id":"truby-19-battle","number":19,"name":"Battle","description":"The final confrontation between hero and opponent. All the story lines, values, and strategies collide.","pageRange":"90-105","percentage":"80-90%","questions":["What is the final confrontation?","How do all story threads converge?","What values clash in this battle?","How does the hero use what they''ve learned?"],"examples":["Star Wars: Trench run, destroying Death Star","The Silence of the Lambs: Confronting Buffalo Bill","Casablanca: Airport scene"]},
    {"id":"truby-20-self-revelation","number":20,"name":"Self-Revelation","description":"The hero realizes their truth, sees their flaw, and understands what they truly need. The moral and psychological climax.","pageRange":"100-110","percentage":"85-95%","questions":["What does the hero finally understand about themselves?","What flaw do they recognize?","What truth do they accept?","How have they changed?"],"examples":["Tootsie: Michael realizes he was a better man as a woman","Groundhog Day: Phil learns selflessness","Citizen Kane: Rosebud revealed (lost innocence)"]},
    {"id":"truby-21-moral-decision","number":21,"name":"Moral Decision","description":"The hero makes a choice that proves their character growth. Shows they''ve learned the moral lesson.","pageRange":"105-110","percentage":"90-95%","questions":["What choice proves the hero has changed?","What do they do differently than before?","What sacrifice or right action do they take?","How does this choice reflect their growth?"],"examples":["Schindler''s List: Schindler uses wealth to save lives","Casablanca: Rick helps Ilsa and Victor escape","The Shawshank Redemption: Red chooses hope"]},
    {"id":"truby-22-new-equilibrium","number":22,"name":"New Equilibrium","description":"Show the hero living in a new way, in a new world, having integrated what they''ve learned. The \"after\" picture.","pageRange":"110-120","percentage":"95-100%","questions":["What is the new status quo?","How has the hero''s world changed?","How do they live differently now?","What is the lasting impact of their transformation?"],"examples":["It''s a Wonderful Life: George sees value of his life","The Verdict: Frank Galvin redeems himself","The Godfather: Michael becomes the Godfather"]}
  ]'::jsonb,
  'Best for complex character-driven dramas, literary fiction, and stories requiring deep psychological development',
  ARRAY['Most comprehensive and detailed structure', 'Focuses on organic character development', 'Emphasizes moral and psychological dimensions', 'Multiple revelation beats create complexity', 'Works for sophisticated, layered narratives', 'Strong emphasis on need vs. desire']::TEXT[],
  ARRAY['Drama', 'Literary Fiction', 'Character Studies', 'Psychological Thriller', 'Art House']::TEXT[],
  true,
  NULL
);

-- Verify all beat sheets inserted
SELECT
  name,
  structure_id,
  total_beats,
  estimated_page_count,
  array_length(common_genres, 1) as genre_count,
  array_length(strengths, 1) as strength_count
FROM beat_sheets
WHERE is_public = true AND created_by IS NULL
ORDER BY total_beats ASC;
