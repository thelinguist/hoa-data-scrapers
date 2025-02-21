const directions = ["n", "s", "e", "w", "north", "south", "east", "west"]

/**
 * examples
 * 1234 Fun Street
 * 1234 N Fun Street City, State 12345
 * @param address
 */
export const parseAddress = (address: string) => {
  const parts = (address??"").split(" ")
  const streetNumber = parts[0]
  const commaIndex = parts.findIndex(part => part.includes(","))
  const sliceEnd = commaIndex !== -1 ? commaIndex : parts.length
  let direction
  let streetName
  if (parts[1] && directions.includes(parts[1].toLowerCase())) {
    direction = parts[1]
    streetName = parts.slice(2, sliceEnd).join(" ")
  } else {
    streetName = parts.slice(1, sliceEnd).join(" ")
  }
  let city = (parts[commaIndex]??"").replace(",", "")
  let state = parts[commaIndex + 1]
  let zip = parts[commaIndex + 2]
  return {
    streetNumber,
    direction,
    streetName: streetName.trim(),
    city,
    state,
    zip
  }
}

/**
 * account for things like nice Dr vs nice Drive or nice St vs nice Street
 * @param a
 * @param b
 */
export const compareStreetName = (a: string, b: string) => {
  const lowerA = a.toLowerCase()
  const lowerB = b.toLowerCase()
  if (lowerA === lowerB) {
    return true
  }
  // if using abbreviation
  if (lowerA.indexOf(lowerB) === 0) {
    return true
  }
  return lowerB.indexOf(lowerA) === 0
}