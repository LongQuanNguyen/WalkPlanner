// Generate alphabetical labels: a, b, c, ..., z, aa, ab, ac, ..., az, ba, bb, ...
export const generateAlphabeticalLabel = (index: number): string => {
  let result = ''
  let num = index
  
  do {
    result = String.fromCharCode(97 + (num % 26)) + result
    num = Math.floor(num / 26)
  } while (num > 0)
  
  // Adjust for the fact that we want a, b, c... not starting from aa
  if (index < 26) {
    return String.fromCharCode(97 + index)
  }
  
  // For indices >= 26, we need to adjust the calculation
  const adjustedIndex = index - 26
  const letters = Math.floor(adjustedIndex / 26) + 2 // number of letters (aa = 2, aaa = 3, etc)
  
  if (letters === 2) {
    const firstLetter = Math.floor(adjustedIndex / 26)
    const secondLetter = adjustedIndex % 26
    return String.fromCharCode(97 + firstLetter) + String.fromCharCode(97 + secondLetter)
  }
  
  // For longer sequences, use a simpler approach
  let labelIndex = index
  let label = ''
  
  // Simple conversion: a-z (0-25), then aa-zz (26-701), then aaa-zzz, etc.
  if (labelIndex < 26) {
    return String.fromCharCode(97 + labelIndex)
  }
  
  labelIndex -= 26 // Adjust for single letters
  const numLetters = Math.floor(Math.log(labelIndex + 26) / Math.log(26)) + 1
  
  for (let i = 0; i < numLetters; i++) {
    label = String.fromCharCode(97 + (labelIndex % 26)) + label
    labelIndex = Math.floor(labelIndex / 26)
  }
  
  return label
}

// Simpler implementation
export const getNodeLabel = (index: number): string => {
  if (index < 26) {
    // a, b, c, ..., z
    return String.fromCharCode(97 + index)
  } else if (index < 702) {
    // aa, ab, ac, ..., az, ba, bb, ..., zz
    const adjustedIndex = index - 26
    const firstLetter = Math.floor(adjustedIndex / 26)
    const secondLetter = adjustedIndex % 26
    return String.fromCharCode(97 + firstLetter) + String.fromCharCode(97 + secondLetter)
  } else {
    // aaa, aab, etc. (for very large numbers)
    const adjustedIndex = index - 702
    const firstLetter = Math.floor(adjustedIndex / 676)
    const remaining = adjustedIndex % 676
    const secondLetter = Math.floor(remaining / 26)
    const thirdLetter = remaining % 26
    return String.fromCharCode(97 + firstLetter) + 
           String.fromCharCode(97 + secondLetter) + 
           String.fromCharCode(97 + thirdLetter)
  }
}
