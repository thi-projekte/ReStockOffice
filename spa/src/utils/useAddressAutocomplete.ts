import {useCallback, useEffect, useRef, useState} from "react";

export interface AddressSuggestion {
  displayName: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  countryCode: string;
}

interface UseAddressAutocompleteResult {
  query: string;
  setQuery: (value: string) => void;
  suggestions: AddressSuggestion[];
  setSuggestions: (value: AddressSuggestion[]) => void;
  isLoading: boolean;
}

const ALLOWED_COUNTRIES = ["de", "at", "ch"];

function mapCountryCode(code: string): string {
  switch (code.toLowerCase()) {
    case "de":
      return "Deutschland";
    case "at":
      return "Österreich";
    case "ch":
      return "Schweiz";
    default:
      return code;
  }
}

export function useAddressAutocomplete(): UseAddressAutocompleteResult {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (value: string): Promise<void> => {
    if (value.trim().length < 4) {
      setSuggestions([]);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        q: value,
        format: "json",
        addressdetails: "1",
        limit: "6",
        countrycodes: ALLOWED_COUNTRIES.join(","),
      });

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          signal: abortRef.current.signal,
          headers: {"Accept-Language": "de"},
        }
      );

      const data = await res.json() as NominatimResult[];

      const mapped: AddressSuggestion[] = data
        .filter((r) => r.address?.road)
        .map((r) => ({
          displayName: r.display_name,
          street: r.address.road ?? "",
          houseNumber: r.address.house_number ?? "",
          postalCode: r.address.postcode ?? "",
          city: r.address.city ?? r.address.town ?? r.address.village ?? r.address.municipality ?? "",
          country: mapCountryCode(r.address.country_code ?? ""),
          countryCode: r.address.country_code ?? "",
        }));

      setSuggestions(mapped);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setSuggestions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void search(query);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  return {query, setQuery, suggestions, setSuggestions, isLoading};
}

interface NominatimResult {
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country_code?: string;
  };
}
