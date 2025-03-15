// Mock data for the Tappy Travels app

// Mock routes for the home screen
export const mockRoutes = [
  {
    id: '1',
    type: 'bus',
    routeNumber: 'Bus 51',
    destination: 'Bugis',
    time: 'Next in 5 mins',
    isFavorite: false,
  },
  {
    id: '2',
    type: 'bus',
    routeNumber: 'Bus 175',
    destination: 'Clementi',
    time: 'Next in 3 mins',
    isFavorite: false,
  },
  {
    id: '3',
    type: 'train',
    routeNumber: 'East-West Line',
    destination: 'Changi Airport',
    time: 'Next in 2 mins',
    isFavorite: false,
  },
  {
    id: '4',
    type: 'bus',
    routeNumber: 'Bus 190',
    destination: 'Orchard',
    time: 'Next in 8 mins',
    isFavorite: false,
  },
  {
    id: '5',
    type: 'train',
    routeNumber: 'North-South Line',
    destination: 'Marina Bay',
    time: 'Next in 4 mins',
    isFavorite: false,
  },
];

// Mock favorite routes
export const mockFavorites = [
  {
    id: '1',
    type: 'bus',
    routeNumber: 'Bus 51',
    destination: 'Home',
    time: 'Next in 5 mins',
    isFavorite: true,
  },
  {
    id: '2',
    type: 'train',
    routeNumber: 'East-West Line',
    destination: 'Work',
    time: 'Next in 3 mins',
    isFavorite: true,
  },
];

// Mock stops for route details screen with coordinates
export const mockStops = {
  'Bus 51': [
    { id: '1', name: 'Ang Mo Kio', time: '2 mins', coordinates: { latitude: 1.3692, longitude: 103.8486 } },
    { id: '2', name: 'Bishan', time: '5 mins', coordinates: { latitude: 1.3512, longitude: 103.8480 } },
    { id: '3', name: 'Toa Payoh', time: '9 mins', coordinates: { latitude: 1.3329, longitude: 103.8471 } },
    { id: '4', name: 'Novena', time: '13 mins', coordinates: { latitude: 1.3204, longitude: 103.8438 } },
    { id: '5', name: 'Newton', time: '16 mins', coordinates: { latitude: 1.3138, longitude: 103.8381 } },
    { id: '6', name: 'Orchard', time: '20 mins', coordinates: { latitude: 1.3043, longitude: 103.8321 } },
    { id: '7', name: 'Somerset', time: '22 mins', coordinates: { latitude: 1.3006, longitude: 103.8389 } },
    { id: '8', name: 'Dhoby Ghaut', time: '25 mins', coordinates: { latitude: 1.2990, longitude: 103.8455 } },
    { id: '9', name: 'City Hall', time: '28 mins', coordinates: { latitude: 1.2931, longitude: 103.8533 } },
    { id: '10', name: 'Bugis', time: '30 mins', coordinates: { latitude: 1.3010, longitude: 103.8560 } },
  ],
  'Bus 175': [
    { id: '1', name: 'Bukit Batok', time: '2 mins', coordinates: { latitude: 1.3490, longitude: 103.7498 } },
    { id: '2', name: 'Bukit Timah', time: '7 mins', coordinates: { latitude: 1.3343, longitude: 103.7765 } },
    { id: '3', name: 'Holland Village', time: '12 mins', coordinates: { latitude: 1.3110, longitude: 103.7960 } },
    { id: '4', name: 'Buona Vista', time: '15 mins', coordinates: { latitude: 1.3070, longitude: 103.7902 } },
    { id: '5', name: 'Dover', time: '18 mins', coordinates: { latitude: 1.3115, longitude: 103.7786 } },
    { id: '6', name: 'Clementi', time: '22 mins', coordinates: { latitude: 1.3150, longitude: 103.7650 } },
  ],
  'East-West Line': [
    { id: '1', name: 'Tampines', time: '2 mins', coordinates: { latitude: 1.3530, longitude: 103.9450 } },
    { id: '2', name: 'Simei', time: '4 mins', coordinates: { latitude: 1.3430, longitude: 103.9530 } },
    { id: '3', name: 'Tanah Merah', time: '7 mins', coordinates: { latitude: 1.3272, longitude: 103.9467 } },
    { id: '4', name: 'Bedok', time: '10 mins', coordinates: { latitude: 1.3240, longitude: 103.9300 } },
    { id: '5', name: 'Kembangan', time: '12 mins', coordinates: { latitude: 1.3210, longitude: 103.9130 } },
    { id: '6', name: 'Eunos', time: '15 mins', coordinates: { latitude: 1.3191, longitude: 103.9030 } },
    { id: '7', name: 'Paya Lebar', time: '18 mins', coordinates: { latitude: 1.3180, longitude: 103.8920 } },
    { id: '8', name: 'Aljunied', time: '21 mins', coordinates: { latitude: 1.3160, longitude: 103.8830 } },
    { id: '9', name: 'Kallang', time: '23 mins', coordinates: { latitude: 1.3120, longitude: 103.8710 } },
    { id: '10', name: 'Lavender', time: '25 mins', coordinates: { latitude: 1.3070, longitude: 103.8630 } },
    { id: '11', name: 'Bugis', time: '28 mins', coordinates: { latitude: 1.3010, longitude: 103.8560 } },
    { id: '12', name: 'City Hall', time: '31 mins', coordinates: { latitude: 1.2931, longitude: 103.8533 } },
    { id: '13', name: 'Raffles Place', time: '34 mins', coordinates: { latitude: 1.2840, longitude: 103.8510 } },
    { id: '14', name: 'Tanjong Pagar', time: '37 mins', coordinates: { latitude: 1.2765, longitude: 103.8460 } },
    { id: '15', name: 'Outram Park', time: '40 mins', coordinates: { latitude: 1.2810, longitude: 103.8390 } },
    { id: '16', name: 'Tiong Bahru', time: '43 mins', coordinates: { latitude: 1.2860, longitude: 103.8270 } },
    { id: '17', name: 'Redhill', time: '45 mins', coordinates: { latitude: 1.2900, longitude: 103.8170 } },
    { id: '18', name: 'Queenstown', time: '48 mins', coordinates: { latitude: 1.2950, longitude: 103.8060 } },
    { id: '19', name: 'Commonwealth', time: '50 mins', coordinates: { latitude: 1.3020, longitude: 103.7980 } },
    { id: '20', name: 'Buona Vista', time: '53 mins', coordinates: { latitude: 1.3070, longitude: 103.7902 } },
    { id: '21', name: 'Dover', time: '55 mins', coordinates: { latitude: 1.3115, longitude: 103.7786 } },
    { id: '22', name: 'Clementi', time: '57 mins', coordinates: { latitude: 1.3150, longitude: 103.7650 } },
    { id: '23', name: 'Jurong East', time: '60 mins', coordinates: { latitude: 1.3330, longitude: 103.7420 } },
  ],
};

