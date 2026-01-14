import React from 'react';
import './AgentSelector.css';

function AgentSelector({ users, selectedUser, onSelect }) {
  return (
    <div className="agent-selector">
      <label>Agent:</label>
      <select
        value={selectedUser || ''}
        onChange={(e) => onSelect(e.target.value ? parseInt(e.target.value) : null)}
      >
        <option value="">All Agents (Team)</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default AgentSelector;
