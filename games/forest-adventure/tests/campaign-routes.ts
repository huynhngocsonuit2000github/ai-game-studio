// Fixed-tick keyboard routes over the approved geometry. Direction is relative
// to the camera. Releasing Jump produces the short hops used on the stair paths.
type Segment = [ticks: number, direction: number, jump: boolean];
export const willow: Segment[] = [
  [24,1,false], [6,1,true], [24,1,false], [6,1,true], [24,1,false], [6,1,true],
  [54,1,false], [6,1,true], [36,1,false], [6,1,true], [36,1,false], [6,1,true], [90,1,false],
  [6,1,true], [78,1,false], [6,1,true], [42,1,false], [6,1,true], [42,1,false], [6,1,true],
  [54,1,false], [6,1,true], [6,1,false], [6,-1,false], [6,1,false], [6,1,true],
  [18,1,false], [6,1,true], [6,0,true], [156,1,false], [6,1,true], [84,1,false],
];
export const oak: Segment[] = [
  [12,1,false], [12,1,true], [30,1,false], [6,1,true], [30,1,false], [6,1,true],
  [18,1,false], [6,1,true], [36,1,false], [6,1,true], [12,1,false], [18,1,true],
  [36,1,false], [18,1,true], [24,1,false], [6,1,true], [24,1,false], [6,1,true],
  [18,1,false], [6,1,true], [12,1,false], [12,0,false], [6,1,false], [6,0,false],
  [12,-1,false], [6,0,false], [12,1,false], [6,1,true], [96,1,false], [12,1,true],
  [30,1,false], [12,1,true], [30,1,false], [18,1,true], [24,1,false], [18,1,true],
  [42,1,false], [12,1,true], [18,1,false], [6,0,false], [12,1,false], [6,0,false],
  [12,-1,false], [6,1,false], [6,1,true], [6,1,false], [12,1,true], [30,1,false],
  [6,1,true], [48,1,false], [12,1,true], [18,1,false], [6,0,false], [6,1,false],
  [6,1,true], [6,0,true], [6,0,false], [18,1,false], [18,0,false], [18,1,true],
  [30,1,false], [12,0,false], [72,1,false],
];
