import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaChevronDown, FaMapMarkerAlt, FaSearch, FaCrosshairs, FaSpinner } from "react-icons/fa";

const LocationDropdown = ({ selected, onChange, variant = "default" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const abortControllerRef = useRef(null);
  const inputRef = useRef(null);

  const popularCities = [
    "Lahore, Punjab",
    "Karachi, Sindh",
    "Islamabad, ICT",
    "Rawalpindi, Punjab",
    "Faisalabad, Punjab",
    "Multan, Punjab",
    "Peshawar, KPK",
    "Quetta, Balochistan",
    "Sialkot, Punjab",
    "Gujranwala, Punjab",
  ];

  // Address Formatting Logic
  const formatLiveAddress = useCallback((item) => {
    if (!item?.address) return "Pakistan";
    
    const addr = item.address;
    const area =
      addr.suburb ||
      addr.city_district ||
      addr.neighbourhood ||
      addr.town ||
      addr.village ||
      addr.hamlet ||
      addr.residential;

    const city =
      addr.city ||
      addr.county ||
      addr.state_district ||
      addr.town ||
      addr.state;

    if (area && city && area.toLowerCase() !== city.toLowerCase()) {
      return `${area}, ${city}`;
    }

    return area || city || addr.state || "Pakistan";
  }, []);

  const getShortAddress = useCallback(
    (data) => {
      if (!data?.address) return "Pakistan";
      return formatLiveAddress(data);
    },
    [formatLiveAddress]
  );

  // Click Outside to Close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
      inputRef.current?.focus();
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isOpen]);

  // Live Search
  useEffect(() => {
    if (searchTerm.length <= 2 || !isOpen) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchTerm
          )}&countrycodes=pk&addressdetails=1&limit=5`,
          { signal: abortControllerRef.current.signal }
        );

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();
        setSuggestions(data || []);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Search error:", error);
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(delayDebounceFn);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchTerm, isOpen]);

  // 🔧 SAFE HANDLER
  const handleSelect = useCallback(
    (val) => {
      if (!val) return;

      if (typeof onChange === "function") {
        onChange(val);
      }

      setIsOpen(false);
      setSearchTerm("");
      setSuggestions([]);
    },
    [onChange]
  );

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
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );

          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

          const data = await res.json();

          const finalPlace =
            variant === "form"
              ? data.display_name
              : getShortAddress(data);

          // 🔧 SAFE CALL
          if (finalPlace) {
            handleSelect(finalPlace);
          }
        } catch (err) {
          console.error("Location error:", err);
          alert("Failed to fetch location. Please try again.");
          setLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLoading(false);

        const errorMessages = {
          1: "Location permission denied. Please enable location access.",
          2: "Location unavailable. Try searching manually.",
          3: "Location request timed out. Try again.",
        };

        alert(errorMessages[error.code] || "Unable to retrieve your location.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  }, [variant, getShortAddress, handleSelect]);

  const handleToggle = useCallback(() => {
    if (variant === "form") {
      fetchCurrentLocation();
    } else {
      setIsOpen((prev) => !prev);
    }
  }, [variant, fetchCurrentLocation]);

  const filteredPopular = popularCities.filter((city) =>
    city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const themeClasses = {
    form: {
      border:
        "border-slate-200 hover:border-emerald-500 focus-within:border-emerald-500",
      icon: "text-emerald-500",
      button:
        "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white",
    },
    default: {
      border:
        "border-slate-200 hover:border-emerald-500 focus-within:border-emerald-500",
      icon: "text-emerald-600",
      chevron: "text-slate-400",
      liveResults: "text-emerald-600 bg-emerald-50/50",
      currentLoc: "text-emerald-600 hover:bg-emerald-50",
      currentLocIcon:
        "bg-emerald-100 group-hover/loc:bg-emerald-600 group-hover/loc:text-white",
      suggestionHover: "group-hover/item:text-emerald-600",
    },
  };

  const currentTheme = themeClasses[variant] || themeClasses.default;

  return (
    <div
      ref={dropdownRef}
      className={`relative ${variant === "form" ? "w-full" : "w-64"} text-sm`}
    >
      <div
        className={`border-2 transition-all duration-200 rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer bg-white ${currentTheme.border}`}
        onClick={handleToggle}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select location"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <div className="flex items-center gap-2 truncate text-slate-700">
          {loading ? (
            <FaSpinner
              className={`${currentTheme.icon} shrink-0 animate-spin`}
            />
          ) : (
            <FaMapMarkerAlt
              className={`${currentTheme.icon} shrink-0`}
            />
          )}
          <span className="truncate font-semibold tracking-tight">
            {loading ? "Locating..." : selected || "Select Location"}
          </span>
        </div>

        {variant !== "form" && (
          <FaChevronDown
            className={`${currentTheme.chevron} text-xs transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </div>

      {variant !== "form" && isOpen && (
        <div className="absolute z-[100] w-full bg-white border border-slate-100 mt-2 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
              <FaSearch className="text-slate-400 mr-2" />

              <input
                ref={inputRef}
                type="text"
                placeholder="Search city or area..."
                className="bg-transparent outline-none w-full text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            <div
              className={`px-4 py-3 ${currentTheme.currentLoc} cursor-pointer flex items-center gap-3 font-semibold`}
              onClick={fetchCurrentLocation}
            >
              <FaCrosshairs />
              Use Current Location
            </div>

            <div className="h-px bg-slate-100 mx-4" />

            {searchTerm.length > 2 &&
              suggestions.map((item) => (
                <div
                  key={item.place_id}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b"
                  onClick={() =>
                    handleSelect(formatLiveAddress(item))
                  }
                >
                  <p className="font-bold text-xs">
                    {formatLiveAddress(item)}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {item.display_name}
                  </p>
                </div>
              ))}

            {(!searchTerm || searchTerm.length <= 2) &&
              filteredPopular.map((city) => (
                <div
                  key={city}
                  className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-xs flex items-center gap-2"
                  onClick={() => handleSelect(city)}
                >
                  <FaMapMarkerAlt className="text-slate-300 text-[10px]" />
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