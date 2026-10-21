/* ------------------------------------------------------------------
   Set these once. After that, everything else is managed in the
   Google Sheet (see README.md), so nobody needs to touch code again.
------------------------------------------------------------------- */
window.SCRAPBOOK_CONFIG = {
  name: "Cynthia J. Smith",
  lifespan: "[birth year] – 1988",                 // edit me
  tagline: "Pan Am Flight 103 · December 21, 1988",
  dedication: "[A line from her family or friends goes here.]",
  portrait: "",        // optional: path or URL of a portrait photo, e.g. "photos/cynthia.jpg"

  // Paste the "Published to web" CSV link of the Google Sheet here:
  sheetCsvUrl: "",
  // Paste the public link of the Google Form here:
  formUrl: ""
};

/* Sample pages, shown only while sheetCsvUrl is empty (or can't be reached).
   Everything below is placeholder text. Replace or delete it. */
window.SCRAPBOOK_ITEMS = [
  { type: "photo",  title: "[Sample] A favorite photo",
    description: "Replace this with a few sentences about the photo: where it was taken, who is in it, why it matters.\n\nA second paragraph works too." ,
    name: "The family", year: "[year]" },
  { type: "quote",  title: "A sentence she said that people still repeat.",
    description: "Say when she said it, or what it meant to the people who heard it.", name: "A friend", relationship: "Friend" },
  { type: "memory", title: "[Sample] The time we…",
    description: "Memories can be as long as people want to write. They are shown in full when someone selects the card.",
    name: "A classmate", relationship: "Classmate", year: "[year]" },
  { type: "photo",  title: "[Sample] On the road", description: "Another photo placeholder.", name: "A friend" },
  { type: "quote",  title: "Another line, from a letter or a card.", description: "Where it comes from.", name: "Her family" },
  { type: "memory", title: "[Sample] What she was like", description: "A short description of her laugh, her habits, her favorite things.", name: "A roommate", relationship: "Roommate" }
];
