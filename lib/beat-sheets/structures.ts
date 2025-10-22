/**
 * Beat Sheet Structures
 *
 * Comprehensive beat sheet frameworks for story structure planning.
 * Supports Save the Cat, Hero's Journey, Dan Harmon Story Circle, and John Truby 22-Step.
 */

export interface BeatDefinition {
  id: string;
  number: number;
  name: string;
  description: string;
  pageRange?: string; // e.g., "1-5" or "55-60"
  percentage?: string; // e.g., "0-5%" or "50%"
  questions?: string[]; // Questions to help writer fill in this beat
  examples?: string[]; // Examples from well-known films
}

export interface BeatSheetStructure {
  id: string;
  name: string;
  description: string;
  creator: string;
  totalBeats: number;
  estimatedPageCount: number; // Standard screenplay pages
  beats: BeatDefinition[];
  usage: string; // When to use this structure
  strengths: string[];
  commonGenres: string[];
}

/**
 * Save the Cat (Blake Snyder)
 * 15-beat structure designed for 110-page screenplay
 */
export const saveTheCat: BeatSheetStructure = {
  id: 'save-the-cat',
  name: 'Save the Cat',
  description: 'Blake Snyder\'s 15-beat structure for commercial screenwriting',
  creator: 'Blake Snyder',
  totalBeats: 15,
  estimatedPageCount: 110,
  beats: [
    {
      id: 'stc-01-opening-image',
      number: 1,
      name: 'Opening Image',
      description: 'A visual snapshot of the hero\'s life before the adventure begins. The "before" picture that will contrast with the "after" in the Final Image.',
      pageRange: '1',
      percentage: '0-1%',
      questions: [
        'What does your hero\'s world look like before change?',
        'What visual establishes their status quo?',
        'What tone does this set for the story?'
      ],
      examples: [
        'Star Wars: Luke gazing at twin sunsets, yearning for adventure',
        'The Matrix: Neo asleep at his computer, living a double life'
      ]
    },
    {
      id: 'stc-02-theme-stated',
      number: 2,
      name: 'Theme Stated',
      description: 'Someone (usually not the hero) states the theme of the movie. The hero doesn\'t understand it yet, but will by the end.',
      pageRange: '5',
      percentage: '5%',
      questions: [
        'What is your story really about?',
        'Who states the lesson the hero needs to learn?',
        'How is this theme introduced subtly?'
      ],
      examples: [
        'Star Wars: "Your eyes can deceive you, don\'t trust them" (theme: trust the Force)',
        'The Incredibles: "Everyone\'s special, Dash." "Which is another way of saying no one is."'
      ]
    },
    {
      id: 'stc-03-setup',
      number: 3,
      name: 'Set-Up',
      description: 'Introduce the hero\'s world, supporting characters, and the hero\'s "need" (what\'s missing in their life). Show the status quo that will soon be disrupted.',
      pageRange: '1-10',
      percentage: '1-10%',
      questions: [
        'Who are the important people in the hero\'s life?',
        'What is missing or broken in the hero\'s world?',
        'What routines define their current existence?',
        'What do they think they want vs. what they actually need?'
      ],
      examples: [
        'Star Wars: Luke\'s daily life on Tatooine, yearning to leave',
        'The Matrix: Neo\'s mundane job by day, hacker by night'
      ]
    },
    {
      id: 'stc-04-catalyst',
      number: 4,
      name: 'Catalyst',
      description: 'The inciting incident. Life as the hero knows it is over. Something happens that sets the story in motion.',
      pageRange: '12',
      percentage: '10%',
      questions: [
        'What event disrupts the hero\'s status quo?',
        'What opportunity or problem presents itself?',
        'How does this event relate to the theme?'
      ],
      examples: [
        'Star Wars: Discovering Leia\'s hologram message',
        'The Matrix: Trinity\'s message, "The Matrix has you"'
      ]
    },
    {
      id: 'stc-05-debate',
      number: 5,
      name: 'Debate',
      description: 'The hero hesitates, doubts, or debates whether to take action. Should I go? Do I dare? This makes the hero relatable and human.',
      pageRange: '12-25',
      percentage: '10-20%',
      questions: [
        'Why would the hero refuse the call?',
        'What fears or obligations hold them back?',
        'What internal conflict do they face?',
        'Who or what tries to convince them to go/not go?'
      ],
      examples: [
        'Star Wars: Luke refuses to join Obi-Wan, must help with harvest',
        'The Matrix: Neo freaks out on the ledge, chooses not to escape agents'
      ]
    },
    {
      id: 'stc-06-break-into-two',
      number: 6,
      name: 'Break into Two',
      description: 'The hero makes a choice and enters Act II. They leave the old world behind and enter a new, upside-down world.',
      pageRange: '25',
      percentage: '20%',
      questions: [
        'What decision does the hero actively make?',
        'What forces them to commit to the journey?',
        'How does their world change as they cross this threshold?'
      ],
      examples: [
        'Star Wars: Luke finds his aunt and uncle dead, decides to join Obi-Wan',
        'The Matrix: Neo takes the red pill'
      ]
    },
    {
      id: 'stc-07-b-story',
      number: 7,
      name: 'B Story',
      description: 'The love story or relationship story begins. This is where the hero meets someone who will help them learn the theme.',
      pageRange: '30',
      percentage: '22-30%',
      questions: [
        'Who is the relationship character (love interest, mentor, friend)?',
        'How does this relationship help the hero grow?',
        'What does this character represent thematically?'
      ],
      examples: [
        'Star Wars: Luke bonds with Han and Leia',
        'The Matrix: Neo\'s relationship with Morpheus and Trinity deepens'
      ]
    },
    {
      id: 'stc-08-fun-and-games',
      number: 8,
      name: 'Fun and Games',
      description: 'The "promise of the premise." This is what the movie poster advertises. The hero explores the new world, has adventures, but doesn\'t confront the main problem yet.',
      pageRange: '30-55',
      percentage: '30-50%',
      questions: [
        'What is the fun part of your premise?',
        'What set pieces showcase your concept?',
        'How does the hero react to this new world?',
        'What skills do they begin to develop?'
      ],
      examples: [
        'Star Wars: Lightsaber training, escaping Death Star trash compactor',
        'The Matrix: Learning kung fu, dodging bullets, bending spoons'
      ]
    },
    {
      id: 'stc-09-midpoint',
      number: 9,
      name: 'Midpoint',
      description: 'Either a false victory (got what they wanted) or false defeat (lost what they needed). Time clock starts ticking. Stakes are raised.',
      pageRange: '55',
      percentage: '50%',
      questions: [
        'Does the hero experience a high or a low?',
        'What do they think they\'ve achieved or lost?',
        'What new information changes everything?',
        'What time pressure or deadline is introduced?'
      ],
      examples: [
        'Star Wars: Death Star plans obtained, but Obi-Wan dies (false victory + real loss)',
        'The Matrix: Neo believes he\'s not The One (false defeat)'
      ]
    },
    {
      id: 'stc-10-bad-guys-close-in',
      number: 10,
      name: 'Bad Guys Close In',
      description: 'If Midpoint was a false victory, now things get worse. If it was a false defeat, now enemies regroup. Internal and external pressure mounts.',
      pageRange: '55-75',
      percentage: '50-75%',
      questions: [
        'How do external forces press in on the hero?',
        'What internal doubts or team conflicts arise?',
        'How do the stakes continue to rise?',
        'What mistakes does the hero make?'
      ],
      examples: [
        'Star Wars: Empire tracks them to Rebel base, preparing to destroy it',
        'The Matrix: Cypher betrays the crew, team members die'
      ]
    },
    {
      id: 'stc-11-all-is-lost',
      number: 11,
      name: 'All Is Lost',
      description: 'The lowest point. The opposite of the Midpoint. False defeat becomes real defeat. Someone or something dies (literally or figuratively).',
      pageRange: '75',
      percentage: '75%',
      questions: [
        'What is the hero\'s darkest moment?',
        'What death occurs (person, dream, old self)?',
        'Why does it seem impossible to succeed now?',
        'What has the hero lost?'
      ],
      examples: [
        'Star Wars: Death Star approaches, Rebel attack seems futile',
        'The Matrix: Morpheus captured, Neo must rescue him or humanity loses'
      ]
    },
    {
      id: 'stc-12-dark-night-of-soul',
      number: 12,
      name: 'Dark Night of the Soul',
      description: 'The hero processes the loss. The "beat of death." Wallowing in hopelessness before finding the internal solution.',
      pageRange: '75-85',
      percentage: '75-80%',
      questions: [
        'How does the hero react to their loss?',
        'What do they realize about themselves?',
        'What internal shift begins to happen?',
        'How do they begin to understand the theme?'
      ],
      examples: [
        'Star Wars: Pilots doubting success, Luke must trust the Force',
        'The Matrix: Neo doesn\'t believe in himself yet'
      ]
    },
    {
      id: 'stc-13-break-into-three',
      number: 13,
      name: 'Break into Three',
      description: 'Thanks to the B Story character and the internal revelation, the hero discovers the solution. They get their "aha!" moment and enter Act III.',
      pageRange: '85',
      percentage: '80%',
      questions: [
        'What does the hero finally understand?',
        'How does the B Story help them realize the solution?',
        'What active choice do they make to move forward?',
        'How have they synthesized lessons from A and B stories?'
      ],
      examples: [
        'Star Wars: "Use the Force, Luke" - Obi-Wan\'s voice guides him',
        'The Matrix: Oracle\'s words make sense, Morpheus\'s belief empowers him'
      ]
    },
    {
      id: 'stc-14-finale',
      number: 14,
      name: 'Finale',
      description: 'Act III. The hero applies what they\'ve learned and defeats the villain/problem. The world is synthesized - old world + new lessons = better world.',
      pageRange: '85-110',
      percentage: '80-99%',
      questions: [
        'How does the hero use their new knowledge?',
        'What is the final confrontation?',
        'How do A Story and B Story threads resolve?',
        'What does the hero sacrifice or risk?'
      ],
      examples: [
        'Star Wars: Trench run, Luke turns off targeting computer, uses Force',
        'The Matrix: Neo believes, stops bullets, enters Agent Smith, destroys him'
      ]
    },
    {
      id: 'stc-15-final-image',
      number: 15,
      name: 'Final Image',
      description: 'The opposite of the Opening Image. Visual proof that change has occurred. The "after" picture showing the hero\'s transformation.',
      pageRange: '110',
      percentage: '100%',
      questions: [
        'How is this image the opposite of the Opening Image?',
        'What visual shows the hero has changed?',
        'What does the new status quo look like?'
      ],
      examples: [
        'Star Wars: Luke receives medal, part of Rebel Alliance, found his place',
        'The Matrix: Neo flies, fully embracing his power as The One'
      ]
    }
  ],
  usage: 'Ideal for commercial genre films, action-adventures, comedies, and stories with clear protagonist arcs',
  strengths: [
    'Very specific page counts for 110-page screenplay',
    'Commercial proven structure',
    'Clear emotional beats',
    'Emphasis on theme',
    'Easy to understand and apply'
  ],
  commonGenres: ['Action', 'Comedy', 'Romance', 'Thriller', 'Adventure']
};

