import { learningChallenges } from './learning';

export const STATION_POSITIONS: [number, number][] = [
  [-1.4, 14.87],
  [3.8, 15.1],
  [-1.29, -10.44],
  [0.89, -20.38],
  [6.35, 15.1],
];

export const STATION_SEATS: { x: number; z: number; facing: number }[] = [
  { x: -1.4, z: 12.5, facing: 0 },
  { x: 3.8, z: 12.7, facing: 0 },
  { x: -3, z: -9.6, facing: Math.PI },
  { x: 0.89, z: -19.2, facing: Math.PI },
  { x: 6.35, z: 12.7, facing: 0 },
];

export const ACADEMY_DOOR_POSITION: [number, number] = [-5.9, -23.9];

export const ACADEMY_MAP_BOUNDS = {
  minX: -40,
  maxX: 40,
  minZ: -100,
  maxZ: 22,
};

export const ACADEMY_MAP_POINTS = [
  ...learningChallenges.map((challenge, index) => {
    const [x, z] = STATION_POSITIONS[index] ?? [0, 0];
    return { id: challenge.id, label: challenge.station, x, z, kind: 'station' as const };
  }),
  {
    id: 'academy-door',
    label: 'Pintu keamanan',
    x: ACADEMY_DOOR_POSITION[0],
    z: ACADEMY_DOOR_POSITION[1],
    kind: 'door' as const,
  },
];
