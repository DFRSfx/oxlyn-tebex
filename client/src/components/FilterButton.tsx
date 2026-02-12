import React from 'react';

interface FilterButtonProps {
  label: string;
  value: number | string;
  active: boolean;
  onClick: (value: number | string) => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, value, active, onClick }) => {
  return (
    <button
      onClick={() => onClick(value)}
      className={`filter-button ${active ? 'active' : ''}`}
    >
      {label}
    </button>
  );
};

export default FilterButton;
