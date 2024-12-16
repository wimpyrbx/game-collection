import React, { KeyboardEvent, ChangeEvent, useState, useEffect } from 'react'

interface Tag {
  id: number
  name: string
}

interface TagInputProps {
  value: string
  onChange: (value: string) => void
  onTagAdd: (value: string) => Promise<void>
  placeholder?: string
  availableTags: Tag[]
  onTagSelect?: (tag: Tag) => void
}

export function TagInput({
  value,
  onChange,
  onTagAdd,
  placeholder,
  availableTags,
  onTagSelect
}: TagInputProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)

  useEffect(() => {
    if (value.length >= 2) {
      const filtered = availableTags.filter(tag =>
        tag.name.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredTags(filtered)
      setShowDropdown(true)
      setSelectedIndex(-1)
    } else {
      setShowDropdown(false)
      setSelectedIndex(-1)
    }
  }, [value, availableTags])

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown && filteredTags.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredTags.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleTagSelect(filteredTags[selectedIndex])
        } else if (value.trim()) {
          await onTagAdd(value.trim())
          onChange('')
          setShowDropdown(false)
        }
      } else if (e.key === 'Escape') {
        setShowDropdown(false)
        setSelectedIndex(-1)
      }
    } else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const inputValue = value.trim()
      if (inputValue) {
        await onTagAdd(inputValue)
        onChange('')
        setShowDropdown(false)
      }
    }
  }

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (newValue.includes(',')) {
      const tagValue = newValue.replace(',', '').trim()
      if (tagValue) {
        await onTagAdd(tagValue)
        onChange('')
        setShowDropdown(false)
      }
    } else {
      onChange(newValue)
    }
  }

  const handleTagSelect = (tag: Tag) => {
    if (onTagSelect) {
      onTagSelect(tag)
    }
    onChange('')
    setShowDropdown(false)
    setSelectedIndex(-1)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-gray-200 text-sm"
      />
      {showDropdown && filteredTags.length > 0 && (
        <div className="absolute left-0 right-0 z-10 mt-1 max-h-32 overflow-y-auto border border-gray-700 rounded-md bg-gray-800 shadow-lg scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {filteredTags.map((tag, index) => (
            <button
              key={tag.id}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm ${
                index === selectedIndex 
                  ? 'bg-gray-700 text-white' 
                  : 'hover:bg-gray-700'
              }`}
              onClick={() => handleTagSelect(tag)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 