// Tappy's greeting based on time of day
export const getTappyGreeting = () => {
  const hour = new Date().getHours();
  
  if (hour < 12) {
    return "Good morning! Where are we going today?";
  } else if (hour < 18) {
    return "Good afternoon! Ready for a ride?";
  } else {
    return "Good evening! Ready for a journey?"; // Removed Singlish
  }
};

// User points and achievements
export const userProfile = {
  name: 'Traveler',
  points: 45,
  achievements: [
    { id: '1', name: 'First Trip', description: 'Completed your first journey with Tappy', unlocked: true },
    { id: '2', name: 'Early Bird', description: 'Took a trip before 7am', unlocked: true },
    { id: '3', name: '5 Journeys', description: 'Completed 5 journeys with Tappy', unlocked: true },
    { id: '4', name: '10 Journeys', description: 'Completed 10 journeys with Tappy', unlocked: false },
    { id: '5', name: 'Night Owl', description: 'Took a trip after 10pm', unlocked: false },
  ],
  outfits: [
    { id: '1', name: 'Default', description: 'Classic Tappy look', unlocked: true },
    { id: '2', name: 'Raincoat', description: 'Keeps Tappy dry on rainy days', unlocked: false, pointsRequired: 50 },
    { id: '3', name: 'Bus Driver', description: 'Tappy in a bus driver uniform', unlocked: false, pointsRequired: 100 },
    { id: '4', name: 'Train Captain', description: 'Tappy in a train captain uniform', unlocked: false, pointsRequired: 150 },
  ],
};

// Simulate GPS movement along a route
export function generateRouteCoordinates(start: { latitude: number; longitude: number }, end: { latitude: number; longitude: number }, numPoints: number) {
  const coordinates = [];
  
  for (let i = 0; i < numPoints; i++) {
    const fraction = i / (numPoints - 1);
    const latitude = start.latitude + fraction * (end.latitude - start.latitude);
    const longitude = start.longitude + fraction * (end.longitude - start.longitude);
    coordinates.push({ latitude, longitude });
  }
  
  return coordinates;
}