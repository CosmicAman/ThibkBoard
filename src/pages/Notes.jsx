import { useState, useEffect } from 'react';
import { useNotes } from '../context/NotesContext';
import { useAuth } from '../context/AuthContext';
import './Notes.css';

const Notes = () => {
  const { notes, loading, error, createNote, updateNote, deleteNote, togglePin } = useNotes();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: [],
    pinned: false
  });
  const [tagInput, setTagInput] = useState('');
  const [filteredNotes, setFilteredNotes] = useState([]);

  // Get all unique tags
  const allTags = ['all', ...new Set(notes.flatMap(note => note.tags || []))];

  // Filter notes based on search and selected tag
  useEffect(() => {
    const filtered = notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          note.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesTag = selectedTag === 'all' || (note.tags && note.tags.includes(selectedTag));
      return matchesSearch && matchesTag;
    });
    setFilteredNotes(filtered);
  }, [notes, searchTerm, selectedTag]);

  const handleCreateNote = () => {
    setIsCreating(true);
    setEditingNote(null);
    setFormData({
      title: '',
      content: '',
      tags: [],
      pinned: false
    });
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setIsCreating(true);
    setFormData({
      title: note.title,
      content: note.content,
      tags: note.tags || [],
      pinned: note.pinned || false
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const noteData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        tags: formData.tags,
        pinned: formData.pinned,
        updatedAt: new Date()
      };

      if (editingNote) {
        await updateNote(editingNote.id, noteData);
      } else {
        await createNote(noteData);
      }
      setIsCreating(false);
      setEditingNote(null);
      setFormData({
        title: '',
        content: '',
        tags: [],
        pinned: false
      });
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note: ' + error.message);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handlePinNote = async (noteId) => {
    try {
      await togglePin(noteId);
    } catch (error) {
      console.error('Error pinning note:', error);
      alert('Failed to pin note: ' + error.message);
    }
  };

  return (
    <div className="notes-page">
      <div className="notes-container">
        <div className="notes-header">
          <div className="notes-header-left">
            <h1>My Notes</h1>
            <div className="notes-search-bar">
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <button className="notes-create-btn" onClick={handleCreateNote}>
            Create New Note
          </button>
        </div>

        <div className="notes-tags-filter">
          {allTags.map(tag => (
            <button
              key={tag}
              className={`notes-tag-btn ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        {isCreating && (
          <div className="notes-form-container">
            <form className="notes-form" onSubmit={handleSubmit}>
              <div className="notes-form-group">
                <input
                  type="text"
                  placeholder="Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="notes-form-group">
                <textarea
                  placeholder="Content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                />
              </div>
              <div className="notes-tags-input">
                <input
                  type="text"
                  placeholder="Add tags..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                />
                <button type="button" onClick={handleAddTag}>Add</button>
              </div>
              <div className="notes-tags-list">
                {formData.tags.map(tag => (
                  <span key={tag} className="notes-tag">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)}>×</button>
                  </span>
                ))}
              </div>
              <div className="notes-form-group notes-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.pinned}
                    onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                  />
                  Pin this note
                </label>
              </div>
              <div className="notes-form-actions">
                <button type="submit" className="notes-save-btn">
                  {editingNote ? 'Update' : 'Save'}
                </button>
                <button
                  type="button"
                  className="notes-cancel-btn"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingNote(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="notes-loading">
            <div className="notes-loading-spinner"></div>
            <p>Loading notes...</p>
          </div>
        ) : error ? (
          <div className="notes-error">
            <p>{error}</p>
            <button className="notes-retry-btn" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        ) : (
          <div className="notes-section">
            <h2>{selectedTag === 'all' ? 'All Notes' : `Notes tagged with "${selectedTag}"`}</h2>
            {filteredNotes.length === 0 ? (
              <div className="notes-empty">
                <p>No notes found. Create a new note to get started!</p>
              </div>
            ) : (
              <div className="notes-grid">
                {filteredNotes.map(note => (
                  <div key={note.id} className={`notes-card ${note.pinned ? 'pinned' : ''}`}>
                    <div className="notes-card-header">
                      <h3>{note.title}</h3>
                      <div className="notes-card-actions">
                        <button
                          className="notes-pin-btn"
                          onClick={() => handlePinNote(note.id)}
                          title={note.pinned ? 'Unpin note' : 'Pin note'}
                        >
                          📌
                        </button>
                        <button
                          className="notes-edit-btn"
                          onClick={() => handleEditNote(note)}
                          title="Edit note"
                        >
                          ✏️
                        </button>
                        <button
                          className="notes-delete-btn"
                          onClick={() => deleteNote(note.id)}
                          title="Delete note"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="notes-card-content">
                      <p>{note.content}</p>
                    </div>
                    <div className="notes-card-tags">
                      {note.tags?.map(tag => (
                        <span key={tag} className="notes-tag">{tag}</span>
                      ))}
                    </div>
                    <div className="notes-card-footer">
                      <span>Last updated: {new Date(note.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notes;