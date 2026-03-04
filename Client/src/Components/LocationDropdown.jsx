import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaChevronDown, FaMapMarkerAlt, FaSearch, FaCrosshairs } from "react-icons/fa";

const LocationDropdown = ({ selected, onChange, variant = "default" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const abortControllerRef = useRef(null);

  const popularCities = [
    "Lahore, Punjab",
    "Karachi, Sindh",
    "Islamabad, ICT",
    "Rawalpindi, Punjab",
    "Faisalabad, Punjab",
    "Multan, Punjab",
    "Peshawar, KPK",
  ];

  // --- FIXED: Address Formatting Logic ---
  const formatLiveAddress = useCallback((item) => {
    if (!item?.address) return "Pakistan";
    
    const addr = item.address;
    const area = addr.suburb || addr.city_district || addr.neighbourhood || 
                 addr.town || addr.village || addr.hamlet;
    const city = addr.city || addr.county || addr.state_district || 
                 addr.town || addr.state;
    
    if (area && city && area.toLowerCase() !== city.toLowerCase()) {
      return `${area}, ${city}`;
    }
    return area || city || addr.state || "Pakistan";
  }, []);

  const getShortAddress = useCallback((data) => {
    if (!data?.address) return "Pakistan";
    return formatLiveAddress(data);
  }, [formatLiveAddress]);

  // --- FIXED: Click Outside to Close ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // --- FIXED: Live Search with AbortController ---
  useEffect(() => {
    if (searchTerm.length <= 2 || !isOpen) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();

      try {
        // FIXED: Removed space after 'q=' in URL
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&countrycodes=pk&addressdetails=1&limit=5`,
          { signal: abortControllerRef.current.signal }
        );
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();
        setSuggestions(data || []);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error("Search error:", error);
        }
      } finally {
        setLoading(false);
      }
    }, 400); // Reduced to 400ms for better UX

    return () => {
      clearTimeout(delayDebounceFn);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchTerm, isOpen]);

  // --- FIXED: Handlers with Error Handling ---
  const handleSelect = useCallback((val) => {
    if (!val) return;
    onChange(val);
    setIsOpen(false);
    setSearchTerm("");
    setSuggestions([]);
  }, [onChange]);

  const fetchCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    setLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // FIXED: Removed space after 'lat=' in URL
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          
          const data = await res.json();
          const finalPlace = variant === "form" ? data.display_name : getShortAddress(data);
          handleSelect(finalPlace);
        } catch (err) {
          console.error("Location error:", err);
          alert("Failed to fetch location. Please try again.");
        } finally {
          setLoading(false);
        }
      }, 
      (error) => {
        console.error("Geolocation error:", error);
        setLoading(false);
        let errorMsg = "Unable to retrieve your location.";
        if (error.code === 1) errorMsg = "Location permission denied.";
        else if (error.code === 2) errorMsg = "Location unavailable.";
        else if (error.code === 3) errorMsg = "Location request timed out.";
        alert(errorMsg);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  }, [variant, getShortAddress, handleSelect]);

  const handleClick = useCallback(() => {
    if (variant === "form") {
      fetchCurrentLocation();
    } else {
      setIsOpen(prev => !prev);
    }
  }, [variant, fetchCurrentLocation]);

  const filteredPopular = popularCities.filter(city => 
    city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div ref={dropdownRef} className={`relative ${variant === "form" ? "w-full" : "w-64"} text-sm group`}>
      <div 
        className={`border-2 transition-all duration-200 rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer bg-white ${
            variant === "form" 
              ? "border-gray-100 hover:border-pink-500 focus-within:border-pink-500" 
              : "border-gray-200 hover:border-blue-500 focus-within:border-blue-500"
        }`} 
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        <div className="flex items-center gap-2 truncate text-slate-700">
          <FaMapMarkerAlt className={`${variant === "form" ? "text-pink-500" : "text-blue-600"} shrink-0`} />
          <span className="truncate font-semibold tracking-tight">
            {loading ? "Locating..." : (selected || "Select Location")}
          </span>
        </div>
        {variant !== "form" && (
          <FaChevronDown 
            className={`text-gray-400 text-xs transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} 
          />
        )}
      </div>

      {variant !== "form" && isOpen && (
        <div className="absolute z-[100] w-full bg-white border border-gray-100 mt-2 rounded-[1.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-3 border-b bg-gray-50/50">
            <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <FaSearch className="text-gray-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search city or area..." 
                className="bg-transparent outline-none w-full text-sm font-medium text-slate-800 placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            <div 
              className="px-4 py-4 text-blue-600 cursor-pointer hover:bg-blue-50 flex items-center gap-3 font-bold transition-colors group/loc" 
              onClick={fetchCurrentLocation}
            >
              <div className="bg-blue-100 p-2 rounded-full group-hover/loc:bg-blue-600 group-hover/loc:text-white transition-all">
                <FaCrosshairs className="text-sm" />
              </div>
              <span>Use Current Location</span>
            </div>
            
            <div className="h-px bg-gray-100 mx-4" />

            {searchTerm.length > 2 && (
              <div className="py-2">
                <div className="px-4 py-1 text-blue-600 font-black text-[10px] uppercase tracking-widest bg-blue-50/50 mb-1">
                  Live Results
                </div>
                {loading ? (
                  <div className="px-10 py-4 text-xs text-gray-400 flex items-center gap-2 italic">
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Searching Pakistan...
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((item, idx) => (
                    <div 
                      key={item.place_id || idx} // FIXED: Better key using place_id
                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-gray-50 last:border-0 group/item" 
                      onClick={() => handleSelect(formatLiveAddress(item))}
                    >
                      <p className="font-bold text-slate-800 text-xs group-hover/item:text-blue-600 transition-colors">
                        {formatLiveAddress(item)}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5 font-medium">
                        {item.display_name}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-4 text-center text-xs text-gray-500">
                    No results found for "{searchTerm}"
                  </div>
                )}
              </div>
            )}

            {(!searchTerm || searchTerm.length <= 2) && (
              <div className="py-2">
                <div className="px-4 py-1 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] mb-1">
                  Popular Cities
                </div>
                <div className="grid grid-cols-1">
                  {filteredPopular.map((city, index) => (
                    <div 
                      key={city} // FIXED: Using city name as key instead of index
                      className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-slate-700 font-semibold text-xs flex items-center gap-2 transition-colors" 
                      onClick={() => handleSelect(city)}
                    >
                      <FaMapMarkerAlt className="text-gray-300 text-[10px]" />
                      {city}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationDropdown;