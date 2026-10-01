import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  Building2,
  Landmark,
  Search,
  Check,
  MapPin,
  X,
  Compass,
} from 'lucide-react';
import {
  useOrganization,
  OrganizationType,
} from '../../context/OrganizationContext';
import {
  ALL_MUNICIPAL_CORPORATIONS,
  MAHARASHTRA_DISTRICTS,
  MunicipalCorporation,
  STATE_OF_MAHARASHTRA_SEAL,
} from '../../data/maharashtraDistricts';

interface JurisdictionSelectorProps {
  className?: string;
  variant?: 'header' | 'banner';
  onJurisdictionChange?: () => void;
}

export const JurisdictionSelector: React.FC<JurisdictionSelectorProps> = ({
  className = '',
  variant = 'header',
  onJurisdictionChange,
}) => {
  const {
    organizationType,
    currentCorporation,
    currentDistrict,
    municipalCorporationName,
    district,
    setOrganization,
  } = useOrganization();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isState = organizationType === 'STATE';

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Group corporations by Administrative Division
  const groupedCorporations = useMemo(() => {
    const q = search.trim().toLowerCase();

    // Map each district to its corporations and division
    const divisions: Record<string, { districtName: string; districtId: string; corps: MunicipalCorporation[] }[]> = {
      'Pune Division': [],
      'Konkan Division': [],
      'Nashik Division': [],
      'Chhatrapati Sambhajinagar Division': [],
      'Nagpur Division': [],
      'Amravati Division': [],
    };

    for (const dist of MAHARASHTRA_DISTRICTS) {
      const matchingCorps = dist.corporations.filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.shortName.toLowerCase().includes(q) ||
          c.district.toLowerCase().includes(q) ||
          dist.division.toLowerCase().includes(q)
        );
      });

      if (matchingCorps.length > 0) {
        const divKey = `${dist.division} Division`;
        if (!divisions[divKey]) divisions[divKey] = [];
        divisions[divKey].push({
          districtName: dist.name,
          districtId: dist.id,
          corps: matchingCorps,
        });
      }
    }

    return divisions;
  }, [search]);

  const handleSelectState = () => {
    setOrganization('STATE', null, null);
    setIsOpen(false);
    onJurisdictionChange?.();
  };

  const handleSelectCorporation = (districtId: string, corpId: string) => {
    setOrganization('MUNICIPAL_CORPORATION', districtId, corpId);
    setIsOpen(false);
    onJurisdictionChange?.();
  };

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`group flex items-center gap-2 rounded-lg transition-all cursor-pointer text-left ${
          variant === 'banner'
            ? 'px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-400 hover:shadow-xs text-slate-800'
            : 'px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs'
        }`}
        title="Switch Maharashtra Municipal Corporation or State Jurisdiction"
      >
        {/* Emblem Thumbnail */}
        <div className="w-5 h-5 rounded overflow-hidden flex items-center justify-center shrink-0 bg-white border border-slate-200">
          <img
            src={isState ? STATE_OF_MAHARASHTRA_SEAL : currentCorporation?.logoUrl || STATE_OF_MAHARASHTRA_SEAL}
            alt="Emblem"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = STATE_OF_MAHARASHTRA_SEAL;
            }}
          />
        </div>

        {/* Jurisdiction Details */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="font-bold text-xs text-[#123B6D] truncate max-w-[170px] sm:max-w-[210px] md:max-w-[260px]">
              {isState ? 'Maharashtra State Administration' : currentCorporation?.name || municipalCorporationName || 'Municipal Corporation'}
            </span>
            {!isState && currentCorporation && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#1769D2] border border-blue-200 shrink-0">
                {currentCorporation.shortName}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[210px]">
            {isState ? 'Statewide Multi-Corporation Oversight' : `${district || 'Maharashtra'} District • Urban Local Body`}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-[#1769D2] transition-transform shrink-0 ml-0.5 ${
            isOpen ? 'rotate-180 text-[#1769D2]' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 mt-1.5 w-[340px] sm:w-[380px] max-h-[480px] rounded-xl bg-white border border-slate-200 shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Popover Header with Search */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/80 space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs font-bold text-[#123B6D]">
              <span className="uppercase tracking-wider text-[11px] font-mono text-slate-500">
                Select Jurisdiction
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Live Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search corporation or district (e.g. Pune, BMC, Nashik)..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#1769D2] focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Popover Scrollable Options */}
          <div className="overflow-y-auto p-2 space-y-3 divide-y divide-slate-100 text-xs">
            {/* 1. Statewide Level Option */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={handleSelectState}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                  isState
                    ? 'bg-blue-50 text-[#123B6D] font-bold border border-blue-200'
                    : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 p-0.5 flex items-center justify-center shrink-0">
                    <img
                      src={STATE_OF_MAHARASHTRA_SEAL}
                      alt="State of Maharashtra"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>Government of Maharashtra</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                        STATEWIDE
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Multi-corporation state command & aggregated monitoring
                    </div>
                  </div>
                </div>
                {isState && <Check className="w-4 h-4 text-[#1769D2] shrink-0" />}
              </button>
            </div>

            {/* 2. Municipal Corporations Grouped by Division */}
            {Object.entries(groupedCorporations).map(([divisionName, districtGroups]) => {
              if (districtGroups.length === 0) return null;

              return (
                <div key={divisionName} className="pt-2.5 space-y-1">
                  <div className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                    {divisionName}
                  </div>

                  <div className="space-y-0.5">
                    {districtGroups.map((dGroup) =>
                      dGroup.corps.map((corp) => {
                        const isSelected = !isState && currentCorporation?.id === corp.id;

                        return (
                          <button
                            key={corp.id}
                            type="button"
                            onClick={() => handleSelectCorporation(dGroup.districtId, corp.id)}
                            className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50/80 text-[#123B6D] font-bold border border-blue-200'
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0">
                                <img
                                  src={corp.logoUrl || STATE_OF_MAHARASHTRA_SEAL}
                                  alt={corp.shortName}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = STATE_OF_MAHARASHTRA_SEAL;
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-xs truncate flex items-center gap-1.5">
                                  <span className="truncate">{corp.name}</span>
                                  <span className="text-[10px] font-mono text-[#1769D2] bg-blue-50 px-1 py-0.2 rounded border border-blue-200 shrink-0">
                                    {corp.shortName}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-normal truncate">
                                  {corp.district} District • {corp.zoneCount || 4} Administrative Zones
                                </div>
                              </div>
                            </div>

                            {isSelected && <Check className="w-4 h-4 text-[#1769D2] shrink-0 ml-2" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Context Info */}
          <div className="p-2 border-t border-slate-100 bg-slate-50/70 text-[10px] text-slate-500 flex items-center justify-between font-mono shrink-0">
            <span>29 Urban Municipal Corporations</span>
            <span className="text-emerald-700 font-bold">● PostGIS Partitioned</span>
          </div>
        </div>
      )}
    </div>
  );
};