/**
 * Hero's Journey (Christopher Vogler / Joseph Campbell)
 * 12-stage monomyth structure
 */
export const herosJourney: BeatSheetStructure = {
  id: 'heros-journey',
  name: 'Hero\'s Journey',
  description: 'Christopher Vogler\'s adaptation of Joseph Campbell\'s monomyth - the universal story structure',
  creator: 'Christopher Vogler (based on Joseph Campbell)',
  totalBeats: 12,
  estimatedPageCount: 110,
  beats: [
    {
      id: 'hj-01-ordinary-world',
      number: 1,
      name: 'Ordinary World',
      description: 'The hero\'s normal life before the adventure begins. Establishes what\'s at stake and what will be lost if the hero doesn\'t return.',
      pageRange: '1-10',
      percentage: '0-10%',
      questions: [
        'What is the hero\'s everyday life like?',
        'What comfort zone will they leave behind?',
        'What do they take for granted?',
        'What is their relationship to their community?'
      ],
      examples: [
        'The Wizard of Oz: Dorothy on the farm in Kansas',
        'Harry Potter: Living in the cupboard under the stairs',
        'The Lord of the Rings: Frodo\'s peaceful life in the Shire'
      ]
    },
    {
      id: 'hj-02-call-to-adventure',
      number: 2,
      name: 'Call to Adventure',
      description: 'The hero is presented with a problem, challenge, or adventure. The status quo is disrupted.',
      pageRange: '10-12',
      percentage: '10%',
      questions: [
        'What disrupts the ordinary world?',
        'What quest or problem presents itself?',
        'What opportunity appears?',
        'What danger threatens?'
      ],
      examples: [
        'The Wizard of Oz: Tornado strikes',
        'Harry Potter: Letter from Hogwarts arrives',
        'The Lord of the Rings: Gandalf reveals the Ring\'s true nature'
      ]
    },
    {
      id: 'hj-03-refusal-of-call',
      number: 3,
      name: 'Refusal of the Call',
      description: 'The hero hesitates or refuses the adventure due to fear, obligation, or reluctance to change.',
      pageRange: '12-17',
      percentage: '10-15%',
      questions: [
        'Why does the hero resist?',
        'What fears hold them back?',
        'What obligations or loyalties conflict with the call?',
        'What do they think they have to lose?'
      ],
      examples: [
        'The Wizard of Oz: Dorothy tries to get home immediately',
        'Harry Potter: "I\'m just Harry" - doubts he\'s special',
        'The Lord of the Rings: Frodo wishes it hadn\'t happened'
      ]
    },
    {
      id: 'hj-04-meeting-mentor',
      number: 4,
      name: 'Meeting the Mentor',
      description: 'The hero encounters someone who gives them training, equipment, advice, or confidence needed to begin the journey.',
      pageRange: '17-22',
      percentage: '15-20%',
      questions: [
        'Who prepares the hero for the journey?',
        'What gifts (physical or wisdom) does the mentor provide?',
        'What does the hero need to learn?',
        'How does the mentor inspire confidence?'
      ],
      examples: [
        'The Wizard of Oz: Glinda the Good Witch gives ruby slippers',
        'Harry Potter: Hagrid reveals Harry\'s true identity',
        'Star Wars: Obi-Wan teaches Luke about the Force'
      ]
    },
    {
      id: 'hj-05-crossing-threshold',
      number: 5,
      name: 'Crossing the Threshold',
      description: 'The hero commits to the adventure and crosses into the Special World. There\'s no turning back.',
      pageRange: '22-25',
      percentage: '20-25%',
      questions: [
        'What is the point of no return?',
        'What gateway does the hero pass through?',
        'What guardian must they pass?',
        'How does the world change once they cross?'
      ],
      examples: [
        'The Wizard of Oz: Following the Yellow Brick Road into unknown territory',
        'Harry Potter: Passing through Platform 9¾',
        'The Matrix: Taking the red pill'
      ]
    },
    {
      id: 'hj-06-tests-allies-enemies',
      number: 6,
      name: 'Tests, Allies, and Enemies',
      description: 'The hero faces trials, meets allies, and confronts enemies. They learn the rules of the Special World.',
      pageRange: '25-55',
      percentage: '25-50%',
      questions: [
        'What challenges test the hero?',
        'Who becomes an ally?',
        'Who reveals themselves as an enemy?',
        'What are the rules of this new world?',
        'What skills does the hero develop?'
      ],
      examples: [
        'The Wizard of Oz: Meeting Scarecrow, Tin Man, Lion; evading Wicked Witch',
        'Harry Potter: Making friends, learning magic, discovering Quirrell',
        'Star Wars: Mos Eisley Cantina, meeting Han and Chewie'
      ]
    },
    {
      id: 'hj-07-approach-inmost-cave',
      number: 7,
      name: 'Approach to the Inmost Cave',
      description: 'The hero and allies prepare for the major challenge. They approach the dangerous place where the ultimate goal resides.',
      pageRange: '55-60',
      percentage: '50-55%',
      questions: [
        'Where is the most dangerous place?',
        'What preparations are needed?',
        'What do they fear most?',
        'What strategy do they devise?'
      ],
      examples: [
        'The Wizard of Oz: Approaching the Witch\'s castle',
        'Harry Potter: Heading to third floor corridor where Fluffy guards the Stone',
        'Star Wars: Infiltrating the Death Star'
      ]
    },
    {
      id: 'hj-08-ordeal',
      number: 8,
      name: 'Ordeal',
      description: 'The hero faces their greatest fear, confronts death (literal or symbolic). This is the crisis moment where everything is at stake.',
      pageRange: '60-75',
      percentage: '55-65%',
      questions: [
        'What is the hero\'s greatest fear?',
        'What death (real or symbolic) do they face?',
        'What is the darkest moment?',
        'What sacrifice is required?'
      ],
      examples: [
        'The Wizard of Oz: Witch captures Dorothy, hourglass running out',
        'Harry Potter: Confronting Quirrell/Voldemort in final chamber',
        'Star Wars: Obi-Wan\'s death, Luke\'s despair'
      ]
    },
    {
      id: 'hj-09-reward',
      number: 9,
      name: 'Reward (Seizing the Sword)',
      description: 'The hero survives the Ordeal and claims the treasure - knowledge, item, reconciliation, or power needed to return home.',
      pageRange: '75-80',
      percentage: '65-75%',
      questions: [
        'What does the hero gain from surviving?',
        'What treasure or knowledge do they claim?',
        'What new power or understanding emerges?',
        'What has their sacrifice earned?'
      ],
      examples: [
        'The Wizard of Oz: Witch melts, broomstick obtained',
        'Harry Potter: Philosopher\'s Stone secured, Voldemort thwarted',
        'Star Wars: Death Star plans obtained'
      ]
    },
    {
      id: 'hj-10-road-back',
      number: 10,
      name: 'The Road Back',
      description: 'The hero must return to the Ordinary World. Often involves pursuit or consequences. The adventure isn\'t over yet.',
      pageRange: '80-90',
      percentage: '75-85%',
      questions: [
        'What drives the hero back?',
        'What forces pursue them?',
        'What unfinished business remains?',
        'What consequences follow their actions?'
      ],
      examples: [
        'The Wizard of Oz: Returning to Wizard for the promised reward',
        'Harry Potter: Recovering in hospital wing, year ending',
        'Star Wars: Racing to Rebel base before Death Star arrives'
      ]
    },
    {
      id: 'hj-11-resurrection',
      number: 11,
      name: 'Resurrection',
      description: 'The hero faces one final test using everything learned. A final death-and-rebirth moment. The hero is transformed.',
      pageRange: '90-105',
      percentage: '85-95%',
      questions: [
        'What is the final, ultimate test?',
        'How does the hero use everything they\'ve learned?',
        'What final transformation occurs?',
        'How do they prove they\'ve changed?'
      ],
      examples: [
        'The Wizard of Oz: Revealing the Wizard\'s deception, finding own power',
        'Harry Potter: Sacrifice protection from mother\'s love defeats Voldemort',
        'Star Wars: Luke trusts Force, makes impossible shot'
      ]
    },
    {
      id: 'hj-12-return-with-elixir',
      number: 12,
      name: 'Return with the Elixir',
      description: 'The hero returns home transformed, bringing something (knowledge, treasure, wisdom) that benefits the Ordinary World.',
      pageRange: '105-110',
      percentage: '95-100%',
      questions: [
        'What does the hero bring back?',
        'How has the hero changed?',
        'How does the Ordinary World benefit?',
        'What wisdom can the hero now share?'
      ],
      examples: [
        'The Wizard of Oz: "There\'s no place like home" - appreciates what she had',
        'Harry Potter: Returns to Dursleys knowing his true identity and worth',
        'Star Wars: Luke is a hero, part of Rebel Alliance, found his purpose'
      ]
    }
  ],
  usage: 'Best for mythic journeys, fantasy, science fiction, coming-of-age stories, and character transformation arcs',
  strengths: [
    'Universal mythological pattern',
    'Strong character arc focus',
    'Works across all cultures and time periods',
    'Emphasizes transformation',
    'Archetypes provide clear character roles'
  ],
  commonGenres: ['Fantasy', 'Science Fiction', 'Adventure', 'Coming-of-Age', 'Epic']
};

