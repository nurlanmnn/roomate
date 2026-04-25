import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Household } from '../api/householdsApi';
import { expensesApi } from '../api/expensesApi';
import { eventsApi } from '../api/eventsApi';
import { shoppingApi } from '../api/shoppingApi';
import { settlementsApi } from '../api/settlementsApi';
import { prefetch } from '../utils/queryCache';

interface HouseholdContextType {
  selectedHousehold: Household | null;
  setSelectedHousehold: (household: Household | null) => void;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

/** Fire the home dashboard queries in the background so by the time the user
 *  actually lands on the Home tab, the data is already warm in the SWR cache.
 *  Safe to call many times — `prefetch` dedupes in-flight requests. */
const warmHomeDashboard = (householdId: string) => {
  prefetch(`home:dashboard:${householdId}`, async () => {
    const [homeData, balancesData, eventsRaw, shoppingStatsData] = await Promise.all([
      expensesApi.getHomeExpenseSummary(householdId),
      expensesApi.getBalances(householdId),
      eventsApi.getEvents(householdId, { upcoming: true, limit: 40 }),
      shoppingApi.getHouseholdItemStats(householdId),
    ]);
    const eventsData = Array.isArray(eventsRaw) ? eventsRaw : eventsRaw.items;
    const upcomingEvents = eventsData
      .filter((e) => new Date(e.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return {
      homeSummary: homeData,
      balances: balancesData,
      events: upcomingEvents,
      shoppingStats: shoppingStatsData,
    };
  });
  prefetch(`settlements:${householdId}:history:all:page0`, async () => {
    const raw = await settlementsApi.getSettlements(householdId, { limit: 5, skip: 0 });
    if (Array.isArray(raw)) {
      return { settlements: raw, total: raw.length };
    }
    return { settlements: raw.items, total: raw.total };
  });
};

export const HouseholdProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedHousehold, setSelectedHouseholdState] = useState<Household | null>(null);

  const setSelectedHousehold = useCallback((household: Household | null) => {
    setSelectedHouseholdState(household);
    if (household?._id) {
      // Kick off a non-blocking prefetch so the Home tab paints instantly when
      // the user navigates to it. Any screen waiting on the same key will
      // share this in-flight promise (no double fetch).
      warmHomeDashboard(household._id);
    }
  }, []);

  return (
    <HouseholdContext.Provider value={{ selectedHousehold, setSelectedHousehold }}>
      {children}
    </HouseholdContext.Provider>
  );
};

export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within HouseholdProvider');
  }
  return context;
};
