import React from 'react';

const TimeSlider = ({ minYear, maxYear, startYear, endYear, setStartYear, setEndYear }) => {
  return (
    <div className="bg-[#D1D5DB]/70 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center shadow-lg border border-white/20">
      <span className="text-[#1E3A8A] font-bold mb-3 text-sm tracking-wide uppercase">Período de Publicação</span>
      <div className="flex gap-6 items-center">
        <div className="flex flex-col items-center">
          <label className="text-xs text-[#1E3A8A] font-semibold mb-1">Início: {startYear}</label>
          <input 
            type="range" 
            min={minYear} 
            max={maxYear} 
            value={startYear} 
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val <= endYear) setStartYear(val);
            }}
            className="w-28 md:w-40 accent-[#1E3A8A] cursor-pointer"
          />
        </div>
        <div className="flex flex-col items-center">
          <label className="text-xs text-[#1E3A8A] font-semibold mb-1">Fim: {endYear}</label>
          <input 
            type="range" 
            min={minYear} 
            max={maxYear} 
            value={endYear} 
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val >= startYear) setEndYear(val);
            }}
            className="w-28 md:w-40 accent-[#1E3A8A] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default TimeSlider;
