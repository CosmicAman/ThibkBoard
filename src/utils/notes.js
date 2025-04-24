import { useNotes } from '../context/NotesContext';

export const createTestNotes = async () => {
  const { createNote } = useNotes();

  const testNotes = [
    {
      title: "Welcome to ThinkBoard",
      content: "This is your first note. You can edit, delete, or pin it!",
      tags: ["welcome", "getting-started"],
      pinned: true
    },
    {
      title: "Quick Tips",
      content: "Use tags to organize your notes. Pin important notes to keep them at the top.",
      tags: ["tips", "organization"],
      pinned: false
    },
    {
      title: "Meeting Notes",
      content: "Project discussion:\n- Timeline review\n- Resource allocation\n- Next steps",
      tags: ["meeting", "project"],
      pinned: false
    }
  ];

  try {
    for (const note of testNotes) {
      await createNote(note);
      console.log(`Created note: ${note.title}`);
    }
    return true;
  } catch (error) {
    console.error('Error creating test notes:', error);
    return false;
  }
};

export const createSingleNote = async (noteData) => {
  const { createNote } = useNotes();

  try {
    const noteId = await createNote(noteData);
    console.log(`Created note with ID: ${noteId}`);
    return noteId;
  } catch (error) {
    console.error('Error creating note:', error);
    throw error;
  }
}; 