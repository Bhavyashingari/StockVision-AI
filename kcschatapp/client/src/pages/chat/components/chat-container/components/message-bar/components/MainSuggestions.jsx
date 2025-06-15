import React, { useEffect, useState, useRef } from 'react';
import { Avatar, AvatarImage } from '@/components/ui/avatar'; // Assuming this path is correct
import { HOST } from '@/lib/constants';
import { getColor } from '@/lib/utils';

const MentionSuggestions = ({ members, admin, query, onSelectUser, show }) => {
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    if (query && show) {
      const allPotentialUsers = [...members, admin].filter(Boolean);
      const uniqueUsers = Array.from(new Set(allPotentialUsers.map(u => u._id)))
        .map(id => allPotentialUsers.find(u => u._id === id));
      
      const lowerCaseQuery = query.toLowerCase();
      const suggestions = uniqueUsers.filter(user =>
        (user.firstName && user.firstName.toLowerCase().startsWith(lowerCaseQuery)) ||
        (user.lastName && user.lastName.toLowerCase().startsWith(lowerCaseQuery)) ||
        ((user.firstName && user.lastName) && `${user.firstName} ${user.lastName}`.toLowerCase().startsWith(lowerCaseQuery))
      ).slice(0, 5); // Limit to 5 suggestions for now
      setFilteredUsers(suggestions);
      setActiveIndex(0); // Reset active index when query changes
    } else {
      setFilteredUsers([]);
    }
  }, [query, members, admin, show]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!show || filteredUsers.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filteredUsers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredUsers[activeIndex]) {
          onSelectUser(filteredUsers[activeIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // This should ideally be handled by MessageBar to hide suggestions
      }
    };

    // Attach to window to capture events even if input is focused
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeIndex, filteredUsers, onSelectUser, show]);


  // Scroll active item into view
  useEffect(() => {
    if (suggestionsRef.current && suggestionsRef.current.children[activeIndex]) {
      suggestionsRef.current.children[activeIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeIndex]);


  if (!show || filteredUsers.length === 0) {
    return null;
  }

  return (
    <div 
      ref={suggestionsRef}
      className="absolute bottom-full mb-2 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg bg-[#2c2d37] border border-[#3f404b] rounded-lg shadow-xl overflow-y-auto max-h-60 z-50"
      style={{ left: 0, right: 0, margin: 'auto' }} // Center it if MessageBar is full width
    >
      {filteredUsers.map((user, index) => (
        <div
          key={user._id}
          className={`flex items-center p-3 cursor-pointer hover:bg-[#3a3b45] ${index === activeIndex ? 'bg-[#3a3b45]' : ''}`}
          onClick={() => onSelectUser(user)}
          onMouseEnter={() => setActiveIndex(index)}
        >
          <Avatar className="h-8 w-8 mr-3">
            {user.image ? (
              <AvatarImage src={`${HOST}/${user.image}`} alt={user.firstName} className="rounded-full" />
            ) : (
              <div className={`uppercase h-8 w-8 text-xs flex items-center justify-center rounded-full ${getColor(user.color)}`}>
                {user.firstName ? user.firstName.charAt(0) : (user.email ? user.email.charAt(0) : '?')}
              </div>
            )}
          </Avatar>
          <span className="text-sm text-neutral-200">
            {user.firstName} {user.lastName || ''}
            {user._id === admin?._id && <span className="text-xs text-yellow-400 ml-1">(Admin)</span>}
          </span>
        </div>
      ))}
    </div>
  );
};

export default MentionSuggestions;
