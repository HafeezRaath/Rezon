import React, { useState, useEffect } from "react";
import { FaChevronDown, FaMapMarkerAlt, FaSearch } from "react-icons/fa";

const LocationDropdown = ({ selected, onChange, variant = "default" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [suggestions, setSuggestions] = useState([]); // Live search result
  const [loading, setLoading] = useState(false);

  const popularCities = [
    "Lahore, Punjab",
    "Karachi, Sindh",
    "Islamabad, ICT",
    "Rawalpindi, Punjab",
    "Faisalabad, Punjab",
    "Multan, Punjab",
    "Peshawar, KPK",
  ];

  // --- Logic: Address Formatting (Area, City) ---
  const formatLiveAddress = (item) => {
    const addr = item.address;
    const area = addr.suburb || addr.city_district || addr.neighbourhood || addr.town || addr.village;
    const city = addr.city || addr.county || addr.state_district || addr.town;
    if (area && city && area.toLowerCase() !== city.toLowerCase()) {
      return `${area}, ${city}`;
    }
    return area || city || "Pakistan";
  };

  const getShortAddress = (data) => {
    const addr = data.address;
    const area = addr.suburb || addr.city_district || addr.neighbourhood || addr.town;
    const city = addr.city || addr.county || addr.state_district || addr.town;
    if (area && city && area.toLowerCase() !== city.toLowerCase()) {
      return `${area}, ${city}`;
    }
    return area || city || "Pakistan";
  };

  // --- LIVE SEARCH LOGIC (Debounce) ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length > 2 && isOpen) {
        setLoading(true);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${searchTerm}&countrycodes=pk&addressdetails=1&limit=5`
          );
          const data = await res.json();
          setSuggestions(data);
        } catch (error) {
          console.error("Search error:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setSuggestions([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, isOpen]);

  // --- Handlers ---
  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm("");
  };

  const fetchCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        const finalPlace = variant === "form" ? data.display_name : getShortAddress(data);
        onChange(finalPlace);
        setIsOpen(false);
      } catch (err) {
        console.error("Location error", err);
      }
    });
  };

  const handleClick = () => {
    if (variant === "form") fetchCurrentLocation();
    else setIsOpen(!isOpen);
  };

  // Filter popular cities
  const filteredPopular = popularCities.filter(city => 
    city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`relative ${variant === "form" ? "w-full" : "w-64"} text-sm`}>
      <div className="border border-gray-300 rounded-lg px-3 py-2 flex justify-between items-center cursor-pointer bg-white" onClick={handleClick}>
        <div className="flex items-center gap-2 truncate text-black">
          <FaMapMarkerAlt className={variant === "form" ? "text-pink-500" : "text-blue-600"} />
          <span className="truncate">{selected || "Select Location"}</span>
        </div>
        {variant !== "form" && <FaChevronDown className="text-gray-400 text-xs" />}
      </div>

      {variant !== "form" && isOpen && (
        <div className="absolute z-[60] w-full bg-white border border-gray-200 mt-1 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b">
            <div className="flex items-center bg-gray-100 rounded-md px-2 py-1">
              <FaSearch className="text-gray-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search city..." 
                className="bg-transparent outline-none w-full text-sm py-1 text-black"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <div className="px-4 py-3 text-pink-600 cursor-pointer hover:bg-pink-50 flex items-center gap-2 font-medium" onClick={fetchCurrentLocation}>
              🎯 Use Current Location
            </div>
            <hr />

            {/* SECTION 1: LIVE SUGGESTIONS (Sirf tab dikhayein jab loading ho ya results hon) */}
            {searchTerm.length > 2 && (
              <>
                <div className="px-4 py-1 text-blue-600 font-semibold text-[10px] uppercase bg-blue-50">Live Results</div>
                {loading ? <div className="px-4 py-2 text-xs text-gray-400">Searching...</div> : 
                  suggestions.map((item, idx) => (
                    <div key={idx} className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b text-black" onClick={() => handleSelect(formatLiveAddress(item))}>
                      <p className="font-bold text-xs">{formatLiveAddress(item)}</p>
                      <p className="text-[10px] text-gray-400 truncate">{item.display_name}</p>
                    </div>
                  ))
                }
              </>
            )}

            {/* SECTION 2: POPULAR CITIES (Aapka original logic) */}
            <div className="px-4 py-2 text-gray-400 text-[10px] uppercase font-bold tracking-wider">Popular Cities</div>
            {filteredPopular.map((city, index) => (
              <div key={index} className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-gray-700" onClick={() => handleSelect(city)}>
                {city}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationDropdown;