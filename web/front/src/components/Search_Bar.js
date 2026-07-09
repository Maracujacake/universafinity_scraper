import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ onSearch, nodeList = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const normalizedTerm = searchTerm.toLowerCase();
      const matches = nodeList
        .filter((author) =>
          author.label.toLowerCase().includes(normalizedTerm) ||
          author.id.toLowerCase().includes(normalizedTerm)
        )
        .slice(0, 5); // mostrar no máximo 5 sugestões

      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }, [searchTerm, nodeList]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      const exactMatch = nodeList.find((author) =>
        author.label.toLowerCase() === searchTerm.trim().toLowerCase() ||
        author.id.toLowerCase() === searchTerm.trim().toLowerCase()
      );

      onSearch(exactMatch?.id || searchTerm.trim());
    }
  };

  const handleSuggestionClick = (author) => {
    setSearchTerm(author.label);
    setSuggestions([]);
    onSearch(author.id);
  };

  return (
    <div className="relative w-full flex justify-center my-6 px-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-2xl items-center bg-white border border-gray-300 rounded-xl shadow-md px-4 py-2 focus-within:ring-2 focus-within:ring-blue-400 transition"
      >
        <input
          type="text"
          placeholder="Busque um autor ou docente"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-black outline-none text-base placeholder-gray-500"
        />
        <button
          type="submit"
          className="ml-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white transition hover:bg-blue-700"
          title="Buscar autor"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>

      {suggestions.length > 0 && (
        <ul className="absolute top-full mt-1 w-full max-w-2xl bg-white border border-gray-300 rounded-lg shadow-md z-10 overflow-hidden">
          {suggestions.map((author) => (
            <li
              key={author.id}
              onClick={() => handleSuggestionClick(author)}
              className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-black"
            >
              <div className="flex items-center justify-between gap-3">
                <span>{author.label}</span>
                {author.dc_ufscar && (
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    DC
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