/**
 * Dan Harmon Story Circle
 * 8-step simplified Hero's Journey, designed as a circle
 */
export const storyCircle: BeatSheetStructure = {
  id: 'story-circle',
  name: 'Dan Harmon Story Circle',
  description: 'Simplified Hero\'s Journey in 8 steps, visualized as a circle from comfort to unknown and back',
  creator: 'Dan Harmon',
  totalBeats: 8,
  estimatedPageCount: 110,
  beats: [
    {
      id: 'sc-01-you',
      number: 1,
      name: 'You',
      description: 'A character is in a zone of comfort. Establish the hero in their ordinary world.',
      pageRange: '1-14',
      percentage: '0-12%',
      questions: [
        'Who is the protagonist?',
        'What is their comfortable status quo?',
        'What is their routine?',
        'What do they believe about themselves and their world?'
      ],
      examples: [
        'Rick and Morty: Morty\'s normal school day',
        'Community: Jeff\'s comfortable life as a lawyer (before)',
        'Breaking Bad: Walter\'s mundane life as chemistry teacher'
      ]
    },
    {
      id: 'sc-02-need',
      number: 2,
      name: 'Need',
      description: 'But they want something. The hero desires something or recognizes a lack.',
      pageRange: '14-27',
      percentage: '12-25%',
      questions: [
        'What does the hero want?',
        'What is missing from their life?',
        'What desire motivates them?',
        'What do they think will make them happy?'
      ],
      examples: [
        'Rick and Morty: Morty wants to impress Jessica',
        'Community: Jeff wants to get close to Britta',
        'Breaking Bad: Walter wants to provide for his family'
      ]
    },
    {
      id: 'sc-03-go',
      number: 3,
      name: 'Go',
      description: 'They enter an unfamiliar situation. The hero crosses the threshold into a new world or situation.',
      pageRange: '27-41',
      percentage: '25-37%',
      questions: [
        'What event propels the hero forward?',
        'What unfamiliar situation do they enter?',
        'What threshold do they cross?',
        'How does their world change?'
      ],
      examples: [
        'Rick and Morty: Gets pulled into Rick\'s crazy adventure',
        'Community: Jeff enters study group',
        'Breaking Bad: Walter enters the criminal underworld'
      ]
    },
    {
      id: 'sc-04-search',
      number: 4,
      name: 'Search',
      description: 'They adapt to the new situation. The hero pursues their goal, facing challenges.',
      pageRange: '41-55',
      percentage: '37-50%',
      questions: [
        'How does the hero pursue their goal?',
        'What obstacles do they encounter?',
        'Who do they meet?',
        'What do they learn about this new world?'
      ],
      examples: [
        'Rick and Morty: Navigating alien worlds, solving problems',
        'Community: Navigating group dynamics, classes',
        'Breaking Bad: Learning the drug trade, adapting to violence'
      ]
    },
    {
      id: 'sc-05-find',
      number: 5,
      name: 'Find',
      description: 'They get what they wanted. The hero achieves their goal or desire.',
      pageRange: '55-68',
      percentage: '50-62%',
      questions: [
        'Does the hero achieve their desire?',
        'What do they find or obtain?',
        'What does success look like?',
        'Is this what they expected?'
      ],
      examples: [
        'Rick and Morty: Solves the problem, impresses Jessica',
        'Community: Gets close to Britta/group accepts him',
        'Breaking Bad: Makes money, becomes powerful'
      ]
    },
    {
      id: 'sc-06-take',
      number: 6,
      name: 'Take',
      description: 'They pay a heavy price for it. Getting what they wanted comes at a cost.',
      pageRange: '68-82',
      percentage: '62-75%',
      questions: [
        'What is the cost of success?',
        'What do they lose or sacrifice?',
        'What goes wrong?',
        'What unexpected consequences arise?'
      ],
      examples: [
        'Rick and Morty: Reality falls apart, relationships damaged',
        'Community: Realizes he\'s become vulnerable, exposed',
        'Breaking Bad: Family relationships destroyed, violence escalates'
      ]
    },
    {
      id: 'sc-07-return',
      number: 7,
      name: 'Return',
      description: 'They return to their familiar situation. The hero goes back to where they started.',
      pageRange: '82-96',
      percentage: '75-87%',
      questions: [
        'How does the hero return to the ordinary world?',
        'What do they bring back?',
        'How is the return different from the departure?',
        'What has been lost or gained?'
      ],
      examples: [
        'Rick and Morty: Back home, reality restored (mostly)',
        'Community: Returns to being a student, but changed',
        'Breaking Bad: Tries to return to family life'
      ]
    },
    {
      id: 'sc-08-change',
      number: 8,
      name: 'Change',
      description: 'Having changed. The hero is different because of the journey.',
      pageRange: '96-110',
      percentage: '87-100%',
      questions: [
        'How has the hero changed?',
        'What have they learned?',
        'What do they now understand?',
        'How is their status quo different from the beginning?'
      ],
      examples: [
        'Rick and Morty: Morty grows more confident/damaged each episode',
        'Community: Jeff learns value of community over self-interest',
        'Breaking Bad: Walter fully transforms into Heisenberg'
      ]
    }
  ],
  usage: 'Excellent for episodic TV, short stories, video games, and any repeatable story structure',
  strengths: [
    'Simple and easy to remember (just 8 beats)',
    'Visual circular structure is intuitive',
    'Works for any length (episode, film, novel)',
    'Perfect for episodic content',
    'Emphasizes character change',
    'Very flexible and adaptable'
  ],
  commonGenres: ['TV Series', 'Comedy', 'Drama', 'Animation', 'Video Games']
};

