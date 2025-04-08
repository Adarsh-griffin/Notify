import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaMicrophone, FaTrash, FaPlus, FaSearch, FaSort, FaBars,
  FaArchive, FaTrashAlt, FaLightbulb, FaSignOutAlt, FaEdit
} from "react-icons/fa";
import { HiArchiveBoxArrowDown } from "react-icons/hi2";
import axios from "axios";
import ImageToText from "../Components/ImageToText";
import { debounce } from "lodash";

const colors = [
  "bg-[#ffe666] text-black", "bg-[#f5c27d] text-black",
  "bg-[#f6cebf] text-black", "bg-[#e3b7d2] text-black", "bg-[#bfe7f6] text-black"
];

function Dashboard() {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const noteInputRef = useRef(null);

  const [search, setSearch] = useState("");
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [sortBy, setSortBy] = useState("date");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [view, setView] = useState("notes");
  const [recording, setRecording] = useState(false);
  const [archive, setArchive] = useState([]);
  const [trash, setTrash] = useState([]);
  const [editingNote, setEditingNote] = useState(null);
  const [editedContent, setEditedContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const getLocalStorageData = (key) => {
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
      } catch (error) {
        console.error(`Error parsing ${key} from localStorage`, error);
        return [];
      }
    };

    setNotes(getLocalStorageData("notes"));
    setArchive(getLocalStorageData("archive"));
    setTrash(getLocalStorageData("trash"));
  }, []);

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5001/api/notes/all", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        setNotes(response.data);
      }
    } catch (error) {
      console.error("Error fetching notes:", error.response?.data || error.message);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    localStorage.setItem("notes", JSON.stringify(notes));
    localStorage.setItem("archive", JSON.stringify(archive));
    localStorage.setItem("trash", JSON.stringify(trash));
  }, [notes, archive, trash]);

  const logout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const addNote = async () => {
    if (newTitle.trim() !== "" && newNote.trim() !== "") {
      try {
        const token = localStorage.getItem("token");
        const color = colors[Math.floor(Math.random() * colors.length)];

        const response = await axios.post(
          "http://localhost:5001/api/notes",
          { title: newTitle, content: newNote, color },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 200 || response.status === 201) {
          setNotes([...notes, {
            id: response.data.note.id,
            title: response.data.note.title,
            text: response.data.note.content,
            date: new Date(),
            color,
          }]);
          setNewTitle("");
          setNewNote("");
          fetchNotes();
        }
      } catch (error) {
        console.error("Error adding note:", error.response?.data || error.message);
      }
    }
  };

  const deleteNote = async (id) => {
    try {
      const token = localStorage.getItem("token");

      await axios.delete(`http://localhost:5001/api/notes/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
      });
      fetchNotes();

      setNotes(notes.filter((note) => note.id !== id));
    } catch (error) {
      console.error("Error deleting note:", error.response?.data || error.message);
    }
  };

  const archiveNote = async (id) => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `http://localhost:5001/api/notes/archive/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const archivedNote = notes.find((note) => note.id === id);
      setNotes(notes.filter((note) => note.id !== id));
      setArchive([...archive, archivedNote]);
    } catch (error) {
      console.error("Error archiving note:", error.response?.data || error.message);
    }
  };

  const startEditing = (note) => {
    if (!note || !note._id) {
      console.error("Invalid note object:", note);
      return;
    }

    setEditingNote(note._id);
    setEditedContent(note.content);
    setEditedTitle(note.title);
  };

  const saveEditedNote = async (id) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.put(
        `http://localhost:5001/api/notes/${id}`,
        { content: editedContent, title: editedTitle },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.status === 200) {
        setNotes(notes.map((note) =>
          note._id === id ? response.data.note : note
        ));
        setEditingNote(null);
        setEditedContent("");
        setEditedTitle("");
      }
    } catch (error) {
      console.error("Error updating note:", error.response?.data || error.message);
    }
  };

  const startRecording = () => {
    setRecording(true);
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.start();
    recognition.onresult = (event) => {
      setNewNote(event.results[0][0].transcript);
      setRecording(false);
    };
    recognition.onerror = () => setRecording(false);
  };

  const debouncedSearch = useRef(
    debounce(async (query) => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`http://localhost:5001/api/notes/search?query=${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFilteredNotes(response.data);
      } catch (error) {
        console.error("Search error:", error.response?.data || error.message);
      }
    }, 500)
  ).current;

  useEffect(() => {
    if (!search.trim()) {
      setFilteredNotes(notes);
      return;
    }
    debouncedSearch(search);
  }, [search]);

  useEffect(() => {
    setFilteredNotes(notes);
  }, [notes]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, []);

  useEffect(() => {
    let updatedNotes = [...filteredNotes];

    updatedNotes.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return a.content.localeCompare(b.content);
    });

    setFilteredNotes(updatedNotes);
  }, [sortBy]);

  const handleViewChange = (newView) => {
    setView(newView);
    if (window.innerWidth < 768) {
      setSidebarVisible(false);
    }
  };

  const displayedNotes = view === "notes" ? filteredNotes : view === "archive" ? archive : trash;

  return (
    <div className="h-screen flex bg-gray-300 text-black">
      {/* Sidebar */}
      {sidebarVisible && (
        <aside className="fixed md:relative z-50 w-64 bg-gray-300 p-4 shadow-md h-full flex flex-col">
          <nav className="space-y-6 pt-5 text-black text-lg flex-grow">
            <a className="flex items-center space-x-4 cursor-pointer hover:text-[#222222]" onClick={() => handleViewChange("notes")}>
              <FaLightbulb className="text-xl" />
              <span>Notes</span>
            </a>
            <a className="flex items-center space-x-4 cursor-pointer hover:text-[#222222]" onClick={() => handleViewChange("archive")}>
              <FaArchive className="text-xl" />
              <span>Archive</span>
            </a>
            <a className="flex items-center space-x-4 cursor-pointer hover:text-[#222222]" onClick={() => handleViewChange("trash")}>
              <FaTrashAlt className="text-xl" />
              <span>Trash</span>
            </a>
          </nav>
          <div className="mt-auto pb-10">
            <ImageToText />
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-0 md:ml-0">
        <header className="flex items-center justify-between bg-gray-300 p-3 shadow-md px-4 w-full">
          <div className="flex items-center space-x-4">
            <FaBars className="text-[#222222] cursor-pointer text-xl" onClick={() => setSidebarVisible(!sidebarVisible)} />
            <h1 className="text-lg md:text-xl font-semibold text-[#222222]">Notify</h1>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              className="bg-gray-200 rounded-full py-1 px-3 w-24 md:w-auto focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <FaSearch className="text-[#222222] text-xl" />
            <FaSort className="text-[#222222] text-xl" onClick={() => setSortBy(sortBy === "date" ? "content" : "date")} />
            <button onClick={logout} className="text-red-600 hover:text-red-800 text-xl">
              <FaSignOutAlt />
            </button>
          </div>
        </header>

        {/* Input Area */}
        <main className="flex-1 p-3 md:p-6 overflow-y-auto">
          <div className="bg-white p-3 rounded-lg shadow-md mb-4 flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Title"
              className="text-red-600 font-bold text-lg md:text-2xl bg-transparent focus:outline-none flex-1 min-w-[100px]"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") noteInputRef.current.focus();
              }}
            />
            <input
              type="text"
              placeholder="Take a note..."
              className="flex-1 text-base md:text-xl bg-transparent focus:outline-none min-w-[150px]"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addNote()}
              ref={noteInputRef}
            />
            <FaMicrophone
              className={`cursor-pointer text-xl ${recording ? "text-red-600" : "text-[#222222]"}`}
              onClick={startRecording}
            />
            <button onClick={addNote}>
              <FaPlus className="text-[#222222] text-xl" />
            </button>
          </div>

          {/* Notes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedNotes.length > 0 ? (
              displayedNotes.map((note) => (
                <div key={note._id} className="p-3 rounded-xl shadow-md text-sm sm:text-base" style={{ backgroundColor: note.color || "#ffffff", color: "#000000" }}>
                  {editingNote === note._id ? (
                    <>
                      <input type="text" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="w-full bg-gray-200 p-1 font-bold rounded" />
                      <input type="text" value={editedContent} onChange={(e) => setEditedContent(e.target.value)} className="w-full bg-gray-200 p-1 mt-1 rounded" />
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold text-lg">{note.title}</h3>
                      <p className="break-words">{note.content}</p>
                    </>
                  )}
                  <div className="flex items-center mt-2 space-x-2">
                    {editingNote === note._id ? (
                      <button onClick={() => saveEditedNote(note._id)} className="text-green-600 text-xl">✅</button>
                    ) : (
                      <button onClick={() => startEditing(note)} className="text-xl"><FaEdit /></button>
                    )}
                    <button onClick={() => deleteNote(note._id)} className="text-xl"><FaTrash /></button>
                    <button onClick={() => archiveNote(note._id)} className="text-xl"><HiArchiveBoxArrowDown /></button>
                  </div>
                  <small className="block mt-1 text-gray-700">{new Date(note.createdAt).toLocaleString()}</small>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-600 col-span-3">No notes available</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
