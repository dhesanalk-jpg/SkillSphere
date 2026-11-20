export type Person = {
  id: string; name: string; handle: string; role: string; location: string; bio: string;
  avatar: string; color: string; teaches: string[]; learns: string[]; level: string;
  rating: number; sessions: number; availability: string[]; format: string;
  interests: string[]; verified: boolean; projects: string[];
}
export type Match = { person: Person; score: number; reasons: string[]; type: 'direct' | 'bridge' }

const overlap = (a: string[], b: string[]) => a.filter(x => b.includes(x))
const normal = (s: string) => s.toLowerCase().trim()

export function scoreMatch(me: Person, other: Person): Match | null {
  if (me.id === other.id) return null
  const theyTeachMe = other.teaches.filter(s => me.learns.some(w => normal(w) === normal(s)))
  const iTeachThem = me.teaches.filter(s => other.learns.some(w => normal(w) === normal(s)))
  if (!theyTeachMe.length || !iTeachThem.length) return null

  const time = overlap(me.availability, other.availability)
  const shared = overlap(me.interests, other.interests)
  const sameFormat = me.format === other.format || me.format === 'Both' || other.format === 'Both'
  const score = Math.min(99, Math.round(
    48 + Math.min(18, (theyTeachMe.length + iTeachThem.length - 2) * 7) +
    Math.min(15, time.length * 5) + Math.min(8, shared.length * 4) + (sameFormat ? 8 : 0) +
    (other.verified ? 2 : 0)
  ))
  const reasons = [
    `${other.name.split(' ')[0]} can teach you ${theyTeachMe.join(', ')}`,
    `You can teach ${other.name.split(' ')[0]} ${iTeachThem.join(', ')}`,
    time.length ? `${time.length} shared availability window${time.length > 1 ? 's' : ''}` : 'Flexible scheduling needed',
    sameFormat ? `Both prefer ${me.format.toLowerCase()} sessions` : 'Different session preferences'
  ]
  return { person: other, score, reasons, type: 'direct' }
}

// Detect a circular barter: A teaches B, B teaches C, C teaches A.
export function findSkillChains(me: Person, people: Person[]) {
  const chains: { people: Person[]; skills: string[]; score: number }[] = []
  for (const b of people) {
    if (b.id === me.id) continue
    const aToB = me.teaches.find(s => b.learns.some(x => normal(x) === normal(s)))
    if (!aToB) continue
    for (const c of people) {
      if (c.id === me.id || c.id === b.id) continue
      const bToC = b.teaches.find(s => c.learns.some(x => normal(x) === normal(s)))
      const cToA = c.teaches.find(s => me.learns.some(x => normal(x) === normal(s)))
      if (bToC && cToA) {
        const shared = overlap(me.availability, b.availability).length +
          overlap(b.availability, c.availability).length + overlap(c.availability, me.availability).length
        chains.push({ people: [b, c], skills: [aToB, bToC, cToA], score: Math.min(98, 76 + shared * 4 + (b.verified && c.verified ? 4 : 0)) })
      }
    }
  }
  return chains.slice(0, 4)
}

export function bestTime(a: Person, b: Person) {
  return overlap(a.availability, b.availability)
}