/**
 * John Truby 22-Step Story Structure
 * Comprehensive anatomy of story from "The Anatomy of Story"
 */
export const truby22Step: BeatSheetStructure = {
  id: 'truby-22-step',
  name: 'John Truby 22-Step',
  description: 'Comprehensive story structure from "The Anatomy of Story" focusing on organic character-driven narratives',
  creator: 'John Truby',
  totalBeats: 22,
  estimatedPageCount: 120,
  beats: [
    {
      id: 'truby-01-self-revelation',
      number: 1,
      name: 'Self-Revelation, Need, and Desire',
      description: 'What the hero learns about themselves by the end (work backwards from this). What psychological and moral need must they fulfill? What goal do they consciously desire?',
      pageRange: 'Throughout',
      percentage: 'Thematic',
      questions: [
        'What does the hero learn about themselves by the end?',
        'What psychological need drives them?',
        'What is their conscious desire/goal?',
        'What is the gap between what they want and what they need?'
      ],
      examples: []
    },
    {
      id: 'truby-02-ghost',
      number: 2,
      name: 'Ghost and Story World',
      description: 'An event from the past that haunts the hero and affects their current life. The story world reflects the hero\'s state of mind.',
      pageRange: '1-15',
      percentage: '0-12%',
      questions: [
        'What past event haunts the hero?',
        'How does this ghost shape who they are?',
        'What world does the hero inhabit?',
        'How does the world reflect their inner state?'
      ],
      examples: [
        'The Sixth Sense: Cole\'s encounter with ghosts',
        'Batman: Parents\' murder',
        'Vertigo: Scottie\'s fear of heights from failed rescue'
      ]
    },
    {
      id: 'truby-03-weakness-need',
      number: 3,
      name: 'Weakness and Need',
      description: 'Show the hero\'s psychological and moral weakness. This creates the need that will drive the story arc.',
      pageRange: '1-15',
      percentage: '0-12%',
      questions: [
        'What is the hero\'s fatal flaw?',
        'What moral weakness do they have?',
        'What do they need to overcome?',
        'How does this weakness affect relationships?'
      ],
      examples: [
        'The Godfather: Michael\'s belief he can stay out of family business',
        'A Christmas Carol: Scrooge\'s greed and isolation',
        'Tootsie: Michael\'s chauvinism and manipulation'
      ]
    },
    {
      id: 'truby-04-inciting-event',
      number: 4,
      name: 'Inciting Event',
      description: 'The event that starts the hero on their journey. Someone or something disrupts the status quo.',
      pageRange: '15-18',
      percentage: '12-15%',
      questions: [
        'What event disrupts the hero\'s life?',
        'Who or what initiates the action?',
        'What opportunity or problem presents itself?',
        'How is the status quo broken?'
      ],
      examples: [
        'Star Wars: Discovering Leia\'s message',
        'Jaws: Shark attacks swimmer',
        'Die Hard: Terrorists take hostage'
      ]
    },
    {
      id: 'truby-05-desire',
      number: 5,
      name: 'Desire',
      description: 'The hero\'s goal - what they consciously want to achieve. This drives the plot forward.',
      pageRange: '18-25',
      percentage: '15-20%',
      questions: [
        'What specific goal does the hero pursue?',
        'Why do they want this?',
        'What will achieving this goal mean to them?',
        'Is this what they truly need?'
      ],
      examples: [
        'The Wizard of Oz: Get back to Kansas',
        'Finding Nemo: Find Nemo',
        'Casablanca: Get exit visas'
      ]
    },
    {
      id: 'truby-06-ally',
      number: 6,
      name: 'Ally or Allies',
      description: 'The hero gains a companion who helps them pursue their goal and often represents an alternative approach.',
      pageRange: '25-30',
      percentage: '20-25%',
      questions: [
        'Who helps the hero?',
        'What does the ally provide (skills, knowledge, support)?',
        'How is the ally similar to or different from the hero?',
        'What do they learn from each other?'
      ],
      examples: [
        'Star Wars: Han Solo, Obi-Wan',
        'The Lord of the Rings: Fellowship members',
        'Lethal Weapon: Riggs and Murtaugh partnership'
      ]
    },
    {
      id: 'truby-07-opponent',
      number: 7,
      name: 'Opponent and/or Mystery',
      description: 'The main antagonist who wants the same goal as the hero or wants to stop the hero. Should be the best opponent for forcing the hero to change.',
      pageRange: '25-35',
      percentage: '20-30%',
      questions: [
        'Who is the main opponent?',
        'What do they want?',
        'Why are they the perfect opponent for this hero?',
        'What makes them a worthy challenge?',
        'What values do they represent?'
      ],
      examples: [
        'Star Wars: Darth Vader (power vs. spirituality)',
        'The Dark Knight: Joker (chaos vs. order)',
        'The Silence of the Lambs: Hannibal and Buffalo Bill'
      ]
    },
    {
      id: 'truby-08-fake-ally-opponent',
      number: 8,
      name: 'Fake-Ally Opponent',
      description: 'Someone who appears to be an ally but is actually an opponent, or vice versa. Creates surprise and forces hero to see clearly.',
      pageRange: '30-60',
      percentage: '25-50%',
      questions: [
        'Who isn\'t what they seem?',
        'When is their true nature revealed?',
        'How does this betrayal/revelation affect the hero?',
        'What does the hero learn from being deceived?'
      ],
      examples: [
        'The Sixth Sense: Malcolm is dead',
        'The Usual Suspects: Verbal Kint is Keyser Söze',
        'Harry Potter: Snape (appears enemy, actually protects Harry)'
      ]
    },
    {
      id: 'truby-09-first-revelation',
      number: 9,
      name: 'First Revelation and Decision',
      description: 'The hero learns important information about opponents, allies, or themselves. Makes a new decision about strategy.',
      pageRange: '35-45',
      percentage: '30-40%',
      questions: [
        'What new information does the hero learn?',
        'How does this change their understanding?',
        'What decision do they make based on this?',
        'How does their strategy shift?'
      ],
      examples: []
    },
    {
      id: 'truby-10-plan',
      number: 10,
      name: 'Plan',
      description: 'The hero devises a strategy to overcome the opponent and achieve their desire.',
      pageRange: '45-55',
      percentage: '40-45%',
      questions: [
        'What is the hero\'s strategy?',
        'How will they achieve their goal?',
        'What resources do they gather?',
        'What\'s their approach?'
      ],
      examples: [
        'Ocean\'s Eleven: Detailed heist plan',
        'The Sting: Elaborate con strategy',
        'Mission Impossible: Each mission plan'
      ]
    },
    {
      id: 'truby-11-opponent-plan',
      number: 11,
      name: 'Opponent\'s Plan',
      description: 'Reveal the opponent\'s counterplan, showing they are a formidable challenge.',
      pageRange: '45-55',
      percentage: '40-50%',
      questions: [
        'What is the opponent\'s strategy?',
        'How do they counter the hero?',
        'What makes them a worthy adversary?',
        'What are their strengths?'
      ],
      examples: []
    },
    {
      id: 'truby-12-drive',
      number: 12,
      name: 'Drive',
      description: 'The hero executes their plan. A series of actions, complications, and obstacles as hero and opponent maneuver.',
      pageRange: '55-75',
      percentage: '45-65%',
      questions: [
        'How does the hero pursue their goal?',
        'What obstacles arise?',
        'How do they adapt their plan?',
        'What complications occur?'
      ],
      examples: []
    },
    {
      id: 'truby-13-attack-counterattack',
      number: 13,
      name: 'Attack by Ally',
      description: 'An ally criticizes the hero, usually for moral weaknesses. This attack comes from love and forces self-examination.',
      pageRange: '55-70',
      percentage: '45-60%',
      questions: [
        'How does an ally confront the hero?',
        'What moral weakness is exposed?',
        'Why does this attack come from care?',
        'How does the hero react?'
      ],
      examples: [
        'As Good As It Gets: Carol challenges Melvin\'s behavior',
        'Jerry Maguire: Dorothy calls out Jerry\'s shallowness'
      ]
    },
    {
      id: 'truby-14-apparent-defeat',
      number: 14,
      name: 'Apparent Defeat',
      description: 'The hero\'s plan appears to fail. This is often the lowest point, where all seems lost.',
      pageRange: '70-80',
      percentage: '60-70%',
      questions: [
        'What is the hero\'s lowest moment?',
        'How does the plan fail?',
        'What loss occurs?',
        'Why does success seem impossible?'
      ],
      examples: [
        'Star Wars: Obi-Wan dies, seems hopeless',
        'The Empire Strikes Back: Han frozen, Luke loses hand',
        'Rocky: Gets beaten badly in early rounds'
      ]
    },
    {
      id: 'truby-15-second-revelation',
      number: 15,
      name: 'Second Revelation and Decision',
      description: 'The hero learns a crucial piece of information (often about themselves) that leads to a breakthrough.',
      pageRange: '75-85',
      percentage: '65-75%',
      questions: [
        'What crucial truth does the hero realize?',
        'What do they understand now that they didn\'t before?',
        'How does this change everything?',
        'What new approach does this reveal?'
      ],
      examples: [
        'The Sixth Sense: Cole learns to help ghosts',
        'The Matrix: Neo learns he is The One',
        'Tootsie: Michael realizes he\'s become a better man as Dorothy'
      ]
    },
    {
      id: 'truby-16-audience-revelation',
      number: 16,
      name: 'Audience Revelation',
      description: 'The audience learns a crucial piece of information that the hero may or may not know yet. Changes how we see the story.',
      pageRange: 'Variable',
      percentage: 'Variable',
      questions: [
        'What does the audience discover?',
        'How does this recontextualize the story?',
        'Does the hero know this yet?',
        'How does this create dramatic irony or surprise?'
      ],
      examples: [
        'The Sixth Sense: Malcolm is dead',
        'Fight Club: Tyler is the narrator',
        'Planet of the Apes: It was Earth all along'
      ]
    },
    {
      id: 'truby-17-third-revelation',
      number: 17,
      name: 'Third Revelation and Decision',
      description: 'Additional revelation that provides final piece of puzzle or understanding needed for resolution.',
      pageRange: '80-90',
      percentage: '70-80%',
      questions: [
        'What final understanding emerges?',
        'What last piece of the puzzle appears?',
        'How does this complete the hero\'s transformation?'
      ],
      examples: []
    },
    {
      id: 'truby-18-gate-gauntlet',
      number: 18,
      name: 'Gate, Gauntlet, Visit to Death',
      description: 'The hero must pass through a final barrier or face a symbolic death before the final battle. A point of no return.',
      pageRange: '85-90',
      percentage: '75-80%',
      questions: [
        'What final barrier must the hero cross?',
        'What symbolic death do they face?',
        'What must they sacrifice?',
        'What is the point of no return?'
      ],
      examples: [
        'Star Wars: Luke turns off targeting computer (abandons logic for faith)',
        'The Lord of the Rings: Frodo at Mount Doom',
        'The Matrix: Neo allows Agent Smith to kill him'
      ]
    },
    {
      id: 'truby-19-battle',
      number: 19,
      name: 'Battle',
      description: 'The final confrontation between hero and opponent. All the story lines, values, and strategies collide.',
      pageRange: '90-105',
      percentage: '80-90%',
      questions: [
        'What is the final confrontation?',
        'How do all story threads converge?',
        'What values clash in this battle?',
        'How does the hero use what they\'ve learned?'
      ],
      examples: [
        'Star Wars: Trench run, destroying Death Star',
        'The Silence of the Lambs: Confronting Buffalo Bill',
        'Casablanca: Airport scene'
      ]
    },
    {
      id: 'truby-20-self-revelation',
      number: 20,
      name: 'Self-Revelation',
      description: 'The hero realizes their truth, sees their flaw, and understands what they truly need. The moral and psychological climax.',
      pageRange: '100-110',
      percentage: '85-95%',
      questions: [
        'What does the hero finally understand about themselves?',
        'What flaw do they recognize?',
        'What truth do they accept?',
        'How have they changed?'
      ],
      examples: [
        'Tootsie: Michael realizes he was a better man as a woman',
        'Groundhog Day: Phil learns selflessness',
        'Citizen Kane: Rosebud revealed (lost innocence)'
      ]
    },
    {
      id: 'truby-21-moral-decision',
      number: 21,
      name: 'Moral Decision',
      description: 'The hero makes a choice that proves their character growth. Shows they\'ve learned the moral lesson.',
      pageRange: '105-110',
      percentage: '90-95%',
      questions: [
        'What choice proves the hero has changed?',
        'What do they do differently than before?',
        'What sacrifice or right action do they take?',
        'How does this choice reflect their growth?'
      ],
      examples: [
        'Schindler\'s List: Schindler uses wealth to save lives',
        'Casablanca: Rick helps Ilsa and Victor escape',
        'The Shawshank Redemption: Red chooses hope'
      ]
    },
    {
      id: 'truby-22-new-equilibrium',
      number: 22,
      name: 'New Equilibrium',
      description: 'Show the hero living in a new way, in a new world, having integrated what they\'ve learned. The "after" picture.',
      pageRange: '110-120',
      percentage: '95-100%',
      questions: [
        'What is the new status quo?',
        'How has the hero\'s world changed?',
        'How do they live differently now?',
        'What is the lasting impact of their transformation?'
      ],
      examples: [
        'It\'s a Wonderful Life: George sees value of his life',
        'The Verdict: Frank Galvin redeems himself',
        'The Godfather: Michael becomes the Godfather'
      ]
    }
  ],
  usage: 'Best for complex character-driven dramas, literary fiction, and stories requiring deep psychological development',
  strengths: [
    'Most comprehensive and detailed structure',
    'Focuses on organic character development',
    'Emphasizes moral and psychological dimensions',
    'Multiple revelation beats create complexity',
    'Works for sophisticated, layered narratives',
    'Strong emphasis on need vs. desire'
  ],
  commonGenres: ['Drama', 'Literary Fiction', 'Character Studies', 'Psychological Thriller', 'Art House']
};

/**
 * All beat sheet structures in a single exportable array
 */
export const allBeatSheetStructures: BeatSheetStructure[] = [
  saveTheCat,
  herosJourney,
  storyCircle,
  truby22Step
];

/**
 * Get beat sheet by ID
 */
export function getBeatSheetById(id: string): BeatSheetStructure | undefined {
  return allBeatSheetStructures.find(structure => structure.id === id);
}

/**
 * Get beat sheets by genre
 */
export function getBeatSheetsByGenre(genre: string): BeatSheetStructure[] {
  return allBeatSheetStructures.filter(structure =>
    structure.commonGenres.some(g => g.toLowerCase().includes(genre.toLowerCase()))
  );
}
