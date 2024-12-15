import { useMemo } from 'react'

const dndQuotes = [
  // Original quotes
  "Roll for initiative!",
  "Natural 20!",
  "How do you want to do this?",
  "You meet in a tavern...",
  "Roll for perception.",
  "The dragon appears!",
  "Make a wisdom saving throw.",
  "Your party finds a treasure chest!",
  "A wild mimic appears!",
  "Time for a long rest.",
  "The Dungeon Master smiles...",
  "Your quest awaits!",
  "Roll with advantage!",
  "Critical hit!",
  "The bard tries to seduce...",
  "You hear mysterious whispers...",
  "A new adventure begins!",
  // Additional quotes
  "The torch flickers ominously...",
  "Your destiny awaits.",
  "The ancient prophecy unfolds!",
  "Beware the gelatinous cube!",
  "The tavern keeper knows all.",
  "A mysterious stranger approaches...",
  "The portal beckons!",
  "Your sword begins to glow!",
  "The rogue disappears into shadows.",
  "Magic fills the air!",
  "Legends speak of heroes like you.",
  "The ancient tome reveals its secrets!",
  "Your companions stand ready!",
  "The dungeon depths await.",
  "Evil stirs in the darkness...",
  "Your legend begins here!",
  "The gods are watching.",
  "Adventure calls to you!",
  "The campaign begins anew!",
  "Prepare for glory!",
  "The dice will decide your fate!"
]

interface DndQuoteProps {
  className?: string
  withQuotes?: boolean
}

export function DndQuote({ className = '', withQuotes = true }: DndQuoteProps) {
  const randomQuote = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * dndQuotes.length)
    const quote = dndQuotes[randomIndex]
    return withQuotes ? `"${quote}"` : quote
  }, [withQuotes])

  return <span className={className}>{randomQuote}</span>
}

// Export the quotes array in case it's needed elsewhere
export { dndQuotes } 