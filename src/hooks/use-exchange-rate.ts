import { useState, useEffect } from "react";

/**
 * Hook to fetch and cache exchange rates from Frankfurter API (ECB data)
 * Free, no API key required
 * https://www.frankfurter.app/
 */

interface ExchangeRates {
  [key: string]: number;
}

interface ExchangeRateCache {
  rates: ExchangeRates;
  timestamp: number;
  baseCurrency: string;
}

const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
const CACHE_KEY = "exchange_rates_cache";

export function useExchangeRate(from: string = "USD", to: string = "EUR") {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        // If converting to same currency, rate is 1
        if (from === to) {
          setRate(1);
          setLoading(false);
          return;
        }

        // Check cache first
        const cached = getCachedRate(from, to);
        if (cached) {
          setRate(cached);
          setLoading(false);
          return;
        }

        // Fetch from API
        const response = await fetch(
          `https://api.frankfurter.app/latest?from=${from}&to=${to}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch exchange rate");
        }

        const data = await response.json();
        const fetchedRate = data.rates[to];

        if (!fetchedRate) {
          throw new Error(`Rate not found for ${from} to ${to}`);
        }

        // Cache the result
        cacheRate(from, to, fetchedRate);
        setRate(fetchedRate);
        setError(null);
      } catch (err) {
        console.error("Error fetching exchange rate:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        // Fallback: if USD to EUR and error, use approximate rate
        if (from === "USD" && to === "EUR") {
          setRate(0.92); // Approximate fallback
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, [from, to]);

  return { rate, loading, error };
}

function getCachedRate(from: string, to: string): number | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: ExchangeRateCache = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - data.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    // Check if we have the rate we need
    if (data.baseCurrency === from && data.rates[to]) {
      return data.rates[to];
    }

    // If base is different, we might be able to calculate
    // For now, just return null and fetch fresh
    return null;
  } catch {
    return null;
  }
}

function cacheRate(from: string, to: string, rate: number): void {
  try {
    const cache: ExchangeRateCache = {
      rates: { [to]: rate },
      timestamp: Date.now(),
      baseCurrency: from,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore cache errors
  }
}

/**
 * Utility function to convert amount between currencies
 */
export function convertCurrency(
  amount: number,
  rate: number | null
): number {
  if (rate === null) return amount;
  return amount * rate;
}
